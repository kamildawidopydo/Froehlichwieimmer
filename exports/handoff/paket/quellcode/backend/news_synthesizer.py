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
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

import feedparser
import httpx
from emergentintegrations.llm.chat import LlmChat, UserMessage

# Session 80.74 — single source of truth for ticker aliases (see stock_public.py).
try:
    from routes.stock_public import detect_related_symbols as _detect_related_symbols
except Exception:  # noqa: BLE001
    _detect_related_symbols = None  # graceful fallback: never write related_symbols


def _detect_related_symbols_safe(*, title: str, subtitle: str, summary: str) -> list:
    if _detect_related_symbols is None:
        return []
    try:
        return _detect_related_symbols(title=title, subtitle=subtitle, summary=summary)
    except Exception:  # noqa: BLE001
        return []


logger = logging.getLogger("news_synthesizer")

# ---------------------------------------------------------------------------
# Topic grouping / entity extraction — helpers for multi-source clustering
# ---------------------------------------------------------------------------
# Ziel: mehrere RSS-Meldungen desselben Ereignisses zu einer Gruppe
# zusammenfassen, damit die LLM einen konsolidierten Artikel mit allen
# Quellen erzeugt (statt N fast-identischer Duplikate).

# Bekannte Institutionen / Unternehmen / Orte — als Anker für Gruppierung.
_KNOWN_ENTITIES = {
    "ezb", "fed", "bundesbank", "bafin", "eu-kommission", "eu kommission",
    "bundestag", "bundesregierung", "kanzler", "kanzleramt", "merz", "scholz",
    "putin", "trump", "biden", "macron", "meloni", "erdogan", "xi",
    "volkswagen", "vw", "bmw", "mercedes", "porsche", "audi",
    "siemens", "bosch", "bayer", "basf", "sap", "biontech", "pfizer",
    "deutsche bank", "commerzbank", "sparkasse",
    "lufthansa", "deutsche bahn", "tsmc", "nvidia", "apple", "google", "microsoft",
    "ukraine", "russland", "china", "usa", "iran", "israel", "gaza",
    "brüssel", "washington", "moskau", "peking", "shanghai", "istanbul",
    "berlin", "frankfurt", "paris", "london", "rom", "wien",
    "dax", "s&p 500", "nasdaq", "nikkei", "hang seng",
    "brent", "wti", "gold", "silber", "kupfer",
}


def _extract_entities(title: str, summary: str = "") -> set[str]:
    """Leichte Entity-Extraktion: bekannte Named Entities + Großbuchstaben-Tokens."""
    text = f"{title} {summary}".lower()
    ents: set[str] = set()
    for kw in _KNOWN_ENTITIES:
        if kw in text:
            ents.add(kw)
    # Zusätzlich Groß-geschriebene Wörter aus Titel (Personen/Firmen/Orte)
    for tok in re.findall(r"\b([A-ZÄÖÜ][a-zäöüß]{3,})\b", title or ""):
        t = tok.lower()
        if t not in _STOPWORDS_EXTRA:
            ents.add(t)
    return ents


_STOPWORDS_EXTRA = {
    "aktien", "aktie", "börse", "boerse", "nachrichten", "meldung", "meldungen",
    "prozent", "million", "milliarden", "milliarde", "millionen",
    "januar", "februar", "märz", "april", "mai", "juni", "juli",
    "august", "september", "oktober", "november", "dezember",
    "montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag", "sonntag",
    "heute", "gestern", "morgen", "jahr", "woche", "monat", "tag",
    "bericht", "berichte", "analyse", "kommentar", "interview",
}

# ---------------------------------------------------------------------------
# Sources
# ---------------------------------------------------------------------------
FEEDS = [
    # --- Institutionell / Primärquellen ------------------------------------
    {"name": "EZB",                 "url": "https://www.ecb.europa.eu/rss/press.html",                                    "weight": 1.6, "primary": True,  "default_category": "zinsen"},
    {"name": "Deutsche Bundesbank", "url": "https://www.bundesbank.de/service/rss/de/633286/feed.rss",                    "weight": 1.5, "primary": True,  "default_category": "zinsen"},
    {"name": "BaFin",               "url": "https://www.bafin.de/SharedDocs/RSSFeeds/DE/pressemitteilung.xml",            "weight": 1.4, "primary": True,  "default_category": "wirtschaft"},
    {"name": "EU-Kommission",       "url": "https://ec.europa.eu/commission/presscorner/api/rss?language=DE",             "weight": 1.3, "primary": True,  "default_category": "europa"},
    # --- Öffentlich-rechtlich (breite Themenpalette) ----------------------
    {"name": "Tagesschau Wirtschaft","url": "https://www.tagesschau.de/wirtschaft/index~rss2.xml",                        "weight": 1.0, "primary": False, "default_category": "wirtschaft"},
    {"name": "Tagesschau Inland",   "url": "https://www.tagesschau.de/inland/index~rss2.xml",                             "weight": 0.9, "primary": False, "default_category": "politik"},
    {"name": "Tagesschau Ausland",  "url": "https://www.tagesschau.de/ausland/index~rss2.xml",                            "weight": 0.9, "primary": False, "default_category": "welt"},
    {"name": "Deutsche Welle",      "url": "https://rss.dw.com/xml/rss-de-eco",                                           "weight": 1.0, "primary": False, "default_category": "wirtschaft"},
    {"name": "Deutsche Welle Welt", "url": "https://rss.dw.com/xml/rss-de-welt",                                          "weight": 0.9, "primary": False, "default_category": "welt"},
    {"name": "NDR Wirtschaft",      "url": "https://www.ndr.de/nachrichten/wirtschaft/index-rss.xml",                     "weight": 0.9, "primary": False, "default_category": "wirtschaft"},
    # --- Redaktionelle Publisher (Wirtschaft + Politik + Tech) ------------
    {"name": "Handelsblatt",        "url": "https://www.handelsblatt.com/contentexport/feed/schlagzeilen",                "weight": 1.2, "primary": False, "default_category": "wirtschaft"},
    {"name": "Manager Magazin",     "url": "https://www.manager-magazin.de/wirtschaft/index.rss",                         "weight": 1.1, "primary": False, "default_category": "wirtschaft"},
    {"name": "SPIEGEL Wirtschaft",  "url": "https://www.spiegel.de/wirtschaft/index.rss",                                 "weight": 1.1, "primary": False, "default_category": "wirtschaft"},
    {"name": "SPIEGEL Politik",     "url": "https://www.spiegel.de/politik/index.rss",                                    "weight": 1.0, "primary": False, "default_category": "politik"},
    {"name": "SPIEGEL Ausland",     "url": "https://www.spiegel.de/politik/ausland/index.rss",                            "weight": 0.9, "primary": False, "default_category": "welt"},
    {"name": "FAZ Wirtschaft",      "url": "https://www.faz.net/rss/aktuell/wirtschaft/",                                 "weight": 1.1, "primary": False, "default_category": "wirtschaft"},
    {"name": "FAZ Politik",         "url": "https://www.faz.net/rss/aktuell/politik/",                                    "weight": 1.0, "primary": False, "default_category": "politik"},
    {"name": "ZEIT Wirtschaft",     "url": "https://newsfeed.zeit.de/wirtschaft/index",                                   "weight": 1.1, "primary": False, "default_category": "wirtschaft"},
    {"name": "ZEIT Politik",        "url": "https://newsfeed.zeit.de/politik/index",                                      "weight": 1.0, "primary": False, "default_category": "politik"},
    {"name": "Süddeutsche Wirtschaft","url": "https://rss.sueddeutsche.de/rss/Wirtschaft",                                "weight": 1.0, "primary": False, "default_category": "wirtschaft"},
    {"name": "WirtschaftsWoche",    "url": "https://www.wiwo.de/contentexport/feed/rss/schlagzeilen",                     "weight": 1.0, "primary": False, "default_category": "wirtschaft"},
    {"name": "Handelszeitung",      "url": "https://www.handelszeitung.ch/rss.xml",                                       "weight": 0.9, "primary": False, "default_category": "wirtschaft"},
    {"name": "heise Wirtschaft",    "url": "https://www.heise.de/wirtschaft/rss/wirtschaft-atom.xml",                     "weight": 0.9, "primary": False, "default_category": "technologie"},
    {"name": "Golem",               "url": "https://rss.golem.de/rss.php?feed=RSS2.0",                                    "weight": 0.8, "primary": False, "default_category": "technologie"},
]

