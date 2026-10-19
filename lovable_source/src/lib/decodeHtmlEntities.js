const NAMED = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  eacute: 'é',
  Eacute: 'É',
  egrave: 'è',
  Egrave: 'È',
  aacute: 'á',
  Aacute: 'Á',
  iacute: 'í',
  Iacute: 'Í',
  oacute: 'ó',
  Oacute: 'Ó',
  uacute: 'ú',
  Uacute: 'Ú',
  agrave: 'à',
  Agrave: 'À',
  ograve: 'ò',
  Ograve: 'Ò',
  ugrave: 'ù',
  Ugrave: 'Ù',
  auml: 'ä',
  Auml: 'Ä',
  euml: 'ë',
  Euml: 'Ë',
  iuml: 'ï',
  Iuml: 'Ï',
  ouml: 'ö',
  Ouml: 'Ö',
  uuml: 'ü',
  Uuml: 'Ü',
  szlig: 'ß',
  ccedil: 'ç',
  Ccedil: 'Ç',
  ntilde: 'ñ',
  Ntilde: 'Ñ',
  rsquo: '\u2019',
  lsquo: '\u2018',
  rdquo: '\u201D',
  ldquo: '\u201C',
  ndash: '\u2013',
  mdash: '\u2014',
};

function fromCodePoint(code) {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return '';
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

/** Decode HTML entities in scraped IPO / catalog text (e.g. `&amp;` → `&`). */
export function decodeHtmlEntities(input) {
  if (input == null) return input;
  const text = String(input);
  if (!text.includes('&')) return text;
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => fromCodePoint(Number(dec)))
    .replace(/&([a-zA-Z]+);/g, (match, name) => NAMED[name] ?? match);
}

/**
 * Fix Windows CP850 mojibake of UTF-8 text (e.g. `gesch├ñtzt` → `geschätzt`, `ÔÇô` → `–`).
 * Only applies when typical CP850 box-drawing markers are present.
 */
export function fixCp850Mojibake(input) {
  if (input == null) return input;
  const text = String(input);
  if (!/[├Ô]/.test(text)) return text;
  return text
    .replaceAll('ÔÇô', '–')
    .replaceAll('ÔÇö', '—')
    .replaceAll('ÔÇÖ', '\u2019')
    .replaceAll('ÔÇØ', '\u201C')
    .replaceAll('ÔÇù', '\u201D')
    .replaceAll('├ñ', 'ä')
    .replaceAll('├Â', 'ö')
    .replaceAll('├╝', 'ü')
    .replaceAll('├ä', 'Ä')
    .replaceAll('├û', 'Ö')
    .replaceAll('├£', 'Ü')
    .replaceAll('├ƒ', 'ß')
    .replaceAll('├®', 'é');
}

const IPO_TEXT_FIELDS = [
  'company_name',
  'description',
  'exchange',
  'market',
  'sector',
  'expected_ipo_window',
  'ticker_proposed',
];

function normalizeIpoText(value) {
  return fixCp850Mojibake(decodeHtmlEntities(value));
}

/** Normalize IPO catalog row text fields that may contain entities or mojibake. */
export function normalizeIpoCatalogRow(row) {
  if (!row || typeof row !== 'object') return row;
  const out = { ...row };
  for (const key of IPO_TEXT_FIELDS) {
    if (typeof out[key] === 'string') out[key] = normalizeIpoText(out[key]);
  }
  return out;
}
