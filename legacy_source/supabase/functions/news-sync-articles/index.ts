// Supabase Edge Function: news-sync-articles
// Pulls RSS feeds by sync group, scrapes full article bodies + images, upserts
// into `public.news_articles`, and prunes stale rows per provider group.
//
// Body: { "sync_group": "euronews" | "financial" | "official" } (default: euronews)
// Cron: euronews */15, financial */10, official */30

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { mergeCategories, resolveItemCategory } from './category.ts';
import {
  feedsForGroup,
  providersForGroup,
  type NewsProvider,
  type SyncGroup,
} from './feeds.ts';
import { parseRssItems, extractArticleData, pickFirstUsableImage, type RssItem } from './parsers.ts';
import { computeReadTimeMinutes } from './readTime.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface UpsertRow extends RssItem {
  content: string | null;
  read_time_minutes: number;
  video_embed_url: string | null;
  video_thumbnail_url: string | null;
  video_source_url: string | null;
  video_scraped_at: string | null;
}

const MAX_PER_CATEGORY = 30;
const MAX_PER_CATEGORY_FINANCIAL = 20;
const SCRAPE_CONCURRENCY = 2;
const SCRAPE_CONCURRENCY_FINANCIAL = 4;
const UPSERT_BATCH = 25;
const MIN_EXISTING_CONTENT = 200;

const maxPerCategoryForGroup = (group: SyncGroup): number =>
  group === 'financial' ? MAX_PER_CATEGORY_FINANCIAL : MAX_PER_CATEGORY;

const scrapeConcurrencyForGroup = (group: SyncGroup): number =>
  group === 'financial' ? SCRAPE_CONCURRENCY_FINANCIAL : SCRAPE_CONCURRENCY;

const VALID_GROUPS = new Set<SyncGroup>(['euronews', 'financial', 'official']);

