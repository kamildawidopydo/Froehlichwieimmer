// Category resolution from feed metadata and article URLs.

import type { NewsCategory } from './feeds.ts';

const PATH_RULES: ReadonlyArray<readonly [RegExp, NewsCategory]> = [
  [/\/kultur\//i, 'culture'],
  [/\/reise\//i, 'travel'],
  [/\/next\//i, 'next'],
  [/\/my-europe\//i, 'my-europe'],
  [/\/(business|wirtschaft)\//i, 'business'],
  [/\/(gesundheit|health)\//i, 'health'],
  [/\/sport\//i, 'sport'],
  [/\/green\//i, 'climate'],
  [/\/(anleihen|bond|yield)/i, 'anleihen'],
  [/\/(rohstoff|commodit|oel|oil|gold|gas)/i, 'rohstoffe'],
  [/\/(devisen|forex|waehrung|currency)/i, 'devisen'],
  [/\/(fonds|etf)/i, 'etf-fonds'],
  [/\/(adhoc|ad-hoc)/i, 'adhoc'],
  [/\/(aktien|stock|equity|boerse)/i, 'aktien'],
  [/\/(zins|monetary|geldpolitik)/i, 'zinsen'],
];

const PRIORITY: Record<NewsCategory, number> = {
  adhoc: 12,
  aktien: 11,
  anleihen: 11,
  rohstoffe: 11,
  devisen: 11,
  zinsen: 11,
  'etf-fonds': 10,
  culture: 10,
  travel: 10,
  next: 10,
  'my-europe': 10,
  health: 10,
  sport: 10,
  climate: 10,
  business: 8,
  news: 1,
};

export const inferCategoryFromUrl = (url: string): NewsCategory | null => {
  for (const [pattern, category] of PATH_RULES) {
    if (pattern.test(url)) return category;
  }
  return null;
};

export const mergeCategories = (
  a: NewsCategory,
  b: NewsCategory,
): NewsCategory => ((PRIORITY[a] ?? 0) >= (PRIORITY[b] ?? 0) ? a : b);

export const resolveItemCategory = (item: {
  category: NewsCategory;
  source_url: string;
}): NewsCategory => {
  const fromUrl = inferCategoryFromUrl(item.source_url);
  return fromUrl ? mergeCategories(item.category, fromUrl) : item.category;
};
