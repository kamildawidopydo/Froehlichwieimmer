// Dividend info for held symbols via the `stock-dividends` edge function.

import { supabase } from '@/lib/supabase';

/**
 * @returns {Promise<Record<string, {currency:string, ttmDividend:number, lastAmount:number|null, lastDate:string|null, payments12m:number}>>}
 */
export async function fetchDividends(symbols) {
  const list = (symbols || []).filter(Boolean);
  if (list.length === 0) return {};
  const { data, error } = await supabase.functions.invoke('stock-dividends', {
    body: { symbols: list },
  });
  if (error) throw error;
  const map = {};
  (data?.dividends || []).forEach((d) => {
    if (!d?.symbol) return;
    map[d.symbol] = {
      currency: d.currency || 'USD',
      ttmDividend: Number(d.ttm_dividend || 0),
      lastAmount: d.last_amount != null ? Number(d.last_amount) : null,
      lastDate: d.last_date || null,
      payments12m: Number(d.payments_12m || 0),
    };
  });
  return map;
}
