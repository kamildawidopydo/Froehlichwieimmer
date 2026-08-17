import { buildVideoSlug } from './slugify.ts';

export interface VideoRow {
  guid: string;
  slug: string;
  title: string;
  summary: string | null;
  thumbnail_url: string | null;
  embed_url: string | null;
  source_url: string;
  duration_seconds: number | null;
  show_label: string | null;
  published_at: string;
  language: 'de';
}

const decodeEntities = (raw: string): string =>
  raw
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code) || 0),
    );

const stripTags = (html: string): string =>
  decodeEntities(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim();

const matchMetaContent = (
  html: string,
  attr: 'property' | 'name',
  value: string,
): string | null => {
  const re = new RegExp(
    `<meta[^>]+${attr}=["']${value}["'][^>]*content=["']([^"']+)["'][^>]*\\/?>`,
    'i',
  );
  const a = html.match(re);
  if (a) return decodeEntities(a[1]).trim();
  const reFlipped = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${value}["'][^>]*\\/?>`,
    'i',
  );
  const b = html.match(reFlipped);
  return b ? decodeEntities(b[1]).trim() : null;
};

const parseDurationIso8601 = (raw: string | null | undefined): number | null => {
  if (!raw) return null;
  const m = raw.match(
    /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)(?:\.\d+)?S)?$/i,
  );
  if (!m) return null;
  const days = Number(m[1] ?? 0);
  const hours = Number(m[2] ?? 0);
  const minutes = Number(m[3] ?? 0);
  const seconds = Number(m[4] ?? 0);
  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
};

const normalizePublishedAt = (raw: string | null | undefined): string => {
  if (!raw) return new Date().toISOString();
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

const parseJsonLdCandidates = (html: string): Array<Record<string, unknown>> => {
  const scripts = Array.from(
    html.matchAll(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ).map((m) => m[1]?.trim()).filter(Boolean) as string[];

  const out: Array<Record<string, unknown>> = [];
  for (const raw of scripts) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === 'object') out.push(item as Record<string, unknown>);
        }
      } else if (parsed && typeof parsed === 'object') {
        out.push(parsed as Record<string, unknown>);
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }
  return out;
};

const pickVideoObject = (nodes: Array<Record<string, unknown>>): Record<string, unknown> | null => {
  for (const node of nodes) {
    const type = String(node['@type'] ?? '');
    if (type === 'VideoObject') return node;
    const graph = node['@graph'];
    if (Array.isArray(graph)) {
      for (const child of graph) {
        if (
          child &&
          typeof child === 'object' &&
          String((child as Record<string, unknown>)['@type'] ?? '') === 'VideoObject'
        ) {
          return child as Record<string, unknown>;
        }
      }
    }
  }
  return null;
};

const showLabelFromPath = (url: string): string | null => {
  // Example: /video/2026/05/07/nachrichten-des-tages-7-mai-2026-abendausgabe
  const m = url.match(/\/video\/\d{4}\/\d{2}\/\d{2}\/([^/?#]+)/i);
  if (!m) return null;
  const slug = decodeURIComponent(m[1]);
  if (!slug) return null;
  if (slug.includes('nachrichten-des-tages')) return 'Top News Stories Today';
  if (slug.includes('no-comment')) return 'No Comment';
  if (slug.includes('the-ring')) return 'The Ring';
  return null;
};

export const extractVideoLinks = (listingHtml: string): string[] => {
  const matches = Array.from(
    listingHtml.matchAll(/href=["'](\/video\/\d{4}\/\d{2}\/\d{2}\/[^"'?#]+)["']/gi),
  ).map((m) => m[1]);
  const absolute = matches.map((path) => `https://de.euronews.com${path}`);
  return Array.from(new Set(absolute));
};

export const extractVideoDetail = async (
  url: string,
  html: string,
): Promise<VideoRow | null> => {
  const title =
    matchMetaContent(html, 'property', 'og:title') ??
    stripTags((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '')) ??
    '';
  if (!title) return null;

  const summary =
    matchMetaContent(html, 'property', 'og:description') ??
    matchMetaContent(html, 'name', 'description') ??
    null;

  const thumbnail =
    matchMetaContent(html, 'property', 'og:image') ??
    matchMetaContent(html, 'name', 'twitter:image') ??
    null;

  const jsonLdNodes = parseJsonLdCandidates(html);
  const videoObj = pickVideoObject(jsonLdNodes);
  const contentUrl = typeof videoObj?.contentUrl === 'string' ? videoObj.contentUrl : null;
  const embedUrl = typeof videoObj?.embedUrl === 'string' ? videoObj.embedUrl : null;
  const embed =
    // Prefer direct stream/content URL when available. This lets the frontend
    // use a native <video> player when iframe embedding is blocked.
    contentUrl ??
    embedUrl ??
    matchMetaContent(html, 'property', 'og:video:url') ??
    matchMetaContent(html, 'property', 'og:video') ??
    null;

  const durationSeconds =
    parseDurationIso8601(
      (typeof videoObj?.duration === 'string' ? videoObj.duration : null) ??
      (html.match(/itemprop=["']duration["'][^>]*content=["']([^"']+)/i)?.[1] ?? null),
    );

  const publishedAt = normalizePublishedAt(
    (typeof videoObj?.datePublished === 'string' ? videoObj.datePublished : null) ??
      matchMetaContent(html, 'property', 'article:published_time'),
  );

  const guid = url;
  return {
    guid,
    slug: buildVideoSlug(title, guid),
    title,
    summary,
    thumbnail_url: thumbnail,
    embed_url: embed,
    source_url: url,
    duration_seconds: durationSeconds,
    show_label: showLabelFromPath(url),
    published_at: publishedAt,
    language: 'de',
  };
};
