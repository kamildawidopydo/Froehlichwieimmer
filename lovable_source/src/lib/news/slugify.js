// Frontend mirror of the Edge Function slugifier. Currently only used by
// tests and any future client-side sharing helpers; the canonical slug is
// generated server-side and stored in `news_articles.slug`.

const FOLDS = {
  ä: 'ae',
  ö: 'oe',
  ü: 'ue',
  Ä: 'ae',
  Ö: 'oe',
  Ü: 'ue',
  ß: 'ss',
};

const fold = (input) => String(input ?? '').replace(/[äöüÄÖÜß]/g, (c) => FOLDS[c] ?? c);

export const slugify = (input) =>
  fold(input)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export const shortHash = (input) => {
  let h = 2166136261 >>> 0;
  const s = String(input ?? '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).padStart(7, '0').slice(0, 7);
};

export const buildArticleSlug = (title, guid) => {
  const base = slugify(title) || 'artikel';
  return `${base}-${shortHash(guid)}`;
};
