"""Session 82.103b — Public Savings-Offers + Partner-Banks + Home-Stats."""
from __future__ import annotations
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Query
from motor.motor_asyncio import AsyncIOMotorClient

_db = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)[os.environ["DB_NAME"]]
router = APIRouter(prefix="/api/public", tags=["public-reads"])


def _iso(v: Any) -> Optional[str]:
    return v.isoformat() if isinstance(v, datetime) else (v if isinstance(v, str) else None)


async def _coll_exists(n: str) -> bool:
    return bool(await _db.list_collection_names(filter={"name": n}))


def _serialize_bank(b: dict) -> Dict[str, Any]:
    return {
        "id": str(b.get("_id")) if b.get("_id") is not None else None,
        "name": b.get("name"),
        "slug": b.get("slug"),
        "country": b.get("country"),
        "logo_url": b.get("logo_url"),
        "website_url": b.get("website_url"),
        "deposit_protection": b.get("deposit_protection"),
        "deposit_protection_amount": b.get("deposit_protection_amount"),
        "founded_year": b.get("founded_year"),
        "credit_rating": b.get("credit_rating"),
        "regulator_name": b.get("regulator_name"),
        "is_active": bool(b.get("is_active", True)),
    }


async def _bank_map() -> Dict[str, dict]:
    if not await _coll_exists("banks"):
        return {}
    out = {}
    async for b in _db.banks.find({}):
        out[str(b["_id"])] = b
    return out


@router.get("/savings-offers")
async def savings_offers(
    active_only: bool = Query(default=True),
    limit: int = Query(default=500, ge=1, le=2000),
) -> Dict[str, Any]:
    if not await _coll_exists("savings_offers"):
        return {"items": [], "count": 0}
    q: Dict[str, Any] = {"is_active": True} if active_only else {}
    banks = await _bank_map()
    items: List[Dict[str, Any]] = []
    async for o in _db.savings_offers.find(q).limit(limit):
        bank_id = str(o.get("bank_id")) if o.get("bank_id") is not None else None
        b = banks.get(bank_id) if bank_id else None
        items.append({
            "id": str(o.get("_id")),
            "bank_id": bank_id,
            "interest_rate": o.get("interest_rate"),
            "deposit_term": o.get("deposit_term"),
            "investment_type": o.get("investment_type"),
            "min_deposit": o.get("min_deposit"),
            "max_deposit": o.get("max_deposit"),
            "welcome_bonus": o.get("welcome_bonus"),
            "notes": o.get("notes"),
            "deposit_protection": o.get("deposit_protection"),
            "deposit_protection_authority": o.get("deposit_protection_authority"),
            "is_active": bool(o.get("is_active", True)),
            "banks": _serialize_bank(b) if b else None,
        })
    return {"items": items, "count": len(items)}


@router.get("/partner-banks")
async def partner_banks() -> Dict[str, Any]:
    if not await _coll_exists("banks"):
        return {"items": [], "count": 0}
    items = []
    async for b in _db.banks.find({"is_active": True}):
        items.append(_serialize_bank(b))
    return {"items": items, "count": len(items)}


@router.get("/home-stats")
async def home_stats() -> Dict[str, Any]:
    # Nur echte Metriken. Fehlt eine Datenquelle → null.
    stats: Dict[str, Any] = {}
    stats["users_count"] = await _db.users.count_documents({}) if await _coll_exists("users") else None
    stats["applications_count"] = await _db.applications.count_documents({}) if await _coll_exists("applications") else None
    stats["partner_banks_count"] = await _db.banks.count_documents({"is_active": True}) if await _coll_exists("banks") else None
    stats["savings_offers_count"] = await _db.savings_offers.count_documents({"is_active": True}) if await _coll_exists("savings_offers") else None
    return {"stats": stats, "generated_at": datetime.now(timezone.utc).isoformat()}
