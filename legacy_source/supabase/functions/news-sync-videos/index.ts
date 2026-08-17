// Supabase Edge Function: news-sync-videos
// - Pulls https://de.euronews.com/video and extracts current video detail URLs.
// - Scrapes each detail page for metadata (title/summary/thumbnail/embed/duration).
// - Upserts into `public.news_videos` (`onConflict: guid`).
// - Deletes rows missing from the latest upstream list (no archive).
//
// Scheduled automatically: `news-sync-articles` invokes this function after
// each successful article sync (pg_cron every 15 min). Can also be invoked
// directly: supabase functions invoke news-sync-videos --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { extractVideoDetail, extractVideoLinks, type VideoRow } from './parsers.ts';

const VIDEO_LIST_URL = 'https://de.euronews.com/video';
const MAX_VIDEOS = 60;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const FETCH_HEADERS: HeadersInit = {
  'User-Agent':
    'Mozilla/5.0 (compatible; kapitalmitte-newsbot/1.0; +https://kapitalmitte.app)',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'de-DE,de;q=0.9',
};

const fetchHtmlSafe = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url, { headers: FETCH_HEADERS });
    if (!res.ok) {
      console.warn(`video page ${url} failed: ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    console.warn(`video page ${url} threw`, err);
    return null;
  }
};

const mapWithConcurrency = async <T, R>(
  inputs: T[],
  concurrency: number,
  fn: (input: T) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = new Array(inputs.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= inputs.length) return;
      results[idx] = await fn(inputs[idx]);
    }
  });
  await Promise.all(workers);
  return results;
};

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

    const listing = await fetchHtmlSafe(VIDEO_LIST_URL);
    if (!listing) {
      return new Response(
        JSON.stringify({ ok: false, reason: 'listing_unavailable' }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const links = extractVideoLinks(listing).slice(0, MAX_VIDEOS);
    if (links.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, reason: 'no_listing_links' }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const details = await mapWithConcurrency(links, 4, async (url) => {
      const html = await fetchHtmlSafe(url);
      if (!html) return null;
      return extractVideoDetail(url, html);
    });

    const rows = details.filter(Boolean) as VideoRow[];
    if (rows.length === 0) {
      // Defensive guard: never wipe old rows if upstream parsing failed.
      return new Response(
        JSON.stringify({ ok: false, reason: 'no_items' }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const chunkSize = 50;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await admin
        .from('news_videos')
        .upsert(chunk, { onConflict: 'guid' });
      if (error) throw error;
    }

    const guids = rows.map((r) => r.guid);
    const inList = `(${guids.map((g) => `"${g.replace(/"/g, '\\"')}"`).join(',')})`;
    const { error: delError } = await admin
      .from('news_videos')
      .delete()
      .not('guid', 'in', inList);
    if (delError) {
      console.warn('news_videos delete failed', delError.message);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        listing_url: VIDEO_LIST_URL,
        links_found: links.length,
        items: rows.length,
        with_embed: rows.filter((r) => Boolean(r.embed_url)).length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('news-sync-videos failed', message);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