# ---------------------------------------------------------------------------
# Topic filter — Vermögensberatungs-relevante Themen
# ---------------------------------------------------------------------------
RELEVANT_KEYWORDS = [
    # Märkte & Zinsen
    "dax", "s&p", "sp 500", "sp500", "nasdaq", "aktien", "börse", "boerse",
    "ezb", "fed", "federal reserve", "zins", "leitzins", "notenbank", "geldpolitik",
    "inflation", "konjunktur", "bip", "wachstum", "rezession",
    "unternehmen", "quartalszahlen", "bilanz", "gewinn", "umsatz", "übernahme", "fusion",
    "banken", "bank ", "sparkasse", "commerzbank", "deutsche bank",
    # Rohstoffe & Währungen
    "energie", "gold", "silber", "kupfer", "öl", "oel", "erdöl", "brent", "wti",
    "rohstoff", "lithium", "seltene erden",
    "eur/usd", "eur usd", "euro", "dollar", "yen", "yuan", "franken",
    # Anleihen & Staatsfinanzen
    "staatsanleihen", "anleihe", "bond", "bundesanleih", "treasury",
    "wirtschaftspolitik", "finanzpolitik", "haushalt", "schuldenbremse", "steuer",
    # Handel / Geopolitik
    "geopolit", "sanktion", "handel", "handelskrieg", "zölle", "zoll",
    "arbeitsmarkt", "beschäftigung", "arbeitslos",
    "verbraucherpreis", "ifo", "zew", "einkaufsmanager", "pmi",
    "wirtschaft", "finanzmarkt", "kapitalmarkt",
    # Industrie & Unternehmen
    "industrie", "produktion", "automobil", "chemie", "maschinenbau",
    "volkswagen", "bmw", "mercedes", "porsche", "audi", "siemens", "bosch", "bayer", "basf", "sap",
    # Technologie / Innovation
    "künstliche intelligenz", " ki ", "ki-", "chip", "halbleiter", "cloud",
    "cyber", "digital", "software", "innovation", "startup",
    # Energie / Klima
    "erneuerbar", "windkraft", "solar", "photovoltaik", "wasserstoff",
    "co2", "klima", "emission", "energiewende", "netzausbau", "stromnetz",
    # Mobilität / Infrastruktur
    "bahn", "deutsche bahn", "schiene", "zug", "ice", "flughafen", "airline",
    "lufthansa", "hafen", "logistik", "infrastruktur",
    # Sicherheit / Verteidigung
    "verteidigung", "bundeswehr", "nato", "rüstung", "sicherheit",
    # Gesundheit / Pharma
    "gesundheit", "pharma", "impf", "biontech", "medikament", "krankenkasse",
    # EU / Politik
    "eu ", "eu-", "brüssel", "europäisch", "eurozone",
    "bundestag", "regierung", "kanzler", "koalition", "kabinett", "merz", "scholz",
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
# 17 kanonische Kategorien für den erweiterten News-Bereich. Reihenfolge = Detection-Priorität.
CATEGORY_MAP = {
    "zinsen":       ["ezb", "leitzins", "zinsentscheid", "notenbank", "geldpolitik", "fed ", "federal reserve", "bundesbank", "zinssenk", "zinsanhebung"],
    "waehrungen":   ["eur/usd", "eur usd", "euro dollar", "wechselkurs", "devisen", "yuan", "yen", "franken"],
    "rohstoffe":    ["gold", "silber", "kupfer", "öl ", "oel ", "brent", "wti", "erdöl", "rohstoff", "lithium", "seltene erden"],
    "energie":      ["erneuerbar", "windkraft", "windrad", "solar", "photovoltaik", "wasserstoff", "energiewende", "gaspreis", "netzausbau", "stromnetz"],
    "klima":        ["klima", "klimawandel", "co2", "co2-", "klimapolitik", "emission"],
    "gesundheit":   ["gesundheit", "pharma", "impf", "biontech", "medikament", "krankenhaus", "krankenkasse", "klinik", "arznei"],
    "mobilitaet":   ["bahn", "deutsche bahn", "ice ", "schiene", "flughafen", "airline", "lufthansa", "luftfahrt", "hafen", "logistik", "verkehr"],
    "industrie":    ["industrie", "produktion", "maschinenbau", "chemie", "stahl", "werk in ", "fabrik"],
    "technologie":  ["künstliche intelligenz", " ki ", "ki-", "chip", "halbleiter", "cloud", "cyber", "digital", "software", "startup", "algorithm"],
    "sicherheit":   ["bundeswehr", "nato", "verteidigung", "rüstung", "sicherheitspolitik", "militär"],
    "unternehmen":  ["quartalszahlen", "bilanz", "übernahme", "fusion", "börsengang", "ipo", "volkswagen", "bmw", "mercedes", "porsche", "siemens", "bayer", "basf", "sap"],
    "maerkte":      ["dax", "s&p", "sp 500", "sp500", "nasdaq", "wall street", "aktienmarkt", "börse", "leitindex", "anleih", "staatsanleih"],
    "europa":       ["eu-kommission", "eu-parlament", "europapark", "eu-", "brüssel", "eurozone", "europäisch"],
    "politik":      ["bundestag", "regierung", "kanzler", "koalition", "kabinett", "gesetz", "beschluss", "wahl", "landtag"],
    "welt":         ["usa", "china", "russland", "ukraine", "japan", "indien", "türkei", "iran", "israel", "afrika", "südamerika"],
    "wirtschaft":   ["wirtschaft", "konjunktur", "inflation", "arbeitsmarkt", "handel", "handelskrieg", "zölle", "haushalt", "steuer", "sozialhilfe"],
    "wissen":       ["forschung", "studie", "wissenschaft", "universität"],
}
DEFAULT_CATEGORY = "wirtschaft"

# Legacy-Kategorien werden im Frontend/Provider auf die kanonische Taxonomie gemappt.
LEGACY_CATEGORY_ALIAS = {
    "umwelt": "klima",
    "aktien": "maerkte",
    "aktienmaerkte": "maerkte",
}

# Kategorie → passendes Unsplash-Query (Legacy — wird von der editorial-
# Logik unten in `_build_image_queries` ersetzt; nur noch als Sicherheitsnetz
# behalten, falls jemand direkt darauf zugreift).
UNSPLASH_QUERY_MAP: dict[str, str] = {}

# Legacy-Overrides bleiben leer — die neue Editorial-Logik liegt unten.
IMAGE_KEYWORD_OVERRIDES: list = []

# ---------------------------------------------------------------------------
# Quality thresholds — Untergrenze niedriger, um kurze Ticker-Meldungen
# (300–500 Wörter) nicht durchs Raster fallen zu lassen. Bei sehr dünner
# Faktenlage sind auch 250 Wörter akzeptabel.
# ---------------------------------------------------------------------------
MIN_WORDS = 250
IDEAL_MIN_WORDS = 400
IDEAL_MAX_WORDS = 1000

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


def _detect_category(text: str, fallback: str = DEFAULT_CATEGORY) -> str:
    text_lower = (text or "").lower()
    best = (fallback, 0)
    for cat, keys in CATEGORY_MAP.items():
        hits = sum(1 for k in keys if k in text_lower)
        if hits > best[1]:
            best = (cat, hits)
    return best[0]


def _extract_rss_image(entry: dict) -> Optional[str]:
    """Try to pull a hi-res image URL out of an RSS entry (best-effort)."""
    # media:content
    media = entry.get("media_content") or entry.get("media_thumbnail")
    if isinstance(media, list) and media:
        for m in media:
            u = m.get("url") if isinstance(m, dict) else None
            if u and (u.endswith((".jpg", ".jpeg", ".png", ".webp")) or "img" in u.lower()):
                return u
    # enclosures
    for enc in entry.get("enclosures", []) or []:
        u = enc.get("href") or enc.get("url")
        t = (enc.get("type") or "").lower()
        if u and (t.startswith("image/") or u.endswith((".jpg", ".jpeg", ".png", ".webp"))):
            return u
    # links with rel=enclosure
    for lnk in entry.get("links", []) or []:
        if isinstance(lnk, dict) and (lnk.get("type") or "").startswith("image/"):
            return lnk.get("href")
    # first <img> in summary/content
    body = entry.get("summary") or ""
    if entry.get("content"):
        first = entry["content"][0] if isinstance(entry["content"], list) else None
        if isinstance(first, dict):
            body = first.get("value", "") + " " + body
    m = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', body or "", re.IGNORECASE)
    if m:
        u = m.group(1)
        if u.startswith("http"):
            return u
    return None


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

# ---------------------------------------------------------------------------
# Editorial Image Strategy
# ---------------------------------------------------------------------------
# Ziel: hochwertige, journalistische Bildsprache wie in Nachrichtenmagazinen.
# NIEMALS als Standard: Candlestick-Charts, Trading-Screens, Aktienkurse,
# Geldscheine, Münzen, Börsenticker, generische Finanzgrafiken.
# Stattdessen: Häfen, Container, Züge, Windparks, Solarparks, Labore,
# Parlamente, Regierungsgebäude, Städte, Rechenzentren usw.
# ---------------------------------------------------------------------------

# Pro Kategorie mehrere Editorial-Queries — durch Titel-Hash rotiert,
# damit Artikel derselben Kategorie nicht dasselbe Bild bekommen.
EDITORIAL_CATEGORY_QUERIES = {
    "wirtschaft": [
        "container port cranes aerial",
        "cargo ship harbor logistics",
        "industrial factory production hall",
        "logistics warehouse editorial",
        "german industry manufacturing",
        "shipping port terminal",
    ],
    "europa": [
        "european parliament brussels chamber",
        "eu flags berlaymont building",
        "european commission facade brussels",
        "strasbourg parliament hemicycle",
        "european quarter architecture",
    ],
    "politik": [
        "reichstag berlin dome",
        "bundestag plenary session",
        "berlin government quarter",
        "parliament chamber editorial",
        "government cabinet meeting",
    ],
    "welt": [
        "shanghai skyline pudong",
        "container terminal aerial asia",
        "world skyline urban editorial",
        "port cargo terminal aerial",
        "city skyline dusk architecture",
    ],
    "umwelt": [
        "offshore wind farm turbines",
        "solar farm aerial landscape",
        "power grid transmission tower landscape",
        "renewable energy landscape editorial",
        "forest landscape aerial nature",
        "coastal wind turbines",
    ],
    "wissen": [
        "science laboratory researcher pipette",
        "medical research microscope",
        "pharmaceutical laboratory lab",
        "chemistry laboratory research",
        "scientist working laboratory",
    ],
}
DEFAULT_CATEGORY_QUERIES = EDITORIAL_CATEGORY_QUERIES["wirtschaft"]

# Themen-Overrides: extrahiert aus Titel + Summary. Erste passende Gruppe
# gewinnt und liefert 2-3 spezifische Editorial-Queries, die vor der
# Kategorie-Rotation gefragt werden.
EDITORIAL_TOPIC_QUERIES: list[tuple[tuple[str, ...], list[str]]] = [
    # --- Zentralbanken / Geldpolitik (Architektur statt Ticker) -----
    (("ezb", "european central bank", "eurozone-zinsen", "eurozonen-zinsen"),
        ["european central bank frankfurt building", "ezb tower architecture frankfurt"]),
    (("bundesbank",),
        ["deutsche bundesbank frankfurt building", "central bank architecture germany"]),
    (("fed ", "federal reserve", "us-notenbank", "us notenbank"),
        ["federal reserve building washington", "us treasury building architecture"]),
    (("bafin", "finanzaufsicht"),
        ["financial regulation office bonn", "regulatory authority building"]),
    (("leitzins", "zinsentscheid", "zinsanhebung", "zinssenkung", "geldpolitik"),
        ["european central bank architecture", "central bank building modern"]),

    # --- Handel / Zölle / Konjunktur (Häfen, Fabriken — KEINE Charts!) ---
    (("handelskrieg", "handelsstreit", "handelsabkommen", "exporte", "importe"),
        ["container port cranes aerial", "cargo ship international trade"]),
    (("zölle", "zoll ", "sonderzoll", "einfuhrzoll", "strafzoll", "zollzahlung"),
        ["container terminal customs harbor", "cargo containers port aerial"]),
    (("dax", "börse frankfurt", "aktienmarkt"),
        ["frankfurt skyline banking district", "frankfurt am main skyline dusk"]),
    (("s&p", "sp 500", "sp500", "nasdaq", "wall street", "us-börse"),
        ["new york city skyline manhattan", "manhattan financial district architecture"]),
    (("konjunktur", "wirtschaftswachstum", "bip ", "wirtschaftsleistung"),
        ["german factory manufacturing hall", "industrial production line workers"]),
    (("rezession", "abschwung"),
        ["empty industrial workshop", "closed shop german street"]),
    (("inflation", "verbraucherpreise", "teuerung", "preisanstieg"),
        ["supermarket shopping cart", "grocery aisle supermarket"]),
    (("arbeitsmarkt", "arbeitslos", "beschäftigung", "job", "stellenmarkt"),
        ["office employees working editorial", "workers manufacturing hall"]),
    (("ifo", "zew", "einkaufsmanager", "pmi", "geschäftsklima"),
        ["business office glass tower", "office workers meeting editorial"]),
    (("mittelstand", "familienunternehmen"),
        ["german factory workshop", "small business workshop"]),
    (("sozialhilfe", "bürgergeld", "grundsicherung", "sozialstaat"),
        ["community services building germany", "welfare office queue editorial"]),
    (("steuer", "steuern", "steuerreform", "steuerpolitik"),
        ["tax office desk documents", "finance ministry berlin building"]),

    # --- Bahn / Mobilität ---
    (("deutsche bahn", "db-konzern", "schienenverkehr", "ice ", "regionalbahn", "s-bahn", "bahn "),
        ["modern train station platform germany", "high speed train ice railway"]),
    (("automobil", "autoindustrie", "automobilbranche", "vw ", "volkswagen", "bmw", "mercedes", "porsche", "audi"),
        ["car factory assembly line", "automobile manufacturing plant germany"]),
    (("elektroauto", "e-auto", "ev ", "elektromobilität"),
        ["electric vehicle charging station", "ev assembly line factory"]),
    (("luftfahrt", "airline", "flughafen", "fluggesellschaft", "lufthansa"),
        ["airport terminal aircraft dusk", "commercial aircraft on tarmac"]),
    (("schifffahrt", "hafen", "reederei", "container", "logistik"),
        ["container harbor cranes aerial", "cargo ship container terminal"]),

    # --- Energie / Klima ---
    (("klima", "klimawandel", "co2", "co2-", "klimapolitik"),
        ["wind farm coast landscape", "solar farm aerial landscape"]),
    (("solar", "photovoltaik"),
        ["solar farm aerial view landscape", "solar panels roof editorial"]),
    (("windkraft", "windrad", "windpark", "offshore wind"),
        ["offshore wind farm turbines", "wind turbines landscape editorial"]),
    (("atomkraft", "kernkraft", "atomausstieg", "kernenergie"),
        ["nuclear power plant cooling towers", "nuclear reactor building landscape"]),
    (("strom", "stromnetz", "stromversorgung", "stromtrasse", "netzausbau"),
        ["power grid transmission lines landscape", "electric transmission tower dusk"]),
    (("erdgas", "gaspreis", "gasversorgung", "gasspeicher", "gas "),
        ["natural gas pipeline landscape", "gas storage facility industry"]),
    (("erneuerbare", "energiewende"),
        ["wind and solar energy landscape", "renewable energy field landscape"]),

    # --- Rohstoffe (physisch statt Chart!) ---
    (("gold", "goldpreis", "edelmetall"),
        ["gold bullion bars vault", "precious metal ingot editorial"]),
    (("silber",),
        ["silver bars precious metal", "silver ingots editorial"]),
    (("öl ", "oel ", "brent", "wti", "erdöl", "ölpreis"),
        ["oil refinery industry landscape", "offshore oil platform ocean"]),
    (("kupfer", "eisenerz", "seltene erden", "lithium", "nickel"),
        ["copper mine industrial landscape", "raw materials industry aerial"]),

    # --- Gesundheit / Pharma ---
    (("impfstoff", "vakzin", "impfung"),
        ["vaccine vial laboratory research", "syringe vial editorial"]),
    (("pharma", "arzneimittel", "medikament", "biontech", "pfizer"),
        ["pharmaceutical laboratory research", "pill capsules laboratory close"]),
    (("gesundheit", "medizin", "arzt", "klinik", "krankenhaus"),
        ["hospital corridor doctor editorial", "medical hospital modern architecture"]),

    # --- Politik ---
    (("bundestag", "regierung", "kanzler", "koalition", "kabinett", "merz", "scholz"),
        ["reichstag berlin building", "bundestag plenary chamber"]),
    (("wahl", "wahlen", "landtagswahl", "bundestagswahl"),
        ["polling station ballot box germany", "voting ballot box editorial"]),
    (("eu-kommission", "eu-", "brüssel", "brussels"),
        ["berlaymont brussels european commission", "european union headquarters"]),
    (("europaparlament", "eu-parlament"),
        ["european parliament strasbourg hemicycle", "eu parliament brussels chamber"]),
    (("g7", "g20", "gipfel", "staatschefs"),
        ["g7 leaders summit press hall", "international summit press conference"]),

    # --- Sicherheit / Verteidigung (sachlich institutionell) ---
    (("bundeswehr", "verteidigungsminister", "verteidigung", "aufrüstung"),
        ["military parade ground editorial", "government defense ministry building"]),
    (("nato",),
        ["nato headquarters brussels", "nato flags editorial"]),
    (("waffen", "rüstung", "rüstungsindustrie"),
        ["defense industry factory hall", "steel manufacturing plant editorial"]),

    # --- Länder-Kontext (Landmarken) ---
    (("ukraine", "kyjiw", "kiew"),
        ["kyiv skyline government building", "ukraine independence square editorial"]),
    (("russland", "moskau", "putin"),
        ["moscow skyline red square dusk", "kremlin architecture editorial"]),
    (("china ", "peking", "beijing", "shanghai"),
        ["shanghai skyline pudong dusk", "beijing forbidden city aerial"]),
    (("usa", "amerika", "biden", "trump", "washington"),
        ["washington capitol building", "washington dc capitol dome"]),
    (("frankreich", "paris", "macron"),
        ["paris skyline eiffel editorial", "french national assembly paris"]),
    (("italien", "rom", "meloni"),
        ["rome skyline dusk editorial", "italian parliament rome"]),
    (("türkei", "erdogan", "istanbul"),
        ["istanbul skyline bosphorus dusk", "turkish parliament ankara"]),

    # --- Technologie ---
    (("künstliche intelligenz", "ki-", " ki ", "artificial intelligence", "generative ai"),
        ["data center server room aisle", "server room dark editorial"]),
    (("halbleiter", "chip", "chips", "semiconductor", "nvidia", "tsmc"),
        ["semiconductor wafer manufacturing", "silicon chip macro editorial"]),
    (("rechenzentrum", "cloud", "server", "data center"),
        ["data center server aisles editorial", "server room cabling editorial"]),
    (("robotik", "roboter", "automatisierung", "industrie 4.0"),
        ["industrial robot arm factory", "robotic assembly line editorial"]),
    (("cyber", "hacker", "cyberangriff", "ransomware"),
        ["dark server room security editorial", "cybersecurity data center editorial"]),

    # --- Anleihen / Staatsfinanzen (Gebäude, Dokumente — keine Ticker) ---
    (("staatsanleih", "anleih", "bond ", "bundesanleih", "us-treasury"),
        ["finance ministry berlin architecture", "government building columns editorial"]),
    (("haushalt", "schuldenbremse", "bundeshaushalt", "staatsverschuldung"),
        ["reichstag berlin dome dusk", "german finance ministry building"]),

    # --- Währungen (Zentralbank-Architektur statt Wechselkurs-Grafik) ---
    (("eur/usd", "euro dollar", "eur usd", "wechselkurs", "devisen"),
        ["european central bank frankfurt architecture", "frankfurt financial district skyline"]),

    # --- Bau / Immobilien ---
    (("immobilien", "wohnungsmarkt", "mieten", "wohnungsbau"),
        ["berlin apartment buildings facade", "residential architecture editorial"]),
    (("baubranche", "baustelle", "bauwirtschaft"),
        ["construction site cranes editorial", "construction workers site editorial"]),
]


def _build_image_queries(category: str, title: str, summary: str) -> List[str]:
    """Baue nach Themen priorisierte Suchanfrage-Liste (bis zu 6 Kandidaten)."""
    text = f"{title} {summary}".lower()
    queries: list[str] = []
    seen: set[str] = set()

    def _add(q: str) -> None:
        if q and q not in seen:
            seen.add(q)
            queries.append(q)

    # 1) Thematische Overrides — der spezifischste Kontext gewinnt.
    for keys, qs in EDITORIAL_TOPIC_QUERIES:
        if any(k in text for k in keys):
            for q in qs:
                _add(q)
    # 2) Kategorie-Rotation — durch Titel-Hash deterministisch verschoben,
    #    damit ähnliche Artikel derselben Kategorie NICHT dasselbe Bild ziehen.
    cat_pool = EDITORIAL_CATEGORY_QUERIES.get(category) or DEFAULT_CATEGORY_QUERIES
    seed = int(hashlib.sha1((title or "").encode()).hexdigest()[:8], 16)
    off = seed % len(cat_pool)
    for q in cat_pool[off:] + cat_pool[:off]:
        _add(q)
    return queries[:6]


# Fallback-Pool pro Kategorie (rotiert per Titel-Hash — mehrere URLs pro
# Kategorie, damit auch ohne UNSPLASH_ACCESS_KEY nicht überall dasselbe
# Bild hängt). Alle IDs sind statische Unsplash-CDN-Motive im Editorial-Stil
# — keine Trading-Charts, keine Ticker, keine Geldscheine.
FALLBACK_POOL = {
    "wirtschaft": [
        # Container-Hafen / Logistik / Industrie
        "https://images.unsplash.com/photo-1494412651409-8963ce7935a7?w=1600&q=75",  # containers stacked
        "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1600&q=75",  # cargo ship harbor
        "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=1600&q=75",  # port terminal aerial
        "https://images.unsplash.com/photo-1565043666747-69f6646db940?w=1600&q=75",  # warehouse logistics
        "https://images.unsplash.com/photo-1533310266094-8898a03807dd?w=1600&q=75",  # factory production
    ],
    "europa": [
        # EU-Parlament / EU-Kommission / Brüssel / Straßburg
        "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=1600&q=75",  # EU flags
        "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1600&q=75",     # parliament chamber
        "https://images.unsplash.com/photo-1573599852326-2d4da0bbe613?w=1600&q=75",  # eu parliament
        "https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=1600&q=75",     # brussels
    ],
    "politik": [
        # Reichstag / Bundestag / Regierungsgebäude
        "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=1600&q=75",  # reichstag berlin
        "https://images.unsplash.com/photo-1587330979470-3016b6702d89?w=1600&q=75",  # reichstag dome
        "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1600&q=75",  # parliament
        "https://images.unsplash.com/photo-1585129777188-9989f61c5f9c?w=1600&q=75",  # government building
    ],
    "welt": [
        # Skylines / Häfen / Städte
        "https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=1600&q=75",  # shanghai dusk
        "https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?w=1600&q=75",  # port aerial
        "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1600&q=75",  # world map
        "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&q=75",  # landscape
    ],
    "umwelt": [
        # Windräder / Solar / Landschaft
        "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1600&q=75",  # wind turbines
        "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1600&q=75",  # solar farm
        "https://images.unsplash.com/photo-1548337138-e87d889cc369?w=1600&q=75",     # power lines dusk
        "https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?w=1600&q=75",  # forest landscape
    ],
    "wissen": [
        # Labore / Forschung / Medizin
        "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=1600&q=75",  # laboratory
        "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=1600&q=75",  # lab research
        "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=1600&q=75",  # laboratory research
        "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=1600&q=75",  # science
    ],
}


def _pick_fallback(category: str, title: str) -> dict:
    pool = FALLBACK_POOL.get(category) or FALLBACK_POOL["wirtschaft"]
    idx = int(hashlib.sha1((title or "x").encode()).hexdigest()[:8], 16) % len(pool)
    url = pool[idx]
    return {
        "image_url": url,
        "hero_image_url": url,
        "image_author": None,
        "image_author_url": None,
        "image_source": "Unsplash",
        "image_source_url": None,
        "image_attribution": "Foto: Unsplash",
    }


async def _validate_image_url(url: str, *, timeout: float = 5.0) -> bool:
    """Prüfe eine externe Bild-URL bevor sie in Mongo landet.
    HEAD zuerst, dann sicherer GET-Fallback (nur die ersten Bytes lesen).
    Rückgabe True = URL antwortet 2xx UND Content-Type startet mit 'image/'.
    Kein Exception-Bubble — ein einzelner defekter Host darf den Sync nicht killen.
    """
    if not url or not isinstance(url, str):
        return False
    if not url.startswith(("http://", "https://")):
        return False
    try:
        async with httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=True,
            headers={"User-Agent": "FroehlichNewsSync/1.0"},
        ) as client:
            try:
                r = await client.head(url)
            except Exception:
                r = None
            if r is not None and 200 <= r.status_code < 400:
                ct = (r.headers.get("content-type") or "").lower()
                if ct.startswith("image/"):
                    return True
                # Manche CDNs liefern bei HEAD keinen sinnvollen Content-Type → GET-Fallback
                if not ct or "octet-stream" in ct:
                    r = None
            if r is None or r.status_code == 405 or r.status_code >= 400:
                # HEAD nicht unterstützt oder Server verweigert → GET, nur Header lesen
                async with client.stream("GET", url) as g:
                    if g.status_code < 200 or g.status_code >= 400:
                        return False
                    ct = (g.headers.get("content-type") or "").lower()
                    return ct.startswith("image/")
            return False
    except Exception as exc:  # noqa: BLE001
        logger.warning("image_validate_failed url=%s err=%s", url[:120], exc)
        return False




