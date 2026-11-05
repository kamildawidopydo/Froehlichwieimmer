import { useEffect, useState } from 'react';
import { listSearchSuggestions } from '@/services/newsService';

const DEBOUNCE_MS = 200;
const MIN_QUERY = 2;

/**
 * Debounced autocomplete suggestions for the public news search bar.
 */
export function useNewsSearchSuggestions({
  query = '',
  category = 'all',
  enabled = true,
  limit = 6,
} = {}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setSuggestions([]);
      setLoading(false);
      return undefined;
    }

    const trimmed = String(query ?? '').trim();
    if (trimmed.length < MIN_QUERY) {
      setSuggestions([]);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);

    const handle = setTimeout(() => {
      listSearchSuggestions({
        query: trimmed,
        category,
        limit,
        signal: controller.signal,
      })
        .then(({ data }) => {
          if (!controller.signal.aborted) setSuggestions(data ?? []);
        })
        .catch(() => {
          if (!controller.signal.aborted) setSuggestions([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [query, category, enabled, limit]);

  return { suggestions, loading };
}
