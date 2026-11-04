export interface Env {
  port: number
  production: boolean
  supabaseUrl?: string
  supabaseKey?: string
}

export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const port = Number(source.PORT ?? 3001)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535.')
  const production = source.NODE_ENV === 'production'
  const supabaseUrl = source.SUPABASE_URL?.trim() || undefined
  const supabaseKey = source.SUPABASE_PUBLISHABLE_KEY?.trim() || undefined
  if (Boolean(supabaseUrl) !== Boolean(supabaseKey)) throw new Error('Set both SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.')
  if (production && !supabaseUrl) throw new Error('Supabase configuration is required in production.')
  if (supabaseUrl) {
    let url: URL
    try { url = new URL(supabaseUrl) } catch { throw new Error('SUPABASE_URL must be a valid URL.') }
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
      throw new Error('SUPABASE_URL must use HTTPS, or HTTP on localhost.')
    }
  }
  if (supabaseKey?.startsWith('sb_secret_')) throw new Error('Use a publishable key, never a secret key.')
  if (supabaseKey?.startsWith('eyJ')) {
    try {
      const payload = JSON.parse(Buffer.from(supabaseKey.split('.')[1], 'base64url').toString())
      if (payload.role !== 'anon') throw new Error()
    } catch { throw new Error('Legacy Supabase keys must have the anon role.') }
  }
  return { port, production, supabaseUrl, supabaseKey }
}
