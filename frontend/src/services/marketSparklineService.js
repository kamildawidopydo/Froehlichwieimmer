import { getApiBase } from '@/lib/apiBase';
// Batch sparkline fetch backed by the FastAPI market API.
// Falls back to empty series for any symbol the backend does not support
// (only DAX/SPX/NDX/DJI have real intraday data; the rest returns 404 fast).

const API_ROOT = (getApiBase() || '').replace(/\/$/, '');

// Backend `_SPARKLINE_SUPPORTED` = {"DAX", "SPX", "NDX", "DJI"}. Frontend-
// Allowlist verhindert 404-Rundtrips für Einzelaktien/Anleihen/ETFs.
const SUPPORTED_SPARKLINE_SYMBOLS = new Set(['DAX', 'SPX', 'NDX', 'DJI']);

const CACHE_TTL_MS = 120_000;
const cache = new Map();
const UNSUPPORTED = new Set();

const cacheKey = (symbols, interval) =>
  `${interval}:${[...symbols].sort().join(',')}`;

const readCache = (key) => {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.data;
};

const writeCache = (key, data) => {
  cache.set(key, { at: Date.now(), data });
};

async function fetchOne(symbol) {
  const sym = String(symbol || '').toUpperCase();
  if (!sym || UNSUPPORTED.has(sym)) {
    return { points: [], prevClose: null };
  }
  if (!SUPPORTED_SPARKLINE_SYMBOLS.has(sym)) {
    UNSUPPORTED.add(sym);
    return { points: [], prevClose: null };
  }
  try {
    const res = await fetch(
      `${API_ROOT}/api/news-markte/market/sparkline/${encodeURIComponent(sym)}`,
      { headers: { Accept: 'application/json' } },
    );
    if (res.status === 404) {
      UNSUPPORTED.add(sym);
      return { points: [], prevClose: null };
    }
    if (!res.ok) return { points: [], prevClose: null };
    const data = await res.json();
    return {
      points: Array.isArray(data?.points) ? data.points : [],
      prevClose: data?.prev_close ?? null,
    };
  } catch {
    return { points: [], prevClose: null };
  }
}

export async function fetchMarketSparkline(symbol, { interval = '5m' } = {}) {
  const batch = await fetchMarketSparklinesBatch([symbol], { interval });
  const row = batch[symbol] ?? { points: [], prevClose: null };
  return {
    points: row.points,
    values: row.points.map((p) => p.c),
    prevClose: row.prevClose,
  };
}

/** @returns {Record<string, { points: {t:string,c:number}[], prevClose: number|null }>} */
export async function fetchMarketSparklinesBatch(symbols, { interval = '5m' } = {}) {
  const unique = [...new Set((symbols || []).filter(Boolean))];
  if (unique.length === 0) return {};

  const key = cacheKey(unique, interval);
  const cached = readCache(key);
  if (cached) return cached;

  const entries = await Promise.all(
    unique.map(async (sym) => [sym, await fetchOne(sym)]),
  );

  const out = Object.fromEntries(entries);
  writeCache(key, out);
  return out;
}
