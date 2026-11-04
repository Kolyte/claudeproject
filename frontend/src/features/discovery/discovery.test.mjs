// Run: node --test frontend/src/features/discovery/discovery.test.mjs  (Node >= 22.18; imports .ts via type stripping)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filtersFromParams, formatUpdate, hasActiveFilters, toQueryString } from './filters.ts';
import { legacyToSummary, queryFixtureSummaries } from './fixtureSource.ts';
import { projects } from '../../data/mockData.ts';

test('URL params round-trip and drop blank/unknown values', () => {
  const f = filtersFromParams(new URLSearchParams('q=%20flood%20&location=Durham&stage=MVP&skill=&foo=bar&sector=Climate'));
  assert.deepEqual(f, { q: 'flood', location: 'Durham', sector: 'Climate', stage: 'mvp' });
  assert.equal(toQueryString(f), 'q=flood&location=Durham&sector=Climate&stage=mvp');
  assert.deepEqual(filtersFromParams(new URLSearchParams('stage=unicorn')), {});
  assert.equal(toQueryString({ skill: 'React', limit: 12, offset: 0 }), 'skill=React&limit=12');
  assert.equal(toQueryString({ limit: 12, offset: 24 }), 'limit=12&offset=24');
  assert.equal(hasActiveFilters({}), false);
  assert.equal(hasActiveFilters({ skill: 'React' }), true);
});

test('update label never implies dormancy for projects without history', () => {
  assert.equal(formatUpdate(null), 'No progress update yet');
  assert.match(formatUpdate('2026-10-20T00:00:00.000Z'), /^Last progress 20 Oct 2026$/);
});

const summaries = projects.map(legacyToSummary);

test('legacy fixture maps to contract ProjectSummary', () => {
  const qw = summaries.find((s) => s.id === 'quaywatch');
  assert.ok(qw);
  assert.equal(qw.stage, 'mvp');
  assert.equal(qw.status, 'active');
  assert.equal(qw.ownerDisplayName, 'Priya Natarajan');
  assert.deepEqual(qw.requiredSkills, ['React', 'TypeScript', 'Python', 'FastAPI']);
  assert.equal(qw.openNeedsCount, 2);
  for (const s of summaries) {
    assert.ok(['idea', 'prototype', 'mvp', 'launched'].includes(s.stage), s.id);
    assert.ok(['active', 'paused', 'completed'].includes(s.status), s.id);
  }
});

test('fixture query applies contract semantics', () => {
  const all = queryFixtureSummaries(summaries, {});
  assert.equal(all.pagination.total, summaries.length);
  const created = all.data.map((s) => Date.parse(s.createdAt));
  assert.deepEqual(created, [...created].sort((a, b) => b - a), 'newest first');

  const react = queryFixtureSummaries(summaries, { skill: 'react' }).data;
  assert.ok(react.length > 0 && react.every((s) => s.requiredSkills.some((k) => k.toLowerCase() === 'react')));

  const durham = queryFixtureSummaries(summaries, { location: 'DURHAM' }).data;
  assert.ok(durham.length > 0 && durham.every((s) => s.location === 'Durham'));

  assert.equal(queryFixtureSummaries(summaries, { skill: 'COBOL' }).pagination.total, 0);
  const paged = queryFixtureSummaries(summaries, { limit: 2, offset: 1 });
  assert.equal(paged.data.length, 2);
  assert.deepEqual(paged.data, all.data.slice(1, 3));
});

test('sector suggestions match word prefixes, whole-name prefixes first', async () => {
  const { SECTORS, suggestSectors, canonicalSector } = await import('./sectors.ts');
  assert.deepEqual(suggestSectors('fi'), ['Finance', 'Fintech', 'Sport & Fitness']);
  assert.deepEqual(suggestSectors('FIN'), ['Finance', 'Fintech']);
  assert.deepEqual(suggestSectors('machine'), ['Machine Learning']);
  assert.deepEqual(suggestSectors('soft'), ['Software Engineering']);
  assert.deepEqual(suggestSectors('learn'), ['Machine Learning']);
  assert.deepEqual(suggestSectors('data an'), ['Data & Analytics']);
  assert.deepEqual(suggestSectors('zzz'), []);
  assert.equal(suggestSectors('').length, SECTORS.length);
  assert.equal(suggestSectors('', 5).length, 5);
  assert.equal(canonicalSector('  fintech '), 'Fintech');
  assert.equal(canonicalSector('Fin'), null);
  assert.equal(new Set(SECTORS.map((s) => s.toLowerCase())).size, SECTORS.length, 'no duplicates');
  assert.ok(SECTORS.every((s) => s.length <= 120));
});

test('frontend and backend sector lists are identical', async () => {
  const fe = await import('./sectors.ts');
  const be = await import('../../../../backend/src/features/discovery/sectors.ts');
  assert.deepEqual([...fe.SECTORS], [...be.SECTORS]);
});
