"""Investment-Topic-Funnel: wiederverwendbare Themen-Teaser + Lead-Aufnahme.

Kein zweites paralleles Kontaktsystem — Lead-Absenden reuse `_send_email_via_emergent`
und speichert zusätzlich in `investment_leads` für Nachverfolgung/Compliance.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field

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
        "target_url": "/themen/aktien",
        "image_url": None,
        "enabled": True,
        "display_delay_ms": 35000,
        "scroll_threshold_pct": 50,
        "cooldown_days": 7,
        "allowed_routes": [],       # leer = überall erlaubt (außer excluded)
        "excluded_routes": [
            "/themen/aktien",       # nie auf der eigenen Themenseite
            "/login", "/register", "/forgot-password", "/reset-password",
            "/formular", "/dokumente/vorschau",
            "/admin",               # Präfix-Match unten
            "/dashboard",
        ],
        "compliance_label": "Information der Fröhlich Vermögensberatung",
    },
]


async def seed_investment_topics(db) -> int:
    """Idempotent Seeding — schreibt nur, wenn Slug fehlt."""
    inserted = 0
    for topic in DEFAULT_TOPICS:
        existing = await db.investment_topics.find_one({"slug": topic["slug"]})
        if not existing:
            doc = {**topic, "created_at": datetime.now(timezone.utc)}
            await db.investment_topics.insert_one(doc)
            inserted += 1
    return inserted


# ---------------------------------------------------------------------------
# Public models
# ---------------------------------------------------------------------------
class TopicOut(BaseModel):
    slug: str
    category: str
    headline: str
    teaser: str
    target_url: str
    image_url: Optional[str] = None
    display_delay_ms: int
    scroll_threshold_pct: int
    cooldown_days: int
    allowed_routes: list[str] = []
    excluded_routes: list[str] = []
    compliance_label: Optional[str] = None


class LeadIn(BaseModel):
    topic_slug: str
    first_name: str = Field(..., min_length=1, max_length=80)
    last_name: str = Field(..., min_length=1, max_length=80)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=40)
    consent: bool
    referrer_path: Optional[str] = Field(None, max_length=300)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

def register(api: APIRouter, db, send_email_fn):
    """Register `/api/investment-topics/*` endpoints on the shared `/api` router."""

    @api.get("/investment-topics/active", summary="Aktive Investment-Themen für den Teaser")
    async def _active_topics():
        cursor = db.investment_topics.find({"enabled": True}).sort("created_at", -1).limit(20)
        docs = await cursor.to_list(20)
        items = []
        for d in docs:
            try:
                items.append(TopicOut(
                    slug=d["slug"],
                    category=d.get("category", ""),
                    headline=d.get("headline", ""),
                    teaser=d.get("teaser", ""),
                    target_url=d.get("target_url", "/"),
                    image_url=d.get("image_url"),
                    display_delay_ms=int(d.get("display_delay_ms") or 35000),
                    scroll_threshold_pct=int(d.get("scroll_threshold_pct") or 50),
                    cooldown_days=int(d.get("cooldown_days") or 7),
                    allowed_routes=d.get("allowed_routes") or [],
                    excluded_routes=d.get("excluded_routes") or [],
                    compliance_label=d.get("compliance_label"),
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
