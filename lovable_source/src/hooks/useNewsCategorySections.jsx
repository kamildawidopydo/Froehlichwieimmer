import { useCallback, useEffect, useRef, useState } from 'react';
import { NEWS_SECTION_CATEGORIES } from '@/lib/news/euronewsFeeds';
import { listPublicFeed } from '@/services/newsService';
import { NEWS_AUTO_REFRESH_MS } from '@/hooks/useNewsList';

/**
 * Parallel fetch of recent articles per category for the editorial
 * "Alle" section layout on /news.
 */
export function useNewsCategorySections({
  enabled = true,
  limit = 4,
  refreshIntervalMs = NEWS_AUTO_REFRESH_MS,
} = {}) {
  const [sections, setSections] = useState(
    /** @type {Record<string, import('@/lib/news/types').NewsArticle[]>} */ ({}),
  );
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);
  const lastFetchAtRef = useRef(0);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      if (!silent) setLoading(true);

      try {
        const rows = await Promise.all(
          NEWS_SECTION_CATEGORIES.map(async (slug) => {
            const { data } = await listPublicFeed({
              source: 'articles',
              category: slug,
              tab: 'recent',
              limit,
              offset: 0,
              signal: controller.signal,
            });
            return { slug, data: data ?? [] };
          }),
        );
        if (controller.signal.aborted) return;
        const map = {};
        for (const row of rows) {
          map[row.slug] = row.data;
        }
        setSections(map);
        lastFetchAtRef.current = Date.now();
      } catch {
        if (!controller.signal.aborted && !silent) setSections({});
      } finally {
        if (!controller.signal.aborted && !silent) setLoading(false);
      }
    },
    [limit],
  );

  useEffect(() => {
    if (!enabled) {
      abortRef.current?.abort();
      setSections({});
      setLoading(false);
      return undefined;
    }

    load();
    return () => abortRef.current?.abort();
  }, [enabled, load]);

  useEffect(() => {
    if (!enabled || !refreshIntervalMs || refreshIntervalMs <= 0) return undefined;

    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      load({ silent: true });
    };

    const id = window.setInterval(tick, refreshIntervalMs);

    const onVisibility = () => {
      if (document.hidden) return;
      const age = Date.now() - lastFetchAtRef.current;
      if (age >= refreshIntervalMs) load({ silent: true });
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, refreshIntervalMs, load]);

  return { sections, loading, refresh: load };
}
