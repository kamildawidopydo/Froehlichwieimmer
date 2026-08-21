"""
Fröhlich — „Unsere Einordnung" (editorial commentary).

Layered on top of the external Euronews feed: while `news_provider` emits
external news, this module owns Fröhlich's own editorial content. Public
endpoints serve only `published` posts; admin endpoints cover the full
draft/scheduled/published/archived lifecycle.

Data model (Mongo `einordnung_posts`) — mirrors the frontend TS shape:
  _id, slug (unique), title, category, teaser, body, author,
  image_url?, related_news_slug?, status, is_featured,
  published_at?, created_at, updated_at, is_demo
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field


router = APIRouter(prefix="/einordnung", tags=["einordnung"])

# Categories curated to match the /news/nachrichten themes.
CATEGORIES = [
    {"slug": "zinsen",       "label": "Zinsen"},
    {"slug": "aktienmaerkte", "label": "Aktienmärkte"},
    {"slug": "rohstoffe",    "label": "Rohstoffe"},
    {"slug": "technologie",  "label": "Technologie"},
    {"slug": "makro",        "label": "Makro"},
    {"slug": "portfolio",    "label": "Portfolio"},
]
CATEGORY_SLUGS = {c["slug"] for c in CATEGORIES}
STATUSES = {"draft", "scheduled", "published", "archived"}
_SLUG_RE = re.compile(r"[^a-z0-9-]+")


def _slugify(value: str) -> str:
    v = (value or "").strip().lower()
    v = v.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    v = re.sub(r"\s+", "-", v)
    return _SLUG_RE.sub("", v)[:80] or "beitrag"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _reading_minutes(body: str) -> int:
    words = len((body or "").split())
    return max(1, round(words / 200))


class EinordnungInput(BaseModel):
    title: str = Field(..., min_length=4, max_length=180)
    slug: Optional[str] = Field(None, max_length=80)
    category: str
    teaser: str = Field(..., min_length=10, max_length=400)
    body: str = Field(..., min_length=40)
    author: str = Field(default="Fröhlich Vermögensberatung", max_length=120)
    image_url: Optional[str] = None
    related_news_slug: Optional[str] = None
    status: str = Field(default="draft")
    is_featured: bool = False
    published_at: Optional[datetime] = None


def _validate(payload: EinordnungInput) -> None:
    if payload.category not in CATEGORY_SLUGS:
        raise HTTPException(422, detail=f"Unbekannte Kategorie: {payload.category}")
    if payload.status not in STATUSES:
        raise HTTPException(422, detail=f"Unbekannter Status: {payload.status}")


def _to_public(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "slug": doc["slug"],
        "title": doc["title"],
        "category": doc["category"],
        "teaser": doc["teaser"],
        "body": doc.get("body", ""),
        "author": doc.get("author", "Fröhlich Vermögensberatung"),
        "image_url": doc.get("image_url"),
        "related_news_slug": doc.get("related_news_slug"),
        "status": doc.get("status", "draft"),
        "is_featured": bool(doc.get("is_featured", False)),
        "is_demo": bool(doc.get("is_demo", False)),
        "published_at": (doc.get("published_at") or doc.get("created_at")).isoformat() if doc.get("published_at") or doc.get("created_at") else None,
        "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
        "updated_at": doc.get("updated_at").isoformat() if doc.get("updated_at") else None,
        "reading_minutes": _reading_minutes(doc.get("body", "")),
    }


# ---------- DEMO seed ------------------------------------------------------

_DEMO_POSTS = [
    {
        "slug": "demo-sinkende-zinsen-was-das-fuer-anleger-bedeutet",
        "title": "Was sinkende Zinsen für Anleger bedeuten können",
        "category": "zinsen",
        "teaser": "Nicht jede Zinssenkung bedeutet automatisch steigende Märkte. Entscheidend ist, warum die Zentralbanken handeln und wie sich Inflation, Wachstum und Unternehmensgewinne entwickeln.",
        "body": (
            "Zinsentscheidungen sind selten das Ergebnis eines einzelnen Ereignisses. Sie spiegeln vielmehr wider, wie Zentralbanken die längerfristige Balance zwischen Preisstabilität und Wachstum einschätzen.\n\n"
            "## Warum die Ursache zählt\n"
            "Eine Zinssenkung, die aus Sorge vor einer Rezession erfolgt, wirkt anders als eine Anpassung nach erfolgreicher Inflationsbekämpfung. Für Anleger lohnt es sich daher, nicht nur die Höhe des Schritts, sondern vor allem die Begründung zu betrachten.\n\n"
            "## Was daraus folgen kann\n"
            "Anleihen reagieren unmittelbar, während Aktien- und Immobilienmärkte häufig verzögert und sehr sektorspezifisch reagieren. Wer sein Portfolio breit aufgestellt hat, muss nicht bei jedem Zinsschritt strukturelle Änderungen vornehmen.\n\n"
            "## Was bedeutet das für Anleger?\n"
            "Zinsen sind ein wichtiger, aber nur einer von vielen Faktoren. Wir beobachten sie im Gesamtzusammenhang und ordnen sie im Rahmen des individuellen Anlagehorizonts ein."
        ),
        "image_url": "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=1200&q=70",
        "is_featured": True,
        "hours_ago": 24,
    },
    {
        "slug": "demo-neue-hoechststaende-freude-oder-vorsicht",
        "title": "Neue Höchststände — Grund zur Freude oder zur Vorsicht?",
        "category": "aktienmaerkte",
        "teaser": "Steigende Kurse sind grundsätzlich positiv. Gerade in starken Marktphasen lohnt sich jedoch ein genauer Blick auf Bewertung, Risikoverteilung und den eigenen Anlagehorizont.",
        "body": (
            "Neue Indexhöchststände sind mediale Ereignisse — an den Märkten selbst passieren sie in der Regel schleichend. Für die langfristige Bewertung eines Portfolios sind sie nur selten der entscheidende Datenpunkt.\n\n"
            "## Bewertung statt Kursstand\n"
            "Ein Höchststand sagt zunächst nichts über die Bewertung eines Marktes aus. Erst das Verhältnis von Kursen zu Gewinnen, Umsätzen und Zinsen liefert einen belastbaren Rahmen.\n\n"
            "## Risikoverteilung sichten\n"
            "Wenn einzelne Positionen durch eine starke Marktphase stark gewachsen sind, verändert sich die ursprünglich gewünschte Gewichtung. Regelmäßiges Reblancing ist in diesen Momenten oft wichtiger als aktives Handeln.\n\n"
            "## Was bedeutet das für Anleger?\n"
            "Höchststände sind kein Kauf- oder Verkaufssignal. Sie sind ein guter Anlass, das eigene Risikoprofil erneut zu prüfen."
        ),
        "image_url": "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1200&q=70",
        "hours_ago": 48,
    },
    {
        "slug": "demo-gold-im-fokus",
        "title": "Gold im Fokus: Sicherheit, Inflation und geopolitische Unsicherheit",
        "category": "rohstoffe",
        "teaser": "Gold wird häufig in unsicheren Marktphasen stärker beachtet. Für Anleger sollte jedoch nicht eine einzelne Schlagzeile entscheidend sein, sondern die Rolle des Rohstoffs innerhalb der gesamten Vermögensstruktur.",
        "body": (
            "Gold reagiert historisch auf Inflation, Realzinsen und geopolitische Unsicherheit — allerdings nicht immer gleichzeitig oder in der erwarteten Richtung.\n\n"
            "## Rolle im Portfolio\n"
            "Gold liefert keinen laufenden Ertrag. Sein Beitrag zum Portfolio liegt eher in der Diversifikation und der historischen Rolle als Werterhalt in Krisenphasen.\n\n"
            "## Realzins statt Nominalzins\n"
            "Für den Goldpreis ist häufig der Realzins entscheidend — also der Nominalzins abzüglich der erwarteten Inflation. Diese Größe erklärt Bewegungen oft besser als einzelne Schlagzeilen.\n\n"
            "## Was bedeutet das für Anleger?\n"
            "Eine Position in Gold kann sinnvoll sein, sollte aber niemals aus einer einzelnen Nachricht heraus verändert werden."
        ),
        "image_url": "https://images.unsplash.com/photo-1610375461369-d613b564c883?w=1200&q=70",
        "hours_ago": 72,
    },
    {
        "slug": "demo-ki-veraendert-unternehmen",
        "title": "KI verändert Unternehmen — aber nicht jedes KI-Investment ist automatisch attraktiv",
        "category": "technologie",
        "teaser": "Künstliche Intelligenz kann langfristig große wirtschaftliche Veränderungen auslösen. Entscheidend bleibt, welche Unternehmen daraus tatsächlich nachhaltige Gewinne entwickeln können.",
        "body": (
            "Technologiewellen ähneln sich in einem Punkt: Die tatsächlichen Gewinner werden häufig erst später klar erkennbar. Für Anleger ist das eine wichtige Erinnerung an strukturelle Geduld.\n\n"
            "## Zwischen Erwartung und Ertrag\n"
            "Aktienkurse spiegeln Erwartungen — nicht die tatsächlichen Ergebnisse der kommenden Jahre. Gerade in Themen mit hoher medialer Aufmerksamkeit ist die Bewertungsdisziplin entscheidend.\n\n"
            "## Substanz vor Story\n"
            "Wir beobachten insbesondere Geschäftsmodelle, in denen KI messbar zu Produktivitätsgewinnen und Margen führt — und nicht nur zu einer neuen Präsentationsfolie.\n\n"
            "## Was bedeutet das für Anleger?\n"
            "KI kann relevanter Bestandteil eines langfristigen Portfolios sein — allerdings idealerweise breit gestreut und ohne einzelne Wette auf einen vermeintlichen Gewinner."
        ),
        "image_url": "https://images.unsplash.com/photo-1677756119517-756a188d2d94?w=1200&q=70",
        "hours_ago": 96,
    },
]


async def seed_einordnung(db) -> int:
    """Insert the demo posts if the collection is empty. Called from server startup."""
    coll = db.einordnung_posts
    if await coll.count_documents({}) > 0:
        return 0
    now = _now()
    docs = []
    for p in _DEMO_POSTS:
        docs.append({
            "slug": p["slug"],
            "title": p["title"],
            "category": p["category"],
            "teaser": p["teaser"],
            "body": p["body"],
            "author": "Fröhlich Vermögensberatung",
            "image_url": p.get("image_url"),
            "related_news_slug": None,
            "status": "published",
            "is_featured": bool(p.get("is_featured", False)),
            "is_demo": True,
            "published_at": now - timedelta(hours=p["hours_ago"]),
            "created_at": now - timedelta(hours=p["hours_ago"]),
            "updated_at": now - timedelta(hours=p["hours_ago"]),
        })
    await coll.insert_many(docs)
    await coll.create_index("slug", unique=True)
    return len(docs)


# ---------- Public endpoints ----------------------------------------------

# Real endpoints are attached in `register(app, db)` so the db handle is captured.


def register(app_router, db):
    """Attach public + admin endpoints to the FastAPI /api router with a shared db handle."""

    @router.get("/categories")
    async def _categories():
        return {"items": CATEGORIES}

    @router.get("", summary="Öffentliche Liste publizierter Einordnungen")
    async def _list(
        category: Optional[str] = None,
        featured_only: bool = False,
        limit: int = Query(20, ge=1, le=50),
        offset: int = Query(0, ge=0),
    ):
        query: dict = {"status": "published"}
        if category and category != "alle":
            query["category"] = category
        if featured_only:
            query["is_featured"] = True
        cursor = db.einordnung_posts.find(query).sort([("is_featured", -1), ("published_at", -1)]).skip(offset).limit(limit)
        docs = await cursor.to_list(limit)
        total = await db.einordnung_posts.count_documents(query)
        return {
            "items": [_to_public(d) for d in docs],
            "total": total,
            "has_more": offset + len(docs) < total,
            "categories": CATEGORIES,
        }

    @router.get("/{slug}")
    async def _detail(slug: str):
        doc = await db.einordnung_posts.find_one({"slug": slug, "status": "published"})
        if not doc:
            raise HTTPException(404, detail="Einordnung nicht gefunden.")
        return _to_public(doc)

    # ---------- Admin endpoints (mounted under /einordnung/admin) -----------
    from server import require_admin  # local import to avoid circular dependency

    @router.get("/admin/list", summary="Admin: alle Einordnungen inkl. Entwürfe")
    async def _admin_list(_user: dict = Depends(require_admin),
                          status: Optional[str] = None,
                          limit: int = Query(50, ge=1, le=200)):
        query: dict = {}
        if status:
            if status not in STATUSES:
                raise HTTPException(422, detail=f"Unbekannter Status: {status}")
            query["status"] = status
        cursor = db.einordnung_posts.find(query).sort([("updated_at", -1)]).limit(limit)
        docs = await cursor.to_list(limit)
        return {"items": [_to_public(d) for d in docs], "total": await db.einordnung_posts.count_documents(query)}

    @router.post("/admin", summary="Admin: neuen Beitrag anlegen")
    async def _admin_create(payload: EinordnungInput, user: dict = Depends(require_admin)):
        _validate(payload)
        now = _now()
        slug = _slugify(payload.slug or payload.title)
        if await db.einordnung_posts.find_one({"slug": slug}):
            raise HTTPException(409, detail="Slug ist bereits vergeben.")
        doc = payload.model_dump()
        doc.update({
            "slug": slug,
            "created_at": now,
            "updated_at": now,
            "published_at": payload.published_at or (now if payload.status == "published" else None),
            "author": payload.author or user.get("name") or "Fröhlich Vermögensberatung",
            "is_demo": False,
        })
        r = await db.einordnung_posts.insert_one(doc)
        doc["_id"] = r.inserted_id
        return _to_public(doc)

    @router.put("/admin/{post_id}", summary="Admin: Beitrag aktualisieren")
    async def _admin_update(post_id: str, payload: EinordnungInput, _user: dict = Depends(require_admin)):
        _validate(payload)
        try:
            oid = ObjectId(post_id)
        except Exception:
            raise HTTPException(422, detail="Ungültige Post-ID.")
        current = await db.einordnung_posts.find_one({"_id": oid})
        if not current:
            raise HTTPException(404, detail="Beitrag nicht gefunden.")
        new_slug = _slugify(payload.slug or payload.title)
        if new_slug != current["slug"]:
            if await db.einordnung_posts.find_one({"slug": new_slug, "_id": {"$ne": oid}}):
                raise HTTPException(409, detail="Slug ist bereits vergeben.")
        upd = payload.model_dump()
        upd["slug"] = new_slug
        upd["updated_at"] = _now()
        if payload.status == "published" and not current.get("published_at"):
            upd["published_at"] = payload.published_at or _now()
        await db.einordnung_posts.update_one({"_id": oid}, {"$set": upd})
        doc = await db.einordnung_posts.find_one({"_id": oid})
        return _to_public(doc)

    @router.delete("/admin/{post_id}", summary="Admin: Beitrag löschen")
    async def _admin_delete(post_id: str, _user: dict = Depends(require_admin)):
        try:
            oid = ObjectId(post_id)
        except Exception:
            raise HTTPException(422, detail="Ungültige Post-ID.")
        r = await db.einordnung_posts.delete_one({"_id": oid})
        if r.deleted_count == 0:
            raise HTTPException(404, detail="Beitrag nicht gefunden.")
        return {"deleted": True}

    app_router.include_router(router)
