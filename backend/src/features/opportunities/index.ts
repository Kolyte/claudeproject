import { Router } from 'express'
import { z } from 'zod'
import type { Env } from '../../env.js'
import { optionalAuth, requireAuth } from '../../middleware/auth.js'
import { visibleProject } from '../../lib/projects.js'
import { camel, id, longText, nonempty, pagination, parse, shortText, skills, snake } from '../../lib/validation.js'
import { databaseError } from '../../lib/supabase.js'
import { HttpError } from '../../lib/errors.js'

const needSchema = z.strictObject({ title: shortText, description: longText, requiredSkills: skills, desirableSkills: skills,
  participationType: z.enum(['cofounder', 'contributor', 'task', 'mentor']), hoursPerWeek: z.number().int().min(1).max(80),
  workMode: z.enum(['local', 'remote', 'hybrid']), location: shortText,
  compensation: z.enum(['paid', 'voluntary', 'equity_discussion', 'unspecified']), status: z.enum(['open', 'reviewing', 'filled', 'closed']),
})
export function opportunitiesRouter(env?: Env) {
  const router = Router()
  router.get('/projects/:projectId/needs', optionalAuth(env), async (req, res) => {
    const project = await visibleProject(req, res)
    const { limit, offset } = pagination(req.query)
    const { data, error, count } = await res.locals.db.from('project_needs').select('*', { count: 'exact' }).eq('project_id', project.id).order('created_at', { ascending: false }).order('id').range(offset, offset + limit - 1)
    if (error) databaseError(error)
    res.set('Cache-Control', 'no-store').json({ data: (data ?? []).map(row => camel(row)), pagination: { limit, offset, total: count ?? 0 } })
  })
  router.post('/projects/:projectId/needs', requireAuth(env), async (req, res) => {
    const input = parse(needSchema, req.body)
    const project = await visibleProject(req, res, true)
    const { data, error } = await res.locals.db.from('project_needs').insert({ ...snake(input), project_id: project.id }).select('*').single()
    if (error || !data) databaseError(error)
    res.status(201).json({ data: camel(data) })
  })
  router.patch('/needs/:needId', requireAuth(env), async (req, res) => {
    const needId = id(req, 'needId')
    const input = parse(nonempty(needSchema), req.body)
    const { data: existing, error: lookupError } = await res.locals.db.from('project_needs').select('*, projects!inner(owner_id)').eq('id', needId).maybeSingle()
    if (lookupError) databaseError(lookupError)
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Opportunity not found.')
    if ((existing.projects as unknown as { owner_id: string }).owner_id !== res.locals.user.id) throw new HttpError(403, 'FORBIDDEN', 'Only the project owner can edit opportunities.')
    const { data, error } = await res.locals.db.from('project_needs').update(snake(input)).eq('id', needId).select('*').single()
    if (error || !data) databaseError(error)
    res.json({ data: camel(data) })
  })
  router.post('/needs/:needId/applications', requireAuth(env), async (req, res) => {
    const needId = id(req, 'needId')
    const input = parse(z.strictObject({ message: longText }), req.body)
    const { data: need, error: lookupError } = await res.locals.db.from('project_needs').select('*, projects!inner(owner_id, visibility)').eq('id', needId).maybeSingle()
    if (lookupError) databaseError(lookupError)
    if (!need) throw new HttpError(404, 'NOT_FOUND', 'Opportunity not found.')
    const project = need.projects as unknown as { owner_id: string; visibility: string }
    if (project.owner_id === res.locals.user.id) throw new HttpError(403, 'FORBIDDEN', 'You cannot apply to your own project.')
    if (need.status !== 'open' || project.visibility !== 'public') throw new HttpError(409, 'CONFLICT', 'This opportunity is no longer open.')
    const { data, error } = await res.locals.db.from('applications').insert({ need_id: needId, applicant_id: res.locals.user.id, message: input.message }).select('*').single()
    if (error?.code === '23514') throw new HttpError(409, 'CONFLICT', 'This opportunity is no longer open.')
    if (error || !data) databaseError(error)
    res.status(201).json({ data: camel(data) })
  })
  router.get('/me/applications', requireAuth(env), async (req, res) => {
    const { limit, offset } = pagination(req.query)
    const { data, error, count } = await res.locals.db.from('applications').select('*', { count: 'exact' }).eq('applicant_id', res.locals.user.id).order('created_at', { ascending: false }).order('id').range(offset, offset + limit - 1)
    if (error) databaseError(error)
    res.set('Cache-Control', 'no-store').json({ data: (data ?? []).map(row => camel(row)), pagination: { limit, offset, total: count ?? 0 } })
  })
  router.get('/projects/:projectId/applications', requireAuth(env), async (req, res) => {
    const project = await visibleProject(req, res, true)
    const { limit, offset } = pagination(req.query)
    const { data, error, count } = await res.locals.db.from('applications').select('*, project_needs!inner(project_id)', { count: 'exact' }).eq('project_needs.project_id', project.id).order('created_at', { ascending: false }).order('id').range(offset, offset + limit - 1)
    if (error) databaseError(error)
    const rows = await Promise.all((data ?? []).map(async ({ project_needs: _need, ...row }) => {
      const { data: applicant, error: summaryError } = await res.locals.db.rpc('application_review_summary', { application_id: row.id })
      if (summaryError) databaseError(summaryError)
      return { ...camel<Record<string, unknown>>(row), applicant }
    }))
    res.set('Cache-Control', 'no-store').json({ data: rows, pagination: { limit, offset, total: count ?? 0 } })
  })
  router.patch('/applications/:applicationId', requireAuth(env), async (req, res) => {
    const applicationId = id(req, 'applicationId')
    const input = parse(z.strictObject({ status: z.enum(['reviewing', 'accepted', 'rejected', 'withdrawn']) }), req.body)
    const { data: existing, error: lookupError } = await res.locals.db.from('applications').select('*').eq('id', applicationId).maybeSingle()
    if (lookupError) databaseError(lookupError)
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Application not found.')
    if (!['submitted', 'reviewing'].includes(existing.status)) throw new HttpError(409, 'CONFLICT', 'This application has a final decision.')
    if ((existing.applicant_id === res.locals.user.id) !== (input.status === 'withdrawn')) throw new HttpError(403, 'FORBIDDEN', 'That status change is not allowed.')
    const { data, error } = await res.locals.db.from('applications').update(input).eq('id', applicationId).select('*').single()
    if (error || !data) databaseError(error)
    res.json({ data: camel(data) })
  })
  return router
}
export const router = opportunitiesRouter()
