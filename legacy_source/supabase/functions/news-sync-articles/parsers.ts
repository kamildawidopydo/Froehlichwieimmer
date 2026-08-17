// RSS + HTML extractors used by `news-sync-articles`.

import { buildArticleSlug } from './slugify.ts';
import type { FeedSource, NewsProvider } from './feeds.ts';

export interface RssItem {
  guid: string;
  slug: string;
  title: string;
  summary: string | null;
  image_url: string | null;
  source_url: string;
  source_provider: NewsProvider;
  category: FeedSource['category'];
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

const stripCdata = (raw: string | null | undefined): string => {
  if (!raw) return '';
  const m = raw.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  const inner = m ? m[1] : raw;
  return decodeEntities(inner.replace(/<[^>]+>/g, '')).trim();
};

const upgradeWsoImageSize = (url: string): string => {
  if (!url.includes('wallstreet-online.de/_media/')) return url;
  return url.replace(/\/size_\d+\//g, '/size_1280/');
};

const collapseDuplicateSlashes = (url: string): string =>
  url.replace(/([^:]\/)\/+/g, '$1');

export const normalizeImageUrl = (
  raw: string | null | undefined,
  baseUrl: string,
): string | null => {
  if (!raw) return null;
  const trimmed = decodeEntities(raw).trim();
  if (!trimmed || trimmed.startsWith('data:')) return null;
  if (trimmed.startsWith('//')) {
    return upgradeWsoImageSize(collapseDuplicateSlashes(`https:${trimmed}`));
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return upgradeWsoImageSize(collapseDuplicateSlashes(trimmed));
  }
  try {
    return upgradeWsoImageSize(
      collapseDuplicateSlashes(new URL(trimmed, baseUrl).href),
    );
  } catch {
    return null;
  }
};

const isWallstreetPromoImage = (url: string): boolean => {
  const u = url.toLowerCase();
  if (!u.includes('wallstreet-online.de/_media/')) return false;
  return (
    u.includes('/_media/3278/akt/') ||
    u.includes('aktienreport-') ||
    !/\/size_\d+\//.test(u)
  );
};

const isChartOrLogoImage = (url: string | null): boolean => {
  if (!url) return true;
  const u = url.toLowerCase();
  return (
    isWallstreetPromoImage(u) ||
    u.includes('newstool.de/') ||
    u.includes('xtb.com/') ||
    u.includes('fondscheck.de/') ||
    u.includes('/chart-') ||
    u.includes('chart-klein') ||
    u.includes('nicht-boersennotiert-chart') ||
    u.includes('chart.') ||
    u.includes('/fb.png') ||
    u.includes('logo-rss') ||
    u.includes('favicon') ||
    u.includes('social-default.jpg') ||
    u.includes('bbk-twitter-card') ||
    u.includes('heading-bild-data') ||
    u.includes('logo-data') ||
    u.includes('place holder') ||
    u.includes('place%20holder') ||
    u.includes('press conference place') ||
    u.includes('statistiken-subsite') ||
    u.includes('webservice.jpg') ||
    u.endsWith('.pdf') ||
    u.includes('-download.pdf') ||
    u.endsWith('.svg') ||
    (u.includes('finanznachrichten.de') && u.includes('chart'))
  );
};

const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif)(\?|#|$)/i;

export const isUsableArticleImage = (url: string | null | undefined): boolean => {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return false;
  }
  if (collapseDuplicateSlashes(trimmed) !== trimmed) return false;
  if (!IMAGE_EXT_RE.test(trimmed)) return false;
  return !isChartOrLogoImage(trimmed);
};

export const pickFirstUsableImage = (
  candidates: Array<string | null | undefined>,
  baseUrl: string,
): string | null => {
  for (const candidate of candidates) {
    const normalized = candidate ? normalizeImageUrl(candidate, baseUrl) : null;
    if (normalized && isUsableArticleImage(normalized)) {
      return normalized;
    }
  }
  return null;
};

const matchTag = (block: string, tag: string): string | null => {
  const re = new RegExp(
    `<(?:[a-zA-Z]+:)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:[a-zA-Z]+:)?${tag}>`,
    'i',
  );
  const m = block.match(re);
  return m ? m[1] : null;
};

const matchAttr = (block: string, tag: string, attr: string): string | null => {
  const re = new RegExp(
    `<(?:[a-zA-Z]+:)?${tag}\\b[^>]*\\b${attr}=["']([^"']+)["'][^>]*\\/?>`,
    'i',
  );
  const m = block.match(re);
  return m ? m[1] : null;
};

export const parseRssItems = (
  xml: string,
  feed: Pick<FeedSource, 'category' | 'provider'>,
): RssItem[] => {
  if (!xml || typeof xml !== 'string') return [];
  const itemRe = /<item\b[\s\S]*?<\/item>/gi;
  const items: RssItem[] = [];

  for (const match of xml.matchAll(itemRe)) {
    const block = match[0];

    const rawTitle = matchTag(block, 'title');
    const rawLink = matchTag(block, 'link');
    const rawGuid = matchTag(block, 'guid');
    const rawDesc = matchTag(block, 'description');
    const rawDate = matchTag(block, 'pubDate');

    const image =
      matchAttr(block, 'content', 'url') ??
      matchAttr(block, 'thumbnail', 'url') ??
      matchAttr(block, 'enclosure', 'url') ??
      null;

    const title = stripCdata(rawTitle);
    const link = stripCdata(rawLink);
    const guid = stripCdata(rawGuid) || link;
    const summary = stripCdata(rawDesc) || null;
    const publishedRaw = rawDate ? new Date(stripCdata(rawDate)) : new Date();
    const publishedAt = Number.isNaN(publishedRaw.getTime())
      ? new Date().toISOString()
      : publishedRaw.toISOString();

    if (!title || !link || !guid) continue;
    if (link.toLowerCase().endsWith('.pdf')) continue;

    const image_url = image
      ? pickFirstUsableImage([image], link)
      : null;

    items.push({
      guid,
      slug: buildArticleSlug(title, guid),
      title,
      summary,
      image_url,
      source_url: link,
      source_provider: feed.provider,
      category: feed.category,
      published_at: publishedAt,
      language: 'de',
    });
  }

  return items;
};

const FETCH_HEADERS: HeadersInit = {
  'User-Agent':
    'Mozilla/5.0 (compatible; kapitalmitte-newsbot/1.0; +https://kapitalmitte.app)',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
};

const stripTags = (html: string): string =>
  decodeEntities(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim();

const extractParagraphs = (html: string, minLen = 30): string[] => {
  const out: string[] = [];
  const re = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  for (const m of html.matchAll(re)) {
    const text = stripTags(m[1]);
    if (text.length >= minLen) out.push(text);
  }
  return out;
};

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
      // ignore
    }
  }
  return out;
};

