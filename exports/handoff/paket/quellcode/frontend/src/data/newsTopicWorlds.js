/**
 * Session 80.29 Phase 3 — Themenwelten (topic worlds) für /news/nachrichten.
 *
 * Ordnet News-Artikel fünf privatanleger-verständlichen Themenwelten zu.
 * Primär via `category`; sekundär via Keyword-Match auf `title + excerpt`
 * (nur als kontrollierter Fallback). Keine neue Backend-Klassifikation.
 *
 * Farbe = Orientierungshilfe (bestehende Session-80.26-Semantik):
 *   Märkte     → info    (Blue)
 *   Zinsen     → petrol
 *   Wirtschaft → coral
 *   Vorsorge   → amber
 *   Immobilien → violet
 */

export const TOPIC_WORLDS = [
  {
    id: 'maerkte-boerse',
    title: 'Märkte & Börse',
    color: 'info',
    href: '/news/nachrichten#kategorie=maerkte',
    categories: ['maerkte', 'aktien', 'aktienmaerkte', 'industrie', 'technologie', 'fonds-etfs', 'fonds', 'etf'],
    keywords: [/\bdax\b/i, /\bs&p\b/i, /\bnasdaq\b/i, /\betf\b/i, /\baktie/i, /b[oö]rse/i, /rendite/i],
  },
  {
    id: 'zinsen-sparen',
    title: 'Zinsen & Sparen',
    color: 'petrol',
    href: '/news/nachrichten#kategorie=zinsen',
    categories: ['zinsen', 'sparen'],
    keywords: [/leitzins/i, /\bezb\b/i, /tagesgeld/i, /festgeld/i, /inflation/i, /\bzins/i, /sparzins/i, /einlage/i],
  },
  {
    id: 'wirtschaft-politik',
    title: 'Wirtschaft & Politik',
    color: 'coral',
    href: '/news/nachrichten#kategorie=wirtschaft',
    categories: ['wirtschaft', 'politik', 'welt'],
    keywords: [/steuer/i, /konjunktur/i, /handelskonflikt/i, /regulierung/i, /kanzler/i, /koalition/i, /haushalt/i, /\beu\b/i],
  },
  {
    id: 'vorsorge-vermoegen',
    title: 'Vorsorge & Vermögen',
    color: 'amber',
    href: '/news/nachrichten#kategorie=vorsorge',
    categories: ['vorsorge', 'altersvorsorge', 'rente'],
    keywords: [/rente\b/i, /altersvorsorge/i, /vorsorge/i, /verm[oö]gensaufbau/i, /pension/i],
  },
  {
    id: 'immobilien-finanzierung',
    title: 'Immobilien & Finanzierung',
    color: 'violet',
    href: '/news/nachrichten#kategorie=immobilien',
    categories: ['immobilien', 'finanzierung', 'baufinanzierung'],
    keywords: [/bauzins/i, /immobilie/i, /baufinanzier/i, /kreditzins/i, /wohnungsmarkt/i, /hypothek/i],
  },
];

const matchesKeywords = (article, keywords) => {
  const text = `${article.title || ''} ${article.excerpt || article.summary || ''}`;
  return keywords.some((rx) => rx.test(text));
};

/**
 * Klassifiziert einen Artikel in EINE Themenwelt (erster Match gewinnt).
 * Reihenfolge = Priorität der Themenwelten (Märkte > Zinsen > Wirtschaft > Vorsorge > Immobilien).
 * Kategorie-Match schlägt Keyword-Match; Artikel ohne Match werden ignoriert.
 */
export const classifyArticleWorld = (article) => {
  const cat = (article.category || '').toLowerCase();
  for (const world of TOPIC_WORLDS) {
    if (world.categories.includes(cat)) return world.id;
  }
  for (const world of TOPIC_WORLDS) {
    if (matchesKeywords(article, world.keywords)) return world.id;
  }
  return null;
};

/**
 * Baut die Themenwelt-Listen aus dem bereits geladenen Feed.
 * - Excludiert `excludeSlugs` (z. B. Artikel aus „Heute wichtig")
 * - Excludiert Artikel, die bereits einer früheren Themenwelt zugeordnet wurden
 * - Max. `limit` Artikel pro Welt
 * - Leere Welten werden ausgelassen (Section wird nicht gerendert)
 */
export const buildTopicWorlds = (items, { excludeSlugs = new Set(), limit = 4 } = {}) => {
  const used = new Set(excludeSlugs);
  return TOPIC_WORLDS.map((world) => {
    const picks = [];
    for (const it of items) {
      if (picks.length >= limit) break;
      if (used.has(it.slug)) continue;
      if (classifyArticleWorld(it) !== world.id) continue;
      picks.push(it);
      used.add(it.slug);
    }
    return { ...world, articles: picks };
  }).filter((w) => w.articles.length > 0);
};
