import { useCallback, useEffect, useRef, useState } from 'react';
import { DiscoveryError, fetchDiscoveryProjects } from './api.ts';
import { filtersFromParams, toQueryString, type SearchFilters } from './filters.ts';
import type { ProjectSummary } from './types.ts';

export type DiscoveryState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: ProjectSummary[]; total: number };

interface Result {
  key: string;
  state: DiscoveryState;
  loadingMore: boolean;
  moreError: string | null;
}

const LOADING: DiscoveryState = { status: 'loading' };

/**
 * Loads discovery results for the given filters, cancelling stale requests.
 * Results are keyed by request, so a filter change shows loading immediately
 * without synchronous state resets. `loadMore` appends the next page.
 */
export function useDiscovery(filters: SearchFilters, pageSize = 12) {
  const filterKey = toQueryString(filters);
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${filterKey}#${pageSize}#${attempt}`;
  const [result, setResult] = useState<Result | null>(null);
  const moreController = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    moreController.current?.abort();
    const query = filtersFromParams(new URLSearchParams(filterKey));
    fetchDiscoveryProjects({ ...query, limit: pageSize, offset: 0 }, controller.signal)
      .then((page) => ({ status: 'ready', items: page.data, total: page.pagination.total }) as const)
      .catch((err: unknown) => ({ status: 'error', message: messageFor(err) }) as const)
      .then((state) => {
        if (!controller.signal.aborted) setResult({ key: requestKey, state, loadingMore: false, moreError: null });
      });
    return () => controller.abort();
  }, [filterKey, pageSize, requestKey]);

  const current = result?.key === requestKey ? result : null;
  const state = current?.state ?? LOADING;

  const loadMore = useCallback(() => {
    if (!current || current.state.status !== 'ready' || current.loadingMore) return;
    const { items, total } = current.state;
    if (items.length >= total) return;
    const controller = new AbortController();
    moreController.current = controller;
    const update = (fn: (r: Result) => Result) =>
      setResult((prev) => (prev && prev.key === requestKey && !controller.signal.aborted ? fn(prev) : prev));

    update((r) => ({ ...r, loadingMore: true, moreError: null }));
    const query = filtersFromParams(new URLSearchParams(filterKey));
    fetchDiscoveryProjects({ ...query, limit: pageSize, offset: items.length }, controller.signal)
      .then((page) =>
        update((r) =>
          r.state.status === 'ready'
            ? { ...r, loadingMore: false, state: { status: 'ready', items: dedupe([...r.state.items, ...page.data]), total: page.pagination.total } }
            : r,
        ),
      )
      .catch((err: unknown) => update((r) => ({ ...r, loadingMore: false, moreError: messageFor(err) })));
  }, [current, filterKey, pageSize, requestKey]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { state, loadMore, loadingMore: current?.loadingMore ?? false, moreError: current?.moreError ?? null, retry };
}

function dedupe(items: ProjectSummary[]): ProjectSummary[] {
  const seen = new Set<string>();
  return items.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}

function messageFor(err: unknown): string {
  if (err instanceof DiscoveryError) return err.message;
  return 'Something went wrong while loading projects.';
}
