"""
News provider abstraction for the /news/nachrichten feature.

Two providers are wired: a DEMO provider (used until a Euronews commercial
licence is signed) and a placeholder LicensedEuronewsProvider that will
consume an official MRSS/API endpoint once the credentials are available.

Every payload conforms to the normalised model in `NORMALISED_KEYS` so
the React layer never has to know which provider produced it.
"""

from __future__ import annotations

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
        "summary": "DEMO-Meldung: Beispielhafter Teaser einer politischen Meldung. Zeigt Layout und Struktur der Hauptmeldung — kein realer Nachrichteninhalt.",
        "category": "europa",
        "image_url": "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=1400&q=70",
        "video_embed_url": None,
        "published_at": _ago(hours=1),
        "content_type": "article",
    },
    {
        "slug": "demo-deutsche-exporte",
        "title": "DEMO — Deutsche Exporte legen im Quartal zu",
        "summary": "DEMO-Meldung: Platzhalter für eine Wirtschaftsschlagzeile. Wird durch echte Inhalte ersetzt, sobald Lizenz vorliegt.",
        "category": "wirtschaft",
        "image_url": "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&q=70",
        "video_embed_url": None,
        "published_at": _ago(hours=2),
        "content_type": "article",
    },
    {
        "slug": "demo-klimagipfel",
        "title": "DEMO — Klimagipfel: Regierungen ringen um gemeinsame Position",
        "summary": "DEMO-Meldung zur Sektion Umwelt. Illustriert Card-Layout, Kategorie-Farbe und Bildstruktur.",
        "category": "umwelt",
        "image_url": "https://images.unsplash.com/photo-1569163139394-de44cb5894c9?w=800&q=70",
        "video_embed_url": None,
        "published_at": _ago(hours=3),
        "content_type": "article",
    },
    {
        "slug": "demo-forschung-quantum",
        "title": "DEMO — Europäische Forschungsallianz stellt Quantenprojekt vor",
        "summary": "DEMO-Meldung: Platzhalter für einen Wissenschaftsbeitrag. Bild, Titel, Kategorie und Teaser sind Testinhalte.",
        "category": "wissen",
        "image_url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=70",
        "video_embed_url": None,
        "published_at": _ago(hours=4),
        "content_type": "article",
    },
    {
        "slug": "demo-berlin-koalition",
        "title": "DEMO — Berliner Koalition beschließt Investitionspaket",
        "summary": "DEMO-Meldung: Beispielhafter politischer Beitrag. Wird bei Lizenzabschluss durch aktuelle Meldungen ersetzt.",
        "category": "politik",
        "image_url": "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&q=70",
        "video_embed_url": None,
        "published_at": _ago(hours=5),
        "content_type": "article",
    },
    {
        "slug": "demo-kultur-buchmesse",
        "title": "DEMO — Buchmesse eröffnet mit europäischem Schwerpunkt",
        "summary": "DEMO-Meldung Kultur: Zeigt Card-Rhythmus und Fließtext-Kombination des Layouts.",
        "category": "kultur",
        "image_url": "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&q=70",
        "video_embed_url": None,
        "published_at": _ago(hours=6),
        "content_type": "article",
    },
    {
        "slug": "demo-sport-champions",
        "title": "DEMO — Champions League: Auslosung mit deutscher Beteiligung",
        "summary": "DEMO-Meldung Sport: Beispielinhalt für die Sport-Kategorie.",
        "category": "sport",
        "image_url": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&q=70",
        "video_embed_url": None,
        "published_at": _ago(hours=8),
        "content_type": "article",
    },
    {
        "slug": "demo-welt-gipfel",
        "title": "DEMO — G20-Vorbereitung: Themen im Überblick",
        "summary": "DEMO-Meldung Welt: Übersichtsmeldung zur Vorbereitung eines internationalen Gipfels.",
        "category": "welt",
        "image_url": "https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=800&q=70",
        "video_embed_url": None,
        "published_at": _ago(hours=10),
        "content_type": "article",
    },
    {
        "slug": "demo-video-frankfurt",
        "title": "DEMO — Video-Beitrag Finanzplatz Frankfurt (Platzhalter)",
        "summary": "DEMO-Video: Platzhalter für ein offizielles Euronews-Video. Wird erst nach Lizenzabschluss durch einen offiziellen Embed ersetzt.",
        "category": "videos",
        "image_url": "https://images.unsplash.com/photo-1518544801976-3e159e50e5bb?w=800&q=70",
        "video_embed_url": None,
        "published_at": _ago(hours=12),
        "content_type": "video",
    },
    {
        "slug": "demo-video-europa-parlament",
        "title": "DEMO — Video-Beitrag Debatte im Europaparlament (Platzhalter)",
        "summary": "DEMO-Video: Zeigt Video-Card-Layout mit Play-Button und Kategorie-Marker.",
        "category": "videos",
        "image_url": "https://images.unsplash.com/photo-1580128637411-cd88ee46f30d?w=800&q=70",
        "video_embed_url": None,
        "published_at": _ago(hours=14),
        "content_type": "video",
    },
    {
        "slug": "demo-wirtschaft-zinsen",
        "title": "DEMO — Zinsentscheid steht an: Erwartungen der Analysten",
        "summary": "DEMO-Meldung Wirtschaft: Zeigt Card-Layout im Card-Grid.",
        "category": "wirtschaft",
        "image_url": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=70",
        "video_embed_url": None,
        "published_at": _ago(hours=16),
        "content_type": "article",
    },
    {
        "slug": "demo-europa-agrar",
        "title": "DEMO — Agrarreform: Landwirte diskutieren neue Regeln",
        "summary": "DEMO-Meldung Europa: Zusatzmeldung für die Card-Grid-Darstellung.",
        "category": "europa",
        "image_url": "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=800&q=70",
        "video_embed_url": None,
        "published_at": _ago(hours=20),
        "content_type": "article",
    },
]


def _normalise(item: dict, provider: str, is_demo: bool) -> dict:
    return {
        "id": item["slug"],
        "slug": item["slug"],
        "title": item["title"],
        "summary": item["summary"],
        "category": item["category"],
        "image_url": item.get("image_url"),
        "video_embed_url": item.get("video_embed_url"),
        "published_at": item.get("published_at"),
        "source": provider,
        "source_url": item.get("source_url"),
        "article_content": item.get(
            "article_content",
            "DEMO-Testdaten. Der vollständige Artikeltext wird erst nach Lizenzabschluss "
            "mit Euronews Commercial durch echten Content ersetzt. Dieses Layout dient nur "
            "der Darstellung und ist keine reale Nachrichtenmeldung.",
        ),
        "language": item.get("language", "de"),
        "content_type": item.get("content_type", "article"),
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


# Active provider — flip once licensed.
active_provider: NewsProvider = EuronewsDemoProvider()
