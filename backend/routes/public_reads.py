"""Session 93 · Phase 2 — Public Savings-Offers + Partner-Banks + Countries + Facets.

Erweiterte Server-Side-Filter/Sort/Pagination + Facetten-Endpoint für
skalierbare Vergleichslogik. Bleibt vollständig backwards-kompatibel zum
Phase-1-Response-Format (`items`, `count`, `has_demo`).
"""
from __future__ import annotations
import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from fastapi import APIRouter, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient

# lib.savings_calculator ist ein Sibling-Modul zu `routes/` (siehe /app/backend/lib/).
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)
from lib.savings_calculator import compute_yield  # noqa: E402
from lib.data_freshness import freshness_summary  # noqa: E402

_db = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)[os.environ["DB_NAME"]]
router = APIRouter(prefix="/api/public", tags=["public-reads"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _iso(v: Any) -> Optional[str]:
    return v.isoformat() if isinstance(v, datetime) else (v if isinstance(v, str) else None)


async def _coll_exists(n: str) -> bool:
    return bool(await _db.list_collection_names(filter={"name": n}))


def _split_csv(v: Optional[str]) -> List[str]:
    if not v:
        return []
    return [x.strip() for x in v.split(",") if x.strip()]


def _serialize_bank(b: dict) -> Dict[str, Any]:
    cr = b.get("credit_rating")
    if isinstance(cr, dict):
        cr_out = {"fitch": cr.get("fitch"), "moodys": cr.get("moodys"), "sp": cr.get("sp")}
        if all(v in (None, "") for v in cr_out.values()):
            cr_out = None
    else:
        cr_out = None
    return {
        "id": str(b.get("_id")) if b.get("_id") is not None else None,
        "name": b.get("name"),
        "legal_name": b.get("legal_name"),
        "slug": b.get("slug"),
        "country": b.get("country"),
        "country_code": b.get("country_code"),
        "dgs_code": b.get("dgs_code"),
        "deposit_guarantee_country_code": b.get("deposit_guarantee_country_code"),
        "logo_url": b.get("logo_url"),
        "website_url": b.get("website_url"),
        "deposit_protection": b.get("deposit_protection"),
        "deposit_protection_amount": b.get("deposit_protection_amount"),
        "founded_year": b.get("founded_year"),
        "credit_rating": cr_out,
        "regulator_name": b.get("regulator_name"),
        "available_for_de_customers": bool(b.get("available_for_de_customers", True)),
        "online_account_opening": bool(b.get("online_account_opening", True)),
        "status": b.get("status") or ("active" if b.get("is_active", True) else "inactive"),
        "is_active": bool(b.get("is_active", True)),
        "is_demo": bool(b.get("is_demo", False)),
        "data_source": b.get("data_source"),
        "verified_at": _iso(b.get("verified_at")),
    }


async def _load_bank_maps() -> Tuple[Dict[str, dict], Dict[str, dict]]:
    banks_by_slug: Dict[str, dict] = {}
    banks_by_id: Dict[str, dict] = {}
    if await _coll_exists("banks"):
        async for b in _db.banks.find({}):
            if b.get("slug"):
                banks_by_slug[b["slug"]] = b
            banks_by_id[str(b["_id"])] = b
    return banks_by_slug, banks_by_id


_PRODUCT_TYPE_LABELS = {"tagesgeld": "Tagesgeld", "festgeld": "Festgeld", "flexgeld": "Flexgeld"}


def _serialize_offer(o: dict, bank: Optional[dict], amount: Optional[float]) -> Dict[str, Any]:
    product_type = o.get("product_type") or o.get("investment_type")
    investment_type = _PRODUCT_TYPE_LABELS.get(str(product_type).lower(), o.get("investment_type"))
    deposit_term = o.get("deposit_term")
    if deposit_term is None:
        deposit_term = 0 if str(product_type).lower() == "tagesgeld" else o.get("term_months")
    country_iso = o.get("country") if isinstance(o.get("country"), str) and len(o.get("country") or "") == 2 else (bank.get("country_code") if bank else None)
    country_display = (bank.get("country") if bank else None) or o.get("country")
    item = {
        "id": str(o.get("_id")),
        "bank_id": str(o.get("bank_id")) if o.get("bank_id") is not None else None,
        "bank_slug": o.get("bank_slug"),
        "product_key": o.get("product_key"),
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
        "country": country_display,
        "country_code": country_iso,
        "new_customers_only": bool(o.get("new_customers_only", False)),
        "existing_customers_offer": bool(o.get("existing_customers_offer", True)),
        "welcome_bonus": o.get("welcome_bonus"),
        "notes": o.get("notes"),
        "conditions": o.get("conditions"),
        "affiliate_url": o.get("affiliate_url"),
        "online_account_opening": bool(o.get("online_account_opening", True)),
        "available_for_de_customers": bool(o.get("available_for_de_customers", True)),
        "interest_frequency": o.get("interest_frequency"),
        "deposit_protection": o.get("deposit_protection") or o.get("deposit_guarantee_country") or (bank.get("deposit_protection") if bank else None),
        "deposit_protection_amount": o.get("deposit_guarantee_limit") or o.get("deposit_protection_amount") or (bank.get("deposit_protection_amount") if bank else None),
        "deposit_protection_authority": o.get("deposit_protection_authority") or (bank.get("regulator_name") if bank else None),
        "deposit_guarantee_country": o.get("deposit_guarantee_country") or (bank.get("deposit_guarantee_country_code") if bank else None),
        "deposit_guarantee_limit": o.get("deposit_guarantee_limit"),
        "source_name": o.get("source_name"),
        "source_url": o.get("source_url"),
        "status": o.get("status") or ("active" if o.get("is_active", True) else "inactive"),
        "is_active": bool(o.get("is_active", True)),
        "is_demo": bool(o.get("is_demo", False)),
        "data_source": o.get("data_source"),
        "verified_at": _iso(o.get("verified_at")),
        "valid_from": _iso(o.get("valid_from")),
        "valid_until": _iso(o.get("valid_until")),
        "banks": _serialize_bank(bank) if bank else None,
    }
    if amount is not None and amount > 0:
        item["expected_yield"] = compute_yield(o, amount)
    else:
        item["expected_yield"] = None
    item["freshness"] = freshness_summary(o)
    item["source_id"] = o.get("source_id")
    return item


# ---------------------------------------------------------------------------
# Filter-Builder: liefert Mongo-Query + Python-Postfilter (für Amount-Grenzen).
# ---------------------------------------------------------------------------
def _build_filters(
    active_only: bool,
    product_type: Optional[str],
    countries: List[str],
    dgs_countries: List[str],
    rate_min: Optional[float],
    rate_max: Optional[float],
    term_min: Optional[int],
    term_max: Optional[int],
    new_customers_only: Optional[bool],
) -> Dict[str, Any]:
    q: Dict[str, Any] = {}
    if active_only:
        q["is_active"] = {"$ne": False}
    if product_type:
        q["product_type"] = product_type.lower()
    if countries:
        # `country` in savings_offers ist ISO-2 (siehe Seed). Wir tolerieren aber
        # auch Legacy-Display-Namen für Kompatibilität.
        q["country"] = {"$in": countries}
    if dgs_countries:
        q["deposit_guarantee_country"] = {"$in": dgs_countries}
    if rate_min is not None or rate_max is not None:
        q["interest_rate"] = {}
        if rate_min is not None:
            q["interest_rate"]["$gte"] = float(rate_min)
        if rate_max is not None:
            q["interest_rate"]["$lte"] = float(rate_max)
    if term_min is not None or term_max is not None:
        # term_months=null (Tagesgeld) → nur einbeziehen, wenn range 0-inklusiv.
        rng: Dict[str, Any] = {}
        if term_min is not None:
            rng["$gte"] = int(term_min)
        if term_max is not None:
            rng["$lte"] = int(term_max)
        if term_min == 0:
            q["$or"] = [{"term_months": rng}, {"term_months": None}]
        else:
            q["term_months"] = rng
    if new_customers_only is True:
        q["new_customers_only"] = True
    return q


def _amount_matches(o: dict, amount: Optional[float]) -> bool:
    if amount is None:
        return True
    mn = o.get("min_amount")
    mx = o.get("max_amount")
    if mn is not None and amount < float(mn):
        return False
    if mx is not None and amount > float(mx):
        return False
    return True


def _sort_key(item: Dict[str, Any], sort: str):
    if sort == "expected_yield":
        v = (item.get("expected_yield") or {}).get("gross_return_eur")
        return -(v or 0.0)
    if sort == "expected_yield_asc":
        v = (item.get("expected_yield") or {}).get("gross_return_eur")
        return (v if v is not None else 1e18)
    if sort == "rate":
        return -(item.get("interest_rate") or 0.0)
    if sort == "rate_asc":
        return (item.get("interest_rate") or 0.0)
    if sort == "term":
        return (item.get("term_months") or 0)
    if sort == "term_desc":
        return -(item.get("term_months") or 0)
    if sort == "min_amount":
        return (item.get("min_amount") or 0)
    if sort == "min_amount_desc":
        return -(item.get("min_amount") or 0)
    if sort == "bank_name":
        return ((item.get("banks") or {}).get("name") or "").lower()
    return -(item.get("interest_rate") or 0.0)


# ---------------------------------------------------------------------------
# /api/public/savings-offers   —   Filter + Sort + Pagination + Yield
# ---------------------------------------------------------------------------
@router.get("/savings-offers")
async def savings_offers(
    active_only: bool = Query(default=True),
    limit: int = Query(default=500, ge=1, le=2000),
    page: int = Query(default=1, ge=1),
    product_type: Optional[str] = Query(default=None),
    countries: Optional[str] = Query(default=None, description="Komma-getrennte ISO-2-Codes"),
    dgs_countries: Optional[str] = Query(default=None, description="Komma-getrennte ISO-2-Codes"),
    rate_min: Optional[float] = Query(default=None),
    rate_max: Optional[float] = Query(default=None),
    term_min: Optional[int] = Query(default=None),
    term_max: Optional[int] = Query(default=None),
    amount: Optional[float] = Query(default=None, description="Anlagebetrag EUR"),
    new_customers_only: Optional[bool] = Query(default=None),
    sort: str = Query(default="expected_yield", description="expected_yield|rate|term|term_desc|min_amount|bank_name"),
    search: Optional[str] = Query(default=None, description="Freitext Bank/Land"),
) -> Dict[str, Any]:
    if not await _coll_exists("savings_offers"):
        return {"items": [], "count": 0, "total": 0, "page": page, "limit": limit, "has_demo": False, "demo_count": 0}

    q = _build_filters(
        active_only=active_only,
        product_type=product_type,
        countries=_split_csv(countries),
        dgs_countries=_split_csv(dgs_countries),
        rate_min=rate_min, rate_max=rate_max,
        term_min=term_min, term_max=term_max,
        new_customers_only=new_customers_only,
    )
    banks_by_slug, banks_by_id = await _load_bank_maps()

    # Amount-Filter + Bank-Join + Search müssen in Python passieren (min/max sind Zahlen
    # aber Nulls möglich, Bank-Join aus 2ter Collection).
    docs = await _db.savings_offers.find(q).to_list(2000)
    items: List[Dict[str, Any]] = []
    search_lc = (search or "").strip().lower()
    for o in docs:
        if not _amount_matches(o, amount):
            continue
        bank = None
        if o.get("bank_slug"):
            bank = banks_by_slug.get(o["bank_slug"])
        if not bank and o.get("bank_id") is not None:
            bank = banks_by_id.get(str(o["bank_id"]))
        if search_lc:
            hay = " ".join([
                (bank.get("name") if bank else "") or "",
                (bank.get("country") if bank else "") or "",
                o.get("product_name") or "",
                o.get("bank_slug") or "",
            ]).lower()
            if search_lc not in hay:
                continue
        items.append(_serialize_offer(o, bank, amount))

    total = len(items)
    items.sort(key=lambda x: _sort_key(x, sort))

    # Pagination in Python (Datenmenge < 5k realistisch).
    start = (page - 1) * limit
    page_items = items[start:start + limit]
    demo_count = sum(1 for it in items if it.get("is_demo"))
    return {
        "items": page_items,
        "count": len(page_items),
        "total": total,
        "page": page,
        "limit": limit,
        "has_more": start + limit < total,
        "has_demo": demo_count > 0,
        "demo_count": demo_count,
        "sort": sort,
    }


# ---------------------------------------------------------------------------
# /api/public/savings-offers/facets  —  dynamische Filter-Optionen mit Counts.
# ---------------------------------------------------------------------------
@router.get("/savings-offers/facets")
async def savings_offer_facets(
    active_only: bool = Query(default=True),
    product_type: Optional[str] = Query(default=None),
) -> Dict[str, Any]:
    if not await _coll_exists("savings_offers"):
        return {
            "countries": [], "dgs_countries": [], "product_types": [],
            "terms_available": [], "rate_range": None, "amount_range": None,
            "interest_frequencies": [], "total": 0,
        }
    q: Dict[str, Any] = {"is_active": {"$ne": False}} if active_only else {}
    if product_type:
        q["product_type"] = product_type.lower()
    banks_by_slug, _ = await _load_bank_maps()

    # Country-Namen für Anzeige.
    country_names: Dict[str, Dict[str, Optional[str]]] = {}
    if await _coll_exists("countries"):
        async for c in _db.countries.find({}):
            country_names[c["code"]] = {"name": c.get("name"), "name_de": c.get("name_de")}

    counters = {
        "countries": {},
        "dgs_countries": {},
        "product_types": {},
        "terms": {},
        "frequencies": {},
    }
    rate_min = None; rate_max = None
    amount_min = None; amount_max = None
    total = 0
    async for o in _db.savings_offers.find(q):
        total += 1
        pt = (o.get("product_type") or "").lower()
        if pt:
            counters["product_types"][pt] = counters["product_types"].get(pt, 0) + 1
        cc = o.get("country") if isinstance(o.get("country"), str) and len(o.get("country") or "") == 2 else None
        if not cc and o.get("bank_slug"):
            b = banks_by_slug.get(o["bank_slug"])
            if b:
                cc = b.get("country_code")
        if cc:
            counters["countries"][cc] = counters["countries"].get(cc, 0) + 1
        dc = o.get("deposit_guarantee_country")
        if dc:
            counters["dgs_countries"][dc] = counters["dgs_countries"].get(dc, 0) + 1
        term = o.get("term_months")
        term_key = term if term is not None else "flex"
        counters["terms"][term_key] = counters["terms"].get(term_key, 0) + 1
        freq = o.get("interest_frequency")
        if freq:
            counters["frequencies"][freq] = counters["frequencies"].get(freq, 0) + 1
        r = o.get("interest_rate")
        if isinstance(r, (int, float)):
            rate_min = r if rate_min is None else min(rate_min, r)
            rate_max = r if rate_max is None else max(rate_max, r)
        mn = o.get("min_amount")
        if isinstance(mn, (int, float)):
            amount_min = mn if amount_min is None else min(amount_min, mn)
        mx = o.get("max_amount")
        if isinstance(mx, (int, float)):
            amount_max = mx if amount_max is None else max(amount_max, mx)

    countries_list = sorted(
        [
            {
                "code": code,
                "name": (country_names.get(code) or {}).get("name") or code,
                "name_de": (country_names.get(code) or {}).get("name_de") or code,
                "count": count,
            }
            for code, count in counters["countries"].items()
        ],
        key=lambda x: -x["count"],
    )
    dgs_list = sorted(
        [
            {
                "code": code,
                "name_de": (country_names.get(code) or {}).get("name_de") or code,
                "count": count,
            }
            for code, count in counters["dgs_countries"].items()
        ],
        key=lambda x: -x["count"],
    )
    product_types_list = sorted(
        [{"code": k, "count": v} for k, v in counters["product_types"].items()],
        key=lambda x: -x["count"],
    )
    terms_list = sorted(
        [{"term_months": (None if k == "flex" else k), "count": v} for k, v in counters["terms"].items()],
        key=lambda x: ((x["term_months"] is None), x["term_months"] or 0),
    )
    frequencies_list = sorted(
        [{"code": k, "count": v} for k, v in counters["frequencies"].items()],
        key=lambda x: -x["count"],
    )
    return {
        "countries": countries_list,
        "dgs_countries": dgs_list,
        "product_types": product_types_list,
        "terms_available": terms_list,
        "interest_frequencies": frequencies_list,
        "rate_range": {"min": rate_min, "max": rate_max} if rate_min is not None else None,
        "amount_range": {"min": amount_min, "max": amount_max} if amount_min is not None else None,
        "total": total,
    }


# ---------------------------------------------------------------------------
# /api/public/partner-banks
# ---------------------------------------------------------------------------
@router.get("/partner-banks")
async def partner_banks() -> Dict[str, Any]:
    if not await _coll_exists("banks"):
        return {"items": [], "count": 0}
    items = []
    async for b in _db.banks.find({"is_active": {"$ne": False}}).sort([("country_code", 1), ("name", 1)]):
        items.append(_serialize_bank(b))
    return {"items": items, "count": len(items)}


# ---------------------------------------------------------------------------
# /api/public/countries
# ---------------------------------------------------------------------------
@router.get("/countries")
async def list_countries() -> Dict[str, Any]:
    if not await _coll_exists("countries"):
        return {"items": [], "count": 0}
    items = []
    async for c in _db.countries.find({"is_active": {"$ne": False}}).sort("name_de", 1):
        items.append({
            "code": c.get("code"),
            "name": c.get("name"),
            "name_de": c.get("name_de"),
            "region": c.get("region"),
        })
    return {"items": items, "count": len(items)}


# ---------------------------------------------------------------------------
# /api/public/deposit-guarantee-schemes
# ---------------------------------------------------------------------------
@router.get("/deposit-guarantee-schemes")
async def list_dgs() -> Dict[str, Any]:
    if not await _coll_exists("deposit_guarantee_schemes"):
        return {"items": [], "count": 0}
    items = []
    async for d in _db.deposit_guarantee_schemes.find({}).sort("country_code", 1):
        items.append({
            "code": d.get("code"),
            "country_code": d.get("country_code"),
            "name": d.get("name"),
            "coverage_limit_eur": d.get("coverage_limit_eur"),
            "authority": d.get("authority"),
            "source_url": d.get("source_url"),
        })
    return {"items": items, "count": len(items)}


# ---------------------------------------------------------------------------
# /api/public/savings-offers/{id}/rate-history — Zinsverlauf (Phase 3)
# ---------------------------------------------------------------------------
@router.get("/savings-offers/{offer_id}/rate-history")
async def offer_rate_history(offer_id: str) -> Dict[str, Any]:
    if not await _coll_exists("interest_rate_history"):
        return {"items": [], "count": 0, "offer_id": offer_id}
    items: List[Dict[str, Any]] = []
    async for h in _db.interest_rate_history.find({"offer_id": offer_id}).sort("valid_from", 1):
        items.append({
            "id": str(h.get("_id")),
            "rate": h.get("rate"),
            "rate_type": h.get("rate_type", "standard"),
            "valid_from": _iso(h.get("valid_from")),
            "valid_until": _iso(h.get("valid_until")),
            "source_id": h.get("source_id"),
            "source_url": h.get("source_url") if h.get("is_demo") is not True else None,
            "verified_at": _iso(h.get("verified_at")),
            "verification_method": h.get("verification_method"),
            "is_demo": bool(h.get("is_demo", False)),
        })
    return {"offer_id": offer_id, "items": items, "count": len(items)}


# ---------------------------------------------------------------------------
# /api/public/data-sources — nur öffentlich sichtbare Quellen
# ---------------------------------------------------------------------------
@router.get("/data-sources")
async def list_data_sources() -> Dict[str, Any]:
    if not await _coll_exists("data_sources"):
        return {"items": [], "count": 0}
    items = []
    async for s in _db.data_sources.find({"status": {"$ne": "disabled"}}).sort("slug", 1):
        items.append({
            "slug": s.get("slug"),
            "name": s.get("name"),
            "type": s.get("type"),
            "provider": s.get("provider"),
            "country_code": s.get("country_code"),
            "status": s.get("status"),
            "source_url": s.get("source_url") if s.get("is_public_source_url") else None,
            "last_success_at": _iso(s.get("last_success_at")),
        })
    return {"items": items, "count": len(items)}


# ---------------------------------------------------------------------------
# /api/public/banks/{slug} — Bank-Detail (Phase 4)
# ---------------------------------------------------------------------------
@router.get("/banks/{slug}")
async def public_bank_detail(slug: str) -> Dict[str, Any]:
    if not await _coll_exists("banks"):
        raise HTTPException(status_code=404, detail="not found") if False else None  # type: ignore
    bank = await _db.banks.find_one({"slug": slug})
    if not bank or bank.get("is_active") is False:
        return {"bank": None, "offers": [], "count": 0}
    offers: List[Dict[str, Any]] = []
    if await _coll_exists("savings_offers"):
        banks_by_slug = {slug: bank}
        async for o in _db.savings_offers.find({
            "bank_slug": slug,
            "is_active": {"$ne": False},
        }).sort("interest_rate", -1):
            offers.append(_serialize_offer(o, bank, None))
    return {
        "bank": _serialize_bank(bank),
        "offers": offers,
        "count": len(offers),
    }


# ---------------------------------------------------------------------------
# /api/public/banks — Bank-Verzeichnis (Phase 4)
# ---------------------------------------------------------------------------
@router.get("/banks")
async def public_bank_directory() -> Dict[str, Any]:
    if not await _coll_exists("banks"):
        return {"items": [], "count": 0}
    # Anzahl aktiver Angebote pro Bank
    offer_counts: Dict[str, int] = {}
    if await _coll_exists("savings_offers"):
        pipeline = [
            {"$match": {"is_active": {"$ne": False}}},
            {"$group": {"_id": "$bank_slug", "count": {"$sum": 1}}},
        ]
        async for row in _db.savings_offers.aggregate(pipeline):
            offer_counts[row["_id"]] = row["count"]
    items = []
    async for b in _db.banks.find({"is_active": {"$ne": False}}).sort([("country_code", 1), ("name", 1)]):
        payload = _serialize_bank(b)
        payload["offer_count"] = offer_counts.get(b.get("slug"), 0)
        items.append(payload)
    return {"items": items, "count": len(items)}


# ---------------------------------------------------------------------------
# /api/public/home-stats  —  unverändert.
# ---------------------------------------------------------------------------
@router.get("/home-stats")
async def home_stats() -> Dict[str, Any]:
    stats: Dict[str, Any] = {}
    stats["users_count"] = await _db.users.count_documents({}) if await _coll_exists("users") else None
    stats["applications_count"] = await _db.applications.count_documents({}) if await _coll_exists("applications") else None
    stats["partner_banks_count"] = await _db.banks.count_documents({"is_active": {"$ne": False}}) if await _coll_exists("banks") else None
    stats["savings_offers_count"] = await _db.savings_offers.count_documents({"is_active": {"$ne": False}}) if await _coll_exists("savings_offers") else None
    return {"stats": stats, "generated_at": datetime.now(timezone.utc).isoformat()}
