import { useEffect, useState } from 'react';
import { getVideoBySlug, incrementVideoView } from '@/services/newsService';

export function useNewsVideo(slug) {
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setVideo(null);
    (async () => {
      try {
        const row = await getVideoBySlug(slug, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setVideo(row);
        if (row) {
          incrementVideoView(slug).catch(() => {});
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

  return { video, loading, error };
}
