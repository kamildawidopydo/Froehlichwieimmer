"""Investment-Topic-Funnel: wiederverwendbare Themen-Teaser + Lead-Aufnahme.

Kein zweites paralleles Kontaktsystem — Lead-Absenden reuse `_send_email_via_emergent`
und speichert zusätzlich in `investment_leads` für Nachverfolgung/Compliance.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, Field, field_validator

router = APIRouter()


# ---------------------------------------------------------------------------
# Seed data — kanonische Themen (später via Admin-UI erweiterbar)
# ---------------------------------------------------------------------------
DEFAULT_TOPICS = [
    {
        "slug": "aktien",
        "category": "Aktien & Kapitalmärkte",
        "headline": "Aktien im Fokus",
        "teaser": (
            "Aktien können langfristig ein wichtiger Baustein einer Vermögensstrategie sein. "
            "Erfahren Sie, welche Chancen und Risiken Anleger kennen sollten und wie wir das "
            "Thema gemeinsam mit Ihnen einordnen."
        ),
        "overview_short": (
            "Wie funktionieren Unternehmensbeteiligungen und welche Rolle können Aktien "
            "innerhalb einer langfristigen Vermögensstrategie spielen?"
        ),
        "target_url": "/themen/aktien",
        "image_url": None,
        "enabled": True,
        "priority": 10,
        "display_delay_ms": 35000,
        "scroll_threshold_pct": 50,
        "cooldown_days": 7,
        "allowed_routes": [],
        "excluded_routes": [
            "/themen/aktien",
            "/login", "/register", "/forgot-password", "/reset-password",
            "/formular", "/dokumente/vorschau",
            "/admin",
            "/dashboard",
        ],
        "compliance_label": "Information der Fröhlich Vermögensberatung",
    },
    {
        "slug": "anleihen",
        "category": "Anleihen & Zinsen",
        "headline": "Zinsen sind zurück – aber worauf kommt es bei Anleihen an?",
        "teaser": (
            "Anleihen können unterschiedliche Funktionen innerhalb einer Vermögensstrategie "
            "übernehmen. Erfahren Sie, welche Faktoren Anleger bei Laufzeit, Zins und "
            "Bonität beachten sollten."
        ),
        "overview_short": (
            "Wie funktionieren Anleihen, welche Rolle spielen Zinsen und welche Chancen und "
            "Risiken sollten Anleger kennen?"
        ),
        "target_url": "/themen/anleihen",
        "image_url": None,
        "enabled": True,
        "priority": 9,
        "display_delay_ms": 35000,
        "scroll_threshold_pct": 50,
        "cooldown_days": 7,
        "allowed_routes": [],
        "excluded_routes": [
            "/themen/anleihen",
            "/login", "/register", "/forgot-password", "/reset-password",
            "/formular", "/dokumente/vorschau",
            "/admin",
            "/dashboard",
        ],
        "compliance_label": "Information der Fröhlich Vermögensberatung",
        "related_news_slugs": [],
    },
    {
        "slug": "dividenden",
        "category": "Dividenden & Ausschüttungen",
        "headline": "Dividenden strategisch einordnen",
        "teaser": (
            "Regelmäßige Ausschüttungen können ein Bestandteil einer langfristigen "
            "Aktienstrategie sein. Erfahren Sie, worauf Anleger bei Dividendenunternehmen "
            "achten sollten und wo hohe Renditen ein Warnsignal sein können."
        ),
        "overview_short": (
            "Was Dividenden aussagen, welche Kennzahlen wirklich zählen und warum eine hohe "
            "Ausschüttungsrendite allein noch kein Qualitätsmerkmal ist."
        ),
        "target_url": "/themen/dividenden",
        "image_url": None,
        "enabled": True,
        "priority": 8,
        "display_delay_ms": 35000,
        "scroll_threshold_pct": 50,
        "cooldown_days": 7,
        "allowed_routes": [],
        "excluded_routes": [
            "/themen/dividenden",
            "/login", "/register", "/forgot-password", "/reset-password",
            "/formular", "/dokumente/vorschau",
            "/admin",
            "/dashboard",
        ],
        "compliance_label": "Information der Fröhlich Vermögensberatung",
        "related_news_slugs": [],
    },
    # Session 80.32 — Zinsen & Sparen (neu)
    {
        "slug": "zinsen-sparen",
        "category": "Zinsen & Sparen",
        "headline": "Zinsen &amp; Sparen — einordnen statt jagen",
        "teaser": (
            "Tagesgeld, Festgeld und Sparzinsen im aktuellen Zinsumfeld — worauf Sparer "
            "achten sollten und wie sich Angebote seriös einordnen lassen."
        ),
        "overview_short": (
            "Wie Sie Sparzinsen im Zusammenspiel mit Inflation, EZB-Leitzins und "
            "Einlagensicherung neutral bewerten."
        ),
        "target_url": "/themen/zinsen-sparen",
        "image_url": None,
        "enabled": True,
        "priority": 9,
        "display_delay_ms": 35000,
        "scroll_threshold_pct": 50,
        "cooldown_days": 7,
        "allowed_routes": [],
        "excluded_routes": [
            "/themen/zinsen-sparen",
            "/login", "/register", "/forgot-password", "/reset-password",
            "/formular", "/dokumente/vorschau",
            "/admin",
            "/dashboard",
        ],
        "compliance_label": "Information der Fröhlich Vermögensberatung",
        "related_news_slugs": [],
    },
    # Session 80.32 — Ruhestand & Vorsorge (neu)
    {
        "slug": "ruhestand-vorsorge",
        "category": "Ruhestand & Vorsorge",
        "headline": "Ruhestand &amp; Vorsorge langfristig denken",
        "teaser": (
            "Gesetzliche Rente, betriebliche und private Vorsorge — Grundlagen und aktuelle "
            "Entwicklungen verständlich eingeordnet, ohne Produktversprechen."
        ),
        "overview_short": (
            "Wie eine tragfähige Ruhestandsplanung aussieht, welche Bausteine sich ergänzen "
            "und wo Reformen tatsächlich Auswirkungen haben können."
        ),
        "target_url": "/themen/ruhestand-vorsorge",
        "image_url": None,
        "enabled": True,
        "priority": 9,
        "display_delay_ms": 35000,
        "scroll_threshold_pct": 50,
        "cooldown_days": 7,
        "allowed_routes": [],
        "excluded_routes": [
            "/themen/ruhestand-vorsorge",
            "/login", "/register", "/forgot-password", "/reset-password",
            "/formular", "/dokumente/vorschau",
            "/admin",
            "/dashboard",
        ],
        "compliance_label": "Information der Fröhlich Vermögensberatung",
        "related_news_slugs": [],
    },
]


async def seed_investment_topics(db) -> int:
    """Idempotent Seeding — schreibt nur, wenn Slug fehlt.

    Zusätzlich werden fehlende **neue Felder** auf bereits vorhandenen Dokumenten
    per `$set … $exists:false` nachgezogen, damit ältere Seeds (ohne
    `priority`, `overview_short` oder `related_news_slugs`) nicht manuell
    repariert werden müssen. Wichtig: **niemals** vorhandene Werte
    überschreiben — Admin-Änderungen bleiben nach Restart erhalten.
    """
    inserted = 0
    for topic in DEFAULT_TOPICS:
        existing = await db.investment_topics.find_one({"slug": topic["slug"]})
        if not existing:
            doc = {
                **topic,
                "related_news_slugs": topic.get("related_news_slugs", []),
                "created_at": datetime.now(timezone.utc),
            }
            await db.investment_topics.insert_one(doc)
            inserted += 1
            continue
        backfill = {}
        for key in ("priority", "overview_short", "related_news_slugs"):
            # Nur setzen, wenn Feld nicht existiert — Admin-Werte niemals überschreiben.
            if key not in existing:
                backfill[key] = topic.get(key, [] if key == "related_news_slugs" else None)
        if backfill:
            await db.investment_topics.update_one(
                {"_id": existing["_id"]},
                {"$set": backfill},
            )
    return inserted


# ---------------------------------------------------------------------------
# Public models
# ---------------------------------------------------------------------------
class TopicOut(BaseModel):
    slug: str
    category: str
    headline: str
    teaser: str
    overview_short: Optional[str] = None
    target_url: str
    image_url: Optional[str] = None
    priority: int = 0
    display_delay_ms: int
    scroll_threshold_pct: int
    cooldown_days: int
    allowed_routes: list[str] = []
    excluded_routes: list[str] = []
    compliance_label: Optional[str] = None
    related_news_slugs: list[str] = []


class TopicPatch(BaseModel):
    """Admin-Patch — nur ausgewählte Felder editierbar."""
    category: Optional[str] = Field(None, max_length=120)
    overview_short: Optional[str] = Field(None, max_length=600)
    image_url: Optional[str] = Field(None, max_length=500)
    enabled: Optional[bool] = None
    priority: Optional[int] = Field(None, ge=0, le=100)
    headline: Optional[str] = Field(None, max_length=200)      # Teaser-Headline
    teaser: Optional[str] = Field(None, max_length=600)         # Teaser-Text
    display_delay_ms: Optional[int] = Field(None, ge=0, le=600000)
    scroll_threshold_pct: Optional[int] = Field(None, ge=0, le=100)
    cooldown_days: Optional[int] = Field(None, ge=1, le=90)
    related_news_slugs: Optional[list[str]] = None

    @field_validator("related_news_slugs")
    @classmethod
    def _dedupe_and_limit(cls, v):
        if v is None:
            return v
        seen, out = set(), []
        for s in v:
            s = (s or "").strip()
            if s and s not in seen:
                seen.add(s)
                out.append(s)
        if len(out) > 6:
            raise ValueError("Maximal 6 News-Zuordnungen erlaubt.")
        return out


class LeadIn(BaseModel):
    topic_slug: str
    first_name: str = Field(..., min_length=1, max_length=80)
    last_name: str = Field(..., min_length=1, max_length=80)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=40)
    consent: bool
    referrer_path: Optional[str] = Field(None, max_length=300)


class NewsTopicPatch(BaseModel):
    """Admin: nur `investment_topic_slug` editierbar (Modul-Scope, damit
    FastAPI die Klasse als Request-Body erkennt)."""
    investment_topic_slug: Optional[str] = Field(None, max_length=120)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

def register(api: APIRouter, db, send_email_fn, require_admin=None):
    """Register `/api/investment-topics/*` + `/api/admin/investment-topics/*`."""

    @api.get("/investment-topics/active", summary="Aktive Investment-Themen für den Teaser")
    async def _active_topics():
        cursor = db.investment_topics.find({"enabled": True}).sort([("priority", -1), ("created_at", -1)]).limit(20)
        docs = await cursor.to_list(20)
        items = []
        for d in docs:
            try:
                items.append(TopicOut(
                    slug=d["slug"],
                    category=d.get("category", ""),
                    headline=d.get("headline", ""),
                    teaser=d.get("teaser", ""),
                    overview_short=d.get("overview_short"),
                    target_url=d.get("target_url", "/"),
                    image_url=d.get("image_url"),
                    priority=int(d.get("priority") or 0),
                    display_delay_ms=int(d.get("display_delay_ms") or 35000),
                    scroll_threshold_pct=int(d.get("scroll_threshold_pct") or 50),
                    cooldown_days=int(d.get("cooldown_days") or 7),
                    allowed_routes=d.get("allowed_routes") or [],
                    excluded_routes=d.get("excluded_routes") or [],
                    compliance_label=d.get("compliance_label"),
                    related_news_slugs=d.get("related_news_slugs") or [],
                ).model_dump())
            except Exception:  # noqa: BLE001
                continue
        return {"items": items, "count": len(items)}

    @api.get("/investment-topics/{slug}", summary="Einzelnes Investment-Thema")
    async def _topic_detail(slug: str):
        d = await db.investment_topics.find_one({"slug": slug, "enabled": True})
        if not d:
            raise HTTPException(404, detail="Thema nicht gefunden.")
        return {
            "slug": d["slug"],
            "category": d.get("category", ""),
            "headline": d.get("headline", ""),
            "teaser": d.get("teaser", ""),
            "overview_short": d.get("overview_short"),
            "target_url": d.get("target_url", ""),
            "image_url": d.get("image_url"),
            "compliance_label": d.get("compliance_label"),
        }

    @api.post("/investment-topics/lead", summary="Beratungs-Anfrage zu einem Thema")
    async def _submit_lead(payload: LeadIn):
        if not payload.consent:
            raise HTTPException(400, detail="Datenschutz-Zustimmung erforderlich.")
        topic = await db.investment_topics.find_one({"slug": payload.topic_slug})
        topic_label = (topic or {}).get("category") or payload.topic_slug

        now = datetime.now(timezone.utc)
        doc = {
            "topic_slug": payload.topic_slug,
            "topic_label": topic_label,
            "first_name": payload.first_name.strip(),
            "last_name":  payload.last_name.strip(),
            "email":      str(payload.email).strip().lower(),
            "phone":      (payload.phone or "").strip() or None,
            "consent":    True,
            "referrer_path": payload.referrer_path,
            "created_at": now,
            "status": "new",
        }
        result = await db.investment_leads.insert_one(doc)

        # Bestätigungs-Mail intern (reuse bestehende Resend-Infra)
        try:
            subject = f"Neue Anfrage — {topic_label}"
            html = (
                f"<h2>Neue Investment-Themen-Anfrage</h2>"
                f"<p><strong>Thema:</strong> {topic_label}</p>"
                f"<p><strong>Name:</strong> {doc['first_name']} {doc['last_name']}</p>"
                f"<p><strong>E-Mail:</strong> {doc['email']}</p>"
                f"<p><strong>Telefon:</strong> {doc['phone'] or '—'}</p>"
                f"<p><strong>Referrer:</strong> {doc['referrer_path'] or '—'}</p>"
                f"<p><strong>ID:</strong> {result.inserted_id}</p>"
            )
            if send_email_fn:
                await send_email_fn(subject=subject, html=html)
        except Exception:  # noqa: BLE001
            # Lead ist gespeichert — Mail-Fehler wird nicht zum User propagiert.
            pass

        return {"ok": True, "lead_id": str(result.inserted_id), "topic": topic_label}

    # -----------------------------------------------------------------
    # NEWS-Lookup für Wissen-Block (public — nur veröffentlichte Artikel)
    # -----------------------------------------------------------------
    @api.get("/news/by-slugs", summary="Mehrere News-Artikel per Slug-Liste laden")
    async def _news_by_slugs(slugs: str = ""):
        raw = [s.strip() for s in (slugs or "").split(",") if s.strip()]
        raw = raw[:10]
        if not raw:
            return {"items": []}
        # Slug-Lookup mit Archiv-Fallback (P1: News Retention) — alte Referenzen
        # in Investment-Topics bleiben nach 90 Tagen auflösbar.
        from news_retention import find_articles_by_slugs as _find_by_slugs
        found = await _find_by_slugs(db, raw, include_archive=True)
        by_slug: dict[str, dict] = {}
        for s, d in found.items():
            # `/news/by-slugs` verlangte historisch `status: published`; im
            # Archiv-Doc bleibt dieses Feld beim Umzug erhalten, daher hier
            # zusätzlich prüfen (statusfreie Legacy-Docs weiterhin akzeptieren).
            status = d.get("status")
            if status is not None and status != "published":
                continue
            pub = d.get("published_at")
            # Session 79.5 — Archiv-Herkunft additiv mitliefern, damit auch
            # Wissen-Block-Karten den Badge auf der verlinkten Detailseite
            # nicht überraschen (dort erneut gerendert).
            arch = d.get("archived_at") if d.get("_from_archive") else None
            by_slug[s] = {
                "id": str(d.get("_id") or d["slug"]),
                "slug": d["slug"],
                "title": d.get("title", ""),
                "summary": (d.get("summary") or "")[:280],
                "category": d.get("category"),
                "image_url": d.get("image_url"),
                "published_at": pub.isoformat() if hasattr(pub, "isoformat") else pub,
                "is_archived": bool(d.get("_from_archive")),
                "archived_at": arch.isoformat() if hasattr(arch, "isoformat") else arch,
            }
        # Reihenfolge der Anfrage bewahren, unbekannte Slugs überspringen (kein Error).
        items = [by_slug[s] for s in raw if s in by_slug]
        return {"items": items}

    # -----------------------------------------------------------------
    # ADMIN — Investment-Themen-Verwaltung
    # -----------------------------------------------------------------
    if require_admin is None:
        return  # Admin-Endpoints nur registrieren, wenn Dependency vorhanden

    @api.get("/admin/investment-topics", summary="Admin: Übersicht Investment-Themen")
    async def _admin_list(_u: dict = Depends(require_admin)):
        cursor = db.investment_topics.find().sort([("priority", -1), ("created_at", -1)])
        items = []
        async for d in cursor:
            items.append({
                "slug": d.get("slug"),
                "category": d.get("category"),
                "headline": d.get("headline"),
                "overview_short": d.get("overview_short"),
                "image_url": d.get("image_url"),
                "enabled": bool(d.get("enabled", True)),
                "priority": int(d.get("priority") or 0),
                "teaser": d.get("teaser"),
                "display_delay_ms": int(d.get("display_delay_ms") or 35000),
                "scroll_threshold_pct": int(d.get("scroll_threshold_pct") or 50),
                "cooldown_days": int(d.get("cooldown_days") or 7),
                "related_news_slugs": d.get("related_news_slugs") or [],
                "related_news_count": len(d.get("related_news_slugs") or []),
                "updated_at": (d.get("updated_at") or d.get("created_at")).isoformat()
                    if (d.get("updated_at") or d.get("created_at")) else None,
            })
        return {"items": items, "count": len(items)}

    @api.get("/admin/investment-topics/{slug}", summary="Admin: Detail Investment-Thema")
    async def _admin_detail(slug: str, _u: dict = Depends(require_admin)):
        d = await db.investment_topics.find_one({"slug": slug})
        if not d:
            raise HTTPException(404, detail="Thema nicht gefunden.")
        return {
            "slug": d["slug"],
            "category": d.get("category"),
            "headline": d.get("headline"),
            "teaser": d.get("teaser"),
            "overview_short": d.get("overview_short"),
            "image_url": d.get("image_url"),
            "enabled": bool(d.get("enabled", True)),
            "priority": int(d.get("priority") or 0),
            "display_delay_ms": int(d.get("display_delay_ms") or 35000),
            "scroll_threshold_pct": int(d.get("scroll_threshold_pct") or 50),
            "cooldown_days": int(d.get("cooldown_days") or 7),
            "related_news_slugs": d.get("related_news_slugs") or [],
        }

    @api.patch("/admin/investment-topics/{slug}", summary="Admin: Investment-Thema aktualisieren")
    async def _admin_patch(slug: str, payload: TopicPatch, _u: dict = Depends(require_admin)):
        existing = await db.investment_topics.find_one({"slug": slug})
        if not existing:
            raise HTTPException(404, detail="Thema nicht gefunden.")
        update = payload.model_dump(exclude_unset=True)
        # News-Slugs validieren: veröffentlichte Artikel — Live + Archiv
        # (P1 News Retention: archivierte Referenzen bleiben gültig).
        if "related_news_slugs" in update and update["related_news_slugs"]:
            from news_retention import find_articles_by_slugs as _find_by_slugs
            found = await _find_by_slugs(db, update["related_news_slugs"], include_archive=True)
            invalid = [s for s in update["related_news_slugs"] if s not in found]
            if invalid:
                raise HTTPException(400, detail=f"Unbekannte oder unveröffentlichte News-Slugs: {invalid}")
        update["updated_at"] = datetime.now(timezone.utc)
        await db.investment_topics.update_one({"_id": existing["_id"]}, {"$set": update})
        return {"ok": True, "slug": slug, "updated_fields": list(update.keys())}

    @api.get("/admin/news-search", summary="Admin: News-Artikel suchen (für Themen-Zuordnung)")
    async def _admin_news_search(q: str = "", limit: int = 15, _u: dict = Depends(require_admin)):
        q = (q or "").strip()
        limit = max(1, min(30, limit))
        query: dict = {"is_published": True, "status": "published"}
        if q:
            import re as _re
            rx = {"$regex": _re.escape(q), "$options": "i"}
            query["$or"] = [{"title": rx}, {"slug": rx}, {"category": rx}]
        cursor = db.news_articles.find(query, {
            "slug": 1, "title": 1, "category": 1, "published_at": 1,
        }).sort([("published_at", -1)]).limit(limit)
        items = []
        async for d in cursor:
            pub = d.get("published_at")
            items.append({
                "slug": d["slug"],
                "title": d.get("title", ""),
                "category": d.get("category"),
                "published_at": pub.isoformat() if hasattr(pub, "isoformat") else pub,
            })
        return {"items": items, "count": len(items)}

    # -----------------------------------------------------------------
    # ADMIN — News-Artikel Investment-Topic-Zuordnung
    # -----------------------------------------------------------------
    @api.get("/admin/news", summary="Admin: News-Artikel-Liste (für Topic-Zuordnung)")
    async def _admin_news_list(
        q: str = "", topic: Optional[str] = None, limit: int = 50, skip: int = 0,
        _u: dict = Depends(require_admin),
    ):
        limit = max(1, min(100, limit))
        skip = max(0, skip)
        query: dict = {"is_published": True, "status": "published"}
        if q:
            import re as _re
            rx = {"$regex": _re.escape(q.strip()), "$options": "i"}
            query["$or"] = [{"title": rx}, {"slug": rx}, {"category": rx}]
        if topic:
            if topic == "__none__":
                query["$and"] = [{
                    "$or": [
                        {"investment_topic_slug": {"$exists": False}},
                        {"investment_topic_slug": None},
                        {"investment_topic_slug": ""},
                    ],
                }]
            else:
                query["investment_topic_slug"] = topic
        total = await db.news_articles.count_documents(query)
        cursor = db.news_articles.find(query, {
            "slug": 1, "title": 1, "category": 1,
            "published_at": 1, "investment_topic_slug": 1,
        }).sort([("published_at", -1)]).skip(skip).limit(limit)
        items = []
        async for d in cursor:
            pub = d.get("published_at")
            items.append({
                "slug": d["slug"],
                "title": d.get("title", ""),
                "category": d.get("category"),
                "published_at": pub.isoformat() if hasattr(pub, "isoformat") else pub,
                "investment_topic_slug": d.get("investment_topic_slug") or None,
            })
        return {"items": items, "total": total, "count": len(items)}

    @api.patch("/admin/news/{slug}", summary="Admin: News-Artikel Investment-Topic-Zuordnung setzen")
    async def _admin_news_patch(slug: str, payload: NewsTopicPatch, _u: dict = Depends(require_admin)):
        existing = await db.news_articles.find_one({"slug": slug})
        if not existing:
            raise HTTPException(404, detail="News-Artikel nicht gefunden.")
        raw = payload.investment_topic_slug
        # Normalisieren: leerer String → None (Zuordnung entfernen).
        norm = (raw or "").strip() or None
        if norm is not None:
            topic = await db.investment_topics.find_one({"slug": norm})
            if not topic:
                raise HTTPException(400, detail=f"Unbekannter Investment-Topic-Slug: {norm}")
        await db.news_articles.update_one(
            {"_id": existing["_id"]},
            {"$set": {"investment_topic_slug": norm, "updated_at": datetime.now(timezone.utc)}},
        )
        return {"ok": True, "slug": slug, "investment_topic_slug": norm}
