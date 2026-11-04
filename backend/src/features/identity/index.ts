import { Router } from 'express'
import type { Env } from '../../env.js'
import { requireAuth } from '../../middleware/auth.js'
import { databaseError } from '../../lib/supabase.js'
import { parseProfilePatch, toProfile, toProfileRow } from './profile.js'

export function identityRouter(env: Env) {
  const router = Router()
  router.use('/me', requireAuth(env))
  router.get('/me', async (_req, res) => {
    const { db, user } = res.locals
    // A conflict must not overwrite a profile edited in another session.
    const bootstrap = await db.from('profiles').upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true })
    if (bootstrap.error) databaseError(bootstrap.error)
    const { data, error } = await db.from('profiles').select('*').eq('id', user.id).single()
    if (error || !data) databaseError(error)
    res.set('Cache-Control', 'no-store').json({ data: toProfile(data) })
  })
  router.patch('/me', async (req, res) => {
    const patch = parseProfilePatch(req.body)
    const { db, user } = res.locals
    const bootstrap = await db.from('profiles').upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true })
    if (bootstrap.error) databaseError(bootstrap.error)
    const { data, error } = await db.from('profiles').update(toProfileRow(patch)).eq('id', user.id).select('*').single()
    if (error || !data) databaseError(error)
    res.set('Cache-Control', 'no-store').json({ data: toProfile(data) })
  })
  return router
}
