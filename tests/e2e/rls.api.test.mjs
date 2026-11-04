// P5-03: direct Data API/RPC checks against disposable LOCAL accounts.
// Run through local-acceptance.mjs, which supplies the three confirmed accounts
// and removes their records afterwards. No administrative credential is used here.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'

const env = process.env
const required = [
  'E2E_BASE_URL', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'E2E_RUN_ID',
  'E2E_FOUNDER_EMAIL', 'E2E_FOUNDER_PASSWORD',
  'E2E_CONTRIBUTOR_EMAIL', 'E2E_CONTRIBUTOR_PASSWORD',
  'E2E_UNRELATED_EMAIL', 'E2E_UNRELATED_PASSWORD',
]
const missing = required.filter(name => !env[name])
const localHosts = new Set(['localhost', '127.0.0.1', '[::1]'])
for (const name of ['E2E_BASE_URL', 'NEO_API_URL', 'NEO_UI_URL', 'SUPABASE_URL']) {
  if (!env[name]) continue
  const url = new URL(env[name])
  if (!['http:', 'https:'].includes(url.protocol) || !localHosts.has(url.hostname) || url.username || url.password) {
    throw new Error(`${name} must target a local loopback service for disposable RLS tests.`)
  }
}
const apiOrigin = env.E2E_BASE_URL?.replace(/\/$/, '')
const supabaseOrigin = env.SUPABASE_URL?.replace(/\/$/, '')
const publishableKey = env.SUPABASE_PUBLISHABLE_KEY
if (publishableKey) {
  let role
  try { role = JSON.parse(Buffer.from(publishableKey.split('.')[1] ?? '', 'base64url').toString()).role } catch { /* New publishable keys are opaque. */ }
  if (publishableKey.startsWith('sb_secret_') || role === 'service_role') {
    throw new Error('RLS tests require a publishable/anon key, never an administrative key.')
  }
}

async function request(url, { method = 'GET', headers = {}, body } = {}) {
  const response = await fetch(url, {
    method, redirect: 'error', signal: AbortSignal.timeout(15_000),
    headers: { Accept: 'application/json', ...headers, ...(body !== undefined && { 'Content-Type': 'application/json' }) },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  })
  const text = await response.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { /* Status assertions report a non-JSON response without logging its contents. */ }
  return { status: response.status, data }
}

