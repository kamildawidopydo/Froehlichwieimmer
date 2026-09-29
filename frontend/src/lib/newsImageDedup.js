/**
 * Session 94 · News-Bild-Deduplikation (Client-seitig, robust).
 *
 * Zweck: Innerhalb einer Renderpage (`/news`) soll dasselbe Artikelbild nicht
 * mehrfach erscheinen. Der Algorithmus arbeitet nicht-mutierend, iteriert die
 * Artikelgruppen in visueller Reihenfolge und setzt für jeden Duplicate-Hit
 * `image_url = null`, damit die bestehenden Sub-Komponenten (HeroTopNews,
 * FondsEtfTopNews, WeitereBeitraege, AnlegerInteressant) ohne Änderung auf
 * ihren neutralen Kategorie-Fallback in `SafeNewsImage` zurückfallen.
 *
 * Robuste Normalisierung — verhindert False-Negatives durch:
 *   1. Unsplash Photo-IDs (`photo-XXXXXXXXXXXXX`) — stabile Assetkennung,
 *      unabhängig von Größenvarianten `?w=...` oder Tracking-Parametern.
 *   2. Imgix/Cloudinary/SafeNewsImage-Proxy-URLs — extrahiert die zugrunde
 *      liegende Source-URL via URL-Query-Parameter `url=` bzw. Pfadsegment.
 *   3. Fallback: Full-URL nach Strip von Query/Hash, lowercase.
 *
 * Alles rein & deterministisch.
 */

const RE_UNSPLASH_PHOTO_ID = /photo-([0-9a-f]{10,})/i;
const RE_UNSPLASH_HOST = /images\.unsplash\.com/i;

const extractStableAssetKey = (url) => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Fall 1: SafeNewsImage-/CDN-Proxy — Query-Param `url=` enthält das Original.
  try {
    const parsed = new URL(trimmed, 'https://placeholder.local');
    const inner = parsed.searchParams.get('url')
      || parsed.searchParams.get('src')
      || parsed.searchParams.get('image');
    if (inner) {
      const rec = extractStableAssetKey(inner);
      if (rec) return rec;
    }
  } catch (_) { /* not a valid URL */ }

  // Fall 2: Unsplash Photo-ID.
  const m = trimmed.match(RE_UNSPLASH_PHOTO_ID);
  if (m) return `unsplash:${m[1].toLowerCase()}`;

  // Fall 3: Fallback — strip query/hash/trailing slash, lowercase.
  const noQuery = trimmed.split('?')[0].split('#')[0].replace(/\/+$/, '').toLowerCase();
  return noQuery || null;
};

export const normalizeImageUrl = (url) => extractStableAssetKey(url);

/**
 * @param {Array<Array<object>|null|undefined>} arrayGroups — Artikelgruppen in
 *   visueller Reihenfolge auf der Page.
 * @returns {Array<Array<object>>} — Kopien der Arrays mit `image_url=null` für
 *   Duplicate-Treffer. Original bleibt unangetastet.
 */
export const dedupeArticleImages = (arrayGroups) => {
  const seen = new Set();
  return arrayGroups.map((group) => {
    if (!Array.isArray(group)) return group;
    return group.map((article) => {
      if (!article || typeof article !== 'object') return article;
      const key = extractStableAssetKey(article.image_url);
      if (!key) return article;
      if (seen.has(key)) {
        return { ...article, image_url: null };
      }
      seen.add(key);
      return article;
    });
  });
};
