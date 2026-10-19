import { createFileRoute } from "@tanstack/react-router";
import investmentTopics from "@/data/public-snapshots/investment-topics.json";
import marketOverview from "@/data/public-snapshots/market-overview.json";
import marketStocks from "@/data/public-snapshots/market-stocks.json";
import news from "@/data/public-snapshots/news.json";
import stockDetails from "@/data/public-snapshots/stock-details.json";
import stockResearchDetails from "@/data/public-snapshots/stock-research-details.json";
import stockFundamentals from "@/data/public-snapshots/stock-fundamentals.json";
import newsVideos from "@/data/public-snapshots/news-videos.json";
import reviews from "@/data/public-snapshots/reviews.json";
import stockBundle from "@/data/public-snapshots/stock-bundle.json";
import stockResearch from "@/data/public-snapshots/stock-research.json";
import sparklineDax from "@/data/public-snapshots/sparkline-DAX.json";
import sparklineDji from "@/data/public-snapshots/sparkline-DJI.json";
import sparklineEurUsd from "@/data/public-snapshots/sparkline-EURUSD.json";
import sparklineGold from "@/data/public-snapshots/sparkline-GOLD.json";
import sparklineNdx from "@/data/public-snapshots/sparkline-NDX.json";
import sparklineOil from "@/data/public-snapshots/sparkline-OIL.json";
import sparklineSilver from "@/data/public-snapshots/sparkline-SILVER.json";
import sparklineSpx from "@/data/public-snapshots/sparkline-SPX.json";
// @ts-expect-error JS module
import { REVIEW_TOPICS } from "@/data/reviewTopics";

// Die Original-FastAPI-Endpunkte werden etappenweise auf Lovable Cloud portiert.
// Bis dahin antworten nicht portierte Endpunkte ehrlich mit 503 statt HTML/Fake-Daten.
const unavailable = () =>
  Response.json(
    { detail: "DATA_SOURCE_UNAVAILABLE", message: "Dieser Dienst wird gerade eingerichtet." },
    { status: 503 },
  );

const sparklines: Record<string, unknown> = {
  DAX: sparklineDax,
  DJI: sparklineDji,
  EURUSD: sparklineEurUsd,
  GOLD: sparklineGold,
  NDX: sparklineNdx,
  OIL: sparklineOil,
  SILVER: sparklineSilver,
  SPX: sparklineSpx,
};

async function liveOverview() {
  const { liveInstrument, liveUsdToEur } = await import("@/lib/liveQuotes.server");
  const o = marketOverview as any;
  const fx = await liveUsdToEur();
  const map = (list: any[]) => Promise.all((list || []).map((i) => liveInstrument(i, fx)));
  const [indices, commodities, fxl] = await Promise.all([map(o.indices), map(o.commodities), map(o.fx)]);
  const live = [...indices, ...commodities, ...fxl].some((i) => i.data_source === "live");
  return { ...o, indices, commodities, fx: fxl, last_updated: new Date().toISOString(), data_source_summary: [live ? "live" : "cache"], fx_usd_to_eur: fx ? { rate: fx, updated_at: new Date().toISOString(), source: "live" } : o.fx_usd_to_eur };
}
async function liveStocks() {
  const { liveInstrument } = await import("@/lib/liveQuotes.server");
  const items = await Promise.all(marketStocks.items.map((i: any) => liveInstrument(i, null)));
  return { ...marketStocks, items, last_updated: new Date().toISOString() };
}
const SYMBOL_MAP: Record<string, string> = Object.fromEntries(
  [...(marketOverview as any).indices, ...(marketOverview as any).commodities, ...(marketOverview as any).fx, ...marketStocks.items].map((i: any) => [i.symbol, i.provider_symbol]),
);

