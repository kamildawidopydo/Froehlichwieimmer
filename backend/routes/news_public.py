"""Session 82.85 — News Public Router (Supabase-Cutover).

Ersetzt die letzten Supabase-Touches aus `frontend/src/services/newsService.js`
durch native FastAPI/Mongo-Endpoints.

Reines Read-Modell auf `db.news_articles` (Synthesizer-Kollektion, Session 80.25).
Video-Endpoints existieren strukturell für 1:1-Feature-Parität mit dem Legacy-
Client, liefern jedoch faithful `[]` / `404`, solange keine `news_videos`-
Kollektion vorhanden ist. **Keine Fake-Daten, keine synthetischen Resultate.**

Ausgelagert (bereits vorhanden, nicht dupliziert):
- `GET  /api/content/news`          → `server.list_news`         (48h Live-Feed)
- `GET  /api/content/news/{slug}`   → `server.get_news_by_slug`
- `POST /api/content/news/{slug}/view` → `server.increment_news_view`
"""

from __future__ import annotations

import logging
import os
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

_client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
_db = _client[os.environ["DB_NAME"]]

router = APIRouter(prefix="/api/content/news", tags=["news-public"])


# ---------------------------------------------------------------------------
# Feld-Projektion + Serializer
# ---------------------------------------------------------------------------

ARTICLE_PROJECTION: Dict[str, int] = {
    "_id": 1,
    "slug": 1,
    "title": 1,
    "summary": 1,
    "subtitle": 1,
    "content": 1,
    "image_url": 1,
    "hero_image_url": 1,
    "category": 1,
    "source_names": 1,
    "source_urls": 1,
    "published_at": 1,
    "read_time_minutes": 1,
    "views": 1,
    "tags": 1,
    "status": 1,
    "is_published": 1,
    "related_symbols": 1,
}


def _iso(dt: Any) -> Optional[str]:
    if isinstance(dt, datetime):
        return dt.isoformat()
    if isinstance(dt, str):
        return dt
    return None


