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
    """Public savings-offers endpoint.

    Session 82.103b lieferte diese Route für ein älteres Schema (`bank_id`,
    `investment_type`, `deposit_term`, `min_deposit`). Die aktuelle
    `savings_offers`-Collection nutzt aber das neuere Schema aus
    `savings_data.py` (`bank_slug`, `product_type`, `term_months`,
    `min_amount`) und trägt kein `is_active`-Feld. Deshalb hier:

      1. Filter `is_active` toleriert fehlende Felder (`$ne: False`).
      2. Bank-Auflösung sowohl über `bank_slug` als auch (Legacy) `bank_id`.
      3. Schema-Alias: Neue Felder werden zusätzlich als Legacy-Feldnamen
         ausgeliefert (`investment_type`, `deposit_term`, `min_deposit` etc.),
         damit `SavingsComparison.js` unverändert weiterläuft.
    """
    if not await _coll_exists("savings_offers"):
        return {"items": [], "count": 0}
    # Tolerant: nur explizit `is_active: false` ausschließen.
    q: Dict[str, Any] = {"is_active": {"$ne": False}} if active_only else {}
    # Bank-Lookup nach beidem: slug (neu) UND ObjectId (Legacy).
    banks_by_slug: Dict[str, dict] = {}
    banks_by_id: Dict[str, dict] = {}
    if await _coll_exists("banks"):
        async for b in _db.banks.find({}):
            if b.get("slug"):
                banks_by_slug[b["slug"]] = b
            banks_by_id[str(b["_id"])] = b
    _PRODUCT_TYPE_LABELS = {
        "tagesgeld": "Tagesgeld",
        "festgeld": "Festgeld",
        "flexgeld": "Flexgeld",
    }
    items: List[Dict[str, Any]] = []
    async for o in _db.savings_offers.find(q).limit(limit):
        bank = None
        if o.get("bank_slug"):
            bank = banks_by_slug.get(o["bank_slug"])
        if not bank and o.get("bank_id") is not None:
            bank = banks_by_id.get(str(o["bank_id"]))
        product_type = o.get("product_type") or o.get("investment_type")
        # Legacy-Alias: investment_type (String mit Großschreibung wie im Frontend).
        investment_type = (
            _PRODUCT_TYPE_LABELS.get(str(product_type).lower(), o.get("investment_type"))
            if product_type else o.get("investment_type")
        )
        # Legacy-Alias: deposit_term. Tagesgeld → 0, sonst term_months.
        deposit_term = o.get("deposit_term")
        if deposit_term is None:
            if str(product_type).lower() == "tagesgeld":
                deposit_term = 0
            else:
                deposit_term = o.get("term_months")
        items.append({
            "id": str(o.get("_id")),
            "bank_id": str(o.get("bank_id")) if o.get("bank_id") is not None else None,
            "bank_slug": o.get("bank_slug"),
            "interest_rate": o.get("interest_rate"),
            "interest_rate_type": o.get("interest_rate_type"),
            "promo_rate": o.get("promo_rate"),
            "promo_duration_months": o.get("promo_duration_months"),
            "standard_rate_after_promo": o.get("standard_rate_after_promo"),
            "deposit_term": deposit_term,
            "term_months": o.get("term_months"),
            "investment_type": investment_type,
            "product_type": product_type,
            "product_name": o.get("product_name"),
            "min_deposit": o.get("min_deposit") if o.get("min_deposit") is not None else o.get("min_amount"),
            "max_deposit": o.get("max_deposit") if o.get("max_deposit") is not None else o.get("max_amount"),
            "min_amount": o.get("min_amount"),
            "max_amount": o.get("max_amount"),
            "currency": o.get("currency", "EUR"),
            "country": o.get("country") or (bank.get("country") if bank else None),
            "new_customers_only": bool(o.get("new_customers_only", False)),
            "welcome_bonus": o.get("welcome_bonus"),
            "notes": o.get("notes"),
            "interest_frequency": o.get("interest_frequency"),
            "deposit_protection": o.get("deposit_protection") or o.get("deposit_guarantee_country"),
            "deposit_protection_amount": o.get("deposit_guarantee_limit") or o.get("deposit_protection_amount"),
            "deposit_protection_authority": o.get("deposit_protection_authority"),
            "source_name": o.get("source_name"),
            "source_url": o.get("source_url"),
            "is_active": bool(o.get("is_active", True)),
            "banks": _serialize_bank(bank) if bank else None,
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