const publicSnapshot = async ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  const path = url.pathname;
  {
    const la = await import("@/lib/legacyAccount.server");
    if (la.isLegacyAccountPath(path)) return la.handleLegacyAccount(request);
  }
  {
    // Merkliste, Kursalarme, Aktien- und Börsengang-Katalog, Zeichnungsanfragen.
    const ul = await import("@/lib/userLists.server");
    const r = await ul.handleUserLists(request, path);
    if (r) return r;
  }
  if (/^\/api\/(news|content\/news|news-markte\/feed|stocks\/)/.test(path)) await refreshNewsItems();

  if (path === "/api/news/nachrichten") {
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit")) || 20));
    const skip = Math.max(0, Number(url.searchParams.get("skip")) || 0);
    const items = newsItems.slice(skip, skip + limit);
    return Response.json({ ...news, items, total: newsItems.length, limit, skip, has_more: skip + items.length < newsItems.length, last_updated: newsItems[0]?.published_at ?? news.last_updated });
  }
  if (path === "/api/news-markte/market/overview") return Response.json(await liveOverview());
  if (path === "/api/news-markte/market/stocks") return Response.json(await liveStocks());
  if (path === "/api/news-markte/market/quotes") {
    const symbols = new Set((url.searchParams.get("symbols") || "").toUpperCase().split(",").filter(Boolean));
    const st = await liveStocks();
    return Response.json({ ...st, items: st.items.filter((item: any) => symbols.has(item.symbol)) });
  }
  if (path.startsWith("/api/news-markte/market/sparkline/")) {
    const symbol = decodeURIComponent(path.split("/").pop() || "").toUpperCase();
    const data = sparklines[symbol] as any;
    if (!data) return unavailable();
    const { yahooChart } = await import("@/lib/liveQuotes.server");
    const c = await yahooChart(SYMBOL_MAP[symbol] || symbol, "5d", "60m");
    return Response.json(c?.points.length ? { ...data, points: c.points.map((p) => ({ t: p.timestamp, c: p.close })) } : data);
  }
  if (path === "/api/stock-research") return Response.json(stockResearch);
  if (path === "/api/stocks/bundle") {
    const symbols = new Set((url.searchParams.get("symbols") || "").toUpperCase().split(",").filter(Boolean));
    const items = symbols.size ? stockBundle.items.filter((item) => symbols.has(item.symbol)) : stockBundle.items;
    return Response.json({ ...stockBundle, items, count: items.length });
  }
  if (path.startsWith("/api/content/news")) return newsContent(path, url);
  if (path === "/api/reviews/topics") {
    const items = reviews.items as Array<{ topics?: string[] }>;
    const topics = (REVIEW_TOPICS as Array<{ slug: string; label: string }>).map((t) => ({
      ...t,
      count: items.filter((r) => (r.topics || []).includes(t.slug)).length,
    }));
    return Response.json({ topics, total_approved: items.length });
  }
  if (path === "/api/reviews/stats") {
    const items = reviews.items as Array<{ rating: number }>;
    const total = items.length;
    const average = total ? Math.round((items.reduce((a, r) => a + r.rating, 0) / total) * 10) / 10 : 0;
    const distribution = [5, 4, 3, 2, 1].map((rating) => {
      const count = items.filter((r) => Math.round(r.rating) === rating).length;
      return { rating, count, pct: total ? Math.round((count / total) * 100) : 0 };
    });
    return Response.json({ total, average, distribution });
  }
  if (path === "/api/news-markte/feed") {
    const cat = url.searchParams.get("category");
    const byCat = cat ? newsItems.filter((i) => i.category === cat) : newsItems;
    const list = byCat.length >= 4 ? byCat : newsItems;
    return Response.json({ top: list.slice(0, 1), overview: list.slice(1, 7), weitere: list.slice(7, 15), anleger: list.slice(15, 21) });
  }
  if (path === "/api/news/publishers") {
    const names = new Set<string>();
    for (const i of newsItems as Array<{ source_names?: string[] }>) for (const n of i.source_names || []) names.add(n);
    return Response.json({ publishers: [...names].sort() });
  }
  if (path === "/api/newsletter/digests") return Response.json({ items: [], total: 0 });
  if (path === "/api/investment-topics/active") return Response.json(investmentTopics);
  if (path === "/api/reviews/public") return Response.json(reviews);
  // Marktdaten aus dem letzten gespeicherten Stand (kein Live-Kursanbieter verbunden).
  if (path === "/api/news-markte/markets") {
    const o = await liveOverview();
    const st = await liveStocks();
    return Response.json([...(o.indices || []), ...(o.commodities || []), ...(o.fx || []), ...st.items]);
  }
  // Redaktionelle Module ohne Inhalte im Backup → leere Liste statt Fehler.
  if (["/api/news-markte/anlagetrends", "/api/news-markte/editorial", "/api/news-markte/investment-radar", "/api/news-markte/market-voices"].includes(path)) return Response.json([]);
  if (path === "/api/einordnung" || path === "/api/einordnung/list") return Response.json({ items: [], count: 0, total: 0 });
  if (path === "/api/einordnung/categories") return Response.json({ items: [] });
  if (path.startsWith("/api/einordnung/")) return Response.json({ detail: "not_found" }, { status: 404 });
  if (path.startsWith("/api/news/nachrichten/")) {
    const rest = path.slice("/api/news/nachrichten/".length);
    if (rest.endsWith("/related")) {
      const base = newsItems.find((i) => i.slug === decodeURIComponent(rest.slice(0, -8)));
      const lim = Math.max(1, Math.min(20, Number(url.searchParams.get("limit")) || 4));
      return Response.json({ items: newsItems.filter((i) => i.slug !== base?.slug && (!base || i.category === base.category)).slice(0, lim) });
    }
    const slug = decodeURIComponent(rest);
    const item = newsItems.find((i) => i.slug === slug);
    return item ? Response.json(newsDetail(item)) : Response.json({ detail: "not_found" }, { status: 404 });
  }
  if (path === "/api/stocks/compare/peers") {
    return Response.json({
      peers: COMPARE_PEERS.map((s) => ({ symbol: s, label: COMPANY_LABELS[s] || s })),
      benchmarks: Object.entries(COMPARE_BENCHMARKS).map(([symbol, label]) => ({ symbol, label })),
    });
  }
  if (path === "/api/stocks/compare") return stockCompare(url);
  const researchMatch = path.match(/^\/api\/stocks\/([^/]+)\/research$/);
  if (researchMatch) {
    const sym = decodeURIComponent(researchMatch[1] ?? "").toUpperCase();
    const hit = (stockResearchDetails as any)[sym];
    return Response.json(hit ? { ...hit, data_status: "stale" } : { symbol: sym, data_source: "unavailable" });
  }
  // Analysten, Dividenden, Termine und Meldungen je Aktie aus dem letzten gespeicherten Stand.
  const detailMatch = path.match(/^\/api\/stocks\/([^/]+)\/(analyst|dividends|earnings|news)$/);
  if (detailMatch) {
    const sym = decodeURIComponent(detailMatch[1] ?? "").toUpperCase();
    const kind = detailMatch[2] as "analyst" | "dividends" | "earnings" | "news";
    const sd = stockDetails as any;
    if (kind === "news") {
      let articles = (sd.news[sym] || []) as any[];
      if (!articles.length) {
        const label = (COMPANY_LABELS[sym] || sym).replace(/\b(SE|AG|Inc\.|Corporation|Group|& Co\. KGaA|KGaA|, Inc\.)\b/g, "").replace(/[,.]+$/, "").trim();
        const names = [...new Set([sym, label, ...(STOCK_ALIASES[sym] || [])])].filter((n) => n.length >= 3);
        const re = new RegExp(`\\b(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`);
        articles = newsItems
          .filter((i: any) => re.test(`${i.title || ""} ${i.subtitle || ""} ${i.summary || ""}`))
          .slice(0, 5)
          .map((i: any) => ({ slug: i.slug, title: i.title, subtitle: i.subtitle, summary: i.summary, category: i.category, published_at: i.published_at, source_name: (i.source_names || [])[0] || i.source_name }));
      }
      return Response.json({ symbol: sym, articles, total: articles.length, data_source: "cache" });
    }
    const hit = sd[kind][sym];
    if (hit) return Response.json({ ...hit, data_status: "stale" });
    const empty: Record<string, unknown> = {
      analyst: { recommendations: {}, price_target: {}, valuation: {}, profitability: {}, has_consensus: false, has_target: false },
      dividends: { has_dividends: false, summary: {}, history: [], growth: {}, latest_pay_date: null },
      earnings: { history: [], next: null, important_dates: {}, revenue_reported_available: false },
    };
    return Response.json({ symbol: sym, currency: null, data_source: "unavailable", ...(empty[kind] as object) });
  }
  const stockMatch = path.match(/^\/api\/stocks\/([^/]+)\/(history|fundamentals)$/);
  if (stockMatch) {
    const sym = decodeURIComponent(stockMatch[1] ?? "").toUpperCase();
    if (stockMatch[2] === "history") {
      const rawRange = url.searchParams.get("range") || "1y";
      const range = ({ "7d": "5d", "1m": "1mo", "3m": "3mo", "6m": "6mo", "3y": "5y" } as Record<string, string>)[rawRange] || rawRange;
      const { yahooChart } = await import("@/lib/liveQuotes.server");
      const interval = range === "1d" ? "5m" : range === "5d" ? "60m" : "1d";
      const ysym = SYMBOL_MAP[sym] || (/^[A-Z]{2,5}$/.test(sym) && ["SAP","SIE","ALV","DBK","IFX","RHM","BAS","BMW","VOW3","MBG","DTE","ADS"].includes(sym) ? `${sym}.DE` : sym);
      const c = await yahooChart(ysym, range, interval);
      if (!c?.points.length) return Response.json({ symbol: sym, range, points: [], stats: null, data_status: "unavailable" });
      const closes = c.points.map((p) => p.close);
      const rets = closes.slice(1).map((v, i) => Math.log(v / closes[i]!));
      const mean = rets.reduce((a, b) => a + b, 0) / (rets.length || 1);
      const vol = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length || 1)) * Math.sqrt(252) * 100;
      const vols = c.points.map((p) => p.volume || 0);
      const stats = range === "1y" ? {
        fifty_two_week_high: c.meta.hi52 ?? Math.max(...closes), fifty_two_week_low: c.meta.lo52 ?? Math.min(...closes),
        annualized_volatility_pct: Math.round(vol * 100) / 100,
        one_year_return_pct: Math.round(((closes[closes.length - 1]! / closes[0]!) - 1) * 10000) / 100,
        average_volume: Math.round(vols.reduce((a, b) => a + b, 0) / (vols.length || 1)),
        open_of_day: c.points[c.points.length - 1]?.open ?? null,
      } : null;
      return Response.json({ symbol: sym, range, points: c.points, stats, data_status: "fresh" });
    }
    const item = (stockBundle.items as any[]).find((i) => String(i.symbol).toUpperCase() === sym);
    const base = (stockFundamentals as any)[sym];
    if (!item && !base) return Response.json({ symbol: sym, data_source: "unavailable", data_status: "unavailable" });
    const out: any = { ...(item || {}), ...(base || {}), symbol: sym, data_status: "stale" };
    const { yahooChart } = await import("@/lib/liveQuotes.server");
    const c = await yahooChart(YF_SYMBOL[sym] || sym, "5d", "1d");
    if (c?.meta?.price) {
      const last = c.points[c.points.length - 1];
      Object.assign(out, {
        day_high: c.meta.high ?? out.day_high, day_low: c.meta.low ?? out.day_low,
        previous_close: c.points.length >= 2 ? c.points[c.points.length - 2]!.close : out.previous_close,
        fifty_two_week_high: c.meta.hi52 ?? out.fifty_two_week_high, fifty_two_week_low: c.meta.lo52 ?? out.fifty_two_week_low,
        volume: last?.volume ?? out.volume, current_price: c.meta.price,
        data_source: "yfinance", data_updated_at: new Date(c.meta.time * 1000).toISOString(), data_status: "fresh",
      });
    }
    return Response.json(out);
  }
  if (path === "/api/forex/quotes") {
    const fx = ((marketOverview as any).fx || []) as Array<{ symbol: string; price: number; as_of?: string }>;
    const pairs = (url.searchParams.get("pairs") || "").toUpperCase().split(",").filter(Boolean).slice(0, 20);
    const { yahooChart } = await import("@/lib/liveQuotes.server");
    const items = await Promise.all(pairs.map(async (pair) => {
      const c = /^[A-Z]{6}$/.test(pair) ? await yahooChart(`${pair}=X`) : null;
      if (c) return { pair, rate: c.meta.price, as_of: new Date(c.meta.time * 1000).toISOString(), data_status: "fresh" };
      const hit = fx.find((f) => f.symbol === pair);
      return hit ? { pair, rate: hit.price, as_of: hit.as_of, data_status: "stale" } : { pair, rate: null, data_status: "unavailable" };
    }));
    return Response.json({ items });
  }
  return unavailable();
};

