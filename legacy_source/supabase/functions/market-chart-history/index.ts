// Historical OHLC for market chart overview pages (indices / commodities).
// Body: { symbol: string, range?: "7d"|"1mo"|"3mo"|"1y"|"3y"|"5y" }
//        OR { symbols: string[], range?: ... }
// Deploy: supabase functions deploy market-chart-history --no-verify-jwt

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
  'EURJPY=X', 'EURCAD=X', 'EURAUD=X',
  'GBPUSD=X', 'CHF=X', 'AUDUSD=X', 'USDCAD=X',
]);

type RangeKey = '1d' | '7d' | '1mo' | '3mo' | '1y' | '3y' | '5y';

const RANGE_MAP: Record<RangeKey, { range: string; interval: string }> = {
  '1d': { range: '1d', interval: '5m' },
  '7d': { range: '7d', interval: '1d' },
  '1mo': { range: '1mo', interval: '1d' },
  '3mo': { range: '3mo', interval: '1d' },
  '1y': { range: '1y', interval: '1wk' },
  '3y': { range: '3y', interval: '1mo' },
  '5y': { range: '5y', interval: '1mo' },
};

const fetchHistory = async (symbol: string, rangeKey: RangeKey) => {
  const cfg = RANGE_MAP[rangeKey] ?? RANGE_MAP['1y'];
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${cfg.interval}&range=${cfg.range}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Yahoo ${res.status}`);

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

  const currency = result.meta?.currency ?? null;

  return { symbol, points, currency, range: rangeKey };
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rangeKey = (String(body?.range ?? '1y') as RangeKey);
    if (!RANGE_MAP[rangeKey]) {
      return new Response(JSON.stringify({ error: 'invalid range' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const symbols: string[] = Array.isArray(body?.symbols)
      ? body.symbols.map((s: unknown) => String(s).trim().toUpperCase()).filter(Boolean)
      : body?.symbol
        ? [String(body.symbol).trim().toUpperCase()]
        : [];

    if (symbols.length === 0) {
      return new Response(JSON.stringify({ error: 'symbol required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const unique = [...new Set(symbols)].slice(0, 12);
    for (const sym of unique) {
      if (!ALLOWED.has(sym)) {
        return new Response(JSON.stringify({ error: `symbol not allowed: ${sym}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const results = await Promise.all(
      unique.map(async (symbol) => {
        try {
          return await fetchHistory(symbol, rangeKey);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { symbol, points: [], currency: null, range: rangeKey, error: message };
        }
      }),
    );

    if (unique.length === 1) {
      return new Response(JSON.stringify(results[0]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const series: Record<string, unknown> = {};
    for (const row of results) {
      series[row.symbol] = row;
    }

    return new Response(JSON.stringify({ series, range: rangeKey }), {
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