def _serialize_article(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Serializer mit Legacy-Kompatibilität zum Supabase-Schema.

    Legacy-Felder ohne native Mongo-Entsprechung werden explizit auf `None`
    gesetzt statt erfunden (video_embed_url, video_thumbnail_url, guid, language).
    """
    summary = doc.get("summary") or doc.get("subtitle") or ""
    source_urls = doc.get("source_urls") or []
    return {
        "id": str(doc.get("_id", "")),
        "slug": doc.get("slug"),
        "guid": None,
        "title": doc.get("title") or "",
        "summary": summary,
        "excerpt": summary[:280],
        "content": doc.get("content") or "",
        "image_url": doc.get("image_url") or doc.get("hero_image_url"),
        "category": doc.get("category") or "markt",
        "source_url": source_urls[0] if source_urls else None,
        "published_at": _iso(doc.get("published_at")),
        "language": "de",
        "view_count": int(doc.get("views") or 0),
        "views": int(doc.get("views") or 0),
        "read_time_minutes": doc.get("read_time_minutes"),
        # Legacy-Video-Felder: explizit None (keine Fake-Werte)
        "video_embed_url": None,
        "video_thumbnail_url": None,
        "video_source_url": None,
        "tags": doc.get("tags") or [],
        "related_symbols": doc.get("related_symbols") or [],
    }


# ---------------------------------------------------------------------------
# Query-Builder
# ---------------------------------------------------------------------------

def _escape_regex(s: str) -> str:
    return re.escape((s or "").strip())


def _base_query(category: Optional[str], search: Optional[str]) -> Dict[str, Any]:
    q: Dict[str, Any] = {"is_published": True, "status": "published"}
    if category and category != "all":
        q["category"] = category
    if search:
        rgx = _escape_regex(search)
        if rgx:
            q["$or"] = [
                {"title": {"$regex": rgx, "$options": "i"}},
                {"summary": {"$regex": rgx, "$options": "i"}},
                {"subtitle": {"$regex": rgx, "$options": "i"}},
            ]
    return q


def _sort_for(tab: str) -> List[tuple]:
    if tab == "popular":
        return [("views", -1), ("published_at", -1)]
    return [("published_at", -1)]


# ---------------------------------------------------------------------------
# GET /list — Paginated article list
# ---------------------------------------------------------------------------

@router.get("/list")
async def list_articles(
    category: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    tab: str = Query(default="recent"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0, le=10_000),
) -> Dict[str, Any]:
    """Paginierte Artikel-Liste. Ersetzt Supabase `.from('news_articles').select(...)`.

    - `category=all` oder leer → keine Kategorie-Filterung
    - `search` → case-insensitive Regex-Match auf title/summary/subtitle
    - `tab=popular` → views desc, published_at desc; sonst published_at desc
    """
    tab_key = (tab or "recent").lower()
    if tab_key not in {"recent", "popular"}:
        raise HTTPException(400, detail=f"Ungültiger tab: {tab}")
    q = _base_query(category, search)
    total = await _db.news_articles.count_documents(q)
    cur = (
        _db.news_articles.find(q, ARTICLE_PROJECTION)
        .sort(_sort_for(tab_key))
        .skip(offset)
        .limit(limit)
    )
    docs = await cur.to_list(limit)
    return {
        "items": [_serialize_article(d) for d in docs],
        "count": total,
    }


# ---------------------------------------------------------------------------
# GET /related — Related articles by category
# ---------------------------------------------------------------------------

@router.get("/related")
async def list_related(
    category: Optional[str] = Query(default=None),
    exclude_slug: Optional[str] = Query(default=None),
    limit: int = Query(default=3, ge=1, le=20),
) -> Dict[str, Any]:
    """Verwandte Artikel derselben Kategorie. Ersetzt einen Legacy-Read auf
    `news_articles` mit Kategorie- und Limit-Filter.
    """
    if not category:
        return {"items": []}
    q = _base_query(category, None)
    if exclude_slug:
        q["slug"] = {"$ne": exclude_slug}
    cur = (
        _db.news_articles.find(q, ARTICLE_PROJECTION)
        .sort([("published_at", -1)])
        .limit(limit)
    )
    docs = await cur.to_list(limit)
    return {"items": [_serialize_article(d) for d in docs]}


# ---------------------------------------------------------------------------
# GET /search-suggestions — Autocomplete
# ---------------------------------------------------------------------------

@router.get("/search-suggestions")
async def search_suggestions(
    q: str = Query(default=""),
    category: Optional[str] = Query(default="all"),
    limit: int = Query(default=6, ge=1, le=20),
) -> Dict[str, Any]:
    """Titel-Autocomplete. Ersetzt Supabase-RPC `news_search_suggestions`
    (pg_trgm + FTS). Mongo-Variante: case-insensitive Regex-Prefix auf title.
    """
    trimmed = (q or "").strip()
    if len(trimmed) < 2:
        return {"items": []}
    query: Dict[str, Any] = {
        "is_published": True,
        "status": "published",
        "title": {"$regex": _escape_regex(trimmed), "$options": "i"},
    }
    if category and category != "all":
        query["category"] = category
    cur = (
        _db.news_articles.find(query, {"_id": 1, "slug": 1, "title": 1, "category": 1})
        .sort([("published_at", -1)])
        .limit(limit)
    )
    docs = await cur.to_list(limit)
    return {
        "items": [
            {
                "id": str(d.get("_id")),
                "slug": d.get("slug"),
                "title": d.get("title"),
                "category": d.get("category"),
            }
            for d in docs
        ]
    }


# ---------------------------------------------------------------------------
# GET /feed — Public feed (replaces Supabase Edge Function)
# ---------------------------------------------------------------------------

@router.get("/feed")
async def public_feed(
    source: str = Query(default="articles"),
    category: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    tab: str = Query(default="recent"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0, le=10_000),
) -> Dict[str, Any]:
    """Öffentlicher Feed. Ersetzt die Supabase Edge Function
    `news-public-feed`. Videos existieren strukturell, sind aber leer.
    """
    src = (source or "articles").lower()
    if src == "videos":
        return {"items": [], "count": 0, "cached": False}
    if src != "articles":
        raise HTTPException(400, detail=f"Ungültige source: {source}")
    result = await list_articles(
        category=category,
        search=search,
        tab=tab,
        limit=limit,
        offset=offset,
    )
    return {"items": result["items"], "count": result["count"], "cached": False}


# ---------------------------------------------------------------------------
# GET /videos — Video list (currently empty; no fake data)
# ---------------------------------------------------------------------------

@router.get("/videos")
async def list_videos(
    search: Optional[str] = Query(default=None),
    tab: str = Query(default="recent"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0, le=10_000),
) -> Dict[str, Any]:
    """Video-Liste. Ohne `news_videos`-Kollektion faithful `{items: [], count: 0}`.
    """
    if "news_videos" not in await _db.list_collection_names():
        return {"items": [], "count": 0}
    # Falls die Kollektion irgendwann angelegt wird, decken wir das Verhalten ab.
    q: Dict[str, Any] = {"is_published": True}
    if search:
        rgx = _escape_regex(search)
        if rgx:
            q["$or"] = [
                {"title": {"$regex": rgx, "$options": "i"}},
                {"summary": {"$regex": rgx, "$options": "i"}},
            ]
    sort_key = _sort_for((tab or "recent").lower())
    total = await _db.news_videos.count_documents(q)
    cur = _db.news_videos.find(q).sort(sort_key).skip(offset).limit(limit)
    docs = await cur.to_list(limit)
    return {
        "items": [
            {
                "id": str(d.get("_id", "")),
                "slug": d.get("slug"),
                "guid": d.get("guid"),
                "title": d.get("title"),
                "summary": d.get("summary"),
                "thumbnail_url": d.get("thumbnail_url"),
                "embed_url": d.get("embed_url"),
                "source_url": d.get("source_url"),
                "duration_seconds": d.get("duration_seconds"),
                "show_label": d.get("show_label"),
                "published_at": _iso(d.get("published_at")),
                "language": d.get("language") or "de",
                "view_count": int(d.get("views") or d.get("view_count") or 0),
            }
            for d in docs
        ],
        "count": total,
    }


@router.get("/video/{slug}")
async def get_video_by_slug(slug: str) -> Dict[str, Any]:
    """Video-Detail. Faithful 404, solange keine `news_videos`-Kollektion existiert."""
    if "news_videos" not in await _db.list_collection_names():
        raise HTTPException(404, detail="not_found")
    doc = await _db.news_videos.find_one({"slug": slug, "is_published": True})
    if not doc:
        raise HTTPException(404, detail="not_found")
    return {
        "id": str(doc.get("_id", "")),
        "slug": doc.get("slug"),
        "guid": doc.get("guid"),
        "title": doc.get("title"),
        "summary": doc.get("summary"),
        "thumbnail_url": doc.get("thumbnail_url"),
        "embed_url": doc.get("embed_url"),
        "source_url": doc.get("source_url"),
        "duration_seconds": doc.get("duration_seconds"),
        "show_label": doc.get("show_label"),
        "published_at": _iso(doc.get("published_at")),
        "language": doc.get("language") or "de",
        "view_count": int(doc.get("views") or doc.get("view_count") or 0),
    }


@router.post("/video/{slug}/view")
async def increment_video_view(slug: str) -> Dict[str, Any]:
    """Video-View-Counter. Fire-and-forget. Ersetzt Supabase-RPC
    `news_increment_video_view`. Ohne `news_videos`-Kollektion 204 no-op.
    """
    if not slug or len(slug) > 300:
        return {"ok": False, "reason": "invalid_slug"}
    if "news_videos" not in await _db.list_collection_names():
        return {"ok": True, "noop": True}
    try:
        await _db.news_videos.update_one({"slug": slug}, {"$inc": {"views": 1}})
    except Exception:  # noqa: BLE001
        logger.exception("news_video view counter failed slug=%s", slug)
        return {"ok": False}
    return {"ok": True}


@router.get("/related-videos")
async def list_related_videos(
    show_label: Optional[str] = Query(default=None),
    exclude_slug: Optional[str] = Query(default=None),
    limit: int = Query(default=6, ge=1, le=20),
) -> Dict[str, Any]:
    """Related videos. Faithful `[]`, solange keine `news_videos`-Kollektion existiert."""
    if "news_videos" not in await _db.list_collection_names():
        return {"items": []}
    q: Dict[str, Any] = {"is_published": True}
    if exclude_slug:
        q["slug"] = {"$ne": exclude_slug}
    if show_label:
        q["show_label"] = show_label
    cur = _db.news_videos.find(q).sort([("published_at", -1)]).limit(limit)
    docs = await cur.to_list(limit)
    return {
        "items": [
            {
                "id": str(d.get("_id", "")),
                "slug": d.get("slug"),
                "title": d.get("title"),
                "thumbnail_url": d.get("thumbnail_url"),
                "embed_url": d.get("embed_url"),
                "duration_seconds": d.get("duration_seconds"),
                "show_label": d.get("show_label"),
                "published_at": _iso(d.get("published_at")),
            }
            for d in docs
        ]
    }


# ---------------------------------------------------------------------------
# Startup: Mongo-Indizes (idempotent)
# ---------------------------------------------------------------------------

async def ensure_indexes() -> Dict[str, Any]:
    """Idempotente Indizes für die neuen Endpoints.

    - `(is_published, status, published_at desc)` — Haupt-Filter + Sort
    - `(is_published, status, category, published_at desc)` — mit Kategorie
    - `(is_published, status, views desc, published_at desc)` — popular tab
    """
    created: List[str] = []
    try:
        await _db.news_articles.create_index(
            [("is_published", 1), ("status", 1), ("published_at", -1)],
            name="pub_status_publishedAt",
            background=True,
        )
        created.append("pub_status_publishedAt")
    except Exception as exc:  # noqa: BLE001
        logger.info("news_articles index pub_status_publishedAt already present: %s", exc)
    try:
        await _db.news_articles.create_index(
            [("is_published", 1), ("status", 1), ("category", 1), ("published_at", -1)],
            name="pub_status_cat_publishedAt",
            background=True,
        )
        created.append("pub_status_cat_publishedAt")
    except Exception as exc:  # noqa: BLE001
        logger.info("news_articles index pub_status_cat_publishedAt already present: %s", exc)
    try:
        await _db.news_articles.create_index(
            [("is_published", 1), ("status", 1), ("views", -1), ("published_at", -1)],
            name="pub_status_views_publishedAt",
            background=True,
        )
        created.append("pub_status_views_publishedAt")
    except Exception as exc:  # noqa: BLE001
        logger.info("news_articles index pub_status_views_publishedAt already present: %s", exc)
    return {"created_or_present": created}