async def _recent_unsplash_ids(db, limit: int = 60) -> set[str]:
    """Damit derselbe Unsplash-Photograf nicht drei Mal in Folge auftaucht."""
    try:
        cursor = db.news_articles.find({"image_unsplash_id": {"$exists": True, "$ne": None}}) \
            .sort("published_at", -1).limit(limit)
        return {d.get("image_unsplash_id") async for d in cursor if d.get("image_unsplash_id")}
    except Exception:
        return set()


async def _fetch_unsplash_image(category: str, title: str, summary: str = "", *, db=None) -> dict:
    """Sucht bei Unsplash nach dem thematisch passendsten Editorial-Motiv.

    Ohne `UNSPLASH_ACCESS_KEY`: rotiert deterministisch durch Fallback-Pool
    pro Kategorie. Mit Key: baut aus Titel+Summary+Kategorie mehrere
    Query-Kandidaten, filtert Duplikate der letzten 60 Artikel raus und
    speichert Fotograf-Attribution gemäss Unsplash-API-Vorgaben.
    """
    key = os.environ.get("UNSPLASH_ACCESS_KEY", "").strip()
    if not key:
        logger.info("unsplash: no UNSPLASH_ACCESS_KEY set — using editorial fallback pool for %s", category)
        return _pick_fallback(category, title)

    queries = _build_image_queries(category, title, summary)
    used_ids = await _recent_unsplash_ids(db) if db is not None else set()
    utm = "?utm_source=froehlich_vermoegensberatung&utm_medium=referral"

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            for q in queries:
                try:
                    r = await client.get(
                        "https://api.unsplash.com/search/photos",
                        params={"query": q, "per_page": 10, "orientation": "landscape",
                                 "content_filter": "high"},
                        headers={"Authorization": f"Client-ID {key}", "Accept-Version": "v1"},
                    )
                except Exception as exc:  # noqa: BLE001
                    logger.warning("unsplash: query failed q=%r err=%s", q, exc)
                    continue
                if r.status_code != 200:
                    logger.warning("unsplash: HTTP %s for query=%r", r.status_code, q)
                    if r.status_code == 403:
                        return _pick_fallback(category, title)  # Rate-Limit → sofort Fallback
                    continue
                results = (r.json() or {}).get("results") or []
                if not results:
                    continue
                # Bevorzuge Motive, die noch nicht kürzlich verwendet wurden
                unused = [p for p in results if p.get("id") not in used_ids]
                candidates = unused or results
                # Deterministische Auswahl aus den Top-3 anhand Titel-Hash — Variation.
                idx = int(hashlib.sha1((title or q).encode()).hexdigest()[:6], 16) % max(1, min(3, len(candidates)))
                pick = candidates[idx]
                urls = pick.get("urls") or {}
                user = pick.get("user") or {}
                photo_link = pick.get("links", {}).get("html")
                img = urls.get("regular") or urls.get("full") or urls.get("small")
                if not img:
                    continue
                hero = urls.get("full") or urls.get("regular") or img
                author_name = user.get("name") or "Unsplash Fotograf"
                author_link = (user.get("links") or {}).get("html")
                # Vor dem Rückgabezeitpunkt validieren, damit tote Unsplash-IDs
                # gar nicht erst in die DB gelangen.
                if not await _validate_image_url(img):
                    logger.info("unsplash_pick_invalid photo_id=%s → skip", pick.get("id"))
                    continue
                logger.info("unsplash_ok query=%r photo_id=%s author=%s", q, pick.get("id"), author_name)
                return {
                    "image_url": img,
                    "hero_image_url": hero,
                    "image_unsplash_id": pick.get("id"),
                    "image_unsplash_query": q,
                    "image_author": author_name,
                    "image_author_url": (author_link + utm) if author_link else None,
                    "image_source": "Unsplash",
                    "image_source_url": (photo_link + utm) if photo_link else None,
                    "image_attribution": f"Foto: {author_name} auf Unsplash",
                }
    except Exception as exc:  # noqa: BLE001
        logger.warning("unsplash: unexpected failure: %s", exc)
    # Nichts Passendes gefunden → Editorial-Fallback aus Kategorie-Pool.
    return _pick_fallback(category, title)


