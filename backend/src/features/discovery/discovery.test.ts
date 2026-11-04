// Run: node --test backend/src/features/discovery/discovery.test.ts  (Node >= 22.18, type stripping)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseDiscoveryFilters } from './filters.ts';
import { handleDiscoverProjects } from './handler.ts';
import { applyDiscovery, summariseRow, type PublicDb } from './service.ts';
import type { DiscoveryProjectRow } from './types.ts';

const row = (over: Partial<DiscoveryProjectRow>): DiscoveryProjectRow => ({
  id: '00000000-0000-4000-8000-000000000001',
  title: 'Fictional project',
  pitch: 'A fictional pitch.',
  sector: 'Climate',
  location: 'Newcastle',
  stage: 'prototype',
  status: 'active',
  visibility: 'public',
  owner_display_name: 'Demo Founder',
  created_at: '2026-10-01T00:00:00.000Z',
  project_needs: [],
  project_posts: [],
  milestones: [],
  ...over,
});

const rows: DiscoveryProjectRow[] = [
  row({
    id: 'a',
    title: 'QuayWatch',
    pitch: 'Flood alerts on the Tyne',
    created_at: '2026-10-03T00:00:00.000Z',
    project_needs: [
      { status: 'open', required_skills: ['React', 'TypeScript'] },
      { status: 'closed', required_skills: ['Rust'] },
    ],
    project_posts: [
      { type: 'announcement', created_at: '2026-10-30T00:00:00.000Z' },
      { type: 'progress', created_at: '2026-10-20T00:00:00.000Z' },
    ],
  }),
  row({ id: 'b', title: 'Draft thing', visibility: 'draft', created_at: '2026-10-05T00:00:00.000Z' }),
  row({
    id: 'c',
    title: 'Makers Map',
    location: 'Teesside',
    stage: 'idea',
    created_at: '2026-10-03T00:00:00.000Z',
    project_needs: [{ status: 'open', required_skills: ['react'] }],
  }),
  row({ id: 'd', title: 'Old idea', sector: 'Education', created_at: '2026-09-01T00:00:00.000Z' }),
];

const ok = (q: Record<string, unknown>) => {
  const r = parseDiscoveryFilters(q);
  assert.equal(r.ok, true);
  return (r as Extract<typeof r, { ok: true }>).filters;
};

test('sector filter accepts listed sectors in any case and normalises them', () => {
  assert.deepEqual(ok({ sector: ' fintech ' }), { sector: 'Fintech', limit: 20, offset: 0 });
  assert.deepEqual(ok({ sector: 'MACHINE LEARNING' }), { sector: 'Machine Learning', limit: 20, offset: 0 });
});

test('defaults and trimming', () => {
  assert.deepEqual(ok({}), { limit: 20, offset: 0 });
  assert.deepEqual(ok({ q: '  flood ', location: '', stage: 'MVP', limit: '5', offset: '10' }), {
    q: 'flood', stage: 'mvp', limit: 5, offset: 10,
  });
});

test('invalid parameters are rejected with field messages', () => {
  for (const q of [{ limit: '0' }, { limit: '51' }, { limit: '2.5' }, { offset: '-1' }, { stage: 'unicorn' },
    { skill: ['a', 'b'] }, { q: 'x'.repeat(121) }, { limit: '1e1' }, { sector: 'Fin' }, { sector: 'Testing' }]) {
    const r = parseDiscoveryFilters(q);
    assert.equal(r.ok, false, JSON.stringify(q));
  }
});

test('summary excludes closed needs, dedupes skills and ignores non-substantive posts', () => {
  const s = summariseRow(rows[0]);
  assert.deepEqual(s.requiredSkills, ['React', 'TypeScript']);
  assert.equal(s.openNeedsCount, 1);
  assert.equal(s.lastSubstantiveUpdateAt, '2026-10-20T00:00:00.000Z');
  assert.equal(summariseRow(rows[3]).lastSubstantiveUpdateAt, null);
  assert.ok(!('visibility' in s) && !('ownerId' in s), 'no private/internal fields');
});

test('drafts are excluded; ordering is created desc then id asc', () => {
  const page = applyDiscovery(rows, ok({}));
  assert.deepEqual(page.data.map((p) => p.id), ['a', 'c', 'd']);
  assert.equal(page.pagination.total, 3);
});

test('filters combine with AND and are case-insensitive', () => {
  assert.deepEqual(applyDiscovery(rows, ok({ skill: 'REACT' })).data.map((p) => p.id), ['a', 'c']);
  assert.deepEqual(applyDiscovery(rows, ok({ skill: 'react', location: 'teesside' })).data.map((p) => p.id), ['c']);
  assert.deepEqual(applyDiscovery(rows, ok({ skill: 'rust' })).data, [], 'closed need skills do not match');
  assert.deepEqual(applyDiscovery(rows, ok({ q: 'TYNE' })).data.map((p) => p.id), ['a']);
  assert.deepEqual(applyDiscovery(rows, ok({ stage: 'idea' })).data.map((p) => p.id), ['c']);
  assert.deepEqual(applyDiscovery(rows, ok({ sector: 'education' })).data.map((p) => p.id), ['d']);
  assert.deepEqual(applyDiscovery(rows, ok({ location: 'Newcastle Helix' })).data, [], 'location is exact');
});

test('pagination keeps the total', () => {
  const page = applyDiscovery(rows, ok({ limit: '1', offset: '1' }));
  assert.deepEqual(page.data.map((p) => p.id), ['c']);
  assert.deepEqual(page.pagination, { limit: 1, offset: 1, total: 3 });
});

const fakeDb = (result: { data: unknown[] | null; error: unknown }): PublicDb & { calls: string[] } => {
  const calls: string[] = [];
  return {
    calls,
    from: (t) => ({
      select: (c) => ({
        eq: (col, v) => {
          calls.push(`${t}|${col}=${v}|${c.includes('project_needs') ? 'needs' : ''}`);
          return Promise.resolve(result);
        },
      }),
    }),
  };
};

test('handler: 200 page, 400 validation, 503 without leaking details', async () => {
  const db = fakeDb({ data: rows, error: null });
  const good = await handleDiscoverProjects({ skill: 'react' }, db);
  assert.equal(good.status, 200);
  assert.equal((good.body as { data: unknown[] }).data.length, 2);
  assert.deepEqual(db.calls, ['projects|visibility=public|needs']);

  const bad = await handleDiscoverProjects({ limit: 'abc' }, db);
  assert.equal(bad.status, 400);
  assert.equal((bad.body as { error: { code: string } }).error.code, 'VALIDATION_ERROR');

  const down = await handleDiscoverProjects({}, fakeDb({ data: null, error: { message: 'relation "x" secret detail' } }));
  assert.equal(down.status, 503);
  assert.doesNotMatch(JSON.stringify(down.body), /secret detail/);
});
