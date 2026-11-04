// HTTP-level tests: real Express routing, validation and permission rules over
// the in-memory repository. They do not exercise Supabase or RLS.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { after, before, beforeEach, describe, it } from 'node:test';
import express from 'express';
import { createOpportunitiesRouter } from './router.js';
import { createMemoryRepository, createMemoryState, type MemoryState } from './testing/memoryRepository.js';

const id = (): string => randomUUID();
const FOUNDER = id();
const APPLICANT = id();
const STRANGER = id();
const PUBLIC_PROJECT = id();
const DRAFT_PROJECT = id();

const needBody = {
  title: 'Frontend developer',
  description: 'Build the first public pages.',
  requiredSkills: ['React', ' react ', 'TypeScript'],
  participationType: 'contributor',
  hoursPerWeek: 8,
  workMode: 'hybrid',
  location: 'Newcastle',
  compensation: 'voluntary',
};

let state: MemoryState;
let server: Server;
let base: string;

async function call(method: string, path: string, as: string | null, body?: unknown) {
  const response = await fetch(`${base}/api${path}`, {
    method,
    headers: {
      ...(as ? { 'x-test-user': as } : {}),
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  return { status: response.status, json: (await response.json()) as any };
}

const createNeed = async (projectId = PUBLIC_PROJECT) =>
  (await call('POST', `/projects/${projectId}/needs`, FOUNDER, needBody)).json.data;
const apply = async (needId: string, as = APPLICANT) =>
  call('POST', `/needs/${needId}/applications`, as, { message: 'I can start with the landing page.' });

before(async () => {
  const app = express();
  app.use(
    '/api',
    createOpportunitiesRouter((req) => ({
      userId: req.header('x-test-user') ?? null,
      repository: createMemoryRepository(state),
    })),
  );
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => server.close());

beforeEach(() => {
  state = createMemoryState();
  state.projects.set(PUBLIC_PROJECT, { id: PUBLIC_PROJECT, ownerId: FOUNDER, visibility: 'public' });
  state.projects.set(DRAFT_PROJECT, { id: DRAFT_PROJECT, ownerId: FOUNDER, visibility: 'draft' });
  state.summaries.set(APPLICANT, { displayName: 'Sam', declaredSkills: ['React'], hoursPerWeek: 10 });
});

describe('needs', () => {
  it('lets the owner create a need with trimmed, de-duplicated skills and default status', async () => {
    const { status, json } = await call('POST', `/projects/${PUBLIC_PROJECT}/needs`, FOUNDER, needBody);
    assert.equal(status, 201);
    assert.equal(json.data.status, 'open');
    assert.deepEqual(json.data.requiredSkills, ['React', 'TypeScript']);
    assert.deepEqual(json.data.desirableSkills, []);
  });

  it('applies the documented access rules on create', async () => {
    const path = `/projects/${PUBLIC_PROJECT}/needs`;
    assert.equal((await call('POST', path, null, needBody)).status, 401);
    assert.equal((await call('POST', path, STRANGER, needBody)).json.error.code, 'FORBIDDEN');
    assert.equal((await call('POST', `/projects/${DRAFT_PROJECT}/needs`, STRANGER, needBody)).status, 404);
    assert.equal((await call('POST', `/projects/${randomUUID()}/needs`, FOUNDER, needBody)).status, 404);
  });

  it('shows public needs to anonymous visitors and hides draft needs from nonowners', async () => {
    await createNeed();
    await createNeed(DRAFT_PROJECT);
    const pub = await call('GET', `/projects/${PUBLIC_PROJECT}/needs`, null);
    assert.equal(pub.status, 200);
    assert.equal(pub.json.data.length, 1);
    assert.deepEqual(pub.json.pagination, { limit: 20, offset: 0, total: 1 });
    assert.equal((await call('GET', `/projects/${DRAFT_PROJECT}/needs`, null)).status, 404);
    assert.equal((await call('GET', `/projects/${DRAFT_PROJECT}/needs`, STRANGER)).status, 404);
    assert.equal((await call('GET', `/projects/${DRAFT_PROJECT}/needs`, FOUNDER)).status, 200);
  });

  it('rejects unknown, server-owned and invalid fields with per-field errors', async () => {
    const path = `/projects/${PUBLIC_PROJECT}/needs`;
    const bad = await call('POST', path, FOUNDER, {
      ...needBody,
      hoursPerWeek: 81,
      workMode: 'moon',
      title: '   ',
      id: 'x',
      projectId: randomUUID(),
    });
    assert.equal(bad.status, 400);
    assert.equal(bad.json.error.code, 'VALIDATION_ERROR');
    assert.deepEqual(Object.keys(bad.json.error.fields).sort(), [
      'hoursPerWeek',
      'id',
      'projectId',
      'title',
      'workMode',
    ]);
    const tooMany = Array.from({ length: 31 }, (_, index) => `skill ${index}`);
    assert.equal((await call('POST', path, FOUNDER, { ...needBody, requiredSkills: tooMany })).status, 400);
    assert.equal((await call('POST', path, FOUNDER, '{not json')).json.error.code, 'VALIDATION_ERROR');
    assert.equal((await call('POST', path, FOUNDER, [])).status, 400);
  });

  it('lets only the owner edit or close a need and blocks project reassignment', async () => {
    const need = await createNeed();
    const path = `/needs/${need.id}`;
    assert.equal((await call('PATCH', path, null, { status: 'closed' })).status, 401);
    assert.equal((await call('PATCH', path, STRANGER, { status: 'closed' })).status, 403);
    assert.equal((await call('PATCH', path, FOUNDER, { projectId: DRAFT_PROJECT })).status, 400);
    assert.equal((await call('PATCH', path, FOUNDER, {})).status, 400);
    const closed = await call('PATCH', path, FOUNDER, { status: 'closed', title: 'Renamed' });
    assert.equal(closed.status, 200);
    assert.equal(closed.json.data.status, 'closed');
    assert.equal(closed.json.data.title, 'Renamed');
    assert.equal(closed.json.data.projectId, PUBLIC_PROJECT);
  });

  it('validates ids and pagination', async () => {
    assert.equal((await call('GET', '/projects/not-a-uuid/needs', null)).status, 400);
    for (const query of ['limit=0', 'limit=51', 'limit=abc', 'limit=1.5', 'offset=-1', 'limit=1&limit=2']) {
      assert.equal((await call('GET', `/projects/${PUBLIC_PROJECT}/needs?${query}`, null)).status, 400, query);
    }
    await createNeed();
    await createNeed();
    const page = await call('GET', `/projects/${PUBLIC_PROJECT}/needs?limit=1&offset=1`, null);
    assert.equal(page.json.data.length, 1);
    assert.deepEqual(page.json.pagination, { limit: 1, offset: 1, total: 2 });
  });
});

describe('applications', () => {
  it('derives the applicant from the token and rejects a client-supplied id', async () => {
    const need = await createNeed();
    const created = await apply(need.id);
    assert.equal(created.status, 201);
    assert.equal(created.json.data.applicantId, APPLICANT);
    assert.equal(created.json.data.status, 'submitted');
    const spoof = await call('POST', `/needs/${need.id}/applications`, STRANGER, {
      message: 'hi',
      applicantId: APPLICANT,
    });
    assert.equal(spoof.status, 400);
  });

  it('enforces who may apply and when', async () => {
    const need = await createNeed();
    assert.equal((await apply(need.id, null as unknown as string)).status, 401);
    assert.equal((await apply(need.id, FOUNDER)).status, 403);
    assert.equal((await call('POST', `/needs/${need.id}/applications`, APPLICANT, { message: ' ' })).status, 400);
    assert.equal((await apply(id())).status, 404);
    await apply(need.id);
    const duplicate = await apply(need.id);
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.json.error.code, 'CONFLICT');
  });

  it('rejects applications to needs that are not open or are hidden in a draft', async () => {
    for (const status of ['closed', 'filled', 'reviewing']) {
      const need = await createNeed();
      await call('PATCH', `/needs/${need.id}`, FOUNDER, { status });
      assert.equal((await apply(need.id)).status, 409, status);
    }
    const draftNeed = await createNeed(DRAFT_PROJECT);
    assert.equal((await apply(draftNeed.id)).status, 404);
  });

  it('keeps existing submissions when a need closes', async () => {
    const need = await createNeed();
    await apply(need.id);
    await call('PATCH', `/needs/${need.id}`, FOUNDER, { status: 'closed' });
    const list = await call('GET', '/me/applications', APPLICANT);
    assert.equal(list.json.data.length, 1);
    assert.equal(list.json.data[0].need.title, needBody.title);
  });

  it('shows applicants only their own submissions', async () => {
    const need = await createNeed();
    await apply(need.id);
    assert.equal((await call('GET', '/me/applications', null)).status, 401);
    assert.equal((await call('GET', '/me/applications', STRANGER)).json.pagination.total, 0);
    assert.equal((await call('GET', '/me/applications', APPLICANT)).json.pagination.total, 1);
  });

  it('shows review data only to the project owner, with the minimal applicant summary', async () => {
    const need = await createNeed();
    await apply(need.id);
    const path = `/projects/${PUBLIC_PROJECT}/applications`;
    assert.equal((await call('GET', path, null)).status, 401);
    assert.equal((await call('GET', path, STRANGER)).status, 403);
    assert.equal((await call('GET', path, APPLICANT)).status, 403);
    const review = await call('GET', path, FOUNDER);
    assert.equal(review.status, 200);
    assert.deepEqual(review.json.data[0].applicant, {
      displayName: 'Sam',
      declaredSkills: ['React'],
      hoursPerWeek: 10,
    });
    assert.equal((await call('GET', `/projects/${DRAFT_PROJECT}/applications`, STRANGER)).status, 404);
  });
});

describe('application status transitions', () => {
  async function submitted() {
    const need = await createNeed();
    const { json } = await apply(need.id);
    return `/applications/${json.data.id}`;
  }

  it('moves an application through the owner path', async () => {
    const path = await submitted();
    assert.equal((await call('PATCH', path, FOUNDER, { status: 'reviewing' })).json.data.status, 'reviewing');
    assert.equal((await call('PATCH', path, FOUNDER, { status: 'accepted' })).json.data.status, 'accepted');
  });

  it('treats terminal states as read-only for both parties', async () => {
    for (const terminal of ['accepted', 'rejected']) {
      const path = await submitted().then(async (p) => {
        await call('PATCH', p, FOUNDER, { status: terminal });
        return p;
      });
      assert.equal((await call('PATCH', path, FOUNDER, { status: 'reviewing' })).status, 409);
      assert.equal((await call('PATCH', path, APPLICANT, { status: 'withdrawn' })).status, 409);
      state.applications.clear();
    }
  });

  it('lets an applicant withdraw from submitted or reviewing, and do nothing else', async () => {
    const path = await submitted();
    assert.equal((await call('PATCH', path, APPLICANT, { status: 'accepted' })).status, 403);
    assert.equal((await call('PATCH', path, APPLICANT, { status: 'reviewing' })).status, 403);
    await call('PATCH', path, FOUNDER, { status: 'reviewing' });
    assert.equal((await call('PATCH', path, APPLICANT, { status: 'withdrawn' })).json.data.status, 'withdrawn');
    assert.equal((await call('PATCH', path, FOUNDER, { status: 'accepted' })).status, 409);
  });

  it('allows withdrawal after the project returns to draft', async () => {
    const path = await submitted();
    state.projects.set(PUBLIC_PROJECT, { id: PUBLIC_PROJECT, ownerId: FOUNDER, visibility: 'draft' });
    assert.equal((await call('PATCH', path, APPLICANT, { status: 'withdrawn' })).status, 200);
  });

  it('stops the owner withdrawing on an applicant\'s behalf, or resetting to submitted', async () => {
    const path = await submitted();
    assert.equal((await call('PATCH', path, FOUNDER, { status: 'withdrawn' })).status, 403);
    assert.equal((await call('PATCH', path, FOUNDER, { status: 'submitted' })).status, 403);
  });

  it('hides the application from unrelated accounts and rejects anonymous requests', async () => {
    const path = await submitted();
    assert.equal((await call('PATCH', path, STRANGER, { status: 'rejected' })).status, 404);
    assert.equal((await call('PATCH', path, null, { status: 'rejected' })).status, 401);
  });

  it('rejects unknown statuses and extra fields', async () => {
    const path = await submitted();
    assert.equal((await call('PATCH', path, FOUNDER, { status: 'hired' })).status, 400);
    assert.equal((await call('PATCH', path, FOUNDER, { status: 'reviewing', message: 'x' })).status, 400);
    assert.equal((await call('PATCH', path, FOUNDER, {})).status, 400);
  });

  it('turns a lost concurrent update into a conflict', async () => {
    const need = await createNeed();
    const { json } = await apply(need.id);
    const repository = createMemoryRepository(state);
    await repository.updateApplicationStatus(json.data.id, 'submitted', 'rejected');
    assert.equal(await repository.updateApplicationStatus(json.data.id, 'submitted', 'accepted'), null);
  });
});
