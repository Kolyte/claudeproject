import { Router } from 'express'
import { z } from 'zod'
import type { Env } from '../../env.js'
import { optionalAuth } from '../../middleware/auth.js'
import { camel, parse, shortText, stage } from '../../lib/validation.js'
import { databaseError } from '../../lib/supabase.js'
import type { ProjectSummary } from '@neo/contracts'

const filters = z.strictObject({
  q: z.string().trim().max(300).optional(), location: shortText.optional(), skill: shortText.max(60).optional(), sector: shortText.optional(), stage: stage.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20), offset: z.coerce.number().int().min(0).default(0),
})
export function discoveryRouter(env?: Env) {
  const router = Router()
  router.get('/discover/projects', optionalAuth(env), async (req, res) => {
    const input = parse(filters, req.query)
    const args = Object.fromEntries(['q', 'location', 'skill', 'sector', 'stage'].filter(key => input[key as keyof typeof input] !== undefined).map(key => [`filter_${key}`, input[key as keyof typeof input]]))
    const { limit, offset } = input
    const { data, error, count } = await res.locals.db.rpc('discover_projects', args, { count: 'exact' }).order('created_at', { ascending: false }).order('id').range(offset, offset + limit - 1)
    if (error) databaseError(error)
    res.set('Cache-Control', 'no-store').json({ data: (data ?? []).map((row: Record<string, unknown>) => camel<ProjectSummary>(row)), pagination: { limit, offset, total: count ?? 0 } })
  })
  return router
}
export const router = discoveryRouter()
