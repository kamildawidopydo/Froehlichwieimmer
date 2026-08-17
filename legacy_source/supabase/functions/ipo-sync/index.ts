// Supabase Edge Function: ipo-sync
// Scrapes Euronext (EU) + Nasdaq (US) + Yahoo (secondary prices)
// and upserts into public.ipo_catalog.
//
// Deploy:
//   supabase functions deploy ipo-sync --no-verify-jwt
// Cron: weekly via pg_cron (see migration)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { fetchEuronextIpos, deriveStatus } from './euronextParser.ts';
import { fetchNasdaqIpos } from './nasdaqParser.ts';
import { fetchStockAnalysisIpos } from './stockAnalysisParser.ts';
import { fetchYahooIpos } from './yahooParser.ts';
import { promoteListedIpos } from './promoteIpos.ts';
import { purgeAlreadyListedIpos, isBlockedListedIpo } from './purgeListedIpos.ts';
import { resolveIpoLogoUrl } from './logoUtils.ts';
import type { ParsedIpoRow, SyncResult } from './types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MIN_REFRESH_MS = 20 * 60 * 60 * 1000; // 20h

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

async function resolveCaller(
  req: Request,
  admin: ReturnType<typeof createClient>,
  serviceKey: string,
): Promise<{ authorized: boolean; isPrivileged: boolean }> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { authorized: false, isPrivileged: false };

  if (isAuthorizedServiceToken(token, serviceKey)) {
    return { authorized: true, isPrivileged: true };
  }

  const { data: authData, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !authData?.user) {
    return { authorized: false, isPrivileged: false };
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .maybeSingle();

  const isAdminUser = profile?.role === 'admin';
  return { authorized: isAdminUser, isPrivileged: isAdminUser };
}

function mergePriceInto(target: ParsedIpoRow, source: ParsedIpoRow): void {
  if (source.priceRangeLow != null) target.priceRangeLow = source.priceRangeLow;
  if (source.priceRangeHigh != null) target.priceRangeHigh = source.priceRangeHigh;
  if (source.priceCurrency) target.priceCurrency = source.priceCurrency;
  if (source.autoStatus && !target.autoStatus) target.autoStatus = source.autoStatus;
}

function findByTicker(
  map: Map<string, ParsedIpoRow>,
  ticker: string | null,
  ipoDate: string | null,
): ParsedIpoRow | undefined {
  if (!ticker) return undefined;
  const t = ticker.toUpperCase();
  return [...map.values()].find(
    (e) =>
      e.tickerProposed?.toUpperCase() === t &&
      (ipoDate == null || e.ipoDate === ipoDate),
  );
}

function mergeRows(
  euronext: ParsedIpoRow[],
  usIpos: ParsedIpoRow[],
  yahoo: ParsedIpoRow[],
): Map<string, ParsedIpoRow> {
  const map = new Map<string, ParsedIpoRow>();

  for (const row of euronext) {
    map.set(row.externalKey, { ...row, priceCurrency: row.priceCurrency ?? 'EUR' });
  }

  for (const uRow of usIpos) {
    const existing = findByTicker(map, uRow.tickerProposed, uRow.ipoDate);
    if (existing) {
      mergePriceInto(existing, uRow);
      if (uRow.autoStatus) existing.autoStatus = uRow.autoStatus;
      continue;
    }
    map.set(uRow.externalKey, { ...uRow, priceCurrency: uRow.priceCurrency ?? 'USD' });
  }

  for (const yRow of yahoo) {
    const existing = findByTicker(map, yRow.tickerProposed, yRow.ipoDate);
    if (existing) {
      mergePriceInto(existing, yRow);
      continue;
    }
    if (!map.has(yRow.externalKey)) {
      map.set(yRow.externalKey, { ...yRow, priceCurrency: yRow.priceCurrency ?? 'EUR' });
    }
  }

  return map;
}

function resolveAutoStatus(
  row: ParsedIpoRow,
  existingStatus: string | undefined,
): string {
  if (existingStatus === 'open' || existingStatus === 'priced') {
    return existingStatus;
  }
  if (row.autoStatus) return row.autoStatus;
  return deriveStatus(row.ipoDate);
}

