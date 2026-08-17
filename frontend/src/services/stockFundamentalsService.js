import { supabase } from '@/lib/supabase';

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

function hasUsableFundamentals(mapped) {
  if (!mapped) return false;
  if (mapped.fetchError && mapped.fiftyTwoWeekHigh == null && mapped.peRatio == null && mapped.marketCap == null) {
    return false;
  }
  return (
    mapped.marketCap != null ||
    mapped.peRatio != null ||
    mapped.fiftyTwoWeekHigh != null ||
    mapped.fiftyTwoWeekLow != null ||
    mapped.eps != null
  );
}

/** Daily cache first; on miss triggers stock-fundamentals Edge Function (Yahoo fetch + upsert). */
export async function fetchStockFundamentals(symbol) {
  const sym = String(symbol).toUpperCase();

  const { data, error } = await supabase
    .from('stock_fundamentals_cache')
    .select('*')
    .eq('symbol', sym)
    .maybeSingle();
  if (error) throw error;

  const cached = mapRow(data);
  if (hasUsableFundamentals(cached)) {
    return cached;
  }

  const { data: live, error: fnErr } = await supabase.functions.invoke('stock-fundamentals', {
    body: { symbol: sym, syncIfMissing: true },
  });

  if (fnErr) {
    const err = new Error(fnErr.message || 'Fundamentaldaten konnten nicht geladen werden.');
    err.code = 'SYNC_FAILED';
    throw err;
  }

  if (live?.error) {
    const err = new Error(String(live.error));
    err.code = live.error === 'not_cached' ? 'NOT_CACHED' : 'SYNC_FAILED';
    throw err;
  }

  const mapped = mapRow(live);
  if (!hasUsableFundamentals(mapped)) {
    const err = new Error(mapped?.fetchError || 'Für dieses Symbol sind derzeit keine Kennzahlen verfügbar.');
    err.code = 'SYNC_FAILED';
    throw err;
  }

  return mapped;
}
