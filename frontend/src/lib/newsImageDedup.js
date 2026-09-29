/**
 * Session 94 · News-Bild-Deduplikation (Client-seitig).
 *
 * Zweck: Innerhalb einer Renderpage (`/news`) soll dasselbe Artikelbild nicht
 * mehrfach erscheinen. Der Algorithmus arbeitet nicht-mutierend, iteriert die
 * Artikelgruppen in visueller Reihenfolge und setzt für jeden Duplicate-Hit
 * `image_url = null`, damit die bestehenden Sub-Komponenten (HeroTopNews,
 * NewsUeberblick, WeitereBeitraege, FondsEtfTopNews, AnlegerInteressant) ohne
 * Änderung auf ihren neutralen Kategorie-Fallback in `SafeNewsImage`
 * zurückfallen.
 *
 * Regeln:
 *   - Hero-Artikel zuerst → deren Bilder werden gemerkt.
 *   - Nachfolgende Sektionen sehen dieselbe geteilte `Set`-Struktur.
 *   - URLs werden normalisiert: Query-Params, Hash-Fragment und Whitespace
 *     entfernt, damit unterschiedliche Größenvarianten (Unsplash `?w=...`) oder
 *     Tracking-Parameter nicht fälschlich als getrennte Bilder gezählt werden.
 *   - Bilder, die per `image_url = ''` oder `null` schon leer sind, werden
 *     nicht in das Set aufgenommen (nichts zu deduplizieren).
 */

export const normalizeImageUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  // strip query + hash
  const noQuery = trimmed.split('?')[0].split('#')[0];
  // strip trailing slash
  return noQuery.replace(/\/+$/, '').toLowerCase();
};

/**
 * @param {Array<Array<object>|null|undefined>} arrayGroups — Artikelgruppen in
 *   visueller Reihenfolge auf der Page. Jede Gruppe ist ein Array (oder null).
 * @returns {Array<Array<object>>} — Kopien der Arrays mit `image_url=null` für
 *   Duplicate-Treffer. Original bleibt unangetastet.
 */
export const dedupeArticleImages = (arrayGroups) => {
  const seen = new Set();
  return arrayGroups.map((group) => {
    if (!Array.isArray(group)) return group;
    return group.map((article) => {
      if (!article || typeof article !== 'object') return article;
      const norm = normalizeImageUrl(article.image_url);
      if (!norm) return article; // nichts zu deduplizieren
      if (seen.has(norm)) {
        // Duplikat → Bild ausblenden; Sub-Komponente rendert Kategorie-Fallback.
        return { ...article, image_url: null };
      }
      seen.add(norm);
      return article;
    });
  });
};
