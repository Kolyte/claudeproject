// Run: node --test fixtures/demo-dataset.test.mjs   (Node >= 22.18)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildDemoDataset, demoUuid, FICTIONAL_NOTE, validateDataset } from './demo-dataset.mjs';
import { accountsFromEnv, parseArgs, seed, supabaseRest, TABLE_ORDER } from '../scripts/seed-demo.mjs';

const accounts = {
  founder: { id: '11111111-1111-4111-8111-111111111111', displayName: 'Demo Founder' },
  contributor: { id: '22222222-2222-4222-8222-222222222222', displayName: 'Demo Contributor' },
  unrelated: { id: '33333333-3333-4333-8333-333333333333', displayName: 'Demo Unrelated' },
};
const NOW = Date.parse('2026-11-04T12:00:00Z');
const rows = buildDemoDataset({ ...accounts, now: NOW });

test('dataset satisfies the contract and demo requirements', () => {
  assert.deepEqual(validateDataset(rows), []);
  const titles = rows.projects.map((p) => p.title);
  for (const t of ['TyneFlow AI', 'Vanguard Patient Portal', 'QuayWatch']) assert.ok(titles.includes(t), t);
  assert.ok(rows.project_needs.some((n) => n.status === 'open'));
  assert.ok(rows.project_needs.some((n) => n.status === 'closed'));
  assert.ok(rows.milestones.every((m) => m.verification === 'self_reported'));
  assert.ok(rows.projects.every((p) => p.owner_id === accounts.founder.id && p.problem.includes(FICTIONAL_NOTE)));
  const contributor = rows.profiles.find((p) => p.id === accounts.contributor.id);
  assert.deepEqual(contributor.declared_skills, ['React', 'TypeScript']);
});

test('no fixture text implies NHS affiliation or verification', () => {
  const text = JSON.stringify(rows);
  assert.doesNotMatch(text, /\bNHS\b/);
  assert.doesNotMatch(text, /"verification":"(?!self_reported)/);
  assert.doesNotMatch(text, /verified evidence/i);
});

test('IDs are stable UUIDs across builds', () => {
  const again = buildDemoDataset({ ...accounts, now: NOW + 86_400_000 });
  for (const t of TABLE_ORDER) assert.deepEqual(again[t].map((r) => r.id), rows[t].map((r) => r.id), t);
  assert.equal(demoUuid('x'), demoUuid('x'));
  assert.match(demoUuid('x'), /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('validator catches contract violations', () => {
  const bad = structuredClone(rows);
  bad.milestones[0].verification = 'verified';
  bad.project_needs[0].hours_per_week = 0;
  bad.projects[0].stage = 'Early users';
  for (const n of bad.project_needs) if (n.status === 'closed') n.status = 'open';
  const problems = validateDataset(bad).join('\n');
  assert.match(problems, /self_reported/);
  assert.match(problems, /hours 1–80/);
  assert.match(problems, /stage="Early users"/);
  assert.match(problems, /closed need/);
});

test('args default to a dry run; accounts must be distinct UUIDs', () => {
  assert.deepEqual(parseArgs([]), { apply: false, dryRun: true, skipProfiles: false, help: false });
  assert.throws(() => parseArgs(['--apply', '--dry-run']));
  assert.throws(() => parseArgs(['--delete']));
  assert.throws(() => accountsFromEnv({}, { requireReal: true }), /DEMO_FOUNDER_ID/);
  const same = accounts.founder.id;
  assert.throws(
    () => accountsFromEnv({ DEMO_FOUNDER_ID: same, DEMO_CONTRIBUTOR_ID: same, DEMO_UNRELATED_ID: accounts.unrelated.id }, { requireReal: true }),
    /three different users/,
  );
  assert.equal(accountsFromEnv({}, { requireReal: false }).founder.displayName, 'Demo Founder');
});

/** In-memory fake of the REST surface used by the seed. */
function fakeDb(initial = {}) {
  const tables = Object.fromEntries(TABLE_ORDER.map((t) => [t, new Map((initial[t] ?? []).map((r) => [r.id, r]))]));
  const users = new Set(Object.values(accounts).map((a) => a.id));
  return {
    tables,
    deletes: 0,
    getUser: async (id) => {
      if (!users.has(id)) throw new Error('HTTP 404');
      return { id, email_confirmed_at: '2026-11-01T00:00:00Z' };
    },
    select: async (table, ids) => ids.filter((id) => tables[table].has(id)).map((id) => tables[table].get(id)),
    upsert: async (table, list) => list.forEach((r) => tables[table].set(r.id, { ...tables[table].get(r.id), ...r })),
  };
}

test('seed upserts everything, is idempotent and keeps unrelated data', async () => {
  const unrelatedProject = { id: '99999999-9999-4999-8999-999999999999', owner_id: 'someone-else', title: 'Real project' };
  const db = fakeDb({ projects: [unrelatedProject] });
  await seed({ db, rows, accounts, skipProfiles: false, log: () => {} });
  await seed({ db, rows, accounts, skipProfiles: false, log: () => {} });
  for (const t of TABLE_ORDER) {
    const extra = t === 'projects' ? 1 : 0;
    assert.equal(db.tables[t].size, rows[t].length + extra, t);
  }
  assert.deepEqual(db.tables.projects.get(unrelatedProject.id), unrelatedProject);
});

test('seed refuses to overwrite rows owned by someone else, or missing accounts', async () => {
  const hijacked = { ...rows.projects[0], owner_id: '44444444-4444-4444-8444-444444444444' };
  const db = fakeDb({ projects: [hijacked] });
  await assert.rejects(seed({ db, rows, accounts, skipProfiles: false, log: () => {} }), /different owner/);
  assert.equal(db.tables.profiles.size, 0, 'nothing written before the check passes');

  const missing = { ...accounts, unrelated: { id: '55555555-5555-4555-8555-555555555555', displayName: 'x' } };
  await assert.rejects(seed({ db: fakeDb(), rows, accounts: missing, skipProfiles: false, log: () => {} }), /not found/);
});

test('REST client sends upserts with merge-duplicates and never leaks the key in errors', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (url.includes('/rest/v1/broken')) return new Response(JSON.stringify({ code: '42P01', message: 'missing table' }), { status: 404 });
    return new Response('', { status: 201 });
  };
  const db = supabaseRest({ url: 'https://x.supabase.co/', key: 'sb_secret_TOPSECRET', fetchImpl });
  await db.upsert('projects', [{ id: 'a' }]);
  assert.equal(calls[0].url, 'https://x.supabase.co/rest/v1/projects?on_conflict=id');
  assert.match(calls[0].init.headers.Prefer, /merge-duplicates/);
  assert.equal(calls[0].init.headers.Authorization, undefined, 'new secret keys go in apikey only');
  await assert.rejects(db.upsert('broken', []), (err) => !err.message.includes('TOPSECRET') && /42P01/.test(err.message));
});
