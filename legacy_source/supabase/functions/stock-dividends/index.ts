// Supabase Edge Function: stock-dividends
// - Proxies Yahoo Finance v8 chart endpoint with `events=div` (crumb-free)
// - Returns trailing-12-month dividend per share + last dividend per symbol
//
// Deploy:
//   supabase functions deploy stock-dividends --no-verify-jwt
// Invoke (authenticated):
//   supabase.functions.invoke('stock-dividends', { body: { symbols: ['AAPL','MSFT'] } })

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import * as Sentry from 'npm:@sentry/deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SENTRY_DSN = Deno.env.get('SENTRY_DSN') ?? '';
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: Deno.env.get('SUPABASE_ENV') ?? 'production',
  });
}

interface DividendInfo {
  symbol: string;
  currency: string | null;
  ttm_dividend: number; // trailing-12-month dividend per share
  last_amount: number | null;
  last_date: string | null; // ISO date of the most recent ex-dividend
  payments_12m: number;
}

const MS_PER_DAY = 86_400_000;

async function fetchDividends(symbol: string): Promise<DividendInfo | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1y&events=div`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    console.warn(`Dividend request failed for ${symbol}: ${res.status}`);
    return null;
  }
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) return null;
  const currency: string = result.meta?.currency ?? 'USD';
  const divs = result.events?.dividends ?? {};
  const entries = Object.values(divs as Record<string, { amount?: number; date?: number }>)
    .map((d) => ({ amount: Number(d?.amount ?? 0), date: Number(d?.date ?? 0) }))
    .filter((d) => d.amount > 0 && d.date > 0)
    .sort((a, b) => a.date - b.date);

  const nowSec = Date.now() / 1000;
  const cutoff = nowSec - (365 * MS_PER_DAY) / 1000;
  const ttm = entries.filter((d) => d.date >= cutoff);
  const ttmDividend = ttm.reduce((s, d) => s + d.amount, 0);
  const last = entries[entries.length - 1] ?? null;

  return {
    symbol: String(result.meta?.symbol ?? symbol),
    currency,
    ttm_dividend: Number(ttmDividend.toFixed(4)),
    last_amount: last ? Number(last.amount.toFixed(4)) : null,
    last_date: last ? new Date(last.date * 1000).toISOString().slice(0, 10) : null,
    payments_12m: ttm.length,
  };
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
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: authData, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid auth token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let symbols: string[] = [];
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      if (Array.isArray(body?.symbols)) {
        symbols = body.symbols
          .filter((s: unknown) => typeof s === 'string' && s.length > 0)
          .map((s: string) => s.toUpperCase().trim())
          .slice(0, 50);
      }
    }

    if (symbols.length === 0) {
      return new Response(JSON.stringify({ dividends: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const out: DividendInfo[] = [];
    const CHUNK = 6;
    for (let i = 0; i < symbols.length; i += CHUNK) {
      const slice = symbols.slice(i, i + CHUNK);
      const settled = await Promise.allSettled(slice.map((s) => fetchDividends(s)));
      settled.forEach((r) => {
        if (r.status === 'fulfilled' && r.value) out.push(r.value);
      });
    }

    return new Response(JSON.stringify({ dividends: out }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    if (SENTRY_DSN) Sentry.captureException(err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
