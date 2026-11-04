import { createApp } from './app.js'
import { readEnv } from './env.js'
import { verifySupabase } from './lib/startup.js'

try {
  const env = readEnv()
  await verifySupabase(env)
  if (!env.supabaseUrl) console.warn('Supabase is not configured. Health is available; account routes return 503.')
  const server = createApp(env).listen(env.port, () => console.log(`North East Origins API listening on port ${env.port}`))
  const shutdown = () => { server.close(() => process.exit(0)) }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Server configuration failed.')
  process.exitCode = 1
}
