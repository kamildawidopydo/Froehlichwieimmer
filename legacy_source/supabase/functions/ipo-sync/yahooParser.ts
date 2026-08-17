import type { ParsedIpoRow } from './types.ts';
import { buildExternalKey } from './euronextParser.ts';
import { decodeHtmlEntities, stripHtml } from './htmlUtils.ts';

const USER_AGENT = 'kapitalmitte-ipobot/1.0';

function parseYahooDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) {
    const [, mo, d, y] = us;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

function parsePriceRange(raw: string): { low: number | null; high: number | null } {
  const cleaned = raw.replace(/[$€£,\s]/g, ' ').trim();
  const parts = cleaned.split(/[-–—]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const low = Number(parts[0]);
    const high = Number(parts[1]);
    if (Number.isFinite(low) && Number.isFinite(high)) {
      return { low, high };
    }
  }
  const single = Number(cleaned);
  if (Number.isFinite(single)) return { low: single, high: single };
  return { low: null, high: null };
}

export async function fetchYahooIpos(): Promise<ParsedIpoRow[]> {
  const url = 'https://finance.yahoo.com/calendar/ipo';
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!res.ok) {
    throw new Error(`Yahoo fetch failed: ${res.status}`);
  }
  const html = await res.text();
  return parseYahooHtml(html);
}

export function parseYahooHtml(html: string): ParsedIpoRow[] {
  const rows: ParsedIpoRow[] = [];

  const jsonMatch = html.match(
    /"rows":\s*(\[[\s\S]*?\])\s*,\s*"size"/,
  );
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]) as Array<Record<string, unknown>>;
      for (const item of parsed) {
        const companyName = decodeHtmlEntities(String(item.company || item.name || '').trim());
        const ticker = String(item.symbol || item.ticker || '').trim() || null;
        const dateRaw = String(item.startDate || item.ipoDate || item.date || '');
        const ipoDate = parseYahooDate(dateRaw);
        const priceRaw = String(item.priceRange || item.price || '');
        const { low, high } = parsePriceRange(priceRaw);
        if (!companyName) continue;
        rows.push({
          externalKey: buildExternalKey('yahoo', null, ticker, ipoDate),
          source: 'yahoo',
          companyName,
          tickerProposed: ticker,
          isin: null,
          exchange: String(item.exchange || '') || null,
          market: null,
          sector: null,
          ipoDate,
          priceRangeLow: low,
          priceRangeHigh: high,
          prospectusUrl: null,
        });
      }
      if (rows.length > 0) return rows;
    } catch {
      // fall through
    }
  }

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
    if (cells.length < 3) continue;

    const ticker = cells[0] && cells[0].length <= 12 ? cells[0] : null;
    const companyName = cells[1] || cells[0];
    if (!companyName || companyName.toLowerCase() === 'symbol') continue;

    let ipoDate: string | null = null;
    let priceRaw = '';
    let exchange: string | null = null;

    for (const cell of cells.slice(2)) {
      if (!ipoDate && (/\d{4}/.test(cell) || /\d{1,2}\/\d{1,2}/.test(cell))) {
        ipoDate = parseYahooDate(cell);
      }
      if (cell.includes('-') && /\d/.test(cell)) {
        priceRaw = cell;
      }
      if (!exchange && cell.length < 20 && !/\d/.test(cell) && cell !== priceRaw) {
        exchange = cell;
      }
    }

    const { low, high } = parsePriceRange(priceRaw);

    rows.push({
      externalKey: buildExternalKey('yahoo', null, ticker, ipoDate),
      source: 'yahoo',
      companyName,
      tickerProposed: ticker,
      isin: null,
      exchange,
      market: null,
      sector: null,
      ipoDate,
      priceRangeLow: low,
      priceRangeHigh: high,
      prospectusUrl: null,
    });
  }

  return rows;
}
