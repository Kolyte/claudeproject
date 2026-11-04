// Discovery feature router (P5). Path is API-relative; P1 mounts it below `/api`.
//
// Handoff to P1 (see docs/CONTRACTS.md): this feature needs the *public* Supabase
// client (publishable/anon key, no user token, never the service role). Once
// `backend/src/lib/` provides it, wire it as:
//
//   import { createDiscoveryRouter } from './features/discovery/index.ts';
//   router.use(createDiscoveryRouter({ getPublicDb: () => publicSupabase }));
//
// `express` is a P1-managed dependency; this file is not compiled until it exists.
import { Router } from 'express';
import { handleDiscoverProjects } from './handler.ts';
import type { PublicDb } from './service.ts';
import { createDb } from '../../lib/supabase.js';
import type { Env } from '../../env.js';

export interface DiscoveryDeps {
  getPublicDb: () => PublicDb;
}

export function createDiscoveryRouter(deps: DiscoveryDeps): Router {
  const router = Router();
  router.get('/discover/projects', async (req, res) => {
    const result = await handleDiscoverProjects(req.query as Record<string, unknown>, deps.getPublicDb());
    res.status(result.status).json(result.body);
  });
  return router;
}

export { handleDiscoverProjects } from './handler.ts';
export type { PublicDb } from './service.ts';

/** P1 integration: anonymous, caller-independent discovery client; RLS stays active. */
export const router = Router();
router.get('/discover/projects', async (req, res) => {
  const result = await handleDiscoverProjects(req.query as Record<string, unknown>, createDb(req.app.locals.env as Env));
  res.set('Cache-Control', 'no-store').status(result.status).json(result.body);
});
