"""Admin: Kundenbestand pflegen (Festgeld/Tagesgeld, Aktien, Anleihen, Dokumente, Profil, Angebote)."""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Literal, Optional

from bson import ObjectId
from bson.decimal128 import Decimal128
from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from pydantic import BaseModel, Field

from server import db, get_current_user, require_admin
from services.cash_service import get_cash_summary
from services.emergent_storage import APP_PREFIX, get_object, put_object

admin_router = APIRouter(prefix="/api/admin", tags=["admin-customer-assets"])
customer_router = APIRouter(prefix="/api/portfolio", tags=["customer-assets"])

DOC_ALLOWED = {"application/pdf", "image/jpeg", "image/png", "image/webp"}
DOC_MAX_BYTES = 20 * 1024 * 1024
_DATE_RE = r"^\d{4}-\d{2}-\d{2}$"


def _oid(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=422, detail="Ungültige ID")
    return ObjectId(value)


def _num(v: Any) -> Optional[float]:
    if v is None:
        return None
    if isinstance(v, Decimal128):
        return float(v.to_decimal())
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _iso(v: Any) -> Optional[str]:
    return v.isoformat() if isinstance(v, datetime) else v


async def _require_user(user_id: str) -> ObjectId:
    oid = _oid(user_id)
    if not await db.users.find_one({"_id": oid}, {"_id": 1}):
        raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
    return oid


async def _find_bank(bank_id: str) -> dict:
    bank = None
    if ObjectId.is_valid(bank_id):
        bank = await db.banks.find_one({"_id": ObjectId(bank_id)})
    if not bank:
        bank = await db.banks.find_one({"slug": bank_id})
    if not bank:
        raise HTTPException(status_code=404, detail="Bank nicht gefunden")
    return bank


def _contract_out(d: dict) -> dict:
    return {
        "id": str(d["_id"]),
        "bank_id": d.get("bank_id"),
        "product_type": d.get("product_type"),
        "amount_eur": _num(d.get("amount_eur")),
        "zinssatz": _num(d.get("zinssatz")),
        "laufzeit_monate": d.get("laufzeit_monate"),
        "active_from": d.get("active_from"),
        "active_until": d.get("active_until"),
        "lock_until": d.get("lock_until"),
        "is_active": bool(d.get("is_active", True)),
        "note": d.get("note"),
        "banks": {"name": d.get("bank_name"), "logo_url": d.get("bank_logo_url"), "country": d.get("bank_country")},
        "created_at": _iso(d.get("created_at")),
    }


def _stock_out(d: dict) -> dict:
    return {
        "id": str(d["_id"]), "symbol": d.get("symbol"), "name": d.get("name"),
        "quantity": _num(d.get("quantity")), "avg_cost": _num(d.get("avg_cost")),
        "currency": d.get("currency") or "EUR", "is_active": bool(d.get("is_active", True)),
    }


def _bond_out(d: dict) -> dict:
    return {
        "id": str(d["_id"]), "isin": d.get("isin"),
        "bond_name": d.get("bond_name") or d.get("name"), "issuer": d.get("issuer"),
        "nominal_betrag": _num(d.get("nominal_betrag")) or _num(d.get("nominal_amount")),
        "aktueller_kurs": _num(d.get("aktueller_kurs")) or _num(d.get("average_purchase_price_pct")),
        "coupon_rate": _num(d.get("coupon_rate")), "maturity_date": d.get("maturity_date"),
        "is_active": bool(d.get("is_active", True)),
    }


def _doc_out(d: dict) -> dict:
    return {
        "id": d["_id"], "title": d.get("title") or d.get("original_filename"),
        "filename": d.get("original_filename"), "content_type": d.get("content_type"),
        "size": d.get("size"), "created_at": _iso(d.get("created_at")),
    }


def _user_q(oid: ObjectId) -> dict:
    return {"user_id": {"$in": [oid, str(oid)]}}


# ─── Admin: Gesamtübersicht eines Kunden ────────────────────────────────
@admin_router.get("/customers/{user_id}/assets")
async def customer_assets(user_id: str, _admin: dict = Depends(require_admin)):
    oid = await _require_user(user_id)
    contracts = await db.depot_contracts.find({"user_id": oid}).sort("created_at", -1).to_list(500)
    stocks = await db.stock_positions.find(_user_q(oid)).sort("updated_at", -1).to_list(500)
    bonds = await db.bond_positions.find(_user_q(oid)).sort("updated_at", -1).to_list(500)
    docs = await db.storage_files.find(
        {"scope": "customer_document", "subject_id": user_id, "is_deleted": False}
    ).sort("created_at", -1).to_list(500)
    cash = await get_cash_summary(db, {"id": user_id})
    return {
        "depot_contracts": [_contract_out(d) for d in contracts],
        "stock_positions": [_stock_out(d) for d in stocks if (_num(d.get("quantity")) or 0) > 0],
        "bond_positions": [_bond_out(d) for d in bonds],
        "documents": [_doc_out(d) for d in docs],
        "cash_balance": float(cash["balance"]),
    }


