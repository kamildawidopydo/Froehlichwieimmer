import { getApiBase } from '@/lib/apiBase';

// Session 82.72 — Mongo-native Events via /api/stocks/{symbol}/earnings (Fan-out).
const BASE = getApiBase();

async function fetchOne(symbol) {
  try {
    const res = await fetch(`${BASE}/api/stocks/${encodeURIComponent(symbol)}/earnings`, {
      credentials: 'include',
    });
    if (!res.ok) return [];
    const data = await res.json();
    // Backend liefert Earnings-Kalender; als Events normalisieren (kein synthetischer Dividend-Event).
    const upcoming = (data?.upcoming || data?.events || []).map((e) => ({
      symbol,
      type: 'earnings',
      date: e.date || e.event_date,
      title: e.title || 'Earnings',
      ...e,
    }));
    return upcoming;
  } catch {
    return [];
  }
}

export async function fetchStockEvents(symbols) {
  const list = [...new Set((symbols || []).filter(Boolean))].slice(0, 20);
  if (list.length === 0) return [];
  const results = await Promise.all(list.map((s) => fetchOne(String(s).toUpperCase())));
  const merged = results.flat().filter(Boolean);
  merged.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
  return merged;
}
