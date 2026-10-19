import { createOpenAI } from "@ai-sdk/openai";
import { streamText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { createLovableAiGatewayRunIdFetch } from "@/lib/ai/run-id.server";
import { publicDb } from "@/lib/publicDb.server";

/**
 * Aktuelle Nachrichten: frei zugängliche RSS-Feeds (Tagesschau, n-tv, FAZ) werden
 * von der KI in eigenen Worten als Fröhlich-Redaktionsbeitrag zusammengefasst
 * (nur Fakten aus der Quelle, Quelle verlinkt). Bilder der Quellen werden NICHT
 * übernommen (Urheberrecht) — stattdessen passende Unsplash-Motive je Rubrik.
 */

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";
const MAX_CANDIDATES_PER_RUN = 6;
const MAX_PUBLISH_PER_RUN = 4;
const MIN_INTERVAL_MS = 50 * 60 * 1000;

const FEEDS = [
  { url: "https://www.tagesschau.de/wirtschaft/index~rss2.xml", name: "tagesschau.de", hint: "wirtschaft" },
  { url: "https://www.n-tv.de/wirtschaft/rss", name: "n-tv.de", hint: "wirtschaft" },
  { url: "https://www.faz.net/rss/aktuell/wirtschaft/", name: "FAZ", hint: "wirtschaft" },
  { url: "https://www.tagesschau.de/ausland/index~rss2.xml", name: "tagesschau.de", hint: "welt" },
  { url: "https://www.tagesschau.de/inland/index~rss2.xml", name: "tagesschau.de", hint: "politik" },
];

const CATEGORIES = ["wirtschaft", "maerkte", "unternehmen", "politik", "europa", "welt", "zinsen", "waehrungen", "rohstoffe", "klima"] as const;
type Category = (typeof CATEGORIES)[number];

const u = (id: string) => `https://images.unsplash.com/photo-${id}?w=1600&q=75`;
const IMAGES: Record<Category, string[]> = {
  maerkte: ["1611974789855-9c2a0a7236a3", "1590283603385-17ffb3a7f29f", "1642790106117-e829e14a795f", "1535320903710-d993d3d77d29", "1518186285589-2f7649de83e0", "1529107386315-e1a2ed48a620", "1621761191319-c6fb62004040", "1551288049-bebda4e38f71", "1543286386-713bdd548da4", "1460925895917-afdab827c52f"],
  wirtschaft: ["1579532537598-459ecdaf39cc", "1486406146926-c627a92ad1ab", "1449157291145-7efd050a4d0e", "1477959858617-67f85cf4f1df", "1580519542036-c47de6196ba5", "1444653614773-995cb1ef9efa", "1516245834210-c4c142787335", "1556761175-5973dc0f32e7", "1520607162513-77705c0f0d4a", "1554224155-6726b3ff858f"],
  unternehmen: ["1486406146926-c627a92ad1ab", "1449157291145-7efd050a4d0e", "1600880292203-757bb62b4baf", "1556761175-5973dc0f32e7", "1520607162513-77705c0f0d4a", "1507679799987-c73779587ccf", "1563986768609-322da13575f3", "1586528116311-ad8dd3c8310d"],
  politik: ["1541872703-74c5e44368f9", "1451187580459-43490279c0fa", "1504711434969-e33886168f5c", "1495020689067-958852a7765e", "1585829365295-ab7cd400c167", "1588681664899-f142ff2dc9b1"],
  europa: ["1541872703-74c5e44368f9", "1580048915913-4f8f5cb481c4", "1451187580459-43490279c0fa", "1504711434969-e33886168f5c", "1495020689067-958852a7765e"],
  welt: ["1451187580459-43490279c0fa", "1504711434969-e33886168f5c", "1495020689067-958852a7765e", "1585829365295-ab7cd400c167", "1588681664899-f142ff2dc9b1", "1494412574643-ff11b0a5c1c3"],
  zinsen: ["1526304640581-d334cdbbf45e", "1565514020179-026b92b84bb6", "1580048915913-4f8f5cb481c4", "1554224155-6726b3ff858f", "1559526324-4b87b5e36e44"],
  waehrungen: ["1580048915913-4f8f5cb481c4", "1526304640581-d334cdbbf45e", "1610375461246-83df859d849d", "1565514020179-026b92b84bb6"],
  rohstoffe: ["1610375461246-83df859d849d", "1518458028785-8fbcd101ebb9", "1578575437130-527eed3abbec", "1494412574643-ff11b0a5c1c3", "1586528116311-ad8dd3c8310d"],
  klima: ["1473341304170-971dccb5ac1e", "1466611653911-95081537e5b7", "1497435334941-8c899ee9e8e9", "1509391366360-2e959784a276", "1532601224476-15c79f2f7a51"],
};

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
const stripTags = (s: string) => decode(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

type FeedItem = { title: string; link: string; description: string; published_at: string; source: string; hint: string };

async function readFeed(feed: (typeof FEEDS)[number]): Promise<FeedItem[]> {
  try {
    const res = await fetch(feed.url, { headers: { "User-Agent": "Mozilla/5.0 (FroehlichNewsBot)" } });
    if (!res.ok) return [];
    const xml = await res.text();
    const out: FeedItem[] = [];
    for (const m of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/g)) {
      const block = m[0];
      const tag = (t: string) => block.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`))?.[1] ?? "";
      const link = decode(tag("link"));
      const title = stripTags(tag("title"));
      const date = new Date(decode(tag("pubDate")) || decode(tag("dc:date")));
      if (!link.startsWith("https://") || !title || Number.isNaN(date.getTime())) continue;
      // Liveblogs, Videos und Bildergalerien eignen sich nicht als Meldung.
      if (/liveblog|\/video|\/multimedia|bilderserie|podcast|newsticker/i.test(link)) continue;
      out.push({ title, link, description: stripTags(tag("description")), published_at: date.toISOString(), source: feed.name, hint: feed.hint });
    }
    return out;
  } catch {
    return [];
  }
}

async function readArticleText(url: string) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (FroehlichNewsBot)" } });
    if (!res.ok) return "";
    const html = (await res.text()).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "");
    const paras = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((m) => stripTags(m[1] ?? ""))
      .filter((p) => p.length > 60 && !/cookie|javascript|newsletter|abonnieren|datenschutz/i.test(p));
    return paras.join("\n").slice(0, 7000);
  } catch {
    return "";
  }
}

const ArticleSchema = z.object({
  relevant: z.boolean(),
  category: z.enum(CATEGORIES),
  title: z.string(),
  subtitle: z.string(),
  summary: z.string(),
  article_content: z.string(),
  tags: z.array(z.string()),
  relevance_score: z.number(),
});

const INSTRUCTIONS = `Du bist Redakteur der „Fröhlich Vermögensberatung" (Finanz-Nachrichten für Privatanleger in Deutschland).
Du erhältst eine aktuelle Meldung einer Nachrichtenquelle. Schreibe daraus einen eigenständigen Beitrag in deinen eigenen Worten.
Regeln:
- Verwende ausschließlich Fakten aus dem gelieferten Quelltext. Erfinde keine Zahlen, Zitate, Namen oder Ereignisse.
- Keine wörtlichen Übernahmen längerer Passagen; keine Anlageempfehlung.
- relevant = true nur, wenn die Meldung für Wirtschaft, Finanzmärkte, Politik mit wirtschaftlicher Bedeutung, Geldanlage, Zinsen, Energie oder Unternehmen von Interesse ist. Sport, Promi, Unfälle, Kriminalität ohne Wirtschaftsbezug → false.
- category: passende Rubrik aus der Liste.
- title: sachliche Überschrift, max. 90 Zeichen. subtitle: ein Satz, max. 160 Zeichen.
- summary: 2 Sätze, max. 300 Zeichen.
- article_content: Markdown mit genau diesen Abschnitten: "## Was ist passiert?", "## Hintergrund", "## Was bedeutet das für Anleger?" — insgesamt 220–380 Wörter. Der letzte Abschnitt ordnet neutral ein; wenn die Quelle keinen Anlagebezug hergibt, erkläre kurz und vorsichtig die mögliche wirtschaftliche Bedeutung.
- tags: 2–5 kurze deutsche Schlagwörter.
- relevance_score: 0–100 (Bedeutung für Anleger).`;

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

class GatewayStop extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function writeArticle(item: FeedItem, text: string, apiKey: string) {
  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  const result = streamText({
    model: provider.responses(MODEL),
    system: INSTRUCTIONS,
    prompt: `Quelle: ${item.source}\nRubrik-Hinweis: ${item.hint}\nVeröffentlicht: ${item.published_at}\nÜberschrift: ${item.title}\nAnreißer: ${item.description}\n\nText:\n${text}`,
    output: Output.object({ schema: ArticleSchema }),
    maxRetries: 0,
    providerOptions: {
      openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] },
    },
  });
  try {
    return ArticleSchema.parse(await result.output);
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) return null;
    const status = Number((error as { statusCode?: number })?.statusCode) || 0;
    if (status === 402 || status === 403 || status === 429 || status >= 500) {
      throw new GatewayStop(status, String((error as Error)?.message || "").slice(0, 300));
    }
    return null;
  }
}

type Admin = any;

export async function runNewsSync() {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { ok: false, detail: "LOVABLE_API_KEY fehlt" };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as Admin;
  const now = new Date();

  // Single-flight-Sperre + Mindestabstand zwischen zwei Läufen.
  const { data: locked } = await db
    .from("news_sync_state")
    .update({ locked_until: new Date(now.getTime() + 10 * 60 * 1000).toISOString(), updated_at: now.toISOString() })
    .eq("id", 1)
    .or(`locked_until.is.null,locked_until.lt.${now.toISOString()}`)
    .or(`last_run_at.is.null,last_run_at.lt.${new Date(now.getTime() - MIN_INTERVAL_MS).toISOString()}`)
    .select("paused_reason");
  if (!locked?.length) return { ok: true, skipped: "locked_or_too_soon" };
  const paused = locked[0].paused_reason as string | null;

  const result = { ok: true, published: 0, skipped: 0, failed: 0, paused: paused ?? null as string | null };
  try {
    const all = (await Promise.all(FEEDS.map(readFeed))).flat();
    const fresh = all
      .filter((i) => now.getTime() - new Date(i.published_at).getTime() < 36 * 3600 * 1000)
      .sort((a, b) => b.published_at.localeCompare(a.published_at));
    const uniq = [...new Map(fresh.map((i) => [i.link, i])).values()];
    const { data: seenRows } = await db.from("news_source_seen").select("source_url").in("source_url", uniq.slice(0, 200).map((i) => i.link));
    const seen = new Set((seenRows ?? []).map((r: { source_url: string }) => r.source_url));
    // Feeds abwechselnd berücksichtigen, damit nicht nur eine Quelle dominiert.
    const queue = uniq.filter((i) => !seen.has(i.link));
    const byFeed = new Map<string, FeedItem[]>();
    for (const i of queue) byFeed.set(i.source + i.hint, [...(byFeed.get(i.source + i.hint) ?? []), i]);
    const picks: FeedItem[] = [];
    while (picks.length < MAX_CANDIDATES_PER_RUN && [...byFeed.values()].some((l) => l.length)) {
      for (const l of byFeed.values()) if (l.length && picks.length < MAX_CANDIDATES_PER_RUN) picks.push(l.shift()!);
    }
    // Pausiert (Guthaben/Richtlinie): höchstens ein Probe-Beitrag pro Lauf.
    const limit = paused ? 1 : picks.length;

    for (const item of picks.slice(0, limit)) {
      if (result.published >= MAX_PUBLISH_PER_RUN) break;
      const text = await readArticleText(item.link);
      if (text.length < 400) {
        await db.from("news_source_seen").upsert({ source_url: item.link, status: "too_short" });
        result.skipped++;
        continue;
      }
      let art: z.infer<typeof ArticleSchema> | null;
      try {
        art = await writeArticle(item, text, apiKey);
      } catch (e) {
        if (e instanceof GatewayStop) {
          if (e.status === 402 || e.status === 403) {
            await db.from("news_sync_state").update({ paused_reason: `${e.status}: ${e.message}` }).eq("id", 1);
            result.paused = `${e.status}`;
          }
          result.failed++;
          break; // 429/5xx: nächster geplanter Lauf versucht es erneut
        }
        throw e;
      }
      if (paused) {
        await db.from("news_sync_state").update({ paused_reason: null }).eq("id", 1);
        result.paused = null;
      }
      if (!art || !art.relevant || art.article_content.length < 400) {
        await db.from("news_source_seen").upsert({ source_url: item.link, status: art ? "irrelevant" : "no_output" });
        result.skipped++;
        continue;
      }
      const slug = `${slugify(art.title)}-${hash(item.link).toString(36).slice(0, 5)}`;
      const { count } = await db.from("live_news").select("id", { count: "exact", head: true }).eq("category", art.category);
      const pool = IMAGES[art.category];
      const image = u(pool[(count ?? 0) % pool.length]!);
      const words = art.article_content.split(/\s+/).length;
      const doc = {
        id: slug,
        slug,
        title: art.title,
        subtitle: art.subtitle,
        summary: art.summary,
        article_content: art.summary,
        full_text: art.article_content,
        category: art.category,
        tags: art.tags,
        published_at: item.published_at,
        updated_at: new Date().toISOString(),
        image_url: image,
        hero_image_url: image,
        image_author: null,
        image_source: "Unsplash",
        image_attribution: "Foto: Unsplash",
        source: "news-synthesis",
        source_name: "Fröhlich Redaktion",
        sources: [{ name: item.source, url: item.link, title: item.title, published_at: item.published_at }],
        source_names: [item.source],
        source_url: item.link,
        content_type: "news_synthesis",
        language: "de",
        license_allows_fulltext: true,
        relevance_score: Math.max(0, Math.min(100, Math.round(art.relevance_score))),
        is_top_news: art.relevance_score >= 70,
        read_time_minutes: Math.max(1, Math.round(words / 200)),
        views: 0,
        is_demo: false,
      };
      const { error } = await db.from("live_news").insert({ slug, source_url: item.link, category: art.category, published_at: item.published_at, doc });
      await db.from("news_source_seen").upsert({ source_url: item.link, status: error ? "insert_failed" : "published" });
      if (error) result.failed++;
      else result.published++;
    }
  } finally {
    await db
      .from("news_sync_state")
      .update({ locked_until: null, last_run_at: new Date().toISOString(), last_result: result, updated_at: new Date().toISOString() })
      .eq("id", 1);
  }
  return result;
}

// ---- Lesen: aktuelle Beiträge, 60 s im Speicher gehalten ----
let cache: { at: number; items: any[] } = { at: 0, items: [] };

export async function getLiveNews(): Promise<any[]> {
  if (Date.now() - cache.at < 60_000) return cache.items;
  try {
    const { data, error } = await (publicDb() as any)
      .from("live_news")
      .select("doc")
      .order("published_at", { ascending: false })
      .limit(400);
    if (error) throw error;
    cache = { at: Date.now(), items: (data ?? []).map((r: { doc: unknown }) => r.doc) };
  } catch (e) {
    console.error("live_news", e);
    cache = { at: Date.now() - 45_000, items: cache.items };
  }
  return cache.items;
}
