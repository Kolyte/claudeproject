import { Router } from 'express'
import { z } from 'zod'
import type { Env } from '../../env.js'
import { optionalAuth, requireAuth } from '../../middleware/auth.js'
import { visibleProject } from '../../lib/projects.js'
import { camel, longText, pagination, parse, shortText, snake } from '../../lib/validation.js'
import { databaseError } from '../../lib/supabase.js'

const post = z.strictObject({ type: z.enum(['progress', 'milestone', 'roadblock', 'opportunity', 'announcement']), body: longText })
const milestone = z.strictObject({ title: shortText, description: longText, achievedAt: z.iso.datetime({ offset: true }), evidenceUrl: z.url({ protocol: /^https?$/ }).max(2048).nullable().default(null) })
export function activityRouter(env?: Env) {
  const router = Router()
  for (const [segment, table, order, schema] of [
    ['posts', 'project_posts', 'created_at', post],
    ['milestones', 'milestones', 'achieved_at', milestone],
  ] as const) {
    router.get(`/projects/:projectId/${segment}`, optionalAuth(env), async (req, res) => {
      const project = await visibleProject(req, res)
      const { limit, offset } = pagination(req.query)
      const { data, error, count } = await res.locals.db.from(table).select('*', { count: 'exact' }).eq('project_id', project.id).order(order, { ascending: false }).order('id').range(offset, offset + limit - 1)
      if (error) databaseError(error)
      res.set('Cache-Control', 'no-store').json({ data: (data ?? []).map(row => camel(row)), pagination: { limit, offset, total: count ?? 0 } })
    })
    router.post(`/projects/:projectId/${segment}`, requireAuth(env), async (req, res) => {
      const project = await visibleProject(req, res, true)
      const input = parse(schema as z.ZodType<Record<string, unknown>>, req.body)
      const row = { ...snake(input), project_id: project.id, ...(segment === 'posts' && { author_id: res.locals.user.id }) }
      const { data, error } = await res.locals.db.from(table).insert(row).select('*').single()
      if (error || !data) databaseError(error)
      res.status(201).json({ data: camel(data) })
    })
  }
  return router
}
export const router = activityRouter()
