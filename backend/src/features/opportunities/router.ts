import { type RequestHandler, type Response, Router } from 'express'
import { id, pagination, parse } from '../../lib/validation.js'
import type { OpportunitiesRepository } from './repository.js'
import { createOpportunitiesService } from './service.js'
import { createSupabaseRepository } from './supabaseRepository.js'
import { applicationCreate, applicationPatch, needCreate, needPatch } from './validation.js'

export interface RouterOptions {
  /** P1's `optionalAuth`: identifies the caller if a token was sent. */
  optional: RequestHandler
  /** P1's `requireAuth`: rejects with 401 before any validation runs. */
  required: RequestHandler
  repositoryFor?: (res: Response) => OpportunitiesRepository
}

export function createOpportunitiesRouter({ optional, required, repositoryFor = res => createSupabaseRepository(res.locals.db) }: RouterOptions): Router {
  const router = Router()
  const service = (res: Response) => createOpportunitiesService(repositoryFor(res))

  // Responses can hold private data, so nothing here may be cached. Mounted per
  // path because this router shares `/api` with the other features.
  const noStore: RequestHandler = (_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  }

  router.get('/projects/:projectId/needs', noStore, optional, async (req, res) => {
    res.json(await service(res).listNeeds(id(req, 'projectId'), pagination(req.query), res.locals.user?.id ?? null))
  })

  router.post('/projects/:projectId/needs', noStore, required, async (req, res) => {
    const fields = parse(needCreate, req.body)
    res.status(201).json({ data: await service(res).createNeed(id(req, 'projectId'), fields, res.locals.user.id) })
  })

  router.patch('/needs/:needId', noStore, required, async (req, res) => {
    const patch = parse(needPatch, req.body)
    res.json({ data: await service(res).updateNeed(id(req, 'needId'), patch, res.locals.user.id) })
  })

  router.post('/needs/:needId/applications', noStore, required, async (req, res) => {
    const { message } = parse(applicationCreate, req.body)
    res.status(201).json({ data: await service(res).apply(id(req, 'needId'), message, res.locals.user.id) })
  })

  router.get('/me/applications', noStore, required, async (req, res) => {
    res.json(await service(res).listMyApplications(pagination(req.query), res.locals.user.id))
  })

  router.get('/projects/:projectId/applications', noStore, required, async (req, res) => {
    res.json(await service(res).listProjectApplications(id(req, 'projectId'), pagination(req.query), res.locals.user.id))
  })

  router.patch('/applications/:applicationId', noStore, required, async (req, res) => {
    const { status } = parse(applicationPatch, req.body)
    res.json({ data: await service(res).updateApplicationStatus(id(req, 'applicationId'), status, res.locals.user.id) })
  })

  return router
}
