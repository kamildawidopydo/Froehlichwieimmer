import type { ParsedIpoRow } from './types.ts';
import { stripHtml } from './htmlUtils.ts';

const USER_AGENT = 'kapitalmitte-ipobot/1.0';

/** Parse DD/MM/YYYY to YYYY-MM-DD */
export function parseEuronextDate(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

export function buildExternalKey(
  source: string,
  isin: string | null,
  ticker: string | null,
  ipoDate: string | null,
): string {
  if (isin) return `isin:${isin.toUpperCase()}`;
  const t = (ticker || 'unknown').toUpperCase();
  const d = ipoDate || 'nodate';
  return `${source}:${t}:${d}`;
}

function deriveStatus(ipoDate: string | null): 'upcoming' | 'listed' {
  if (!ipoDate) return 'upcoming';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ipo = new Date(`${ipoDate}T00:00:00`);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - 30);
  if (ipo <= cutoff) return 'listed';
  return 'upcoming';
}

export async function fetchEuronextIpos(): Promise<ParsedIpoRow[]> {
  const url = 'https://live.euronext.com/en/ipo-showcase';
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!res.ok) {
    throw new Error(`Euronext fetch failed: ${res.status}`);
  }
  const html = await res.text();
  return parseEuronextHtml(html);
}

export function parseEuronextHtml(html: string): ParsedIpoRow[] {
  const rows: ParsedIpoRow[] = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch: RegExpExecArray | null;

  while ((trMatch = trRegex.exec(html)) !== null) {
    const rowHtml = trMatch[1];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let tdMatch: RegExpExecArray | null;
    while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
      cells.push(stripHtml(tdMatch[1]));
    }
    if (cells.length < 6) continue;

    const [dateRaw, companyName, ticker, isin, location, market] = cells;
    if (!companyName || companyName === 'Company name') continue;
    if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateRaw)) continue;

    const ipoDate = parseEuronextDate(dateRaw);
    const tickerProposed = ticker || null;
    const isinCode = isin && isin.length >= 10 ? isin : null;

    rows.push({
      externalKey: buildExternalKey('euronext', isinCode, tickerProposed, ipoDate),
      source: 'euronext',
      companyName,
      tickerProposed,
      isin: isinCode,
      exchange: location || null,
      market: market || null,
      sector: null,
      ipoDate,
      priceRangeLow: null,
      priceRangeHigh: null,
      prospectusUrl: null,
    });
  }

  return rows;
}

export { deriveStatus };
