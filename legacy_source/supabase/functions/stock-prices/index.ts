// Supabase Edge Function: stock-prices
// - Pulls quotes from Yahoo Finance (query1.finance.yahoo.com) for a given list of symbols
// - Writes snapshot into public.stock_prices_cache (service_role bypasses RLS)
// - Returns the freshly fetched quotes to the caller
//
// Deploy:
//   supabase functions deploy stock-prices --no-verify-jwt
// Invoke from frontend (authenticated):
//   supabase.functions.invoke('stock-prices', { body: { symbols: ['AAPL','MSFT',...] } })

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import * as Sentry from 'npm:@sentry/deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Quote {
  symbol: string;
  price: number | null;
  prev_close: number | null;
  change_abs: number | null;
  change_pct: number | null;
  currency: string | null;
  day_high: number | null;
  day_low: number | null;
  volume: number | null;
  market_cap: number | null;
  bid: number | null;
  ask: number | null;
  bid_size: number | null;
  ask_size: number | null;
}

const DEFAULT_MIN_REFRESH_SECONDS = 300;
const MIN_REFRESH_SECONDS = (() => {
  const raw = Number(Deno.env.get('STOCK_PRICES_MIN_REFRESH_SECONDS') ?? DEFAULT_MIN_REFRESH_SECONDS);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_MIN_REFRESH_SECONDS;
})();

const cacheColumns = [
  'symbol',
  'price',
  'prev_close',
  'change_abs',
  'change_pct',
  'currency',
  'day_high',
  'day_low',
  'volume',
  'market_cap',
  'bid',
  'ask',
  'bid_size',
  'ask_size',
  'fetched_at',
].join(', ');

const normalizeSymbol = (symbol: string) => symbol.toUpperCase().replace(/^\^/, '');

const symbolVariants = (symbol: string) => {
  const bare = symbol.toUpperCase().replace(/^\^/, '');
  const caret = `^${bare}`;
  return [...new Set([symbol.toUpperCase(), bare, caret])];
};

const SENTRY_DSN = Deno.env.get('SENTRY_DSN') ?? '';
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: Deno.env.get('SUPABASE_ENV') ?? 'production',
  });
}

// Yahoo Finance v7/finance/quote now requires a "crumb" cookie exchange.
// The v8/finance/chart endpoint does NOT, so we use it per symbol.
// marketCap is not available via the chart endpoint — left as null.
async function fetchChartQuote(symbol: string): Promise<Quote | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    console.warn(`Chart request failed for ${symbol}: ${res.status}`);
    return null;
  }
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) return null;
  const meta = result.meta ?? {};
  const price = typeof meta.regularMarketPrice === 'number' ? meta.regularMarketPrice : null;
  const prev = typeof meta.chartPreviousClose === 'number'
    ? meta.chartPreviousClose
    : typeof meta.previousClose === 'number'
      ? meta.previousClose
      : null;
  const changeAbs = price != null && prev != null ? price - prev : null;
  const changePct = price != null && prev != null && prev !== 0 ? ((price - prev) / prev) * 100 : null;
  return {
    symbol,
    price,
    prev_close: prev,
    change_abs: changeAbs,
    change_pct: changePct,
    currency: (meta.currency as string) ?? null,
    day_high: typeof meta.regularMarketDayHigh === 'number' ? meta.regularMarketDayHigh : null,
    day_low: typeof meta.regularMarketDayLow === 'number' ? meta.regularMarketDayLow : null,
    volume: typeof meta.regularMarketVolume === 'number' ? meta.regularMarketVolume : null,
    market_cap: null,
    bid: typeof meta.bid === 'number' ? meta.bid : null,
    ask: typeof meta.ask === 'number' ? meta.ask : null,
    bid_size: typeof meta.bidSize === 'number' ? meta.bidSize : null,
    ask_size: typeof meta.askSize === 'number' ? meta.askSize : null,
  };
}

