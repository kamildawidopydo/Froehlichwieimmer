/**
 * Fetches US IPO calendar from Nasdaq (works from local/CI; blocked from Supabase Edge).
 */

const USER_AGENT =
  'Mozilla/5.0 (compatible; kapitalmitte-ipobot/1.0; +https://kapitalmitte.com)';
const NASDAQ_URL = 'https://api.nasdaq.com/api/ipo/calendar';

function parseNasdaqDate(raw) {
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

export function parseNasdaqPriceRange(raw) {
  if (!raw) return { low: null, high: null };
  const cleaned = String(raw).replace(/[$,\s]/g, ' ').trim();
  const parts = cleaned.split(/[-–—]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const low = Number(parts[0]);
    const high = Number(parts[1]);
    if (Number.isFinite(low) && Number.isFinite(high)) return { low, high };
  }
  const single = Number(cleaned);
  if (Number.isFinite(single)) return { low: single, high: single };
  return { low: null, high: null };
}

function buildExternalKey(source, isin, ticker, dateOrSlug) {
  if (isin) return `isin:${String(isin).toUpperCase()}`;
  const t = ticker ? String(ticker).toUpperCase() : 'X';
  const d = dateOrSlug || 'nodate';
  return `${source}:${t}:${d}`;
}

function deriveNasdaqStatus(bucket, ipoDate) {
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

function normalizeRow(row, bucket) {
  const companyName = String(row.companyName || row.company_name || '').trim();
  if (!companyName) return null;

  const ticker = String(row.proposedTickerSymbol || row.symbol || '').trim() || null;
  const ipoDate = parseNasdaqDate(String(row.pricedDate || row.expectedPriceDate || ''));
  const priceRaw = String(row.proposedSharePrice || row.sharePrice || '');
  const { low, high } = parseNasdaqPriceRange(priceRaw);
  const exchange = String(row.proposedExchange || row.exchange || 'US').trim() || 'US';

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
    autoStatus: deriveNasdaqStatus(bucket, ipoDate),
  };
}

function monthPeriodsAroundNow() {
  const periods = [];
  const now = new Date();
  for (let offset = -1; offset <= 4; offset += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return [...new Set(periods)];
}

export async function fetchNasdaqIposLocal() {
  const headers = {
    'User-Agent': USER_AGENT,
    Accept: 'application/json, text/plain, */*',
    Referer: 'https://www.nasdaq.com/market-activity/ipos',
    Origin: 'https://www.nasdaq.com',
  };

  const map = new Map();
  for (const period of monthPeriodsAroundNow()) {
    let json = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const res = await fetch(`${NASDAQ_URL}?date=${period}`, { headers });
        if (!res.ok) throw new Error(`Nasdaq ${period}: HTTP ${res.status}`);
        json = await res.json();
        break;
      } catch (err) {
        if (attempt === 3) throw err;
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }
    const data = json?.data ?? {};

    for (const bucket of ['priced', 'upcoming', 'filed', 'withdrawn']) {
      const rows = data?.[bucket]?.rows ?? [];
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        const parsed = normalizeRow(row, bucket);
        if (!parsed) continue;
        const existing = map.get(parsed.externalKey);
        if (!existing || (parsed.priceRangeLow != null && existing.priceRangeLow == null)) {
          map.set(parsed.externalKey, parsed);
        }
      }
    }
  }

  return [...map.values()];
}
