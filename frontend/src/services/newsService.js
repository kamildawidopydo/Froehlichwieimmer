/**
 * News-Service — Session 82.85: vollständige Cutover von Supabase auf FastAPI/Mongo.
 *
 * Backend-Endpunkte (alle unter `/api/content/news`):
 *   - `GET  /`                    Live-Feed (48h Freshness, server-side)
 *   - `GET  /{slug}`              Detail
 *   - `POST /{slug}/view`         View-Counter (fire-and-forget)
 *   - `GET  /list`                Paginierte Liste (category/search/tab)
 *   - `GET  /related`             Verwandte Artikel (Kategorie)
 *   - `GET  /search-suggestions`  Autocomplete
 *   - `GET  /feed`                Öffentlicher Feed (Edge-Function-Ersatz)
 *   - `GET  /videos`, `/video/:slug`, `POST /video/:slug/view`, `/related-videos`
 *
 * Keine Supabase-Imports mehr. Keine Fake-/Synthetic-Daten.
 */

import { getApiBase } from '@/lib/apiBase';

// Session 80.27 — Client-seitige 48h-Freshness (Backup, falls Server-Feeds
// veraltete Einträge liefern). Detail-Aufrufe sind explizit nicht betroffen.
const CURRENT_FEED_MAX_AGE_MS = 48 * 60 * 60 * 1000;
const DEFAULT_LIMIT = 20;

const isFresh = (item) => {
  const pa = item?.published_at;
  if (!pa) return false;
  const ts = new Date(pa).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= CURRENT_FEED_MAX_AGE_MS;
};

export const filterFreshFeed = (items) =>
  (Array.isArray(items) ? items : [])
    .filter(isFresh)
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

const buildUrl = (path, params = {}) => {
  const base = getApiBase() || '';
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue;
    if (typeof v === 'string' && v.length === 0) continue;
    qs.append(k, String(v));
  }
  const query = qs.toString();
  return `${base}${path}${query ? `?${query}` : ''}`;
};

const fetchJson = async (url, { signal } = {}) => {
  const res = await fetch(url, { signal });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`news_api_${res.status}`);
  return await res.json();
};

// ---------------------------------------------------------------------------
// Artikel
// ---------------------------------------------------------------------------

/**
 * Paginierte Artikel-Liste. Signatur bleibt zu Supabase-Zeit 1:1 identisch.
 * @param {Object} params
 * @param {string} [params.category='all']  internal slug or 'all'
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
  const url = buildUrl('/api/content/news/list', {
    category: category && category !== 'all' ? category : null,
    search: trimmed || null,
    tab,
    limit,
    offset,
  });
  const payload = await fetchJson(url, { signal });
  const items = Array.isArray(payload?.items) ? payload.items : [];
  // 48h-Freshness auf reinen recent-Feed anwenden (bei search/popular NICHT,
  // um Nutzer-erwartete Ergebnisse nicht zu verstümmeln).
  const data = trimmed || tab === 'popular' ? items : filterFreshFeed(items);
  return { data, count: payload?.count ?? data.length };
}

export async function getArticleBySlug(slug, { signal } = {}) {
  // Session 80.23 — Detail-Endpoint bleibt unverändert (Mongo-native).
  const url = buildUrl(`/api/content/news/${encodeURIComponent(slug)}`);
  return await fetchJson(url, { signal });
}

export async function incrementArticleView(slug) {
  if (!slug) return;
  const url = buildUrl(`/api/content/news/${encodeURIComponent(slug)}/view`);
  try {
    await fetch(url, { method: 'POST', keepalive: true });
  } catch {
    // fire-and-forget — never block the article render
  }
}

export async function listRelatedArticles({
  category,
  excludeSlug,
  limit = 3,
  signal,
} = {}) {
  if (!category) return { data: [] };
  const url = buildUrl('/api/content/news/related', {
    category,
    exclude_slug: excludeSlug || null,
    limit,
  });
  const payload = await fetchJson(url, { signal });
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return { data: filterFreshFeed(items) };
}

// ---------------------------------------------------------------------------
// Videos (aktuell strukturell leer — kein Fake-Content)
// ---------------------------------------------------------------------------

export async function listVideos({
  search,
  tab = 'recent',
  limit = DEFAULT_LIMIT,
  offset = 0,
  signal,
} = {}) {
  const trimmed = (search ?? '').trim();
  const url = buildUrl('/api/content/news/videos', {
    search: trimmed || null,
    tab,
    limit,
    offset,
  });
  const payload = await fetchJson(url, { signal });
  return {
    data: Array.isArray(payload?.items) ? payload.items : [],
    count: payload?.count ?? 0,
  };
}

export async function getVideoBySlug(slug, { signal } = {}) {
  if (!slug) return null;
  const url = buildUrl(`/api/content/news/video/${encodeURIComponent(slug)}`);
  return await fetchJson(url, { signal });
}

export async function incrementVideoView(slug) {
  if (!slug) return;
  const url = buildUrl(`/api/content/news/video/${encodeURIComponent(slug)}/view`);
  try {
    await fetch(url, { method: 'POST', keepalive: true });
  } catch {
    // fire-and-forget
  }
}

export async function listRelatedVideos({
  showLabel,
  excludeSlug,
  limit = 6,
  signal,
} = {}) {
  const url = buildUrl('/api/content/news/related-videos', {
    show_label: showLabel || null,
    exclude_slug: excludeSlug || null,
    limit,
  });
  const payload = await fetchJson(url, { signal });
  return { data: Array.isArray(payload?.items) ? payload.items : [] };
}

// ---------------------------------------------------------------------------
// Öffentlicher Feed (Edge-Function-Ersatz)
// ---------------------------------------------------------------------------

export async function listPublicFeed({
  source = 'articles',
  category,
  search,
  tab = 'recent',
  limit = DEFAULT_LIMIT,
  offset = 0,
  signal,
} = {}) {
  const trimmed = (search ?? '').trim();
  const url = buildUrl('/api/content/news/feed', {
    source,
    category: category && category !== 'all' ? category : null,
    search: trimmed || null,
    tab,
    limit,
    offset,
  });
  const payload = await fetchJson(url, { signal });
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const freshData = source === 'videos' || trimmed || tab === 'popular'
    ? items
    : filterFreshFeed(items);
  return {
    data: freshData,
    count: payload?.count ?? freshData.length,
    cached: Boolean(payload?.cached),
  };
}

// ---------------------------------------------------------------------------
// Autocomplete
// ---------------------------------------------------------------------------

export async function listSearchSuggestions({
  query,
  category = 'all',
  limit = 6,
} = {}) {
  const trimmed = (query ?? '').trim();
  if (trimmed.length < 2) return { data: [] };
  const url = buildUrl('/api/content/news/search-suggestions', {
    q: trimmed,
    category,
    limit,
  });
  const payload = await fetchJson(url);
  return { data: Array.isArray(payload?.items) ? payload.items : [] };
}
