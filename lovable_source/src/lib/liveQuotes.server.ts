// Live-Kurse über den öffentlichen Yahoo-Finance-Chart-Endpunkt (kein Schlüssel nötig).
// Bei Ausfall bleibt der gespeicherte Stand als Rückfall (data_source "cache").

type Meta = { price: number; prev: number; time: number; currency?: string; high?: number; low?: number; hi52?: number; lo52?: number };
type Chart = { meta: Meta; points: Array<{ timestamp: string; open: number | null; high: number | null; low: number | null; close: number; volume: number | null }> };

const cache = new Map<string, { at: number; data: Chart | null }>();
const TTL = 60_000;

export async function yahooChart(symbol: string, range = "1d", interval = "1d"): Promise<Chart | null> {
  const key = `${symbol}|${range}|${interval}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  let data: Chart | null = null;
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`,
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(6000) },
    );
    if (res.ok) {
      const r = (await res.json())?.chart?.result?.[0];
      const m = r?.meta;
      if (m?.regularMarketPrice != null) {
        const q = r.indicators?.quote?.[0] || {};
        const ts: number[] = r.timestamp || [];
        data = {
          meta: {
            price: m.regularMarketPrice,
            prev: m.chartPreviousClose ?? m.previousClose ?? m.regularMarketPrice,
            time: m.regularMarketTime,
            currency: m.currency,
            high: m.regularMarketDayHigh,
            low: m.regularMarketDayLow,
            hi52: m.fiftyTwoWeekHigh,
            lo52: m.fiftyTwoWeekLow,
          },
          points: ts
            .map((t, i) => ({
              timestamp: new Date(t * 1000).toISOString(),
              open: q.open?.[i] ?? null,
              high: q.high?.[i] ?? null,
              low: q.low?.[i] ?? null,
              close: q.close?.[i],
              volume: q.volume?.[i] ?? null,
            }))
            .filter((p) => p.close != null),
        };
      }
    }
  } catch {
    data = null;
  }
  cache.set(key, { at: Date.now(), data });
  return data;
}

const r4 = (n: number) => Math.round(n * 10000) / 10000;

/** Aktualisiert ein gespeichertes Instrument mit Live-Werten (gleiche Felder wie das Original). */
export async function liveInstrument<T>(itemIn: T, usdToEur: number | null): Promise<T> {
  const item = itemIn as any;
  const c = await yahooChart(item.provider_symbol || item.symbol);
  if (!c) return itemIn;
  const toEur = item.display_currency === "EUR" && c.meta.currency === "USD" && usdToEur ? usdToEur : 1;
  const price = c.meta.price * toEur;
  const prev = c.meta.prev * toEur;
  const asOf = new Date(c.meta.time * 1000).toISOString();
  return {
    ...item,
    price: r4(price),
    display_price: r4(price),
    original_price: r4(c.meta.price),
    previous_close: r4(prev),
    change: r4(price - prev),
    change_percent: prev ? Math.round(((price - prev) / prev) * 100000) / 1000 : 0,
    as_of: asOf,
    last_updated: new Date().toISOString(),
    data_source: "live",
    market_status: "delayed",
  };
}

export async function liveUsdToEur(): Promise<number | null> {
  const c = await yahooChart("EURUSD=X");
  return c?.meta.price ? 1 / c.meta.price : null;
}
