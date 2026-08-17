// Supabase Edge Function: macro-rates
// - Refreshes macroeconomic indicators consumed by the dashboard.
// - Currently fetches Euro-area HICP year-over-year inflation from
//   Eurostat's open SDMX-JSON endpoint. Falls back to ECB if Eurostat fails.
// - Persists the latest value into public.macro_rates with key "eu_cpi_yoy".
// - On read (`?key=eu_cpi_yoy`) returns the cached row without recomputing if
//   it is younger than MIN_REFRESH_SECONDS (default 6h), unless `force=true`.
//
// Deploy:
//   supabase functions deploy macro-rates --no-verify-jwt
// Invoke from frontend (authenticated, read-only):
//   supabase.functions.invoke('macro-rates', { body: { key: 'eu_cpi_yoy' } })

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DEFAULT_KEY = 'eu_cpi_yoy';
const DEFAULT_MIN_REFRESH_SECONDS = 6 * 60 * 60; // 6 hours
const MIN_REFRESH_SECONDS = (() => {
  const raw = Number(
    Deno.env.get('MACRO_RATES_MIN_REFRESH_SECONDS') ??
      DEFAULT_MIN_REFRESH_SECONDS,
  );
  return Number.isFinite(raw) && raw > 0
    ? Math.floor(raw)
    : DEFAULT_MIN_REFRESH_SECONDS;
})();

interface MacroRow {
  key: string;
  value: number;
  source: string | null;
  fetched_at: string;
  expires_at: string | null;
  metadata: Record<string, unknown>;
}

// Eurostat SDMX-JSON endpoint for HICP all-items, EU + EA aggregates.
// We pick "EA" (Euro area) as the canonical reference for the dashboard.
async function fetchEurostatCpi(): Promise<{ value: number; period: string } | null> {
  const url =
    'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_manr?format=JSON&geo=EA&coicop=CP00&lang=EN';
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'kapitalmitte-dashboard/1.0',
    },
  });
  if (!res.ok) {
    console.warn(`Eurostat HICP request failed: ${res.status}`);
    return null;
  }
  const json = await res.json();
  const valuesObj = json?.value ?? {};
  const timeObj = json?.dimension?.time?.category?.index ?? {};

  const entries = Object.entries<number>(timeObj).sort(
    (a, b) => (b[1] as number) - (a[1] as number),
  );
  for (const [period, idx] of entries) {
    const value = valuesObj[String(idx)];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return { value, period };
    }
  }
  return null;
}

// Backup: ECB Statistical Data Warehouse — HICP EA YoY (ICP.M.U2.N.000000.4.ANR)
async function fetchEcbCpi(): Promise<{ value: number; period: string } | null> {
  const url =
    'https://data-api.ecb.europa.eu/service/data/ICP/M.U2.N.000000.4.ANR?format=jsondata&lastNObservations=1';
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'kapitalmitte-dashboard/1.0',
    },
  });
  if (!res.ok) {
    console.warn(`ECB HICP request failed: ${res.status}`);
    return null;
  }
  const json = await res.json();
  const series = json?.dataSets?.[0]?.series ?? {};
  const seriesKey = Object.keys(series)[0];
  if (!seriesKey) return null;
  const observations = series[seriesKey]?.observations ?? {};
  const obsKeys = Object.keys(observations).sort(
    (a, b) => Number(b) - Number(a),
  );
  if (obsKeys.length === 0) return null;
  const latest = observations[obsKeys[0]];
  const value = Array.isArray(latest) ? Number(latest[0]) : NaN;
  if (!Number.isFinite(value)) return null;

  const timeValues = json?.structure?.dimensions?.observation?.find(
    (d: { id: string }) => d.id === 'TIME_PERIOD',
  )?.values;
  const periodLabel = Array.isArray(timeValues)
    ? timeValues[Number(obsKeys[0])]?.id ?? ''
    : '';

  return { value, period: String(periodLabel) };
}

async function readCached(
  admin: ReturnType<typeof createClient>,
  key: string,
): Promise<MacroRow | null> {
  const { data, error } = await admin
    .from('macro_rates')
    .select('key, value, source, fetched_at, expires_at, metadata')
    .eq('key', key)
    .maybeSingle();
  if (error) {
    console.warn('macro_rates read failed', error.message);
    return null;
  }
  return (data as MacroRow) ?? null;
}

async function writeCached(
  admin: ReturnType<typeof createClient>,
  key: string,
  value: number,
  source: string,
  metadata: Record<string, unknown>,
): Promise<MacroRow | null> {
  const now = new Date();
  const expires = new Date(now.getTime() + MIN_REFRESH_SECONDS * 1000);
  const row: MacroRow = {
    key,
    value,
    source,
    fetched_at: now.toISOString(),
    expires_at: expires.toISOString(),
    metadata,
  };
  const { data, error } = await admin
    .from('macro_rates')
    .upsert(row, { onConflict: 'key' })
    .select()
    .maybeSingle();
  if (error) {
    console.warn('macro_rates write failed', error.message);
    return null;
  }
  return (data as MacroRow) ?? row;
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

    let body: { key?: string; force?: boolean } = {};
    if (req.method === 'POST') {
      body = await req.json().catch(() => ({}));
    }

    const url = new URL(req.url);
    const key =
      (body.key && String(body.key)) || url.searchParams.get('key') || DEFAULT_KEY;
    const force =
      body.force === true || url.searchParams.get('force') === 'true';

    const cached = await readCached(admin, key);
    if (cached && !force) {
      const fetchedTs = new Date(cached.fetched_at).getTime();
      const ageSeconds = Math.max(
        0,
        Math.floor((Date.now() - fetchedTs) / 1000),
      );
      if (ageSeconds < MIN_REFRESH_SECONDS) {
        return new Response(
          JSON.stringify({
            ...cached,
            cached: true,
            age_seconds: ageSeconds,
            min_refresh_seconds: MIN_REFRESH_SECONDS,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    if (key !== 'eu_cpi_yoy') {
      // Only one indicator implemented for now; anything else returns the cached
      // row (or 404) without trying to refresh from a third party.
      if (cached) {
        return new Response(JSON.stringify({ ...cached, cached: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(
        JSON.stringify({ error: `Unknown macro key: ${key}` }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    let snapshot = await fetchEurostatCpi();
    let source = 'eurostat';
    if (!snapshot) {
      snapshot = await fetchEcbCpi();
      source = snapshot ? 'ecb' : source;
    }

    if (!snapshot) {
      // Refresh failed — keep returning the last good value if we have one.
      if (cached) {
        return new Response(
          JSON.stringify({
            ...cached,
            cached: true,
            stale: true,
            error: 'upstream_unavailable',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
      return new Response(
        JSON.stringify({ error: 'No data available from upstream' }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const written = await writeCached(admin, key, snapshot.value, source, {
      period: snapshot.period,
    });

    return new Response(
      JSON.stringify({
        ...(written ?? {
          key,
          value: snapshot.value,
          source,
          fetched_at: new Date().toISOString(),
          metadata: { period: snapshot.period },
        }),
        cached: false,
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
