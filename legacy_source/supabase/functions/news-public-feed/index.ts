// Supabase Edge Function: news-public-feed
// - Rate-limited public list API for news articles/videos (anon-safe).
// - Caches first-page responses for 90 seconds to reduce DB load.
//
// Deploy: npm run supabase:deploy:news-public-feed
// Invoke: supabase.functions.invoke('news-public-feed', { body: { ... } })

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-forwarded-for',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const CACHE_TTL_SECONDS = 90;
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 60;

const ARTICLE_COLUMNS =
  'id, slug, guid, title, summary, content, image_url, category, source_url, published_at, language, view_count, read_time_minutes, video_embed_url, video_thumbnail_url, video_source_url';
const VIDEO_COLUMNS =
  'id, slug, guid, title, summary, thumbnail_url, embed_url, source_url, duration_seconds, show_label, published_at, language, view_count';

interface FeedRequest {
  source?: 'articles' | 'videos';
  category?: string;
  search?: string;
  tab?: 'recent' | 'popular';
  limit?: number;
  offset?: number;
}

const clientIp = (req: Request): string => {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
};

const cacheKey = (payload: FeedRequest): string => {
  const normalized = {
    source: payload.source ?? 'articles',
    category: payload.category ?? 'all',
    search: (payload.search ?? '').trim().toLowerCase(),
    tab: payload.tab ?? 'recent',
    limit: payload.limit ?? 20,
    offset: payload.offset ?? 0,
  };
  return `news_feed:${JSON.stringify(normalized)}`;
};

const checkRateLimit = async (
  admin: ReturnType<typeof createClient>,
  ip: string,
): Promise<{ ok: true } | { ok: false; retryAfter: number }> => {
  const now = Date.now();
  const windowStart = new Date(
    Math.floor(now / (RATE_LIMIT_WINDOW_SECONDS * 1000)) *
      RATE_LIMIT_WINDOW_SECONDS * 1000,
  ).toISOString();
  const clientKey = `ip:${ip}`;

  const { data: row, error: fetchErr } = await admin
    .from('news_api_rate_limits')
    .select('request_count')
    .eq('client_key', clientKey)
    .eq('window_start', windowStart)
    .maybeSingle();

  if (fetchErr) {
    console.warn('rate limit fetch failed', fetchErr.message);
    return { ok: true };
  }

  const count = row?.request_count ?? 0;
  if (count >= RATE_LIMIT_MAX_REQUESTS) {
    const windowEnd =
      new Date(windowStart).getTime() + RATE_LIMIT_WINDOW_SECONDS * 1000;
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((windowEnd - now) / 1000)),
    };
  }

  const { error: upsertErr } = await admin.from('news_api_rate_limits').upsert(
    {
      client_key: clientKey,
      window_start: windowStart,
      request_count: count + 1,
    },
    { onConflict: 'client_key,window_start' },
  );
  if (upsertErr) console.warn('rate limit upsert failed', upsertErr.message);

  const staleBefore = new Date(
    now - RATE_LIMIT_WINDOW_SECONDS * 2 * 1000,
  ).toISOString();
  admin
    .from('news_api_rate_limits')
    .delete()
    .lt('window_start', staleBefore)
    .then(() => {});

  return { ok: true };
};

const readCache = async (
  admin: ReturnType<typeof createClient>,
  key: string,
): Promise<{ data: unknown[]; count: number | null } | null> => {
  const { data, error } = await admin
    .from('news_list_cache')
    .select('payload, expires_at')
    .eq('cache_key', key)
    .maybeSingle();

  if (error || !data) return null;
  if (new Date(data.expires_at).getTime() <= Date.now()) {
    await admin.from('news_list_cache').delete().eq('cache_key', key);
    return null;
  }

  const payload = data.payload as { data?: unknown[]; count?: number | null };
  return {
    data: payload.data ?? [],
    count: payload.count ?? null,
  };
};

const writeCache = async (
  admin: ReturnType<typeof createClient>,
  key: string,
  result: { data: unknown[]; count: number | null },
): Promise<void> => {
  const expiresAt = new Date(
    Date.now() + CACHE_TTL_SECONDS * 1000,
  ).toISOString();
  const { error } = await admin.from('news_list_cache').upsert(
    {
      cache_key: key,
      payload: result,
      expires_at: expiresAt,
    },
    { onConflict: 'cache_key' },
  );
  if (error) console.warn('cache write failed', error.message);

  admin
    .from('news_list_cache')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .then(() => {});
};

const fetchFeed = async (
  admin: ReturnType<typeof createClient>,
  body: FeedRequest,
): Promise<{ data: unknown[]; count: number | null }> => {
  const source = body.source === 'videos' ? 'videos' : 'articles';
  const limit = Math.min(Math.max(body.limit ?? 20, 1), 50);
  const offset = Math.max(body.offset ?? 0, 0);
  const tab = body.tab === 'popular' ? 'popular' : 'recent';
  const search = (body.search ?? '').trim();

  if (search.length > 0) {
    const { data, error } = await admin.rpc('news_fuzzy_search', {
      p_source: source,
      p_query: search,
      p_category: body.category ?? 'all',
      p_tab: tab,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) throw error;
    const payload = (data ?? { data: [], count: 0 }) as {
      data?: unknown[];
      count?: number;
    };
    return {
      data: payload.data ?? [],
      count: payload.count ?? null,
    };
  }

  const table = source === 'videos' ? 'news_videos' : 'news_articles';
  const columns = source === 'videos' ? VIDEO_COLUMNS : ARTICLE_COLUMNS;

  let q = admin.from(table).select(columns, { count: 'exact' });

  if (source === 'articles' && body.category && body.category !== 'all') {
    q = q.eq('category', body.category);
  }

  if (tab === 'popular') {
    q = q
      .order('view_count', { ascending: false })
      .order('published_at', { ascending: false });
  } else {
    q = q.order('published_at', { ascending: false });
  }

  q = q.range(offset, offset + limit - 1);

  const { data, count, error } = await q;
  if (error) throw error;
  return { data: data ?? [], count: count ?? null };
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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

    const body = (await req.json().catch(() => ({}))) as FeedRequest;
    const offset = Math.max(body.offset ?? 0, 0);

    const rate = await checkRateLimit(admin, clientIp(req));
    if (!rate.ok) {
      return new Response(
        JSON.stringify({
          error: 'rate_limit_exceeded',
          retry_after_seconds: rate.retryAfter,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(rate.retryAfter),
          },
        },
      );
    }

    const key = cacheKey(body);
    if (offset === 0) {
      const cached = await readCache(admin, key);
      if (cached) {
        return new Response(
          JSON.stringify({ ...cached, cached: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    const result = await fetchFeed(admin, body);

    if (offset === 0) {
      await writeCache(admin, key, result);
    }

    return new Response(
      JSON.stringify({ ...result, cached: false }),
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
