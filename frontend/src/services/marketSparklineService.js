import { supabase } from '@/lib/supabase';

const CACHE_TTL_MS = 120_000;
const cache = new Map();

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

export async function fetchMarketSparkline(symbol, { interval = '5m' } = {}) {
  const batch = await fetchMarketSparklinesBatch([symbol], { interval });
  const row = batch[symbol] ?? { points: [], prevClose: null };
  return {
    points: row.points,
    values: row.points.map((p) => p.c),
    prevClose: row.prevClose,
  };
}

/** @returns {Record<string, { points: {t:number,c:number}[], prevClose: number|null }>} */
export async function fetchMarketSparklinesBatch(symbols, { interval = '5m' } = {}) {
  const unique = [...new Set(symbols.filter(Boolean))];
  if (unique.length === 0) return {};

  const key = cacheKey(unique, interval);
  const cached = readCache(key);
  if (cached) return cached;

  const { data, error } = await supabase.functions.invoke('market-sparklines', {
    body: unique.length === 1
      ? { symbol: unique[0], interval }
      : { symbols: unique, interval },
  });
  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));

  const out = {};
  if (unique.length === 1 && data?.points) {
    out[unique[0]] = {
      points: data.points ?? [],
      prevClose: data.prev_close ?? null,
    };
  } else {
    const series = data?.series ?? {};
    for (const sym of unique) {
      const entry = series[sym];
      out[sym] = {
        points: entry?.points ?? [],
        prevClose: entry?.prev_close ?? null,
      };
    }
  }

  writeCache(key, out);
  return out;
}
