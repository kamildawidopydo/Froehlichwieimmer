import type { IpoStatus, ParsedIpoRow } from './types.ts';
import { buildExternalKey } from './euronextParser.ts';
import { decodeHtmlEntities } from './htmlUtils.ts';

const USER_AGENT =
  'Mozilla/5.0 (compatible; kapitalmitte-ipobot/1.0; +https://kapitalmitte.com)';
const NASDAQ_URL = 'https://api.nasdaq.com/api/ipo/calendar';
const MAX_RETRIES = 3;

async function fetchNasdaqMonth(
  period: string,
  headers: Record<string, string>,
): Promise<Record<string, unknown>> {
  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const res = await fetch(`${NASDAQ_URL}?date=${period}`, { headers });
      if (!res.ok) {
        throw new Error(`Nasdaq fetch failed for ${period}: ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      lastErr = err as Error;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
      }
    }
  }
  throw lastErr ?? new Error(`Nasdaq fetch failed for ${period}`);
}

type NasdaqRow = Record<string, string | number | null | undefined>;

function parseNasdaqDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, mo, d, y] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return null;
}

export function parseNasdaqPriceRange(
  raw: string | null | undefined,
): { low: number | null; high: number | null } {
  if (!raw) return { low: null, high: null };
  const cleaned = String(raw).replace(/[$,\s]/g, ' ').trim();
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

function deriveNasdaqStatus(
  bucket: 'priced' | 'upcoming' | 'filed' | 'withdrawn',
  ipoDate: string | null,
): IpoStatus {
  if (bucket === 'filed') return 'filed';
  if (bucket === 'withdrawn') return 'cancelled';
  if (bucket === 'priced') return 'priced';

  if (!ipoDate) return 'upcoming';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ipo = new Date(`${ipoDate}T00:00:00`);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - 30);
  if (ipo <= cutoff) return 'listed';
  return 'upcoming';
}

function normalizeNasdaqRow(
  row: NasdaqRow,
  bucket: 'priced' | 'upcoming' | 'filed' | 'withdrawn',
): ParsedIpoRow | null {
  const companyName = decodeHtmlEntities(
    String(row.companyName || row.company_name || '').trim(),
  );
  if (!companyName) return null;

  const ticker = String(row.proposedTickerSymbol || row.symbol || '').trim() || null;
  const ipoDate = parseNasdaqDate(
    String(row.pricedDate || row.expectedPriceDate || row.ipoDate || ''),
  );
  const priceRaw = String(
    row.proposedSharePrice || row.sharePrice || row.priceRange || '',
  );
  const { low, high } = parseNasdaqPriceRange(priceRaw);
  const exchange = String(row.proposedExchange || row.exchange || 'US').trim() || 'US';

  const autoStatus = deriveNasdaqStatus(bucket, ipoDate);

  return {
    externalKey: buildExternalKey('nasdaq', null, ticker, ipoDate || companyName.slice(0, 12)),
    source: 'nasdaq',
    companyName,
    tickerProposed: ticker,
    isin: null,
    exchange,
    market: exchange,
    sector: null,
    ipoDate,
    priceRangeLow: low,
    priceRangeHigh: high,
    priceCurrency: 'USD',
    prospectusUrl: null,
    autoStatus,
  };
}

function monthPeriodsAroundNow(): string[] {
  const periods: string[] = [];
  const now = new Date();
  for (let offset = -1; offset <= 4; offset += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    periods.push(`${y}-${m}`);
  }
  return [...new Set(periods)];
}

export async function fetchNasdaqIpos(): Promise<ParsedIpoRow[]> {
  const headers = {
    'User-Agent': USER_AGENT,
    Accept: 'application/json, text/plain, */*',
    Referer: 'https://www.nasdaq.com/market-activity/ipos',
    Origin: 'https://www.nasdaq.com',
  };

  const map = new Map<string, ParsedIpoRow>();
  const periods = monthPeriodsAroundNow();
  const periodErrors: string[] = [];

  for (const period of periods) {
    try {
      const json = await fetchNasdaqMonth(period, headers);
      const data = json?.data ?? {};

      for (const bucket of ['priced', 'upcoming', 'filed', 'withdrawn'] as const) {
        const rows = data?.[bucket]?.rows ?? data?.[bucket] ?? [];
        if (!Array.isArray(rows)) continue;
        for (const row of rows) {
          const parsed = normalizeNasdaqRow(row, bucket);
          if (!parsed) continue;
          const key = parsed.externalKey;
          const existing = map.get(key);
          if (!existing) {
            map.set(key, parsed);
            continue;
          }
          if (parsed.priceRangeLow != null && existing.priceRangeLow == null) {
            map.set(key, { ...existing, ...parsed });
          }
        }
      }
    } catch (err) {
      periodErrors.push(`${period}: ${(err as Error).message}`);
    }
  }

  if (map.size === 0 && periodErrors.length > 0) {
    throw new Error(periodErrors.join('; '));
  }

  return [...map.values()];
}

export function parseNasdaqJsonForTest(
  json: Record<string, unknown>,
  bucket: 'priced' | 'upcoming' | 'filed',
): ParsedIpoRow[] {
  const data = (json?.data ?? json) as Record<string, unknown>;
  const rows = (data?.[bucket] as { rows?: NasdaqRow[] })?.rows ?? [];
  return rows
    .map((r) => normalizeNasdaqRow(r, bucket))
    .filter((r): r is ParsedIpoRow => r != null);
}
