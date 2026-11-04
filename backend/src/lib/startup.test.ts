import { test } from 'node:test'
import assert from 'node:assert/strict'
import { verifySupabase } from './startup.js'

const env = { port: 3001, production: true, supabaseUrl: 'https://example.supabase.co', supabaseKey: 'sb_publishable_test_value' }

test('startup verifies the public key against Auth settings', async () => {
  let requests = 0
  const fetcher: typeof fetch = async (input, options) => {
    requests++
    assert.equal(String(input), 'https://example.supabase.co/auth/v1/settings')
    assert.equal(new Headers(options?.headers).get('apikey'), env.supabaseKey)
    assert.ok(options?.signal)
    return new Response('{}', { status: 200 })
  }
  await verifySupabase(env, fetcher)
  assert.equal(requests, 1)
  await verifySupabase({ port: 3001, production: false }, fetcher)
  assert.equal(requests, 1)
})
test('startup rejects invalid keys and service failures without leaking values', async () => {
  for (const status of [401, 403, 503]) {
    const fetcher: typeof fetch = async () => new Response('private provider details', { status })
    await assert.rejects(verifySupabase(env, fetcher), error => {
      assert.ok(error instanceof Error)
      assert.doesNotMatch(error.message, /sb_publishable|private provider details/)
      return true
    })
  }
  const fetcher: typeof fetch = async () => { throw new Error('private connection details') }
  await assert.rejects(verifySupabase(env, fetcher), /could not be reached/)
})
