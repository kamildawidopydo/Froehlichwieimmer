// Fundamentals: read from cache; on miss fetch Yahoo, upsert, return (authenticated users).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { fetchYahooFundamentals, type FundamentalsPayload } from '../_shared/yahooFundamentals.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function toRow(data: FundamentalsPayload, fetchError: string | null = null) {
  return {
    symbol: data.symbol,
    currency: data.currency,
    market_cap: data.marketCap,
    pe_ratio: data.peRatio,
    forward_pe: data.forwardPE,
    dividend_yield: data.dividendYield,
    beta: data.beta,
    eps: data.eps,
    book_value: data.bookValue,
    fifty_two_week_high: data.fiftyTwoWeekHigh,
    fifty_two_week_low: data.fiftyTwoWeekLow,
    avg_volume: data.avgVolume,
    partial: data.partial,
    fetch_error: fetchError,
    fetched_at: new Date().toISOString(),
  };
}

function hasUsableFundamentals(row: Record<string, unknown> | null): boolean {
  if (!row) return false;
  if (row.fetch_error && row.fifty_two_week_high == null && row.pe_ratio == null && row.market_cap == null) {
    return false;
  }
  return (
    row.market_cap != null ||
    row.pe_ratio != null ||
    row.fifty_two_week_high != null ||
    row.fifty_two_week_low != null ||
    row.eps != null
  );
}

function mapResponse(row: Record<string, unknown>) {
  return {
    symbol: row.symbol,
    currency: row.currency ?? 'USD',
    marketCap: row.market_cap,
    peRatio: row.pe_ratio,
    forwardPE: row.forward_pe,
    dividendYield: row.dividend_yield,
    beta: row.beta,
    eps: row.eps,
    bookValue: row.book_value,
    fiftyTwoWeekHigh: row.fifty_two_week_high,
    fiftyTwoWeekLow: row.fifty_two_week_low,
    avgVolume: row.avg_volume,
    partial: row.partial ?? false,
    fetchedAt: row.fetched_at,
    fetchError: row.fetch_error,
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceKey) {
      throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set');
    }

    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const symbol = typeof body?.symbol === 'string' ? body.symbol.trim().toUpperCase() : '';
    const syncIfMissing = body?.syncIfMissing !== false;
    const force = body?.force === true;

    if (!symbol) {
      return new Response(JSON.stringify({ error: 'symbol required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (token !== serviceKey) {
      const { data: authData, error: authErr } = await admin.auth.getUser(token);
      if (authErr || !authData?.user) {
        return new Response(JSON.stringify({ error: 'Invalid auth token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { data: listed, error: listErr } = await admin
      .from('stocks')
      .select('symbol')
      .eq('symbol', symbol)
      .eq('is_active', true)
      .maybeSingle();
    if (listErr) throw listErr;
    if (!listed) {
      return new Response(JSON.stringify({ error: 'Symbol not in catalog' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: cached, error: cacheErr } = await admin
      .from('stock_fundamentals_cache')
      .select('*')
      .eq('symbol', symbol)
      .maybeSingle();
    if (cacheErr) throw cacheErr;

    if (!force && hasUsableFundamentals(cached)) {
      return new Response(JSON.stringify(mapResponse(cached!)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!syncIfMissing && !cached) {
      return new Response(JSON.stringify({ error: 'not_cached' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const data = await fetchYahooFundamentals(symbol);
      const row = toRow(data);
      const { error: upsertErr } = await admin.from('stock_fundamentals_cache').upsert(row, {
        onConflict: 'symbol',
      });
      if (upsertErr) throw upsertErr;
      return new Response(JSON.stringify(mapResponse(row)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const failRow = toRow(
        {
          symbol,
          currency: 'USD',
          marketCap: null,
          peRatio: null,
          forwardPE: null,
          dividendYield: null,
          beta: null,
          eps: null,
          bookValue: null,
          fiftyTwoWeekHigh: null,
          fiftyTwoWeekLow: null,
          avgVolume: null,
          partial: true,
        },
        message,
      );
      await admin.from('stock_fundamentals_cache').upsert(failRow, { onConflict: 'symbol' });
      return new Response(JSON.stringify({ error: message }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
