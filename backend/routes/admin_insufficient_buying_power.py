"""Session 82.103c — Admin „Kaufkraft-Warnungen" Cutover.

Ersetzt die Supabase-Aufrufe der ``AdminInsufficientBuyingPower``-Seite:

* ``insufficient_buying_power_events`` — GET Liste (mit Profile-Snapshot).
* PATCH ``status`` (`new` | `handled`) + `handled_at`-Timestamp.
* Soft-Delete (``deleted_at`` gesetzt) — **niemals** physisches Delete, weil
  IBP-Events audit-/compliance-relevant sind (Kaufwunsch ohne Kaufkraft ist
  ein Risiko-Signal).

FINANCIAL_WRITES=0:
  Diese Routen verändern ausschließlich Workflow-Metadaten (Status,
  Handled-Timestamp, Soft-Delete-Flag). Cash-Balances, Buying Power und
  Positionen bleiben absolut unberührt.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, Body, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

from server import require_admin  # type: ignore  # noqa: E402

_client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
_db = _client[os.environ["DB_NAME"]]

router = APIRouter(prefix="/api/admin", tags=["admin-insufficient-buying-power"])


# ─── Helpers ────────────────────────────────────────────────────────────
_ALLOWED_STATUSES = {"new", "handled"}


def _iso(v: Any) -> Optional[str]:
    return v.isoformat() if isinstance(v, datetime) else (v if isinstance(v, str) else None)


def _oid_or_422(x: str) -> ObjectId:
    if not ObjectId.is_valid(x):
        raise HTTPException(status_code=422, detail="Ungültige ID")
    return ObjectId(x)


async def _collection_exists(name: str) -> bool:
    return name in await _db.list_collection_names(filter={"name": name})


async def _load_profile_map(user_ids: List[Any]) -> Dict[str, Dict[str, Any]]:
    """Whitelisted Profile-Projection — kein `password_hash`, keine Tokens.
    Nur die Felder, die die Admin-UI (Name + Kontakt) tatsächlich rendert."""
    if not user_ids:
        return {}
    oids = [uid for uid in user_ids if isinstance(uid, ObjectId)]
    result: Dict[str, Dict[str, Any]] = {}
    if not oids:
        return result
    projection = {"email": 1, "first_name": 1, "last_name": 1, "phone": 1}
    async for u in _db.users.find({"_id": {"$in": oids}}, projection):
        result[str(u["_id"])] = {
            "email": u.get("email"),
            "first_name": u.get("first_name"),
            "last_name": u.get("last_name"),
            "phone": u.get("phone"),
        }
    return result


# ─── LIST ───────────────────────────────────────────────────────────────
@router.get("/insufficient-buying-power-events")
async def list_insufficient_buying_power_events(
    status: Optional[str] = Query(default=None, description="'new' | 'handled' | 'all'"),
    limit: int = Query(default=200, ge=1, le=1000),
    _admin: dict = Depends(require_admin),
) -> Dict[str, Any]:
    if not await _collection_exists("insufficient_buying_power_events"):
        return {"items": [], "count": 0, "coverage": "collection_missing"}

    q: Dict[str, Any] = {"deleted_at": {"$in": [None, False]}}
    # ^ Soft-Delete Filter: nur nicht-gelöschte Events
    if status and status != "all":
        if status not in _ALLOWED_STATUSES:
            raise HTTPException(status_code=422, detail="Ungültiger Status-Filter")
        q["status"] = status

    docs = (
        await _db.insufficient_buying_power_events.find(q)
        .sort([("created_at", -1)])
        .limit(limit)
        .to_list(limit)
    )

    user_ids = [d.get("user_id") for d in docs if d.get("user_id")]
    profile_map = await _load_profile_map(user_ids)

    items: List[Dict[str, Any]] = []
    for d in docs:
        uid = d.get("user_id")
        uid_str = str(uid) if uid else None
        profile = profile_map.get(uid_str) if uid_str else None
        items.append({
            "id": str(d["_id"]),
            "user_id": uid_str,
            "symbol": d.get("symbol"),
            "stock_name": d.get("stock_name"),
            "required_amount": d.get("required_amount"),
            "available_amount": d.get("available_amount"),
            "quantity": d.get("quantity"),
            "order_type": d.get("order_type"),
            "currency": d.get("currency"),
            "status": d.get("status", "new"),
            "created_at": _iso(d.get("created_at")),
            "handled_at": _iso(d.get("handled_at")),
            "profiles": profile,   # None → UI zeigt "Unbekannt"
        })
    return {"items": items, "count": len(items)}


# ─── PATCH STATUS ───────────────────────────────────────────────────────
class StatusPatch(BaseModel):
    status: str
    model_config = {"extra": "forbid"}


@router.patch("/insufficient-buying-power-events/{event_id}")
async def update_ibp_status(
    event_id: str,
    body: StatusPatch = Body(...),
    _admin: dict = Depends(require_admin),
) -> Dict[str, Any]:
    """Setzt nur Workflow-Status + Handled-Timestamp. Keine Cash-/Position-
    /BuyingPower-Mutation."""
    oid = _oid_or_422(event_id)
    st = (body.status or "").strip()
    if st not in _ALLOWED_STATUSES:
        raise HTTPException(status_code=422, detail="Ungültiger Status")

    now = datetime.now(timezone.utc)
    updates = {
        "status": st,
        "handled_at": None if st == "new" else now,
        "updated_at": now,
    }
    res = await _db.insufficient_buying_power_events.update_one(
        {"_id": oid, "deleted_at": {"$in": [None, False]}},
        {"$set": updates},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ereignis nicht gefunden")
    return {"status": st, "id": event_id, "handled_at": _iso(updates["handled_at"])}


# ─── SOFT DELETE (audit-relevant → NIEMALS physisch löschen) ───────────
@router.delete("/insufficient-buying-power-events/{event_id}")
async def soft_delete_ibp_event(
    event_id: str,
    _admin: dict = Depends(require_admin),
) -> Dict[str, Any]:
    """Soft-Delete. Ereignis bleibt in der Collection erhalten (mit
    ``deleted_at``-Timestamp), damit Audit-Trail und historische Auswertung
    stabil bleiben. Keine finanziellen Nebenwirkungen."""
    oid = _oid_or_422(event_id)
    now = datetime.now(timezone.utc)
    res = await _db.insufficient_buying_power_events.update_one(
        {"_id": oid, "deleted_at": {"$in": [None, False]}},
        {"$set": {"deleted_at": now, "updated_at": now}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ereignis nicht gefunden")
    return {"status": "soft_deleted", "id": event_id, "deleted_at": _iso(now)}
