/**
 * Watchlist API + React hook. Server-side persistence (MongoDB) via
 * /api/watchlist. Unauthenticated callers get an empty list — the UI shows
 * the "Einloggen & Watchlist erstellen" CTA in that case.
 */
import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const BASE = process.env.REACT_APP_BACKEND_URL;
const api = axios.create({ baseURL: `${BASE}/api`, withCredentials: true });
const unwrap = (r) => r.data;

export const watchlistApi = {
  list: () => api.get('/watchlist').then(unwrap),
  add: (payload) => api.post('/watchlist', payload).then(unwrap),
  remove: (symbol) => api.delete(`/watchlist/${encodeURIComponent(symbol)}`).then(unwrap),
  reorder: (symbols) => api.put('/watchlist/order', { symbols }).then(unwrap),
  search: (q, limit = 12) => api.get('/watchlist/search', { params: { q, limit } }).then(unwrap),
  sparkline: (symbol) =>
    axios
      .create({ baseURL: `${BASE}/api`, withCredentials: false })
      .get(`/news-markte/market/sparkline/${encodeURIComponent(symbol)}`)
      .then(unwrap),
};

/**
 * Global-ish hook — refetches on auth change. Consumers on the same page
 * share the same list via the shared cache Map (light-weight; a per-page
 * hook keeps things predictable without needing Context or Query).
 */
export function useWatchlist() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await watchlistApi.list();
      setItems(data.items || []);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        setItems([]);
      } else {
        setError('Watchlist konnte nicht geladen werden.');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const symbols = useMemo(() => new Set(items.map((i) => i.symbol)), [items]);
  const isWatched = useCallback((symbol) => symbols.has(String(symbol || '').toUpperCase()), [symbols]);

  const add = useCallback(async ({ symbol, display_name, asset_type }) => {
    if (!user) throw new Error('LOGIN_REQUIRED');
    const item = await watchlistApi.add({ symbol, display_name, asset_type });
    await refresh();
    return item;
  }, [user, refresh]);

  const remove = useCallback(async (symbol) => {
    if (!user) throw new Error('LOGIN_REQUIRED');
    await watchlistApi.remove(symbol);
    await refresh();
  }, [user, refresh]);

  const reorder = useCallback(async (nextSymbols) => {
    if (!user) throw new Error('LOGIN_REQUIRED');
    await watchlistApi.reorder(nextSymbols);
    await refresh();
  }, [user, refresh]);

  return { items, symbols, loading, error, refresh, add, remove, reorder, isWatched, isAuthed: !!user };
}