# ─── Festgeld / Tagesgeld ───────────────────────────────────────────────
class ContractIn(BaseModel):
    bank_id: str = Field(..., min_length=1, max_length=64)
    product_type: Literal["festgeld", "tagesgeld", "flexgeld"]
    amount_eur: float = Field(..., gt=0, le=100_000_000)
    zinssatz: float = Field(..., ge=0, le=25)
    laufzeit_monate: Optional[int] = Field(default=None, ge=1, le=600)
    active_from: str = Field(..., pattern=_DATE_RE)
    active_until: Optional[str] = Field(default=None, pattern=_DATE_RE)
    note: Optional[str] = Field(default=None, max_length=500)
    model_config = {"extra": "forbid"}


@admin_router.post("/customers/{user_id}/depot-contracts", status_code=201)
async def add_contract(user_id: str, body: ContractIn, admin: dict = Depends(require_admin)):
    oid = await _require_user(user_id)
    bank = await _find_bank(body.bank_id)
    if body.active_until and body.active_until < body.active_from:
        raise HTTPException(status_code=422, detail="Enddatum liegt vor dem Startdatum")
    now = datetime.now(timezone.utc)
    doc = {
        **body.model_dump(), "user_id": oid, "bank_id": str(bank["_id"]),
        "bank_slug": bank.get("slug"), "bank_name": bank.get("name"),
        "bank_country": bank.get("country"), "bank_logo_url": bank.get("logo_url"),
        "lock_until": body.active_until if body.product_type == "festgeld" else None,
        "is_active": True, "created_by": admin.get("id"), "created_at": now, "updated_at": now,
    }
    res = await db.depot_contracts.insert_one(doc)
    doc["_id"] = res.inserted_id
    return _contract_out(doc)


@admin_router.delete("/depot-contracts/{contract_id}")
async def delete_contract(contract_id: str, _admin: dict = Depends(require_admin)):
    res = await db.depot_contracts.delete_one({"_id": _oid(contract_id)})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Vertrag nicht gefunden")
    return {"deleted": True}


# ─── Aktien ─────────────────────────────────────────────────────────────
class StockIn(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=32)
    name: Optional[str] = Field(default=None, max_length=120)
    quantity: float = Field(..., gt=0, le=10_000_000)
    avg_cost: float = Field(..., gt=0, le=10_000_000)
    model_config = {"extra": "forbid"}


@admin_router.post("/customers/{user_id}/stock-positions", status_code=201)
async def add_stock(user_id: str, body: StockIn, _admin: dict = Depends(require_admin)):
    oid = await _require_user(user_id)
    symbol = re.sub(r"\s+", "", body.symbol).upper()
    now = datetime.now(timezone.utc)
    await db.stock_positions.update_one(
        {"user_id": oid, "symbol": symbol},
        {"$set": {"quantity": Decimal128(str(body.quantity)), "avg_cost": Decimal128(str(body.avg_cost)),
                  "name": body.name, "currency": "EUR", "is_active": True, "updated_at": now},
         "$setOnInsert": {"user_id": oid, "symbol": symbol, "created_at": now}},
        upsert=True,
    )
    return _stock_out(await db.stock_positions.find_one({"user_id": oid, "symbol": symbol}))


@admin_router.delete("/stock-positions/{position_id}")
async def delete_stock(position_id: str, _admin: dict = Depends(require_admin)):
    res = await db.stock_positions.delete_one({"_id": _oid(position_id)})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Position nicht gefunden")
    return {"deleted": True}


# ─── Anleihen ───────────────────────────────────────────────────────────
class BondIn(BaseModel):
    isin: str = Field(..., min_length=4, max_length=32)
    bond_name: str = Field(..., min_length=1, max_length=160)
    issuer: Optional[str] = Field(default=None, max_length=160)
    nominal_betrag: float = Field(..., gt=0, le=100_000_000)
    kurs: float = Field(default=100, gt=0, le=1000)
    coupon_rate: Optional[float] = Field(default=None, ge=0, le=50)
    maturity_date: Optional[str] = Field(default=None, pattern=_DATE_RE)
    model_config = {"extra": "forbid"}


