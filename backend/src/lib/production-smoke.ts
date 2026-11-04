import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { createApp } from '../app.js'
import { readEnv } from '../env.js'

// Routing smoke check only. The placeholder provider is never contacted; real
// Auth/RLS acceptance belongs to the local/hosted integration suites.
const env = readEnv({ NODE_ENV: 'production', SUPABASE_URL: 'https://example.invalid', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_smoke' })
const server = createApp(env).listen(0, '127.0.0.1')
await new Promise<void>(resolve => server.once('listening', resolve))
const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
try {
  const health = await fetch(`${origin}/api/health`)
  assert.equal(health.status, 200)
  assert.deepEqual(await health.json(), { data: { status: 'ok' } })
  const missing = await fetch(`${origin}/api/not-a-route`)
  assert.equal(missing.status, 404)
  assert.equal((await missing.json()).error.code, 'NOT_FOUND')
  const page = await fetch(`${origin}/projects/00000000-0000-4000-8000-000000000001`, { headers: { Accept: 'text/html' } })
  assert.equal(page.status, 200)
  const html = await page.text()
  assert.match(html, /<title>North East Origins<\/title>/)
  const asset = html.match(/src="([^"]+\.js)"/)?.[1]
  assert.ok(asset, 'Built page includes its JavaScript asset')
  const script = await fetch(`${origin}${asset}`)
  assert.equal(script.status, 200)
  assert.match(script.headers.get('content-type') ?? '', /javascript/)
  await script.arrayBuffer()
  console.log('Compiled production server: health, JSON API 404, SPA deep link and built asset passed. Supabase is not exercised by this smoke check.')
} finally {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
}
