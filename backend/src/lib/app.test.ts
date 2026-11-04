import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AddressInfo } from 'node:net'
import { createApp } from '../app.js'
import { readEnv } from '../env.js'
import { parseProfilePatch } from '../features/identity/profile.js'
import { createDb } from './supabase.js'

test('environment rejects invalid ports, partial config and privileged keys', () => {
  assert.throws(() => readEnv({ NODE_ENV: 'production' }))
  assert.throws(() => readEnv({ PORT: '0' }))
  assert.throws(() => readEnv({ SUPABASE_URL: 'https://example.supabase.co' }))
  assert.throws(() => readEnv({ SUPABASE_URL: 'https://example.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_secret_redacted' }))
  const serviceKey = `eyJheader.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.signature`
  assert.throws(() => readEnv({ SUPABASE_URL: 'https://example.supabase.co', SUPABASE_PUBLISHABLE_KEY: serviceKey }))
  assert.equal(readEnv({}).port, 3001)
})
test('profile validation is strict and normalizes declared data', () => {
  assert.throws(() => parseProfilePatch({ id: 'other-user' }))
  assert.throws(() => parseProfilePatch({ hoursPerWeek: 0 }))
  assert.throws(() => parseProfilePatch({ participationTypes: ['admin'] }))
  assert.throws(() => parseProfilePatch({ displayName: ' ' }))
  assert.throws(() => parseProfilePatch([]))
  assert.deepEqual(parseProfilePatch({ displayName: ' Alex ', declaredSkills: ['React', ' React '] }), { displayName: 'Alex', declaredSkills: ['React'] })
})
test('caller database clients do not share authorization state', () => {
  const env = { port: 3001, production: false, supabaseUrl: 'https://example.supabase.co', supabaseKey: 'sb_publishable_example' }
  const first = createDb(env, 'first-token')
  const second = createDb(env, 'second-token')
  assert.notEqual(first, second)
})
test('API health, protected access, errors and production SPA are distinct', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'neo-app-'))
  await writeFile(join(dir, 'index.html'), '<html><body>North East Origins test</body></html>')
  const server = createApp({ port: 3001, production: true }, dir).listen(0, '127.0.0.1')
  await new Promise<void>(resolve => server.once('listening', resolve))
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  try {
    const health = await fetch(`${origin}/api/health`)
    assert.deepEqual(await health.json(), { data: { status: 'ok' } })
    assert.equal(health.headers.get('x-robots-tag'), 'noindex, nofollow')
    const missing = await fetch(`${origin}/api/not-a-route`)
    assert.equal(missing.status, 404)
    assert.equal((await missing.json()).error.code, 'NOT_FOUND')
    assert.equal((await fetch(`${origin}/api/me`)).status, 401)
    assert.equal((await fetch(`${origin}/api/me`, { headers: { Authorization: 'Bearer not-a-token' } })).status, 503)
    const badJson = await fetch(`${origin}/api/me`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{bad' })
    assert.equal(badJson.status, 400)
    assert.equal((await badJson.json()).error.code, 'VALIDATION_ERROR')
    const deepLink = await fetch(`${origin}/projects/example`, { headers: { Accept: 'text/html' } })
    assert.equal(deepLink.status, 200)
    assert.match(await deepLink.text(), /North East Origins test/)
    assert.equal((await fetch(`${origin}/assets/missing.js`)).status, 404)
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    await rm(dir, { recursive: true, force: true })
  }
})

test('production SPA works below a hidden checkout directory without exposing hidden assets', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'neo-hidden-app-'))
  const frontendDir = join(dir, '.codex', 'worktrees', 'frontend', 'dist')
  await mkdir(join(frontendDir, 'assets'), { recursive: true })
  const html = '<html><body>North East Origins hidden checkout</body></html>'
  await writeFile(join(frontendDir, 'index.html'), html)
  await writeFile(join(frontendDir, 'assets', 'app.js'), 'console.log("built app")')
  await writeFile(join(frontendDir, 'assets', '.private.js'), 'private asset sentinel')
  const server = createApp({ port: 3001, production: true }, frontendDir).listen(0, '127.0.0.1')
  await new Promise<void>(resolve => server.once('listening', resolve))
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  try {
    for (const path of ['/', '/projects/example']) {
      const page = await fetch(`${origin}${path}`, { headers: { Accept: 'text/html' } })
      assert.equal(page.status, 200)
      assert.equal(page.headers.get('cache-control'), 'no-cache')
      assert.equal(await page.text(), html)
    }
    const asset = await fetch(`${origin}/assets/app.js`)
    assert.equal(asset.status, 200)
    assert.match(asset.headers.get('content-type') ?? '', /javascript/)
    assert.equal(await asset.text(), 'console.log("built app")')
    for (const path of ['/assets/missing.js', '/assets/.private.js', '/api/not-a-route']) {
      const missing = await fetch(`${origin}${path}`, { headers: { Accept: 'text/html' } })
      assert.equal(missing.status, 404)
      assert.equal((await missing.json()).error.code, 'NOT_FOUND')
    }
    assert.deepEqual(await (await fetch(`${origin}/api/health`)).json(), { data: { status: 'ok' } })
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    await rm(dir, { recursive: true, force: true })
  }
})
