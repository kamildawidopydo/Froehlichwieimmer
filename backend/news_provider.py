"""
News provider abstraction for the /news/nachrichten feature.

Sources of truth:
  1. `MongoNewsProvider`  — production. Reads published articles from
     the `news_articles` collection (populated by the news synthesizer).
  2. `EuronewsDemoProvider` — dev-only. Only used when the env flag
     `NEWS_ENABLE_DEMO=1` is set. Never served in production.

Every payload conforms to the normalised model in `NORMALISED_KEYS` so
the React layer never has to know which provider produced it.
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import List, Optional


NORMALISED_KEYS = (
    "id", "slug", "title", "summary", "category", "image_url",
    "video_embed_url", "published_at", "source", "source_url",
    "article_content", "language", "content_type", "is_demo",
)


CATEGORIES = [
    {"slug": "alle",       "label": "Alle"},
    {"slug": "politik",    "label": "Politik"},
    {"slug": "wirtschaft", "label": "Wirtschaft"},
    {"slug": "europa",     "label": "Europa"},
    {"slug": "welt",       "label": "Welt"},
    {"slug": "wissen",     "label": "Wissen"},
    {"slug": "umwelt",     "label": "Umwelt"},
    {"slug": "kultur",     "label": "Kultur"},
    {"slug": "sport",      "label": "Sport"},
    {"slug": "videos",     "label": "Videos"},
]
_CATEGORY_SLUGS = {c["slug"] for c in CATEGORIES}


def _ago(hours: int = 0, minutes: int = 0) -> str:
    return (datetime.now(timezone.utc) - timedelta(hours=hours, minutes=minutes)).isoformat()


# --- DEMO items ------------------------------------------------------------
# Every headline explicitly reads DEMO so nobody confuses this with real
# Euronews reporting. Once the licence is active, the DEMO connector is
# replaced by a real Euronews MRSS/API adapter that emits the same shape.

_DEMO_ITEMS: List[dict] = [
    {
        "slug": "demo-eu-wirtschaftspaket",
        "title": "DEMO — EU einigt sich auf neues Wirtschaftspaket",
        "subtitle": "Rahmen für Investitionen, Wettbewerbsfähigkeit und industrielle Souveränität",
        "summary": "DEMO-Meldung: Beispielhafter Teaser einer politischen Meldung. Zeigt Layout und Struktur der Hauptmeldung — kein realer Nachrichteninhalt.",
        "category": "europa",
        "image_url": "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=1400&q=70",
        "hero_image_url": "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=1800&q=75",
        "video_embed_url": None,
        "published_at": _ago(hours=1),
        "content_type": "demo",
        "source_name": "Euronews (Demo)",
        "source_url": None,
        "license_allows_fulltext": True,
        "full_text": (
            "DEMO-Volltext. Die EU-Institutionen haben ein Rahmenpaket zur Stärkung der wirtschaftlichen Wettbewerbsfähigkeit vorgestellt. "
            "Die Maßnahmen umfassen Investitionsanreize, Regeln für industrielle Souveränität und ein koordiniertes Vorgehen der Mitgliedstaaten.\n\n"
            "## Kontext\nDies ist ein Demo-Beitrag zur Illustration des Layouts der internen Detailseite. "
            "Realer Content wird nach Lizenzabschluss mit Euronews Commercial durch offizielle Inhalte ersetzt.\n\n"
            "## Ausblick\nDie kommenden Wochen zeigen, wie das Paket in nationale Gesetzgebungen überführt wird."
        ),
    },
    {
        "slug": "demo-deutsche-exporte",
        "title": "DEMO — Deutsche Exporte legen im Quartal zu",
        "subtitle": "Auslandsnachfrage bleibt trotz Unsicherheit stabil",
        "summary": "DEMO-Meldung: Platzhalter für eine Wirtschaftsschlagzeile. Wird durch echte Inhalte ersetzt, sobald Lizenz vorliegt.",
        "category": "wirtschaft",
        "image_url": "https://images.unsplash.com/photo-1494412651409-8963ce7935a7?w=800&q=70",
        "hero_image_url": "https://images.unsplash.com/photo-1494412651409-8963ce7935a7?w=1800&q=75",
        "video_embed_url": None,
        "published_at": _ago(hours=2),
        "content_type": "demo",
        "license_allows_fulltext": True,
        "full_text": "DEMO-Volltext zur Exportmeldung. Der Volltext liegt nur als Demo vor und dient zur Illustration.\n\n## Details\nDies ist ein Testbeitrag und ersetzt keinen echten Wirtschaftsartikel.",
    },
    {
        "slug": "demo-klimagipfel",
        "title": "DEMO — Klimagipfel: Regierungen ringen um gemeinsame Position",
        "subtitle": "Verhandlungen um verbindliche Reduktionsziele",
        "summary": "DEMO-Meldung zur Sektion Umwelt. Illustriert Card-Layout, Kategorie-Farbe und Bildstruktur.",
        "category": "umwelt",
        "image_url": "https://images.unsplash.com/photo-1569163139394-de44cb5894c9?w=800&q=70",
        "hero_image_url": "https://images.unsplash.com/photo-1569163139394-de44cb5894c9?w=1800&q=75",
        "video_embed_url": None,
        "published_at": _ago(hours=3),
        "content_type": "demo",
        "license_allows_fulltext": True,
        "full_text": "DEMO-Volltext Klimagipfel. Testinhalt zur Darstellung des Detailseiten-Layouts.",
    },
    {
        "slug": "demo-forschung-quantum",
        "title": "DEMO — Europäische Forschungsallianz stellt Quantenprojekt vor",
        "subtitle": "Neues Konsortium bündelt Kompetenzen in Grundlagenforschung",
        "summary": "DEMO-Meldung: Platzhalter für einen Wissenschaftsbeitrag. Bild, Titel, Kategorie und Teaser sind Testinhalte.",
        "category": "wissen",
        "image_url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=70",
        "hero_image_url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1800&q=75",
        "video_embed_url": None,
        "published_at": _ago(hours=4),
        "content_type": "demo",
        "license_allows_fulltext": True,
        "full_text": "DEMO-Volltext Quantenforschung. Illustrativer Testinhalt.",
    },
    {
        "slug": "demo-berlin-koalition",
        "title": "DEMO — Berliner Koalition beschließt Investitionspaket",
        "subtitle": "Infrastruktur, Bildung und Digitalisierung im Fokus",
        "summary": "DEMO-Meldung: Beispielhafter politischer Beitrag. Wird bei Lizenzabschluss durch aktuelle Meldungen ersetzt.",
        "category": "politik",
        "image_url": "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&q=70",
        "hero_image_url": "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1800&q=75",
        "video_embed_url": None,
        "published_at": _ago(hours=5),
        "content_type": "demo",
        "license_allows_fulltext": True,
        "full_text": "DEMO-Volltext Berliner Koalition. Testbeitrag zur internen Detailansicht.",
    },
    {
        "slug": "demo-kultur-buchmesse",
        "title": "DEMO — Buchmesse eröffnet mit europäischem Schwerpunkt",
        "subtitle": "Fokus auf Übersetzungen und literarische Vielfalt",
        "summary": "DEMO-Meldung Kultur: Zeigt Card-Rhythmus und Fließtext-Kombination des Layouts.",
        "category": "kultur",
        "image_url": "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&q=70",
        "hero_image_url": "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1800&q=75",
        "video_embed_url": None,
        "published_at": _ago(hours=6),
        "content_type": "demo",
        "license_allows_fulltext": True,
        "full_text": "DEMO-Volltext Buchmesse. Kultur-Testinhalt.",
    },
    {
        "slug": "demo-sport-champions",
        "title": "DEMO — Champions League: Auslosung mit deutscher Beteiligung",
        "subtitle": "Sechs Bundesliga-Klubs mit Losentscheid konfrontiert",
        "summary": "DEMO-Meldung Sport: Beispielinhalt für die Sport-Kategorie.",
        "category": "sport",
        "image_url": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&q=70",
        "hero_image_url": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1800&q=75",
        "video_embed_url": None,
        "published_at": _ago(hours=8),
        "content_type": "demo",
        "license_allows_fulltext": True,
        "full_text": "DEMO-Volltext Champions League. Sport-Testinhalt.",
    },
    {
        "slug": "demo-welt-gipfel",
        "title": "DEMO — G20-Vorbereitung: Themen im Überblick",
        "subtitle": "Handelspolitik, Klimafragen und Sicherheit auf der Agenda",
        "summary": "DEMO-Meldung Welt: Übersichtsmeldung zur Vorbereitung eines internationalen Gipfels.",
        "category": "welt",
        "image_url": "https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=800&q=70",
        "hero_image_url": "https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=1800&q=75",
        "video_embed_url": None,
        "published_at": _ago(hours=10),
        "content_type": "demo",
        "license_allows_fulltext": True,
        "full_text": "DEMO-Volltext G20-Vorbereitung. Welt-Testinhalt.",
    },
    {
        "slug": "demo-video-frankfurt",
        "title": "DEMO — Video-Beitrag Finanzplatz Frankfurt (Platzhalter)",
        "subtitle": "Videobeitrag zur Rolle Frankfurts im europäischen Finanzsystem",
        "summary": "DEMO-Video: Platzhalter für ein offizielles Euronews-Video. Wird erst nach Lizenzabschluss durch einen offiziellen Embed ersetzt.",
        "category": "videos",
        "image_url": "https://images.unsplash.com/photo-1518544801976-3e159e50e5bb?w=800&q=70",
        "hero_image_url": "https://images.unsplash.com/photo-1518544801976-3e159e50e5bb?w=1800&q=75",
        "video_embed_url": None,
        "published_at": _ago(hours=12),
        "content_type": "video",
        "license_allows_fulltext": True,
        "full_text": "DEMO-Video-Placeholder. Wird bei Lizenzfreigabe durch offiziellen Video-Embed ersetzt.",
    },
    {
        "slug": "demo-video-europa-parlament",
        "title": "DEMO — Video-Beitrag Debatte im Europaparlament (Platzhalter)",
        "subtitle": "Aufzeichnung einer Plenardebatte (Demo)",
        "summary": "DEMO-Video: Zeigt Video-Card-Layout mit Play-Button und Kategorie-Marker.",
        "category": "videos",
        "image_url": "https://images.unsplash.com/photo-1580128637411-cd88ee46f30d?w=800&q=70",
        "hero_image_url": "https://images.unsplash.com/photo-1580128637411-cd88ee46f30d?w=1800&q=75",
        "video_embed_url": None,
        "published_at": _ago(hours=14),
        "content_type": "video",
        "license_allows_fulltext": True,
        "full_text": "DEMO-Video-Placeholder Europaparlament.",
    },
    {
        "slug": "demo-wirtschaft-zinsen",
        "title": "DEMO — Zinsentscheid steht an: Erwartungen der Analysten",
        "subtitle": "Marktkonsens und mögliche Szenarien",
        "summary": "DEMO-Meldung Wirtschaft: Zeigt Card-Layout im Card-Grid.",
        "category": "wirtschaft",
        "image_url": "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&q=70",
        "hero_image_url": "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1800&q=75",
        "video_embed_url": None,
        "published_at": _ago(hours=16),
        "content_type": "demo",
        "license_allows_fulltext": True,
        "full_text": "DEMO-Volltext Zinsentscheid. Wirtschafts-Testinhalt.",
    },
    {
        "slug": "demo-europa-agrar",
        "title": "DEMO — Agrarreform: Landwirte diskutieren neue Regeln",
        "subtitle": "Reaktion auf angepasste EU-Vorgaben",
        "summary": "DEMO-Meldung Europa: Zusatzmeldung für die Card-Grid-Darstellung.",
        "category": "europa",
        "image_url": "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=800&q=70",
        "hero_image_url": "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1800&q=75",
        "video_embed_url": None,
        "published_at": _ago(hours=20),
        "content_type": "demo",
        "license_allows_fulltext": True,
        "full_text": "DEMO-Volltext Agrarreform. Europa-Testinhalt.",
    },
]


def _normalise(item: dict, provider: str, is_demo: bool) -> dict:
    src_url = item.get("source_url")
    license_allows_fulltext = item.get("license_allows_fulltext", is_demo)
    full_text = item.get("full_text") if license_allows_fulltext else None
    content_type = item.get("content_type", "article")
    # Normalise content_type to the new licence-aware taxonomy expected by the FE
    if content_type not in {"licensed_fulltext", "editorial_summary", "demo", "video", "article"}:
        content_type = "article"
    if is_demo and content_type == "article":
        content_type = "demo"
    elif not is_demo:
        content_type = "licensed_fulltext" if license_allows_fulltext else "editorial_summary"
    return {
        "id": item["slug"],
        "slug": item["slug"],
        "title": item["title"],
        "subtitle": item.get("subtitle"),
        "summary": item["summary"],
        "category": item["category"],
        "image_url": item.get("image_url"),
        "hero_image_url": item.get("hero_image_url") or item.get("image_url"),
        "video_embed_url": item.get("video_embed_url"),
        "published_at": item.get("published_at"),
        "source": provider,
        "source_name": item.get("source_name", "Euronews (Demo)" if is_demo else "Euronews"),
        "source_url": src_url,
        "full_text": full_text,
        "article_content": item.get(
            "article_content",
            "DEMO-Testdaten. Der vollständige Artikeltext wird erst nach Lizenzabschluss "
            "mit Euronews Commercial durch echten Content ersetzt. Dieses Layout dient nur "
            "der Darstellung und ist keine reale Nachrichtenmeldung.",
        ),
        "language": item.get("language", "de"),
        "content_type": content_type,
        "license_allows_fulltext": bool(license_allows_fulltext),
        "is_demo": is_demo,
    }


class NewsProvider:
    """Abstract news provider interface."""

    name: str = "abstract"
    is_demo: bool = True

    async def list_items(self, category: Optional[str] = None, limit: int = 20) -> List[dict]:
        raise NotImplementedError

    async def get_item(self, slug: str) -> Optional[dict]:
        raise NotImplementedError


class EuronewsDemoProvider(NewsProvider):
    """DEMO connector — served until a real Euronews licence is signed."""

    name = "euronews-demo"
    is_demo = True

    async def list_items(self, category: Optional[str] = None, limit: int = 20) -> List[dict]:
        cat = (category or "alle").lower()
        pool = _DEMO_ITEMS
        if cat != "alle":
            if cat == "videos":
                pool = [i for i in pool if i.get("content_type") == "video"]
            elif cat in _CATEGORY_SLUGS:
                pool = [i for i in pool if i.get("category") == cat]
        return [_normalise(i, provider=self.name, is_demo=True) for i in pool[:limit]]

    async def get_item(self, slug: str) -> Optional[dict]:
        for i in _DEMO_ITEMS:
            if i["slug"] == slug:
                return _normalise(i, provider=self.name, is_demo=True)
        return None


class EuronewsLicensedProvider(NewsProvider):
    """Placeholder — activated once a commercial licence + MRSS/API access exists.

    On activation, implement:
      - MRSS parsing per language (de.euronews.com/rss variants)
      - Official article/video embed URL extraction
      - Rate-limit + Mongo cache mirroring the market data cache pattern
    """

    name = "euronews-licensed"
    is_demo = False

    async def list_items(self, category: Optional[str] = None, limit: int = 20) -> List[dict]:
        raise NotImplementedError("Licence not active — currently served by EuronewsDemoProvider")

    async def get_item(self, slug: str) -> Optional[dict]:
        raise NotImplementedError("Licence not active — currently served by EuronewsDemoProvider")


class MongoNewsProvider(NewsProvider):
    """Production provider — reads synthesized articles from the `news_articles` collection.

    Documents follow the extended shape written by the news synthesizer
    (see news_synthesizer.py — to be added in the next iteration):
      _id, slug, title, subtitle, category, published_at, updated_at,
      image_url, hero_image_url, summary, content, content_type,
      sources[], source_names[], source_urls[], is_published,
      is_breaking, is_top_news, generated_at, last_verified_at.
    """

    name = "news-synthesis"
    is_demo = False
    _db = None  # injected via `set_db`

    @classmethod
    def set_db(cls, db) -> None:
        cls._db = db

    def _to_public(self, doc: dict) -> dict:
        content_type = doc.get("content_type") or "news_synthesis"
        return {
            "id": str(doc.get("_id") or doc.get("slug")),
            "slug": doc["slug"],
            "title": doc["title"],
            "subtitle": doc.get("subtitle"),
            "summary": doc.get("summary", ""),
            "category": doc.get("category", "welt"),
            "image_url": doc.get("image_url"),
            "hero_image_url": doc.get("hero_image_url") or doc.get("image_url"),
            "image_author": doc.get("image_author"),
            "image_author_url": doc.get("image_author_url"),
            "image_source": doc.get("image_source"),
            "image_source_url": doc.get("image_source_url"),
            "image_attribution": doc.get("image_attribution"),
            "video_embed_url": doc.get("video_embed_url"),
            "published_at": (doc.get("published_at") or datetime.now(timezone.utc)).isoformat() if doc.get("published_at") else None,
            "updated_at": (doc.get("updated_at") or doc.get("published_at") or datetime.now(timezone.utc)).isoformat() if (doc.get("updated_at") or doc.get("published_at")) else None,
            "source": self.name,
            "source_name": "Fröhlich Redaktion",
            "source_url": None,  # never link out as primary — sources block below
            "sources": doc.get("sources", []),
            "source_names": doc.get("source_names", []),
            "source_urls": doc.get("source_urls", []),
            "full_text": doc.get("content"),  # eigener Redaktions-Volltext
            "article_content": doc.get("summary", ""),
            "language": "de",
            "content_type": content_type,
            "license_allows_fulltext": True,  # eigener Text — immer voll darstellen
            "is_top_news": bool(doc.get("is_top_news", False)),
            "is_breaking": bool(doc.get("is_breaking", False)),
            "relevance_score": int(doc.get("relevance_score", 0)),
            "is_demo": False,
        }

    def _to_raw_public(self, doc: dict) -> dict:
        """Roh-Item aus news_raw als Aggregator-Karte darstellen (externe Publisher-URL)."""
        published = doc.get("published_at") or doc.get("fetched_at") or datetime.now(timezone.utc)
        publisher = (doc.get("source_names") or ["Redaktion"])[0]
        external_url = (doc.get("source_urls") or [None])[0]
        return {
            "id": doc.get("slug") or str(doc.get("_id")),
            "slug": doc.get("slug") or str(doc.get("_id")),
            "external_id": doc.get("fingerprint"),
            "title": doc.get("title", ""),
            "subtitle": None,
            "summary": (doc.get("summary") or "")[:600],
            "category": doc.get("category") or "wirtschaft",
            "image_url": doc.get("image_url"),
            "hero_image_url": doc.get("image_url"),
            "image_attribution": doc.get("image_attribution"),
            "image_source": doc.get("image_source"),
            "published_at": published.isoformat() if isinstance(published, datetime) else str(published),
            "updated_at": published.isoformat() if isinstance(published, datetime) else str(published),
            "source": self.name,
            "source_name": publisher,      # sichtbarer Publisher (REUTERS / HANDELSBLATT / EZB …)
            "source_url": external_url,     # externer Publisher-Link
            "url": external_url,             # user's Schema-Feld
            "sources": [{"name": publisher, "url": external_url}],
            "source_names": doc.get("source_names") or [publisher],
            "source_urls": doc.get("source_urls") or ([external_url] if external_url else []),
            "full_text": None,               # nie fremden Volltext ausliefern
            "article_content": (doc.get("summary") or "")[:300],
            "language": "de",
            "content_type": "aggregated",   # Frontend erkennt: externer Klick
            "license_allows_fulltext": False,
            "is_top_news": False,
            "is_breaking": False,
            "relevance_score": 0,
            "is_demo": False,
        }

    async def list_items(self, category: Optional[str] = None, limit: int = 20, skip: int = 0,
                         source: Optional[str] = None) -> List[dict]:
        if self._db is None:
            return []
        cat = (category or "alle").lower()
        # Legacy-Aliasse auf kanonische Kategorien mappen
        alias_map = {"umwelt": "klima", "aktien": "maerkte", "aktienmaerkte": "maerkte"}
        cat = alias_map.get(cat, cat)

        # Nur synthetisierte Artikel ausliefern — jeder Publisher fließt über
        # source_names in unseren konsolidierten Redaktionsartikel ein.
        syn_query: dict = {"is_published": True, "status": "published", "content_type": {"$ne": "demo"}}
        if cat != "alle":
            if cat == "videos":
                syn_query["content_type"] = "video"
            else:
                syn_query["category"] = cat

        if source:
            src_raw = str(source).strip()
            src_norm = src_raw.lower().replace("ö", "oe").replace("ä", "ae").replace("ü", "ue")
            if src_norm.replace(" ", "") in {"froehlichredaktion", "froehlich", "redaktion"}:
                # Nur eigene Redaktions-Artikel ohne externe Publisher
                syn_query["$or"] = [
                    {"source_names": {"$exists": False}},
                    {"source_names": {"$size": 0}},
                ]
            else:
                import re as _re
                syn_query["source_names"] = {"$regex": f"^{_re.escape(src_raw)}$", "$options": "i"}

        pool_size = max(limit + skip + 10, 60)
        cursor = (self._db.news_articles.find(syn_query)
                  .sort([("is_top_news", -1), ("relevance_score", -1), ("published_at", -1)])
                  .limit(pool_size))
        docs = await cursor.to_list(pool_size)
        items = [self._to_public(d) for d in docs]
        return items[skip: skip + limit]

    async def count_items(self, category: Optional[str] = None, source: Optional[str] = None) -> int:
        if self._db is None:
            return 0
        cat = (category or "alle").lower()
        alias_map = {"umwelt": "klima", "aktien": "maerkte", "aktienmaerkte": "maerkte"}
        cat = alias_map.get(cat, cat)
        q: dict = {"is_published": True, "status": "published", "content_type": {"$ne": "demo"}}
        if cat != "alle":
            q["category"] = cat
        if source:
            src_raw = str(source).strip()
            src_norm = src_raw.lower().replace("ö", "oe").replace("ä", "ae").replace("ü", "ue")
            if src_norm.replace(" ", "") in {"froehlichredaktion", "froehlich", "redaktion"}:
                q["$or"] = [
                    {"source_names": {"$exists": False}},
                    {"source_names": {"$size": 0}},
                ]
            else:
                import re as _re
                q["source_names"] = {"$regex": f"^{_re.escape(src_raw)}$", "$options": "i"}
        return await self._db.news_articles.count_documents(q)

    async def list_publishers(self) -> List[str]:
        """Distinct Publisher-Namen aus allen synthetisierten Artikeln.

        Sammelt alle in `source_names` referenzierten Publisher (jeder Artikel
        kann mehrere haben, wenn Meldungen aus mehreren Quellen zusammengeführt
        wurden). „Fröhlich Redaktion" wird nur ausgegeben, wenn es Artikel ohne
        externe Quellen gibt.
        """
        if self._db is None:
            return []
        names: set[str] = set()
        pipeline = [
            {"$match": {"is_published": True, "status": "published"}},
            {"$unwind": "$source_names"},
            {"$group": {"_id": "$source_names"}},
        ]
        async for doc in self._db.news_articles.aggregate(pipeline):
            if doc.get("_id"):
                names.add(doc["_id"])
        # Reine Redaktions-Artikel (ohne source_names)?
        has_editorial = await self._db.news_articles.count_documents({
            "is_published": True, "status": "published",
            "$or": [{"source_names": {"$exists": False}}, {"source_names": {"$size": 0}}],
        })
        if has_editorial:
            names.add("Fröhlich Redaktion")
        return sorted(names)

    async def get_item(self, slug: str) -> Optional[dict]:
        if self._db is None:
            return None
        # Nur synthetisierte Artikel — alle News laufen jetzt durch das LLM.
        doc = await self._db.news_articles.find_one({"slug": slug, "is_published": True})
        if doc:
            return self._to_public(doc)
        return None


# ---------------------------------------------------------------------------
# Provider selection — Production ONLY: MongoNewsProvider serves synthesized
# articles (no more Euronews DEMO fallback). Der Demo-Provider bleibt im
# Modul für lokale Entwicklung erhalten, wird aber niemals automatisch
# aktiviert.
# ---------------------------------------------------------------------------
active_provider: NewsProvider = MongoNewsProvider()
