// Framework-free handler for GET /api/discover/projects, so it is testable without Express.
import { parseDiscoveryFilters } from './filters.ts';
import { DiscoveryUnavailableError, listDiscoveryProjects, type PublicDb } from './service.ts';
import type { ApiError, Page, ProjectSummary } from './types.ts';

export interface HandlerResult {
  status: number;
  body: Page<ProjectSummary> | ApiError;
}

export async function handleDiscoverProjects(query: Record<string, unknown>, db: PublicDb): Promise<HandlerResult> {
  const parsed = parseDiscoveryFilters(query);
  if (!parsed.ok) {
    return {
      status: 400,
      body: { error: { code: 'VALIDATION_ERROR', message: 'Invalid discovery filters.', fields: parsed.fields } },
    };
  }
  try {
    return { status: 200, body: await listDiscoveryProjects(db, parsed.filters) };
  } catch (err) {
    // Never leak database details to the client.
    const unavailable = err instanceof DiscoveryUnavailableError;
    return {
      status: unavailable ? 503 : 500,
      body: {
        error: unavailable
          ? { code: 'SERVICE_UNAVAILABLE', message: 'Discovery is temporarily unavailable.' }
          : { code: 'INTERNAL_ERROR', message: 'Something went wrong.' },
      },
    };
  }
}
