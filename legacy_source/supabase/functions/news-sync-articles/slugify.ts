// ASCII-friendly slug generator with German diacritic folding. Used for
// `news_articles.slug` so URLs stay short, predictable and unique once a
// short hash of the original guid is appended.

const FOLDS: Record<string, string> = {
  ä: 'ae',
  ö: 'oe',
  ü: 'ue',
  Ä: 'ae',
  Ö: 'oe',
  Ü: 'ue',
  ß: 'ss',
};

const fold = (input: string): string =>
  input.replace(/[äöüÄÖÜß]/g, (c) => FOLDS[c] ?? c);

export const slugify = (input: string): string =>
  fold(String(input ?? ''))
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

// Short stable hash used to disambiguate slugs that share the same title.
// 32-bit FNV-1a is enough; we only need to keep collisions extremely rare.
export const shortHash = (input: string): string => {
  let h = 2166136261 >>> 0;
  const s = String(input ?? '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).padStart(7, '0').slice(0, 7);
};

export const buildArticleSlug = (title: string, guid: string): string => {
  const base = slugify(title) || 'artikel';
  return `${base}-${shortHash(guid)}`;
};
