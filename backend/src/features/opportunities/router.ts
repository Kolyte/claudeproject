import express, { type NextFunction, type Request, type RequestHandler, type Response, Router } from 'express';
import { ApiFailure, internal, invalid, unauthenticated, unavailable } from './errors.js';
import type { OpportunitiesRepository } from './repository.js';
import { createOpportunitiesService, type OpportunitiesService } from './service.js';
import { createSupabaseRepository, type SupabaseLike } from './supabaseRepository.js';
import {
  parseApplicationCreate,
  parseApplicationPatch,
  parseId,
  parseNeedCreate,
  parseNeedPatch,
  parsePagination,
} from './validation.js';

/** Who is calling, and a repository acting as them. */
export interface RequestContext {
  userId: string | null;
  repository: OpportunitiesRepository;
}

export type ResolveContext = (req: Request, res: Response) => RequestContext;

/**
 * Reads what P1's auth middleware leaves on `res.locals`: the verified `user`
 * (absent for anonymous requests) and `db`, the caller-scoped Supabase client.
 * Without a client it fails closed with 503.
 */
export const resolveFromLocals: ResolveContext = (_req, res) => {
  const db = res.locals.db as SupabaseLike | undefined;
  if (!db) throw unavailable();
  const user = res.locals.user as { id: string } | undefined;
  return { userId: user?.id ?? null, repository: createSupabaseRepository(db) };
};

export interface RouterOptions {
  /** Runs first on every route: P1's `optionalAuth` in the application. */
  authenticate?: RequestHandler;
  resolveContext?: ResolveContext;
}

const passThrough: RequestHandler = (_req, _res, next) => next();

function sendError(res: Response, error: unknown): void {
  const failure = error instanceof ApiFailure ? error : internal();
  if (!(error instanceof ApiFailure)) console.error('opportunities: unexpected error', error);
  res.status(failure.status).json({
    error: {
      code: failure.code,
      message: failure.message,
      ...(failure.fields && { fields: failure.fields }),
    },
  });
}

const parseJson = express.json({ limit: '32kb' });

/** Scoped to writes so a malformed body becomes this API's error shape. */
const jsonBody: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  parseJson(req, res, (error?: unknown) => {
    if (error) sendError(res, invalid('Request body must be valid JSON under 32 KB.'));
    else next();
  });
};

interface Handled {
  status?: number;
  body: unknown;
}

type Handler = (
  req: Request,
  service: OpportunitiesService,
  userId: string | null,
) => Promise<Handled>;

export function createOpportunitiesRouter({
  authenticate = passThrough,
  resolveContext = resolveFromLocals,
}: RouterOptions = {}): Router {
  const router = Router();

  const handle =
    (handler: Handler, { signedIn = false } = {}): RequestHandler =>
    async (req, res) => {
      // Responses can hold private data, so nothing here may be cached.
      res.set('Cache-Control', 'no-store');
      try {
        const { userId, repository } = resolveContext(req, res);
        // Signed-out callers get 401 before any validation detail.
        if (signedIn && !userId) throw unauthenticated();
        const { status = 200, body } = await handler(req, createOpportunitiesService(repository), userId);
        res.status(status).json(body);
      } catch (error) {
        sendError(res, error);
      }
    };

  router.get(
    '/projects/:projectId/needs',
    authenticate,
    handle(async (req, service, userId) => ({
      body: await service.listNeeds(
        parseId(req.params.projectId, 'projectId'),
        parsePagination(req.query),
        userId,
      ),
    })),
  );

  router.post(
    '/projects/:projectId/needs',
    authenticate,
    jsonBody,
    handle(async (req, service, userId) => ({
      status: 201,
      body: {
        data: await service.createNeed(
          parseId(req.params.projectId, 'projectId'),
          parseNeedCreate(req.body),
          userId,
        ),
      },
    }), { signedIn: true }),
  );

  router.patch(
    '/needs/:needId',
    authenticate,
    jsonBody,
    handle(async (req, service, userId) => ({
      body: {
        data: await service.updateNeed(parseId(req.params.needId, 'needId'), parseNeedPatch(req.body), userId),
      },
    }), { signedIn: true }),
  );

  router.post(
    '/needs/:needId/applications',
    authenticate,
    jsonBody,
    handle(async (req, service, userId) => ({
      status: 201,
      body: {
        data: await service.apply(
          parseId(req.params.needId, 'needId'),
          parseApplicationCreate(req.body).message,
          userId,
        ),
      },
    }), { signedIn: true }),
  );

  router.get(
    '/me/applications',
    authenticate,
    handle(async (req, service, userId) => ({
      body: await service.listMyApplications(parsePagination(req.query), userId),
    }), { signedIn: true }),
  );

  router.get(
    '/projects/:projectId/applications',
    authenticate,
    handle(async (req, service, userId) => ({
      body: await service.listProjectApplications(
        parseId(req.params.projectId, 'projectId'),
        parsePagination(req.query),
        userId,
      ),
    }), { signedIn: true }),
  );

  router.patch(
    '/applications/:applicationId',
    authenticate,
    jsonBody,
    handle(async (req, service, userId) => ({
      body: {
        data: await service.updateApplicationStatus(
          parseId(req.params.applicationId, 'applicationId'),
          parseApplicationPatch(req.body).status,
          userId,
        ),
      },
    }), { signedIn: true }),
  );

  return router;
}
