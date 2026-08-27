"""Session 80.40 — Admin-Inbox für Assistant-Handoffs.

Geschützte Endpoints zur Verwaltung der über den Fröhlich Assistenten
eingegangenen Beratungs-Anfragen (`assistant_handoffs` Collection).

Design:
- Admin-only via `require_admin`-Dependency aus server.py.
- Datensparsam: liefert nur Meta + `context_summary`. KEIN voller Chat-Verlauf.
- Statusworkflow: `new` → `in_progress` → `completed` (+ `archived`).
- Analytics-Zähler pro Status.

Der Router wird über `register(app, db, require_admin)` gebaut, damit die
`require_admin`-Dependency zur Registrier-Zeit injiziert wird (kein Circular-Import).
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

VALID_STATUS = {"new", "in_progress", "completed", "archived"}


def _to_public(doc: dict) -> dict:
    """Serialisiert einen Handoff-Doc für die Admin-UI (datensparsam)."""
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
        "created_at": (doc.get("created_at") or datetime.now(timezone.utc)).isoformat()
        if isinstance(doc.get("created_at"), datetime)
        else doc.get("created_at"),
        "updated_at": (doc.get("updated_at").isoformat()
                        if isinstance(doc.get("updated_at"), datetime) else doc.get("updated_at")),
        "email_sent_admin": bool(doc.get("email_sent_admin")),
        "email_sent_customer": bool(doc.get("email_sent_customer")),
    }


class PatchHandoffIn(BaseModel):
    status: Optional[str] = Field(default=None)
    admin_notes: Optional[str] = Field(default=None, max_length=4000)
    assigned_to: Optional[str] = Field(default=None, max_length=200)


def register(app, db, require_admin):
    """Bindet die Endpoints an konkrete Dependencies + db."""
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
                import re as _re
                rx = _re.compile(_re.escape(qn), _re.I)
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
            # Legacy-Docs ohne Status zählen als „neu".
            key = (raw or "new").lower() if isinstance(raw, str) else "new"
            if key in by_status:
                by_status[key] = by_status.get(key, 0) + int(r.get("count", 0))
        # Gesamt aus DB (autoritativ), unabhängig von der Status-Verteilung.
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
    async def patch_handoff(handoff_id: str, payload: PatchHandoffIn, user: dict = Depends(require_admin)):
        if not ObjectId.is_valid(handoff_id):
            raise HTTPException(404, "Nicht gefunden.")
        update: Dict[str, Any] = {}
        if payload.status is not None:
            s = payload.status.strip().lower()
            if s not in VALID_STATUS:
                raise HTTPException(400, "Ungültiger Status.")
            update["status"] = s
        if payload.admin_notes is not None:
            update["admin_notes"] = payload.admin_notes.strip()[:4000]
        if payload.assigned_to is not None:
            update["assigned_to"] = payload.assigned_to.strip()[:200] or None
        if not update:
            raise HTTPException(400, "Nichts zu aktualisieren.")
        update["updated_at"] = datetime.now(timezone.utc)
        update["updated_by"] = user.get("email") or user.get("id")
        res = await db.assistant_handoffs.find_one_and_update(
            {"_id": ObjectId(handoff_id)},
            {"$set": update},
            return_document=True,
        )
        if not res:
            raise HTTPException(404, "Nicht gefunden.")
        return _to_public(res)

    app.include_router(router)
    logger.info("assistant-admin router registered")
