/**
 * Local US IPO fetch for invoke script (StockAnalysis HTML — works when Nasdaq API fails).
 */

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';

const NAMED = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  rsquo: '\u2019',
  lsquo: '\u2018',
  ndash: '\u2013',
  mdash: '\u2014',
};

function decodeHtmlEntities(input) {
  if (!input || !input.includes('&')) return input;
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number(dec);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&([a-zA-Z]+);/g, (match, name) => NAMED[name] ?? match);
}

function parseSaDate(raw) {
  const m = String(raw).trim().match(/^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})$/);
  if (!m) return null;
  const months = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  };
  const mo = months[m[1]];
  if (!mo) return null;
  return `${m[3]}-${mo}-${m[2].padStart(2, '0')}`;
}

function parsePrice(raw) {
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

function buildKey(ticker, ipoDate) {
  return `stockanalysis:${String(ticker).toUpperCase()}:${ipoDate || 'nodate'}`;
}

function parseTable(html) {
  const rows = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = trRe.exec(html)) !== null) {
    const tds = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((x) =>
      decodeHtmlEntities(x[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()),
    );
    if (tds.length >= 4 && !/ipo date|symbol/i.test(tds[0])) rows.push(tds);
  }
  return rows;
}

function calendarRow(cells) {
  const [dateRaw, ticker, companyName, exchange, priceRaw] = cells;
  if (!ticker || !companyName) return null;
  const ipoDate = parseSaDate(dateRaw);
  const { low, high } = parsePrice(priceRaw);
  return {
    externalKey: buildKey(ticker, ipoDate),
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
    autoStatus: 'upcoming',
  };
}

export async function fetchUsIposLocal() {
  const headers = { 'User-Agent': USER_AGENT, Accept: 'text/html' };
  const res = await fetch('https://stockanalysis.com/ipos/calendar/', { headers });
  if (!res.ok) throw new Error(`StockAnalysis HTTP ${res.status}`);
  const html = await res.text();
  const map = new Map();
  for (const cells of parseTable(html)) {
    const row = calendarRow(cells);
    if (row) map.set(row.externalKey, row);
  }
  return [...map.values()];
}
