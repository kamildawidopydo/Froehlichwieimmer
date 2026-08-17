// Supabase Edge Function: savings-rates-sync
// - Daily sync of Zinssatz p.a. from Raisin/Weltsparen public API (~15 banks)
// - Direct fetch from official bank websites for others (best-effort HTML parse)
// - Updates savings_offers.interest_rate + savings_offer_rate_history
//
// Deploy:
//   supabase functions deploy savings-rates-sync --no-verify-jwt
// Cron (see migration): once daily via pg_cron + pg_net

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  fetchDirectBankRate,
  getCachedDirectRate,
  prefetchDirectRates,
} from './bankSources.ts';
import { fetchRaisinOffersByBank, getRaisinOffersForSlug } from './raisin.ts';
import type { OfferRow, ResolvedRate, SyncResult } from './types.ts';
import { normalizeProductType, pickRaisinRate } from './utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MIN_REFRESH_MS = 20 * 60 * 60 * 1000; // 20h — cron runs daily

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

type DirectRateCaches = Awaited<ReturnType<typeof prefetchDirectRates>>;

async function resolveRate(
  bankSlug: string,
  productType: ReturnType<typeof normalizeProductType>,
  depositTerm: number,
  raisinByBank: Awaited<ReturnType<typeof fetchRaisinOffersByBank>>,
  directCaches: DirectRateCaches,
  websiteUrl?: string | null,
): Promise<ResolvedRate | null> {
  const raisinOffers = getRaisinOffersForSlug(bankSlug, raisinByBank);
  if (raisinOffers?.length) {
    const picked = pickRaisinRate(raisinOffers, productType, depositTerm);
    if (picked) {
      return {
        rate: picked.rate,
        source: 'raisin/weltsparen',
        note: picked.productName,
        effectiveDate: picked.effectiveDate,
      };
    }
  }

  const cached = getCachedDirectRate(bankSlug, productType, directCaches);
  if (cached) return cached;

  return fetchDirectBankRate(bankSlug, productType, websiteUrl, directCaches.json);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = new Date().toISOString();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceKey) {
      throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set');
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!isAuthorizedServiceToken(token, serviceKey)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let force = false;
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      force = body?.force === true;
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (!force) {
      const { data: lastRun } = await admin
        .from('savings_rate_sync_log')
        .select('finished_at, status')
        .eq('status', 'success')
        .order('finished_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastRun?.finished_at) {
        const age = Date.now() - new Date(lastRun.finished_at).getTime();
        if (age < MIN_REFRESH_MS) {
          return new Response(
            JSON.stringify({
              skipped: true,
              reason: 'cache_fresh',
              last_run: lastRun.finished_at,
              age_hours: Math.round(age / 3600000),
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      }
    }

    const { data: logRow, error: logStartErr } = await admin
      .from('savings_rate_sync_log')
      .insert({ started_at: startedAt, status: 'running' })
      .select('id')
      .single();

    if (logStartErr) console.warn('sync log insert failed', logStartErr.message);

    const result: SyncResult = { updated: 0, skipped: 0, failed: 0, details: [] };

    const { data: offers, error: offersErr } = await admin
      .from('savings_offers')
      .select(
        'id, interest_rate, investment_type, deposit_term, banks!inner(slug, website_url, is_active)',
      )
      .eq('is_active', true)
      .eq('banks.is_active', true);

    if (offersErr) throw new Error(`offers query failed: ${offersErr.message}`);

    const [raisinByBank, directCaches] = await Promise.all([
      fetchRaisinOffersByBank(),
      prefetchDirectRates(),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const rateMemo = new Map<string, ResolvedRate | null>();

    async function resolveRateMemo(
      bankSlug: string,
      productType: ReturnType<typeof normalizeProductType>,
      depositTerm: number,
      websiteUrl?: string | null,
    ): Promise<ResolvedRate | null> {
      const key = `${bankSlug}:${productType}:${depositTerm}`;
      if (rateMemo.has(key)) return rateMemo.get(key) ?? null;
      const resolved = await resolveRate(
        bankSlug,
        productType,
        depositTerm,
        raisinByBank,
        directCaches,
        websiteUrl,
      );
      rateMemo.set(key, resolved);
      return resolved;
    }

    for (const row of offers ?? []) {
      const bank = row.banks as { slug: string; website_url: string | null };
      const offer: OfferRow = {
        id: row.id,
        interest_rate: row.interest_rate,
        investment_type: row.investment_type,
        deposit_term: row.deposit_term ?? 0,
        bank_slug: bank.slug,
      };

      const productType = normalizeProductType(offer.investment_type);

      try {
        const resolved = await resolveRateMemo(
          offer.bank_slug,
          productType,
          offer.deposit_term,
          bank.website_url,
        );

        if (!resolved) {
          result.skipped++;
          result.details.push({
            bank_slug: offer.bank_slug,
            offer_id: offer.id,
            status: 'skipped',
            old_rate: offer.interest_rate,
            error: 'no rate source',
          });
          continue;
        }

        const newRate = Math.round(resolved.rate * 100) / 100;
        const oldRate = Math.round(offer.interest_rate * 100) / 100;

        if (Math.abs(newRate - oldRate) < 0.005) {
          result.details.push({
            bank_slug: offer.bank_slug,
            offer_id: offer.id,
            status: 'unchanged',
            old_rate: oldRate,
            new_rate: newRate,
            source: resolved.source,
          });
          continue;
        }

        const { error: updateErr } = await admin
          .from('savings_offers')
          .update({ interest_rate: newRate })
          .eq('id', offer.id);

        if (updateErr) throw updateErr;

        await admin.from('savings_offer_rate_history').upsert(
          {
            savings_offer_id: offer.id,
            recorded_at: today,
            interest_rate: newRate,
          },
          { onConflict: 'savings_offer_id,recorded_at' },
        );

        result.updated++;
        result.details.push({
          bank_slug: offer.bank_slug,
          offer_id: offer.id,
          status: 'updated',
          old_rate: oldRate,
          new_rate: newRate,
          source: resolved.source,
        });
      } catch (err) {
        result.failed++;
        result.details.push({
          bank_slug: offer.bank_slug,
          offer_id: offer.id,
          status: 'failed',
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const finishedAt = new Date().toISOString();
    const status = result.failed > 0 && result.updated === 0 ? 'error' : 'success';

    if (logRow?.id) {
      await admin
        .from('savings_rate_sync_log')
        .update({
          finished_at: finishedAt,
          status,
          updated_count: result.updated,
          skipped_count: result.skipped,
          failed_count: result.failed,
          details: result.details.slice(0, 200),
        })
        .eq('id', logRow.id);
    }

    return new Response(
      JSON.stringify({
        ...result,
        started_at: startedAt,
        finished_at: finishedAt,
        raisin_banks: raisinByBank.size,
        direct_prefetched: {
          html: directCaches.html.size,
          json: directCaches.json.size,
        },
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
