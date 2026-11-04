import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiRequestError } from './api';
import type { Page } from './types';

type Load<T> = (offset: number) => Promise<Page<T>>;

/** `load` must be stable (useCallback); changing it restarts the list. */
export function usePagedList<T>(load: Load<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<ApiRequestError | null>(null);
  const generation = useRef(0);

  const reload = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const page = await load(0);
      if (current !== generation.current) return;
      setItems(page.data);
      setTotal(page.pagination.total);
    } catch (caught) {
      if (current === generation.current) setError(caught as ApiRequestError);
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    void reload();
    return () => {
      generation.current += 1;
    };
  }, [reload]);

  const loadMore = useCallback(async () => {
    const current = generation.current;
    setLoadingMore(true);
    setError(null);
    try {
      const page = await load(items.length);
      if (current !== generation.current) return;
      setItems((previous) => [...previous, ...page.data]);
      setTotal(page.pagination.total);
    } catch (caught) {
      if (current === generation.current) setError(caught as ApiRequestError);
    } finally {
      setLoadingMore(false);
    }
  }, [items.length, load]);

  return { items, setItems, total, loading, loadingMore, error, reload, loadMore };
}
