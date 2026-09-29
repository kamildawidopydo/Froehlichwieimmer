"""Session 93 · Phase 4 — OfferLink CRUD (Public + Admin).

Öffentlich: Nur aktive Links (`status="active"` UND innerhalb `valid_from/until`).
Priorität-Sortierung: affiliate > direct > information (aber Affiliate nur, wenn
tatsächlich aktiv).

Admin: POST/PATCH/DELETE. `require_admin` schützt Schreibwege.
"""
from __future__ import annotations
import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, Body, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, HttpUrl

_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

from server import require_admin  # type: ignore  # noqa: E402

_db = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)[os.environ["DB_NAME"]]
public_router = APIRouter(prefix="/api/public", tags=["public-offer-links"])
admin_router = APIRouter(prefix="/api/admin", tags=["admin-offer-links"])


class OfferLinkPayload(BaseModel):
    offer_id: str
    type: str = Field(..., pattern=r"^(affiliate|direct|information)$")
    url: HttpUrl
    provider: Optional[str] = None
    is_affiliate: bool = False
    status: str = Field(default="active", pattern=r"^(active|inactive|draft)$")
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None


class OfferLinkPatch(BaseModel):
    type: Optional[str] = Field(default=None, pattern=r"^(affiliate|direct|information)$")
    url: Optional[HttpUrl] = None
    provider: Optional[str] = None
    is_affiliate: Optional[bool] = None
    status: Optional[str] = Field(default=None, pattern=r"^(active|inactive|draft|disabled)$")
    valid_until: Optional[datetime] = None


PRIORITY = {"affiliate": 3, "direct": 2, "information": 1}


def _is_active_link(link: dict, now: datetime) -> bool:
    if link.get("status") != "active":
        return False
    vf = link.get("valid_from")
    if vf and isinstance(vf, datetime) and vf > now:
        return False
    vu = link.get("valid_until")
    if vu and isinstance(vu, datetime) and vu < now:
        return False
    return bool(link.get("url"))


def _serialize(link: dict) -> Dict[str, Any]:
    return {
        "id": str(link.get("_id")),
        "offer_id": link.get("offer_id"),
        "type": link.get("type"),
        "url": link.get("url"),
        "provider": link.get("provider"),
        "is_affiliate": bool(link.get("is_affiliate", False)),
        "status": link.get("status"),
        "valid_from": link["valid_from"].isoformat() if isinstance(link.get("valid_from"), datetime) else None,
        "valid_until": link["valid_until"].isoformat() if isinstance(link.get("valid_until"), datetime) else None,
        "last_checked_at": link["last_checked_at"].isoformat() if isinstance(link.get("last_checked_at"), datetime) else None,
    }


# ------------------------------- Public -----------------------------------
@public_router.get("/offer-links/{offer_id}")
async def public_offer_links(offer_id: str) -> Dict[str, Any]:
    """Nur aktive Links zurückgeben, sortiert nach Priorität."""
    now = datetime.now(timezone.utc)
    coll = _db.offer_links
    items: List[dict] = []
    async for doc in coll.find({"offer_id": offer_id}):
        if _is_active_link(doc, now):
            items.append(doc)
    items.sort(key=lambda x: -PRIORITY.get(x.get("type", "information"), 0))
    primary = items[0] if items else None
    return {
        "offer_id": offer_id,
        "primary": _serialize(primary) if primary else None,
        "links": [_serialize(x) for x in items],
        "count": len(items),
        "has_affiliate": any(x.get("type") == "affiliate" for x in items),
    }


# ------------------------------- Admin ------------------------------------
@admin_router.post("/offer-links")
async def create_link(body: OfferLinkPayload = Body(...), _admin: dict = Depends(require_admin)) -> Dict[str, Any]:
    offer_query = {"_id": ObjectId(body.offer_id)} if len(body.offer_id) == 24 else {"_id": body.offer_id}
    if not await _db.savings_offers.find_one(offer_query):
        raise HTTPException(status_code=404, detail="offer not found")
    now = datetime.now(timezone.utc)
    doc = body.model_dump()
    doc["url"] = str(doc["url"])
    doc["created_at"] = now
    doc["updated_at"] = now
    doc["last_checked_at"] = None
    res = await _db.offer_links.insert_one(doc)
    return {"id": str(res.inserted_id), **_serialize({**doc, "_id": res.inserted_id})}


@admin_router.patch("/offer-links/{link_id}")
async def patch_link(link_id: str, body: OfferLinkPatch = Body(...), _admin: dict = Depends(require_admin)) -> Dict[str, Any]:
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if "url" in upd:
        upd["url"] = str(upd["url"])
    upd["updated_at"] = datetime.now(timezone.utc)
    r = await _db.offer_links.find_one_and_update(
        {"_id": ObjectId(link_id) if len(link_id) == 24 else link_id},
        {"$set": upd},
        return_document=True,
    )
    if not r:
        raise HTTPException(status_code=404, detail="link not found")
    return _serialize(r)


@admin_router.delete("/offer-links/{link_id}")
async def deactivate_link(link_id: str, _admin: dict = Depends(require_admin)) -> Dict[str, Any]:
    r = await _db.offer_links.find_one_and_update(
        {"_id": ObjectId(link_id) if len(link_id) == 24 else link_id},
        {"$set": {"status": "disabled", "updated_at": datetime.now(timezone.utc)}},
        return_document=True,
    )
    if not r:
        raise HTTPException(status_code=404, detail="link not found")
    return {"ok": True, "id": link_id}


@admin_router.get("/offer-links")
async def list_all_links(offer_id: Optional[str] = None, _admin: dict = Depends(require_admin)) -> Dict[str, Any]:
    q = {"offer_id": offer_id} if offer_id else {}
    items = [_serialize(x) async for x in _db.offer_links.find(q).sort("updated_at", -1).limit(500)]
    return {"items": items, "count": len(items)}
