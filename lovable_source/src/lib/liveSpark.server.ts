// Sammel-Kursabfrage (Yahoo „spark", ein Aufruf für viele Werte, kein Schlüssel nötig).
const cache = new Map<string, { at: number; price: number; prev: number; time: number }>();
const TTL = 4_000;

export async function sparkQuotes(symbols: string[]) {
  const now = Date.now();
  const need = [...new Set(symbols)].filter((s) => { const h = cache.get(s); return !h || now - h.at > TTL; });
  for (let i = 0; i < need.length; i += 20) {
    const part = need.slice(i, i + 20);
    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/spark?symbols=${part.map(encodeURIComponent).join(",")}&range=1d&interval=1d`,
        { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      const j = await res.json();
      for (const s of part) {
        const r = j?.[s];
        const price = r?.close?.[r.close.length - 1] ?? r?.fulldayPrice;
        if (price == null) continue;
        cache.set(s, { at: now, price: Number(price), prev: Number(r.chartPreviousClose ?? price), time: Number(r.timestamp?.[r.timestamp.length - 1] ?? now / 1000) });
      }
    } catch { /* Rückfall: letzter gespeicherter Stand */ }
  }
  return cache;
}