const normalizeJsonLdImageUrl = (raw: string): string => {
  const trimmed = decodeEntities(raw).trim();
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  return trimmed;
};

const readImageFromJsonLdNode = (node: Record<string, unknown>): string | null => {
  const image = node.image;
  if (typeof image === 'string' && image.trim().length > 0) {
    return normalizeJsonLdImageUrl(image);
  }
  if (image && typeof image === 'object' && !Array.isArray(image)) {
    const url = (image as Record<string, unknown>).url;
    if (typeof url === 'string' && url.trim().length > 0) {
      return normalizeJsonLdImageUrl(url);
    }
  }
  if (Array.isArray(image)) {
    for (const entry of image) {
      if (typeof entry === 'string' && entry.trim().length > 0) {
        return normalizeJsonLdImageUrl(entry);
      }
      if (entry && typeof entry === 'object') {
        const url = (entry as Record<string, unknown>).url;
        if (typeof url === 'string' && url.trim().length > 0) {
          return normalizeJsonLdImageUrl(url);
        }
      }
    }
  }
  return null;
};

const pickArticleBodyFromJsonLd = (nodes: Array<Record<string, unknown>>): string | null => {
  const readBody = (node: Record<string, unknown>): string | null => {
    const type = String(node['@type'] ?? '');
    if (type === 'NewsArticle' || type === 'Article' || type === 'WebPage') {
      const body = node.articleBody ?? node.description;
      if (typeof body === 'string' && body.trim().length > 0) {
        return decodeEntities(body).replace(/\s+/g, ' ').trim();
      }
    }
    return null;
  };

  for (const node of nodes) {
    const direct = readBody(node);
    if (direct) return direct;
    const graph = node['@graph'];
    if (Array.isArray(graph)) {
      for (const child of graph) {
        if (child && typeof child === 'object') {
          const fromGraph = readBody(child as Record<string, unknown>);
          if (fromGraph) return fromGraph;
        }
      }
    }
  }
  return null;
};

