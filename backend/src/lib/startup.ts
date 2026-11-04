import type { Env } from '../env.js'

/** Verify the configured public key without logging provider bodies or credentials. */
export async function verifySupabase(env: Env, fetcher: typeof fetch = fetch): Promise<void> {
  if (!env.supabaseUrl || !env.supabaseKey) return
  let response: Response
  try {
    response = await fetcher(new URL('/auth/v1/settings', env.supabaseUrl), {
      headers: { apikey: env.supabaseKey },
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    throw new Error('Supabase could not be reached during startup. Check the project URL and connection.')
  }
  if (response.status === 401 || response.status === 403) throw new Error('Supabase rejected the configured public key.')
  if (!response.ok) throw new Error('Supabase is unavailable during startup. Please try again.')
}
