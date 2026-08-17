// RSS feed registry for `news-sync-articles`.
// Groups control cron frequency: euronews (15m), financial (10m), official (30m).

export type NewsProvider =
  | 'euronews'
  | 'finanznachrichten'
  | 'ecb'
  | 'bundesbank';

export type SyncGroup = 'euronews' | 'financial' | 'official';

export type NewsCategory =
  | 'news'
  | 'business'
  | 'culture'
  | 'travel'
  | 'next'
  | 'my-europe'
  | 'health'
  | 'sport'
  | 'climate'
  | 'aktien'
  | 'anleihen'
  | 'rohstoffe'
  | 'devisen'
  | 'zinsen'
  | 'etf-fonds'
  | 'adhoc';

export interface FeedSource {
  url: string;
  category: NewsCategory;
  provider: NewsProvider;
  syncGroup: SyncGroup;
}

export const FEEDS: FeedSource[] = [
  // --- Euronews (15 min) ---------------------------------------------------
  { url: 'https://de.euronews.com/rss?level=vertical&name=business', category: 'business', provider: 'euronews', syncGroup: 'euronews' },
  { url: 'https://de.euronews.com/rss?level=vertical&name=culture', category: 'culture', provider: 'euronews', syncGroup: 'euronews' },
  { url: 'https://de.euronews.com/rss?level=vertical&name=travel', category: 'travel', provider: 'euronews', syncGroup: 'euronews' },
  { url: 'https://de.euronews.com/rss?level=vertical&name=next', category: 'next', provider: 'euronews', syncGroup: 'euronews' },
  { url: 'https://de.euronews.com/rss?level=vertical&name=my-europe', category: 'my-europe', provider: 'euronews', syncGroup: 'euronews' },
  { url: 'https://de.euronews.com/rss?level=vertical&name=health', category: 'health', provider: 'euronews', syncGroup: 'euronews' },
  { url: 'https://de.euronews.com/rss?level=theme&name=sport', category: 'sport', provider: 'euronews', syncGroup: 'euronews' },
  { url: 'https://de.euronews.com/rss?level=theme&name=climate', category: 'climate', provider: 'euronews', syncGroup: 'euronews' },
  { url: 'https://de.euronews.com/rss?level=theme&name=business', category: 'business', provider: 'euronews', syncGroup: 'euronews' },
  { url: 'https://de.euronews.com/rss?level=theme&name=news', category: 'news', provider: 'euronews', syncGroup: 'euronews' },
  { url: 'https://de.euronews.com/rss', category: 'news', provider: 'euronews', syncGroup: 'euronews' },

  // --- FinanzNachrichten (10 min) ------------------------------------------
  { url: 'https://www.finanznachrichten.de/rss-aktien-nachrichten/', category: 'aktien', provider: 'finanznachrichten', syncGroup: 'financial' },
  { url: 'https://www.finanznachrichten.de/rss-nachrichten-aktien-deutschland/', category: 'aktien', provider: 'finanznachrichten', syncGroup: 'financial' },
  { url: 'https://www.finanznachrichten.de/rss-nachrichten-aktien-europa/', category: 'aktien', provider: 'finanznachrichten', syncGroup: 'financial' },
  { url: 'https://www.finanznachrichten.de/rss-nachrichten-aktien-usa/', category: 'aktien', provider: 'finanznachrichten', syncGroup: 'financial' },
  { url: 'https://www.finanznachrichten.de/rss-nachrichten-anleihen/', category: 'anleihen', provider: 'finanznachrichten', syncGroup: 'financial' },
  { url: 'https://www.finanznachrichten.de/rss-anleihen-nachrichten-101/', category: 'anleihen', provider: 'finanznachrichten', syncGroup: 'financial' },
  { url: 'https://www.finanznachrichten.de/rss-nachrichten-rohstoffe/', category: 'rohstoffe', provider: 'finanznachrichten', syncGroup: 'financial' },
  { url: 'https://www.finanznachrichten.de/rss-branche-rohstoffe-41/', category: 'rohstoffe', provider: 'finanznachrichten', syncGroup: 'financial' },
  { url: 'https://www.finanznachrichten.de/rss-branche-oel-gas-37/', category: 'rohstoffe', provider: 'finanznachrichten', syncGroup: 'financial' },
  { url: 'https://www.finanznachrichten.de/rss-nachrichten-devisen/', category: 'devisen', provider: 'finanznachrichten', syncGroup: 'financial' },
  { url: 'https://www.finanznachrichten.de/rss-nachrichten-fonds/', category: 'etf-fonds', provider: 'finanznachrichten', syncGroup: 'financial' },
  { url: 'https://www.finanznachrichten.de/rss-aktien-adhoc/', category: 'adhoc', provider: 'finanznachrichten', syncGroup: 'financial' },
  { url: 'https://www.finanznachrichten.de/rss-marktberichte/', category: 'aktien', provider: 'finanznachrichten', syncGroup: 'financial' },
  { url: 'https://www.finanznachrichten.de/rss-dax-40-nachrichten-1/', category: 'aktien', provider: 'finanznachrichten', syncGroup: 'financial' },
  { url: 'https://www.finanznachrichten.de/rss-tecdax-nachrichten-2/', category: 'aktien', provider: 'finanznachrichten', syncGroup: 'financial' },

  // --- ECB / Bundesbank (30 min) -------------------------------------------
  { url: 'https://www.ecb.europa.eu/rss/press.html', category: 'zinsen', provider: 'ecb', syncGroup: 'official' },
  { url: 'https://www.ecb.europa.eu/rss/operations.html', category: 'anleihen', provider: 'ecb', syncGroup: 'official' },
  { url: 'https://www.ecb.europa.eu/rss/yc.html', category: 'anleihen', provider: 'ecb', syncGroup: 'official' },
  { url: 'https://www.ecb.europa.eu/rss/statpress.html', category: 'zinsen', provider: 'ecb', syncGroup: 'official' },
  { url: 'https://www.bundesbank.de/service/rss/de/633286/feed.rss', category: 'zinsen', provider: 'bundesbank', syncGroup: 'official' },
  { url: 'https://www.bundesbank.de/service/rss/de/633278/feed.rss', category: 'anleihen', provider: 'bundesbank', syncGroup: 'official' },
];

export const feedsForGroup = (group: SyncGroup): FeedSource[] =>
  FEEDS.filter((f) => f.syncGroup === group);

export const providersForGroup = (group: SyncGroup): NewsProvider[] => [
  ...new Set(feedsForGroup(group).map((f) => f.provider)),
];
