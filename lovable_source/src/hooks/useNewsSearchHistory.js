import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'news_recent_searches';
const MAX_RECENT = 5;

const readStored = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((s) => typeof s === 'string' && s.trim().length > 0).slice(0, MAX_RECENT)
      : [];
  } catch {
    return [];
  }
};

export function useNewsSearchHistory() {
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    setRecent(readStored());
  }, []);

  const remember = useCallback((term) => {
    const trimmed = String(term ?? '').trim();
    if (trimmed.length < 2) return;
    setRecent((prev) => {
      const next = [trimmed, ...prev.filter((s) => s !== trimmed)].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore quota */
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setRecent([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return { recent, remember, clear };
}
