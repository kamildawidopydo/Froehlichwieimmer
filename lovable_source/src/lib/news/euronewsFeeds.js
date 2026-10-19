// Display metadata for `news_articles.category` slugs.
// Keep aligned with `feeds.ts` in news-sync-articles.

/** Euronews editorial rubrics — shown before market tabs in /news nav. */
export const NEWS_EURONEWS_CATEGORIES = [
  { slug: 'news', label: 'Nachrichten' },
  { slug: 'business', label: 'Wirtschaft' },
  { slug: 'culture', label: 'Kultur' },
  { slug: 'my-europe', label: 'Europa' },
  { slug: 'climate', label: 'Green' },
];

/** Financial / market rubrics from FinanzNachrichten, ECB, Bundesbank feeds. */
export const NEWS_MARKET_CATEGORIES = [
  { slug: 'aktien', label: 'Aktien' },
  { slug: 'anleihen', label: 'Anleihen' },
  { slug: 'rohstoffe', label: 'Rohstoffe' },
  { slug: 'devisen', label: 'Devisen' },
  { slug: 'zinsen', label: 'Zinsen' },
  { slug: 'etf-fonds', label: 'Fonds & ETF' },
  { slug: 'adhoc', label: 'Ad-hoc' },
];

export const NEWS_CATEGORIES = [
  ...NEWS_EURONEWS_CATEGORIES,
  ...NEWS_MARKET_CATEGORIES,
];

/** Subset for the /news “Alle” section layout (avoids 16 parallel fetches). */
export const NEWS_SECTION_CATEGORIES = [
  'news',
  'business',
  'culture',
  'my-europe',
  'aktien',
  'anleihen',
];

const LABELS = NEWS_CATEGORIES.reduce((acc, c) => {
  acc[c.slug] = c.label;
  return acc;
}, /** @type {Record<string, string>} */ ({}));

export const categoryLabel = (slug) => LABELS[slug] ?? 'Nachrichten';
