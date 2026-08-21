// Market data — FastAPI-backed (Alpha Vantage) with legacy shape preserved.
//
// This module used to call Supabase Edge Functions. It now calls the FastAPI
// backend `/api/news-markte/market/*` endpoints. Existing consumers keep the
// same `{ symbol, label, price, changePct, currency, decimals, compareColor }`
// row shape and can additionally read `lastUpdated`, `dataSource`, and
// `isDelayed` on each row.

import axios from 'axios';

const BASE = process.env.REACT_APP_BACKEND_URL;
const api = axios.create({ baseURL: `${BASE}/api`, withCredentials: false });

// --- Public config kept for backwards compatibility with existing charts ------

export const MARKET_INDICES = [
  { symbol: 'DAX',  label: 'DAX',       compareColor: '#1e3a5f' },
  { symbol: 'SPX',  label: 'S&P 500',   compareColor: '#0f766e' },
  { symbol: 'NDX',  label: 'Nasdaq',    compareColor: '#7c3aed' },
  { symbol: 'DJI',  label: 'Dow Jones', compareColor: '#ea580c' },
];

export const MARKET_COMMODITIES = [
  { symbol: 'GOLD',   label: 'Gold' },
  { symbol: 'SILVER', label: 'Silber' },
  { symbol: 'OIL',    label: 'Brent Öl' },
];

export const MARKET_FOREX = [
  { symbol: 'EURUSD', label: 'EUR/USD', decimals: 4 },
];

export const SIDEBAR_FOOTER_LINKS = {
  rohstoffe: { label: 'alle Rohstoff-Charts in der Übersicht »', to: '/news/rohstoffcharts' },
  devisen:   { label: 'Währungsrechner »', to: '/news/waehrungsrechner' },
};

// Legacy helper — kept for symbol normalisation callers.
export const normalizeMarketSymbol = (symbol) =>
  String(symbol || '').toUpperCase().replace(/^\^/, '');

// --- Backend response mapping ------------------------------------------------

const mapQuoteToRow = (q, cfg = {}) => ({
  symbol: cfg.symbol ?? q.symbol,
  label: cfg.label ?? q.name ?? q.symbol,
  price: q.price != null ? Number(q.price) : null,
  change: q.change != null ? Number(q.change) : null,
  changePct: q.change_percent != null ? Number(q.change_percent) : null,
  currency: q.currency ?? null,
  decimals: cfg.decimals ?? null,
  compareColor: cfg.compareColor ?? null,
  lastUpdated: q.last_updated ?? null,
  dataSource: q.data_source ?? null,
  isDelayed: q.is_delayed ?? true,
  note: q.note ?? null,
  name: q.name ?? cfg.label ?? cfg.symbol,
});

const applyConfig = (items, config) => {
  const map = {};
  (items || []).forEach((q) => { if (q?.symbol) map[q.symbol] = q; });
  return config.map((cfg) => {
    const q = map[cfg.symbol];
    if (!q) return mapQuoteToRow({ symbol: cfg.symbol, price: null }, cfg);
    return mapQuoteToRow(q, cfg);
  });
};

const emptyForConfig = (config) => config.map((cfg) => mapQuoteToRow({ symbol: cfg.symbol, price: null }, cfg));

// --- Public API --------------------------------------------------------------

/** Full overview (indices + commodities + fx) — 1 network call. */
export async function fetchMarketOverview() {
  try {
    const { data } = await api.get('/news-markte/market/overview');
    return {
      indices: applyConfig(data.indices, MARKET_INDICES),
      commodities: applyConfig(data.commodities, MARKET_COMMODITIES),
      fx: applyConfig(data.fx, MARKET_FOREX),
      lastUpdated: data.last_updated ?? null,
      isDelayed: !!data.is_delayed,
      providerConfigured: !!data.provider_configured,
      dataSourceSummary: data.data_source_summary || [],
    };
  } catch {
    return {
      indices: emptyForConfig(MARKET_INDICES),
      commodities: emptyForConfig(MARKET_COMMODITIES),
      fx: emptyForConfig(MARKET_FOREX),
      lastUpdated: null,
      isDelayed: true,
      providerConfigured: false,
      dataSourceSummary: ['unavailable'],
    };
  }
}

/** Fetch by list of symbols; unknown symbols are silently ignored. */
export async function fetchMarketQuotes(symbols) {
  const list = (symbols || []).map(normalizeMarketSymbol).filter(Boolean);
  if (list.length === 0) return [];
  try {
    const { data } = await api.get('/news-markte/market/quotes', {
      params: { symbols: list.join(',') },
    });
    return (data.items || []).map((q) => mapQuoteToRow(q));
  } catch {
    return [];
  }
}

export async function fetchMarketIndices() {
  const overview = await fetchMarketOverview();
  return overview.indices;
}

export async function fetchMarketCommodities() {
  const overview = await fetchMarketOverview();
  return overview.commodities;
}

export async function fetchMarketForex() {
  const overview = await fetchMarketOverview();
  return overview.fx;
}

async function _fetchStocks() {
  try {
    const { data } = await api.get('/news-markte/market/stocks');
    return (data.items || []).map((q) => ({
      name: q.name,
      symbol: q.symbol,
      exchange: null,
      displayOrder: 0,
      price: q.price != null ? Number(q.price) : null,
      change: q.change != null ? Number(q.change) : null,
      changePct: q.change_percent != null ? Number(q.change_percent) : null,
      currency: q.currency ?? 'USD',
      lastUpdated: q.last_updated ?? null,
      dataSource: q.data_source ?? null,
      isDelayed: q.is_delayed ?? true,
    })).filter((r) => r.price != null);
  } catch {
    return [];
  }
}

/** Top % gainers — sorted by changePct desc, positives only. */
export async function fetchFrankfurtWinners(limit = 12) {
  const rows = await _fetchStocks();
  return rows
    .filter((r) => Number(r.changePct) > 0)
    .sort((a, b) => Number(b.changePct) - Number(a.changePct))
    .slice(0, limit);
}

/** Curated "Aktien im Fokus" — insertion order. */
export async function fetchFeaturedStocks(limit = 12) {
  const rows = await _fetchStocks();
  return rows.slice(0, limit);
}

/** Top movers — sorted by absolute changePct. */
export async function fetchTopMovers(limit = 8) {
  const rows = await _fetchStocks();
  return rows
    .sort((a, b) => Math.abs(Number(b.changePct)) - Math.abs(Number(a.changePct)))
    .slice(0, limit);
}

// --- Formatters (unchanged from legacy service) ------------------------------

export const formatMarketPrice = (value, { decimals } = {}) => {
  if (value == null || Number.isNaN(Number(value))) return '–';
  const n = Number(value);
  const maxDec = decimals ?? (n >= 1000 ? 2 : n >= 100 ? 2 : 4);
  const minDec = decimals ?? (n >= 1000 ? 2 : 2);
  return n.toLocaleString('de-DE', {
    minimumFractionDigits: minDec,
    maximumFractionDigits: maxDec,
  });
};

export const formatChangePct = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '–';
  const n = Math.abs(Number(value));
  return `${n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
};

/** UI helper: convert ISO timestamp → "HH:MM Uhr" in the browser's locale. */
export const formatLastUpdated = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
};
