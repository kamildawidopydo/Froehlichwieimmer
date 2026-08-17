// Historical price series for sparklines / detail charts. Proxies the
// existing `stock-history` edge function (Yahoo chart endpoint).

import { supabase } from '@/lib/supabase';

/**
 * Fetch raw history points for a symbol.
 * @returns {Promise<{points: {t:number,c:number}[], currency:string, price:number|null, prevClose:number|null}>}
 */
export async function fetchStockHistory(symbol, range = '1mo', interval) {
  const body = { symbol, range };
  if (interval) body.interval = interval;
  try {
    const { data, error } = await supabase.functions.invoke('stock-history', { body });
    if (error) throw error;
    return {
      points: data?.points || [],
      ohlc: data?.ohlc || [],
      currency: data?.currency || 'USD',
      price: data?.price ?? null,
      prevClose: data?.prev_close ?? null,
      fiftyTwoWeekHigh: data?.fifty_two_week_high ?? null,
      fiftyTwoWeekLow: data?.fifty_two_week_low ?? null,
    };
  } catch (err) {
    // Unauthenticated callers (showcase components on public pages) surface 401 here.
    // Suppress console noise; UIs render an empty chart state.
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('[stockHistoryService] skipped:', err?.message || err);
    }
    return {
      points: [],
      ohlc: [],
      currency: 'USD',
      price: null,
      prevClose: null,
      fiftyTwoWeekHigh: null,
      fiftyTwoWeekLow: null,
    };
  }
}

/** Convenience: close-price array for a compact sparkline. */
export async function fetchSparkline(symbol, range = '1mo') {
  const { points } = await fetchStockHistory(symbol, range);
  return points.map((p) => p.c).filter((c) => typeof c === 'number');
}
