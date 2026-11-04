// P5-03 API journey + permission matrix against a running deployment (docs/CONTRACTS.md, docs/DEMO.md).
// Exercises anonymous, owner (founder), applicant (contributor) and unrelated accounts.
//
//   E2E_BASE_URL=https://<deployment> SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... \
//   E2E_FOUNDER_EMAIL=... E2E_FOUNDER_PASSWORD=... \
//   E2E_CONTRIBUTOR_EMAIL=... E2E_CONTRIBUTOR_PASSWORD=... \
//   E2E_UNRELATED_EMAIL=... E2E_UNRELATED_PASSWORD=... \
//   node --test tests/e2e/permissions.api.test.mjs
//
// Use the prepared fictional accounts only. Skips when env is incomplete. Never logs tokens.
// It creates records titled "[E2E fictional] …" that remain afterwards (no delete endpoint in P0).
// Assumption to confirm with P1/P2: publishing is `PATCH /projects/:id { visibility: 'public' }`.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { before, describe, test } from 'node:test';

const env = process.env;
const REQUIRED = [
  'E2E_BASE_URL', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY',
  'E2E_FOUNDER_EMAIL', 'E2E_FOUNDER_PASSWORD', 'E2E_CONTRIBUTOR_EMAIL', 'E2E_CONTRIBUTOR_PASSWORD',
  'E2E_UNRELATED_EMAIL', 'E2E_UNRELATED_PASSWORD',
];
const missing = REQUIRED.filter((k) => !env[k]);
const skip = missing.length ? `missing env: ${missing.join(', ')}` : false;

const API = `${env.E2E_BASE_URL?.replace(/\/$/, '')}/api`;
const RUN = randomUUID().slice(0, 8);
const SKILL = `E2E-skill-${RUN}`;
const PRIVATE_PROFILE_KEYS = ['email', 'bio', 'interests', 'participationTypes', 'workModes', 'location'];

async function signIn(email, password) {
  const res = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(res.status, 200, `sign-in failed for a prepared account (HTTP ${res.status})`);
  const body = await res.json();
  return { token: body.access_token, id: body.user.id };
}

