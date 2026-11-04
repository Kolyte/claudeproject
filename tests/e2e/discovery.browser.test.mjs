// P5 browser checks for Landing + Explore (ROADMAP P5-01 / docs/DEMO.md acceptance).
//
//   E2E_BASE_URL=https://<deployment> node --test tests/e2e/discovery.browser.test.mjs
//
// Optional: E2E_SKILL (a skill that appears on at least one open need, default "React"),
// E2E_LOCATION (default "Newcastle"). Skips cleanly when E2E_BASE_URL or Playwright is missing.
// Playwright is not a project dependency yet (request to P1); this uses the library API only.
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { filtersFromParams, toQueryString } from '../../frontend/src/features/discovery/filters.ts';

const BASE = process.env.E2E_BASE_URL?.replace(/\/$/, '');
const SKILL = process.env.E2E_SKILL ?? 'React';
const LOCATION = process.env.E2E_LOCATION ?? 'Newcastle';

let chromium = null;
try {
  ({ chromium } = await import('playwright'));
} catch {
  try {
    // CommonJS resolution also honours NODE_PATH / globally installed Playwright.
    const { createRequire } = await import('node:module');
    ({ chromium } = createRequire(import.meta.url)('playwright'));
  } catch {
    chromium = null;
  }
}
const skip = !BASE ? 'E2E_BASE_URL not set' : !chromium ? 'playwright not installed' : false;

/** Waits until discovery has settled for the page's current URL filters; returns results, empty or error. */
async function settled(page) {
  const expected = toQueryString(filtersFromParams(new URL(page.url()).searchParams));
  const wrapper = page
    .locator(`[data-discovery-query=${JSON.stringify(expected)}]:not([data-discovery-status="loading"])`)
    .first();
  await wrapper.waitFor({ timeout: 15_000 });
  const status = await wrapper.getAttribute('data-discovery-status');
  if (status === 'error') return 'error';
  return (await wrapper.getByTestId('discovery-results').count()) ? 'results' : 'empty';
}

