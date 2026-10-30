"""Admin: Kundenbestand pflegen (Festgeld/Tagesgeld, Aktien, Anleihen, Dokumente, Profil, Angebote)."""
from __future__ import annotations

import asyncio
import calendar
import re
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, Literal, Optional

from bson import ObjectId
from bson.decimal128 import Decimal128
from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from pydantic import BaseModel, Field

from server import db, get_current_user, require_admin
from services.cash_service import create_cash_event, get_cash_summary
from services.emergent_storage import APP_PREFIX, get_object, put_object
from services.customer_mails import eur, mask_iban, render, send_later

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


async def _notify_new_item(user_id: str, label: str, kind: str) -> None:
    cust = await db.users.find_one({"_id": ObjectId(user_id)}, {"email": 1})
    path = "/dashboard/dokumente" if kind == "Dokument" else "/dashboard/festgeld"
    send_later((cust or {}).get("email"), f"Neues {kind} in Ihrem Kundenbereich" if kind == "Dokument" else "Neuer Vertrag in Ihrem Kundenbereich", render(
        "Ein neues Dokument liegt für Sie bereit" if kind == "Dokument" else "Ein neuer Vertrag ist in Ihrem Depot",
        f"Wir haben {'ein Dokument' if kind == 'Dokument' else 'einen Vertrag'} in Ihrem Kundenbereich hinterlegt.",
        [(kind, label), ("Bereitgestellt am", datetime.now(timezone.utc).strftime("%d.%m.%Y")),
         ("Ablage", "Kundenbereich → Dokumente" if kind == "Dokument" else "Kundenbereich → Festgeld")],
        "Dokument öffnen" if kind == "Dokument" else "Vertrag ansehen", path))


FLEXGELD_LOCK_MONTHS = 3


def _add_months(iso: str, months: int) -> str:
    y, m, d = (int(x) for x in iso[:10].split("-"))
    m += months
    y, m = y + (m - 1) // 12, (m - 1) % 12 + 1
    d = min(d, calendar.monthrange(y, m)[1])
    return f"{y:04d}-{m:02d}-{d:02d}"


def _lock_until(d: dict) -> Optional[str]:
    if d.get("lock_until"):
        return d["lock_until"]
    if d.get("product_type") == "flexgeld" and d.get("active_from"):
        return _add_months(d["active_from"], FLEXGELD_LOCK_MONTHS)
    return None


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
        "lock_until": _lock_until(d),
        "is_active": bool(d.get("is_active", True)),
        "note": d.get("note"),
        "banks": {"name": d.get("bank_name"), "logo_url": d.get("bank_logo_url"), "country": d.get("bank_country")},
        "created_at": _iso(d.get("created_at")),
    }


async def _with_bank_logos(contracts: list) -> list:
    ids = list({c.get("bank_id") for c in contracts if c.get("bank_id")})
    banks = {str(b["_id"]): b async for b in db.banks.find(
        {"_id": {"$in": [ObjectId(i) for i in ids if ObjectId.is_valid(i)]}}, {"name": 1, "logo_url": 1, "country": 1})}
    out = []
    for c in contracts:
        row = _contract_out(c)
        b = banks.get(c.get("bank_id"))
        if b:
            row["banks"] = {"name": b.get("name"), "logo_url": b.get("logo_url"), "country": b.get("country")}
        out.append(row)
    return out


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
        "depot_contracts": await _with_bank_logos(contracts),
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
    active_until = body.active_until
    if not active_until and body.product_type in ("festgeld", "flexgeld") and body.laufzeit_monate:
        active_until = _add_months(body.active_from, body.laufzeit_monate)
    if active_until and active_until < body.active_from:
        raise HTTPException(status_code=422, detail="Enddatum liegt vor dem Startdatum")
    now = datetime.now(timezone.utc)
    doc = {
        **body.model_dump(), "active_until": active_until, "user_id": oid, "bank_id": str(bank["_id"]),
        "bank_slug": bank.get("slug"), "bank_name": bank.get("name"),
        "bank_country": bank.get("country"), "bank_logo_url": bank.get("logo_url"),
        "lock_until": active_until if body.product_type == "festgeld" else (
            _add_months(body.active_from, FLEXGELD_LOCK_MONTHS) if body.product_type == "flexgeld" else None),
        "is_active": True, "created_by": admin.get("id"), "created_at": now, "updated_at": now,
    }
    res = await db.depot_contracts.insert_one(doc)
    doc["_id"] = res.inserted_id
    await _notify_new_item(user_id, f"{body.product_type.capitalize()} {bank.get('name')} · {eur(body.amount_eur)}", "Vertrag")
    return _contract_out(doc)


