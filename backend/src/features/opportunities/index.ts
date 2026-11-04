import type { Env } from '../../env.js';
import { optionalAuth } from '../../middleware/auth.js';
import { createOpportunitiesRouter } from './router.js';

/** `optionalAuth` resolves the caller; routes that need a user return 401 themselves. */
export function opportunitiesRouter(env?: Env) {
  return createOpportunitiesRouter({ authenticate: optionalAuth(env) });
}

export const router = opportunitiesRouter();