async function fetchYahooQuotes(symbols: string[]): Promise<Quote[]> {
  if (symbols.length === 0) return [];
  // Request in parallel chunks of 8 to avoid hitting rate limits
  const CHUNK = 8;
  const out: Quote[] = [];
  for (let i = 0; i < symbols.length; i += CHUNK) {
    const slice = symbols.slice(i, i + CHUNK);
    const settled = await Promise.allSettled(slice.map((s) => fetchChartQuote(s)));
    settled.forEach((r) => {
      if (r.status === 'fulfilled' && r.value) out.push(r.value);
    });
  }
  return out;
}

async function fetchCachedQuotes(admin: ReturnType<typeof createClient>, symbols: string[]) {
  const expanded = [...new Set(symbols.flatMap((s) => symbolVariants(s)))];
  const { data, error } = await admin
    .from('stock_prices_cache')
    .select(cacheColumns)
    .in('symbol', expanded);
  if (error) throw error;
  const byNorm = new Map<string, Record<string, unknown>>();
  for (const row of data ?? []) {
    byNorm.set(normalizeSymbol(String(row.symbol)), row);
  }
  return symbols
    .map((requested) => {
      const row = byNorm.get(normalizeSymbol(requested));
      if (!row) return null;
      return { ...row, symbol: requested };
    })
    .filter((row): row is Record<string, unknown> => !!row);
}

/** Index tickers (^GDAXI) are not in public.stocks — FK blocks cache upsert. */
const isIndexSymbol = (symbol: string) => String(symbol || '').startsWith('^');

function quoteToCacheRow(q: Quote, fetchedAt: string) {
  return {
    symbol: q.symbol,
    price: q.price,
    prev_close: q.prev_close,
    change_abs: q.change_abs,
    change_pct: q.change_pct,
    currency: q.currency,
    day_high: q.day_high,
    day_low: q.day_low,
    volume: q.volume,
    market_cap: q.market_cap,
    bid: q.bid,
    ask: q.ask,
    bid_size: q.bid_size,
    ask_size: q.ask_size,
    fetched_at: fetchedAt,
  };
}