@admin_router.post("/customers/{user_id}/bond-positions", status_code=201)
async def add_bond(user_id: str, body: BondIn, _admin: dict = Depends(require_admin)):
    oid = await _require_user(user_id)
    isin = body.isin.strip().upper()
    now = datetime.now(timezone.utc)
    await db.bond_positions.update_one(
        {"user_id": oid, "isin": isin},
        {"$set": {"bond_name": body.bond_name, "issuer": body.issuer, "currency": "EUR",
                  "nominal_betrag": body.nominal_betrag, "nominal_amount": Decimal128(str(body.nominal_betrag)),
                  "aktueller_kurs": body.kurs, "average_purchase_price_pct": Decimal128(str(body.kurs)),
                  "coupon_rate": body.coupon_rate, "kupon_rate": body.coupon_rate,
                  "maturity_date": body.maturity_date, "is_active": True, "updated_at": now},
         "$setOnInsert": {"user_id": oid, "isin": isin, "created_at": now}},
        upsert=True,
    )
    return _bond_out(await db.bond_positions.find_one({"user_id": oid, "isin": isin}))


@admin_router.delete("/bond-positions/{position_id}")
async def delete_bond(position_id: str, _admin: dict = Depends(require_admin)):
    res = await db.bond_positions.delete_one({"_id": _oid(position_id)})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Position nicht gefunden")
    return {"deleted": True}


