import { getApiBase } from '@/lib/apiBase';

// Session 82.72 — Mongo-native Dividends via /api/stocks/{symbol}/dividends (Fan-out).
const BASE = getApiBase();

async function fetchOne(symbol) {
  try {
    const res = await fetch(`${BASE}/api/stocks/${encodeURIComponent(symbol)}/dividends`, {
      credentials: 'include',
    });
    if (!res.ok) return null;
    const d = await res.json();
    // Normalize backend shape → legacy consumer shape. Nur echte Provider-Werte.
    return {
      symbol,
      currency: d.currency || 'USD',
      ttmDividend: Number(d.ttm_dividend ?? d.ttmDividend ?? 0),
      lastAmount: (d.last_amount ?? d.lastAmount) != null ? Number(d.last_amount ?? d.lastAmount) : null,
      lastDate: d.last_date ?? d.lastDate ?? null,
      payments12m: Number(d.payments_12m ?? d.payments12m ?? 0),
    };
  } catch {
    return null;
  }
}

export async function fetchDividends(symbols) {
  const list = (symbols || []).filter(Boolean);
  if (list.length === 0) return {};
  const results = await Promise.all(list.map((s) => fetchOne(String(s).toUpperCase())));
  const map = {};
  results.forEach((r) => {
    if (r?.symbol) map[r.symbol] = r;
  });
  return map;
}
