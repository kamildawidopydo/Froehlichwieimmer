"""News aggregation + Claude-Sonnet-5 synthesis pipeline.

Production Notes
----------------
- Faktenquellen: ausschließlich seriöse, kostenlose Feeds (Tagesschau, DW,
  EZB, Bundesbank, BaFin, EU-Kommission).
- Volltexte werden NICHT kopiert. Der finale Artikel wird eigenständig
  von Claude Sonnet 5 formuliert (500–900 Wörter, ggf. kürzer bei sehr
  kleiner Faktenlage).
- Bilder kommen ausschließlich über die offizielle Unsplash-API (nicht
  über die abgeschaltete `source.unsplash.com`-URL). Attribution wird
  gespeichert und auf der Detailseite angezeigt.
- Themenfilter: nur wirtschafts-/finanzrelevante Meldungen. Sport,
  Boulevard, Lifestyle, Promi und lokale Kriminalmeldungen werden
  explizit ausgeschlossen.
- Duplikate: mehrstufige Erkennung (Fingerprint, Titel-Ähnlichkeit,
  Institutionsüberschneidung, Zeitfenster). Bei erkanntem Duplikat wird
  der bestehende Artikel aktualisiert statt einen neuen anzulegen.
- Qualitäts-Gate: Artikel, die nicht alle Kriterien erfüllen, werden mit
  `status=needs_review` gespeichert (nicht veröffentlicht).

Two entry points:
  - `fetch_feeds(db)`      → alle 15 Min via Cron. Rohe Meldungen cachen.
  - `synthesize_pending(db)` → alle 60 Min via Cron. Bis zu N neue Artikel
                              synthetisieren, Qualitäts-Gate, Mongo-Save.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import re
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

import feedparser
import httpx
from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger("news_synthesizer")

# ---------------------------------------------------------------------------
# Sources
# ---------------------------------------------------------------------------
FEEDS = [
    {"name": "Tagesschau",          "url": "https://www.tagesschau.de/wirtschaft/index~rss2.xml",       "weight": 1.0, "primary": False},
    {"name": "Tagesschau Inland",   "url": "https://www.tagesschau.de/inland/index~rss2.xml",           "weight": 0.6, "primary": False},
    {"name": "Deutsche Welle",      "url": "https://rss.dw.com/xml/rss-de-eco",                          "weight": 1.0, "primary": False},
    {"name": "EZB",                 "url": "https://www.ecb.europa.eu/rss/press.html",                   "weight": 1.6, "primary": True},
    {"name": "Deutsche Bundesbank", "url": "https://www.bundesbank.de/service/rss/de/633286/feed.rss",   "weight": 1.5, "primary": True},
    {"name": "BaFin",               "url": "https://www.bafin.de/SharedDocs/RSSFeeds/DE/pressemitteilung.xml", "weight": 1.4, "primary": True},
    {"name": "EU-Kommission (DE)",  "url": "https://ec.europa.eu/commission/presscorner/api/rss?language=DE", "weight": 1.3, "primary": True},
]

# ---------------------------------------------------------------------------
# Topic filter — Vermögensberatungs-relevante Themen
# ---------------------------------------------------------------------------
RELEVANT_KEYWORDS = [
    "dax", "s&p", "sp 500", "sp500", "nasdaq", "aktien", "börse", "boerse",
    "ezb", "fed", "federal reserve", "zins", "leitzins",
    "inflation", "konjunktur", "bip", "wachstum", "rezession",
    "unternehmen", "quartalszahlen", "bilanz", "gewinn", "umsatz",
    "banken", "bank ", "energie", "gold", "öl", "oel", "erdöl", "brent", "wti",
    "rohstoff", "eur/usd", "eur usd", "euro", "dollar",
    "staatsanleihen", "anleihe", "bond",
    "wirtschaftspolitik", "finanzpolitik", "haushalt", "schuldenbremse",
    "geopolit", "sanktion", "handel", "zölle", "zoll", "arbeitsmarkt",
    "verbraucherpreis", "ifo", "zew", "einkaufsmanager", "pmi",
    "wirtschaft", "finanzmarkt", "kapitalmarkt", "notenbank", "geldpolitik",
]

# Themen, die klar ausgeschlossen werden — auch wenn RELEVANT_KEYWORDS matchen
EXCLUDE_KEYWORDS = [
    "champions league", "bundesliga", "olymp", "wm ", "em ",
    "buchmesse", "filmfest", "oscar", "musikpreis", "prom", "royals",
    "unfall in", "verkehrsunfall", "brand in ", "polizei ermittelt",
    "einbruch", "diebstahl", "rezept", "lifestyle", "beauty",
    "mode ", "fashion", "instagram", "tiktok", "influencer",
]

# ---------------------------------------------------------------------------
# Categories (aligned with public /news taxonomy)
# ---------------------------------------------------------------------------
CATEGORY_MAP = {
    "wirtschaft": ["wirtschaft", "börse", "aktien", "dax", "s&p", "nasdaq", "unternehmen", "quartals", "bilanz", "konjunktur"],
    "europa":     ["ezb", "eu-", "europa", "brüssel", "eurozone", "bundesbank"],
    "politik":    ["bundestag", "regierung", "kanzler", "koalition", "gesetz", "beschluss", "wahl"],
    "welt":       ["usa", "china", "fed", "biden", "trump", "russland", "ukraine", "japan", "indien"],
    "umwelt":     ["klima", "energie", "co2", "erneuerbar", "atom", "solar", "wind"],
    "wissen":     ["forschung", "studie", "wissenschaft"],
}
DEFAULT_CATEGORY = "wirtschaft"

# Kategorie → passendes Unsplash-Query
UNSPLASH_QUERY_MAP = {
    "wirtschaft": "frankfurt stock exchange",
    "europa":     "european central bank frankfurt",
    "politik":    "berlin reichstag politics",
    "welt":       "world economy globe",
    "umwelt":     "renewable energy wind",
    "wissen":     "research laboratory science",
}

# Thematische Feinsteuerung für Bilder anhand Titel-Keywords
IMAGE_KEYWORD_OVERRIDES = [
    (["ezb", "european central bank", "eurozone"], "european central bank frankfurt"),
    (["bundesbank"],                                "deutsche bundesbank frankfurt"),
    (["fed", "federal reserve"],                    "federal reserve washington"),
    (["dax"],                                       "frankfurt stock exchange dax"),
    (["s&p", "s&p 500", "nasdaq", "wall street"],   "wall street new york"),
    (["gold"],                                      "gold bars finance"),
    (["öl", "oel", "brent", "wti", "erdöl"],        "oil refinery industry"),
    (["bafin"],                                     "financial regulation office"),
    (["eur/usd", "euro dollar", "eur usd"],         "euro dollar currency"),
    (["staatsanleih", "anleih", "bond"],            "bond market finance"),
    (["inflation"],                                 "supermarket prices inflation"),
    (["arbeitsmarkt", "arbeitslos"],                "employment office germany"),
    (["china"],                                     "shanghai skyline finance"),
    (["ukraine"],                                   "ukraine economy"),
    (["klima", "co2"],                              "climate industry emissions"),
]

# ---------------------------------------------------------------------------
# Quality thresholds
# ---------------------------------------------------------------------------
MIN_WORDS = 350
IDEAL_MIN_WORDS = 500
IDEAL_MAX_WORDS = 900

# Duplikat-Zeitfenster: gleiche Institution + ähnliche Kernaussage innerhalb 24 h
DUP_TIME_WINDOW = timedelta(hours=24)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _slugify(v: str) -> str:
    v = (v or "").lower()
    v = v.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    v = re.sub(r"\s+", "-", v.strip())
    return re.sub(r"[^a-z0-9-]+", "", v)[:80]


def _detect_category(text: str) -> str:
    text_lower = (text or "").lower()
    best = (DEFAULT_CATEGORY, 0)
    for cat, keys in CATEGORY_MAP.items():
        hits = sum(1 for k in keys if k in text_lower)
        if hits > best[1]:
            best = (cat, hits)
    return best[0]


def _is_relevant(entry_text: str) -> bool:
    t = (entry_text or "").lower()
    if any(x in t for x in EXCLUDE_KEYWORDS):
        return False
    return any(k in t for k in RELEVANT_KEYWORDS)


def _fingerprint(title: str) -> str:
    key = re.sub(r"\W+", " ", (title or "").lower()).strip()
    return hashlib.sha1(key.encode()).hexdigest()


_STOPWORDS = {
    "der", "die", "das", "und", "oder", "aber", "im", "in", "an", "auf", "mit",
    "für", "von", "zu", "zur", "zum", "des", "dem", "den", "ein", "eine", "einer",
    "ist", "sind", "war", "wird", "werden", "wurde", "hat", "haben", "als", "auch",
    "nach", "vor", "bei", "über", "unter", "sich", "nicht", "kein", "keine",
    "prozent", "million", "milliarde", "milliarden", "millionen",
}


def _norm_tokens(text: str) -> set[str]:
    tokens = re.findall(r"[a-zäöüß0-9]{4,}", (text or "").lower())
    return {t for t in tokens if t not in _STOPWORDS}


def _title_similarity(a: str, b: str) -> float:
    ta, tb = _norm_tokens(a), _norm_tokens(b)
    if not ta or not tb:
        return 0.0
    inter = len(ta & tb)
    union = len(ta | tb)
    return inter / union if union else 0.0


# ---------------------------------------------------------------------------
# Unsplash — official API with attribution
# ---------------------------------------------------------------------------

def _image_query_for(category: str, title: str) -> str:
    t = (title or "").lower()
    for keys, q in IMAGE_KEYWORD_OVERRIDES:
        if any(k in t for k in keys):
            return q
    return UNSPLASH_QUERY_MAP.get(category, UNSPLASH_QUERY_MAP[DEFAULT_CATEGORY])


# Neutrale Fallback-Bilder aus Unsplash CDN (keine API nötig, öffentlich).
# Werden nur genutzt, wenn UNSPLASH_ACCESS_KEY fehlt oder Rate-Limit greift.
FALLBACK_IMAGES = {
    "wirtschaft": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1600&q=75",
    "europa":     "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=1600&q=75",
    "politik":    "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1600&q=75",
    "welt":       "https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=1600&q=75",
    "umwelt":     "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1600&q=75",
    "wissen":     "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=75",
}


async def _fetch_unsplash_image(category: str, title: str) -> dict:
    """Return dict: image_url, hero_image_url, image_author, image_source, image_source_url, image_attribution."""
    key = os.environ.get("UNSPLASH_ACCESS_KEY", "").strip()
    query = _image_query_for(category, title)
    fallback = {
        "image_url": FALLBACK_IMAGES.get(category, FALLBACK_IMAGES[DEFAULT_CATEGORY]),
        "hero_image_url": FALLBACK_IMAGES.get(category, FALLBACK_IMAGES[DEFAULT_CATEGORY]),
        "image_author": None,
        "image_source": "Unsplash",
        "image_source_url": None,
        "image_attribution": "Foto: Unsplash",
    }
    if not key:
        logger.info("unsplash: no UNSPLASH_ACCESS_KEY set — using fallback image for %s", category)
        return fallback
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(
                "https://api.unsplash.com/search/photos",
                params={"query": query, "per_page": 5, "orientation": "landscape", "content_filter": "high"},
                headers={"Authorization": f"Client-ID {key}", "Accept-Version": "v1"},
            )
        if r.status_code != 200:
            logger.warning("unsplash: HTTP %s for query=%s", r.status_code, query)
            return fallback
        data = r.json()
        results = data.get("results") or []
        if not results:
            return fallback
        pick = results[0]
        urls = pick.get("urls") or {}
        user = pick.get("user") or {}
        photo_link = pick.get("links", {}).get("html")
        # Unsplash Guideline: hotlink via `urls.regular`, add utm & attribution.
        utm = "?utm_source=froehlich_vermoegensberatung&utm_medium=referral"
        img = urls.get("regular") or urls.get("full") or urls.get("small")
        hero = urls.get("full") or urls.get("regular") or img
        author_name = user.get("name") or "Unsplash Fotograf"
        author_link = (user.get("links") or {}).get("html")
        attribution = f'Foto: {author_name} auf Unsplash'
        return {
            "image_url": img,
            "hero_image_url": hero,
            "image_author": author_name,
            "image_author_url": (author_link + utm) if author_link else None,
            "image_source": "Unsplash",
            "image_source_url": (photo_link + utm) if photo_link else None,
            "image_attribution": attribution,
        }
    except Exception as exc:  # noqa: BLE001
        logger.warning("unsplash: request failed for query=%s: %s", query, exc)
        return fallback


# ---------------------------------------------------------------------------
# Feed fetcher
# ---------------------------------------------------------------------------

async def fetch_feeds(db) -> dict:
    """Ziehe alle RSS-Feeds und persistiere neue relevante Roh-Items."""
    stats = {"fetched": 0, "relevant": 0, "new": 0, "merged": 0, "errors": []}
    now = datetime.now(timezone.utc)
    for feed_cfg in FEEDS:
        try:
            parsed = feedparser.parse(feed_cfg["url"])
            entries = parsed.entries or []
        except Exception as exc:  # noqa: BLE001
            logger.warning("feed_fetch_failed name=%s err=%s", feed_cfg["name"], exc)
            stats["errors"].append(feed_cfg["name"])
            continue
        logger.info("feed_ok name=%s entries=%d", feed_cfg["name"], len(entries))
        for entry in entries[:15]:
            stats["fetched"] += 1
            title = (entry.get("title") or "").strip()
            summary = (entry.get("summary") or entry.get("description") or "").strip()
            summary = re.sub(r"<[^>]+>", " ", summary)
            summary = re.sub(r"\s+", " ", summary)
            link = entry.get("link")
            if not title or not link:
                continue
            body_text = f"{title} {summary}"
            if not _is_relevant(body_text):
                continue
            stats["relevant"] += 1
            fp = _fingerprint(title)
            existing = await db.news_raw.find_one({"fingerprint": fp})
            if existing:
                # Zweitquelle für dasselbe Ereignis → ideal für Bestätigung.
                if feed_cfg["name"] not in existing.get("source_names", []):
                    await db.news_raw.update_one(
                        {"_id": existing["_id"]},
                        {"$addToSet": {"source_names": feed_cfg["name"], "source_urls": link},
                         "$set":     {"updated_at": now,
                                      "source_weight_max": max(existing.get("source_weight_max", 0),
                                                                feed_cfg["weight"])}},
                    )
                    stats["merged"] += 1
                continue
            await db.news_raw.insert_one({
                "fingerprint": fp,
                "title": title,
                "summary": summary[:2000],
                "source_names": [feed_cfg["name"]],
                "source_urls":  [link],
                "source_weight": feed_cfg["weight"],
                "source_weight_max": feed_cfg["weight"],
                "primary_source": feed_cfg["primary"],
                "fetched_at": now,
                "published_raw": entry.get("published") or entry.get("updated"),
                "used_for_synthesis": False,
            })
            stats["new"] += 1
    logger.info("fetch_feeds_summary %s", stats)
    return stats


# ---------------------------------------------------------------------------
# LLM synthesis
# ---------------------------------------------------------------------------
_SYSTEM_PROMPT = (
    "Du bist ein erfahrener deutscher Wirtschafts- und Finanzredakteur der Fröhlich "
    "Vermögensberatung GmbH. Du erstellst aus offiziellen Fakten (Tagesschau, EZB, "
    "Bundesbank, DW, EU-Kommission, BaFin) eigenständige, seriöse deutsche "
    "Nachrichtenartikel für Kunden einer Vermögensberatung.\n\n"
    "ABSOLUTE REGELN:\n"
    "1. NIEMALS Fremdtexte 1:1 übernehmen. Umformulieren in eigener Redaktionssprache.\n"
    "2. NIEMALS Zahlen, Zitate oder konkrete Aussagen erfinden. Nur verwenden, was "
    "   explizit in den bereitgestellten Fakten steht. Wenn eine Zahl unklar ist, "
    "   allgemein formulieren statt raten.\n"
    "3. NIEMALS Kauf-/Verkaufsempfehlungen, keine individuelle Anlageberatung.\n"
    "4. Ton: sachlich, neutral, präzise. Kein Clickbait. Keine Superlative ohne Beleg.\n"
    "5. Umfang: 500–900 Wörter. Bei sehr kleiner Faktenlage darf der Artikel kürzer "
    "   sein (min. 350 Wörter), aber niemals künstlich aufgebläht.\n\n"
    "PFLICHT-STRUKTUR mit `## `-Zwischenüberschriften (in dieser Reihenfolge):\n"
    "  ## Was ist passiert?\n"
    "  ## Der Hintergrund\n"
    "  ## Warum ist das für Wirtschaft und Märkte wichtig?\n"
    "  ## Was bedeutet das für Anleger?\n"
    "  ## Was jetzt wichtig wird\n"
    "Der Abschnitt „Was jetzt wichtig wird“ enthält 2–5 klare Beobachtungspunkte "
    "als Aufzählung (Bullet Points mit `- `). Keine Anlageempfehlungen — nur "
    "Beobachtungspunkte, was Anleger im Auge behalten sollten.\n\n"
    "ANTWORTFORMAT: Antworte AUSSCHLIESSLICH mit einem gültigen JSON-Objekt "
    "(kein Codefence, kein zusätzlicher Text) mit den Feldern:\n"
    "  - title      (string, seriöse, konkrete Schlagzeile ohne Clickbait)\n"
    "  - subtitle   (string, kurzer erläuternder Untertitel)\n"
    "  - summary    (string, 2–3 Sätze mit der wichtigsten Aussage)\n"
    "  - content    (string, gesamter Artikel mit `## `-Zwischenüberschriften)\n"
)


async def _synthesize_article(raw_items: List[dict]) -> Optional[dict]:
    """Bündelt raw-Items zu einem Artikel via Claude Sonnet 5."""
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        logger.error("EMERGENT_LLM_KEY missing — synthesis skipped")
        return None
    facts = "\n\n".join(
        f"[Quelle: {', '.join(r.get('source_names', []))}]\nTitel: {r['title']}\nInhalt: {r['summary']}"
        for r in raw_items
    )
    chat = LlmChat(
        api_key=api_key,
        session_id=f"news-{raw_items[0]['fingerprint'][:8]}",
        system_message=_SYSTEM_PROMPT,
    ).with_model("anthropic", "claude-sonnet-5")
    user = UserMessage(text=(
        "Erstelle einen eigenständigen deutschen Nachrichtenartikel aus folgenden "
        "Fakten. Halte dich strikt an die vorgegebene Struktur und das JSON-Format.\n\n"
        + facts
    ))
    try:
        response = await chat.send_message(user)
        raw = getattr(response, "text", None) or str(response)
        # Robust: greifen wir das erste vollständige JSON-Objekt.
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        data = json.loads(m.group(0)) if m else json.loads(raw)
    except Exception as exc:  # noqa: BLE001
        logger.exception("llm_synthesis_failed: %s", exc)
        return None
    return data


# ---------------------------------------------------------------------------
# Quality gate
# ---------------------------------------------------------------------------
_BANNED_TEXT = ("testdaten", "testinhalt", "kein realer nachrichteninhalt",
                "lorem ipsum", "beispielmeldung", "dies ist eine demo",
                "dies ist ein testinhalt", "demo-inhalt")
_INVEST_RECS = ("jetzt kaufen", "unbedingt kaufen", "garantierte rendite",
                "sichere chance", "risikolose rendite", "kaufempfehlung",
                "verkaufsempfehlung", "wir empfehlen den kauf", "wir empfehlen den verkauf")


def _quality_gate(article: dict, sources: List[str], is_primary: bool) -> Tuple[bool, str]:
    if not article.get("title") or not article.get("content"):
        return False, "missing_title_or_content"
    content = article["content"]
    words = len(content.split())
    if words < MIN_WORDS:
        return False, f"too_short_{words}"
    text_l = content.lower()
    if any(b in text_l for b in _BANNED_TEXT):
        return False, "contains_demo_placeholder"
    if "demo —" in text_l or "demo - " in text_l or text_l.startswith("demo"):
        return False, "contains_demo_prefix"
    if any(p in text_l for p in _INVEST_RECS):
        return False, "investment_recommendation"
    if not sources:
        return False, "no_sources"
    # Struktur-Check — mindestens 2 Zwischenüberschriften
    if content.count("## ") < 2:
        return False, "missing_sections"
    return True, "ok"


# ---------------------------------------------------------------------------
# Relevance score (for top-news pick)
# ---------------------------------------------------------------------------
_HIGH_IMPACT = ["ezb", "fed ", "leitzins", "zinsentscheid", "notenbank", "geldpolitik",
                "inflation", "rezession", "quartalszahlen", "dax", "s&p", "nasdaq",
                "eur/usd", "gold", "öl", "brent"]


def _score_relevance(raw: dict) -> int:
    """0–100 relevance."""
    txt = f"{raw['title']} {raw['summary']}".lower()
    score = int(25 * raw.get("source_weight_max", raw.get("source_weight", 1.0)))
    score += sum(10 for k in _HIGH_IMPACT if k in txt)
    if len(raw.get("source_names", [])) >= 2:
        score += 15
    if raw.get("primary_source"):
        score += 8
    return min(100, max(0, score))


# ---------------------------------------------------------------------------
# Duplicate detection
# ---------------------------------------------------------------------------
async def _find_existing_similar(db, raw: dict, category: str) -> Optional[dict]:
    """Suche bestehenden Artikel zum selben Ereignis (Titel-Ähnlichkeit + Zeitfenster)."""
    # 1. Exakter Fingerprint-Match
    exact = await db.news_articles.find_one({"raw_fingerprint": raw["fingerprint"]})
    if exact:
        return exact
    # 2. Ähnliche Titel innerhalb des Zeitfensters — kategorie-übergreifend prüfen,
    #    weil dieselbe Meldung je nach Feed unterschiedlich eingeordnet werden kann
    #    (z. B. "USA-Zölle" landet mal in wirtschaft, mal in welt).
    since = datetime.now(timezone.utc) - DUP_TIME_WINDOW
    cursor = db.news_articles.find({
        "published_at": {"$gte": since},
    }).limit(60)
    async for doc in cursor:
        sim = _title_similarity(raw["title"], doc.get("title", ""))
        if sim >= 0.5:
            overlap = set(raw.get("source_names", [])) & set(doc.get("source_names", []))
            # Innerhalb gleicher Kategorie schon bei 0.5 duplikatisch,
            # kategorie-übergreifend erst bei 0.65 oder Quellenüberschneidung.
            if doc.get("category") == category:
                return doc
            if overlap or sim >= 0.65:
                return doc
    return None


# ---------------------------------------------------------------------------
# Main synthesis loop
# ---------------------------------------------------------------------------

async def synthesize_pending(db, max_articles: int = 3) -> dict:
    """Wandle bis zu `max_articles` neue Roh-Items in publizierte Artikel."""
    stats = {"processed": 0, "published": 0, "needs_review": 0,
             "skipped_duplicate": 0, "updated_existing": 0, "llm_failed": 0}
    cursor = db.news_raw.find({"used_for_synthesis": False}).sort([("fetched_at", -1)]).limit(30)
    candidates = await cursor.to_list(30)
    # Priorisierung: Multi-Quelle + hoher Relevance-Score + Primärquellen
    candidates.sort(key=lambda r: (
        r.get("primary_source", False),
        len(r.get("source_names", [])),
        _score_relevance(r),
    ), reverse=True)
    now = datetime.now(timezone.utc)
    for raw in candidates:
        if stats["published"] >= max_articles:
            break
        stats["processed"] += 1
        category = _detect_category(f"{raw['title']} {raw['summary']}")
        # 1. Duplikat-Prüfung: bestehender Artikel zum selben Ereignis?
        existing = await _find_existing_similar(db, raw, category)
        if existing:
            # Ggf. Quellenliste erweitern (neuer Feed hat dasselbe Ereignis bestätigt).
            new_sources = [n for n in raw.get("source_names", []) if n not in existing.get("source_names", [])]
            if new_sources:
                merged_sources = existing.get("source_names", []) + new_sources
                merged_urls = existing.get("source_urls", []) + [
                    u for n, u in zip(raw.get("source_names", []), raw.get("source_urls", [])) if n in new_sources
                ]
                await db.news_articles.update_one(
                    {"_id": existing["_id"]},
                    {"$set": {
                        "source_names": merged_sources,
                        "source_urls":  merged_urls,
                        "sources": [{"name": n, "url": u} for n, u in zip(merged_sources, merged_urls)],
                        "updated_at": now,
                        "last_verified_at": now,
                    }},
                )
                stats["updated_existing"] += 1
                logger.info("duplicate_updated slug=%s added_sources=%s", existing.get("slug"), new_sources)
            else:
                stats["skipped_duplicate"] += 1
                logger.info("duplicate_skipped slug=%s title=%s", existing.get("slug"), raw["title"][:80])
            await db.news_raw.update_one({"_id": raw["_id"]}, {"$set": {"used_for_synthesis": True}})
            continue

        # 2. LLM-Synthese
        logger.info("synthesis_start title=%s sources=%s", raw["title"][:80], raw.get("source_names"))
        article = await _synthesize_article([raw])
        if not article:
            stats["llm_failed"] += 1
            continue

        # 3. Qualitäts-Gate
        sources = raw.get("source_names", [])
        is_primary = bool(raw.get("primary_source"))
        ok, reason = _quality_gate(article, sources, is_primary)

        # 4. Bild via Unsplash-API (offiziell)
        img = await _fetch_unsplash_image(category, article.get("title") or raw["title"])

        slug = _slugify(article.get("title") or raw["title"])
        relevance = _score_relevance(raw)
        doc = {
            "slug": slug,
            "title": article.get("title"),
            "subtitle": article.get("subtitle"),
            "summary": article.get("summary"),
            "content": article.get("content"),
            "category": category,
            "content_type": "news_synthesis",
            "sources":       [{"name": n, "url": u} for n, u in zip(sources, raw.get("source_urls", []))],
            "source_names":  sources,
            "source_urls":   raw.get("source_urls", []),
            "raw_fingerprint": raw["fingerprint"],
            "image_url":         img["image_url"],
            "hero_image_url":    img["hero_image_url"],
            "image_author":      img.get("image_author"),
            "image_author_url":  img.get("image_author_url"),
            "image_source":      img.get("image_source"),
            "image_source_url":  img.get("image_source_url"),
            "image_attribution": img.get("image_attribution"),
            "published_at": now,
            "updated_at":   now,
            "generated_at": now,
            "last_verified_at": now,
            "status": "published" if ok else "needs_review",
            "is_published": ok,
            # is_top_news: markiert das Ereignis als hoch relevant. Wird zusätzlich
            # zum sortierten Score auf der Startseite als "Top-News" hervorgehoben.
            "is_top_news":  ok and relevance >= 55,
            "is_breaking":  False,
            "relevance_score": relevance,
            "quality_note": None if ok else reason,
        }
        try:
            await db.news_articles.update_one({"slug": slug}, {"$set": doc}, upsert=True)
        except Exception:  # noqa: BLE001
            logger.exception("save_article_failed slug=%s", slug)
            continue
        await db.news_raw.update_one({"_id": raw["_id"]}, {"$set": {"used_for_synthesis": True}})
        if ok:
            stats["published"] += 1
            logger.info("article_published slug=%s score=%d words=%d",
                        slug, relevance, len((article.get("content") or "").split()))
        else:
            stats["needs_review"] += 1
            logger.info("article_needs_review slug=%s reason=%s", slug, reason)
    logger.info("synthesize_pending_summary %s", stats)
    return stats


# ---------------------------------------------------------------------------
# Cleanup helper — removes any legacy DEMO articles from production.
# ---------------------------------------------------------------------------
async def purge_demo_articles(db) -> int:
    res = await db.news_articles.delete_many({
        "$or": [
            {"content_type": "demo"},
            {"title": {"$regex": r"^\s*DEMO\b", "$options": "i"}},
            {"content": {"$regex": r"testdaten|testinhalt|kein realer nachrichteninhalt", "$options": "i"}},
        ]
    })
    if res.deleted_count:
        logger.info("demo_purge removed=%d", res.deleted_count)
    return res.deleted_count