const pickImageFromJsonLd = (nodes: Array<Record<string, unknown>>): string | null => {
  const readImage = (node: Record<string, unknown>): string | null => {
    const type = String(node['@type'] ?? '');
    if (type === 'NewsArticle' || type === 'Article' || type === 'WebPage') {
      return readImageFromJsonLdNode(node);
    }
    return null;
  };

  for (const node of nodes) {
    const direct = readImage(node);
    if (direct) return direct;
    const graph = node['@graph'];
    if (Array.isArray(graph)) {
      for (const child of graph) {
        if (child && typeof child === 'object') {
          const fromGraph = readImage(child as Record<string, unknown>);
          if (fromGraph) return fromGraph;
        }
      }
    }
  }
  return null;
};

const pickBestOgImages = (html: string): string | null => {
  const matches = Array.from(
    html.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/gi),
  ).map((m) => decodeEntities(m[1]).trim());
  for (const url of matches) {
    if (!isChartOrLogoImage(url)) return url;
  }
  return null;
};

const collectWallstreetMediaImages = (html: string): string[] => {
  const found = new Set<string>();
  for (const match of html.matchAll(
    /(?:https?:)?\/\/assets\.wallstreet-online\.de\/_media\/[^"'\s)]+/gi,
  )) {
    let url = match[0].startsWith('//') ? `https:${match[0]}` : match[0];
    url = upgradeWsoImageSize(url);
    found.add(url);
  }
  return Array.from(found).sort((a, b) => {
    const score = (value: string) =>
      value.includes('size_1280') ? 3 : value.includes('size_645') ? 2 : 1;
    return score(b) - score(a);
  });
};

const pickFinanznachrichtenBodyImages = (html: string, pageUrl: string): string[] => {
  const out: string[] = [];
  const bodyMatch = html.match(
    /<(?:div|section)[^>]*(?:id=["']artikelText(?:Puffer)?["']|itemprop=["']articleBody["'])[^>]*>([\s\S]*?)<\/(?:div|section)>/i,
  );
  const haystack = bodyMatch?.[1] ?? '';
  for (const match of haystack.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
    const normalized = normalizeImageUrl(match[1], pageUrl);
    if (normalized) out.push(normalized);
  }
  return out;
};

const pickEcbFigureImage = (html: string, pageUrl: string): string | null => {
  for (const match of html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)) {
    const src = match[1];
    if (!/ecb\.pr\d+\.[a-z]{2}_img\d+\.png/i.test(src)) continue;
    const normalized = normalizeImageUrl(src, pageUrl);
    if (normalized && isUsableArticleImage(normalized)) {
      return normalized;
    }
  }
  return null;
};

const pickBundesbankArticleImage = (
  html: string,
  pageUrl: string,
): string | null => {
  const articleMatch = html.match(
    /<h1[^>]*main__headline[^>]*>[\s\S]*?<\/main>/i,
  );
  if (!articleMatch) return null;

  let bestUrl: string | null = null;
  let bestWidth = 0;

  for (const match of articleMatch[0].matchAll(
    /data-cm-responsive-image="(\{[^"]+\})"/g,
  )) {
    try {
      const json = JSON.parse(match[1].replace(/&quot;/g, '"')) as {
        linksForWidth?: Record<string, string>;
      };
      const blocks = Array.isArray(json) ? json : [json];
      for (const block of blocks) {
        const links = block?.linksForWidth ?? {};
        for (const [width, path] of Object.entries(links)) {
          const numericWidth = Number(width);
          if (
            numericWidth > bestWidth &&
            typeof path === 'string' &&
            path.includes('/resource/image/')
          ) {
            const normalized = normalizeImageUrl(path, pageUrl);
            if (normalized && isUsableArticleImage(normalized)) {
              bestWidth = numericWidth;
              bestUrl = normalized;
            }
          }
        }
      }
    } catch {
      // ignore malformed JSON
    }
  }

  return bestUrl;
};

