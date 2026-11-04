import type { Env } from '../../env.js'
import { optionalAuth, requireAuth } from '../../middleware/auth.js'
import { createOpportunitiesRouter } from './router.js'

export function opportunitiesRouter(env?: Env) {
  return createOpportunitiesRouter({ optional: optionalAuth(env), required: requireAuth(env) })
}

export const router = opportunitiesRouter()