type NewsItem = { slug: string; title: string; summary?: string; category?: string; published_at: string; video_embed_url?: string | null };
const videoItems = newsVideos as Array<{ slug: string; title: string; summary?: string | null }>;
const snapshotNews = (news.items as NewsItem[]).slice().sort((a, b) => b.published_at.localeCompare(a.published_at));
let newsItems: NewsItem[] = snapshotNews;
let lastLive: unknown[] | null = null;
// Aktuelle Beiträge aus Lovable Cloud (stündlicher Abruf) vor den gespeicherten Stand stellen.
// Detailansicht: Volltext als `content`, Originalquelle als `source`/`source_url`.
function newsDetail(i: NewsItem) {
  const a = i as any;
  const src = Array.isArray(a.sources) ? a.sources[0] : null;
  return { ...a, content: a.content || a.full_text || null, source: src?.name || a.source_names?.[0] || a.source_name, source_url: a.source_url || src?.url || null };
}
async function refreshNewsItems() {
  try {
    const { getLiveNews } = await import("@/lib/news/liveNews.server");
    const live = (await getLiveNews()) as NewsItem[];
    if (live === lastLive) return;
    lastLive = live;
    const slugs = new Set(live.map((i) => i.slug));
    newsItems = [...live, ...snapshotNews.filter((i) => !slugs.has(i.slug))].sort((a, b) => b.published_at.localeCompare(a.published_at));
  } catch (e) {
    console.error("refreshNewsItems", e);
  }
}

