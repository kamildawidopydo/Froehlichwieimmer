// Chart overview fetch for /news/rohstoffcharts

import { supabase } from '@/lib/supabase';

export {
  ROHSTOFF_CHART_SECTIONS,
  DETAIL_CHART_RANGES,
} from '@/lib/market/marketInstruments';

export const CHART_RANGES = [
  { id: '7d', label: '7 Tage' },
  { id: '1mo', label: '1 Monat' },
  { id: '3mo', label: '3 Monate' },
  { id: '1y', label: '1 Jahr' },
  { id: '3y', label: '3 Jahre' },
  { id: '5y', label: '5 Jahre' },
];

const historyCache = new Map();
const CACHE_MS = 300_000;

export async function fetchChartHistory(symbol, range = '1y') {
  const batch = await fetchChartHistoryBatch([symbol], range);
  return batch[symbol] ?? [];
}

export async function fetchChartHistoryBatch(symbols, range = '1y') {
  const unique = [...new Set(symbols.filter(Boolean))];
  if (unique.length === 0) return {};

  const key = `${range}:${unique.sort().join(',')}`;
  const hit = historyCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  const { data, error } = await supabase.functions.invoke('market-chart-history', {
    body: unique.length === 1
      ? { symbol: unique[0], range }
      : { symbols: unique, range },
  });
  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));

  const out = {};
  if (unique.length === 1 && data?.points) {
    out[unique[0]] = data.points ?? [];
  } else {
    const series = data?.series ?? {};
    for (const sym of unique) {
      out[sym] = series[sym]?.points ?? [];
    }
  }

  historyCache.set(key, { at: Date.now(), data: out });
  return out;
}
