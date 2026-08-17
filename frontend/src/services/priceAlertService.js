import { supabase } from '@/lib/supabase';

export async function fetchPriceAlerts() {
  const { data, error } = await supabase
    .from('user_price_alerts')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchAllPriceAlerts() {
  const { data, error } = await supabase
    .from('user_price_alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
}

export async function createPriceAlert({ symbol, direction, targetPrice }) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error('Nicht angemeldet');
  const { data, error } = await supabase
    .from('user_price_alerts')
    .insert({
      user_id: userId,
      symbol: String(symbol).toUpperCase(),
      direction,
      target_price: Number(targetPrice),
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deletePriceAlert(id) {
  const { error } = await supabase.from('user_price_alerts').delete().eq('id', id);
  if (error) throw error;
}

/** Invoke edge function to evaluate active alerts against cached prices. */
export async function checkPriceAlerts() {
  const { data, error } = await supabase.functions.invoke('check-price-alerts', { body: {} });
  if (error) throw error;
  return data;
}
