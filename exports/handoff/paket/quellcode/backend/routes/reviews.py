"""Session 82.103a — Reviews (Public + Admin Moderation, FastAPI/Mongo).

Ersetzt Supabase-`offer_reviews`-Reads/Writes. Collection wird lazy
angelegt; leere Preview-DB → faithful empty. Keine Fake-Ratings.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, Body, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

from server import require_admin  # type: ignore  # noqa: E402

_client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
_db = _client[os.environ["DB_NAME"]]

public_router = APIRouter(prefix="/api/reviews", tags=["reviews-public"])
admin_router = APIRouter(prefix="/api/admin/reviews", tags=["reviews-admin"])

ALLOWED_STATUSES = {"pending", "approved", "rejected"}


def _iso(v: Any) -> Optional[str]:
    return v.isoformat() if isinstance(v, datetime) else (v if isinstance(v, str) else None)


def _serialize(d: dict) -> Dict[str, Any]:
    return {
        "id": str(d.get("_id")),
        "savings_offer_id": d.get("savings_offer_id"),
        "bank_id": d.get("bank_id"),
        "stars": d.get("stars"),
        "body": d.get("body"),
        "product_type": d.get("product_type"),
        "author_display_name": d.get("author_display_name"),
        "reviewer_kind": d.get("reviewer_kind"),
        "guest_first_name": d.get("guest_first_name"),
        "guest_last_name": d.get("guest_last_name"),
        "user_id": str(d.get("user_id")) if d.get("user_id") else None,
        "status": d.get("status", "pending"),
        "rejection_reason": d.get("rejection_reason"),
        "created_at": _iso(d.get("created_at")),
        "reviewed_at": _iso(d.get("reviewed_at")),
        "deleted_at": _iso(d.get("deleted_at")),
    }


async def _coll_exists() -> bool:
    names = await _db.list_collection_names(filter={"name": "offer_reviews"})
    return bool(names)


# ─── PUBLIC ─────────────────────────────────────────────────────────────
@public_router.get("/approved")
async def approved_reviews(
    offer_id: Optional[str] = Query(default=None),
    bank_id: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
) -> Dict[str, Any]:
    if not await _coll_exists():
        return {"items": [], "count": 0}
    q: Dict[str, Any] = {"status": "approved", "deleted_at": None}
    if offer_id:
        q["savings_offer_id"] = offer_id
    if bank_id:
        q["bank_id"] = bank_id
    docs = await _db.offer_reviews.find(q).sort([("created_at", -1)]).limit(limit).to_list(limit)
    return {"items": [_serialize(d) for d in docs], "count": len(docs)}


@public_router.get("/stats")
async def review_stats(
    offer_id: Optional[str] = Query(default=None),
    bank_id: Optional[str] = Query(default=None),
) -> Dict[str, Any]:
    if not await _coll_exists():
        return {"review_count": 0, "average_rating": None}
    match: Dict[str, Any] = {"status": "approved", "deleted_at": None}
    if offer_id:
        match["savings_offer_id"] = offer_id
    if bank_id:
        match["bank_id"] = bank_id
    pipeline = [
        {"$match": match},
        {"$group": {"_id": None, "count": {"$sum": 1}, "avg": {"$avg": "$stars"}}},
    ]
    docs = await _db.offer_reviews.aggregate(pipeline).to_list(1)
    if not docs:
        return {"review_count": 0, "average_rating": None}
    return {
        "review_count": int(docs[0]["count"]),
        "average_rating": float(docs[0]["avg"]) if docs[0].get("avg") is not None else None,
    }


# ─── ADMIN ──────────────────────────────────────────────────────────────
class ApproveIn(BaseModel):
    note: Optional[str] = Field(default=None, max_length=1000)
    model_config = {"extra": "forbid"}


class RejectIn(BaseModel):
    reason: Optional[str] = Field(default=None, max_length=1000)
    model_config = {"extra": "forbid"}


def _oid(x: str) -> ObjectId:
    if not ObjectId.is_valid(x):
        raise HTTPException(status_code=422, detail="Ungültige review_id")
    return ObjectId(x)


@admin_router.get("")
async def admin_list_reviews(
    status: str = Query(default="pending"),
    _admin: dict = Depends(require_admin),
) -> Dict[str, Any]:
    if status not in (ALLOWED_STATUSES | {"all", "deleted"}):
        raise HTTPException(status_code=422, detail="Ungültiger Status-Filter")
    if not await _coll_exists():
        return {"items": [], "count": 0, "table_missing": True}
    q: Dict[str, Any] = {}
    if status == "deleted":
        q["deleted_at"] = {"$ne": None}
    elif status == "all":
        q["deleted_at"] = None
    else:
        q["status"] = status
        q["deleted_at"] = None
    docs = await _db.offer_reviews.find(q).sort([("created_at", -1)]).limit(500).to_list(500)
    return {"items": [_serialize(d) for d in docs], "count": len(docs), "table_missing": False}


@admin_router.post("/{review_id}/approve")
async def admin_approve(review_id: str, body: ApproveIn = Body(default_factory=ApproveIn),
                        admin: dict = Depends(require_admin)) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    res = await _db.offer_reviews.find_one_and_update(
        {"_id": _oid(review_id), "deleted_at": None},
        {"$set": {"status": "approved", "reviewed_at": now, "rejection_reason": None,
                  "reviewed_by": ObjectId(admin["id"]), "admin_note": body.note}},
        return_document=True,
    )
    if not res:
        raise HTTPException(status_code=404, detail="Review nicht gefunden")
    return _serialize(res)


@admin_router.post("/{review_id}/reject")
async def admin_reject(review_id: str, body: RejectIn = Body(default_factory=RejectIn),
                       admin: dict = Depends(require_admin)) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    res = await _db.offer_reviews.find_one_and_update(
        {"_id": _oid(review_id), "deleted_at": None},
        {"$set": {"status": "rejected", "reviewed_at": now,
                  "rejection_reason": body.reason,
                  "reviewed_by": ObjectId(admin["id"])}},
        return_document=True,
    )
    if not res:
        raise HTTPException(status_code=404, detail="Review nicht gefunden")
    return _serialize(res)


@admin_router.delete("/{review_id}")
async def admin_delete(review_id: str, _admin: dict = Depends(require_admin)) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    res = await _db.offer_reviews.update_one(
        {"_id": _oid(review_id)},
        {"$set": {"deleted_at": now}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Review nicht gefunden")
    return {"status": "deleted", "id": review_id}
