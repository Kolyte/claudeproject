import type {
  Application,
  ApplicationReview,
  ApplicationStatus,
  Need,
  NeedFields,
  NeedStatus,
  Page,
} from './types';

export const PAGE_SIZE = 20;

/**
 * Integration point with P1's auth: call this once at startup with a function
 * returning the Supabase access token, or null when signed out. Until then
 * every request is anonymous. It can be replaced by P1's shared API client.
 */
let getAccessToken: () => string | null | Promise<string | null> = () => null;

export function configureOpportunitiesAuth(provider: typeof getAccessToken): void {
  getAccessToken = provider;
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string>;

  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = await getAccessToken();
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: init.method ?? 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiRequestError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection and try again.');
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = payload?.error;
    throw new ApiRequestError(
      response.status,
      error?.code ?? 'INTERNAL_ERROR',
      error?.message ?? 'Something went wrong. Please try again.',
      error?.fields,
    );
  }
  return payload as T;
}

const pageQuery = (offset: number, limit = PAGE_SIZE) => `?limit=${limit}&offset=${offset}`;
const unwrap = <T,>(response: { data: T }) => response.data;

export const hasSession = async () => Boolean(await getAccessToken());

export const listNeeds = (projectId: string, offset: number) =>
  request<Page<Need>>(`/projects/${encodeURIComponent(projectId)}/needs${pageQuery(offset, 50)}`);

export const createNeed = (projectId: string, fields: NeedFields) =>
  request<{ data: Need }>(`/projects/${encodeURIComponent(projectId)}/needs`, {
    method: 'POST',
    body: fields,
  }).then(unwrap);

export const updateNeed = (needId: string, patch: Partial<NeedFields> & { status?: NeedStatus }) =>
  request<{ data: Need }>(`/needs/${encodeURIComponent(needId)}`, { method: 'PATCH', body: patch }).then(unwrap);

export const applyToNeed = (needId: string, message: string) =>
  request<{ data: Application }>(`/needs/${encodeURIComponent(needId)}/applications`, {
    method: 'POST',
    body: { message },
  }).then(unwrap);

export const listMyApplications = (offset: number, limit = PAGE_SIZE) =>
  request<Page<Application>>(`/me/applications${pageQuery(offset, limit)}`);

export const listProjectApplications = (projectId: string, offset: number) =>
  request<Page<ApplicationReview>>(`/projects/${encodeURIComponent(projectId)}/applications${pageQuery(offset)}`);

export const updateApplicationStatus = (applicationId: string, status: ApplicationStatus) =>
  request<{ data: Application }>(`/applications/${encodeURIComponent(applicationId)}`, {
    method: 'PATCH',
    body: { status },
  }).then(unwrap);
