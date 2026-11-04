import { Router } from 'express'
import { z } from 'zod'
import type { Env } from '../../env.js'
import { optionalAuth, requireAuth } from '../../middleware/auth.js'
import { camel, longText, nonempty, pagination, parse, shortText, snake, stage } from '../../lib/validation.js'
import { visibleProject } from '../../lib/projects.js'
import { databaseError } from '../../lib/supabase.js'
import type { Project } from '@neo/contracts'

const editable = z.strictObject({
  title: shortText, pitch: z.string().trim().min(1).max(300), problem: longText, solution: longText,
  sector: shortText, location: shortText, stage,
  status: z.enum(['active', 'paused', 'completed']), visibility: z.enum(['draft', 'public']),
})
export function projectsRouter(env?: Env) {
  const router = Router()
  router.post('/projects', requireAuth(env), async (req, res) => {
    const input = parse(editable.omit({ status: true, visibility: true }).partial(), req.body)
    const { data, error } = await res.locals.db.from('projects').insert({ ...snake(input), owner_id: res.locals.user.id }).select('*').single()
    if (error || !data) databaseError(error)
    res.status(201).json({ data: camel<Project>(data) })
  })
  router.get('/projects/:projectId', optionalAuth(env), async (req, res) => {
    const project = await visibleProject(req, res)
    res.set('Cache-Control', 'no-store').json({ data: camel<Project>(project) })
  })
  router.patch('/projects/:projectId', requireAuth(env), async (req, res) => {
    const input = parse(nonempty(editable), req.body)
    const project = await visibleProject(req, res, true)
    const { data, error } = await res.locals.db.from('projects').update(snake(input)).eq('id', project.id).select('*').single()
    if (error || !data) databaseError(error)
    res.json({ data: camel<Project>(data) })
  })
  router.get('/me/projects', requireAuth(env), async (req, res) => {
    const { limit, offset } = pagination(req.query)
    const { data, error, count } = await res.locals.db.from('projects').select('*', { count: 'exact' }).eq('owner_id', res.locals.user.id).order('created_at', { ascending: false }).order('id').range(offset, offset + limit - 1)
    if (error) databaseError(error)
    res.set('Cache-Control', 'no-store').json({ data: (data ?? []).map(row => camel<Project>(row)), pagination: { limit, offset, total: count ?? 0 } })
  })
  return router
}
export const router = projectsRouter()