async function signIn(role) {
  const result = await request(`${supabaseOrigin}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: publishableKey },
    body: { email: env[`E2E_${role}_EMAIL`], password: env[`E2E_${role}_PASSWORD`] },
  })
  assert.equal(result.status, 200, `${role} local account sign-in`)
  assert.equal(typeof result.data?.access_token, 'string', 'Auth supplies a caller access token')
  assert.equal(typeof result.data?.user?.id, 'string', 'Auth supplies a caller user ID')
  return { role, id: result.data.user.id, token: result.data.access_token }
}

async function api(who, method, path, body, expected = 200) {
  const result = await request(`${apiOrigin}/api${path}`, {
    method, headers: who ? { Authorization: `Bearer ${who.token}` } : {}, body,
  })
  assert.equal(result.status, expected, `${method} ${path}: expected HTTP ${expected}`)
  return result.data?.data
}

function rest(who, path, { method = 'GET', body } = {}) {
  return request(`${supabaseOrigin}/rest/v1/${path}`, {
    method, body,
    headers: {
      apikey: publishableKey,
      ...(who && { Authorization: `Bearer ${who.token}` }),
      ...(method !== 'GET' && { Prefer: 'return=representation' }),
    },
  })
}

async function rows(who, table, query) {
  const result = await rest(who, `${table}?select=*&${query}`)
  assert.equal(result.status, 200, `${who?.role ?? 'anonymous'} direct ${table} read`)
  assert.ok(Array.isArray(result.data), 'Data API returns a row list')
  return result.data
}

function expectDenied(result, label) {
  assert.ok([401, 403].includes(result.status), `${label}: expected a permission denial, got HTTP ${result.status}`)
  assert.equal(result.data?.code, '42501', `${label}: PostgreSQL permission denial`)
}

function expectNoMutation(result, label) {
  // RLS USING can filter an UPDATE to zero rows instead of returning an error.
  // The caller-visible result and the owner's subsequent read both matter.
  if (result.status === 200) assert.deepEqual(result.data, [], `${label}: update affected no rows`)
  else expectDenied(result, label)
}

test('local Supabase direct RLS, immutable ownership and restricted review RPC', {
  skip: missing.length ? `missing env: ${missing.join(', ')}` : false,
  timeout: 120_000,
}, async t => {
  const [founder, contributor, unrelated] = await Promise.all(['FOUNDER', 'CONTRIBUTOR', 'UNRELATED'].map(signIn))
  const people = [founder, contributor, unrelated]
  assert.equal(new Set(people.map(person => person.id)).size, 3, 'three distinct disposable accounts are required')
  const run = `${env.E2E_RUN_ID.slice(0, 32)}-${randomUUID().slice(0, 8)}`
  const contributorProfile = {
    displayName: `Fictional RLS contributor ${run}`,
    bio: `PRIVATE RLS biography ${run}`,
    declaredSkills: ['React', 'TypeScript'], interests: [`Private interest ${run}`],
    location: 'Newcastle', hoursPerWeek: 7, participationTypes: ['contributor'], workModes: ['remote'],
  }
  for (const person of people) {
    await api(person, 'GET', '/me')
    await api(person, 'PATCH', '/me', person === contributor ? contributorProfile : {
      displayName: `Fictional RLS ${person.role.toLowerCase()} ${run}`, bio: `Private ${person.role} biography ${run}`,
    })
  }

  const projectBody = label => ({
    title: `[E2E fictional RLS] ${label} ${run}`, pitch: 'Fictional direct database permission checks.',
    problem: 'Fictional test problem.', solution: 'Fictional test solution.',
    sector: 'Software Engineering', location: 'Newcastle', stage: 'prototype',
  })
  const needBody = label => ({
    title: `Fictional ${label} role ${run}`, description: 'Fictional local RLS test opportunity.',
    requiredSkills: ['React'], desirableSkills: [], participationType: 'contributor',
    hoursPerWeek: 4, workMode: 'remote', location: 'Newcastle', compensation: 'voluntary', status: 'open',
  })
  const fixtures = []
  for (const label of ['draft', 'published']) {
    const project = await api(founder, 'POST', '/projects', projectBody(label), 201)
    const post = await api(founder, 'POST', `/projects/${project.id}/posts`, { type: 'progress', body: `Fictional ${label} progress ${run}` }, 201)
    const milestone = await api(founder, 'POST', `/projects/${project.id}/milestones`, {
      title: `Fictional ${label} milestone`, description: `Fictional self-reported milestone ${run}`,
      achievedAt: new Date().toISOString(), evidenceUrl: null,
    }, 201)
    const need = await api(founder, 'POST', `/projects/${project.id}/needs`, needBody(label), 201)
    if (label === 'published') await api(founder, 'PATCH', `/projects/${project.id}`, { visibility: 'public' })
    fixtures.push({ label, project, post, milestone, need })
  }
  const [draft, published] = fixtures
  const application = await api(contributor, 'POST', `/needs/${published.need.id}/applications`, { message: `Private fictional application ${run}` }, 201)
  const records = fixture => [
    ['projects', fixture.project.id, { title: 'Disallowed project title' }],
    ['project_posts', fixture.post.id, { body: 'Disallowed progress body' }],
    ['milestones', fixture.milestone.id, { title: 'Disallowed milestone title' }],
    ['project_needs', fixture.need.id, { title: 'Disallowed opportunity title' }],
  ]

  await t.test('private profiles remain self-only, including for an applicant’s founder', async () => {
    const query = `id=in.(${people.map(person => person.id).join(',')})`
    for (const person of people) {
      const ownRows = await rows(person, 'profiles', query)
      assert.deepEqual(ownRows.map(row => row.id), [person.id], 'only the caller profile is visible')
    }
    expectDenied(await rest(null, `profiles?select=*&${query}`), 'anonymous profile read')
    const before = await rows(contributor, 'profiles', `id=eq.${contributor.id}`)
    expectNoMutation(await rest(founder, `profiles?id=eq.${contributor.id}`, { method: 'PATCH', body: { bio: 'Disallowed biography' } }), 'cross-account profile update')
    assert.deepEqual(await rows(contributor, 'profiles', `id=eq.${contributor.id}`), before)
    expectDenied(await rest(contributor, `profiles?id=eq.${contributor.id}`, { method: 'PATCH', body: { id: unrelated.id } }), 'profile identity reassignment')
    assert.deepEqual(await rows(contributor, 'profiles', `id=eq.${contributor.id}`), before)
  })

  await t.test('draft projects and every child table are hidden; public children are readable', async () => {
    for (const fixture of fixtures) {
      for (const [table, id] of records(fixture)) {
        const ownerRows = await rows(founder, table, `id=eq.${id}`)
        assert.equal(ownerRows.length, 1, `owner reads ${fixture.label} ${table}`)
        for (const person of [null, contributor, unrelated]) {
          const visible = await rows(person, table, `id=eq.${id}`)
          assert.equal(visible.length, fixture === draft ? 0 : 1, `${person?.role ?? 'anonymous'} ${fixture.label} ${table} visibility`)
          if (visible.length) assert.equal(visible[0].id, id)
        }
      }
    }
  })

  await t.test('direct nonowner inserts cannot create projects or children under another owner', async () => {
    for (const person of [null, contributor, unrelated]) {
      const inserts = [
        ['projects', { owner_id: founder.id, title: 'Disallowed foreign-owned draft' }],
        ['project_posts', { project_id: published.project.id, author_id: person?.id ?? founder.id, type: 'progress', body: 'Disallowed foreign progress' }],
        ['milestones', { project_id: published.project.id, title: 'Disallowed foreign milestone', description: 'Fictional test', achieved_at: new Date().toISOString() }],
        ['project_needs', {
          project_id: published.project.id, title: 'Disallowed foreign opportunity', description: 'Fictional test',
          required_skills: [], desirable_skills: [], participation_type: 'contributor', hours_per_week: 4,
          work_mode: 'remote', location: 'Newcastle', compensation: 'voluntary', status: 'open',
        }],
      ]
      for (const [table, body] of inserts) {
        const id = randomUUID()
        expectDenied(await rest(person, table, { method: 'POST', body: { id, ...body } }), `${person?.role ?? 'anonymous'} ${table} insert`)
        assert.deepEqual(await rows(founder, table, `id=eq.${id}`), [], 'denied insert created no owner-visible row')
      }
    }
  })

  await t.test('direct nonowner updates affect no project or child rows and preserve stored state', async () => {
    for (const fixture of fixtures) {
      for (const [table, id, body] of records(fixture)) {
        const before = await rows(founder, table, `id=eq.${id}`)
        for (const person of [null, contributor, unrelated]) {
          expectNoMutation(await rest(person, `${table}?id=eq.${id}`, { method: 'PATCH', body }), `${person?.role ?? 'anonymous'} ${fixture.label} ${table} update`)
          assert.deepEqual(await rows(founder, table, `id=eq.${id}`), before, 'owner confirms the full record is unchanged')
        }
      }
    }
  })

  await t.test('ownerId is rejected by the API and direct ownership, author and parent fields are immutable', async () => {
    const guards = [
      ['projects', published.project.id, { owner_id: unrelated.id }],
      ['project_posts', published.post.id, { author_id: unrelated.id }],
      ['project_posts', published.post.id, { project_id: draft.project.id }],
      ['milestones', published.milestone.id, { project_id: draft.project.id }],
      ['project_needs', published.need.id, { project_id: draft.project.id }],
    ]
    const originalProject = await rows(founder, 'projects', `id=eq.${published.project.id}`)
    await api(founder, 'PATCH', `/projects/${published.project.id}`, { ownerId: unrelated.id }, 400)
    assert.deepEqual(await rows(founder, 'projects', `id=eq.${published.project.id}`), originalProject)
    for (const [table, id, body] of guards) {
      const before = await rows(founder, table, `id=eq.${id}`)
      expectDenied(await rest(founder, `${table}?id=eq.${id}`, { method: 'PATCH', body }), `immutable ${table} field`)
      assert.deepEqual(await rows(founder, table, `id=eq.${id}`), before)
    }
  })

  await t.test('applications are visible only to applicant and owner; direct unauthorized mutations preserve them', async () => {
    const query = `id=eq.${application.id}`
    const before = await rows(contributor, 'applications', query)
    assert.equal(before.length, 1)
    assert.equal(before[0].applicant_id, contributor.id)
    assert.deepEqual(await rows(founder, 'applications', query), before)
    assert.deepEqual(await rows(unrelated, 'applications', query), [])
    expectDenied(await rest(null, `applications?select=*&${query}`), 'anonymous application read')
    for (const person of [null, unrelated]) {
      expectNoMutation(await rest(person, `applications?${query}`, { method: 'PATCH', body: { status: 'accepted' } }), 'unrelated application update')
      assert.deepEqual(await rows(contributor, 'applications', query), before)
    }
    for (const body of [{ applicant_id: unrelated.id }, { need_id: draft.need.id }, { message: 'Disallowed rewrite' }, { status: 'accepted' }]) {
      expectDenied(await rest(contributor, `applications?${query}`, { method: 'PATCH', body }), 'applicant immutable fields/self-acceptance')
      assert.deepEqual(await rows(contributor, 'applications', query), before)
    }
  })

  await t.test('restricted review RPC exposes exactly three fields to the owner and denies every other caller', async () => {
    const path = 'rpc/application_review_summary'
    const body = { application_id: application.id }
    const result = await rest(founder, path, { method: 'POST', body })
    assert.equal(result.status, 200)
    assert.deepEqual(Object.keys(result.data).sort(), ['declaredSkills', 'displayName', 'hoursPerWeek'])
    assert.deepEqual(result.data, {
      displayName: contributorProfile.displayName, declaredSkills: contributorProfile.declaredSkills, hoursPerWeek: contributorProfile.hoursPerWeek,
    })
    for (const person of [null, contributor, unrelated]) expectDenied(await rest(person, path, { method: 'POST', body }), `${person?.role ?? 'anonymous'} review RPC`)
    expectDenied(await rest(founder, path, { method: 'POST', body: { application_id: randomUUID() } }), 'nonexistent application review RPC')
  })

  await t.test('a fresh caller session preserves private application and draft-child visibility', async () => {
    const freshApplicant = await signIn('CONTRIBUTOR')
    assert.equal(freshApplicant.id, contributor.id)
    const saved = await rows(freshApplicant, 'applications', `id=eq.${application.id}`)
    assert.equal(saved.length, 1)
    assert.equal(saved[0].status, 'submitted')
    assert.equal(saved[0].message, `Private fictional application ${run}`)
    assert.deepEqual(await rows(freshApplicant, 'project_needs', `id=eq.${draft.need.id}`), [])
  })
})