function shouldBeVisibleOnIpoPage(status: string): boolean {
  return !['listed', 'cancelled'].includes(status);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = new Date().toISOString();
  const errors: string[] = [];
  let upserted = 0;
  let skipped = 0;
  let promoted = 0;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceKey) {
      throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set');
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const caller = await resolveCaller(req, admin, serviceKey);
    if (!caller.authorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let force = false;
    let injectedNasdaq: ParsedIpoRow[] = [];
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      force = body?.force === true;
      if (caller.isPrivileged && Array.isArray(body?.nasdaqRows)) {
        injectedNasdaq = body.nasdaqRows as ParsedIpoRow[];
      }
    }

    if (!force) {
      const { data: recent } = await admin
        .from('ipo_sync_log')
        .select('finished_at, error_message')
        .is('error_message', null)
        .order('finished_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recent?.finished_at) {
        const elapsed = Date.now() - new Date(recent.finished_at).getTime();
        if (elapsed < MIN_REFRESH_MS) {
          return new Response(
            JSON.stringify({
              skipped: true,
              reason: 'throttled',
              upserted: 0,
              errors: [],
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      }
    }

    let euronextRows: ParsedIpoRow[] = [];
    let usIpoRows: ParsedIpoRow[] = [];
    let yahooRows: ParsedIpoRow[] = [];

    try {
      euronextRows = await fetchEuronextIpos();
    } catch (err) {
      errors.push(`euronext: ${(err as Error).message}`);
    }

    try {
      usIpoRows = await fetchStockAnalysisIpos();
    } catch (err) {
      errors.push(`stockanalysis: ${(err as Error).message}`);
    }

    if (usIpoRows.length === 0) {
      try {
        if (injectedNasdaq.length > 0) {
          usIpoRows = injectedNasdaq;
        } else {
          usIpoRows = await fetchNasdaqIpos();
        }
      } catch (err) {
        errors.push(`nasdaq: ${(err as Error).message}`);
      }
    }

    try {
      yahooRows = await fetchYahooIpos();
    } catch (err) {
      errors.push(`yahoo: ${(err as Error).message}`);
    }

    if (
      euronextRows.length === 0 &&
      usIpoRows.length === 0 &&
      yahooRows.length === 0
    ) {
      throw new Error('No IPO data fetched from any source');
    }

    const merged = mergeRows(euronextRows, usIpoRows, yahooRows);
    const now = new Date().toISOString();

    const { data: existingRows } = await admin
      .from('ipo_catalog')
      .select('external_key, is_manual_override, status')
      .in('external_key', [...merged.keys()]);

    const overrideMap = new Map(
      (existingRows ?? []).map((r) => [
        r.external_key,
        { manual: r.is_manual_override, status: r.status },
      ]),
    );

    for (const [key, row] of merged) {
      if (isBlockedListedIpo(row.tickerProposed, row.companyName)) continue;

      const existing = overrideMap.get(key);
      const logoUrl = resolveIpoLogoUrl(
        row.tickerProposed,
        row.prospectusUrl,
        row.exchange,
        row.market,
      );
      const payload: Record<string, unknown> = {
        external_key: key,
        source: row.source,
        company_name: row.companyName,
        ticker_proposed: row.tickerProposed,
        isin: row.isin,
        exchange: row.exchange,
        market: row.market,
        sector: row.sector,
        ipo_date: row.ipoDate,
        price_range_low: row.priceRangeLow,
        price_range_high: row.priceRangeHigh,
        price_currency: row.priceCurrency ?? 'EUR',
        prospectus_url: row.prospectusUrl,
        last_synced_at: now,
      };
      if (logoUrl) payload.logo_url = logoUrl;

      if (!existing?.manual) {
        const autoStatus = resolveAutoStatus(row, existing?.status);
        payload.status = autoStatus;
        payload.is_visible = shouldBeVisibleOnIpoPage(autoStatus);
      } else {
        skipped += 1;
        // Still update non-protected scrape fields for manual rows
        const { error } = await admin
          .from('ipo_catalog')
          .update({
            exchange: row.exchange,
            market: row.market,
            ipo_date: row.ipoDate,
            price_range_low: row.priceRangeLow ?? undefined,
            price_range_high: row.priceRangeHigh ?? undefined,
            ...(logoUrl ? { logo_url: logoUrl } : {}),
            last_synced_at: now,
          })
          .eq('external_key', key);
        if (error) errors.push(`update ${key}: ${error.message}`);
        continue;
      }

      const { error } = await admin.from('ipo_catalog').upsert(payload, {
        onConflict: 'external_key',
        ignoreDuplicates: false,
      });

      if (error) {
        errors.push(`upsert ${key}: ${error.message}`);
      } else {
        upserted += 1;
      }
    }

    const promoteResult = await promoteListedIpos(admin);
    promoted = promoteResult.promoted;
    if (promoteResult.errors.length) {
      errors.push(...promoteResult.errors.map((e) => `promote: ${e}`));
    }

    const purgeResult = await purgeAlreadyListedIpos(admin);
    if (purgeResult.errors.length) {
      errors.push(...purgeResult.errors.map((e) => `purge: ${e}`));
    }

    await admin.from('ipo_sync_log').insert({
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      source: 'euronext+stockanalysis+yahoo',
      rows_upserted: upserted,
      rows_skipped: skipped,
      error_message: errors.length
        ? errors.join('; ')
        : promoted > 0
        ? `promoted ${promoted} to stocks`
        : null,
    });

    const result: SyncResult = { upserted, skipped, promoted, errors };
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = (err as Error).message;
    errors.push(msg);

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      if (supabaseUrl && serviceKey) {
        const admin = createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        await admin.from('ipo_sync_log').insert({
          started_at: startedAt,
          finished_at: new Date().toISOString(),
          source: 'euronext+stockanalysis+yahoo',
          rows_upserted: upserted,
          rows_skipped: skipped,
          error_message: msg,
        });
      }
    } catch {
      // ignore log failure
    }

    return new Response(JSON.stringify({ upserted, skipped, promoted, errors }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
