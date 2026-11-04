import type { RequestHandler } from 'express'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Env } from '../env.js'
import { createDb } from '../lib/supabase.js'
import { HttpError } from '../lib/errors.js'

declare global {
  namespace Express {
    interface Locals { db: SupabaseClient; user: User }
  }
}

/** Always verify tokens with Auth; decoded claims alone do not establish identity. */
export function requireAuth(env?: Env, dbFactory = createDb): RequestHandler {
  return async (req, res, next) => {
    const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization ?? '')
    if (!match) throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue.')
    const db = dbFactory(env ?? req.app.locals.env as Env, match[1])
    let result
    try { result = await db.auth.getUser(match[1]) } catch {
      throw new HttpError(503, 'SERVICE_UNAVAILABLE', 'Sign-in verification is temporarily unavailable.')
    }
    if (result.error && (!result.error.status || result.error.status >= 500)) {
      throw new HttpError(503, 'SERVICE_UNAVAILABLE', 'Sign-in verification is temporarily unavailable.')
    }
    if (result.error || !result.data.user) throw new HttpError(401, 'UNAUTHENTICATED', 'Your session has expired. Sign in again.')
    res.locals.db = db
    res.locals.user = result.data.user
    next()
  }
}

export function optionalAuth(env?: Env): RequestHandler {
  return (req, res, next) => {
    if (req.headers.authorization) return requireAuth(env)(req, res, next)
    res.locals.db = createDb(env ?? req.app.locals.env as Env)
    next()
  }
}