function newsContent(path: string, url: URL) {
  const q = url.searchParams;
  const limit = Math.max(1, Math.min(100, Number(q.get("limit")) || 20));
  const offset = Math.max(0, Number(q.get("offset")) || 0);
  const rest = path.replace(/^\/api\/content\/news\/?/, "");
  const page = (list: NewsItem[]) => Response.json({ items: list.slice(offset, offset + limit), count: list.length });
  const filtered = () => {
    let list = newsItems;
    const cat = q.get("category");
    if (cat && cat !== "all" && cat !== "alle") {
      const alias: Record<string, string[]> = {
        news: ["politik", "welt", "wirtschaft", "europa", "maerkte"], business: ["wirtschaft", "unternehmen"],
        culture: ["politik", "welt"], "my-europe": ["europa"], climate: ["klima"], aktien: ["maerkte", "unternehmen"],
        anleihen: ["zinsen"], devisen: ["waehrungen"], "etf-fonds": ["maerkte"], adhoc: ["unternehmen"],
      };
      const set = new Set([cat, ...(alias[cat] || [])]);
      list = list.filter((i) => set.has(i.category || ""));
    }
    const term = (q.get("search") || q.get("q") || "").trim().toLowerCase();
    if (term) list = list.filter((i) => `${i.title} ${i.summary || ""}`.toLowerCase().includes(term));
    return list;
  };
  const videoPage = () => {
    const term = (q.get("search") || q.get("q") || "").trim().toLowerCase();
    const list = term ? videoItems.filter((v) => `${v.title} ${v.summary || ""}`.toLowerCase().includes(term)) : videoItems;
    const offset = Number(q.get("offset") || q.get("skip") || 0) || 0;
    return Response.json({ items: list.slice(offset, offset + limit), count: list.length, total: list.length });
  };
  if (rest === "" || rest === "list" || rest === "feed") {
    if (q.get("source") === "videos") return videoPage();
    return page(filtered());
  }
  if (rest === "related") {
    const ex = q.get("exclude_slug");
    return Response.json({ items: newsItems.filter((i) => i.category === q.get("category") && i.slug !== ex).slice(0, limit) });
  }
  if (rest === "search-suggestions") return Response.json({ items: filtered().slice(0, limit).map((i) => ({ slug: i.slug, title: i.title, category: i.category })) });
  if (rest === "videos") return videoPage();
  if (rest === "related-videos") {
    const ex = q.get("exclude_slug");
    return Response.json({ items: videoItems.filter((v) => v.slug !== ex).slice(0, limit) });
  }
  if (rest.startsWith("video/")) {
    const slug = decodeURIComponent(rest.slice(6).replace(/\/view$/, ""));
    if (rest.endsWith("/view")) return new Response(null, { status: 204 });
    const v = videoItems.find((x) => x.slug === slug);
    return v ? Response.json(v) : Response.json({ detail: "not_found" }, { status: 404 });
  }
  const item = newsItems.find((i) => i.slug === decodeURIComponent(rest));
  return item ? Response.json(newsDetail(item)) : Response.json({ detail: "not_found" }, { status: 404 });
}

