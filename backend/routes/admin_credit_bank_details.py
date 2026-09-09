"""Session 82.103c — Admin Kredit-Bankdetails Cutover.

Ersetzt die Supabase-Aufrufe der ``AdminCreditBankDetails``-Seite:

* ``credit_offers`` (mit Bank-Join) — GET Liste für Dropdown.
* ``credit_offer_product_information`` — Detail-Rows pro Angebot.
* ``credit_offer_acceptance_guidelines`` — Regel-Rows pro Angebot.

Alle Endpoints sind Admin-only. Content-Daten (Produktinformationen und
Annahmerichtlinien) sind **nicht** Audit-relevant (kein Ledger, keine
Kundendaten). Deshalb ist der bestehende Legacy-Replace-Flow (Delete-all +
Insert-batch) auch hier zulässig — wir bilden ihn 1:1 nach.

Faithful Empty-States: fehlende Collections liefern ``items=[]``. Keine
synthetischen Rows. Keine Financial-Writes.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, Body, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

from server import require_admin  # type: ignore  # noqa: E402

_client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
_db = _client[os.environ["DB_NAME"]]

router = APIRouter(prefix="/api/admin", tags=["admin-credit-bank-details"])


# ─── Helpers ────────────────────────────────────────────────────────────
def _iso(v: Any) -> Optional[str]:
    return v.isoformat() if isinstance(v, datetime) else (v if isinstance(v, str) else None)


def _oid_or_422(x: str) -> ObjectId:
    if not ObjectId.is_valid(x):
        raise HTTPException(status_code=422, detail="Ungültige ID")
    return ObjectId(x)


async def _collection_exists(name: str) -> bool:
    return name in await _db.list_collection_names(filter={"name": name})


_ALLOWED_SECTIONS = {"Sicherheit", "Flexibilitaet", "Kundenfreundlichkeit"}


# ─── OFFERS + BANK JOIN ────────────────────────────────────────────────
@router.get("/credit-offers-with-banks")
async def credit_offers_with_banks(_admin: dict = Depends(require_admin)) -> Dict[str, Any]:
    """Kredit-Angebote inkl. Bank-Snapshot (nur die Felder, die das Dropdown
    braucht). Bewusst separat vom generischen ``/credit-offers``, damit der
    bestehende AdminCreditOffers-Contract stabil bleibt."""
    if not await _collection_exists("credit_offers"):
        return {"items": [], "count": 0}

    # Bank-Cache (kleine Menge — dumpen)
    bank_map: Dict[str, Dict[str, Any]] = {}
    if await _collection_exists("banks"):
        async for b in _db.banks.find({}, {"name": 1, "country": 1, "slug": 1}):
            bank_map[str(b["_id"])] = {
                "name": b.get("name"),
                "country": b.get("country"),
                "slug": b.get("slug"),
            }

    cursor = _db.credit_offers.find({}).sort(
        [("sort_priority", 1), ("effective_rate_from", 1), ("created_at", -1)]
    )
    items: List[Dict[str, Any]] = []
    async for d in cursor:
        bank_id = d.get("bank_id")
        bank_ref = None
        if isinstance(bank_id, ObjectId):
            bank_ref = bank_map.get(str(bank_id))
        elif isinstance(bank_id, str) and bank_id:
            bank_ref = bank_map.get(bank_id)
        items.append({
            "id": str(d["_id"]),
            "purpose": d.get("purpose"),
            "is_active": bool(d.get("is_active", True)),
            "sort_priority": d.get("sort_priority"),
            "effective_rate_from": d.get("effective_rate_from"),
            "banks": bank_ref,   # {name, country, slug} oder None → UI zeigt "Unbekannt"
        })
    return {"items": items, "count": len(items)}


# ─── DETAILS (Product-Info + Acceptance-Guidelines) ────────────────────
@router.get("/credit-offers/{offer_id}/details")
async def get_credit_offer_details(
    offer_id: str,
    _admin: dict = Depends(require_admin),
) -> Dict[str, Any]:
    """Rückgabe: ``{product_information: [...], acceptance_guidelines: [...]}``.
    Wenn Collections fehlen → jeweils leere Arrays (faithful)."""
    oid = _oid_or_422(offer_id)
    product_info: List[Dict[str, Any]] = []
    guidelines: List[Dict[str, Any]] = []

    if await _collection_exists("credit_offer_product_information"):
        cursor = _db.credit_offer_product_information.find(
            {"credit_offer_id": oid}
        ).sort([("section", 1), ("sort_order", 1)])
        async for d in cursor:
            product_info.append({
                "id": str(d["_id"]),
                "credit_offer_id": str(d.get("credit_offer_id")),
                "section": d.get("section"),
                "item_label": d.get("item_label") or "",
                "item_description": d.get("item_description"),
                "is_positive": bool(d.get("is_positive", True)),
                "sort_order": d.get("sort_order", 0),
            })

    if await _collection_exists("credit_offer_acceptance_guidelines"):
        cursor = _db.credit_offer_acceptance_guidelines.find(
            {"credit_offer_id": oid}
        ).sort([("sort_order", 1)])
        async for d in cursor:
            guidelines.append({
                "id": str(d["_id"]),
                "credit_offer_id": str(d.get("credit_offer_id")),
                "guideline_text": d.get("guideline_text") or "",
                "sort_order": d.get("sort_order", 0),
            })

    return {
        "product_information": product_info,
        "acceptance_guidelines": guidelines,
    }


# ─── DETAILS: BULK REPLACE ─────────────────────────────────────────────
class ProductInfoRow(BaseModel):
    section: str
    item_label: str
    item_description: Optional[str] = None
    is_positive: bool = True
    sort_order: int = 0
    model_config = {"extra": "forbid"}


class GuidelineRow(BaseModel):
    guideline_text: str
    sort_order: int = 0
    model_config = {"extra": "forbid"}


class CreditOfferDetailsPayload(BaseModel):
    product_information: List[ProductInfoRow] = Field(default_factory=list)
    acceptance_guidelines: List[GuidelineRow] = Field(default_factory=list)
    model_config = {"extra": "forbid"}


@router.put("/credit-offers/{offer_id}/details")
async def replace_credit_offer_details(
    offer_id: str,
    body: CreditOfferDetailsPayload = Body(...),
    _admin: dict = Depends(require_admin),
) -> Dict[str, Any]:
    """Idempotenter Bulk-Replace für Produktinformationen und Annahme-
    richtlinien eines Kredit-Angebots. Bildet den Legacy-Supabase-Flow
    (delete + batch-insert) atomar-ähnlich in Mongo nach (delete_many +
    insert_many). Kein Financial-Ledger involviert."""
    oid = _oid_or_422(offer_id)

    # Angebot muss existieren (Guard gegen Ghost-Writes)
    if await _collection_exists("credit_offers"):
        exists = await _db.credit_offers.count_documents({"_id": oid}, limit=1)
        if not exists:
            raise HTTPException(status_code=404, detail="Kredit-Angebot nicht gefunden")

    # Validierung Section-Whitelist (verhindert freie Strings im Content)
    for row in body.product_information:
        if row.section not in _ALLOWED_SECTIONS:
            raise HTTPException(
                status_code=422,
                detail=f"Ungültige Sektion: {row.section!r}",
            )
        if not row.item_label.strip():
            raise HTTPException(status_code=422, detail="item_label darf nicht leer sein")
    for row in body.acceptance_guidelines:
        if not row.guideline_text.strip():
            raise HTTPException(status_code=422, detail="guideline_text darf nicht leer sein")

    now = datetime.now(timezone.utc)

    # Product Information: delete + batch insert
    await _db.credit_offer_product_information.delete_many({"credit_offer_id": oid})
    if body.product_information:
        docs = [{
            "credit_offer_id": oid,
            "section": r.section,
            "item_label": r.item_label.strip(),
            "item_description": (r.item_description or "").strip() or None,
            "is_positive": r.is_positive,
            "sort_order": r.sort_order,
            "created_at": now,
            "updated_at": now,
        } for r in body.product_information]
        await _db.credit_offer_product_information.insert_many(docs)

    # Acceptance Guidelines: delete + batch insert
    await _db.credit_offer_acceptance_guidelines.delete_many({"credit_offer_id": oid})
    if body.acceptance_guidelines:
        docs_g = [{
            "credit_offer_id": oid,
            "guideline_text": r.guideline_text.strip(),
            "sort_order": r.sort_order,
            "created_at": now,
            "updated_at": now,
        } for r in body.acceptance_guidelines]
        await _db.credit_offer_acceptance_guidelines.insert_many(docs_g)

    return {
        "status": "replaced",
        "offer_id": offer_id,
        "product_information_count": len(body.product_information),
        "acceptance_guidelines_count": len(body.acceptance_guidelines),
    }
