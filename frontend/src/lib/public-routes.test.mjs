import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const require = createRequire(new URL('../../../backend/package.json', import.meta.url))
const { chromium, expect } = require('@playwright/test')

test('public landing and explore render without frontend Auth configuration', { timeout: 30_000 }, async () => {
  const emptyEnv = await mkdtemp(join(tmpdir(), 'neo-public-routes-'))
  const root = fileURLToPath(new URL('../../', import.meta.url))
  const vite = await createServer({
    root, envDir: emptyEnv,
    define: {
      'import.meta.env.VITE_SUPABASE_URL': '""',
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': '""',
      'import.meta.env.VITE_DISCOVERY_SOURCE': '"api"',
    },
    server: { host: '127.0.0.1', port: 0 },
    logLevel: 'error',
  })
  let browser
  try {
    await vite.listen()
    const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
    browser = await chromium.launch({ ...(process.platform === 'win32' && { channel: 'msedge' }), headless: true })
    const page = await browser.newPage()
    const requests = []
    await page.route('**/api/discover/projects**', route => {
      requests.push(route.request())
      return route.fulfill({ json: { data: [], pagination: { limit: 20, offset: 0, total: 0 } } })
    })
    await page.goto(origin)
    await expect(page.getByRole('heading', { level: 1, name: 'Discover what the North East is building.' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Recently published' })).toBeVisible()
    await expect(page.getByText('No projects have been published yet.', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'North East Origins is getting ready' })).toHaveCount(0)
    await page.goto(`${origin}/explore`)
    await expect(page.getByRole('heading', { level: 1, name: 'Explore projects' })).toBeVisible()
    await expect(page.getByText('No projects have been published yet.', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'North East Origins is getting ready' })).toHaveCount(0)
    assert.ok(requests.length >= 2, 'Both public pages request the public discovery API')
    assert.ok(requests.every(request => !request.headers().authorization), 'Public discovery does not need an Auth token')
    await page.goto(`${origin}/profile`)
    await expect(page.getByRole('heading', { name: 'North East Origins is getting ready' })).toBeVisible()
  } finally {
    if (browser) await browser.close()
    await vite.close()
    await rm(emptyEnv, { recursive: true, force: true })
  }
})