async function upsertCacheableQuotes(
  admin: ReturnType<typeof createClient>,
  quotes: Quote[],
  fetchedAt: string,
): Promise<number> {
  const stockSymbols = [
    ...new Set(
      quotes.map((q) => q.symbol).filter((s) => s && !isIndexSymbol(s)),
    ),
  ];
  if (stockSymbols.length === 0) return 0;

  const { data: listed, error: listErr } = await admin
    .from('stocks')
    .select('symbol')
    .in('symbol', stockSymbols);
  if (listErr) {
    console.warn('stocks lookup for cache upsert failed', listErr.message);
    return 0;
  }

  const allowed = new Set((listed ?? []).map((r) => String(r.symbol)));
  const rows = quotes
    .filter((q) => q.symbol && allowed.has(q.symbol))
    .map((q) => quoteToCacheRow(q, fetchedAt));
  if (rows.length === 0) return 0;

  const { error } = await admin.from('stock_prices_cache').upsert(rows, { onConflict: 'symbol' });
  if (error) {
    console.warn('stock_prices_cache upsert failed', error.message);
    return 0;
  }
  return rows.length;
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
    const token = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : '';
    const adminSecret = Deno.env.get('ADMIN_FUNCTION_SECRET') ?? '';
    const suppliedAdminSecret = req.headers.get('x-admin-secret') ?? '';
    const isAdminSecretValid = !!adminSecret && suppliedAdminSecret === adminSecret;
    // Accept exact env match OR a JWT whose payload role is service_role.
    // Newer projects may inject sb_secret_* as SUPABASE_SERVICE_ROLE_KEY while
    // cron/Vault still store the legacy service_role JWT.
    let isServiceRoleRequest = !!token && token === serviceKey;
    if (!isServiceRoleRequest && token.includes('.')) {
      try {
        const payloadB64 = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/') ?? '';
        const payloadJson = atob(payloadB64);
        const payload = JSON.parse(payloadJson) as { role?: string };
        isServiceRoleRequest = payload?.role === 'service_role';
      } catch {
        // ignore malformed JWT
      }
    }
    if (!token && !isAdminSecretValid) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let isAdminUser = false;
    if (!isServiceRoleRequest && !isAdminSecretValid) {
      const { data: authData, error: authErr } = await admin.auth.getUser(token);
      if (authErr || !authData?.user) {
        return new Response(JSON.stringify({ error: 'Invalid auth token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: profile } = await admin
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .maybeSingle();
      isAdminUser = profile?.role === 'admin';
    }

    let symbols: string[] = [];
    let forceRequested = false;
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      if (Array.isArray(body?.symbols)) {
        symbols = body.symbols
          .filter((s: unknown) => typeof s === 'string' && s.length > 0)
          .map((s: string) => s.toUpperCase().trim())
          .slice(0, 150);
      }
      forceRequested = body?.force === true;
    }

    // Only privileged callers (service-role token, admin function secret,
    // or an authenticated admin user) are allowed to bypass the rate-limit.
    // A forged `force: true` from a normal user is silently ignored so it
    // cannot DoS Yahoo Finance.
    const forceBypass =
      forceRequested && (isServiceRoleRequest || isAdminSecretValid || isAdminUser);

    // Fallback: if no symbols provided, pull the whole active universe from public.stocks
    if (symbols.length === 0) {
      const { data, error } = await admin
        .from('stocks')
        .select('symbol')
        .eq('is_active', true);
      if (error) throw error;
      symbols = (data ?? []).map((r) => r.symbol);
    }

    if (symbols.length === 0) {
      return new Response(JSON.stringify({ quotes: [], cached: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: latestRows, error: latestError } = await admin
      .from('stock_prices_cache')
      .select('fetched_at')
      .in('symbol', symbols)
      .not('fetched_at', 'is', null)
      .order('fetched_at', { ascending: false })
      .limit(1);
    if (latestError) throw latestError;

    const latestFetchedAt = latestRows?.[0]?.fetched_at ? String(latestRows[0].fetched_at) : null;
    if (latestFetchedAt && !forceBypass) {
      const ageSeconds = Math.floor((Date.now() - new Date(latestFetchedAt).getTime()) / 1000);
      if (ageSeconds >= 0 && ageSeconds < MIN_REFRESH_SECONDS) {
        const cachedRows = await fetchCachedQuotes(admin, symbols);
        const cachedQuotes: Quote[] = cachedRows.map((r) => ({
          symbol: String(r.symbol),
          price: r.price != null ? Number(r.price) : null,
          prev_close: r.prev_close != null ? Number(r.prev_close) : null,
          change_abs: r.change_abs != null ? Number(r.change_abs) : null,
          change_pct: r.change_pct != null ? Number(r.change_pct) : null,
          currency: r.currency ? String(r.currency) : null,
          day_high: r.day_high != null ? Number(r.day_high) : null,
          day_low: r.day_low != null ? Number(r.day_low) : null,
          volume: r.volume != null ? Number(r.volume) : null,
          market_cap: r.market_cap != null ? Number(r.market_cap) : null,
          bid: r.bid != null ? Number(r.bid) : null,
          ask: r.ask != null ? Number(r.ask) : null,
          bid_size: r.bid_size != null ? Number(r.bid_size) : null,
          ask_size: r.ask_size != null ? Number(r.ask_size) : null,
        }));

        const cachedNorm = new Set(cachedQuotes.map((q) => normalizeSymbol(q.symbol)));
        const missing = symbols.filter((s) => !cachedNorm.has(normalizeSymbol(s)));

        if (missing.length === 0) {
          return new Response(
            JSON.stringify({
              quotes: cachedQuotes,
              cached: cachedQuotes.length,
              fetched_at: latestFetchedAt,
              skipped: true,
              reason: `throttled_${MIN_REFRESH_SECONDS}s`,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        const fetchedMissing = await fetchYahooQuotes(missing);
        const allQuotes = [...cachedQuotes, ...fetchedMissing];
        const now = new Date().toISOString();
        const cachedCount = await upsertCacheableQuotes(admin, fetchedMissing, now);

        return new Response(
          JSON.stringify({
            quotes: allQuotes,
            cached: cachedCount,
            fetched_at: now,
            partial: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    const all = await fetchYahooQuotes(symbols);

    const now = new Date().toISOString();
    const cachedCount = await upsertCacheableQuotes(admin, all, now);

    return new Response(
      JSON.stringify({ quotes: all, cached: cachedCount, fetched_at: now, forced: forceBypass }),
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
