/**
 * Session 94 · News-Bild- & Artikel-Deduplikation (endgültige Version).
 *
 * Zwei Dedup-Achsen in einer gemeinsamen Pipeline:
 *
 *   1. Article-ID / slug — verhindert, dass derselbe Artikel in mehreren
 *      Backend-Sektionen (z. B. `top` + `overview`) mit demselben Bild
 *      erneut erscheint. Dedup-Priorität: `id > slug > (title|source_url)`.
 *
 *   2. Image-Key — stabiler Bildschlüssel unabhängig von URL-Varianten:
 *        a) explizite Asset-Kennung im Article-Objekt: `image_asset_id`,
 *           `image_id`, `media_id`
 *        b) Unsplash Photo-ID (`photo-<hex>`)
 *        c) URL innerhalb eines Proxy-Queries (`?url=`, `?src=`, `?image=`)
 *        d) Full-URL nach Strip von Query/Hash, lowercase
 *
 * Beide Sets werden gemeinsam in der visuellen Renderreihenfolge geführt.
 * Bei Duplikat-Treffer setzt der Reducer `image_url = null` — die
 * Sub-Komponente rendert dann ihren neutralen Kategorie-Fallback.
 *
 * Rein & deterministisch, mutiert keine Eingaben.
 */

const RE_UNSPLASH_PHOTO_ID = /photo-([0-9a-f]{10,})/i;

const _articleIdentityKey = (a) => {
  if (!a || typeof a !== 'object') return null;
  return a.id || a.slug || a.article_id
    || (a.source_url && a.title ? `${a.source_url}::${a.title}` : null)
    || a.title
    || null;
};

const _imageKey = (article) => {
  if (!article) return null;
  // (a) explizite Asset-Kennung
  const explicit = article.image_asset_id || article.image_id || article.media_id;
  if (explicit) return `asset:${String(explicit).toLowerCase()}`;
  const url = article.image_url;
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // (c) Proxy-Query mit eingebetteter Original-URL
  try {
    const p = new URL(trimmed, 'https://placeholder.local');
    const inner = p.searchParams.get('url') || p.searchParams.get('src') || p.searchParams.get('image');
    if (inner) {
      const sub = _imageKey({ image_url: inner });
      if (sub) return sub;
    }
  } catch (_) { /* not a URL */ }

  // (b) Unsplash Photo-ID
  const m = trimmed.match(RE_UNSPLASH_PHOTO_ID);
  if (m) return `unsplash:${m[1].toLowerCase()}`;

  // (d) URL-Fallback
  const noQuery = trimmed.split('?')[0].split('#')[0].replace(/\/+$/, '').toLowerCase();
  return noQuery ? `url:${noQuery}` : null;
};

export const normalizeImageUrl = (url) => _imageKey({ image_url: url });

/**
 * Zentrale Pipeline. Erwartet Artikelgruppen in visueller Renderreihenfolge.
 *
 * @param {Array<{section: string, articles: Array<object>}>} sections
 * @param {{debug?: boolean}} [opts]
 * @returns {{
 *   groups: Array<Array<object>>,
 *   audit: Array<{section, article_id, title, original_image_url, image_key, article_key, duplicate: boolean, reason: string|null}>
 * }}
 */
export const dedupeArticlesAcrossSections = (sections, opts = {}) => {
  const usedArticleKeys = new Set();
  const usedImageKeys = new Set();
  const audit = [];
  const groups = sections.map(({ section, articles }) => {
    if (!Array.isArray(articles)) return articles;
    return articles.map((original) => {
      const artKey = _articleIdentityKey(original);
      const imgKey = _imageKey(original);
      let duplicate = false;
      let reason = null;
      if (artKey && usedArticleKeys.has(artKey)) {
        duplicate = true; reason = 'duplicate_article';
      } else if (imgKey && usedImageKeys.has(imgKey)) {
        duplicate = true; reason = 'duplicate_image';
      }
      if (artKey) usedArticleKeys.add(artKey);
      if (imgKey && !duplicate) usedImageKeys.add(imgKey);
      audit.push({
        section, article_id: original?.id ?? null,
        title: (original?.title || '').slice(0, 80),
        original_image_url: original?.image_url ?? null,
        image_key: imgKey, article_key: artKey,
        duplicate, reason,
      });
      if (duplicate) {
        return { ...original, image_url: null };
      }
      return original;
    });
  });
  if (opts.debug && typeof window !== 'undefined' && typeof window.console !== 'undefined') {
    /* eslint-disable no-console */
    console.info('[news-dedup] audit', audit);
    /* eslint-enable no-console */
  }
  return { groups, audit };
};

/** Backwards-kompat für existierende Aufrufer. */
export const dedupeArticleImages = (arrayGroups) => {
  const named = arrayGroups.map((articles, i) => ({ section: `group_${i}`, articles }));
  return dedupeArticlesAcrossSections(named).groups;
};
