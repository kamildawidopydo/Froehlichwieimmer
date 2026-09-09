"""Session 82.100 — Consolidated Admin Read-Endpoints für Legacy-Supabase-Collections.

Ersetzt direkte `.from().select/.delete/.update`-Aufrufe in
`AdminCreditLeads`, `AdminCreditOffers`, `AdminProductInquiryLeads`,
`AdminSocialPreviewMessages`, `AdminContractSubmissions`.

Alle Ziel-Collections existieren in dieser Preview-DB (noch) nicht — die
Endpoints liefern deshalb faithful `items=[]`. Das UI zeigt Empty-States;
kein Fake-Fallback, kein Fake-Count.
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

router = APIRouter(prefix="/api/admin", tags=["admin-legacy-reads"])


def _iso(v: Any) -> Optional[str]:
    return v.isoformat() if isinstance(v, datetime) else (v if isinstance(v, str) else None)


async def _collection_exists(name: str) -> bool:
    return name in await _db.list_collection_names(filter={"name": name})


async def _empty_safe_list(collection: str, sort: list, limit: int, query: Dict[str, Any] | None = None) -> List[dict]:
    if not await _collection_exists(collection):
        return []
    q = query or {}
    cursor = _db[collection].find(q).sort(sort).limit(limit)
    return await cursor.to_list(limit)


def _oid_or_422(x: str) -> ObjectId:
    if not ObjectId.is_valid(x):
        raise HTTPException(status_code=422, detail="Ungültige ID")
    return ObjectId(x)


# ─── CREDIT LEADS ───────────────────────────────────────────────────────
@router.get("/credit-leads")
async def list_credit_leads(
    status: Optional[str] = Query(default=None),
    _admin: dict = Depends(require_admin),
) -> Dict[str, Any]:
    q: Dict[str, Any] = {}
    if status:
        q["status"] = status
    docs = await _empty_safe_list("credit_leads", [("created_at", -1)], 500, q)
    items = [{
        "id": str(d.get("_id")),
        "full_name": d.get("full_name"),
        "email": d.get("email"),
        "phone": d.get("phone"),
        "purpose": d.get("purpose"),
        "requested_amount": d.get("requested_amount"),
        "requested_term_months": d.get("requested_term_months"),
        "status": d.get("status", "new"),
        "handled_at": _iso(d.get("handled_at")),
        "created_at": _iso(d.get("created_at")),
    } for d in docs]
    return {"items": items, "count": len(items)}


@router.patch("/credit-leads/{lead_id}")
async def update_credit_lead_status(
    lead_id: str,
    body: Dict[str, Any] = Body(...),
    _admin: dict = Depends(require_admin),
) -> Dict[str, Any]:
    oid = _oid_or_422(lead_id)
    st = (body.get("status") or "").strip()
    if st not in {"new", "contacted", "closed"}:
        raise HTTPException(status_code=422, detail="Ungültiger Status")
    now = datetime.now(timezone.utc)
    res = await _db.credit_leads.update_one(
        {"_id": oid},
        {"$set": {"status": st, "handled_at": None if st == "new" else now, "updated_at": now}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead nicht gefunden")
    return {"status": st}


@router.delete("/credit-leads/{lead_id}")
async def delete_credit_lead(lead_id: str, _admin: dict = Depends(require_admin)) -> Dict[str, Any]:
    oid = _oid_or_422(lead_id)
    await _db.credit_leads.delete_one({"_id": oid})
    return {"status": "deleted", "id": lead_id}


# ─── CREDIT OFFERS (CRUD) ───────────────────────────────────────────────
class CreditOfferPayload(BaseModel):
    provider: Optional[str] = None
    product_name: Optional[str] = None
    interest_rate: Optional[float] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    min_term_months: Optional[int] = None
    max_term_months: Optional[int] = None
    is_active: Optional[bool] = True
    details: Optional[Dict[str, Any]] = None
    model_config = {"extra": "forbid"}


@router.get("/credit-offers")
async def list_credit_offers(_admin: dict = Depends(require_admin)) -> Dict[str, Any]:
    docs = await _empty_safe_list("credit_offers", [("created_at", -1)], 500)
    items = [{"id": str(d.get("_id")), **{k: v for k, v in d.items() if k != "_id"},
              "created_at": _iso(d.get("created_at")), "updated_at": _iso(d.get("updated_at"))} for d in docs]
    return {"items": items, "count": len(items)}


@router.post("/credit-offers", status_code=201)
async def create_credit_offer(body: CreditOfferPayload = Body(...), _admin: dict = Depends(require_admin)):
    now = datetime.now(timezone.utc)
    doc = {**body.model_dump(exclude_none=True), "created_at": now, "updated_at": now}
    res = await _db.credit_offers.insert_one(doc)
    return {"id": str(res.inserted_id), **body.model_dump(exclude_none=True)}


@router.patch("/credit-offers/{offer_id}")
async def update_credit_offer(offer_id: str, body: CreditOfferPayload = Body(...), _admin: dict = Depends(require_admin)):
    oid = _oid_or_422(offer_id)
    updates = {**body.model_dump(exclude_none=True), "updated_at": datetime.now(timezone.utc)}
    res = await _db.credit_offers.update_one({"_id": oid}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Angebot nicht gefunden")
    return {"status": "updated", "id": offer_id}


@router.delete("/credit-offers/{offer_id}")
async def delete_credit_offer(offer_id: str, _admin: dict = Depends(require_admin)):
    oid = _oid_or_422(offer_id)
    await _db.credit_offers.delete_one({"_id": oid})
    return {"status": "deleted", "id": offer_id}


# ─── PRODUCT INQUIRY LEADS ──────────────────────────────────────────────
@router.get("/product-inquiry-leads")
async def list_product_inquiry_leads(
    status: Optional[str] = Query(default=None),
    _admin: dict = Depends(require_admin),
) -> Dict[str, Any]:
    q: Dict[str, Any] = {}
    if status:
        q["status"] = status
    docs = await _empty_safe_list("product_inquiry_leads", [("created_at", -1)], 500, q)
    items = [{
        "id": str(d.get("_id")),
        "full_name": d.get("full_name") or d.get("name"),
        "email": d.get("email"),
        "phone": d.get("phone"),
        "product": d.get("product"),
        "message": d.get("message"),
        "status": d.get("status", "new"),
        "created_at": _iso(d.get("created_at")),
    } for d in docs]
    return {"items": items, "count": len(items)}


@router.patch("/product-inquiry-leads/{lead_id}")
async def update_product_inquiry(lead_id: str, body: Dict[str, Any] = Body(...), _admin: dict = Depends(require_admin)):
    oid = _oid_or_422(lead_id)
    st = (body.get("status") or "").strip()
    if st not in {"new", "contacted", "closed"}:
        raise HTTPException(status_code=422, detail="Ungültiger Status")
    await _db.product_inquiry_leads.update_one({"_id": oid}, {"$set": {"status": st, "updated_at": datetime.now(timezone.utc)}})
    return {"status": st}


@router.delete("/product-inquiry-leads/{lead_id}")
async def delete_product_inquiry(lead_id: str, _admin: dict = Depends(require_admin)):
    oid = _oid_or_422(lead_id)
    await _db.product_inquiry_leads.delete_one({"_id": oid})
    return {"status": "deleted", "id": lead_id}


# ─── SOCIAL PREVIEW MESSAGES ────────────────────────────────────────────
@router.get("/social-preview-messages")
async def list_social_preview(
    status: Optional[str] = Query(default=None),
    _admin: dict = Depends(require_admin),
) -> Dict[str, Any]:
    q: Dict[str, Any] = {}
    if status:
        q["status"] = status
    docs = await _empty_safe_list("social_preview_messages", [("created_at", -1)], 500, q)
    items = [{
        "id": str(d.get("_id")),
        "name": d.get("name"),
        "email": d.get("email"),
        "phone": d.get("phone"),
        "message_body": d.get("message_body") or d.get("message"),
        "status": d.get("status", "new"),
        "created_at": _iso(d.get("created_at")),
    } for d in docs]
    return {"items": items, "count": len(items)}


@router.patch("/social-preview-messages/{msg_id}")
async def update_social_preview(msg_id: str, body: Dict[str, Any] = Body(...), _admin: dict = Depends(require_admin)):
    oid = _oid_or_422(msg_id)
    st = (body.get("status") or "").strip()
    if st not in {"new", "contacted", "closed"}:
        raise HTTPException(status_code=422, detail="Ungültiger Status")
    await _db.social_preview_messages.update_one({"_id": oid}, {"$set": {"status": st, "updated_at": datetime.now(timezone.utc)}})
    return {"status": st}


@router.delete("/social-preview-messages/{msg_id}")
async def delete_social_preview(msg_id: str, _admin: dict = Depends(require_admin)):
    oid = _oid_or_422(msg_id)
    await _db.social_preview_messages.delete_one({"_id": oid})
    return {"status": "deleted", "id": msg_id}


# ─── CONTRACT FORM SUBMISSIONS ──────────────────────────────────────────
@router.get("/contract-form-submissions")
async def list_contract_submissions(
    product_key: Optional[str] = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
    _admin: dict = Depends(require_admin),
) -> Dict[str, Any]:
    q: Dict[str, Any] = {}
    if product_key:
        q["product_key"] = product_key
    docs = await _empty_safe_list("contract_form_submissions", [("created_at", -1)], limit, q)
    items = [{
        "id": str(d.get("_id")),
        "customer_name": d.get("customer_name"),
        "customer_email": d.get("customer_email"),
        "bank_name": d.get("bank_name"),
        "product_key": d.get("product_key"),
        "summary": d.get("summary") or {},
        "files": d.get("files") or [],
        "status": d.get("status", "new"),
        "admin_email_sent": bool(d.get("admin_email_sent")),
        "admin_email_error": d.get("admin_email_error"),
        "created_at": _iso(d.get("created_at")),
    } for d in docs]
    return {"items": items, "count": len(items)}


@router.patch("/contract-form-submissions/{sub_id}")
async def update_contract_submission(sub_id: str, body: Dict[str, Any] = Body(...), _admin: dict = Depends(require_admin)):
    oid = _oid_or_422(sub_id)
    st = (body.get("status") or "").strip()
    if st not in {"new", "handled"}:
        raise HTTPException(status_code=422, detail="Ungültiger Status")
    await _db.contract_form_submissions.update_one({"_id": oid}, {"$set": {"status": st, "updated_at": datetime.now(timezone.utc)}})
    return {"status": st}
