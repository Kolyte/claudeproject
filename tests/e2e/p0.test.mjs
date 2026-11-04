import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
const require = createRequire(new URL('../../backend/package.json', import.meta.url))
const { createClient } = require('@supabase/supabase-js')
const { chromium } = require('@playwright/test')

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_PUBLISHABLE_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const apiUrl = process.env.NEO_API_URL ?? 'http://127.0.0.1:3001'
const uiUrl = process.env.NEO_UI_URL ?? 'http://127.0.0.1:5173'
const mailpitUrl = process.env.NEO_MAILPIT_URL ?? 'http://127.0.0.1:54324'
const enabled = Boolean(url && key && serviceKey)
const local = value => ['localhost', '127.0.0.1'].includes(new URL(value).hostname)
if (enabled && ![url, apiUrl, uiUrl, mailpitUrl].every(local)) throw new Error('These disposable-account tests run only against a local Supabase stack.')

test('real local Supabase: signup/confirmation, founder and contributor P0 journey', { skip: !enabled, timeout: 120_000 }, async t => {
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const run = randomUUID().slice(0, 8)
  const password = `Neo-test-${randomUUID()}!`
  const accounts = []
  let browser
  const title = `[Fictional test] River ${run}`
  async function request(path, { token, body, method = 'GET', expected = 200 } = {}) {
    const res = await fetch(`${apiUrl}/api${path}`, { method, headers: { ...(token && { Authorization: `Bearer ${token}` }), ...(body && { 'Content-Type': 'application/json' }) }, ...(body && { body: JSON.stringify(body) }) })
    const result = await res.json()
    assert.equal(res.status, expected, `${method} ${path}: ${JSON.stringify(result)}`)
    return result
  }
  async function account(name) {
    const email = `neo-${name}-${run}@example.test`
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    assert.ifError(created.error)
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const signedIn = await client.auth.signInWithPassword({ email, password })
    assert.ifError(signedIn.error)
    const result = { id: created.data.user.id, email, token: signedIn.data.session.access_token, client }
    accounts.push(result)
    await request('/me', { token: result.token })
    await request('/me', { token: result.token, method: 'PATCH', body: { displayName: name, bio: 'Private test biography', declaredSkills: ['React', 'TypeScript'], location: 'Newcastle', hoursPerWeek: 8, participationTypes: ['contributor'], workModes: ['hybrid'] } })
    return result
  }
  try {
    await t.test('registration requires and accepts email confirmation', async () => {
      const email = `neo-signup-${run}@example.test`
      const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
      const signup = await client.auth.signUp({ email, password })
      assert.ifError(signup.error)
      accounts.push({ id: signup.data.user.id })
      assert.equal(signup.data.session, null)
      const blocked = await client.auth.signInWithPassword({ email, password })
      assert.ok(blocked.error)
      let mail
      for (let attempt = 0; attempt < 20 && !mail; attempt++) {
        const inbox = await (await fetch(`${mailpitUrl}/api/v1/messages`)).json()
        mail = inbox.messages.find(item => item.To.some(recipient => recipient.Address === email))
        if (!mail) await new Promise(resolve => setTimeout(resolve, 200))
      }
      assert.ok(mail, 'Confirmation email was delivered to the local mail inbox')
      const contents = await (await fetch(`${mailpitUrl}/api/v1/message/${mail.ID}`)).json()
      const confirmationUrl = contents.HTML.match(/href="([^"]*\/auth\/v1\/verify[^\"]*)"/)?.[1]?.replaceAll('&amp;', '&')
      assert.ok(confirmationUrl)
      assert.ok(local(confirmationUrl))
      const confirmed = await fetch(confirmationUrl, { redirect: 'manual' })
      assert.equal(confirmed.status, 303)
      const signedIn = await client.auth.signInWithPassword({ email, password })
      assert.ifError(signedIn.error)
      await client.auth.signOut()
    })
    const founder = await account('Founder')
    const contributor = await account('Contributor')
    const third = await account('Unrelated')
    const draft = (await request('/projects', { token: founder.token, method: 'POST', expected: 201, body: { title, pitch: 'Open river sensors', problem: 'Flooding', solution: 'Community sensor network', sector: 'Climate', location: 'Newcastle', stage: 'prototype' } })).data
    await t.test('draft privacy, validated publishing and public response', async () => {
      await request(`/projects/${draft.id}`, { expected: 404 })
      await request(`/projects/${draft.id}`, { token: third.token, expected: 404 })
      await request(`/projects/${draft.id}`, { token: founder.token, method: 'PATCH', body: { ownerId: third.id }, expected: 400 })
      const published = await request(`/projects/${draft.id}`, { token: founder.token, method: 'PATCH', body: { visibility: 'public' } })
      assert.equal(published.data.visibility, 'public')
      await request(`/projects/${draft.id}`, { token: third.token, method: 'PATCH', body: { title: 'Denied' }, expected: 403 })
      const publicProject = await request(`/projects/${draft.id}`)
      assert.equal(publicProject.data.ownerDisplayName, 'Founder')
      assert.ok(!JSON.stringify(publicProject).includes('Private test biography'))
    })
    await request(`/projects/${draft.id}/posts`, { token: founder.token, method: 'POST', expected: 201, body: { type: 'progress', body: 'First sensor connected.' } })
    await request(`/projects/${draft.id}/milestones`, { token: founder.token, method: 'POST', expected: 201, body: { title: 'Prototype ready', description: 'Fictional test milestone', achievedAt: new Date().toISOString(), evidenceUrl: null } })
    const needBody = { title: 'React contributor', description: 'Build the sensor dashboard.', requiredSkills: ['React'], desirableSkills: ['TypeScript'], participationType: 'contributor', hoursPerWeek: 5, workMode: 'hybrid', location: 'Newcastle', compensation: 'voluntary', status: 'open' }
    const need = (await request(`/projects/${draft.id}/needs`, { token: founder.token, method: 'POST', expected: 201, body: needBody })).data
    const closed = (await request(`/projects/${draft.id}/needs`, { token: founder.token, method: 'POST', expected: 201, body: { ...needBody, title: 'Closed role', status: 'closed' } })).data
    await t.test('discovery, pagination, owner-only activity and need edits', async () => {
      const found = await request(`/discover/projects?location=newcastle&skill=react&q=${encodeURIComponent(run)}`)
      assert.equal(found.data.length, 1)
      assert.equal(found.data[0].openNeedsCount, 1)
      assert.equal((await request(`/discover/projects?location=Durham&q=${run}`)).data.length, 0)
      await request('/discover/projects?limit=51', { expected: 400 })
      await request(`/projects/${draft.id}/posts`, { token: third.token, method: 'POST', body: { type: 'progress', body: 'Denied' }, expected: 403 })
      await request(`/needs/${need.id}`, { token: third.token, method: 'PATCH', body: { status: 'closed' }, expected: 403 })
      await request(`/needs/${need.id}/applications`, { token: founder.token, method: 'POST', body: { message: 'My own role' }, expected: 403 })
      await request(`/needs/${closed.id}/applications`, { token: contributor.token, method: 'POST', body: { message: 'Closed role' }, expected: 409 })
    })
    browser = await chromium.launch({ channel: 'msedge', headless: true })
    const founderContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    const contributorContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    const founderPage = await founderContext.newPage()
    const contributorPage = await contributorContext.newPage()
    const { expect } = require('@playwright/test')
    async function login(page, user, next) {
      await page.goto(`${uiUrl}/login?next=${encodeURIComponent(next)}`)
      await page.getByLabel('Email', { exact: true }).fill(user.email)
      await page.getByLabel('Password', { exact: true }).fill(password)
      await page.getByRole('button', { name: 'Sign in', exact: true }).click()
      await expect(page).toHaveURL(`${uiUrl}${next}`)
    }
    await t.test('contributor filters, opens the project, and applies in the browser', async () => {
      await login(contributorPage, contributor, '/explore')
      await contributorPage.getByLabel('Search', { exact: true }).fill(run)
      await expect(contributorPage).toHaveURL(new RegExp(`q=${run}`))
      await contributorPage.getByLabel('Location', { exact: true }).selectOption('Newcastle')
      await contributorPage.getByLabel('Skill needed', { exact: true }).fill('React')
      await expect(contributorPage).toHaveURL(/skill=React/)
      await contributorPage.locator('.disc-card').filter({ hasText: title }).click()
      await expect(contributorPage.getByText('Founder reported', { exact: true })).toBeVisible()
      await contributorPage.getByRole('button', { name: 'Apply for this opportunity', exact: true }).click()
      await contributorPage.getByLabel('Why are you a good fit?').fill('I can build the React dashboard.')
      await contributorPage.getByRole('button', { name: 'Send application', exact: true }).click()
      await expect(contributorPage.getByText('Application sent.', { exact: false })).toBeVisible()
    })
    const application = (await request('/me/applications', { token: contributor.token })).data[0]
    await t.test('application privacy, duplicates, restricted founder summary', async () => {
      await request(`/needs/${need.id}/applications`, { token: contributor.token, method: 'POST', body: { message: 'Duplicate' }, expected: 409 })
      await request(`/projects/${draft.id}/applications`, { token: third.token, expected: 403 })
      assert.equal((await request('/me/applications', { token: third.token })).data.length, 0)
      await request(`/applications/${application.id}`, { token: third.token, method: 'PATCH', body: { status: 'accepted' }, expected: 404 })
      await request(`/applications/${application.id}`, { token: contributor.token, method: 'PATCH', body: { status: 'accepted' }, expected: 403 })
      const review = (await request(`/projects/${draft.id}/applications`, { token: founder.token })).data[0]
      assert.deepEqual(Object.keys(review.applicant).sort(), ['declaredSkills', 'displayName', 'hoursPerWeek'])
      const profiles = await contributor.client.from('profiles').select('*')
      assert.ifError(profiles.error)
      assert.equal(profiles.data.length, 1)
      assert.equal(profiles.data[0].id, contributor.id)
      const direct = await third.client.from('applications').select('*')
      assert.ifError(direct.error)
      assert.equal(direct.data.length, 0)
    })
    await t.test('founder reviews, contributor refreshes, mobile layout stays usable', async () => {
      await login(founderPage, founder, `/projects/${draft.id}/applications`)
      await founderPage.getByRole('button', { name: 'Mark reviewing', exact: true }).click()
      await expect(founderPage.locator('.chip').filter({ hasText: /^reviewing$/ })).toBeVisible()
      await founderPage.getByRole('button', { name: 'Accept', exact: true }).click()
      await expect(founderPage.locator('.chip').filter({ hasText: /^accepted$/ })).toBeVisible()
      await contributorPage.goto(`${uiUrl}/dashboard/applications`)
      await expect(contributorPage.locator('.chip').filter({ hasText: /^accepted$/ })).toBeVisible()
      await contributorPage.reload()
      await expect(contributorPage.locator('.chip').filter({ hasText: /^accepted$/ })).toBeVisible()
      await request(`/applications/${application.id}`, { token: founder.token, method: 'PATCH', body: { status: 'reviewing' }, expected: 409 })
      await contributorPage.goto(`${uiUrl}/projects/${draft.id}`)
      await contributorPage.setViewportSize({ width: 390, height: 844 })
      await expect(contributorPage.getByRole('heading', { name: title, exact: true })).toBeVisible()
      await expect(contributorPage.getByText('First sensor connected.', { exact: true })).toBeVisible()
      await expect(contributorPage.locator(`#need-${need.id}`).getByText('Build the sensor dashboard.', { exact: true })).toBeVisible()
      await expect(contributorPage.getByText('Fictional test milestone', { exact: true })).toBeVisible()
      assert.equal(await contributorPage.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      await mkdir(new URL('./test-results/', import.meta.url), { recursive: true })
      await contributorPage.screenshot({ path: new URL('./test-results/p0-mobile.png', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), fullPage: true })
      await contributorPage.setViewportSize({ width: 1440, height: 1000 })
      await contributorPage.screenshot({ path: new URL('./test-results/p0-desktop.png', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), fullPage: true })
    })
  } finally {
    if (browser) await browser.close()
    for (const user of accounts) {
      const removed = await admin.from('projects').delete().eq('owner_id', user.id)
      assert.ifError(removed.error)
    }
    for (const user of accounts.reverse()) {
      const deleted = await admin.auth.admin.deleteUser(user.id)
      assert.ifError(deleted.error)
    }
  }
})