# ─── Dokumente ──────────────────────────────────────────────────────────
@admin_router.post("/customers/{user_id}/documents", status_code=201)
async def upload_document(
    user_id: str,
    title: str = Form(..., min_length=1, max_length=160),
    file: UploadFile = File(...),
    admin: dict = Depends(require_admin),
):
    await _require_user(user_id)
    ct = (file.content_type or "").lower()
    if ct not in DOC_ALLOWED:
        raise HTTPException(status_code=415, detail="Nur PDF, JPG, PNG oder WEBP erlaubt")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=422, detail="Leere Datei")
    if len(data) > DOC_MAX_BYTES:
        raise HTTPException(status_code=413, detail="Datei zu groß (max. 20 MB)")
    ext = {"application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}[ct]
    try:
        result = put_object(f"{APP_PREFIX}/customer-docs/{user_id}/{uuid.uuid4().hex}.{ext}", data, ct)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Speichern fehlgeschlagen: {exc}")
    filename = re.sub(r"[^\w \-.()]+", "_", (file.filename or f"dokument.{ext}").strip())[:200]
    doc = {
        "_id": uuid.uuid4().hex, "scope": "customer_document", "subject_id": user_id,
        "title": title.strip(), "storage_path": result["path"], "content_type": ct,
        "size": int(result.get("size") or len(data)), "original_filename": filename,
        "is_deleted": False, "uploaded_by": admin.get("id"), "created_at": datetime.now(timezone.utc),
    }
    await db.storage_files.insert_one(doc)
    return _doc_out(doc)


@admin_router.delete("/customer-documents/{doc_id}")
async def delete_document(doc_id: str, _admin: dict = Depends(require_admin)):
    res = await db.storage_files.update_one(
        {"_id": doc_id, "scope": "customer_document", "is_deleted": False},
        {"$set": {"is_deleted": True, "deleted_at": datetime.now(timezone.utc)}},
    )
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden")
    return {"deleted": True}


def _file_response(doc: dict) -> Response:
    data, ct = get_object(doc["storage_path"])
    if not data:
        raise HTTPException(status_code=404, detail="Datei nicht im Speicher")
    return Response(
        content=data, media_type=doc.get("content_type") or ct,
        headers={"Content-Disposition": f'attachment; filename="{doc.get("original_filename") or "dokument"}"'},
    )


@admin_router.get("/customer-documents/{doc_id}/download")
async def admin_download_document(doc_id: str, _admin: dict = Depends(require_admin)):
    doc = await db.storage_files.find_one({"_id": doc_id, "scope": "customer_document", "is_deleted": False})
    if not doc:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden")
    return _file_response(doc)


# ─── Profil ─────────────────────────────────────────────────────────────
class ProfileIn(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=80)
    last_name: str = Field(..., min_length=1, max_length=80)
    phone: str = Field(..., min_length=3, max_length=40)
    country: str = Field(..., min_length=2, max_length=80)
    address_street: Optional[str] = Field(default=None, max_length=120)
    address_house_number: Optional[str] = Field(default=None, max_length=20)
    address_line_2: Optional[str] = Field(default=None, max_length=120)
    address_postal_code: Optional[str] = Field(default=None, max_length=20)
    address_city: Optional[str] = Field(default=None, max_length=80)
    model_config = {"extra": "forbid"}


@admin_router.patch("/customers/{user_id}/profile")
async def update_profile(user_id: str, body: ProfileIn, _admin: dict = Depends(require_admin)):
    oid = await _require_user(user_id)
    data = body.model_dump()
    data["name"] = f"{body.first_name} {body.last_name}".strip()
    data["updated_at"] = datetime.now(timezone.utc)
    await db.users.update_one({"_id": oid}, {"$set": data})
    return {"updated": True}


# ─── Sparangebote (Admin-Pflege) ────────────────────────────────────────
class OfferIn(BaseModel):
    bank_id: str = Field(..., min_length=1, max_length=64)
    interest_rate: float = Field(..., ge=0, le=25)
    deposit_term: Optional[int] = Field(default=None, ge=0, le=600)
    min_deposit: float = Field(..., ge=0)
    max_deposit: Optional[float] = Field(default=None, ge=0)
    deposit_protection: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    bank_link: Optional[str] = Field(default=None, max_length=500)
    investment_type: Optional[str] = Field(default=None, max_length=40)
    is_active: bool = True


def _offer_doc(body: OfferIn, bank: dict) -> Dict[str, Any]:
    ptype = (body.investment_type or "").lower()
    if ptype not in {"festgeld", "tagesgeld", "flexgeld"}:
        ptype = "festgeld" if body.deposit_term else "tagesgeld"
    return {
        "bank_slug": bank.get("slug"), "bank_id": str(bank["_id"]),
        "product_name": f"{bank.get('name')} {ptype.capitalize()}", "product_type": ptype,
        "interest_rate": body.interest_rate, "term_months": body.deposit_term or None,
        "min_amount": body.min_deposit, "max_amount": body.max_deposit, "currency": "EUR",
        "country": bank.get("country"), "deposit_guarantee_country": bank.get("country"),
        "deposit_protection": body.deposit_protection, "description": body.description,
        "source_url": body.bank_link, "source_name": "Admin-Eingabe",
        "is_active": body.is_active, "updated_at": datetime.now(timezone.utc),
    }


@admin_router.post("/offers", status_code=201)
async def create_offer(body: OfferIn, _admin: dict = Depends(require_admin)):
    doc = _offer_doc(body, await _find_bank(body.bank_id))
    doc["created_at"] = doc["updated_at"]
    doc["source_timestamp"] = doc["updated_at"]
    res = await db.savings_offers.insert_one(doc)
    return {"id": str(res.inserted_id)}


@admin_router.put("/offers/{offer_id}")
async def update_offer(offer_id: str, body: OfferIn, _admin: dict = Depends(require_admin)):
    res = await db.savings_offers.update_one(
        {"_id": _oid(offer_id)}, {"$set": _offer_doc(body, await _find_bank(body.bank_id))}
    )
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Angebot nicht gefunden")
    return {"updated": True}


@admin_router.patch("/offers/{offer_id}/active")
async def toggle_offer(offer_id: str, is_active: bool, _admin: dict = Depends(require_admin)):
    res = await db.savings_offers.update_one({"_id": _oid(offer_id)}, {"$set": {"is_active": is_active}})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Angebot nicht gefunden")
    return {"updated": True}


@admin_router.delete("/offers/{offer_id}")
async def delete_offer(offer_id: str, _admin: dict = Depends(require_admin)):
    res = await db.savings_offers.delete_one({"_id": _oid(offer_id)})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Angebot nicht gefunden")
    return {"deleted": True}


# ─── Kunde: eigene Verträge und Dokumente ───────────────────────────────
@customer_router.get("/depot-contracts")
async def my_contracts(user: dict = Depends(get_current_user)):
    docs = await db.depot_contracts.find({"user_id": ObjectId(user["id"])}).sort("created_at", -1).to_list(500)
    return [_contract_out(d) for d in docs]


@customer_router.get("/documents")
async def my_documents(user: dict = Depends(get_current_user)):
    docs = await db.storage_files.find(
        {"scope": "customer_document", "subject_id": str(user["id"]), "is_deleted": False}
    ).sort("created_at", -1).to_list(500)
    return [_doc_out(d) for d in docs]


@customer_router.get("/documents/{doc_id}/download")
async def my_document_download(doc_id: str, user: dict = Depends(get_current_user)):
    doc = await db.storage_files.find_one({
        "_id": doc_id, "scope": "customer_document", "subject_id": str(user["id"]), "is_deleted": False,
    })
    if not doc:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden")
    return _file_response(doc)