const pickHeroImageFromHtml = (html: string, host: string): string | null => {
  const articleMatch = html.match(/<article\b[\s\S]*?<\/article>/i);
  const haystack = articleMatch ? articleMatch[0] : html;
  const hostPattern = host.replace(/\./g, '\\.');
  const imgRe = new RegExp(
    `<img\\b[^>]*\\bsrc=["'](https?:\\/\\/[^"']*${hostPattern}[^"']+)["'][^>]*>`,
    'i',
  );
  const imgMatch = haystack.match(imgRe);
  if (imgMatch && !isChartOrLogoImage(imgMatch[1])) {
    return decodeEntities(imgMatch[1]).trim();
  }
  const wsoImg = haystack.match(
    /<img\b[^>]*\bsrc=["'](https?:\/\/assets\.wallstreet-online\.de\/_media\/[^"']+)["'][^>]*>/i,
  );
  return wsoImg ? decodeEntities(wsoImg[1]).trim() : null;
};

const pickVideoObject = (
  nodes: Array<Record<string, unknown>>,
): Record<string, unknown> | null => {
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

const readVideoThumbnail = (
  videoObj: Record<string, unknown> | null,
): string | null => {
  if (!videoObj) return null;
  const thumb = videoObj.thumbnailUrl;
  if (typeof thumb === 'string' && thumb.trim().length > 0) {
    return decodeEntities(thumb).trim();
  }
  if (thumb && typeof thumb === 'object' && !Array.isArray(thumb)) {
    const url = (thumb as Record<string, unknown>).url;
    if (typeof url === 'string' && url.trim().length > 0) {
      return decodeEntities(url).trim();
    }
  }
  return null;
};

const extractVideoFromHtml = (
  html: string,
  jsonLd: Array<Record<string, unknown>>,
): {
  video_embed_url: string | null;
  video_thumbnail_url: string | null;
  video_source_url: string | null;
} => {
  const videoObj = pickVideoObject(jsonLd);
  const contentUrl =
    typeof videoObj?.contentUrl === 'string'
      ? decodeEntities(videoObj.contentUrl).trim()
      : null;
  const jsonEmbedUrl =
    typeof videoObj?.embedUrl === 'string'
      ? decodeEntities(videoObj.embedUrl).trim()
      : null;
  const embedPath =
    html.match(/https?:\/\/(?:de\.|www\.)?euronews\.com\/embed\/\d+/i)?.[0] ??
    null;

  const video_embed_url =
    contentUrl ??
    jsonEmbedUrl ??
    embedPath ??
    matchMetaContent(html, 'property', 'og:video:url') ??
    matchMetaContent(html, 'property', 'og:video') ??
    null;

  const video_source_url =
    html.match(
      /href=["'](https?:\/\/de\.euronews\.com\/video\/\d{4}\/[^"']+)["']/i,
    )?.[1] ?? null;

  return {
    video_embed_url,
    video_thumbnail_url: readVideoThumbnail(videoObj),
    video_source_url: video_source_url
      ? decodeEntities(video_source_url).trim()
      : null,
  };
};

const findCanonicalUrl = (html: string): string | null => {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
    ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  return m ? decodeEntities(m[1]).trim() : null;
};

const findWallstreetFullArticleUrl = (html: string): string | null => {
  const withLabel = html.match(
    /href=["'](https?:\/\/www\.wallstreet-online\.de\/nachricht\/[^"']+)["'][^>]*>[^<]*(?:vollst[aä]ndigen|Artikel lesen)/i,
  );
  if (withLabel) return decodeEntities(withLabel[1]).trim();

  const anyNachricht = html.match(
    /href=["'](https?:\/\/www\.wallstreet-online\.de\/nachricht\/\d+[^"']*)["']/i,
  );
  return anyNachricht ? decodeEntities(anyNachricht[1]).trim() : null;
};

const detectProvider = (url: string): NewsProvider => {
  const u = url.toLowerCase();
  if (u.includes('euronews.com')) return 'euronews';
  if (u.includes('finanznachrichten.de')) return 'finanznachrichten';
  if (u.includes('wallstreet-online.de')) return 'finanznachrichten';
  if (u.includes('ecb.europa.eu')) return 'ecb';
  if (u.includes('bundesbank.de')) return 'bundesbank';
  return 'euronews';
};

const pickProviderImage = (
  html: string,
  url: string,
  jsonLd: Array<Record<string, unknown>>,
): string | null => {
  const provider = detectProvider(url);
  const og = pickBestOgImages(html);
  const twitter = matchMetaContent(html, 'name', 'twitter:image');
  const jsonImg = pickImageFromJsonLd(jsonLd);
  const wsoImgs = collectWallstreetMediaImages(html);
  const fnBodyImgs = pickFinanznachrichtenBodyImages(html, url);
  const hero = pickHeroImageFromHtml(html, new URL(url).hostname);

  switch (provider) {
    case 'finanznachrichten':
      return pickFirstUsableImage(
        [...wsoImgs, ...fnBodyImgs, og, jsonImg, twitter, hero],
        url,
      );
    case 'ecb':
      return pickFirstUsableImage(
        [pickEcbFigureImage(html, url), og, twitter, jsonImg],
        url,
      );
    case 'bundesbank':
      return pickFirstUsableImage(
        [pickBundesbankArticleImage(html, url)],
        url,
      );
    default:
      return pickFirstUsableImage([og, twitter, jsonImg, hero], url);
  }
};

const extractFromHtml = (
  html: string,
  url: string,
): Omit<ExtractedArticle, 'content'> & { paragraphs: string[]; jsonBody: string | null } => {
  const provider = detectProvider(url);
  const jsonLd = parseJsonLdCandidates(html);
  const jsonLdBody = pickArticleBodyFromJsonLd(jsonLd);

  let haystack = html;
  if (provider === 'finanznachrichten') {
    const bodyMatch = html.match(
      /<(?:div|section)[^>]*(?:id=["']artikelText["']|itemprop=["']articleBody["'])[^>]*>([\s\S]*?)<\/(?:div|section)>/i,
    );
    if (bodyMatch) haystack = bodyMatch[1];
  } else if (provider === 'ecb') {
    const pressMatch = html.match(
      /<div[^>]*class=["'][^"']*ecb-pressContent[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/i,
    ) ?? html.match(/<main\b[\s\S]*?<\/main>/i);
    if (pressMatch) haystack = pressMatch[0];
  } else if (provider === 'bundesbank') {
    const mainMatch = html.match(/<main\b[\s\S]*?<\/main>/i)
      ?? html.match(/<article\b[\s\S]*?<\/article>/i);
    if (mainMatch) haystack = mainMatch[0];
  } else {
    const articleMatch = html.match(/<article\b[\s\S]*?<\/article>/i);
    if (articleMatch) haystack = articleMatch[0];
  }

  const paragraphs = extractParagraphs(haystack, provider === 'ecb' ? 20 : 30);

  const image = pickProviderImage(html, url, jsonLd);

  const video = extractVideoFromHtml(html, jsonLd);

  return {
    paragraphs,
    jsonBody: jsonLdBody,
    image,
    ...video,
  };
};

const emptyExtracted = (): ExtractedArticle => ({
  content: null,
  image: null,
  video_embed_url: null,
  video_thumbnail_url: null,
  video_source_url: null,
});

export interface ExtractedArticle {
  content: string | null;
  image: string | null;
  video_embed_url: string | null;
  video_thumbnail_url: string | null;
  video_source_url: string | null;
}

const fetchHtml = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url, { headers: FETCH_HEADERS });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
};

export const extractArticleData = async (
  url: string,
): Promise<ExtractedArticle> => {
  try {
    let html = await fetchHtml(url);
    if (!html) return emptyExtracted();

    let canonical = findCanonicalUrl(html) ?? url;
    if (canonical !== url) {
      const canonicalHtml = await fetchHtml(canonical);
      if (canonicalHtml) {
        html = canonicalHtml;
        url = canonical;
      }
    }

    if (detectProvider(url) === 'finanznachrichten') {
      const fullUrl = findWallstreetFullArticleUrl(html);
      if (fullUrl) {
        const fullHtml = await fetchHtml(fullUrl);
        if (fullHtml) {
          html = fullHtml;
          url = fullUrl;
        }
      }
    }

    const parsed = extractFromHtml(html, url);
    const content =
      parsed.paragraphs.length > 0
        ? parsed.paragraphs.join('\n\n')
        : parsed.jsonBody ??
          matchMetaContent(html, 'property', 'og:description') ??
          matchMetaContent(html, 'name', 'description');

    return {
      content,
      image: parsed.image,
      video_embed_url: parsed.video_embed_url,
      video_thumbnail_url: parsed.video_thumbnail_url,
      video_source_url: parsed.video_source_url,
    };
  } catch (err) {
    console.warn('extractArticleData failed for', url, err);
    return emptyExtracted();
  }
};
