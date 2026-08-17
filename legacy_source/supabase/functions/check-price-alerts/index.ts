// Checks active user price alerts against stock_prices_cache.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceKey) throw new Error('Missing Supabase env');

    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authData, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid auth token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = authData.user.id;

    const { data: alerts, error: alertErr } = await admin
      .from('user_price_alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);
    if (alertErr) throw alertErr;

    if (!alerts?.length) {
      return new Response(JSON.stringify({ triggered: [], checked: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const symbols = [...new Set(alerts.map((a) => a.symbol))];
    const { data: prices, error: priceErr } = await admin
      .from('stock_prices_cache')
      .select('symbol, price')
      .in('symbol', symbols);
    if (priceErr) throw priceErr;

    const priceMap: Record<string, number> = {};
    (prices || []).forEach((p) => {
      if (p.price != null) priceMap[p.symbol] = Number(p.price);
    });

    const now = new Date().toISOString();
    const triggered: string[] = [];

    for (const alert of alerts) {
      const px = priceMap[alert.symbol];
      if (px == null) continue;
      const target = Number(alert.target_price);
      const hit =
        alert.direction === 'above' ? px >= target : px <= target;
      if (!hit) continue;

      const { error: updErr } = await admin
        .from('user_price_alerts')
        .update({ is_active: false, triggered_at: now })
        .eq('id', alert.id)
        .eq('user_id', userId);
      if (!updErr) triggered.push(alert.id);
    }

    return new Response(JSON.stringify({ triggered, checked: alerts.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