// Öffentliche Formulare: Eingänge werden in Lovable Cloud gespeichert (form_submissions),
// große Anhänge (PDF/Signaturen) im privaten Ablageort form-attachments.
const SUBMISSION_PREFIXES = ["/api/send-", "/api/wealth-consultation", "/api/newsletter/subscribe", "/api/investment-topics/lead", "/api/reviews/submit", "/api/assistant/handoff"];

async function handlePost({ request }: { request: Request }) {
  const path = new URL(request.url).pathname;
  {
    const ul = await import("@/lib/userLists.server");
    const r = await ul.handleUserLists(request, path);
    if (r) return r;
  }
  if (/^\/api\/content\/news\/.+\/view$/.test(path)) return new Response(null, { status: 204 });
  if (!SUBMISSION_PREFIXES.some((p) => path.startsWith(p))) return unavailable();
  const raw = await request.text();
  if (raw.length > 18_000_000) return Response.json({ error: "Die Anfrage ist zu groß." }, { status: 413 });
  let payload: unknown;
  try { payload = JSON.parse(raw || "{}"); } catch { return Response.json({ error: "Ungültige Anfrage." }, { status: 400 }); }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const id = crypto.randomUUID();
  const paths: string[] = [];
  const strip = async (v: unknown, key: string): Promise<unknown> => {
    if (typeof v === "string" && v.length > 20_000) {
      const b64 = v.replace(/^data:[^,]+,/, "");
      const ext = b64.startsWith("JVBER") ? "pdf" : b64.startsWith("iVBOR") ? "png" : b64.startsWith("/9j/") ? "jpg" : "bin";
      try {
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const file = `${id}/${paths.length + 1}-${key.replace(/[^a-z0-9]/gi, "") || "datei"}.${ext}`;
        const { error } = await supabaseAdmin.storage.from("form-attachments").upload(file, bytes, { contentType: ext === "pdf" ? "application/pdf" : `image/${ext}` });
        if (error) throw error;
        paths.push(file);
        return `[Anhang: ${file}]`;
      } catch { return "[Anhang konnte nicht gespeichert werden]"; }
    }
    if (Array.isArray(v)) return Promise.all(v.map((x, i) => strip(x, `${key}${i}`)));
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v)) out[k] = await strip(x, k);
      return out;
    }
    return v;
  };
  const clean = await strip(payload, "anhang");
  const { error } = await (supabaseAdmin as any).from("form_submissions").insert({ id, kind: path.replace("/api/", ""), payload: clean, attachment_paths: paths });
  if (error) {
    console.error(error);
    return Response.json({ error: "Ihre Angaben konnten nicht gespeichert werden. Bitte versuchen Sie es erneut." }, { status: 500 });
  }
  // Best-effort: Eingang per E-Mail an info@essenceinvest.com melden (Resend).
  const { notifyFormSubmission } = await import("@/lib/resendNotify.server");
  await notifyFormSubmission(path.replace("/api/", ""), clean, paths);
  return Response.json({ success: true, ok: true, id });
}

