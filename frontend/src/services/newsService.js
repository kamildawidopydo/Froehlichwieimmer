// Supabase access layer for the Nachrichten module. All reads target
// `public.news_articles`; writes are restricted to the service role used by
// the Edge Function and are not exposed here.

import { supabase } from '@/lib/supabase';

const DEFAULT_LIMIT = 20;
const ARTICLE_COLUMNS =
  'id, slug, guid, title, summary, content, image_url, category, source_url, published_at, language, view_count, read_time_minutes, video_embed_url, video_thumbnail_url, video_source_url';
const VIDEO_COLUMNS =
  'id, slug, guid, title, summary, thumbnail_url, embed_url, source_url, duration_seconds, show_label, published_at, language, view_count';

const fuzzySearch = async ({
  source,
  query,
  category,
  tab,
  limit,
  offset,
}) => {
  const { data, error } = await supabase.rpc('news_fuzzy_search', {
    p_source: source,
    p_query: query,
    p_category: category ?? 'all',
    p_tab: tab ?? 'recent',
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  const payload = data ?? { data: [], count: 0 };
  return {
    data: payload.data ?? [],
    count: payload.count ?? null,
  };
};

/**
 * Paginated list with optional category, search and ordering.
 * @param {Object} params
 * @param {string} [params.category] - internal slug or 'all'
 * @param {string} [params.search]
 * @param {'recent'|'popular'} [params.tab='recent']
 * @param {number} [params.limit=20]
 * @param {number} [params.offset=0]
 * @param {AbortSignal} [params.signal]
 */
export async function listArticles({
  category,
  search,
  tab = 'recent',
  limit = DEFAULT_LIMIT,
  offset = 0,
  signal,
} = {}) {
  const trimmed = (search ?? '').trim();
  if (trimmed.length > 0) {
    return fuzzySearch({
      source: 'articles',
      query: trimmed,
      category,
      tab,
      limit,
      offset,
    });
  }

  let q = supabase
    .from('news_articles')
    .select(ARTICLE_COLUMNS, { count: 'exact' });

  if (category && category !== 'all') {
    q = q.eq('category', category);
  }

  if (tab === 'popular') {
    q = q
      .order('view_count', { ascending: false })
      .order('published_at', { ascending: false });
  } else {
    q = q.order('published_at', { ascending: false });
  }

  q = q.range(offset, offset + limit - 1);
  if (signal) q = q.abortSignal(signal);

  const { data, count, error } = await q;
  if (error) throw error;
  return { data: data ?? [], count: count ?? null };
}

export async function getArticleBySlug(slug, { signal } = {}) {
  let q = supabase
    .from('news_articles')
    .select(ARTICLE_COLUMNS)
    .eq('slug', slug)
    .maybeSingle();
  if (signal) q = q.abortSignal(signal);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? null;
}

export async function incrementArticleView(slug) {
  const { error } = await supabase.rpc('news_increment_view', { p_slug: slug });
  if (error) console.warn('news_increment_view failed', error.message);
}

export async function listVideos({
  search,
  tab = 'recent',
  limit = DEFAULT_LIMIT,
  offset = 0,
  signal,
} = {}) {
  const trimmed = (search ?? '').trim();
  if (trimmed.length > 0) {
    return fuzzySearch({
      source: 'videos',
      query: trimmed,
      tab,
      limit,
      offset,
    });
  }

  let q = supabase
    .from('news_videos')
    .select(VIDEO_COLUMNS, { count: 'exact' });

  if (tab === 'popular') {
    q = q
      .order('view_count', { ascending: false })
      .order('published_at', { ascending: false });
  } else {
    q = q.order('published_at', { ascending: false });
  }

  q = q.range(offset, offset + limit - 1);
  if (signal) q = q.abortSignal(signal);

  const { data, count, error } = await q;
  if (error) throw error;
  return { data: data ?? [], count: count ?? null };
}

export async function getVideoBySlug(slug, { signal } = {}) {
  let q = supabase
    .from('news_videos')
    .select(VIDEO_COLUMNS)
    .eq('slug', slug)
    .maybeSingle();
  if (signal) q = q.abortSignal(signal);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? null;
}

export async function incrementVideoView(slug) {
  const { error } = await supabase.rpc('news_increment_video_view', { p_slug: slug });
  if (error) console.warn('news_increment_video_view failed', error.message);
}

/**
 * Rate-limited + cached public list via Edge Function.
 * Falls back to direct PostgREST when the function is unavailable.
 */
export async function listPublicFeed({
  source = 'articles',
  category,
  search,
  tab = 'recent',
  limit = DEFAULT_LIMIT,
  offset = 0,
  signal,
} = {}) {
  const body = {
    source,
    category: category ?? 'all',
    search: (search ?? '').trim(),
    tab,
    limit,
    offset,
  };

  try {
    const { data, error } = await supabase.functions.invoke('news-public-feed', {
      body,
    });
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (error) throw error;
    if (data?.error === 'rate_limit_exceeded') {
      const err = new Error('Zu viele Anfragen. Bitte kurz warten.');
      err.code = 'RATE_LIMIT';
      err.retryAfter = data.retry_after_seconds;
      throw err;
    }
    if (data?.error) throw new Error(data.error);
    return {
      data: data?.data ?? [],
      count: data?.count ?? null,
      cached: Boolean(data?.cached),
    };
  } catch (err) {
    if (signal?.aborted) throw err;
    console.warn('news-public-feed fallback to direct query', err?.message ?? err);
    const fetchList = source === 'videos' ? listVideos : listArticles;
    const queryParams = source === 'videos'
      ? { search, tab }
      : { category, search, tab };
    const result = await fetchList({
      ...queryParams,
      limit,
      offset,
      signal,
    });
    return { ...result, cached: false };
  }
}

export async function listRelatedArticles({
  category,
  excludeSlug,
  limit = 3,
  signal,
} = {}) {
  if (!category) return { data: [] };
  let q = supabase
    .from('news_articles')
    .select(ARTICLE_COLUMNS)
    .eq('category', category)
    .order('published_at', { ascending: false })
    .limit(limit);
  if (excludeSlug) q = q.neq('slug', excludeSlug);
  if (signal) q = q.abortSignal(signal);
  const { data, error } = await q;
  if (error) throw error;
  return { data: data ?? [] };
}

export async function listRelatedVideos({
  showLabel,
  excludeSlug,
  limit = 6,
  signal,
} = {}) {
  let q = supabase
    .from('news_videos')
    .select(VIDEO_COLUMNS)
    .order('published_at', { ascending: false })
    .limit(limit);
  if (excludeSlug) q = q.neq('slug', excludeSlug);
  if (showLabel) q = q.eq('show_label', showLabel);
  if (signal) q = q.abortSignal(signal);
  const { data, error } = await q;
  if (error) throw error;
  return { data: data ?? [] };
}

/**
 * Autocomplete titles for the public search bar (pg_trgm + FTS).
 */
export async function listSearchSuggestions({
  query,
  category = 'all',
  limit = 6,
} = {}) {
  const trimmed = (query ?? '').trim();
  if (trimmed.length < 2) return { data: [] };

  const { data, error } = await supabase.rpc('news_search_suggestions', {
    p_query: trimmed,
    p_category: category,
    p_limit: limit,
  });
  if (error) throw error;
  return { data: data ?? [] };
}
