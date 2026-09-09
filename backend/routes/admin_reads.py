"""Session 82.91a — Admin Read Backend Enablement.

Additive read-only endpoints für 82.91b Frontend-Cutover. Alle mit
`require_admin`, whitelisted Projection (kein `password_hash`, keine
Reset-Tokens, keine Secrets), keine Financial-Writes.

Datenwahrheit: fehlende Collections liefern `{items: [], count: 0}` —
niemals synthetische Aktivität, Fake-KPIs oder Hardcoded-Counts.
"""
from __future__ import annotations

import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient

from server import require_admin  # type: ignore  # noqa: E402

_client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
_db = _client[os.environ["DB_NAME"]]

router = APIRouter(prefix="/api/admin", tags=["admin-reads"])


def _iso(dt: Any) -> Optional[str]:
    if isinstance(dt, datetime):
        return dt.isoformat()
    return dt if isinstance(dt, str) else None


def _rgx(term: str) -> Dict[str, Any]:
    return {"$regex": re.escape((term or "").strip()), "$options": "i"}


async def _collection_exists(name: str) -> bool:
    return name in await _db.list_collection_names()


# ─── BANKS ──────────────────────────────────────────────────────────────
@router.get("/banks/list")
async def admin_banks_list(
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0, le=10_000),
    _admin: dict = Depends(require_admin),
) -> Dict[str, Any]:
    q: Dict[str, Any] = {}
    if search:
        q["$or"] = [{"name": _rgx(search)}, {"slug": _rgx(search)}, {"country": _rgx(search)}]
    total = await _db.banks.count_documents(q)
    docs = await _db.banks.find(q).sort([("name", 1)]).skip(offset).limit(limit).to_list(limit)
    return {
        "items": [
            {
                "id": str(d["_id"]),
                "slug": d.get("slug"),
                "name": d.get("name"),
                "country": d.get("country"),
                "logo_url": d.get("logo_url"),
                "description": d.get("description"),
            }
            for d in docs
        ],
        "count": total,
    }


# ─── OFFERS ─────────────────────────────────────────────────────────────
@router.get("/offers/list")
async def admin_offers_list(
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0, le=10_000),
    _admin: dict = Depends(require_admin),
) -> Dict[str, Any]:
    q: Dict[str, Any] = {}
    if search:
        q["$or"] = [{"product_name": _rgx(search)}, {"bank_slug": _rgx(search)}]
    total = await _db.savings_offers.count_documents(q)
    docs = await _db.savings_offers.find(q).sort([("interest_rate", -1)]).skip(offset).limit(limit).to_list(limit)
    return {
        "items": [
            {
                "id": str(d["_id"]),
                "product_name": d.get("product_name"),
                "bank_slug": d.get("bank_slug"),
                "country": d.get("country"),
                "currency": d.get("currency"),
                "interest_rate": d.get("interest_rate"),
                "interest_rate_type": d.get("interest_rate_type"),
                "min_amount": d.get("min_amount"),
                "max_amount": d.get("max_amount"),
                "new_customers_only": d.get("new_customers_only"),
                "deposit_guarantee_country": d.get("deposit_guarantee_country"),
                "deposit_guarantee_limit": d.get("deposit_guarantee_limit"),
            }
            for d in docs
        ],
        "count": total,
    }


# ─── APPLICATIONS ───────────────────────────────────────────────────────
@router.get("/applications/list")
async def admin_applications_list(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0, le=10_000),
    _admin: dict = Depends(require_admin),
) -> Dict[str, Any]:
    """`applications` Collection ist im Preview leer/nicht angelegt →
    faithful empty state. Keine synthetischen Einträge."""
    if not await _collection_exists("applications"):
        return {"items": [], "count": 0, "coverage": "collection_missing"}
    total = await _db.applications.count_documents({})
    docs = await _db.applications.find({}).sort([("created_at", -1)]).skip(offset).limit(limit).to_list(limit)
    return {
        "items": [{**{k: v for k, v in d.items() if k != "_id"}, "id": str(d["_id"])} for d in docs],
        "count": total,
    }


