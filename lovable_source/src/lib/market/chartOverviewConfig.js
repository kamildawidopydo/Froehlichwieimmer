// Session 82.97 — Chart-Overview History via FastAPI/Mongo (kein Supabase mehr).
// Nutzt bestehendes `GET /api/stocks/{symbol}/history?range=X` (yfinance read-through
// Cache serverseitig). Symbol-Fanout parallel; ein 404 pro Symbol → leere Serie
// (kein globaler Fehler).
import axios from 'axios';
import { getApiBase } from '@/lib/apiBase';

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

const API = getApiBase();
const historyCache = new Map();
const CACHE_MS = 300_000;

// Backend akzeptiert Kurz-Aliase; wir mappen konservativ.
const _RANGE_MAP = {
  '7d': '7d', '1mo': '1m', '3mo': '3m',
  '1y': '1y', '3y': '3y', '5y': '5y',
};

async function _fetchOne(symbol, range) {
  try {
    const backendRange = _RANGE_MAP[range] || range;
    const { data } = await axios.get(
      `${API}/api/stocks/${encodeURIComponent(symbol)}/history?range=${encodeURIComponent(backendRange)}`,
      { withCredentials: true },
    );
    const points = Array.isArray(data?.points) ? data.points : Array.isArray(data?.series) ? data.series : [];
    return points.map((p) => ({ ...p, t: p.t ?? p.timestamp ?? p.date, c: p.c ?? p.close }))
      .filter((p) => p.c != null && Number.isFinite(Number(p.c)));
  } catch (err) {
    if (err?.response?.status === 404) return [];
    throw err;
  }
}

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

  const results = await Promise.all(unique.map(async (sym) => {
    try { return [sym, await _fetchOne(sym, range)]; }
    catch { return [sym, []]; }
  }));
  const out = Object.fromEntries(results);
  historyCache.set(key, { at: Date.now(), data: out });
  return out;
}
