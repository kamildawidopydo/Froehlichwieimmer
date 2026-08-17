// Public intraday sparklines for the /news Marktübersicht sidebar.
// Body: { symbol?: string, symbols?: string[], interval?: "5m" | "15m" }
// Deploy: supabase functions deploy market-sparklines --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ALLOWED = new Set([
  '^GDAXI', '^TECDAX', '^DJI', '^IXIC', '^GSPC', '^STOXX50E',
  'GC=F', 'SI=F', 'CL=F', 'NG=F', 'PA=F', 'PL=F',
  'EURUSD=X', 'USDJPY=X', 'EURGBP=X', 'EURCHF=X',
]);

type SparkSeries = {
  symbol: string;
  points: { t: number; c: number }[];
  prev_close: number | null;
};

const fetchYahooSeries = async (
  symbol: string,
  interval: '5m' | '15m',
): Promise<SparkSeries> => {
  const yUrl =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=1d`;
  const res = await fetch(yUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Yahoo request failed: ${res.status}`);

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error('No data');

  const timestamps: number[] = result.timestamp ?? [];
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
  const points: { t: number; c: number }[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const c = closes[i];
    if (typeof c === 'number') points.push({ t: timestamps[i], c });
  }

  const prev =
    typeof result.meta?.chartPreviousClose === 'number'
      ? result.meta.chartPreviousClose
      : typeof result.meta?.previousClose === 'number'
        ? result.meta.previousClose
        : null;

  return { symbol, points, prev_close: prev };
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const interval = body?.interval === '15m' ? '15m' : '5m';

    const rawSymbols: string[] = Array.isArray(body?.symbols)
      ? body.symbols.map((s: unknown) => String(s).trim().toUpperCase()).filter(Boolean)
      : body?.symbol
        ? [String(body.symbol).trim().toUpperCase()]
        : [];

    if (rawSymbols.length === 0) {
      return new Response(JSON.stringify({ error: 'symbol or symbols required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const symbols = [...new Set(rawSymbols)].slice(0, 16);
    for (const sym of symbols) {
      if (!ALLOWED.has(sym)) {
        return new Response(JSON.stringify({ error: `symbol not allowed: ${sym}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const results = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          return await fetchYahooSeries(symbol, interval);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { symbol, points: [], prev_close: null, error: message };
        }
      }),
    );

    const series: Record<string, SparkSeries & { error?: string }> = {};
    for (const row of results) {
      series[row.symbol] = row;
    }

    if (symbols.length === 1) {
      const one = series[symbols[0]];
      return new Response(
        JSON.stringify({
          symbol: one.symbol,
          points: one.points,
          prev_close: one.prev_close,
          interval,
          error: one.error ?? null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ series, interval }),
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
