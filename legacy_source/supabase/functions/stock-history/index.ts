// Supabase Edge Function: stock-history
// - Proxies Yahoo Finance v8 chart endpoint for historical price data
// - Returns { timestamps: number[], closes: number[] } for a given symbol + range
//
// Deploy:
//   supabase functions deploy stock-history --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import * as Sentry from 'npm:@sentry/deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// Allowed range → interval pairs (Yahoo-valid combinations)
const RANGE_INTERVAL: Record<string, string> = {
  '1d': '5m',
  '5d': '15m',
  '1mo': '30m',
  '3mo': '1d',
  '6mo': '1d',
  '1y': '1d',
  'ytd': '1d',
  '5y': '1wk',
  'max': '1mo',
};

const SENTRY_DSN = Deno.env.get('SENTRY_DSN') ?? '';
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: Deno.env.get('SUPABASE_ENV') ?? 'production',
  });
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

    let symbol = '';
    let range = '1mo';
    let interval = '';

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      symbol = String(body?.symbol ?? '').trim();
      range = String(body?.range ?? '1mo').trim();
      interval = String(body?.interval ?? '').trim();
    } else {
      const url = new URL(req.url);
      symbol = url.searchParams.get('symbol') ?? '';
      range = url.searchParams.get('range') ?? '1mo';
      interval = url.searchParams.get('interval') ?? '';
    }

    if (!symbol) throw new Error('symbol required');
    symbol = symbol.toUpperCase().trim();
    if (!/^[\^A-Z0-9.\-=]{1,16}$/.test(symbol)) throw new Error('invalid symbol');
    if (!RANGE_INTERVAL[range]) range = '1mo';
    if (!interval) interval = RANGE_INTERVAL[range] ?? '1d';

    const yUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}`;
    const res = await fetch(yUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error(`Yahoo request failed: ${res.status}`);
    }
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) throw new Error('No data');

    const timestamps: number[] = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0] ?? {};
    const closes: (number | null)[] = quote.close ?? [];
    const opens: (number | null)[] = quote.open ?? [];
    const highs: (number | null)[] = quote.high ?? [];
    const lows: (number | null)[] = quote.low ?? [];
    const volumes: (number | null)[] = quote.volume ?? [];
    const currency: string = result.meta?.currency ?? 'USD';
    const symbolOut: string = result.meta?.symbol ?? symbol;
    const price: number | null = typeof result.meta?.regularMarketPrice === 'number' ? result.meta.regularMarketPrice : null;
    const prev: number | null = typeof result.meta?.chartPreviousClose === 'number'
      ? result.meta.chartPreviousClose
      : typeof result.meta?.previousClose === 'number'
        ? result.meta.previousClose
        : null;
    const fiftyTwoHigh: number | null = typeof result.meta?.fiftyTwoWeekHigh === 'number' ? result.meta.fiftyTwoWeekHigh : null;
    const fiftyTwoLow: number | null = typeof result.meta?.fiftyTwoWeekLow === 'number' ? result.meta.fiftyTwoWeekLow : null;

    // Drop null closes (non-trading moments). `points` keeps the legacy
    // close-only shape; `ohlc` adds open/high/low/close/volume for candlesticks.
    const points: { t: number; c: number }[] = [];
    const ohlc: { t: number; o: number; h: number; l: number; c: number; v: number }[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const c = closes[i];
      if (typeof c === 'number') {
        points.push({ t: timestamps[i], c });
        ohlc.push({
          t: timestamps[i],
          o: typeof opens[i] === 'number' ? (opens[i] as number) : c,
          h: typeof highs[i] === 'number' ? (highs[i] as number) : c,
          l: typeof lows[i] === 'number' ? (lows[i] as number) : c,
          c,
          v: typeof volumes[i] === 'number' ? (volumes[i] as number) : 0,
        });
      }
    }

    return new Response(
      JSON.stringify({
        symbol: symbolOut,
        range,
        interval,
        currency,
        price,
        prev_close: prev,
        fifty_two_week_high: fiftyTwoHigh,
        fifty_two_week_low: fiftyTwoLow,
        points,
        ohlc,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    if (SENTRY_DSN) Sentry.captureException(err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
