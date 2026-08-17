const escapeRegExp = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** @param {string} [query] */
export const buildSearchTerms = (query) => {
  const raw = String(query ?? '').trim();
  if (!raw) return [];
  const terms = raw
    .split(/\s+/)
    .map((t) => t.replace(/^["']|["']$/g, '').trim())
    .filter((t) => t.length >= 2);
  return [...new Set(terms)];
};

/**
 * @param {string|null|undefined} text
 * @param {string} [query]
 * @returns {Array<{ text: string, match: boolean }>}
 */
export const highlightParts = (text, query) => {
  const source = String(text ?? '');
  if (!source) return [];

  const terms = buildSearchTerms(query);
  if (!terms.length) return [{ text: source, match: false }];

  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
  const parts = source.split(pattern).filter((part) => part.length > 0);
  if (!parts.length) return [{ text: source, match: false }];

  const lowerTerms = terms.map((t) => t.toLowerCase());
  return parts.map((part) => ({
    text: part,
    match: lowerTerms.includes(part.toLowerCase()),
  }));
};
