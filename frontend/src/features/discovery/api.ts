// Discovery data access. Live mode calls the public P5 endpoint GET /api/discover/projects.
// It needs no auth token; switch to P1's shared API client once frontend/src/lib/ provides one.
import { toQueryString } from './filters.ts';
import type { ApiError, DiscoveryFilters, Page, ProjectSummary } from './types.ts';

export const DISCOVERY_SOURCE: 'api' | 'fixtures' =
  import.meta.env.VITE_DISCOVERY_SOURCE === 'fixtures' ? 'fixtures' : 'api';

export class DiscoveryError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function fetchFromApi(filters: DiscoveryFilters, signal?: AbortSignal): Promise<Page<ProjectSummary>> {
  let res: Response;
  try {
    res = await fetch(`/api/discover/projects?${toQueryString(filters)}`, {
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new DiscoveryError('NETWORK_ERROR', 'We could not reach North East Origins. Check your connection and try again.');
  }

  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const apiError = (body as ApiError | null)?.error;
    throw new DiscoveryError(
      apiError?.code ?? 'INTERNAL_ERROR',
      apiError?.message ?? `Discovery is unavailable right now (HTTP ${res.status}).`,
    );
  }
  const page = body as Page<ProjectSummary> | null;
  if (!page || !Array.isArray(page.data) || !page.pagination) {
    throw new DiscoveryError('INTERNAL_ERROR', 'Discovery returned an unexpected response.');
  }
  return page;
}

async function fetchFromFixtures(filters: DiscoveryFilters, signal?: AbortSignal): Promise<Page<ProjectSummary>> {
  // Lazy import keeps the fictional fixture out of the live bundle's critical path.
  const [{ projects }, { legacyToSummary, queryFixtureSummaries }] = await Promise.all([
    import('../../data/mockData'),
    import('./fixtureSource.ts'),
  ]);
  await new Promise((r) => setTimeout(r, 250)); // exercise loading states during development
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  return queryFixtureSummaries(projects.map(legacyToSummary), filters);
}

export function fetchDiscoveryProjects(filters: DiscoveryFilters, signal?: AbortSignal) {
  return DISCOVERY_SOURCE === 'fixtures' ? fetchFromFixtures(filters, signal) : fetchFromApi(filters, signal);
}
