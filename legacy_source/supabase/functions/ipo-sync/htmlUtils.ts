/** Decode common HTML entities left in scraped IPO text cells. */

const NAMED: Record<string, string> = {
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

function fromCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return '';
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

export function decodeHtmlEntities(input: string): string {
  if (!input || !input.includes('&')) return input;
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => fromCodePoint(Number(dec)))
    .replace(/&([a-zA-Z]+);/g, (match, name: string) => NAMED[name] ?? match);
}

export function stripHtml(html: string): string {
  return decodeHtmlEntities(
    html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
  );
}
