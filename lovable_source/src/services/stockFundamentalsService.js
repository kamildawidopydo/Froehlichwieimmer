// Session 82.72 — Mongo-native Fundamentals via /api/stocks/{symbol}/fundamentals.
const BASE = process.env.REACT_APP_BACKEND_URL;

function mapRow(row) {
  if (!row) return null;
  return {
    symbol: row.symbol,
    currency: row.currency ?? 'USD',
    marketCap: row.market_cap ?? row.marketCap,
    peRatio: row.pe_ratio ?? row.peRatio,
    forwardPE: row.forward_pe ?? row.forwardPE,
    dividendYield: row.dividend_yield ?? row.dividendYield,
    beta: row.beta,
    eps: row.eps,
    bookValue: row.book_value ?? row.bookValue,
    fiftyTwoWeekHigh: row.fifty_two_week_high ?? row.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: row.fifty_two_week_low ?? row.fiftyTwoWeekLow,
    avgVolume: row.avg_volume ?? row.avgVolume,
    partial: row.partial ?? false,
    fetchedAt: row.fetched_at ?? row.fetchedAt,
    fetchError: row.fetch_error ?? row.fetchError,
  };
}

function hasUsable(mapped) {
  if (!mapped) return false;
  return (
    mapped.marketCap != null ||
    mapped.peRatio != null ||
    mapped.fiftyTwoWeekHigh != null ||
    mapped.fiftyTwoWeekLow != null ||
    mapped.eps != null
  );
}

export async function fetchStockFundamentals(symbol) {
  const sym = String(symbol).toUpperCase();
  const res = await fetch(`${BASE}/api/stocks/${encodeURIComponent(sym)}/fundamentals`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.code = res.status === 404 ? 'NOT_CACHED' : 'SYNC_FAILED';
    throw err;
  }
  const data = await res.json();
  const mapped = mapRow(data);
  if (!hasUsable(mapped)) {
    const err = new Error(mapped?.fetchError || 'Für dieses Symbol sind derzeit keine Kennzahlen verfügbar.');
    err.code = 'SYNC_FAILED';
    throw err;
  }
  return mapped;
}
