"""Session 80.40 + 80.41 — Admin-Inbox für Assistant-Handoffs.

Geschützte Endpoints zur Verwaltung der über den Fröhlich Assistenten
eingegangenen Beratungs-Anfragen (`assistant_handoffs` Collection).

Design:
- Admin-only via `require_admin`-Dependency aus server.py.
- Datensparsam: liefert nur Meta + `context_summary`. KEIN voller Chat-Verlauf.
- Statusworkflow: `new` → `in_progress` → `completed` (+ `archived`).
- Analytics-Zähler pro Status.

Session 80.41 – Lead-Inbox Productivity:
- POST /{id}/reply — Admin schreibt Kundenantwort (Empfänger serverseitig).
- Status-Historie (status_history) beim PATCH + automatisch bei Reply (NEW → IN_PROGRESS).
- Reply-Metadaten: last_reply_at, last_reply_by, reply_count, reply_history[{timestamp,admin,subject}].
- Kein voller Mailtext in DB — nur Betreff bleibt (Audit-Trail).

Der Router wird über `register(app, db, require_admin, send_email_fn)` gebaut,
damit die Dependencies zur Registrier-Zeit injiziert werden (kein Circular-Import).
"""
from __future__ import annotations

import logging
import os
import re
from datetime import datetime, timezone, timedelta
from html import escape as _hesc
from typing import Optional, Dict, Any, List

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field, constr

logger = logging.getLogger(__name__)

VALID_STATUS = {"new", "in_progress", "completed", "archived"}
_BASIC_EMAIL_RX = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")


def _iso(dt: Any) -> Optional[str]:
    if isinstance(dt, datetime):
        return dt.astimezone(timezone.utc).isoformat()
    return dt


def _to_public(doc: dict) -> dict:
    """Serialisiert einen Handoff-Doc für die Admin-UI (datensparsam)."""
    status_history: List[dict] = []
    for ev in (doc.get("status_history") or []):
        status_history.append({
            "status": ev.get("status"),
            "changed_at": _iso(ev.get("changed_at")),
            "changed_by": ev.get("changed_by"),
        })
    reply_history: List[dict] = []
    for ev in (doc.get("reply_history") or []):
        reply_history.append({
            "timestamp": _iso(ev.get("timestamp")),
            "admin": ev.get("admin"),
            "subject": ev.get("subject"),
        })
    return {
        "id": str(doc.get("_id")),
        "name": doc.get("name"),
        "email": doc.get("email"),
        "phone": doc.get("phone"),
        "concern": doc.get("concern"),
        "current_route": doc.get("current_route"),
        "context_summary": doc.get("context_summary") or doc.get("conversation_summary") or "",
        "recent_topics": doc.get("recent_topics") or [],
        "status": doc.get("status") or "new",
        "admin_notes": doc.get("admin_notes") or "",
        "assigned_to": doc.get("assigned_to"),
        "source": doc.get("source") or "assistant_chat",
        "created_at": _iso(doc.get("created_at") or datetime.now(timezone.utc)),
        "updated_at": _iso(doc.get("updated_at")),
        "email_sent_admin": bool(doc.get("email_sent_admin")),
        "email_sent_customer": bool(doc.get("email_sent_customer")),
        # Session 80.41
        "reply_count": int(doc.get("reply_count") or 0),
        "last_reply_at": _iso(doc.get("last_reply_at")),
        "last_reply_by": doc.get("last_reply_by"),
        "reply_history": reply_history,
        "status_history": status_history,
    }


class PatchHandoffIn(BaseModel):
    status: Optional[str] = Field(default=None)
    admin_notes: Optional[str] = Field(default=None, max_length=4000)
    assigned_to: Optional[str] = Field(default=None, max_length=200)


class ReplyIn(BaseModel):
    """Session 80.41 – Admin-Reply an Kunden.

    Empfänger wird serverseitig aus dem Handoff-Doc geladen — NICHT aus dem Payload.
    """
    subject: constr(strip_whitespace=True, min_length=1, max_length=200)
    message: constr(strip_whitespace=True, min_length=4, max_length=3000)


def _reply_html(handoff: dict, subject: str, message: str) -> str:
    """XSS-safe HTML für Kunden-Reply. Fröhlich-Editorial-Ton."""
    name = _hesc(handoff.get("name") or "")
    subj = _hesc(subject)
    body = _hesc(message).replace("\n", "<br>")
    return f"""<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f6f5f2;font-family:Georgia,'Times New Roman',serif;color:#1a2a2a">
<div style="max-width:640px;margin:0 auto;padding:36px 28px;background:#ffffff;border-top:3px solid #376460">
  <p style="margin:0 0 6px;font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.28em;color:#376460;text-transform:uppercase">Fröhlich Vermögensberatung</p>
  <h1 style="margin:0 0 20px;font-size:22px;font-weight:400;line-height:1.3">{subj}</h1>

  <p style="margin:0 0 14px;font-size:15px;line-height:1.6">Guten Tag {name},</p>
  <p style="margin:0 0 22px;font-size:15px;line-height:1.65">{body}</p>

  <p style="margin:26px 0 0;font-size:14.5px;line-height:1.6">Mit besten Grüßen<br><strong>Ihre Fröhlich Vermögensberatung</strong></p>

  <p style="margin:32px 0 0;color:#8a9a9a;font-size:11px;line-height:1.5;font-family:Helvetica,Arial,sans-serif">Diese Nachricht bezieht sich auf Ihre über den Fröhlich Assistenten gestellte Anfrage. Antworten Sie einfach auf diese E-Mail, um mit uns weiter in Kontakt zu bleiben.</p>
</div>
</body></html>"""


