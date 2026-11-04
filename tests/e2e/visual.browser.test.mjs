// Screenshot review and visual regressions against the real, disposable local dataset.
// Run with local-acceptance.mjs; E2E_VISUAL_PHASE separates before/after evidence.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const env = process.env;
const required = ['E2E_BASE_URL', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY',
  'E2E_FOUNDER_EMAIL', 'E2E_FOUNDER_PASSWORD', 'E2E_CONTRIBUTOR_EMAIL', 'E2E_CONTRIBUTOR_PASSWORD'];
const missing = required.filter(name => !env[name]);
const base = (env.NEO_UI_URL ?? env.E2E_BASE_URL ?? '').replace(/\/$/, '');
const apiBase = (env.NEO_API_URL ?? env.E2E_BASE_URL ?? '').replace(/\/$/, '');
const local = value => ['127.0.0.1', 'localhost'].includes(new URL(value).hostname);
if (!missing.length) assert.ok([base, apiBase, env.SUPABASE_URL].every(local), 'Visual fixtures require local targets.');
const phase = env.E2E_VISUAL_PHASE ?? 'after';
assert.ok(['before', 'after'].includes(phase), 'Visual phase must be before or after.');
const dir = new URL(`./test-results/visual/${phase}/`, import.meta.url);

test('local desktop, tablet and mobile visual review', { skip: missing.length ? `missing env: ${missing.join(', ')}` : false, timeout: 180_000 }, async t => {
  const require = createRequire(new URL('../../backend/package.json', import.meta.url));
  const { chromium, expect } = require('@playwright/test');
  const browser = await chromium.launch({ headless: true, ...(env.NEO_BROWSER_PATH ? { executablePath: env.NEO_BROWSER_PATH } :
    (env.NEO_BROWSER_CHANNEL ?? 'msedge') === 'chromium' ? {} : { channel: env.NEO_BROWSER_CHANNEL ?? 'msedge' }) });
  const observations = [];
  const pageErrors = [];
  const blockedRequests = [];
  await mkdir(dir, { recursive: true });
  async function account(role) {
    const response = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST', redirect: 'error', headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: env[`E2E_${role}_EMAIL`], password: env[`E2E_${role}_PASSWORD`] }),
    });
    assert.equal(response.status, 200, `${role} visual account login`);
    return (await response.json()).access_token;
  }
  async function api(token, path, body) {
    const response = await fetch(`${apiBase}/api${path}`, { redirect: 'error',
      method: body ? 'PATCH' : 'GET', headers: { Authorization: `Bearer ${token}`, ...(body && { 'Content-Type': 'application/json' }) },
      ...(body && { body: JSON.stringify(body) }),
    });
    assert.equal(response.status, 200, `visual setup ${path}`);
    return (await response.json()).data;
  }
  async function context() {
    const ctx = await browser.newContext();
    await ctx.route('**/*', route => {
      const url = new URL(route.request().url());
      if (['http:', 'https:'].includes(url.protocol) && !local(url)) {
        blockedRequests.push(`${url.origin}${url.pathname}`);
        return route.abort();
      }
      return route.continue();
    });
    ctx.on('page', page => { page.setDefaultTimeout(10_000); page.on('pageerror', error => pageErrors.push(error.message)); });
    return ctx;
  }
  async function settled(page) {
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole('status').filter({ hasText: /^Loading/ })).toHaveCount(0);
    await expect(page.locator('[data-discovery-status="loading"]')).toHaveCount(0);
  }
  async function capture(page, name, { checkOverflow = true } = {}) {
    await page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, dir)), fullPage: true });
    const geometry = await page.evaluate(() => ({
      viewport: innerWidth, documentWidth: document.documentElement.scrollWidth,
      offenders: [...document.querySelectorAll('main *, .neo-topbar *')].filter(el => {
        const box = el.getBoundingClientRect();
        return box.width && (box.right > innerWidth + 1 || box.left < -1);
      }).slice(0, 8).map(el => ({ tag: el.tagName, class: el.className, text: (el.textContent ?? '').slice(0, 70) })),
    }));
    observations.push({ name, ...geometry });
    if (checkOverflow) assert.ok(geometry.documentWidth <= geometry.viewport, `${name}: horizontal overflow ${geometry.documentWidth - geometry.viewport}px`);
  }
  async function login(page, role, next) {
    await page.goto(`${base}/login?next=${encodeURIComponent(next)}`);
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(env[`E2E_${role}_EMAIL`]);
    await page.getByLabel('Password', { exact: true }).fill(env[`E2E_${role}_PASSWORD`]);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(`${base}${next}`);
    await settled(page);
  }
  async function contrast(locator, { outline = false } = {}) {
    return locator.evaluate((el, useOutline) => {
      const style = getComputedStyle(el);
      const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number);
      let ancestor = useOutline ? el.parentElement : el;
      while (ancestor && getComputedStyle(ancestor).backgroundColor === 'rgba(0, 0, 0, 0)') ancestor = ancestor.parentElement;
      const background = getComputedStyle(ancestor ?? document.body).backgroundColor;
      const foreground = useOutline ? style.outlineColor : style.color;
      const luminance = color => rgb(color).map(channel => {
        const value = channel / 255;
        return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
      }).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
      const [a, b] = [luminance(foreground), luminance(background)].sort((x, y) => y - x);
      return { foreground, background, ratio: (a + .05) / (b + .05), ...(useOutline && {
        outlineStyle: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth), focusVisible: el.matches(':focus-visible'),
      }) };
    }, outline);
  }
  try {
    const founder = await account('FOUNDER');
    const contributor = await account('CONTRIBUTOR');
    const projects = await api(founder, '/me/projects?limit=50');
    // Earlier suites deliberately leave applications on their own projects until runner cleanup.
    const project = projects.find(item => item.visibility === 'public' && item.title === 'QuayWatch');
    assert.ok(project, 'seeded published project is available');
    const needs = await api(founder, `/projects/${project.id}/needs`);
    const need = needs.find(item => item.status === 'open');
    assert.ok(need);
    const applicationResponse = await fetch(`${apiBase}/api/needs/${need.id}/applications`, {
      method: 'POST', redirect: 'error', headers: { Authorization: `Bearer ${contributor}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Fictional visual-review application. I can contribute React and TypeScript.' }),
    });
    assert.equal(applicationResponse.status, 201);
    const publicCtx = await context();
    const publicPage = await publicCtx.newPage();
    const ownerCtx = await context();
    const ownerPage = await ownerCtx.newPage();
    await login(ownerPage, 'FOUNDER', '/profile');
    const applicantCtx = await context();
    const applicantPage = await applicantCtx.newPage();
    await login(applicantPage, 'CONTRIBUTOR', '/dashboard/applications');
    const publicRoutes = [['landing', '/'], ['explore', '/explore'], ['pricing', '/pricing'], ['login', '/login'], ['signup', '/signup'], ['public-project', `/projects/${project.id}`]];
    const ownerRoutes = [['profile', '/profile'], ['projects', '/dashboard/projects'], ['new-project', '/projects/new'],
      ['edit-project', `/projects/${project.id}/edit`], ['owner-project', `/projects/${project.id}`], ['review', `/projects/${project.id}/applications`]];
    for (const width of [1440, 768, 375, 320]) {
      for (const [page, routes] of [[publicPage, publicRoutes], [ownerPage, ownerRoutes], [applicantPage, [['applications', '/dashboard/applications']]]]) {
        await page.setViewportSize({ width, height: width >= 768 ? 1000 : 812 });
        for (const [name, path] of routes) await t.test(`${name} at ${width}px`, async () => {
          const response = await page.goto(`${base}${path}`);
          assert.equal(response.status(), 200);
          await settled(page);
          await capture(page, `${name}-${width}`);
          if (name === 'new-project' && width <= 375) {
            const fieldWidth = await page.getByRole('combobox', { name: 'Sector', exact: true }).evaluate(el => el.getBoundingClientRect().width);
            assert.ok(fieldWidth >= 200, `mobile sector field is cramped at ${Math.round(fieldWidth)}px`);
          }
          if (name === 'landing' && width === 1440) {
            const unused = await page.locator('.disc-grid').evaluate(grid => grid.getBoundingClientRect().right - grid.lastElementChild.getBoundingClientRect().right);
            assert.ok(unused <= 1, `recent project cards leave ${Math.round(unused)}px of unused row space`);
          }
        });
      }
    }
    await publicPage.setViewportSize({ width: 375, height: 812 });
    await t.test('sector suggestions have readable paper-surface contrast', async () => {
      await publicPage.goto(`${base}/explore`); await settled(publicPage);
      await publicPage.getByRole('combobox', { name: 'Sector', exact: true }).fill('fi');
      const option = publicPage.locator('.disc-sector-option:not(.active)').first();
      await expect(option).toBeVisible();
      const colors = await contrast(option);
      observations.push({ name: 'sector-option-contrast', ...colors });
      await capture(publicPage, 'sector-suggestions-375');
      await publicPage.screenshot({ path: fileURLToPath(new URL('sector-suggestions-375-viewport.png', dir)) });
      assert.ok(colors.ratio >= 4.5, `sector suggestion text contrast ${colors.ratio.toFixed(2)}:1`);
    });
    await t.test('paper ticket keyboard focus is visible', async () => {
      await publicPage.goto(base); await settled(publicPage);
      const link = publicPage.locator('.disc-ticket-link');
      for (let presses = 0; presses < 30 && !await link.evaluate(el => el === document.activeElement); presses++) {
        await publicPage.keyboard.press('Tab');
      }
      await expect(link).toBeFocused();
      const colors = await contrast(link, { outline: true });
      observations.push({ name: 'ticket-focus-contrast', ...colors });
      await capture(publicPage, 'ticket-focus-375');
      assert.ok(colors.focusVisible && colors.outlineStyle !== 'none' && colors.outlineWidth >= 2, 'keyboard focus paints a visible outline');
      assert.ok(colors.ratio >= 3, `paper ticket focus contrast ${colors.ratio.toFixed(2)}:1`);
    });
    await t.test('pricing plan keyboard focus is visible on paper', async () => {
      await publicPage.goto(`${base}/pricing`); await settled(publicPage);
      const link = publicPage.getByRole('link', { name: /sign up as an investor/i });
      for (let presses = 0; presses < 30 && !await link.evaluate(el => el === document.activeElement); presses++) {
        await publicPage.keyboard.press('Tab');
      }
      await expect(link).toBeFocused();
      const colors = await contrast(link, { outline: true });
      observations.push({ name: 'pricing-focus-contrast', ...colors });
      await capture(publicPage, 'pricing-focus-375');
      assert.ok(colors.focusVisible && colors.outlineStyle !== 'none' && colors.outlineWidth >= 2, 'pricing keyboard focus paints a visible outline');
      assert.ok(colors.ratio >= 3, `paper pricing focus contrast ${colors.ratio.toFixed(2)}:1`);
    });
    await t.test('no-results and network errors show usable recovery actions', async () => {
      await publicPage.goto(`${base}/explore?q=nonexistent-visual-fixture-0000`); await settled(publicPage);
      await expect(publicPage.locator('.disc-state').getByRole('button', { name: /clear filters/i })).toBeVisible();
      await capture(publicPage, 'no-results-375');
      await publicPage.route('**/api/discover/projects**', route => route.abort());
      await publicPage.goto(`${base}/explore`); await settled(publicPage);
      await expect(publicPage.getByRole('button', { name: /try again/i })).toBeVisible();
      await capture(publicPage, 'network-error-375');
      await publicPage.unroute('**/api/discover/projects**');
    });
    await t.test('loading placeholders fit the mobile results area', async () => {
      const requested = Promise.withResolvers();
      const release = Promise.withResolvers();
      await publicPage.route('**/api/discover/projects**', async route => {
        requested.resolve();
        await release.promise;
        await route.continue();
      });
      try {
        await publicPage.goto(`${base}/explore`, { waitUntil: 'domcontentloaded' });
        await requested.promise;
        await expect(publicPage.locator('[aria-busy="true"] .disc-skeleton')).toHaveCount(6);
        await capture(publicPage, 'loading-375');
      } finally {
        release.resolve();
        await settled(publicPage);
        await publicPage.unroute('**/api/discover/projects**');
      }
    });
    await t.test('permitted long profile names fit the narrow signed-in navigation', async () => {
      const original = await api(founder, '/me');
      const longName = 'Fictional'.repeat(15).slice(0, 120);
      try {
        await api(founder, '/me', { displayName: longName });
        await ownerPage.setViewportSize({ width: 320, height: 812 });
        await ownerPage.reload(); await settled(ownerPage);
        await expect(ownerPage.locator('.neo-nav a[href="/profile"]')).toHaveText(longName);
        await capture(ownerPage, 'long-profile-name-320');
      } finally { await api(founder, '/me', { displayName: original.displayName }); }
    });
    await t.test('200 percent text size keeps discovery actions inside the viewport', async () => {
      await publicPage.setViewportSize({ width: 768, height: 1000 });
      await publicPage.goto(`${base}/explore`); await settled(publicPage);
      await publicPage.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      await capture(publicPage, 'explore-text-200-percent-768');
    });
    await t.test('permitted long project fields wrap on detail and owner dashboard pages', async () => {
      const fields = { title: 'Fictional'.repeat(15).slice(0, 120), pitch: 'Fictional'.repeat(34).slice(0, 300), location: 'Newcastle'.repeat(14).slice(0, 120) };
      try {
        await api(founder, `/projects/${project.id}`, fields);
        await publicPage.setViewportSize({ width: 320, height: 812 });
        await publicPage.goto(`${base}/projects/${project.id}`); await settled(publicPage);
        await capture(publicPage, 'long-project-detail-320');
        await ownerPage.goto(`${base}/dashboard/projects`); await settled(ownerPage);
        await capture(ownerPage, 'long-project-dashboard-320');
      } finally { await api(founder, `/projects/${project.id}`, { title: project.title, pitch: project.pitch, location: project.location }); }
    });
    assert.deepEqual(pageErrors, [], 'no uncaught browser errors');
    assert.deepEqual(blockedRequests, [], 'all visual sessions use local services');
  } finally {
    await writeFile(new URL('observations.json', dir), JSON.stringify({ phase, observations, pageErrors, blockedRequests }, null, 2));
    await browser.close();
  }
});