describe('discovery UI', { skip }, () => {
  let browser;
  before(async () => {
    browser = await chromium.launch();
  });
  after(async () => {
    await browser?.close();
  });

  test('landing page loads and search hands off to /explore', async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE}/`);
    await page.getByRole('heading', { level: 1, name: /what the north east is building/i }).waitFor();
    assert.notEqual(await settled(page), 'error', 'recently published section should not error');
    await page.getByRole('searchbox', { name: /search projects/i }).fill('a');
    await page.getByRole('button', { name: 'Explore' }).click();
    await page.waitForURL(/\/explore\?q=a$/);
    await page.close();
  });

  test('explore lists published projects and filters by skill via the URL', async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE}/explore`);
    assert.equal(await settled(page), 'results', 'expected at least one published project');

    await page.getByLabel('Skill needed').fill(SKILL);
    await page.waitForURL((u) => new URL(u).searchParams.get('skill') === SKILL);
    assert.equal(await settled(page), 'results', `expected a project needing ${SKILL}`);
    for (const card of await page.locator('.disc-card').all()) {
      const text = (await card.innerText()).toLowerCase();
      assert.ok(text.includes(SKILL.toLowerCase()) || text.includes('more'), 'card should show the matching skill');
    }
    await page.close();
  });

  test('location deep link survives refresh and narrows results', async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE}/explore?location=${encodeURIComponent(LOCATION)}`);
    await settled(page);
    await page.reload();
    assert.equal(await page.getByLabel('Location').inputValue(), LOCATION);
    if ((await settled(page)) === 'results') {
      for (const card of await page.locator('.disc-card').all()) {
        assert.match(await card.innerText(), new RegExp(LOCATION, 'i'));
      }
    }
    await page.close();
  });

  test('sector type-ahead suggests fixed sectors and filters by the chosen one', async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE}/explore`);
    await settled(page);
    const box = page.getByRole('combobox', { name: 'Sector' });
    await box.fill('fi');
    const list = page.getByRole('listbox', { name: 'Sector suggestions' });
    const options = list.getByRole('option');
    await options.first().waitFor();
    const names = await options.allInnerTexts();
    assert.ok(names.includes('Finance') && names.includes('Fintech'), `suggestions were ${names.join(', ')}`);
    await list.getByRole('option', { name: 'Fintech' }).click();
    await page.waitForURL((u) => new URL(u).searchParams.get('sector') === 'Fintech');
    assert.equal(await box.inputValue(), 'Fintech');
    await settled(page);

    await box.fill('');
    await box.pressSequentially('clim');
    await box.press('ArrowDown');
    await box.press('Enter');
    await page.waitForURL((u) => new URL(u).searchParams.get('sector') === 'Climate');
    if ((await settled(page)) === 'results') {
      for (const card of await page.locator('.disc-card').all()) assert.match(await card.innerText(), /Climate/);
    }
    await page.close();
  });

  test('sector suggestions stay readable on the dark page (contrast >= 4.5:1)', async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE}/explore`);
    await settled(page);
    await page.getByRole('combobox', { name: 'Sector' }).click();
    const list = page.getByRole('listbox', { name: 'Sector suggestions' });
    await list.waitFor();
    const ratios = await list.evaluate((ul) => {
      const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
      const lum = (c) => {
        const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
        return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
      };
      const bgOf = (el) => {
        for (let e = el; e; e = e.parentElement) {
          const c = rgb(getComputedStyle(e).backgroundColor);
          if (c.length === 3 || c[3] > 0.5) return c;
        }
        return [255, 255, 255];
      };
      return [...ul.querySelectorAll('[role=option]')].map((li) => {
        const a = lum(rgb(getComputedStyle(li).color));
        const b = lum(bgOf(li));
        return { name: li.textContent, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
      });
    });
    assert.ok(ratios.length > 0);
    for (const r of ratios) assert.ok(r.ratio >= 4.5, `${r.name} contrast ${r.ratio.toFixed(2)}:1`);
    await page.close();
  });

  test('no-results state offers a way back', async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE}/explore?skill=zz-no-such-skill-e2e`);
    assert.equal(await settled(page), 'empty');
    await page.getByText('No published projects match those filters.').waitFor();
    await page.locator('.disc-state').getByRole('button', { name: 'Clear filters' }).click();
    await page.waitForURL((u) => !new URL(u).searchParams.has('skill'));
    assert.equal(await settled(page), 'results');
    await page.close();
  });

  test('network failure shows a retryable error', async () => {
    const page = await browser.newPage();
    let fail = true;
    const emptyPage = { data: [], pagination: { limit: 12, offset: 0, total: 0 } };
    await page.route('**/api/discover/projects**', (route) =>
      fail ? route.abort() : route.fulfill({ json: emptyPage }),
    );
    await page.goto(`${BASE}/explore`);
    const st = await settled(page);
    if (st !== 'error') {
      // Fixture mode does not call the API; nothing to assert.
      await page.close();
      return;
    }
    await page.getByText('Projects could not be loaded.').waitFor();
    fail = false;
    await page.getByRole('button', { name: 'Try again' }).click();
    assert.equal(await settled(page), 'empty', 'retry should recover once the API responds');
    await page.getByText('No projects have been published yet.').waitFor();
    await page.close();
  });

  test('maximum-length unbroken text wraps at 320px and card headings follow the page h1', async () => {
    const page = await browser.newPage({ viewport: { width: 320, height: 640 } });
    const long = 'X'.repeat(120);
    const project = {
      id: '00000000-0000-4000-8000-0000000000aa', title: long, pitch: 'P'.repeat(300), sector: 'Fintech',
      location: 'L'.repeat(120), stage: 'idea', status: 'active', ownerDisplayName: 'O'.repeat(120),
      requiredSkills: ['S'.repeat(60)], openNeedsCount: 1, lastSubstantiveUpdateAt: null, createdAt: new Date().toISOString(),
    };
    await page.route('**/api/discover/projects**', (route) =>
      route.fulfill({ json: { data: [project], pagination: { limit: 12, offset: 0, total: 1 } } }),
    );
    await page.goto(`${BASE}/explore`);
    assert.equal(await settled(page), 'results');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, `overflows horizontally by ${overflow}px`);
    const title = page.locator('.disc-card-title');
    const clipped = await title.evaluate((el) => el.scrollWidth > el.clientWidth);
    assert.equal(clipped, false, 'title text is cut off');
    assert.equal(await title.evaluate((el) => el.tagName), 'H2', 'Explore cards sit directly under the page h1');
    await page.close();
  });

  test('narrow mobile viewport has no horizontal overflow and usable filters', async () => {
    const page = await browser.newPage({ viewport: { width: 375, height: 740 } });
    for (const path of ['/', '/explore']) {
      await page.goto(`${BASE}${path}`);
      await settled(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 0, `${path} overflows horizontally by ${overflow}px`);
    }
    await page.getByLabel('Skill needed').fill(SKILL);
    await page.waitForURL((u) => new URL(u).searchParams.get('skill') === SKILL);
    await page.close();
  });
});
