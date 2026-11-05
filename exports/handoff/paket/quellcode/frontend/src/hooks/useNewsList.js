import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listArticles, listPublicFeed, listVideos } from '@/services/newsService';

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 300;
/** Keep the open /news tab in sync with the 15-min backend sync cadence. */
export const NEWS_AUTO_REFRESH_MS = 15 * 60 * 1000;

/**
 * Paginated news list with search debouncing and AbortController-based
 * race cancellation. Designed for IntersectionObserver-driven infinite
 * scroll.
 *
 * @param {Object} params
 * @param {'articles'|'videos'} params.source
 * @param {string} params.category - internal slug or 'all'
 * @param {string} params.search
 * @param {'recent'|'popular'} params.tab
 * @param {boolean} [params.publicFeed] - use rate-limited Edge Function
 * @param {number} [params.refreshIntervalMs] - silent auto-refresh interval (0 = off)
 */
export function useNewsList({
  source = 'articles',
  category = 'all',
  search = '',
  tab = 'recent',
  enabled = true,
  publicFeed = false,
  refreshIntervalMs = NEWS_AUTO_REFRESH_MS,
}) {
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const abortRef = useRef(null);
  const debouncedSearchRef = useRef('');
  const lastFetchAtRef = useRef(0);

  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const handle = setTimeout(() => {
      debouncedSearchRef.current = search;
      setDebouncedSearch(search);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [search]);

  const params = useMemo(
    () => ({ source, category, search: debouncedSearch, tab, publicFeed }),
    [source, category, debouncedSearch, tab, publicFeed],
  );

  const resolveFetchList = useCallback(() => {
    if (params.publicFeed) return listPublicFeed;
    return params.source === 'videos' ? listVideos : listArticles;
  }, [params.publicFeed, params.source]);

  const reset = useCallback(async ({ silent = false } = {}) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    offsetRef.current = 0;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const fetchList = resolveFetchList();
      const queryParams = params.publicFeed
        ? {
            source: params.source,
            category: params.category,
            search: params.search,
            tab: params.tab,
          }
        : params.source === 'videos'
          ? { search: params.search, tab: params.tab }
          : { category: params.category, search: params.search, tab: params.tab };
      const { data, count: total } = await fetchList({
        ...queryParams,
        limit: PAGE_SIZE,
        offset: 0,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setItems(data);
      setCount(total);
      offsetRef.current = data.length;
      setHasMore(total == null ? data.length === PAGE_SIZE : offsetRef.current < total);
      lastFetchAtRef.current = Date.now();
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err);
      if (!silent) {
        setItems([]);
        setHasMore(false);
      }
    } finally {
      if (!controller.signal.aborted && !silent) setLoading(false);
    }
  }, [params, resolveFetchList]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setLoadingMore(true);
    try {
      const fetchList = resolveFetchList();
      const queryParams = params.publicFeed
        ? {
            source: params.source,
            category: params.category,
            search: params.search,
            tab: params.tab,
          }
        : params.source === 'videos'
          ? { search: params.search, tab: params.tab }
          : { category: params.category, search: params.search, tab: params.tab };
      const { data, count: total } = await fetchList({
        ...queryParams,
        limit: PAGE_SIZE,
        offset: offsetRef.current,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setItems((prev) => {
        const merged = [...prev, ...data];
        offsetRef.current = merged.length;
        if (total != null) {
          setHasMore(merged.length < total);
        } else {
          setHasMore(data.length === PAGE_SIZE);
        }
        return merged;
      });
      if (total != null) setCount(total);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err);
      setHasMore(false);
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  }, [loading, loadingMore, hasMore, params, resolveFetchList]);

  useEffect(() => {
    if (!enabled) {
      abortRef.current?.abort();
      setItems([]);
      setCount(null);
      setLoading(false);
      setLoadingMore(false);
      setError(null);
      setHasMore(false);
      return undefined;
    }
    reset();
    return () => abortRef.current?.abort();
  }, [reset, enabled]);

  useEffect(() => {
    if (!enabled || !refreshIntervalMs || refreshIntervalMs <= 0) return undefined;

    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      reset({ silent: true });
    };

    const id = window.setInterval(tick, refreshIntervalMs);

    const onVisibility = () => {
      if (document.hidden) return;
      const age = Date.now() - lastFetchAtRef.current;
      if (age >= refreshIntervalMs) reset({ silent: true });
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, refreshIntervalMs, reset]);

  return {
    items,
    count,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh: reset,
    debouncedSearch,
  };
}
