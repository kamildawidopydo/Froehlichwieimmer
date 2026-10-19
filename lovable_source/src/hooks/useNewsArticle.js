import { useEffect, useState } from 'react';
import { getArticleBySlug, incrementArticleView } from '@/services/newsService';

export function useNewsArticle(slug) {
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setArticle(null);
    (async () => {
      try {
        const row = await getArticleBySlug(slug, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setArticle(row);
        if (row) {
          // Fire-and-forget; do not block the render pipeline.
          incrementArticleView(slug).catch(() => {});
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [slug]);

  return { article, loading, error };
}