# ─── DEPOT CONTRACTS ────────────────────────────────────────────────────
@router.get("/depot-contracts/list")
async def admin_depot_contracts_list(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0, le=10_000),
    _admin: dict = Depends(require_admin),
) -> Dict[str, Any]:
    """Legacy `user_depot_contracts` existiert nicht mehr; Mongo hat
    `depot_contracts` (aktuell leer)."""
    coll = "depot_contracts" if await _collection_exists("depot_contracts") else None
    if not coll:
        return {"items": [], "count": 0, "coverage": "collection_missing"}
    total = await _db[coll].count_documents({})
    docs = await _db[coll].find({}).sort([("created_at", -1)]).skip(offset).limit(limit).to_list(limit)
    return {
        "items": [{**{k: v for k, v in d.items() if k != "_id"}, "id": str(d["_id"])} for d in docs],
        "count": total,
    }


# ─── ACTIVITY ───────────────────────────────────────────────────────────
@router.get("/activity/list")
async def admin_activity_list(
    limit: int = Query(default=50, ge=1, le=500),
    _admin: dict = Depends(require_admin),
) -> Dict[str, Any]:
    """Reine Mongo-Ableitung aus echten Order-/Request-Events.
    Keine synthetische Aktivität. `user_activity_log` (Legacy) → skip.
    """
    events: List[Dict[str, Any]] = []
    cursor = _db.stock_orders.find({}).sort([("created_at", -1)]).limit(limit)
    async for d in cursor:
        events.append({
            "id": str(d["_id"]),
            "type": f"stock_order_{d.get('side','?')}",
            "status": d.get("status"),
            "symbol": d.get("symbol"),
            "user_id": str(d.get("user_id")) if d.get("user_id") else None,
            "timestamp": _iso(d.get("created_at")),
        })
    async for d in _db.ipo_requests.find({}).sort([("created_at", -1)]).limit(limit):
        events.append({
            "id": str(d["_id"]),
            "type": "ipo_request",
            "status": d.get("status"),
            "symbol": d.get("ticker"),
            "user_id": str(d.get("user_id")) if d.get("user_id") else None,
            "timestamp": _iso(d.get("created_at")),
        })
    async for d in _db.bond_purchase_requests.find({}).sort([("created_at", -1)]).limit(limit):
        events.append({
            "id": str(d["_id"]),
            "type": "bond_request",
            "status": d.get("status"),
            "symbol": d.get("isin"),
            "user_id": str(d.get("user_id")) if d.get("user_id") else None,
            "timestamp": _iso(d.get("created_at")),
        })
    events.sort(key=lambda e: e.get("timestamp") or "", reverse=True)
    return {"items": events[:limit], "count": len(events)}


# ─── DASHBOARD SUMMARY ──────────────────────────────────────────────────
@router.get("/dashboard/summary")
async def admin_dashboard_summary(_admin: dict = Depends(require_admin)) -> Dict[str, Any]:
    """Aggregierte Admin-KPIs — ausschließlich echte Mongo-Counts.
    Verboten: Fake Revenue/Trends/Visitors. Fehlende Daten → null.
    """
    now = datetime.now(timezone.utc)
    day_ago = now - timedelta(hours=24)
    users_total = await _db.users.count_documents({})
    users_admin = await _db.users.count_documents({"role": "admin"})
    users_new_24h = await _db.users.count_documents({"created_at": {"$gte": day_ago}})
    orders_pending = await _db.stock_orders.count_documents({"status": "pending"})
    orders_total = await _db.stock_orders.count_documents({})
    ipo_pending = await _db.ipo_requests.count_documents({"status": "pending"})
    bond_pending = await _db.bond_purchase_requests.count_documents({"status": "pending"})
    banks_count = await _db.banks.count_documents({})
    offers_count = await _db.savings_offers.count_documents({})
    return {
        "users": {"total": users_total, "customers": users_total - users_admin, "new_24h": users_new_24h},
        "orders": {"total": orders_total, "pending": orders_pending},
        "ipo_requests": {"pending": ipo_pending},
        "bond_requests": {"pending": bond_pending},
        "catalog": {"banks": banks_count, "offers": offers_count},
        "revenue": None,        # keine echte Revenue-Datenquelle → faithful null
        "visitors": None,       # keine Visitor-Collection → faithful null
        "generated_at": now.isoformat(),
    }
