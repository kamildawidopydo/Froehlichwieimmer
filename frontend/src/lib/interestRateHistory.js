import { supabase } from '@/lib/supabase';

/** @returns {Promise<Map<string, Array<{ recorded_at: string, interest_rate: number }>>>} */
export async function fetchInterestRateHistoryBatch(offerIds) {
  const map = new Map();
  if (!offerIds?.length) return map;

  const { data, error } = await supabase
    .from('savings_offer_rate_history')
    .select('savings_offer_id, recorded_at, interest_rate')
    .in('savings_offer_id', offerIds)
    .order('recorded_at', { ascending: true });

  if (error) {
    console.error('fetchInterestRateHistoryBatch', error);
    return map;
  }

  for (const row of data || []) {
    const list = map.get(row.savings_offer_id) || [];
    list.push({ recorded_at: row.recorded_at, interest_rate: Number(row.interest_rate) });
    map.set(row.savings_offer_id, list);
  }
  return map;
}

export function formatRateDe(rate) {
  return Number(rate ?? 0)
    .toFixed(2)
    .replace('.', ',');
}