// PUT/PATCH/DELETE: zuerst die nutzerbezogenen Endpunkte (Merkliste, Alarme), sonst ehrlich 503.
async function byMethod({ request }: { request: Request }) {
  const path = new URL(request.url).pathname;
  const ul = await import("@/lib/userLists.server");
  return (await ul.handleUserLists(request, path)) ?? unavailable();
}

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: { GET: publicSnapshot, POST: handlePost, PUT: byMethod, PATCH: byMethod, DELETE: byMethod },
  },
});


const YF_SYMBOL: Record<string, string> = {
  NVDA: "NVDA", AAPL: "AAPL", MSFT: "MSFT", GOOGL: "GOOGL", AMZN: "AMZN",
  SAP: "SAP.DE", SIE: "SIE.DE", ALV: "ALV.DE", DBK: "DBK.DE", IFX: "IFX.DE", RHM: "RHM.DE",
  DTE: "DTE.DE", MUV2: "MUV2.DE", BAS: "BAS.DE", MBG: "MBG.DE", BMW: "BMW.DE", VOW3: "VOW3.DE",
  EOAN: "EOAN.DE", RWE: "RWE.DE", HEN3: "HEN3.DE", BEI: "BEI.DE", ENR: "ENR.DE", DHL: "DHL.DE",
  VNA: "VNA.DE", FRE: "FRE.DE", CBK: "CBK.DE", ADS: "ADS.DE", NDX: "^NDX", DAX: "^GDAXI", SPX: "^GSPC",
};
const COMPANY_LABELS: Record<string, string> = {
  NVDA: "NVIDIA Corporation", AAPL: "Apple Inc.", MSFT: "Microsoft Corporation", GOOGL: "Alphabet Inc.",
  AMZN: "Amazon.com, Inc.", SAP: "SAP SE", SIE: "Siemens AG", ALV: "Allianz SE", DBK: "Deutsche Bank AG",
  IFX: "Infineon Technologies AG", RHM: "Rheinmetall AG", ADS: "adidas AG", DTE: "Deutsche Telekom AG",
  MUV2: "Münchener Rückversicherungs-Gesellschaft AG", BAS: "BASF SE", MBG: "Mercedes-Benz Group AG",
  BMW: "Bayerische Motoren Werke AG", VOW3: "Volkswagen AG", EOAN: "E.ON SE", RWE: "RWE AG",
  HEN3: "Henkel AG & Co. KGaA", BEI: "Beiersdorf AG", ENR: "Siemens Energy AG", DHL: "DHL Group",
  VNA: "Vonovia SE", FRE: "Fresenius SE & Co. KGaA", CBK: "Commerzbank AG",
};
const COMPARE_PEERS = ["NVDA", "AAPL", "MSFT", "GOOGL", "AMZN", "SAP", "SIE", "ALV", "DBK", "IFX", "RHM"];
const COMPARE_BENCHMARKS: Record<string, string> = { NDX: "Nasdaq-100", DAX: "DAX", SPX: "S&P 500" };
const US_SYMBOLS = new Set(["NVDA", "AAPL", "MSFT", "GOOGL", "AMZN"]);

