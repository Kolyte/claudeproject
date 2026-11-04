import express, { type NextFunction, type Request, type RequestHandler, type Response, Router } from 'express';
import { ApiFailure, internal, invalid, unavailable } from './errors.js';
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
 * The single integration point with P1's middleware. It expects
 * `res.locals.userId` (string or null) and `res.locals.db` (a per-request
 * Supabase client carrying the caller's token, or the public client).
 * Without a client it fails closed with 503.
 */
export const resolveFromLocals: ResolveContext = (_req, res) => {
  const db = res.locals.db as SupabaseLike | undefined;
  if (!db) throw unavailable();
  return { userId: (res.locals.userId as string | null | undefined) ?? null, repository: createSupabaseRepository(db) };
};

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

export function createOpportunitiesRouter(resolveContext: ResolveContext = resolveFromLocals): Router {
  const router = Router();

  const handle =
    (handler: Handler): RequestHandler =>
    async (req, res) => {
      try {
        const { userId, repository } = resolveContext(req, res);
        const { status = 200, body } = await handler(req, createOpportunitiesService(repository), userId);
        res.status(status).json(body);
      } catch (error) {
        sendError(res, error);
      }
    };

  router.get(
    '/projects/:projectId/needs',
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
    })),
  );

  router.patch(
    '/needs/:needId',
    jsonBody,
    handle(async (req, service, userId) => ({
      body: {
        data: await service.updateNeed(parseId(req.params.needId, 'needId'), parseNeedPatch(req.body), userId),
      },
    })),
  );

  router.post(
    '/needs/:needId/applications',
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
    })),
  );

  router.get(
    '/me/applications',
    handle(async (req, service, userId) => ({
      body: await service.listMyApplications(parsePagination(req.query), userId),
    })),
  );

  router.get(
    '/projects/:projectId/applications',
    handle(async (req, service, userId) => ({
      body: await service.listProjectApplications(
        parseId(req.params.projectId, 'projectId'),
        parsePagination(req.query),
        userId,
      ),
    })),
  );

  router.patch(
    '/applications/:applicationId',
    jsonBody,
    handle(async (req, service, userId) => ({
      body: {
        data: await service.updateApplicationStatus(
          parseId(req.params.applicationId, 'applicationId'),
          parseApplicationPatch(req.body).status,
          userId,
        ),
      },
    })),
  );

  return router;
}
