// Daily bulk sync: Yahoo fundamentals → public.stock_fundamentals_cache (24h TTL).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { fetchYahooFundamentals, type FundamentalsPayload } from '../_shared/yahooFundamentals.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CONCURRENCY = 4;
const STAGGER_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isAuthorizedServiceToken(token: string, serviceKey: string): boolean {
  if (!token) return false;
  if (token === serviceKey) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload?.role === 'service_role';
  } catch {
    return false;
  }
}

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

async function syncSymbol(symbol: string, admin: ReturnType<typeof createClient>) {
  try {
    const data = await fetchYahooFundamentals(symbol);
    const { error } = await admin.from('stock_fundamentals_cache').upsert(toRow(data), {
      onConflict: 'symbol',
    });
    if (error) throw error;
    return { symbol, ok: true as const };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`fundamentals sync failed for ${symbol}:`, message);
    return { symbol, ok: false as const, error: message };
  }
}

async function runPool(
  symbols: string[],
  admin: ReturnType<typeof createClient>,
): Promise<{ updated: number; failed: number; errors: string[] }> {
  let cursor = 0;
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  async function worker(workerId: number) {
    while (true) {
      const i = cursor++;
      if (i >= symbols.length) break;
      await sleep(workerId * STAGGER_MS);
      const result = await syncSymbol(symbols[i], admin);
      if (result.ok) updated++;
      else {
        failed++;
        if (errors.length < 20) errors.push(`${result.symbol}: ${result.error}`);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, symbols.length) }, (_, id) => worker(id)),
  );

  return { updated, failed, errors };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceKey) {
      throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set');
    }

    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7)
      : '';
    const adminSecret = Deno.env.get('ADMIN_FUNCTION_SECRET') ?? '';
    const suppliedAdminSecret = req.headers.get('x-admin-secret') ?? '';
    const isAdminSecretValid = !!adminSecret && suppliedAdminSecret === adminSecret;
    const isServiceRole = isAuthorizedServiceToken(token, serviceKey);

    if (!isServiceRole && !isAdminSecretValid) {
      return new Response(JSON.stringify({ error: 'Service role or admin secret required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const force = body?.force === true;
    let symbols: string[] = [];
    if (Array.isArray(body?.symbols)) {
      symbols = body.symbols
        .filter((s: unknown) => typeof s === 'string' && s.length > 0)
        .map((s: string) => s.toUpperCase().trim())
        .slice(0, 500);
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (symbols.length === 0) {
      const { data, error } = await admin
        .from('stocks')
        .select('symbol')
        .eq('is_active', true);
      if (error) throw error;
      symbols = (data ?? []).map((r) => String(r.symbol));
    }

    if (!force && symbols.length > 0) {
      const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();
      const { data: cached, error: cacheErr } = await admin
        .from('stock_fundamentals_cache')
        .select('symbol, fetched_at, fetch_error, fifty_two_week_high')
        .in('symbol', symbols)
        .gte('fetched_at', cutoff)
        .is('fetch_error', null)
        .not('fifty_two_week_high', 'is', null);
      if (cacheErr) throw cacheErr;
      const fresh = new Set((cached ?? []).map((r) => String(r.symbol)));
      symbols = symbols.filter((s) => !fresh.has(s));
    }

    if (symbols.length === 0) {
      return new Response(
        JSON.stringify({ updated: 0, failed: 0, skipped: true, message: 'All symbols fresh (<24h)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { updated, failed, errors } = await runPool(symbols, admin);

    return new Response(
      JSON.stringify({
        updated,
        failed,
        total: symbols.length,
        errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