function riskOf(closes: number[], tdays: number) {
  if (closes.length < 3) return {};
  const rets = closes.slice(1).map((c, i) => c / closes[i]! - 1);
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const sd = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, rets.length - 1));
  let peak = closes[0]!, maxDd = 0;
  for (const c of closes) { peak = Math.max(peak, c); maxDd = Math.min(maxDd, c / peak - 1); }
  const r2 = (v: number) => Math.round(v * 100) / 100;
  return {
    volatility_annual_pct: r2(sd * Math.sqrt(tdays) * 100),
    max_drawdown_pct: r2(maxDd * 100),
    total_return_pct: r2((closes[closes.length - 1]! / closes[0]! - 1) * 100),
    annual_return_pct: r2((Math.pow(closes[closes.length - 1]! / closes[0]!, tdays / (closes.length - 1)) - 1) * 100),
  };
}

async function stockCompare(url: URL) {
  const raw = [...new Set((url.searchParams.get("symbols") || "").toUpperCase().split(",").map((s) => s.trim()).filter(Boolean))];
  if (raw.length < 2 || raw.length > 4) return Response.json({ detail: "Bitte 2 bis 4 Ticker angeben." }, { status: 400 });
  for (const s of raw) if (!YF_SYMBOL[s] || ["NDX", "DAX", "SPX"].includes(s)) return Response.json({ detail: `Ticker ${s} nicht freigeschaltet für Vergleich.` }, { status: 404 });
  const rk = (url.searchParams.get("range") || "1y").toLowerCase();
  const period = ({ "1y": "1y", "3y": "5y", "5y": "5y", max: "max" } as Record<string, string>)[rk];
  if (!period) return Response.json({ detail: `Ungültiger Zeitraum: ${rk}` }, { status: 400 });
  const interval = rk === "max" ? "1wk" : "1d";
  const tdays = rk === "max" ? 52 : 252;
  let bm = (url.searchParams.get("benchmark") || "").toUpperCase() || (US_SYMBOLS.has(raw[0]!) ? "NDX" : "DAX");
  if (!COMPARE_BENCHMARKS[bm]) return Response.json({ detail: "Ungültiger Benchmark" }, { status: 400 });
  const { yahooChart } = await import("@/lib/liveQuotes.server");
  const charts = await Promise.all([...raw, bm].map((s) => yahooChart(YF_SYMBOL[s]!, period, interval)));
  const cutoff = rk === "3y" ? Date.now() - 3 * 365.25 * 864e5 : 0;
  const maps = charts.map((c) => {
    const m = new Map<string, number>();
    for (const p of c?.points || []) if (p.close != null && Date.parse(p.timestamp) >= cutoff) m.set(p.timestamp.slice(0, 10), p.close);
    return m;
  });
  const stockMaps = maps.slice(0, raw.length);
  const benchMap = maps[raw.length]!;
  let common = stockMaps.every((m) => m.size) ? [...stockMaps[0]!.keys()].filter((d) => stockMaps.every((m) => m.has(d))) : [];
  common = common.sort();
  const benchRets: number[] = [];
  { let prev: number | undefined; for (const d of common) { const v = benchMap.get(d); if (v != null) { if (prev) benchRets.push(v / prev - 1); prev = v; } } }
  const series: any[] = [], risk: any[] = [];
  raw.forEach((sym, i) => {
    if (!common.length) { series.push({ symbol: sym, points: [] }); risk.push({ symbol: sym }); return; }
    const closes = common.map((d) => stockMaps[i]!.get(d)!);
    const rets = closes.slice(1).map((c, j) => c / closes[j]! - 1);
    let beta: number | null = null;
    const n = Math.min(rets.length, benchRets.length);
    if (n > 10) {
      const a = rets.slice(-n), b = benchRets.slice(-n);
      const ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n;
      let cov = 0, vb = 0; for (let k = 0; k < n; k++) { cov += (a[k]! - ma) * (b[k]! - mb); vb += (b[k]! - mb) ** 2; }
      beta = vb ? Math.round((cov / vb) * 100) / 100 : null;
    }
    series.push({ symbol: sym, points: common.map((d, j) => ({ t: d, v: Math.round((closes[j]! / closes[0]!) * 1e6) / 1e4 })) });
    risk.push({ symbol: sym, beta, ...riskOf(closes, tdays) });
  });
  let benchmark_series = null;
  const b0 = common.length ? benchMap.get(common[0]!) : undefined;
  if (b0) benchmark_series = { symbol: bm, label: COMPARE_BENCHMARKS[bm], points: common.filter((d) => benchMap.has(d)).map((d) => ({ t: d, v: Math.round((benchMap.get(d)! / b0) * 1e6) / 1e4 })) };
  const fundamentals = raw.map((sym) => {
    const f = (stockFundamentals as any)[sym] || {};
    return { symbol: sym, company_name: f.company_name || COMPANY_LABELS[sym], currency: f.currency, market_cap: f.market_cap, trailing_pe: f.trailing_pe, forward_pe: f.forward_pe, dividend_yield: f.dividend_yield, fifty_two_week_high: f.fifty_two_week_high, fifty_two_week_low: f.fifty_two_week_low };
  });
  return Response.json({
    symbols: raw, range: rk, benchmark: { symbol: bm, label: COMPARE_BENCHMARKS[bm] }, common_days: common.length,
    series, benchmark_series, risk_metrics: risk, fundamentals,
    data_source: common.length ? "yfinance" : "unavailable", data_updated_at: new Date().toISOString(),
  });
}

const STOCK_ALIASES: Record<string, string[]> = {
  BMW: ["BMW"], MBG: ["Mercedes-Benz", "Mercedes"], VOW3: ["Volkswagen", "VW"], DTE: ["Telekom"], MUV2: ["Munich Re", "Münchener Rück"],
  ALV: ["Allianz"], DBK: ["Deutsche Bank"], CBK: ["Commerzbank"], SIE: ["Siemens"], ENR: ["Siemens Energy"], IFX: ["Infineon"],
  RHM: ["Rheinmetall"], BAS: ["BASF"], EOAN: ["Eon", "E.ON"], RWE: ["RWE"], ADS: ["Adidas", "adidas"], DHL: ["DHL"],
  VNA: ["Vonovia"], FRE: ["Fresenius"], HEN3: ["Henkel"], BEI: ["Beiersdorf"], SAP: ["SAP"],
  NVDA: ["Nvidia", "NVIDIA"], AAPL: ["Apple"], MSFT: ["Microsoft"], GOOGL: ["Alphabet", "Google"], AMZN: ["Amazon"],
};
