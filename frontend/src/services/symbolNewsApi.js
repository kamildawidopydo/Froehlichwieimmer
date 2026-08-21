import axios from 'axios';

const BASE = process.env.REACT_APP_BACKEND_URL;
const api = axios.create({ baseURL: `${BASE}/api`, withCredentials: false });
const unwrap = (r) => r.data;

/**
 * Symbol news — Phase 2c.
 * Endpoint returns empty items when no live provider is configured, so the
 * UI shows the "Aktuell keine relevanten Meldungen" empty state instead of
 * fabricated headlines.
 */
export const symbolNewsApi = {
  forSymbol: (symbol) => api.get(`/news-markte/symbol/${encodeURIComponent(symbol)}/news`).then(unwrap),
  batch: (symbols) => {
    const list = (symbols || []).map((s) => String(s).toUpperCase()).filter(Boolean);
    if (list.length === 0) return Promise.resolve({ by_symbol: {}, provider_configured: false, requested: [] });
    return api.get('/news-markte/symbols/news', { params: { symbols: list.join(',') } }).then(unwrap);
  },
};

export const formatPublishedAt = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'gerade eben';
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `vor ${diffH} Std.`;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
};