const fetchFeedSafe = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; kapitalmitte-newsbot/1.0; +https://kapitalmitte.app)',
        Accept: 'application/rss+xml,application/xml,text/xml',
        'Accept-Language': 'de-DE,de;q=0.9',
      },
    });
    if (!res.ok) {
      console.warn(`feed ${url} failed: ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    console.warn(`feed ${url} threw`, err);
    return null;
  }
};

const dedupeByGuid = (items: RssItem[]): RssItem[] => {
  const map = new Map<string, RssItem>();
  for (const raw of items) {
    const item: RssItem = {
      ...raw,
      category: resolveItemCategory(raw),
    };
    const existing = map.get(item.guid);
    if (!existing) {
      map.set(item.guid, item);
      continue;
    }
    map.set(item.guid, {
      ...existing,
      category: mergeCategories(existing.category, item.category),
      image_url: existing.image_url ?? item.image_url,
      summary: existing.summary ?? item.summary,
    });
  }
  return Array.from(map.values());
};

const capItemsPerCategory = (
  items: RssItem[],
  cap: number,
): RssItem[] => {
  const byCategory = new Map<string, RssItem[]>();
  for (const item of items) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }
  const picked: RssItem[] = [];
  for (const list of byCategory.values()) {
    picked.push(
      ...list
        .sort(
          (a, b) =>
            Date.parse(b.published_at) - Date.parse(a.published_at),
        )
        .slice(0, cap),
    );
  }
  return dedupeByGuid(picked);
};

const loadExistingArticles = async (
  admin: ReturnType<typeof createClient>,
  guids: string[],
): Promise<
  Map<
    string,
    {
      content: string | null;
      image_url: string | null;
      video_embed_url: string | null;
      video_thumbnail_url: string | null;
      video_source_url: string | null;
      video_scraped_at: string | null;
    }
  >
> => {
  const map = new Map<
    string,
    {
      content: string | null;
      image_url: string | null;
      video_embed_url: string | null;
      video_thumbnail_url: string | null;
      video_source_url: string | null;
      video_scraped_at: string | null;
    }
  >();
  // Keep batches small — financial guids are full URLs and blow HTTP query limits.
  const GUID_CHUNK = 15;
  for (let i = 0; i < guids.length; i += GUID_CHUNK) {
    const slice = guids.slice(i, i + GUID_CHUNK);
    const { data, error } = await admin
      .from('news_articles')
      .select(
        'guid, content, image_url, video_embed_url, video_thumbnail_url, video_source_url, video_scraped_at',
      )
      .in('guid', slice);
    if (error) throw error;
    for (const row of data ?? []) {
      map.set(row.guid as string, {
        content: (row.content as string | null) ?? null,
        image_url: (row.image_url as string | null) ?? null,
        video_embed_url: (row.video_embed_url as string | null) ?? null,
        video_thumbnail_url: (row.video_thumbnail_url as string | null) ?? null,
        video_source_url: (row.video_source_url as string | null) ?? null,
        video_scraped_at: (row.video_scraped_at as string | null) ?? null,
      });
    }
  }
  return map;
};

const enrichItem = async (
  item: RssItem,
  existingArticles: Map<
    string,
    {
      content: string | null;
      image_url: string | null;
      video_embed_url: string | null;
      video_thumbnail_url: string | null;
      video_source_url: string | null;
      video_scraped_at: string | null;
    }
  >,
): Promise<UpsertRow> => {
  const prev = existingArticles.get(item.guid);
  const minContentLength =
    item.source_provider === 'euronews' ? MIN_EXISTING_CONTENT : 80;
  const hasContent =
    Boolean(prev?.content && prev.content.length >= minContentLength);
  const resolvedImage = pickFirstUsableImage(
    [item.image_url, prev?.image_url],
    item.source_url,
  );
  const videoProbed = Boolean(prev?.video_scraped_at);

  // Financial/official providers rarely have hero images; re-scraping every
  // run caused timeouts and blocked the Markt category feeds from updating.
  const skipScrape =
    hasContent &&
    (item.source_provider !== 'euronews' ||
      (Boolean(resolvedImage) && videoProbed));

  if (skipScrape) {
    return {
      ...item,
      image_url: resolvedImage,
      content: prev!.content,
      video_embed_url: prev?.video_embed_url ?? null,
      video_thumbnail_url: prev?.video_thumbnail_url ?? null,
      video_source_url: prev?.video_source_url ?? null,
      video_scraped_at: prev!.video_scraped_at,
      read_time_minutes: computeReadTimeMinutes(
        prev!.content,
        item.summary,
        item.title,
      ),
    };
  }

  const scraped = await extractArticleData(item.source_url);
  const summaryFallback =
    item.source_provider !== 'euronews' &&
    item.summary &&
    item.summary.length >= 80
      ? item.summary
      : null;
  const content = hasContent
    ? prev!.content
    : scraped.content ?? summaryFallback;
  const imageUrl = pickFirstUsableImage(
    [scraped.image, item.image_url, prev?.image_url],
    item.source_url,
  );
  const scrapedAt = new Date().toISOString();
  return {
    ...item,
    image_url: imageUrl,
    content,
    video_embed_url: scraped.video_embed_url,
    video_thumbnail_url: scraped.video_thumbnail_url ?? imageUrl,
    video_source_url: scraped.video_source_url,
    video_scraped_at: scrapedAt,
    read_time_minutes: computeReadTimeMinutes(
      content,
      item.summary,
      item.title,
    ),
  };
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

const invalidateNewsListCache = async (
  admin: ReturnType<typeof createClient>,
): Promise<void> => {
  const { error } = await admin
    .from('news_list_cache')
    .delete()
    .like('cache_key', 'news_feed:%');
  if (error) console.warn('news_list_cache invalidate failed', error.message);
};

const triggerArticleGroupSync = (
  supabaseUrl: string,
  serviceKey: string,
  group: SyncGroup,
): void => {
  fetch(`${supabaseUrl}/functions/v1/news-sync-articles`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sync_group: group }),
  }).catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`news-sync-articles ${group} trigger failed:`, message);
  });
};

const triggerVideoSync = async (
  supabaseUrl: string,
  serviceKey: string,
): Promise<Record<string, unknown>> => {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/news-sync-videos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      console.warn('news-sync-videos returned', res.status, body);
    }
    return { triggered: true, status: res.status, ...body };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('news-sync-videos trigger failed:', message);
    return { triggered: false, error: message };
  }
};

const pruneStaleArticles = async (
  admin: ReturnType<typeof createClient>,
  providers: NewsProvider[],
  activeGuids: string[],
): Promise<void> => {
  if (providers.length === 0) return;

  const { data: existing, error } = await admin
    .from('news_articles')
    .select('guid')
    .in('source_provider', providers);
  if (error) throw error;

  const active = new Set(activeGuids);
  const stale = (existing ?? [])
    .map((r) => r.guid as string)
    .filter((g) => !active.has(g));

  const DELETE_CHUNK = 25;
  for (let i = 0; i < stale.length; i += DELETE_CHUNK) {
    const slice = stale.slice(i, i + DELETE_CHUNK);
    const { error: delError } = await admin
      .from('news_articles')
      .delete()
      .in('guid', slice);
    if (delError) {
      console.warn('news_articles prune failed', delError.message);
    }
  }
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let syncGroup: SyncGroup = 'euronews';
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        const candidate = String(body?.sync_group ?? 'euronews') as SyncGroup;
        if (VALID_GROUPS.has(candidate)) syncGroup = candidate;
      } catch {
        // empty body → default group
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceKey) {
      throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set');
    }
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const feeds = feedsForGroup(syncGroup);
    const providers = providersForGroup(syncGroup);

    const xmls = [];
    for (const feed of feeds) {
      xmls.push({ feed, xml: await fetchFeedSafe(feed.url) });
    }

    const items = xmls.flatMap(({ feed, xml }) =>
      xml ? parseRssItems(xml, feed) : [],
    );
    const categoryCap = maxPerCategoryForGroup(syncGroup);
    const scrapeConcurrency = scrapeConcurrencyForGroup(syncGroup);
    const deduped = capItemsPerCategory(dedupeByGuid(items), categoryCap);
    const existingArticles = await loadExistingArticles(
      admin,
      deduped.map((d) => d.guid),
    );

    let totalWithContent = 0;
    let totalWithImage = 0;
    let totalWithVideo = 0;
    const category_counts: Record<string, number> = {};

    for (let i = 0; i < deduped.length; i += UPSERT_BATCH) {
      const batch = deduped.slice(i, i + UPSERT_BATCH);
      const enriched = await mapWithConcurrency(batch, scrapeConcurrency, (item) =>
        enrichItem(item, existingArticles),
      );

      for (const row of enriched) {
        category_counts[row.category] = (category_counts[row.category] ?? 0) + 1;
        if (row.content && row.content.length > 0) totalWithContent++;
        if (row.image_url) totalWithImage++;
        if (row.video_embed_url) totalWithVideo++;
      }

      const { error } = await admin
        .from('news_articles')
        .upsert(enriched, { onConflict: 'guid' });
      if (error) throw error;
    }

    if (deduped.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, reason: 'no_items', sync_group: syncGroup }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    await pruneStaleArticles(
      admin,
      providers,
      deduped.map((e) => e.guid),
    );

    await invalidateNewsListCache(admin);

    const videos = syncGroup === 'euronews'
      ? await triggerVideoSync(supabaseUrl, serviceKey)
      : { triggered: false, skipped: true };

    const chained: Record<string, boolean> = {};
    if (syncGroup === 'euronews') {
      triggerArticleGroupSync(supabaseUrl, serviceKey, 'financial');
      triggerArticleGroupSync(supabaseUrl, serviceKey, 'official');
      chained.financial = true;
      chained.official = true;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        sync_group: syncGroup,
        feeds: feeds.length,
        feeds_failed: xmls.filter((x) => !x.xml).length,
        items: deduped.length,
        with_content: totalWithContent,
        with_image: totalWithImage,
        with_video: totalWithVideo,
        category_counts,
        videos,
        chained,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : JSON.stringify(err);
    console.error('news-sync-articles failed', message, err);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