@admin_router.delete("/depot-contracts/{contract_id}")
async def delete_contract(contract_id: str, _admin: dict = Depends(require_admin)):
    res = await db.depot_contracts.delete_one({"_id": _oid(contract_id)})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Vertrag nicht gefunden")
    return {"deleted": True}


# ─── Aktien ─────────────────────────────────────────────────────────────
class StockIn(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=12, pattern=r"^\s*[A-Za-z0-9.\-]{1,12}\s*$")
    name: Optional[str] = Field(default=None, max_length=120)
    quantity: int = Field(..., gt=0, le=10_000_000)
    avg_cost: float = Field(..., gt=0, le=10_000_000)
    model_config = {"extra": "forbid"}


@admin_router.post("/customers/{user_id}/stock-positions", status_code=201)
async def add_stock(user_id: str, body: StockIn, _admin: dict = Depends(require_admin)):
    oid = await _require_user(user_id)
    symbol = re.sub(r"\s+", "", body.symbol).upper()
    now = datetime.now(timezone.utc)
    await db.stock_positions.update_one(
        {"user_id": oid, "symbol": symbol},
        {"$set": {"quantity": int(body.quantity), "avg_cost": Decimal128(str(body.avg_cost)),
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
                  "avg_cost": body.kurs,
                  "cost_basis": Decimal128(str(round(body.nominal_betrag * body.kurs / 100, 2))),
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
    await _notify_new_item(user_id, title.strip(), "Dokument")
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
    data.update({
        "street": body.address_street, "house_number": body.address_house_number,
        "address_addition": body.address_line_2, "postal_code": body.address_postal_code,
        "city": body.address_city, "onboarding_completed": True,
    })
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
    return await _with_bank_logos(docs)


# ─── Auszahlungsanträge (Kunde beantragt, Admin bestätigt) ───────────────
class PayoutIn(BaseModel):
    amount: float = Field(..., gt=0, le=10_000_000)
    account_holder: str = Field(..., min_length=2, max_length=120)
    iban: str = Field(..., min_length=15, max_length=40)
    note: Optional[str] = Field(default=None, max_length=500)
    model_config = {"extra": "forbid"}


class PayoutDecisionIn(BaseModel):
    reason: Optional[str] = Field(default=None, max_length=500)
    model_config = {"extra": "forbid"}


def _payout_out(d: dict) -> dict:
    return {
        "id": str(d["_id"]), "user_id": str(d["user_id"]), "amount": d.get("amount"),
        "account_holder": d.get("account_holder"), "iban": d.get("iban"), "note": d.get("note"),
        "status": d.get("status"), "reason": d.get("reason"),
        "customer_name": d.get("customer_name"), "customer_email": d.get("customer_email"),
        "created_at": _iso(d.get("created_at")), "decided_at": _iso(d.get("decided_at")),
    }


_PAYOUT_LOCKS: dict = defaultdict(asyncio.Lock)


def _iban_ok(iban: str) -> bool:
    if not re.fullmatch(r"[A-Z]{2}\d{2}[A-Z0-9]{11,30}", iban):
        return False
    digits = "".join(str(int(c, 36)) for c in iban[4:] + iban[:4])
    return int(digits) % 97 == 1


def _eur_de(v: float) -> str:
    return f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") + " €"


@customer_router.post("/payout-requests", status_code=201)
async def request_payout(body: PayoutIn, user: dict = Depends(get_current_user)):
    iban = re.sub(r"\s+", "", body.iban).upper()
    if not _iban_ok(iban):
        raise HTTPException(status_code=422, detail="Bitte eine gültige IBAN angeben")
    async with _PAYOUT_LOCKS[str(user["id"])]:
        return await _create_payout(body, user, iban)


async def _create_payout(body: PayoutIn, user: dict, iban: str) -> dict:
    amount = round(body.amount, 2)
    cash = await get_cash_summary(db, user)
    if amount > float(cash["available"]):
        raise HTTPException(status_code=400, detail=f"Der Betrag übersteigt Ihr verfügbares Guthaben ({_eur_de(float(cash['available']))})")
    now = datetime.now(timezone.utc)
    rid = ObjectId()
    ev = await create_cash_event(
        db, user_id=str(user["id"]), event_type="withdrawal", direction="debit", amount=f"{amount:.2f}",
        currency="EUR", status="pending", idempotency_key=f"payout-{rid}",
        description="Auszahlung beantragt – wartet auf Freigabe", source="customer",
        source_reference_id=str(rid), created_by=str(user["id"]),
    )
    doc = {
        "_id": rid, "user_id": ObjectId(user["id"]), "amount": amount, "account_holder": body.account_holder.strip(),
        "iban": iban, "note": body.note, "status": "pending", "ledger_event_id": ev["event"]["id"],
        "customer_name": user.get("name"), "customer_email": user.get("email"), "created_at": now,
    }
    await db.payout_requests.insert_one(doc)
    send_later(user.get("email"), "Ihr Auszahlungsantrag ist eingegangen", render(
        "Auszahlungsantrag erhalten", "Ihr Antrag wird geprüft. Der Betrag ist bis zur Freigabe für Sie reserviert.",
        [("Betrag", eur(amount)), ("Empfängerkonto", mask_iban(iban)), ("Kontoinhaber", doc["account_holder"]),
         ("Beantragt am", now.strftime("%d.%m.%Y"))],
        "Antrag ansehen", "/dashboard/uebersicht",
        steps=["Prüfung durch unser Team", "Überweisung auf Ihr Referenzkonto"],
    ))
    return _payout_out(doc)


@customer_router.get("/payout-requests")
async def my_payout_requests(user: dict = Depends(get_current_user)):
    docs = await db.payout_requests.find({"user_id": ObjectId(user["id"])}).sort("created_at", -1).to_list(100)
    return [_payout_out(d) for d in docs]


@admin_router.get("/payout-requests")
async def list_payout_requests(status: Optional[str] = None, _admin: dict = Depends(require_admin)):
    q = {"status": status} if status in {"pending", "approved", "rejected"} else {}
    docs = await db.payout_requests.find(q).sort("created_at", -1).to_list(500)
    return [_payout_out(d) for d in docs]


async def _decide_payout(request_id: str, approve: bool, reason: Optional[str], admin: dict) -> dict:
    doc = await db.payout_requests.find_one({"_id": _oid(request_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Antrag nicht gefunden")
    if doc.get("status") != "pending":
        raise HTTPException(status_code=409, detail="Antrag wurde bereits bearbeitet")
    now = datetime.now(timezone.utc)
    new_status = "approved" if approve else "rejected"
    res = await db.payout_requests.update_one(
        {"_id": doc["_id"], "status": "pending"},
        {"$set": {"status": new_status, "reason": reason, "decided_at": now, "decided_by": admin.get("id")}},
    )
    if not res.modified_count:
        raise HTTPException(status_code=409, detail="Antrag wurde bereits bearbeitet")
    await db.cash_ledger.update_one(
        {"_id": ObjectId(doc["ledger_event_id"])},
        {"$set": {
            "status": "settled" if approve else "cancelled", "effective_at": now,
            "description": "Auszahlung auf " + doc["iban"][-4:].rjust(8, "•") if approve else f"Auszahlung abgelehnt{': ' + reason if reason else ''}",
        }},
    )
    doc.update({"status": new_status, "reason": reason, "decided_at": now})
    cust = await db.users.find_one({"_id": doc["user_id"]}, {"email": 1})
    rows = [("Betrag", eur(doc["amount"])), ("Empfängerkonto", mask_iban(doc["iban"])),
            ("Status", "Freigegeben" if approve else "Abgelehnt")]
    if approve:
        send_later((cust or {}).get("email"), "Ihre Auszahlung wurde freigegeben", render(
            "Ihre Auszahlung ist freigegeben",
            "Wir haben die Überweisung auf Ihr Referenzkonto veranlasst. Der Betrag wurde von Ihrem Guthaben abgebucht.",
            rows, "Kontoverlauf ansehen", "/dashboard/uebersicht"))
    else:
        send_later((cust or {}).get("email"), "Ihr Auszahlungsantrag wurde abgelehnt", render(
            "Ihr Auszahlungsantrag wurde abgelehnt",
            "Der Betrag steht Ihnen wieder in voller Höhe zur Verfügung.",
            rows + ([("Grund", reason)] if reason else []), "Kontoverlauf ansehen", "/dashboard/uebersicht",
            note="Bei Fragen erreichen Sie uns unter kundenservice@essenceinvest.com."))
    return _payout_out(doc)


@admin_router.post("/payout-requests/{request_id}/approve")
async def approve_payout(request_id: str, body: PayoutDecisionIn, admin: dict = Depends(require_admin)):
    return await _decide_payout(request_id, True, body.reason, admin)


@admin_router.post("/payout-requests/{request_id}/reject")
async def reject_payout(request_id: str, body: PayoutDecisionIn, admin: dict = Depends(require_admin)):
    return await _decide_payout(request_id, False, body.reason, admin)


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
