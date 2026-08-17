import { supabase } from '@/lib/supabase';

/** Fetch dividend + earnings calendar events for symbols. */
export async function fetchStockEvents(symbols) {
  const list = [...new Set((symbols || []).filter(Boolean))].slice(0, 20);
  if (list.length === 0) return [];
  const { data, error } = await supabase.functions.invoke('stock-events', { body: { symbols: list } });
  if (error) throw error;
  return data?.events || [];
}
