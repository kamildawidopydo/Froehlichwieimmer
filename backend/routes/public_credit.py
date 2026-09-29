"""Public Credit Comparison Endpoint (Session 94 · Kreditvergleich E2E).

Analog zum Sparvergleich (`routes/public_reads.py::list_savings_offers`):
* read-only
* strikte serverseitige Filterung (amount / term / purpose)
* Sortierung
* Bank-Join
* Provenance-Serialisierung (source_id, source_url, verified_at, data_status)

Absichtlich KEINE Fake-Daten, KEIN Demo-Seed, KEINE Import-Pipeline —
wenn die `credit_offers`-Collection leer ist oder fehlt, wird die Response
faithful `items=[]` liefern.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, Query
from motor.motor_asyncio import AsyncIOMotorClient


_client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
_db = _client[os.environ["DB_NAME"]]

router = APIRouter(prefix="/api/public", tags=["public-credit"])


ALLOWED_SORTS = {
    "effective_rate_asc": ("effective_rate_from", 1),
    "effective_rate_desc": ("effective_rate_from", -1),
    "monthly_rate_asc": ("monthly_rate_from", 1),
    "created_desc": ("created_at", -1),
}


async def _collection_exists(name: str) -> bool:
    return name in await _db.list_collection_names(filter={"name": name})


def _to_str_id(v: Any) -> Optional[str]:
    if v is None:
        return None
    if isinstance(v, ObjectId):
        return str(v)
    return str(v) if v else None


def _credit_data_status(o: Dict[str, Any]) -> str:
    """Analog zu savings data_status. Ein Kreditangebot gilt als `verified`,
    wenn is_active, alle 4 Provenance-Felder gesetzt sind (source_id,
    source_url, verified_at, verification_method) und `is_demo` nicht True.
    Sonst `unverified` (bzw. `demo` wenn markiert)."""
    if o.get("is_demo"):
        return "demo"
    if not o.get("is_active", True):
        return "inactive"
    required = ("source_id", "source_url", "verified_at", "verification_method")
    if all(o.get(k) for k in required):
        return "verified"
    return "unverified"


def _serialize_offer(o: Dict[str, Any], bank_ref: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    verified_at = o.get("verified_at")
    if isinstance(verified_at, datetime):
        verified_at = verified_at.isoformat()
    source_retrieved_at = o.get("source_retrieved_at")
    if isinstance(source_retrieved_at, datetime):
        source_retrieved_at = source_retrieved_at.isoformat()

    # Purposes: eine Liste bevorzugt; Legacy-Feld `purpose` (String) wird als
    # Ein-Element-Liste weitergegeben, damit Frontend homogen filtern kann.
    purposes = o.get("purposes")
    if not purposes and o.get("purpose"):
        purposes = [o["purpose"]]
    if isinstance(purposes, str):
        purposes = [purposes]
    if not isinstance(purposes, list):
        purposes = []

    return {
        "id": _to_str_id(o.get("_id")),
        "bank_id": _to_str_id(o.get("bank_id")),
        "banks": bank_ref,  # {name, country, slug, logo_url} oder None
        "product_name": o.get("product_name"),
        "purposes": purposes,
        "min_amount_eur": o.get("min_amount_eur"),
        "max_amount_eur": o.get("max_amount_eur"),
        "min_term_months": o.get("min_term_months"),
        "max_term_months": o.get("max_term_months"),
        "effective_rate_from": o.get("effective_rate_from"),
        "effective_rate_to": o.get("effective_rate_to"),
        "nominal_rate_from": o.get("nominal_rate_from"),
        "nominal_rate_to": o.get("nominal_rate_to"),
        "monthly_rate_from": o.get("monthly_rate_from"),
        "features": o.get("features") or [],
        "affiliate_url": o.get("affiliate_url"),
        "source_id": o.get("source_id"),
        "source_url": o.get("source_url"),
        "source_retrieved_at": source_retrieved_at,
        "verified_at": verified_at,
        "verification_method": o.get("verification_method"),
        "representative_example": o.get("representative_example"),
        "is_active": bool(o.get("is_active", True)),
        "is_demo": bool(o.get("is_demo", False)),
        "data_status": _credit_data_status(o),
        # Detail-Sub-Collections werden lazy per Detail-Route geladen, hier
        # nur leer zur Kompatibilität mit dem Frontend-Reducer.
        "credit_offer_product_information": [],
        "credit_offer_acceptance_guidelines": [],
    }


@router.get("/credit-offers")
async def list_public_credit_offers(
    amount: Optional[float] = Query(default=None, ge=0),
    term_months: Optional[int] = Query(default=None, ge=1, le=600),
    purpose: Optional[str] = Query(default=None),
    sort: str = Query(default="effective_rate_asc"),
    limit: int = Query(default=100, ge=1, le=500),
    include_demo: bool = Query(default=False),
) -> Dict[str, Any]:
    """Öffentlicher Kreditvergleich mit serverseitiger Filterung + Sortierung.

    Regeln:
      * nur `is_active != False`
      * `is_demo=true` wird per Default ausgeschlossen (analog Sparvergleich)
      * `amount` innerhalb [min_amount_eur, max_amount_eur] (offene Grenzen
        werden ignoriert)
      * `term_months` innerhalb [min_term_months, max_term_months]
      * `purpose` matcht, wenn er in `purposes[]` enthalten ist ODER wenn das
        Angebot `Freie Verwendung` als Zweckoption listet (Fallback-Regel
        analog Frontend-Erwartung).
      * Sortierung serverseitig; `effective_rate_asc` = Standard.
    """
    if not await _collection_exists("credit_offers"):
        return {"items": [], "count": 0, "sort": sort,
                "reason": "collection_missing",
                "message": "Es liegen aktuell keine importierten Kreditangebote vor."}

    q: Dict[str, Any] = {}
    q["is_active"] = {"$ne": False}
    if not include_demo:
        q["$or"] = [{"is_demo": {"$exists": False}}, {"is_demo": False}]

    if amount is not None:
        q["$and"] = [
            {"$or": [{"min_amount_eur": None}, {"min_amount_eur": {"$lte": amount}}]},
            {"$or": [{"max_amount_eur": None}, {"max_amount_eur": {"$gte": amount}}]},
        ]
    if term_months is not None:
        q.setdefault("$and", []).extend([
            {"$or": [{"min_term_months": None}, {"min_term_months": {"$lte": term_months}}]},
            {"$or": [{"max_term_months": None}, {"max_term_months": {"$gte": term_months}}]},
        ])
    if purpose:
        # Purpose matcht wenn im Purposes-Array enthalten ODER wenn das
        # Angebot explizit "Freie Verwendung" listet (Fallback wie im
        # bisherigen Frontend-Filter).
        q.setdefault("$and", []).append({
            "$or": [
                {"purposes": purpose},
                {"purposes": "Freie Verwendung"},
                {"purpose": purpose},
                {"purpose": "Freie Verwendung"},
            ]
        })

    field, direction = ALLOWED_SORTS.get(sort, ALLOWED_SORTS["effective_rate_asc"])

    # Bank-Cache (klein, dumpen)
    bank_map: Dict[str, Dict[str, Any]] = {}
    if await _collection_exists("banks"):
        async for b in _db.banks.find({}, {"name": 1, "country": 1, "slug": 1, "logo_url": 1}):
            bank_map[str(b["_id"])] = {
                "name": b.get("name"),
                "country": b.get("country"),
                "slug": b.get("slug"),
                "logo_url": b.get("logo_url"),
            }

    docs: List[Dict[str, Any]] = []
    cursor = _db.credit_offers.find(q).sort([(field, direction), ("created_at", -1)]).limit(limit)
    async for d in cursor:
        docs.append(d)

    items = []
    for o in docs:
        bank_id = o.get("bank_id")
        bank_ref = None
        if bank_id is not None:
            bank_ref = bank_map.get(str(bank_id))
        items.append(_serialize_offer(o, bank_ref))

    return {
        "items": items,
        "count": len(items),
        "sort": sort,
        "filters": {"amount": amount, "term_months": term_months, "purpose": purpose,
                    "include_demo": include_demo},
    }
