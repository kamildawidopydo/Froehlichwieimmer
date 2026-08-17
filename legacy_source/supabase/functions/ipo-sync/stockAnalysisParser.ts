import type { IpoStatus, ParsedIpoRow } from './types.ts';
import { buildExternalKey } from './euronextParser.ts';
import { parseNasdaqPriceRange } from './nasdaqParser.ts';
import { isBlockedListedIpo } from './purgeListedIpos.ts';
import { stripHtml } from './htmlUtils.ts';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';

const CALENDAR_URL = 'https://stockanalysis.com/ipos/calendar/';

function parseSaDate(raw: string): string | null {
  const s = raw.trim();
  const m = s.match(/^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})$/);
  if (!m) return null;
  const months: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  };
  const mo = months[m[1]];
  if (!mo) return null;
  return `${m[3]}-${mo}-${m[2].padStart(2, '0')}`;
}

function deriveSaStatus(ipoDate: string | null): IpoStatus {
  if (!ipoDate) return 'upcoming';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ipo = new Date(`${ipoDate}T00:00:00`);
  if (ipo > today) return 'upcoming';
  return 'listed';
}

function parseTableRows(html: string): string[][] {
  const rows: string[][] = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch: RegExpExecArray | null;
  while ((trMatch = trRe.exec(html)) !== null) {
    const tds = [...trMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((td) =>
      stripHtml(td[1]),
    );
    if (tds.length < 4) continue;
    if (/ipo date|symbol|company/i.test(tds[0])) continue;
    rows.push(tds);
  }
  return rows;
}

function normalizeCalendarRow(cells: string[]): ParsedIpoRow | null {
  const [dateRaw, ticker, companyName, exchange, priceRaw] = cells;
  if (!companyName || !ticker) return null;
  if (isBlockedListedIpo(ticker, companyName)) return null;

  const ipoDate = parseSaDate(dateRaw);
  const { low, high } = parseNasdaqPriceRange(priceRaw);
  return {
    externalKey: buildExternalKey('stockanalysis', null, ticker, ipoDate),
    source: 'stockanalysis',
    companyName,
    tickerProposed: ticker.toUpperCase(),
    isin: null,
    exchange: exchange || 'US',
    market: exchange || 'US',
    sector: null,
    ipoDate,
    priceRangeLow: low,
    priceRangeHigh: high,
    priceCurrency: 'USD',
    prospectusUrl: null,
    autoStatus: deriveSaStatus(ipoDate),
  };
}

export async function fetchStockAnalysisIpos(): Promise<ParsedIpoRow[]> {
  const headers = { 'User-Agent': USER_AGENT, Accept: 'text/html' };
  const map = new Map<string, ParsedIpoRow>();
  const today = new Date().toISOString().slice(0, 10);

  const res = await fetch(CALENDAR_URL, { headers });
  if (!res.ok) throw new Error(`StockAnalysis fetch failed: ${res.status}`);
  const html = await res.text();

  for (const cells of parseTableRows(html)) {
    const parsed = normalizeCalendarRow(cells);
    if (!parsed) continue;
    if (parsed.ipoDate && parsed.ipoDate < today) continue;
    map.set(parsed.externalKey, parsed);
  }

  return [...map.values()];
}

export function parseStockAnalysisHtmlForTest(html: string, _bucket: 'calendar' | 'recent'): ParsedIpoRow[] {
  return parseTableRows(html)
    .map((cells) => normalizeCalendarRow(cells))
    .filter((r): r is ParsedIpoRow => r != null);
}
