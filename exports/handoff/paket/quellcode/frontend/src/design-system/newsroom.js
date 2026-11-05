/**
 * Session 80.48 — Investment Newsroom Foundation.
 *
 * Reusable editorial taxonomy für die entstehende Newsroom-Architektur.
 * Alle Farbrollen kommen aus dem zentralen Accent-System (siehe accents.js) —
 * keine neuen Slots, kein Rainbow.
 *
 * Erweiterte Sessions 80.49–80.53 bauen auf diesen Primitiven auf.
 */
import { resolveAccent } from '@/design-system/accents';

/**
 * Editorial-Formate (Sichtbar als kleines Meta-Badge, NICHT als Farbcode).
 * Farbrolle bleibt neutral/navy — Format ist Information, keine Emotion.
 * Semantisch-nahe Slots werden nur für Sonderfälle (Deep Dive / Risk Check)
 * genutzt, in denen die Bedeutung die Farbe rechtfertigt.
 */
export const RESEARCH_FORMATS = Object.freeze({
  news:         { key: 'news',         label: 'News',         accent: 'navy',      shortLabel: 'NEWS' },
  market_brief: { key: 'market_brief', label: 'Market Brief', accent: 'info',      shortLabel: 'MARKET BRIEF' },
  explainer:    { key: 'explainer',    label: 'Explainer',    accent: 'violet',    shortLabel: 'EXPLAINER' },
  deep_dive:    { key: 'deep_dive',    label: 'Deep Dive',    accent: 'champagne', shortLabel: 'DEEP DIVE' },
  risk_check:   { key: 'risk_check',   label: 'Risk Check',   accent: 'amber',     shortLabel: 'RISK CHECK' },
  data_insight: { key: 'data_insight', label: 'Data Insight', accent: 'gold',      shortLabel: 'DATA INSIGHT' },
});

/**
 * Newsroom-Kategorien. Re-use bestehender Topic-Slugs wo möglich;
 * `sicher-investieren` ist die neue erste-Klasse-Vertical (Editorial-only).
 */
export const NEWSROOM_CATEGORIES = Object.freeze([
  { slug: 'maerkte',            label: 'Märkte',              accent: 'info' },
  { slug: 'zinsen-ezb',         label: 'Zinsen & EZB',        accent: 'petrol' },
  { slug: 'etfs-fonds',         label: 'ETFs & Fonds',        accent: 'petrol' },
  { slug: 'sicher-investieren', label: 'Sicher investieren',  accent: 'petrol' },
  { slug: 'vermoegensaufbau',   label: 'Vermögensaufbau',     accent: 'gold' },
  { slug: 'anleihen',           label: 'Anleihen',            accent: 'petrol' },
  { slug: 'nachhaltigkeit',     label: 'Nachhaltigkeit',      accent: 'sage' },
  { slug: 'altersvorsorge',     label: 'Altersvorsorge',      accent: 'amber' },
]);

/**
 * News → Wissen Matching (Session 80.48).
 *
 * Basiert auf **realer** Tag-/Topic-Überlappung. Wir erfinden keine
 * Beziehungen — wenn keine Wissen-Artikel semantisch passen, gibt die
 * Funktion `[]` zurück und die UI blendet den Bereich aus.
 *
 * @param {object} article  News-Item mit optionalen `tags` / `investment_topic_slug` / `category` Feldern.
 * @param {Array}  wissen   Reale Wissen-Artikel-Liste (mit `tags` / `slug`).
 * @param {number} limit    Max. 3 (per Spec).
 */
export function matchWissenBridge(article, wissen, limit = 3) {
  if (!article || !Array.isArray(wissen) || wissen.length === 0) return [];
  const signals = new Set(
    [
      article.investment_topic_slug,
      article.category,
      ...((article.tags || []).map((t) => String(t).toLowerCase())),
    ].filter(Boolean).map((s) => String(s).toLowerCase())
  );
  if (signals.size === 0) return [];
  const scored = wissen.map((w) => {
    const wTags = new Set((w.tags || []).map((t) => String(t).toLowerCase()));
    let score = 0;
    signals.forEach((s) => {
      if (wTags.has(s)) score += 2;
      if (w.slug && w.slug.toLowerCase().includes(s)) score += 1;
      if (w.category && String(w.category).toLowerCase() === s) score += 1;
    });
    return { article: w, score };
  }).filter((x) => x.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.article);
}

/**
 * Trust-Metadaten-Shape für Newsroom-Cards. Backend füllt was verfügbar ist;
 * fehlende Werte werden von der UI stumm ausgeblendet (keine erfundenen Werte).
 */
export const TRUST_META_KEYS = Object.freeze([
  'source',
  'source_url',
  'published_at',
  'updated_at',
  'author',
  // Vorbereitet für 80.50 (News Trust Layer) — heute NICHT populiert:
  'primary_source_url',
  'fact_checked_at',
  'methodology_url',
  'next_review_at',
]);

/** Convenience: resolveAccent für ein Format oder eine Kategorie. */
export const formatAccent = (formatKey) => resolveAccent((RESEARCH_FORMATS[formatKey] || RESEARCH_FORMATS.news).accent);
export const categoryAccent = (catSlug) => {
  const c = NEWSROOM_CATEGORIES.find((x) => x.slug === catSlug);
  return resolveAccent(c ? c.accent : 'navy');
};
