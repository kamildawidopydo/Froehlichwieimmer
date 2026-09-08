"""
Session 82.82 — Admin-Offer-Interests API (Mongo-native).

Bestehendes Frontend erwartet Felder {id, name, email, phone, offer_bank_name,
message, created_at}. Mongo hatte diese Collection bislang nicht; wir
persistieren im gleichen Schema (Session 82.82). Public-Submit-Pfad ist
NICHT Teil dieser Session — die Collection bleibt in Preview leer.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query

from server import db, require_admin

router = APIRouter(prefix="/api/admin/offer-interests", tags=["admin-offer-interests"])


def _iso(v):
    if isinstance(v, datetime):
        return v.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    return v


def _serialize(doc: dict) -> dict:
    # Whitelist — keine internen Felder ins Response leaken.
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name"),
        "email": doc.get("email"),
        "phone": doc.get("phone"),
        "offer_bank_name": doc.get("offer_bank_name"),
        "message": doc.get("message"),
        "created_at": _iso(doc.get("created_at")),
    }


@router.get("")
async def list_offer_interests(
    _admin: dict = Depends(require_admin),
    q: Optional[str] = Query(default=None, max_length=100),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    filt: dict = {}
    if q:
        q = q.strip()
        if q:
            import re

            rx = re.compile(re.escape(q), re.IGNORECASE)
            filt["$or"] = [
                {"name": {"$regex": rx}},
                {"email": {"$regex": rx}},
                {"offer_bank_name": {"$regex": rx}},
            ]
    total = await db.offer_interests.count_documents(filt)
    cursor = (
        db.offer_interests.find(filt).sort("created_at", -1).skip(offset).limit(limit)
    )
    items = [_serialize(d) async for d in cursor]
    return {"total": total, "limit": limit, "offset": offset, "items": items}


@router.get("/{oid}")
async def get_offer_interest(oid: str, _admin: dict = Depends(require_admin)):
    try:
        _id = ObjectId(oid)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="Ungültige ID")
    doc = await db.offer_interests.find_one({"_id": _id})
    if not doc:
        raise HTTPException(status_code=404, detail="Nicht gefunden")
    return _serialize(doc)


@router.delete("/{oid}", status_code=204)
async def delete_offer_interest(oid: str, _admin: dict = Depends(require_admin)):
    try:
        _id = ObjectId(oid)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="Ungültige ID")
    res = await db.offer_interests.delete_one({"_id": _id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Nicht gefunden")
    return None