/** Calls the API; `who` is an account from signIn or null for anonymous. */
async function api(who, method, path, body) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (who) headers.Authorization = `Bearer ${who.token}`;
  const res = await fetch(`${API}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json, contentType: res.headers.get('content-type') ?? '' };
}

const expectStatus = (res, allowed, what) =>
  assert.ok([allowed].flat().includes(res.status), `${what}: expected ${allowed}, got ${res.status} ${JSON.stringify(res.json)}`);

const projectBody = (title) => ({
  title,
  pitch: 'Fictional end-to-end test project. Not real.',
  problem: 'Fictional problem used by automated permission checks.',
  solution: 'Fictional solution used by automated permission checks.',
  sector: 'Testing',
  location: 'Newcastle',
  stage: 'idea',
});

const needBody = (title) => ({
  title,
  description: 'Fictional need created by the e2e permission test.',
  requiredSkills: [SKILL],
  desirableSkills: [],
  participationType: 'contributor',
  hoursPerWeek: 4,
  workMode: 'remote',
  location: 'Newcastle',
  compensation: 'voluntary',
});

describe('API journey and permissions', { skip, concurrency: false }, () => {
  let founder, contributor, unrelated;
  let projectId, needId, closedNeedId, applicationId;

  before(async () => {
    [founder, contributor, unrelated] = await Promise.all([
      signIn(env.E2E_FOUNDER_EMAIL, env.E2E_FOUNDER_PASSWORD),
      signIn(env.E2E_CONTRIBUTOR_EMAIL, env.E2E_CONTRIBUTOR_PASSWORD),
      signIn(env.E2E_UNRELATED_EMAIL, env.E2E_UNRELATED_PASSWORD),
    ]);
    assert.equal(new Set([founder.id, contributor.id, unrelated.id]).size, 3, 'use three different accounts');
  });

  test('health is public and reveals no configuration', async () => {
    const res = await api(null, 'GET', '/health');
    expectStatus(res, 200, 'health');
    assert.deepEqual(res.json, { data: { status: 'ok' } });
  });

  test('unknown /api route returns a JSON 404', async () => {
    const res = await api(null, 'GET', `/no-such-route-${RUN}`);
    expectStatus(res, 404, 'unknown route');
    assert.match(res.contentType, /json/);
    assert.equal(res.json?.error?.code, 'NOT_FOUND');
  });

  test('anonymous users cannot create projects', async () => {
    expectStatus(await api(null, 'POST', '/projects', projectBody('[E2E fictional] anon')), 401, 'anon create');
  });

  test('founder creates a draft owned by the token user, not the request body', async () => {
    const res = await api(founder, 'POST', '/projects', { ...projectBody(`[E2E fictional] ${RUN}`) });
    expectStatus(res, 201, 'create draft');
    projectId = res.json.data.id;
    assert.equal(res.json.data.ownerId, founder.id);
    assert.equal(res.json.data.visibility, 'draft');

    const spoof = await api(founder, 'POST', '/projects', { ...projectBody(`[E2E fictional] spoof ${RUN}`), ownerId: contributor.id });
    if (spoof.status === 201) assert.equal(spoof.json.data.ownerId, founder.id, 'ownerId must be server-derived');
    else expectStatus(spoof, 400, 'unknown field rejected');
  });

  test('drafts are hidden from anonymous and unrelated users and from discovery', async () => {
    expectStatus(await api(null, 'GET', `/projects/${projectId}`), 404, 'anon draft read');
    expectStatus(await api(unrelated, 'GET', `/projects/${projectId}`), 404, 'unrelated draft read');
    expectStatus(await api(founder, 'GET', `/projects/${projectId}`), 200, 'owner draft read');
    const mine = await api(founder, 'GET', '/me/projects');
    expectStatus(mine, 200, '/me/projects');
    assert.ok(mine.json.data.some((p) => p.id === projectId));
    const disc = await api(null, 'GET', `/discover/projects?q=${encodeURIComponent(RUN)}`);
    expectStatus(disc, 200, 'discovery');
    assert.ok(!disc.json.data.some((p) => p.id === projectId), 'draft must not be discoverable');
  });

  test('non-owners cannot edit the project', async () => {
    for (const who of [contributor, unrelated]) {
      expectStatus(await api(who, 'PATCH', `/projects/${projectId}`, { title: 'hijack' }), [403, 404], 'non-owner edit');
    }
    expectStatus(await api(null, 'PATCH', `/projects/${projectId}`, { title: 'hijack' }), 401, 'anon edit');
  });

  test('founder publishes; public response has no private account fields', async () => {
    expectStatus(await api(founder, 'PATCH', `/projects/${projectId}`, { visibility: 'public' }), 200, 'publish');
    const pub = await api(null, 'GET', `/projects/${projectId}`);
    expectStatus(pub, 200, 'anon public read');
    for (const k of PRIVATE_PROFILE_KEYS.filter((k) => k !== 'location')) assert.ok(!(k in pub.json.data), `leaked ${k}`);
  });

  test('only the owner adds needs, posts and milestones', async () => {
    for (const who of [contributor, unrelated]) {
      expectStatus(await api(who, 'POST', `/projects/${projectId}/needs`, needBody('hijack')), [403, 404], 'non-owner need');
      expectStatus(await api(who, 'POST', `/projects/${projectId}/posts`, { type: 'progress', body: 'hijack' }), [403, 404], 'non-owner post');
      expectStatus(
        await api(who, 'POST', `/projects/${projectId}/milestones`, { title: 'hijack', description: '', achievedAt: new Date().toISOString(), evidenceUrl: null }),
        [403, 404],
        'non-owner milestone',
      );
    }
    const need = await api(founder, 'POST', `/projects/${projectId}/needs`, needBody(`[E2E fictional] open ${RUN}`));
    expectStatus(need, 201, 'owner need');
    needId = need.json.data.id;
    const closed = await api(founder, 'POST', `/projects/${projectId}/needs`, needBody(`[E2E fictional] closed ${RUN}`));
    expectStatus(closed, 201, 'owner second need');
    closedNeedId = closed.json.data.id;
    expectStatus(await api(founder, 'PATCH', `/needs/${closedNeedId}`, { status: 'closed' }), 200, 'close need');
    expectStatus(await api(contributor, 'PATCH', `/needs/${needId}`, { status: 'closed' }), [403, 404], 'non-owner need edit');

    const post = await api(founder, 'POST', `/projects/${projectId}/posts`, { type: 'progress', body: `Fictional progress ${RUN}` });
    expectStatus(post, 201, 'owner post');
    const ms = await api(founder, 'POST', `/projects/${projectId}/milestones`, {
      title: `Fictional milestone ${RUN}`, description: 'Self-reported test milestone.', achievedAt: new Date().toISOString(), evidenceUrl: null,
    });
    expectStatus(ms, 201, 'owner milestone');
    assert.equal(ms.json.data.verification, 'self_reported');
  });

  test('discovery finds the published project by skill and location', async () => {
    const res = await api(null, 'GET', `/discover/projects?skill=${encodeURIComponent(SKILL.toLowerCase())}&location=newcastle`);
    expectStatus(res, 200, 'discovery filter');
    const hit = res.json.data.find((p) => p.id === projectId);
    assert.ok(hit, 'published project should match its open need skill');
    assert.equal(hit.openNeedsCount, 1, 'closed needs are not counted');
    assert.ok(hit.lastSubstantiveUpdateAt, 'progress post sets last substantive update');
    expectStatus(await api(null, 'GET', '/discover/projects?limit=0'), 400, 'invalid limit');
  });

  test('contributor applies once; duplicates and closed needs conflict; owner cannot apply', async () => {
    expectStatus(await api(null, 'POST', `/needs/${needId}/applications`, { message: 'anon' }), 401, 'anon apply');
    expectStatus(await api(founder, 'POST', `/needs/${needId}/applications`, { message: 'self' }), [403, 409], 'owner apply');
    const res = await api(contributor, 'POST', `/needs/${needId}/applications`, { message: `Fictional application ${RUN}` });
    expectStatus(res, 201, 'apply');
    applicationId = res.json.data.id;
    assert.equal(res.json.data.applicantId, contributor.id);
    assert.equal(res.json.data.status, 'submitted');
    expectStatus(await api(contributor, 'POST', `/needs/${needId}/applications`, { message: 'again' }), 409, 'duplicate');
    expectStatus(await api(contributor, 'POST', `/needs/${closedNeedId}/applications`, { message: 'closed' }), 409, 'closed need');
  });

  test('only the owner reviews; review exposes the minimal applicant summary', async () => {
    expectStatus(await api(null, 'GET', `/projects/${projectId}/applications`), 401, 'anon review');
    for (const who of [contributor, unrelated]) {
      expectStatus(await api(who, 'GET', `/projects/${projectId}/applications`), [403, 404], 'non-owner review');
    }
    const res = await api(founder, 'GET', `/projects/${projectId}/applications`);
    expectStatus(res, 200, 'owner review');
    const app = res.json.data.find((a) => a.id === applicationId);
    assert.ok(app);
    assert.deepEqual(Object.keys(app.applicant).sort(), ['declaredSkills', 'displayName', 'hoursPerWeek']);
  });

  test('applicants see only their own applications', async () => {
    const mine = await api(contributor, 'GET', '/me/applications');
    expectStatus(mine, 200, 'contributor own');
    assert.ok(mine.json.data.some((a) => a.id === applicationId));
    const other = await api(unrelated, 'GET', '/me/applications');
    expectStatus(other, 200, 'unrelated own');
    assert.ok(!other.json.data.some((a) => a.id === applicationId));
    expectStatus(await api(null, 'GET', '/me/applications'), 401, 'anon own');
  });

  test('status transitions follow the contract', async () => {
    expectStatus(await api(contributor, 'PATCH', `/applications/${applicationId}`, { status: 'accepted' }), [400, 403, 409], 'applicant self-accept');
    expectStatus(await api(unrelated, 'PATCH', `/applications/${applicationId}`, { status: 'rejected' }), [403, 404], 'unrelated change');
    expectStatus(await api(founder, 'PATCH', `/applications/${applicationId}`, { status: 'reviewing' }), 200, 'owner reviewing');
    expectStatus(await api(founder, 'PATCH', `/applications/${applicationId}`, { status: 'accepted' }), 200, 'owner accept');
    expectStatus(await api(founder, 'PATCH', `/applications/${applicationId}`, { status: 'rejected' }), [400, 409], 'terminal is read-only');
    const mine = await api(contributor, 'GET', '/me/applications');
    assert.equal(mine.json.data.find((a) => a.id === applicationId)?.status, 'accepted', 'applicant sees decision');
  });
});
