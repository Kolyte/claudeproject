// P5-03: real mobile form workflow on an isolated local stack with prepared fictional accounts.
// Run through local-acceptance.mjs; standalone use requires the E2E_* variables below.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const env = process.env
const required = ['E2E_BASE_URL', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
  'E2E_FOUNDER_EMAIL', 'E2E_FOUNDER_PASSWORD', 'E2E_CONTRIBUTOR_EMAIL', 'E2E_CONTRIBUTOR_PASSWORD',
  'E2E_SIGNUP_EMAIL', 'E2E_RUN_ID']
const missing = required.filter(name => !env[name])
const uiUrl = (env.NEO_UI_URL ?? env.E2E_BASE_URL ?? '').replace(/\/$/, '')
const apiUrl = env.NEO_API_URL ?? env.E2E_BASE_URL
const mailpitUrl = env.NEO_MAILPIT_URL ?? 'http://127.0.0.1:54324'
const local = value => ['localhost', '127.0.0.1'].includes(new URL(value).hostname)
if (!missing.length && ![uiUrl, apiUrl, env.SUPABASE_URL, mailpitUrl].every(local)) {
  throw new Error('The disposable signup and form workflow requires local targets only.')
}

test('local mobile browser forms and new-session persistence', {
  skip: missing.length ? `missing env: ${missing.join(', ')}` : false,
  timeout: 240_000,
}, async t => {
  const require = createRequire(new URL('../../backend/package.json', import.meta.url))
  const { chromium, expect } = require('@playwright/test')
  const { createClient } = require('@supabase/supabase-js')
  const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const channel = env.NEO_BROWSER_CHANNEL ?? 'msedge'
  const browser = await chromium.launch({ headless: true,
    ...(env.NEO_BROWSER_PATH ? { executablePath: env.NEO_BROWSER_PATH } : channel === 'chromium' ? {} : { channel }),
  })
  const run = env.E2E_RUN_ID
  const signupPassword = `Neo-forms-${randomUUID()}!`
  const title = `[Forms fictional] Tyne ${run}`
  const pitch = `Fictional community sensor dashboard ${run}`
  const update = `Fictional sensor prototype connected ${run}.`
  const milestone = `Fictional prototype ${run}`
  const needTitle = `React contributor ${run}`
  const closedTitle = `Closed fictional role ${run}`
  const applicationMessage = `Fictional React contribution ${run}.`
  const pageErrors = []
  const externalRequests = []
  const resultDir = new URL('./test-results/', import.meta.url)
  let signupId, founderContext, founderPage, contributorContext, contributorPage, projectId
  let failed = false

  async function step(name, body) {
    await t.test(name, { skip: failed ? 'An earlier workflow step failed' : false }, async () => {
      try { await body() } catch (error) {
        failed = true
        for (const [index, page] of browser.contexts().flatMap(context => context.pages()).entries()) {
          try {
            await mkdir(resultDir, { recursive: true })
            await page.screenshot({ path: fileURLToPath(new URL(`forms-failure-${index}.png`, resultDir)), fullPage: true })
            const controls = await page.locator('input, textarea, select').evaluateAll(elements => elements.map(element => ({
              tag: element.tagName, type: element.getAttribute('type'),
              labels: [...element.labels ?? []].map(label => label.querySelector(':scope > span')?.textContent?.trim()
                ?? [...label.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join('').trim()),
            })))
            t.diagnostic(JSON.stringify({ failedStep: name, pagePath: new URL(page.url()).pathname, controls }))
          } catch { t.diagnostic('Failure screenshot or form metadata could not be captured.') }
        }
        throw error
      }
    })
  }
  async function mobilePage() {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } })
    // The built frontend must also use local Auth; block accidental shared-hosted requests.
    await context.route('**/*', route => {
      const url = new URL(route.request().url())
      if (['http:', 'https:'].includes(url.protocol) && !local(url)) {
        externalRequests.push(`${url.origin}${url.pathname}`)
        return route.abort('blockedbyclient')
      }
      return route.continue()
    })
    const page = await context.newPage()
    page.setDefaultTimeout(10_000)
    page.on('pageerror', error => pageErrors.push(error.message))
    return { context, page }
  }
  async function login(page, email, password, next) {
    await page.goto(`${uiUrl}/login?next=${encodeURIComponent(next)}`)
    await page.getByLabel('Email', { exact: true }).fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(page).toHaveURL(`${uiUrl}${next}`)
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible()
  }
  async function signOut(page) {
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Welcome back', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toHaveCount(0)
  }
  async function screenshot(page, name) {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false,
      `${name} must fit the 375px viewport`)
    await mkdir(resultDir, { recursive: true })
    await page.screenshot({ path: fileURLToPath(new URL(`forms-${name}.png`, resultDir)), fullPage: true })
  }
  const needCard = (page, name) => page.locator('article.need').filter({
    has: page.getByRole('heading', { level: 3, name, exact: true }),
  })
  const applicationRow = page => page.locator('.op-list > li').filter({
    has: page.getByText(applicationMessage, { exact: true }),
  })
  async function addNeed(page, name) {
    await page.getByRole('button', { name: 'Add an opportunity', exact: true }).click()
    const form = page.locator('form').filter({ has: page.getByLabel('Opportunity title', { exact: true }) })
    await form.getByLabel('Opportunity title', { exact: true }).fill(name)
    await form.getByRole('textbox', { name: 'What help do you need?', exact: true }).fill(`Fictional dashboard help ${run}.`)
    await form.getByLabel('Required skills (comma separated)', { exact: true }).fill('React')
    await form.getByLabel('Desirable skills (comma separated)', { exact: true }).fill('TypeScript')
    await form.getByRole('combobox', { name: 'Participation', exact: true }).selectOption('contributor')
    await form.getByLabel('Hours per week', { exact: true }).fill('5')
    await form.getByRole('combobox', { name: 'Work mode', exact: true }).selectOption('hybrid')
    await form.getByLabel('Location', { exact: true }).fill('Newcastle')
    await form.getByRole('combobox', { name: 'Compensation', exact: true }).selectOption('voluntary')
    await form.getByRole('button', { name: 'Add opportunity', exact: true }).click()
    await expect(needCard(page, name)).toBeVisible()
  }

  try {
    await step('browser signup, email confirmation and sign-in', async () => {
      const { context, page } = await mobilePage()
      await page.goto(`${uiUrl}/signup`)
      await page.getByLabel('Email', { exact: true }).fill(env.E2E_SIGNUP_EMAIL)
      await page.getByLabel('Password', { exact: true }).fill(signupPassword)
      const responsePromise = page.waitForResponse(response =>
        new URL(response.url()).pathname === '/auth/v1/signup' && response.request().method() === 'POST')
      await page.getByRole('button', { name: 'Create account', exact: true }).click()
      const response = await responsePromise
      assert.equal(response.status(), 200, 'local Auth accepts browser signup')
      const created = await response.json()
      signupId = created.id ?? created.user?.id
      assert.match(signupId ?? '', /^[0-9a-f-]{36}$/i, 'signup response identifies the disposable account')
      await expect(page.getByRole('status')).toHaveText('Check your email to confirm your account, then sign in here.')
      await page.getByRole('link', { name: 'Already registered? Sign in', exact: true }).click()
      await page.getByLabel('Email', { exact: true }).fill(env.E2E_SIGNUP_EMAIL)
      await page.getByLabel('Password', { exact: true }).fill(signupPassword)
      await page.getByRole('button', { name: 'Sign in', exact: true }).click()
      await expect(page.getByRole('alert')).toContainText(/email not confirmed/i)
      let mailId
      await expect.poll(async () => {
        const inbox = await fetch(`${mailpitUrl}/api/v1/messages`)
        assert.equal(inbox.status, 200, 'local confirmation inbox is reachable')
        const contents = await inbox.json()
        mailId = contents.messages?.find(mail => mail.To?.some(to => to.Address === env.E2E_SIGNUP_EMAIL))?.ID
        return Boolean(mailId)
      }, { timeout: 15_000, message: 'Confirmation reaches local Mailpit' }).toBe(true)
      const mail = await (await fetch(`${mailpitUrl}/api/v1/message/${mailId}`)).json()
      const link = mail.HTML.match(/href="([^"]*\/auth\/v1\/verify[^"]*)"/)?.[1]?.replaceAll('&amp;', '&')
      assert.ok(link && local(link), 'email confirmation link remains local')
      const confirmation = await fetch(link, { redirect: 'manual' })
      assert.equal(confirmation.status, 303, 'confirmation accepts the signup token')
      await login(page, env.E2E_SIGNUP_EMAIL, signupPassword, '/profile')
      await expect(page.getByRole('heading', { name: 'Your profile', exact: true })).toBeVisible()
      await signOut(page)
      await context.close()
    })

    await step('founder profile form persists after sign-out and a new browser context', async () => {
      ;({ context: founderContext, page: founderPage } = await mobilePage())
      await login(founderPage, env.E2E_FOUNDER_EMAIL, env.E2E_FOUNDER_PASSWORD, '/profile')
      await founderPage.getByLabel('Display name', { exact: true }).fill(`Forms Founder ${run}`)
      await founderPage.getByRole('textbox', { name: 'About you', exact: true }).fill(`Private fictional profile ${run}.`)
      await founderPage.getByLabel('Location', { exact: true }).fill('Newcastle')
      await founderPage.getByLabel('Declared skills (comma separated)', { exact: true }).fill('React, TypeScript')
      await founderPage.getByLabel('Interests (comma separated)', { exact: true }).fill('Sensors, Community')
      await founderPage.getByLabel('Hours available each week', { exact: true }).fill('12')
      await founderPage.getByRole('checkbox', { name: 'cofounder', exact: true }).check()
      await founderPage.getByRole('checkbox', { name: 'mentor', exact: true }).check()
      await founderPage.getByRole('checkbox', { name: 'hybrid', exact: true }).check()
      await founderPage.getByRole('button', { name: 'Save profile', exact: true }).click()
      await expect(founderPage.getByRole('status')).toHaveText('Profile saved.')
      await signOut(founderPage)
      await founderContext.close()
      ;({ context: founderContext, page: founderPage } = await mobilePage())
      await login(founderPage, env.E2E_FOUNDER_EMAIL, env.E2E_FOUNDER_PASSWORD, '/profile')
      for (const [label, value] of [['Display name', `Forms Founder ${run}`], ['About you', `Private fictional profile ${run}.`],
        ['Location', 'Newcastle'], ['Declared skills (comma separated)', 'React, TypeScript'],
        ['Interests (comma separated)', 'Sensors, Community'], ['Hours available each week', '12']]) {
        const field = label === 'About you' ? founderPage.getByRole('textbox', { name: label, exact: true })
          : founderPage.getByLabel(label, { exact: true })
        await expect(field).toHaveValue(value)
      }
      for (const name of ['cofounder', 'mentor', 'hybrid']) {
        await expect(founderPage.getByRole('checkbox', { name, exact: true })).toBeChecked()
      }
      await screenshot(founderPage, 'profile-mobile')
    })

    await step('founder creates a draft and publishes it through project forms', async () => {
      await founderPage.getByRole('link', { name: 'Your projects', exact: true }).click()
      await founderPage.getByRole('link', { name: 'Start a project', exact: true }).click()
      await founderPage.getByLabel('Project title', { exact: true }).fill(title)
      await founderPage.getByLabel('One-line pitch', { exact: true }).fill('Fictional initial draft pitch.')
      await founderPage.getByRole('textbox', { name: 'Problem', exact: true }).fill('A fictional community needs river-level information.')
      await founderPage.getByRole('textbox', { name: 'Solution', exact: true }).fill('A fictional dashboard displays community sensor data.')
      await founderPage.getByRole('combobox', { name: 'Sector', exact: true }).fill('Software')
      await founderPage.getByRole('option', { name: 'Software Engineering', exact: true }).click()
      await founderPage.getByLabel('Location', { exact: true }).fill('Newcastle')
      await founderPage.getByRole('combobox', { name: 'Stage', exact: true }).selectOption('prototype')
      await founderPage.getByRole('button', { name: 'Save private draft', exact: true }).click()
      await expect(founderPage.getByRole('heading', { name: title, exact: true })).toBeVisible()
      await expect(founderPage.getByText('Private draft', { exact: true })).toBeVisible()
      projectId = new URL(founderPage.url()).pathname.split('/').at(-1)
      assert.match(projectId, /^[0-9a-f-]{36}$/i)
      await founderPage.getByRole('link', { name: 'Edit project', exact: true }).click()
      await founderPage.getByLabel('One-line pitch', { exact: true }).fill(pitch)
      await founderPage.getByRole('combobox', { name: 'Visibility', exact: true }).selectOption('public')
      await founderPage.getByRole('button', { name: 'Save changes', exact: true }).click()
      await expect(founderPage.getByRole('heading', { name: title, exact: true })).toBeVisible()
      await expect(founderPage.getByText(pitch, { exact: true })).toBeVisible()
      await expect(founderPage.getByText('Private draft', { exact: true })).toHaveCount(0)
    })

    await step('founder publishes progress and milestone, adds, edits and closes opportunities', async () => {
      await founderPage.getByRole('textbox', { name: 'Update', exact: true }).fill(update)
      await founderPage.getByRole('button', { name: 'Publish update', exact: true }).click()
      await expect(founderPage.getByText('Update published.', { exact: true })).toBeVisible()
      await expect(founderPage.getByText(update, { exact: true })).toBeVisible()
      await founderPage.getByLabel('Milestone title', { exact: true }).fill(milestone)
      await founderPage.getByRole('textbox', { name: 'Milestone description', exact: true }).fill(`Fictional milestone evidence ${run}.`)
      await founderPage.getByLabel('Date achieved', { exact: true }).fill(new Date().toISOString().slice(0, 10))
      await founderPage.getByRole('button', { name: 'Publish milestone', exact: true }).click()
      await expect(founderPage.getByText('Milestone published.', { exact: true })).toBeVisible()
      await expect(founderPage.getByRole('heading', { name: milestone, exact: true })).toBeVisible()
      await expect(founderPage.getByText('Founder reported', { exact: true })).toBeVisible()
      await addNeed(founderPage, needTitle)
      await needCard(founderPage, needTitle).getByRole('button', { name: 'Edit opportunity', exact: true }).click()
      await founderPage.getByRole('textbox', { name: 'What help do you need?', exact: true }).fill(`Fictional edited React dashboard ${run}.`)
      await founderPage.getByLabel('Hours per week', { exact: true }).fill('7')
      await founderPage.getByRole('button', { name: 'Save opportunity', exact: true }).click()
      await expect(needCard(founderPage, needTitle).getByText(`Fictional edited React dashboard ${run}.`, { exact: true })).toBeVisible()
      await expect(needCard(founderPage, needTitle)).toContainText('7 h/week')
      await addNeed(founderPage, closedTitle)
      await needCard(founderPage, closedTitle).getByRole('combobox', { name: `Status of ${closedTitle}`, exact: true }).selectOption('closed')
      await expect(needCard(founderPage, closedTitle).locator('.badge')).toHaveText('Closed')
      await screenshot(founderPage, 'owner-project-mobile')
    })

    await step('contributor discovers the project and applies through mobile forms', async () => {
      ;({ context: contributorContext, page: contributorPage } = await mobilePage())
      await login(contributorPage, env.E2E_CONTRIBUTOR_EMAIL, env.E2E_CONTRIBUTOR_PASSWORD, '/explore')
      await contributorPage.getByLabel('Search', { exact: true }).fill(run)
      await expect(contributorPage).toHaveURL(url => url.searchParams.get('q') === run)
      await contributorPage.getByLabel('Skill needed', { exact: true }).fill('React')
      await expect(contributorPage).toHaveURL(url => url.searchParams.get('skill') === 'React')
      await contributorPage.getByRole('combobox', { name: 'Location', exact: true }).selectOption('Newcastle')
      await expect(contributorPage).toHaveURL(url => url.searchParams.get('location') === 'Newcastle')
      const card = contributorPage.locator('.disc-card').filter({ has: contributorPage.getByRole('heading', { name: title, exact: true }) })
      await expect(card).toContainText('1 open role')
      await card.click()
      await expect(contributorPage).toHaveURL(`${uiUrl}/projects/${projectId}`)
      await expect(contributorPage.getByText(update, { exact: true })).toBeVisible()
      await expect(needCard(contributorPage, closedTitle)).toContainText('Not accepting applications.')
      await expect(needCard(contributorPage, closedTitle).getByRole('button')).toHaveCount(0)
      const opportunity = needCard(contributorPage, needTitle)
      await opportunity.getByRole('button', { name: 'Apply for this opportunity', exact: true }).click()
      await opportunity.getByRole('textbox', { name: 'Why are you a good fit?', exact: true }).fill(applicationMessage)
      await opportunity.getByRole('button', { name: 'Send application', exact: true }).click()
      await expect(opportunity.getByRole('status')).toContainText('Application sent.')
      await screenshot(contributorPage, 'contributor-project-mobile')
      await opportunity.getByRole('link', { name: 'Track your application', exact: true }).click()
      await expect(applicationRow(contributorPage).locator('.op-status')).toHaveText('submitted')
      await signOut(contributorPage)
      await contributorContext.close()
    })

    await step('founder reviews the selected application and accepts it on mobile', async () => {
      await founderPage.getByRole('link', { name: 'Review applications', exact: true }).click()
      const row = applicationRow(founderPage)
      await expect(row).toContainText(needTitle)
      await row.getByRole('button', { name: 'Mark reviewing', exact: true }).click()
      await expect(row.locator('.op-status')).toHaveText('reviewing')
      await row.getByRole('button', { name: 'Accept', exact: true }).click()
      await expect(row.locator('.op-status')).toHaveText('accepted')
      await expect(row.getByRole('button')).toHaveCount(0)
      await screenshot(founderPage, 'review-mobile')
    })

    await step('new contributor session and anonymous refresh preserve saved results', async () => {
      ;({ context: contributorContext, page: contributorPage } = await mobilePage())
      await login(contributorPage, env.E2E_CONTRIBUTOR_EMAIL, env.E2E_CONTRIBUTOR_PASSWORD, '/dashboard/applications')
      await expect(applicationRow(contributorPage).locator('.op-status')).toHaveText('accepted')
      await contributorPage.reload()
      await expect(applicationRow(contributorPage).locator('.op-status')).toHaveText('accepted')
      await expect(applicationRow(contributorPage).getByRole('button', { name: 'Withdraw application' })).toHaveCount(0)
      await screenshot(contributorPage, 'application-mobile')
      const { context, page } = await mobilePage()
      await page.goto(`${uiUrl}/projects/${projectId}`)
      await page.reload()
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
      await expect(page.getByText(update, { exact: true })).toBeVisible()
      await expect(page.getByRole('heading', { name: milestone, exact: true })).toBeVisible()
      await expect(page.getByText('Founder reported', { exact: true })).toBeVisible()
      await expect(needCard(page, needTitle).getByRole('link', { name: 'Sign in to apply', exact: true })).toBeVisible()
      await screenshot(page, 'public-project-mobile')
      await context.close()
    })
    assert.deepEqual(externalRequests, [], 'browser must not call shared hosted services')
    assert.deepEqual(pageErrors, [], 'all browser form sessions must be free from uncaught errors')
  } finally {
    await browser.close()
    if (signupId) {
      const lookup = await admin.auth.admin.getUserById(signupId)
      assert.ifError(lookup.error)
      assert.equal(lookup.data.user.email, env.E2E_SIGNUP_EMAIL, 'cleanup targets only this run\'s signup account')
      const removed = await admin.auth.admin.deleteUser(signupId)
      assert.ifError(removed.error)
    }
  }
})
