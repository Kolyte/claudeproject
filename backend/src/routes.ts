import { Router } from 'express'
import type { Env } from './env.js'
import { identityRouter } from './features/identity/index.js'
import { router as projectsRouter } from './features/projects/index.js'
import { router as activityRouter } from './features/activity/index.js'
import { router as opportunitiesRouter } from './features/opportunities/index.js'
import { router as discoveryRouter } from './features/discovery/index.js'

export function apiRouter(env: Env) {
  const router = Router()
  router.get('/health', (_req, res) => { res.json({ data: { status: 'ok' } }) })
  router.use(identityRouter(env))
  router.use(projectsRouter, activityRouter, opportunitiesRouter, discoveryRouter)
  return router
}
