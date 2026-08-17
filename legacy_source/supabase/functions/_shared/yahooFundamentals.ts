// Yahoo chart + optional quoteSummary (crumb) with in-memory session cache and backoff.

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const SESSION_TTL_MS = 45 * 60 * 1000;

export interface FundamentalsPayload {
  symbol: string;
  currency: string;
  marketCap: number | null;
  peRatio: number | null;
  forwardPE: number | null;
  dividendYield: number | null;
  beta: number | null;
  eps: number | null;
  bookValue: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  avgVolume: number | null;
  partial: boolean;
}

let cachedSession: { cookie: string; crumb: string; expiresAt: number } | null = null;

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

const numRaw = (o: { raw?: number } | undefined): number | null =>
  o?.raw != null && Number.isFinite(o.raw) ? o.raw : null;

export function clearYahooSession(): void {
  cachedSession = null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function collectCookies(res: Response): string {
  const parts: string[] = [];
  const headers = res.headers as Headers & {
    getSetCookie?: () => string[];
    raw?: () => Record<string, string[]>;
  };

  if (typeof headers.getSetCookie === 'function') {
    for (const c of headers.getSetCookie()) {
      const p = c.split(';')[0]?.trim();
      if (p) parts.push(p);
    }
  } else if (typeof headers.raw === 'function') {
    const raw = headers.raw()['set-cookie'] ?? [];
    for (const c of raw) {
      const p = c.split(';')[0]?.trim();
      if (p) parts.push(p);
    }
  } else {
    const single = res.headers.get('set-cookie');
    if (single) {
      for (const c of single.split(/,(?=[^;,]+=)/)) {
        const p = c.trim().split(';')[0];
        if (p) parts.push(p);
      }
    }
  }
  return [...new Set(parts)].join('; ');
}

async function fetchWithBackoff<T>(
  label: string,
  fn: () => Promise<T>,
  maxAttempts = 4,
): Promise<T> {
  let delayMs = 800;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts) break;
      console.warn(`${label} attempt ${attempt} failed:`, err);
      await sleep(delayMs);
      delayMs *= 2;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function fetchYahooCookies(): Promise<string> {
  const jar: string[] = [];
  const add = (res: Response) => {
    const c = collectCookies(res);
    if (c) jar.push(c);
  };

  const bootstrapUrls = [
    'https://fc.yahoo.com',
    'https://finance.yahoo.com/quote/AAPL/',
  ];

  for (const url of bootstrapUrls) {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,*/*', Cookie: jar.join('; ') },
      redirect: 'follow',
    });
    add(res);
    if (jar.join('; ')) break;
  }

  return [...new Set(jar.join('; ').split('; ').filter(Boolean))].join('; ');
}

async function getYahooSession(): Promise<{ cookie: string; crumb: string } | null> {
  if (cachedSession && Date.now() < cachedSession.expiresAt) {
    return { cookie: cachedSession.cookie, crumb: cachedSession.crumb };
  }

  try {
    const cookie = await fetchYahooCookies();
    if (!cookie) {
      console.warn('Yahoo cookie missing after bootstrap');
      return null;
    }

    const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: { 'User-Agent': UA, Accept: 'text/plain', Cookie: cookie },
    });
    if (!crumbRes.ok) {
      console.warn(`Yahoo crumb ${crumbRes.status}`);
      return null;
    }
    const crumb = (await crumbRes.text()).trim();
    if (!crumb) return null;

    cachedSession = { cookie, crumb, expiresAt: Date.now() + SESSION_TTL_MS };
    return { cookie, crumb };
  } catch (err) {
    console.warn('Yahoo session failed:', err);
    return null;
  }
}

async function fetchChartMeta(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1y`;
  const res = await fetchWithBackoff(`chart-${symbol}`, () =>
    fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } }),
  );
  if (!res.ok) throw new Error(`Yahoo chart ${res.status}`);
  const json = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error('Keine Kursdaten verfügbar');
  return meta;
}

async function fetchQuoteSummaryOnce(
  symbol: string,
  session: { cookie: string; crumb: string },
): Promise<Record<string, unknown> | null> {
  const qs = new URLSearchParams({
    modules: 'summaryDetail,defaultKeyStatistics,price',
    crumb: session.crumb,
  });
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?${qs}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json', Cookie: session.cookie },
  });
  if (res.status === 401 || res.status === 403) {
    clearYahooSession();
    return null;
  }
  if (!res.ok) return null;
  const json = await res.json();
  return json?.quoteSummary?.result?.[0] ?? null;
}

async function fetchQuoteSummary(symbol: string): Promise<Record<string, unknown> | null> {
  let session = await getYahooSession();
  if (!session) return null;
  let summary = await fetchQuoteSummaryOnce(symbol, session);
  if (summary != null) return summary;
  session = await getYahooSession();
  if (!session) return null;
  return fetchQuoteSummaryOnce(symbol, session);
}

async function fetchTtmDividendPerShare(symbol: string): Promise<number | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1y&events=div`;
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const json = await res.json();
  const divs = json?.chart?.result?.[0]?.events?.dividends ?? {};
  const cutoff = Date.now() / 1000 - 365 * 86_400;
  const ttm = Object.values(divs as Record<string, { amount?: number; date?: number }>)
    .filter((d) => Number(d?.amount) > 0 && Number(d?.date) >= cutoff)
    .reduce((s, d) => s + Number(d.amount), 0);
  return ttm > 0 ? ttm : null;
}

export async function fetchYahooFundamentals(symbol: string): Promise<FundamentalsPayload> {
  const meta = await fetchChartMeta(symbol);
  const summary = await fetchQuoteSummary(symbol);
  const sd = (summary?.summaryDetail ?? {}) as Record<string, { raw?: number } | undefined>;
  const ks = (summary?.defaultKeyStatistics ?? {}) as Record<string, { raw?: number } | undefined>;
  const px = (summary?.price ?? {}) as { currency?: string };

  const divRaw = numRaw(sd.dividendYield);
  let dividendYield = divRaw != null ? divRaw * 100 : null;
  if (dividendYield == null) {
    const price = num(meta.regularMarketPrice as number);
    const ttmDiv = await fetchTtmDividendPerShare(symbol);
    if (price != null && price > 0 && ttmDiv != null) {
      dividendYield = (ttmDiv / price) * 100;
    }
  }

  return {
    symbol,
    currency: px.currency ?? (meta.currency as string) ?? 'USD',
    marketCap: numRaw(sd.marketCap),
    peRatio: numRaw(sd.trailingPE),
    forwardPE: numRaw(sd.forwardPE),
    dividendYield,
    beta: numRaw(ks.beta),
    eps: numRaw(ks.trailingEps) ?? numRaw(sd.trailingEps),
    bookValue: numRaw(ks.bookValue) ?? numRaw(sd.bookValue),
    fiftyTwoWeekHigh: num(meta.fiftyTwoWeekHigh) ?? numRaw(sd.fiftyTwoWeekHigh),
    fiftyTwoWeekLow: num(meta.fiftyTwoWeekLow) ?? numRaw(sd.fiftyTwoWeekLow),
    avgVolume: num(meta.regularMarketVolume) ?? numRaw(sd.averageVolume),
    partial: summary == null,
  };
}