# ---------------------------------------------------------------------------
# Feed fetcher
# ---------------------------------------------------------------------------

async def fetch_feeds(db, *, trigger_source: str = "manual") -> dict:
    """Ziehe alle RSS-Feeds und persistiere neue/aktualisierte Roh-Items.

    Rückgabe-Stats enthalten explizit `started_at`, `fetched`, `relevant`,
    `new`, `merged`, `updated`, `errors`, `trigger_source` — für Cron-Logging
    & Debugging.

    Verwendet einen **atomaren Mongo-Lock** (`job_locks._id="fetch_feeds"`), um
    parallele Läufe (15-Min-Cron + Stunden-Cron + Post-Deploy) zuverlässig zu
    verhindern. Läuft ein zweiter Job an, wird er sauber übersprungen. Bei
    Exception oder Timeout (TTL 10 Min) wird der Lock automatisch freigegeben.
    """
    started = datetime.now(timezone.utc)
    LOCK_ID = "fetch_feeds"
    LOCK_TTL_S = 600  # 10 Min — großzügig, aber verhindert Dead-Locks bei Crash
    expires = started + timedelta(seconds=LOCK_TTL_S)
    # Eindeutiges Owner-Token — robust gegen BSON-Millisekunden-Truncation
    # (datetime-Equality funktioniert nach Mongo-Roundtrip unzuverlässig).
    own_token = uuid.uuid4().hex

    # ---- Atomic lock acquire (findOneAndUpdate mit expiry-Filter) ------------
    from pymongo import ReturnDocument
    from pymongo.errors import DuplicateKeyError
    lock_doc = None
    try:
        lock_doc = await db.job_locks.find_one_and_update(
            {"_id": LOCK_ID, "$or": [
                {"expires_at": {"$lt": started}},
                {"expires_at": {"$exists": False}},
            ]},
            {"$set": {"acquired_at": started, "expires_at": expires,
                        "trigger_source": trigger_source,
                        "owner_token": own_token}},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
    except DuplicateKeyError:
        # Lock war belegt & noch nicht abgelaufen → Filter matchte nicht, upsert
        # kollidiert mit existierendem _id. Genau der Skip-Case.
        lock_doc = None
    # Prüfen: gehört der Lock jetzt uns? (owner_token identifiziert uns)
    if not lock_doc or lock_doc.get("owner_token") != own_token:
        # Ein anderer Prozess hält den Lock noch — sauber überspringen.
        existing = await db.job_locks.find_one({"_id": LOCK_ID}) or {}
        holder = existing.get("trigger_source") or "unknown"
        holder_since = existing.get("acquired_at")
        logger.info("news_fetch_skipped_already_running trigger=%s held_by=%s since=%s",
                    trigger_source, holder, holder_since)
        return {
            "skipped": True,
            "reason": "already_running",
            "trigger_source": trigger_source,
            "held_by": holder,
            "held_since": holder_since.isoformat() if isinstance(holder_since, datetime) else None,
            "started_at": started.isoformat(),
        }

    logger.info("news_fetch_started trigger=%s", trigger_source)
    stats = {"started_at": started.isoformat(), "trigger_source": trigger_source,
             "fetched": 0, "relevant": 0, "new": 0, "merged": 0, "updated": 0, "errors": []}
    now = started
    # Falls hier eine Exception den Return blockiert, gibt der TTL-basierte
    # Mongo-Lock den Slot nach 10 Min automatisch frei — Dead-Lock-Schutz.
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
            # 1) Dedup nach externer URL (source URL) — falls Publisher den Link
            #    wiederverwendet, ist das der stabilste Anker.
            existing = await db.news_raw.find_one({"source_urls": link})
            if not existing:
                existing = await db.news_raw.find_one({"fingerprint": fp})
            if existing:
                # 2) Update bestehendes Item, wenn Titel, Summary oder Bild sich
                #    tatsächlich verändert haben (Publisher überschreiben oft).
                changed_fields: dict = {}
                if title and title != existing.get("title"):
                    changed_fields["title"] = title
                new_summary_clean = summary[:2000]
                if new_summary_clean and new_summary_clean != existing.get("summary"):
                    changed_fields["summary"] = new_summary_clean
                # Bild nur updaten, wenn Publisher jetzt eines liefert und bisher Fallback lief.
                rss_image_now = _extract_rss_image(entry)
                if rss_image_now and rss_image_now != existing.get("image_url"):
                    changed_fields["image_url"] = rss_image_now
                    changed_fields["image_attribution"] = f"Foto: {feed_cfg['name']}"
                    changed_fields["image_source"] = feed_cfg["name"]
                if changed_fields:
                    changed_fields["updated_at"] = now
                    await db.news_raw.update_one({"_id": existing["_id"]}, {"$set": changed_fields})
                    stats["updated"] = stats.get("updated", 0) + 1
                # 3) Zweit-Publisher desselben Ereignisses hinterlegen.
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
            # Bildextraktion aus dem RSS-Entry (Publisher-Foto bevorzugt)
            rss_image = _extract_rss_image(entry)
            # Kategorie-Detection (fällt auf Feed-Default zurück)
            category = _detect_category(f"{title} {summary}",
                                          fallback=feed_cfg.get("default_category", DEFAULT_CATEGORY))
            # Editorial-Fallback anwenden, falls RSS kein brauchbares Bild lieferte
            # ODER wenn das RSS-Bild nicht mehr erreichbar ist (HEAD-Check).
            if rss_image and not await _validate_image_url(rss_image):
                logger.info("rss_image_invalid feed=%s url=%s → fallback", feed_cfg["name"], rss_image[:120])
                rss_image = None
            if not rss_image:
                fb = _pick_fallback(category, title)
                rss_image = fb["image_url"]
                image_attribution = fb["image_attribution"]
                image_source = fb.get("image_source", "Unsplash")
            else:
                image_attribution = f"Foto: {feed_cfg['name']}"
                image_source = feed_cfg["name"]
            # published_at parsen
            pub_dt = None
            for field in ("published_parsed", "updated_parsed"):
                if entry.get(field):
                    try:
                        import time as _time
                        pub_dt = datetime.fromtimestamp(_time.mktime(entry[field]), tz=timezone.utc)
                        break
                    except Exception:
                        pass
            slug = f"{_slugify(title)[:70]}-{fp[:8]}"
            await db.news_raw.insert_one({
                "fingerprint": fp,
                "slug": slug,
                "title": title,
                "summary": summary[:2000],
                "source_names": [feed_cfg["name"]],
                "source_urls":  [link],
                "source_weight": feed_cfg["weight"],
                "source_weight_max": feed_cfg["weight"],
                "primary_source": feed_cfg["primary"],
                "default_category": feed_cfg.get("default_category", DEFAULT_CATEGORY),
                "category": category,
                "image_url": rss_image,
                "image_attribution": image_attribution,
                "image_source": image_source,
                "fetched_at": now,
                "published_at": pub_dt or now,
                "published_raw": entry.get("published") or entry.get("updated"),
                "used_for_synthesis": False,
                # Aggregator-Ready: darf direkt im Public-Feed erscheinen
                "is_aggregated": True,
                "is_published": True,
            })
            stats["new"] += 1
    stats["duration_s"] = round((datetime.now(timezone.utc) - started).total_seconds(), 2)
    logger.info("fetch_feeds_summary %s", stats)
    # Summary persistieren für /admin/status & Startup-Guard
    try:
        await db.job_summaries.update_one(
            {"_id": "fetch_feeds"},
            {"$set": {
                "last_started_at": started,
                "last_success_at": datetime.now(timezone.utc),
                "last_summary": {k: v for k, v in stats.items() if k != "errors"} | {
                    "errors": len(stats.get("errors") or []),
                },
                "last_trigger_source": trigger_source,
            }},
            upsert=True,
        )
    except Exception:  # noqa: BLE001
        logger.exception("news_fetch_summary_persist_failed")
    # Lock immer freigeben — Vergleich via owner_token (robust gegen BSON-ms).
    try:
        await db.job_locks.delete_one({"_id": LOCK_ID, "owner_token": own_token})
    except Exception:  # noqa: BLE001
        logger.exception("news_fetch_lock_release_failed")
    return stats


# ---------------------------------------------------------------------------
# LLM synthesis — variabler Umfang je Kategorie / Faktenlage
# ---------------------------------------------------------------------------
# Kurze Meldung / Ticker  : 300–500 Wörter
# Normale Nachricht        : 500–800 Wörter
# Analyse / Hintergrund    : 700–1000 Wörter
_LONG_CATEGORIES = {"wirtschaft", "zinsen", "maerkte", "politik", "europa", "welt", "unternehmen"}
_SHORT_CATEGORIES = {"kultur", "sport", "wissen"}


def _target_length(category: str, sources: List[str], is_primary: bool, relevance: int) -> Tuple[int, int]:
    n_src = len(sources or [])
    if relevance >= 60 or n_src >= 3 or (is_primary and category in _LONG_CATEGORIES):
        return (700, 1000)
    if n_src >= 2 or is_primary or category in _LONG_CATEGORIES:
        return (500, 800)
    if category in _SHORT_CATEGORIES:
        return (300, 500)
    return (400, 650)


def _build_system_prompt(min_w: int, max_w: int) -> str:
    return (
        "Du bist ein erfahrener deutscher Wirtschafts- und Finanzredakteur der Fröhlich "
        "Vermögensberatung GmbH. Du erstellst aus offiziellen Fakten mehrerer Quellen "
        "(Tagesschau, EZB, Bundesbank, DW, EU-Kommission, BaFin, Handelsblatt, SPIEGEL, FAZ, "
        "ZEIT, Reuters, dpa u. a.) eigenständige, seriöse deutsche Nachrichtenartikel für "
        "Kunden einer Vermögensberatung.\n\n"
        "ABSOLUTE REGELN:\n"
        "1. NIEMALS Fremdtexte 1:1 übernehmen — vollständig in eigener Redaktionssprache formulieren.\n"
        "2. Wenn mehrere Quellen zum gleichen Ereignis vorliegen: konsolidieren, sich ergänzende Fakten "
        "   nutzen, ohne einzelne Formulierungen zu übernehmen.\n"
        "3. NIEMALS Zahlen, Zitate, Personen, Orte oder konkrete Aussagen erfinden. Nur nutzen, was "
        "   in den bereitgestellten Fakten explizit steht. Bei unklarer Datenlage allgemein bleiben.\n"
        "4. NIEMALS Kauf-/Verkaufsempfehlungen, keine individuelle Anlageberatung.\n"
        "5. Ton: sachlich, neutral, präzise. Kein Clickbait. Keine Superlative ohne Beleg.\n"
        f"6. Umfang: {min_w}–{max_w} Wörter. Bei dünner Faktenlage darf der Artikel kürzer sein "
        "   (min. 250 Wörter), aber niemals künstlich aufgebläht. Keine Wiederholungen zum Streckenlegen.\n\n"
        "PFLICHT-STRUKTUR mit `## `-Zwischenüberschriften (in dieser Reihenfolge):\n"
        "  ## Was ist passiert?\n"
        "  ## Der Hintergrund\n"
        "  ## Warum ist das für Wirtschaft und Märkte wichtig?\n"
        "  ## Was bedeutet das für Anleger?\n"
        "  ## Was jetzt wichtig wird\n"
        "Der Abschnitt \u201eWas jetzt wichtig wird\u201c enthält 2\u20135 klare Beobachtungspunkte als Aufzählung "
        "(Bullet Points mit `- `). Keine Anlageempfehlungen — nur Beobachtungspunkte.\n\n"
        "ANTWORTFORMAT: Antworte AUSSCHLIESSLICH mit einem gültigen JSON-Objekt "
        "(kein Codefence, kein zusätzlicher Text) mit den Feldern:\n"
        "  - title      (string, seriöse, konkrete Schlagzeile ohne Clickbait)\n"
        "  - subtitle   (string, kurzer erläuternder Untertitel)\n"
        "  - summary    (string, 2–3 Sätze mit der wichtigsten Aussage)\n"
        "  - content    (string, gesamter Artikel mit `## `-Zwischenüberschriften)\n"
    )


async def _synthesize_article(raw_items: List[dict], *, target: Tuple[int, int] = (500, 800)) -> Optional[dict]:
    """Bündelt raw-Items zu einem Artikel via Claude Sonnet 5.

    Bei mehreren raw_items (Multi-Publisher-Gruppe) werden alle Fakten in einem
    einzigen LLM-Call zusammengeführt, so dass ein konsolidierter Artikel mit
    einheitlicher Quellenangabe entsteht.
    """
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        logger.error("EMERGENT_LLM_KEY missing — synthesis skipped")
        return None
    min_w, max_w = target
    facts_blocks = []
    for r in raw_items:
        publisher = ", ".join(r.get("source_names", []) or ["Unbekannt"])
        published = r.get("published_at")
        published_str = published.isoformat() if hasattr(published, "isoformat") else str(published or "")
        facts_blocks.append(
            f"[Publisher: {publisher} | Zeit: {published_str}]\n"
            f"Titel: {r['title']}\nInhalt: {r.get('summary', '')}"
        )
    facts = "\n\n".join(facts_blocks)
    chat = LlmChat(
        api_key=api_key,
        session_id=f"news-{raw_items[0]['fingerprint'][:8]}",
        system_message=_build_system_prompt(min_w, max_w),
    ).with_model("anthropic", "claude-sonnet-5")
    intro = (
        f"Erstelle EINEN eigenständigen deutschen Nachrichtenartikel ({min_w}–{max_w} Wörter) "
        "aus den folgenden Faktenlagen. Wenn mehrere Publisher-Meldungen vorliegen, konsolidiere "
        "sie zu einem kohärenten Artikel — behalte alle belegten Fakten, vermeide Widersprüche.\n\n"
    )
    user = UserMessage(text=intro + facts)
    try:
        response = await chat.send_message(user)
        raw = getattr(response, "text", None) or str(response)
    except Exception as exc:  # noqa: BLE001
        logger.exception("llm_call_failed: %s", exc)
        return None
    data = _parse_llm_json(raw)
    if data is None:
        # Einzelner LLM-JSON-Fehler darf den gesamten Synthese-Lauf nicht
        # stoppen — Cluster wird geskippt, nächster Cluster läuft weiter.
        return None
    return data


# ---------------------------------------------------------------------------
# LLM-JSON-Robustness (Session News-Reliability)
# ---------------------------------------------------------------------------
# Claude Sonnet 5 antwortet gelegentlich mit JSON, das unescaped Newlines
# oder Steuerzeichen in String-Feldern enthält (z. B. mehrzeiliger `content`).
# `json.loads` schlägt dann mit "Invalid control character" fehl. Statt den
# gesamten Cluster zu verlieren, versuchen wir drei Parse-Stufen und geben
# strukturiert `None` zurück, wenn alle scheitern.
_JSON_OBJECT_RE = re.compile(r"\{.*\}", re.DOTALL)
_CTRL_IN_STRING_RE = re.compile(r"(?<!\\)([\x00-\x08\x0b\x0c\x0e-\x1f])")


def _parse_llm_json(raw: str) -> Optional[dict]:
    """Robuster JSON-Parser für LLM-Ausgaben.

    Reihenfolge:
      1. Strict `json.loads` auf das erste `{...}`-Match.
      2. `strict=False` (erlaubt Steuerzeichen in Strings).
      3. Manueller Repair-Pass: escape unescaped Control-Chars, retry.
    Bei allen Fehlschlägen: Warnung loggen, `None` zurückgeben. Kein
    Exception-Bubbling, kein Datenverlust anderer Cluster.
    """
    if not raw:
        logger.warning("llm_json_empty_response")
        return None
    m = _JSON_OBJECT_RE.search(raw)
    candidate = m.group(0) if m else raw

    # 1) Strict
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        pass

    # 2) Non-strict (erlaubt \n, \t, ... innerhalb von String-Literalen)
    try:
        data = json.loads(candidate, strict=False)
        logger.info("llm_json_parsed_non_strict len=%d", len(candidate))
        return data
    except json.JSONDecodeError as exc:
        logger.warning("llm_json_non_strict_fail pos=%s msg=%s",
                       getattr(exc, "pos", "?"), str(exc)[:120])

    # 3) Repair-Pass: escape unescaped C0-Control-Chars
    repaired = _CTRL_IN_STRING_RE.sub(lambda mo: "\\u%04x" % ord(mo.group(1)), candidate)
    try:
        data = json.loads(repaired, strict=False)
        logger.info("llm_json_repaired len=%d", len(repaired))
        return data
    except json.JSONDecodeError as exc:
        logger.warning("llm_json_repair_fail pos=%s msg=%s",
                       getattr(exc, "pos", "?"), str(exc)[:200])
        return None


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

# ---------------------------------------------------------------------------
# Topic clustering — mehrere Publisher zum selben Ereignis zusammenführen
# ---------------------------------------------------------------------------

def _cluster_raw_items(raws: List[dict]) -> List[List[dict]]:
    """Greedy Clustering: gruppiere Roh-Items desselben Ereignisses.

    Zwei Items gehören zusammen, wenn:
      - published_at innerhalb 24h liegt, UND
      - title_similarity ≥ 0.5 und ≥ 1 Entity überlappt, ODER
      - title_similarity ≥ 0.65 (sehr hoch, auch ohne Entity-Match)

    Konservative Schwellen: lieber getrennte Artikel als falsche Merges.
    """
    groups: List[List[dict]] = []
    # Sortieren nach primary_source zuerst (die Institution setzt den "Anker")
    ordered = sorted(raws, key=lambda r: (
        not r.get("primary_source", False),
        -_score_relevance(r),
    ))
    for raw in ordered:
        r_ents = _extract_entities(raw.get("title", ""), raw.get("summary", ""))
        r_time = raw.get("published_at") or raw.get("fetched_at")
        placed = False
        for g in groups:
            ref = g[0]
            ref_time = ref.get("published_at") or ref.get("fetched_at")
            if r_time and ref_time:
                try:
                    if abs((r_time - ref_time).total_seconds()) > 24 * 3600:
                        continue
                except Exception:
                    pass
            sim = _title_similarity(raw.get("title", ""), ref.get("title", ""))
            ref_ents = _extract_entities(ref.get("title", ""), ref.get("summary", ""))
            overlap = len(r_ents & ref_ents)
            same_cat = (raw.get("category") == ref.get("category"))
            # Konservative Merges, mehrere Signale kombinieren:
            #  - sehr hohe Titel-Ähnlichkeit (>=0.65) → immer mergen
            #  - hohe Ähnlichkeit + Entity-Match + gleiche Kategorie
            #  - >=2 gemeinsame Entities + gleiche Kategorie
            #    (belastbar, wenn Titel unterschiedlich formuliert sind)
            #  - >=3 gemeinsame Entities kategorie-übergreifend
            if sim >= 0.65 \
               or (sim >= 0.5 and overlap >= 1 and same_cat) \
               or (overlap >= 2 and same_cat) \
               or (overlap >= 3):
                g.append(raw)
                placed = True
                break
        if not placed:
            groups.append([raw])
    return groups


def _merge_group_meta(group: List[dict]) -> dict:
    """Aggregiere Metadaten (source_names, source_urls, category, fingerprint) einer Gruppe."""
    seen_srcs: dict[str, str] = {}
    fingerprints: list[str] = []
    is_primary = False
    max_weight = 0.0
    for r in group:
        for n, u in zip(r.get("source_names", []), r.get("source_urls", [])):
            if n and n not in seen_srcs:
                seen_srcs[n] = u
        fingerprints.append(r.get("fingerprint", ""))
        if r.get("primary_source"):
            is_primary = True
        max_weight = max(max_weight, r.get("source_weight_max", r.get("source_weight", 1.0)))
    anchor = group[0]
    return {
        "sources": list(seen_srcs.keys()),
        "urls": [seen_srcs[n] for n in seen_srcs],
        "fingerprints": fingerprints,
        "is_primary": is_primary,
        "max_weight": max_weight,
        "anchor": anchor,
    }


async def synthesize_pending(db, max_articles: int = 25) -> dict:
    """Wandle unbenutzte Roh-Items in publizierte Artikel um.

    Neu: gruppiert erst alle unbenutzten Items nach Ereignis (title-similarity +
    entity-overlap + Zeitfenster), führt dann pro Gruppe genau EINEN LLM-Call
    aus und speichert einen konsolidierten Artikel mit allen Quellen.
    """
    started_synth = datetime.now(timezone.utc)
    stats = {"groups_total": 0, "processed": 0, "published": 0, "needs_review": 0,
             "skipped_duplicate": 0, "updated_existing": 0, "llm_failed": 0}
    # Roh-Items der letzten 48h (mehr Kontext für Gruppierung)
    since = datetime.now(timezone.utc) - timedelta(hours=48)
    cursor = db.news_raw.find({
        "used_for_synthesis": False,
        "$or": [{"published_at": {"$gte": since}}, {"fetched_at": {"$gte": since}}],
    }).sort([("published_at", -1), ("fetched_at", -1)]).limit(120)
    candidates = await cursor.to_list(120)
    groups = _cluster_raw_items(candidates)
    stats["groups_total"] = len(groups)
    # Höchste Priorität zuerst
    groups.sort(key=lambda g: (
        any(r.get("primary_source") for r in g),
        len({n for r in g for n in r.get("source_names", [])}),
        max((_score_relevance(r) for r in g), default=0),
    ), reverse=True)

    now = datetime.now(timezone.utc)
    for group in groups:
        if stats["published"] >= max_articles:
            break
        stats["processed"] += 1
        meta = _merge_group_meta(group)
        anchor = meta["anchor"]
        category = _detect_category(f"{anchor['title']} {anchor.get('summary', '')}")

        # 1. Duplikat-Prüfung: existiert bereits Artikel zum Ereignis?
        existing = await _find_existing_similar(db, anchor, category)
        if existing:
            new_sources = [n for n in meta["sources"] if n not in existing.get("source_names", [])]
            if new_sources:
                merged_sources = existing.get("source_names", []) + new_sources
                merged_urls = existing.get("source_urls", []) + [
                    meta["urls"][meta["sources"].index(n)] for n in new_sources
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
            for r in group:
                await db.news_raw.update_one({"_id": r["_id"]}, {"$set": {"used_for_synthesis": True}})
            continue

        # 2. LLM-Synthese für gesamte Gruppe
        relevance = max((_score_relevance(r) for r in group), default=0)
        target = _target_length(category, meta["sources"], meta["is_primary"], relevance)
        logger.info("synthesis_start title=%s sources=%s target=%s group_size=%d",
                    anchor["title"][:80], meta["sources"], target, len(group))
        article = await _synthesize_article(group, target=target)
        if not article:
            stats["llm_failed"] += 1
            continue

        # 3. Qualitäts-Gate
        ok, reason = _quality_gate(article, meta["sources"], meta["is_primary"])

        # 4. Bild via Unsplash — editorial, thematisch passend
        img = await _fetch_unsplash_image(
            category, article.get("title") or anchor["title"],
            summary=article.get("summary") or anchor.get("summary", ""), db=db,
        )
        # Letzter Validierungsgang: sollte _fetch_unsplash_image trotz interner
        # Validierung ein defektes Motiv geliefert haben, greift der deterministische
        # Fallback aus dem Kategorie-Pool.
        if not await _validate_image_url(img.get("image_url", "")):
            logger.info("synth_image_invalid slug=%s → category-fallback", anchor.get("slug"))
            img = _pick_fallback(category, article.get("title") or anchor["title"])

        slug = _slugify(article.get("title") or anchor["title"])
        # Session 80.31 — zentrale Topic-Zuordnung. Wir schreiben den Slug nur,
        # wenn High-Confidence erreicht ist; sonst bleibt das Feld None
        # („lieber kein Topic als ein falsches Topic").
        try:
            from topic_mapper import classify_article as _classify_topic
            from tag_extractor import extract_news_tags as _extract_tags
            _tags = _extract_tags(
                title=article.get("title") or "",
                summary=article.get("summary") or "",
                category=category,
            )
            _match = _classify_topic(
                title=article.get("title") or "",
                summary=article.get("summary") or "",
                category=category,
                tags=_tags,
            )
            topic_slug = _match.slug if _match else None
        except Exception:  # noqa: BLE001
            _tags = []
            topic_slug = None
        doc = {
            "slug": slug,
            "title": article.get("title"),
            "subtitle": article.get("subtitle"),
            "summary": article.get("summary"),
            "content": article.get("content"),
            "category": category,
            "content_type": "news_synthesis",
            "investment_topic_slug": topic_slug,
            "tags": _tags,
            "sources":       [{"name": n, "url": u} for n, u in zip(meta["sources"], meta["urls"])],
            "source_names":  meta["sources"],
            "source_urls":   meta["urls"],
            "raw_fingerprint": anchor["fingerprint"],
            "raw_fingerprints": meta["fingerprints"],
            "image_url":         img["image_url"],
            "hero_image_url":    img["hero_image_url"],
            "image_unsplash_id": img.get("image_unsplash_id"),
            "image_unsplash_query": img.get("image_unsplash_query"),
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
            "is_top_news":  ok and relevance >= 55,
            "is_breaking":  False,
            "relevance_score": relevance,
            "target_length": {"min": target[0], "max": target[1]},
            "quality_note": None if ok else reason,
            "related_symbols": _detect_related_symbols_safe(
                title=article.get("title") or "",
                subtitle=article.get("subtitle") or "",
                summary=article.get("summary") or "",
            ),
        }
        try:
            await db.news_articles.update_one({"slug": slug}, {"$set": doc}, upsert=True)
        except Exception:  # noqa: BLE001
            logger.exception("save_article_failed slug=%s", slug)
            continue
        for r in group:
            await db.news_raw.update_one({"_id": r["_id"]}, {"$set": {"used_for_synthesis": True}})
        if ok:
            stats["published"] += 1
            logger.info("article_published slug=%s score=%d words=%d sources=%d",
                        slug, relevance, len((article.get("content") or "").split()), len(meta["sources"]))
        else:
            stats["needs_review"] += 1
            logger.info("article_needs_review slug=%s reason=%s", slug, reason)
    logger.info("synthesize_pending_summary %s", stats)
    # Summary persistieren für /admin/status
    try:
        await db.job_summaries.update_one(
            {"_id": "synthesize_pending"},
            {"$set": {
                "last_started_at": started_synth,
                "last_success_at": datetime.now(timezone.utc),
                "last_summary": dict(stats),
            }},
            upsert=True,
        )
    except Exception:  # noqa: BLE001
        logger.exception("news_synth_summary_persist_failed")
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