def register(app, db, require_admin, send_email_fn=None):
    """Bindet die Endpoints an konkrete Dependencies + db + Mail-Funktion."""
    router = APIRouter(prefix="/api/admin/assistant-handoffs", tags=["assistant-admin"])

    @router.get("")
    async def list_handoffs(
        status: Optional[str] = Query(default=None),
        q: Optional[str] = Query(default=None, max_length=200),
        limit: int = Query(default=50, ge=1, le=200),
        offset: int = Query(default=0, ge=0),
        _user: dict = Depends(require_admin),
    ):
        query: Dict[str, Any] = {}
        if status:
            s = status.strip().lower()
            if s not in VALID_STATUS:
                raise HTTPException(400, "Ungültiger Status.")
            if s == "new":
                # Legacy-Docs ohne `status`-Feld gelten als „neu".
                query["$or"] = [{"status": "new"}, {"status": {"$exists": False}}, {"status": None}]
            else:
                query["status"] = s
        if q:
            qn = q.strip()
            if qn:
                rx = re.compile(re.escape(qn), re.I)
                or_clause = [{"name": rx}, {"email": rx}, {"concern": rx}]
                if "$or" in query:
                    query = {"$and": [query, {"$or": or_clause}]}
                else:
                    query["$or"] = or_clause
        cursor = db.assistant_handoffs.find(query).sort("created_at", -1).skip(offset).limit(limit)
        docs = await cursor.to_list(length=limit)
        total = await db.assistant_handoffs.count_documents(query)
        return {"items": [_to_public(d) for d in docs], "total": total, "limit": limit, "offset": offset}

    @router.get("/stats")
    async def handoff_stats(_user: dict = Depends(require_admin)):
        pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
        rows = await db.assistant_handoffs.aggregate(pipeline).to_list(20)
        by_status = {"new": 0, "in_progress": 0, "completed": 0, "archived": 0}
        for r in rows:
            raw = r.get("_id")
            key = (raw or "new").lower() if isinstance(raw, str) else "new"
            if key in by_status:
                by_status[key] = by_status.get(key, 0) + int(r.get("count", 0))
        total = await db.assistant_handoffs.count_documents({})
        now = datetime.now(timezone.utc)
        last_7d = await db.assistant_handoffs.count_documents({"created_at": {"$gte": now - timedelta(days=7)}})
        last_30d = await db.assistant_handoffs.count_documents({"created_at": {"$gte": now - timedelta(days=30)}})
        return {"total": total, "by_status": by_status, "last_7d": last_7d, "last_30d": last_30d}

    @router.get("/{handoff_id}")
    async def get_handoff(handoff_id: str, _user: dict = Depends(require_admin)):
        if not ObjectId.is_valid(handoff_id):
            raise HTTPException(404, "Nicht gefunden.")
        doc = await db.assistant_handoffs.find_one({"_id": ObjectId(handoff_id)})
        if not doc:
            raise HTTPException(404, "Nicht gefunden.")
        return _to_public(doc)

    @router.patch("/{handoff_id}")
    async def patch_handoff(handoff_id: str, payload: PatchHandoffIn,
                             user: dict = Depends(require_admin)):
        if not ObjectId.is_valid(handoff_id):
            raise HTTPException(404, "Nicht gefunden.")
        doc = await db.assistant_handoffs.find_one({"_id": ObjectId(handoff_id)})
        if not doc:
            raise HTTPException(404, "Nicht gefunden.")

        set_fields: Dict[str, Any] = {}
        status_change: Optional[str] = None
        if payload.status is not None:
            s = payload.status.strip().lower()
            if s not in VALID_STATUS:
                raise HTTPException(400, "Ungültiger Status.")
            current = (doc.get("status") or "new")
            if s != current:
                status_change = s
        if payload.admin_notes is not None:
            set_fields["admin_notes"] = payload.admin_notes.strip()[:4000]
        if payload.assigned_to is not None:
            set_fields["assigned_to"] = payload.assigned_to.strip()[:200] or None

        if not set_fields and status_change is None:
            raise HTTPException(400, "Nichts zu aktualisieren.")

        now = datetime.now(timezone.utc)
        admin_id = user.get("email") or user.get("id") or "admin"
        set_fields["updated_at"] = now
        set_fields["updated_by"] = admin_id

        update_ops: Dict[str, Any] = {"$set": set_fields}
        if status_change is not None:
            set_fields["status"] = status_change
            update_ops["$push"] = {
                "status_history": {"status": status_change, "changed_at": now, "changed_by": admin_id}
            }

        res = await db.assistant_handoffs.find_one_and_update(
            {"_id": ObjectId(handoff_id)}, update_ops, return_document=True,
        )
        if not res:
            raise HTTPException(404, "Nicht gefunden.")
        return _to_public(res)

    # ------------------------------------------------------------------
    # Session 80.41 — POST /{id}/reply
    # ------------------------------------------------------------------
    @router.post("/{handoff_id}/reply")
    async def reply_handoff(handoff_id: str, payload: ReplyIn,
                             user: dict = Depends(require_admin)):
        if not ObjectId.is_valid(handoff_id):
            raise HTTPException(404, "Nicht gefunden.")
        doc = await db.assistant_handoffs.find_one({"_id": ObjectId(handoff_id)})
        if not doc:
            raise HTTPException(404, "Nicht gefunden.")

        # Empfänger IMMER serverseitig — Payload wird nicht angenommen.
        recipient = (doc.get("email") or "").strip().lower()
        if not recipient or not _BASIC_EMAIL_RX.match(recipient):
            raise HTTPException(422, "Für diesen Handoff ist keine gültige Kunden-E-Mail hinterlegt.")

        subject = payload.subject.strip()
        message = payload.message.strip()
        if not subject or not message:
            raise HTTPException(400, "Betreff und Nachricht dürfen nicht leer sein.")

        html = _reply_html(doc, subject, message)

        if send_email_fn is None:
            # Kein Provider konfiguriert — 424 Failed Dependency, damit die
            # Antwort NICHT vom CDN/Ingress-Edge (das nur 5xx blockt) überschrieben wird.
            raise HTTPException(424, "Mailversand ist momentan nicht verfügbar.")

        try:
            email_id = await send_email_fn(recipient, subject, html)
        except HTTPException as http_exc:
            # server._send_email_via_emergent hebt selbst schon HTTPException(502) —
            # wir mappen bewusst auf 424 (Failed Dependency), damit die deutsche
            # Fehlermeldung nicht vom Preview-Edge (der 5xx-Bodies ersetzt) gefressen wird.
            logger.warning("assistant reply mail failed for handoff %s: %s", handoff_id, http_exc.detail)
            provider_status = getattr(http_exc, "status_code", 502)
            if provider_status == 429:
                raise HTTPException(429, "E-Mail-Versand aktuell gedrosselt. Bitte in einer Minute erneut versuchen.")
            if provider_status == 422:
                raise HTTPException(422, "Die hinterlegte Kunden-E-Mail konnte nicht zugestellt werden.")
            raise HTTPException(424, "Mailversand ist fehlgeschlagen. Der Handoff wurde nicht verändert.")
        except Exception as exc:  # noqa: BLE001
            logger.warning("assistant reply mail failed for handoff %s: %s", handoff_id, exc)
            # WICHTIG: KEIN reply_count-Increment, KEIN Statuswechsel.
            raise HTTPException(424, "Mailversand ist fehlgeschlagen. Der Handoff wurde nicht verändert.")

        if not email_id:
            logger.warning("assistant reply mail returned empty id for handoff %s", handoff_id)
            raise HTTPException(424, "Mailversand ist fehlgeschlagen. Der Handoff wurde nicht verändert.")

        # Erfolg — jetzt (und erst jetzt) Audit + Metadaten schreiben.
        now = datetime.now(timezone.utc)
        admin_id = user.get("email") or user.get("id") or "admin"
        set_fields: Dict[str, Any] = {
            "last_reply_at": now,
            "last_reply_by": admin_id,
            "updated_at": now,
            "updated_by": admin_id,
        }
        push_ops: Dict[str, Any] = {
            "reply_history": {"timestamp": now, "admin": admin_id, "subject": subject[:200]},
        }
        inc_ops: Dict[str, Any] = {"reply_count": 1}

        # Smart-Status (Phase F): NEW → IN_PROGRESS bei erster Bearbeitung.
        current_status = (doc.get("status") or "new").lower()
        if current_status == "new":
            set_fields["status"] = "in_progress"
            push_ops["status_history"] = {
                "status": "in_progress", "changed_at": now, "changed_by": admin_id,
            }

        res = await db.assistant_handoffs.find_one_and_update(
            {"_id": ObjectId(handoff_id)},
            {"$set": set_fields, "$push": push_ops, "$inc": inc_ops},
            return_document=True,
        )
        return {
            "success": True,
            "email_id": email_id,
            "handoff": _to_public(res),
        }

    app.include_router(router)
    logger.info("assistant-admin router registered (80.41)")
