"""
Bond-Kaufanfragen — FastAPI/Mongo-native (Session 82.04).

Analog zu `ipo_requests.py`. Der Kunden-Write auf Supabase
`bond_purchase_requests` blockiert wegen RLS (Mongo-ObjectId vs. UUID).

  - Customer:  POST /api/bonds/requests, GET /api/bonds/requests/me
  - Admin:     GET  /api/admin/bonds/requests
               POST /api/admin/bonds/requests/{id}/approve
               POST /api/admin/bonds/requests/{id}/reject

Bond-Validierung erfolgt gegen die Mongo-Native `bond_catalog` (Session 82.03).

APPROVE bedeutet fachliche Freigabe — es wird KEINE Position erzeugt,
kein Cash belastet, keine Order ausgeführt. Position-Erzeugung bleibt
blockiert durch die Portfolio-Migration (fehlender Service-Role).
"""

from __future__ import annotations

from datetime import datetime, timezone, date as _date
import asyncio
from decimal import Decimal
from typing import Optional, Literal

from bson import ObjectId, Decimal128
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from pymongo.errors import DuplicateKeyError

from server import get_current_user, db, require_admin  # type: ignore[attr-defined]
from services.bond_audit import write_audit, list_audit  # noqa: E402
from services.bond_order_service import (  # noqa: E402
    executable_buy_price, compute_quote, available_cash, quote_to_json, record_advisory_request,
)


router = APIRouter(prefix="/api/bonds", tags=["bond-requests"])
admin_router = APIRouter(prefix="/api/admin/bonds", tags=["admin-bond-requests"])


# ─── Pydantic-Models ────────────────────────────────────────────────────
class BondRequestCreate(BaseModel):
    bond_id: str = Field(..., min_length=1, max_length=64)
    amount_eur: float = Field(..., gt=0)
    requested_nominal: Optional[float] = Field(default=None, gt=0)
    notes: Optional[str] = Field(default=None, max_length=2000)

    model_config = {"extra": "forbid"}

    @field_validator("amount_eur", "requested_nominal")
    @classmethod
    def _finite(cls, v):
        if v is None:
            return None
        if not isinstance(v, (int, float)) or v != v:
            raise ValueError("Wert muss numerisch sein")
        return float(v)


class AdminDecisionBody(BaseModel):
    decision_note: Optional[str] = Field(default=None, max_length=2000)
    model_config = {"extra": "forbid"}


class AdminNoteBody(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
    model_config = {"extra": "forbid"}


class AdminOfferBody(BaseModel):
    price_pct: float = Field(..., gt=0, le=1000)
    nominal: float = Field(..., gt=0)
    accrued_interest: Optional[float] = Field(default=None, ge=0)
    fees: Optional[float] = Field(default=None, ge=0)
    valid_until: Optional[str] = Field(default=None, description="ISO YYYY-MM-DD")
    message: Optional[str] = Field(default=None, max_length=2000)
    model_config = {"extra": "forbid"}

    @field_validator("valid_until")
    @classmethod
    def _iso(cls, v):
        if not v:
            return None
        if _date.fromisoformat(v) < _date.today():
            raise ValueError("Gültigkeitsdatum darf nicht in der Vergangenheit liegen")
        return v


def _iso_dt(v):
    return v.isoformat() if isinstance(v, datetime) else v


def _serialize_offer(o: Optional[dict]) -> Optional[dict]:
    if not o:
        return None
    out = {k: v for k, v in o.items() if k not in ("created_by", "admin_seen")}
    out["created_at"] = _iso_dt(o.get("created_at"))
    out["responded_at"] = _iso_dt(o.get("responded_at"))
    if out.get("status") == "offered" and _offer_expired(o):
        out["status"] = "expired"
    return out


def _offer_expired(o: dict) -> bool:
    vu = o.get("valid_until")
    try:
        return bool(vu) and _date.fromisoformat(vu) < _date.today()
    except ValueError:
        return False


class CustomerOfferDecision(BaseModel):
    comment: Optional[str] = Field(default=None, max_length=1000)
    model_config = {"extra": "forbid"}


def _serialize(doc: dict) -> dict:
    ca = doc.get("created_at")
    ua = doc.get("updated_at")
    ha = doc.get("handled_at")
    ex_at = doc.get("executed_at")

    def _dec(v):
        if v is None: return None
        if hasattr(v, "to_decimal"): return str(v.to_decimal())
        return v

    return {
        "id": str(doc["_id"]),
        "user_id": str(doc.get("user_id", "")),
        "bond_id": doc.get("bond_id"),
        "bond_name": doc.get("bond_name"),
        "issuer": doc.get("issuer"),
        "isin": doc.get("isin"),
        "kupon_rate": doc.get("kupon_rate"),
        "customer_display_id": doc.get("customer_display_id"),
        "reference_price_pct": doc.get("reference_price_pct"),
        "reference_price_type": doc.get("reference_price_type"),
        "reference_price_date": doc.get("reference_price_date"),
        "reference_price_updated_at": _iso_dt(doc.get("reference_price_updated_at")),
        "requested_at": _iso_dt(doc.get("requested_at") or doc.get("created_at")),
        "offer": _serialize_offer(doc.get("offer")),
        "cancelled_at": _iso_dt(doc.get("cancelled_at")),
        "amount_eur": doc.get("amount_eur"),
        "requested_nominal": doc.get("requested_nominal"),
        "notes": doc.get("notes"),
        "status": doc.get("status", "pending"),
        "source": doc.get("source", "customer"),
        "decision_note": doc.get("decision_note"),
        "handled_at": ha.isoformat() if isinstance(ha, datetime) else ha,
        "handled_by": str(doc["handled_by"]) if doc.get("handled_by") else None,
        "created_at": ca.isoformat() if isinstance(ca, datetime) else ca,
        "updated_at": ua.isoformat() if isinstance(ua, datetime) else ua,
        # Session 82.30 · Execution-Metadaten (nur gesetzt bei status='executed')
        "executed_nominal": _dec(doc.get("executed_nominal")),
        "execution_price_pct": _dec(doc.get("execution_price_pct")),
        "gross_amount": _dec(doc.get("gross_amount")),
        "executed_at": ex_at.isoformat() if isinstance(ex_at, datetime) else ex_at,
        "execution_id": str(doc.get("execution_id")) if doc.get("execution_id") else None,
        "position_id": str(doc.get("position_id")) if doc.get("position_id") else None,
        "order_type": doc.get("order_type") or "request",
        "transaction_no": doc.get("transaction_no"),
        "order_quote": doc.get("order_quote"),
        "reserved_cash": _dec(doc.get("reserved_cash")),
        "total_amount": _dec(doc.get("total_amount")),
        "bank_reference": doc.get("bank_reference"),
        "bank_confirmed_at": doc.get("bank_confirmed_at"),
        "bank_submitted_at": _iso_dt(doc.get("bank_submitted_at")),
    }


async def _fetch_investable_bond(bond_id: str) -> dict:
    """Katalog-Validierung: existiert, is_available, nicht abgelaufen."""
    if not ObjectId.is_valid(bond_id):
        raise HTTPException(status_code=404, detail="Anleihe nicht gefunden")
    doc = await db.bond_catalog.find_one({"_id": ObjectId(bond_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Anleihe nicht gefunden")
    if not doc.get("is_available"):
        raise HTTPException(status_code=400, detail="Anleihe ist nicht verfügbar")
    maturity = doc.get("faelligkeitsdatum")
    if maturity:
        try:
            if _date.fromisoformat(maturity) < _date.today():
                raise HTTPException(status_code=400, detail="Anleihe ist bereits fällig")
        except ValueError:
            pass
    return doc


# ─── Customer Endpoints ──────────────────────────────────────────────────
@router.post("/requests", status_code=201)
async def create_bond_request(
    payload: BondRequestCreate,
    user: dict = Depends(get_current_user),
):
    bond = await _fetch_investable_bond(payload.bond_id)
    if bond.get("requests_enabled") is False:
        raise HTTPException(
            status_code=400,
            detail="Für diese Anleihe sind derzeit keine Kaufanfragen möglich.",
        )

    # Minimum-Investment prüfen (aus Katalog, nicht aus Client-Payload)
    min_order = bond.get("min_order_eur")
    if min_order and payload.amount_eur < float(min_order):
        raise HTTPException(
            status_code=400,
            detail=f"Mindestinvestition nicht erreicht ({float(min_order):,.0f} €)".replace(",", "."),
        )

    # Duplicate-Guard: max. 1 pending pro user+bond
    user_oid = ObjectId(user["id"])
    existing = await db.bond_purchase_requests.find_one(
        {"user_id": user_oid, "bond_id": payload.bond_id, "status": "pending"}
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Für diese Anleihe besteht bereits eine offene Kaufanfrage.",
        )

    now = datetime.now(timezone.utc)
    customer_name = " ".join(
        x for x in (user.get("first_name"), user.get("last_name")) if x
    ).strip() or user.get("name") or user.get("email")
    doc = {
        "user_id": user_oid,
        "customer_display_id": f"KD-{str(user_oid)[-8:].upper()}",
        "customer_name_snapshot": customer_name,
        "bond_id": payload.bond_id,
        # Stammdaten aus dem VALIDIERTEN Katalog, nicht aus Client
        "bond_name": bond.get("bond_name"),
        "issuer": bond.get("issuer"),
        "isin": bond.get("isin"),
        "kupon_rate": bond.get("kupon_rate"),
        "reference_price_pct": bond.get("aktueller_kurs"),
        "reference_price_type": bond.get("kurs_typ"),
        "reference_price_date": bond.get("kurs_datum"),
        "reference_price_updated_at": bond.get("price_updated_at"),
        "requested_at": now,
        "amount_eur": float(payload.amount_eur),
        "requested_nominal": payload.requested_nominal,
        "notes": (payload.notes or "").strip() or None,
        "status": "pending",
        "source": "customer",
        "created_at": now,
        "updated_at": now,
    }
    try:
        result = await db.bond_purchase_requests.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail="Für diese Anleihe besteht bereits eine offene Kaufanfrage.",
        )
    doc["_id"] = result.inserted_id
    return _serialize(doc)


@router.get("/requests/me")
async def list_my_bond_requests(user: dict = Depends(get_current_user)):
    user_oid = ObjectId(user["id"])
    cursor = db.bond_purchase_requests.find({"user_id": user_oid}).sort("created_at", -1)
    return [_serialize(doc) async for doc in cursor]


async def _decide_offer(request_id: str, user: dict, decision: str, body: CustomerOfferDecision) -> dict:
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=404, detail="Anfrage nicht gefunden")
    doc = await db.bond_purchase_requests.find_one(
        {"_id": ObjectId(request_id), "user_id": ObjectId(user["id"])}
    )
    if not doc or not doc.get("offer"):
        raise HTTPException(status_code=404, detail="Kein Angebot vorhanden")
    offer = doc["offer"]
    if offer.get("status") != "offered":
        raise HTTPException(status_code=409, detail="Über dieses Angebot wurde bereits entschieden.")
    if _offer_expired(offer):
        raise HTTPException(status_code=409, detail="Das Angebot ist abgelaufen.")
    if doc.get("status") not in ("pending", "approved"):
        raise HTTPException(status_code=409, detail="Die Anfrage ist nicht mehr offen.")
    now = datetime.now(timezone.utc)
    comment = (body.comment or "").strip() or None
    result = await db.bond_purchase_requests.find_one_and_update(
        {"_id": doc["_id"], "offer.status": "offered"},
        {"$set": {
            "offer.status": decision, "offer.responded_at": now,
            "offer.customer_comment": comment, "offer.admin_seen": False, "updated_at": now,
        }},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=409, detail="Über dieses Angebot wurde bereits entschieden.")
    await write_audit(db, "bond_request", request_id, f"offer_{decision}",
                      {"offer_status": "offered"}, {"offer_status": decision, "note": comment}, user)
    return _serialize(result)


@router.post("/requests/{request_id}/offer/accept")
async def accept_bond_offer(request_id: str, body: CustomerOfferDecision = CustomerOfferDecision(),
                            user: dict = Depends(get_current_user)):
    """Annahme ist eine Willenserklärung — keine Buchung, Ausführung erst nach Admin-Freigabe."""
    return await _decide_offer(request_id, user, "accepted", body)


@router.post("/requests/{request_id}/offer/decline")
async def decline_bond_offer(request_id: str, body: CustomerOfferDecision = CustomerOfferDecision(),
                             user: dict = Depends(get_current_user)):
    return await _decide_offer(request_id, user, "declined", body)


# ─── Direktkauf aus dem Guthaben (Ausführung erst nach Bankbestätigung) ───
class DirectOrderBody(BaseModel):
    bond_id: str
    amount_eur: float = Field(..., gt=0, le=10_000_000)
    expected_total: Optional[float] = None
    model_config = {"extra": "forbid"}


_order_locks: "dict[str, asyncio.Lock]" = {}


async def _direct_quote(body: DirectOrderBody, user: dict):
    bond = await _fetch_investable_bond(body.bond_id)
    price = executable_buy_price(bond)
    if price is None:
        raise HTTPException(
            status_code=409,
            detail="Für diese Anleihe liegt derzeit kein ausführbarer Kaufkurs vor. Bitte fordern Sie ein Kaufangebot an.",
        )
    amount = Decimal(str(body.amount_eur))
    min_order = bond.get("min_order_eur") or 1000
    if amount < Decimal(str(min_order)):
        raise HTTPException(status_code=400, detail=f"Mindestanlage nicht erreicht ({float(min_order):,.0f} €)".replace(",", "."))
    q = compute_quote(bond, amount, price)
    if q["pieces"] < 1:
        raise HTTPException(status_code=400, detail="Der Betrag reicht nicht für ein Stück dieser Anleihe.")
    available = await available_cash(db, user["id"])
    return bond, amount, q, available


@router.post("/orders/check")
async def check_direct_order(body: DirectOrderBody, user: dict = Depends(get_current_user)):
    """Kostenübersicht + Guthabenprüfung. Bei fehlendem Guthaben: Beratungsanfrage."""
    bond, amount, q, available = await _direct_quote(body, user)
    out = quote_to_json(q, available)
    if not out["sufficient"]:
        await record_advisory_request(db, user, bond, amount, q["total"], available)
    return out


@router.post("/orders", status_code=201)
async def create_direct_order(body: DirectOrderBody, user: dict = Depends(get_current_user)):
    """Verbindlicher Kaufauftrag: reserviert die Gesamtkosten, Status 'Wartet auf Bankbestätigung'.
    Keine Abbuchung, keine Depotbuchung bis zur bestätigten Bankausführung."""
    lock = _order_locks.setdefault(user["id"], asyncio.Lock())
    async with lock:
        bond, amount, q, available = await _direct_quote(body, user)
        out = quote_to_json(q, available)
        if body.expected_total is not None and abs(float(q["total"]) - body.expected_total) > 0.005:
            raise HTTPException(status_code=409, detail="Kurs oder Kosten haben sich geändert. Bitte prüfen Sie die neue Kostenübersicht.")
        if not out["sufficient"]:
            await record_advisory_request(db, user, bond, amount, q["total"], available)
            raise HTTPException(status_code=402, detail={
                "code": "INSUFFICIENT_FUNDS",
                "message": "Ihr verfügbares Guthaben reicht für diesen Kauf derzeit nicht aus. Ein persönlicher Berater wird sich mit Ihnen in Verbindung setzen.",
                "available": out["available"], "required": out["total"], "missing": out["missing"],
            })
        now = datetime.now(timezone.utc)
        user_oid = ObjectId(user["id"])
        oid = ObjectId()
        name = " ".join(x for x in (user.get("first_name"), user.get("last_name")) if x).strip() or user.get("email")
        doc = {
            "_id": oid,
            "order_type": "direct",
            "transaction_no": f"AO-{now:%Y%m%d}-{str(oid)[-8:].upper()}",
            "user_id": user_oid,
            "customer_display_id": f"KD-{str(user_oid)[-8:].upper()}",
            "customer_name_snapshot": name,
            "bond_id": body.bond_id,
            "bond_name": bond.get("bond_name"),
            "issuer": bond.get("issuer"),
            "isin": bond.get("isin"),
            "kupon_rate": bond.get("kupon_rate"),
            "amount_eur": float(amount),
            "requested_nominal": float(q["nominal"]),
            "order_quote": {k: v for k, v in out.items() if k not in ("sufficient", "missing")},
            "reserved_cash": Decimal128(q["total"]),
            "reference_price_pct": float(q["price_pct"]),
            "reference_price_type": "binding",
            "reference_price_date": bond.get("kaufkurs_quoted_at"),
            "requested_at": now,
            "status": "awaiting_bank",
            "source": "customer",
            "created_at": now,
            "updated_at": now,
        }
        await db.bond_purchase_requests.insert_one(doc)
    await write_audit(db, "bond_request", oid, "order_created", None,
                      {"status": "awaiting_bank", "transaction_no": doc["transaction_no"],
                       "reserved": float(q["total"])}, user)
    return _serialize(doc)


# ─── Admin Endpoints ─────────────────────────────────────────────────────
async def _serialize_admin(doc: dict) -> dict:
    base = _serialize(doc)
    customer = {"customer_name": None, "customer_email": None}
    try:
        u = await db.users.find_one({"_id": doc["user_id"]})
        if u:
            name = " ".join(
                x for x in (u.get("first_name"), u.get("last_name")) if x
            ).strip() or u.get("name")
            customer["customer_name"] = name
            customer["customer_email"] = u.get("email")
    except Exception:
        pass
    handled_by_name = None
    if doc.get("handled_by"):
        try:
            hb = await db.users.find_one({"_id": doc["handled_by"]})
            if hb:
                handled_by_name = (
                    " ".join(x for x in (hb.get("first_name"), hb.get("last_name")) if x).strip()
                    or hb.get("name")
                    or hb.get("email")
                )
        except Exception:
            pass
    if doc.get("offer"):
        base["offer"]["created_by"] = doc["offer"].get("created_by")
        base["offer"]["admin_seen"] = doc["offer"].get("admin_seen", True)
    base.update({
        **customer,
        "customer_name": customer["customer_name"] or doc.get("customer_name_snapshot"),
        "customer_display_id": doc.get("customer_display_id") or f"KD-{str(doc.get('user_id', ''))[-8:].upper()}",
        "internal_notes": [
            {**n, "created_at": _iso_dt(n.get("created_at"))}
            for n in (doc.get("internal_notes") or [])
        ],
        "handled_by_name": handled_by_name,
        "backend": "mongo",
    })
    return base


@admin_router.get("/requests")
async def admin_list_bond_requests(_admin: dict = Depends(require_admin)):
    cursor = db.bond_purchase_requests.find({}).sort("created_at", -1)
    return [await _serialize_admin(doc) async for doc in cursor]


async def _transition_status(
    request_id: str,
    admin_user: dict,
    to_status: Literal["approved", "rejected"],
    body: AdminDecisionBody,
) -> dict:
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request id")
    now = datetime.now(timezone.utc)
    stamp_field = "approved_at" if to_status == "approved" else "rejected_at"
    update_doc = {
        "$set": {
            "status": to_status,
            "handled_at": now,
            "handled_by": ObjectId(admin_user["id"]),
            "updated_at": now,
            stamp_field: now,
        }
    }
    if body.decision_note is not None:
        update_doc["$set"]["decision_note"] = body.decision_note.strip() or None
    result = await db.bond_purchase_requests.find_one_and_update(
        {"_id": ObjectId(request_id),
         "status": {"$in": ["pending"] + (["awaiting_bank", "bank_submitted"] if to_status == "rejected" else [])}},
        update_doc,
        return_document=True,
    )
    if not result:
        existing = await db.bond_purchase_requests.find_one({"_id": ObjectId(request_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Anfrage nicht gefunden")
        raise HTTPException(
            status_code=409,
            detail=f"Anfrage bereits '{existing.get('status')}' — kein weiterer Übergang möglich",
        )
    await write_audit(db, "bond_request", request_id, to_status, {"status": "pending"},
                      {"status": to_status, "decision_note": result.get("decision_note")}, admin_user)
    return await _serialize_admin(result)


async def _load_request(request_id: str) -> dict:
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request id")
    doc = await db.bond_purchase_requests.find_one({"_id": ObjectId(request_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Anfrage nicht gefunden")
    return doc


@admin_router.post("/requests/{request_id}/cancel")
async def admin_cancel_bond(
    request_id: str,
    body: AdminDecisionBody = AdminDecisionBody(),
    admin_user: dict = Depends(require_admin),
):
    """pending/approved → cancelled. Keine Buchung, keine Position."""
    existing = await _load_request(request_id)
    if existing.get("status") not in ("pending", "approved", "awaiting_bank", "bank_submitted"):
        raise HTTPException(
            status_code=409,
            detail=f"Stornierung nur für offene oder genehmigte Anfragen — aktuell '{existing.get('status')}'",
        )
    now = datetime.now(timezone.utc)
    note = (body.decision_note or "").strip() or None
    result = await db.bond_purchase_requests.find_one_and_update(
        {"_id": existing["_id"], "status": existing["status"]},
        {"$set": {
            "status": "cancelled", "cancelled_at": now, "handled_at": now,
            "handled_by": ObjectId(admin_user["id"]), "updated_at": now,
            **({"decision_note": note} if note else {}),
        }},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=409, detail="Anfrage wurde parallel geändert")
    await write_audit(db, "bond_request", request_id, "cancelled",
                      {"status": existing["status"]}, {"status": "cancelled", "decision_note": note}, admin_user)
    return await _serialize_admin(result)


@admin_router.post("/requests/{request_id}/notes")
async def admin_add_bond_request_note(
    request_id: str,
    body: AdminNoteBody,
    admin_user: dict = Depends(require_admin),
):
    """Interne Notiz (nur für Admins sichtbar)."""
    existing = await _load_request(request_id)
    note = {
        "text": body.text.strip(),
        "created_at": datetime.now(timezone.utc),
        "created_by": admin_user.get("email"),
    }
    result = await db.bond_purchase_requests.find_one_and_update(
        {"_id": existing["_id"]},
        {"$push": {"internal_notes": note}, "$set": {"updated_at": note["created_at"]}},
        return_document=True,
    )
    await write_audit(db, "bond_request", request_id, "note_added", None, {"note": note["text"]}, admin_user)
    return await _serialize_admin(result)


@admin_router.post("/requests/{request_id}/offer")
async def admin_create_bond_offer(
    request_id: str,
    body: AdminOfferBody,
    admin_user: dict = Depends(require_admin),
):
    """Individuelles Kaufangebot hinterlegen — unverbindlich, keine Buchung."""
    existing = await _load_request(request_id)
    if (existing.get("offer") or {}).get("status") in ("accepted", "declined"):
        raise HTTPException(
            status_code=409,
            detail="Der Kunde hat über das bestehende Angebot bereits entschieden — es kann nicht überschrieben werden.",
        )
    if existing.get("status") not in ("pending", "approved"):
        raise HTTPException(
            status_code=409,
            detail=f"Angebot nur für offene oder genehmigte Anfragen — aktuell '{existing.get('status')}'",
        )
    bond = await db.bond_catalog.find_one({"_id": ObjectId(existing["bond_id"])}) if ObjectId.is_valid(existing.get("bond_id") or "") else None
    denom = float((bond or {}).get("denomination") or 0)
    if denom > 0 and abs(body.nominal / denom - round(body.nominal / denom)) > 1e-9:
        raise HTTPException(status_code=400, detail=f"Nominal muss ein Vielfaches der Stückelung ({denom:g} EUR) sein.")
    now = datetime.now(timezone.utc)
    amount = round(body.nominal * body.price_pct / 100, 2)
    accrued = round(body.accrued_interest or 0, 2)
    fees = round(body.fees or 0, 2)
    offer = {
        "price_pct": float(body.price_pct),
        "nominal": float(body.nominal),
        "amount_eur": amount,
        "accrued_interest": accrued if body.accrued_interest is not None else None,
        "fees": fees if body.fees is not None else None,
        "total_cost": round(amount + accrued + fees, 2),
        "valid_until": body.valid_until,
        "message": (body.message or "").strip() or None,
        "status": "offered",
        "admin_seen": True,
        "created_at": now,
        "created_by": admin_user.get("email"),
    }
    result = await db.bond_purchase_requests.find_one_and_update(
        {"_id": existing["_id"]},
        {"$set": {"offer": offer, "updated_at": now}},
        return_document=True,
    )
    await write_audit(db, "bond_request", request_id, "offer_created",
                      {"offer": existing.get("offer")}, {"offer": offer}, admin_user)
    return await _serialize_admin(result)


@admin_router.post("/requests/{request_id}/offer/seen")
async def admin_mark_offer_seen(request_id: str, _admin: dict = Depends(require_admin)):
    doc = await _load_request(request_id)
    if doc.get("offer"):
        await db.bond_purchase_requests.update_one({"_id": doc["_id"]}, {"$set": {"offer.admin_seen": True}})
    return {"ok": True}


@admin_router.get("/requests/{request_id}/audit")
async def admin_bond_request_audit(request_id: str, _admin: dict = Depends(require_admin)):
    await _load_request(request_id)
    return await list_audit(db, "bond_request", request_id)


@admin_router.post("/requests/{request_id}/approve")
async def admin_approve_bond(
    request_id: str,
    body: AdminDecisionBody = AdminDecisionBody(),
    admin_user: dict = Depends(require_admin),
):
    """
    pending → approved. Setzt Status + Audit-Felder.

    NOTE: Erzeugt KEINE Position, belastet KEIN Cash, erzeugt KEINE Order.
    Position-Erzeugung bleibt blockiert durch Portfolio-Migration
    (fehlender Service-Role).
    """
    return await _transition_status(request_id, admin_user, "approved", body)


@admin_router.post("/requests/{request_id}/reject")
async def admin_reject_bond(
    request_id: str,
    body: AdminDecisionBody = AdminDecisionBody(),
    admin_user: dict = Depends(require_admin),
):
    return await _transition_status(request_id, admin_user, "rejected", body)


# ═══════════════════════════════════════════════════════════════════════
# Session 82.30 · Bond Execution
# ═══════════════════════════════════════════════════════════════════════
from decimal import InvalidOperation  # noqa: E402
from services.bond_execution_service import (  # noqa: E402
    execute_bond_request, BondExecError, BondExecCrash,
    ensure_indexes as ensure_bond_exec_indexes,
)


class AdminExecuteBondBody(BaseModel):
    nominal_amount: str = Field(..., description="Nominal als Dezimal-String")
    execution_price_pct: str = Field(..., description="Ausführungskurs in %, Dezimal-String")
    accrued_interest: Optional[str] = None
    fees: Optional[str] = None
    bank_reference: Optional[str] = Field(default=None, max_length=120)
    bank_confirmed_at: Optional[str] = Field(default=None, max_length=40)
    decision_note: Optional[str] = Field(default=None, max_length=500)
    fail_after: Optional[str] = Field(default=None)

    model_config = {"extra": "forbid"}


class AdminBankSubmitBody(BaseModel):
    note: Optional[str] = Field(default=None, max_length=500)
    model_config = {"extra": "forbid"}


@admin_router.post("/requests/{request_id}/bank-submit")
async def admin_bank_submit(request_id: str, body: AdminBankSubmitBody = AdminBankSubmitBody(),
                            admin_user: dict = Depends(require_admin)):
    """Direktorder an Partnerbank übermittelt (Reservierung bleibt bestehen)."""
    existing = await _load_request(request_id)
    if existing.get("order_type") != "direct" or existing.get("status") != "awaiting_bank":
        raise HTTPException(status_code=409, detail="Nur Kaufaufträge mit Status „Wartet auf Bankbestätigung“.")
    now = datetime.now(timezone.utc)
    result = await db.bond_purchase_requests.find_one_and_update(
        {"_id": existing["_id"], "status": "awaiting_bank"},
        {"$set": {"status": "bank_submitted", "bank_submitted_at": now, "updated_at": now,
                  "bank_submit_note": (body.note or "").strip() or None}},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=409, detail="Auftrag wurde parallel geändert")
    await write_audit(db, "bond_request", request_id, "bank_submitted", {"status": "awaiting_bank"},
                      {"status": "bank_submitted", "note": body.note}, admin_user)
    return await _serialize_admin(result)


def _parse_dec(v: str, field: str) -> Decimal:
    try:
        d = Decimal(str(v))
    except (InvalidOperation, TypeError):
        raise HTTPException(status_code=422, detail=f"{field} ist kein gültiger Betrag")
    return d


@admin_router.post("/requests/{request_id}/execute")
async def admin_execute_bond(
    request_id: str,
    body: AdminExecuteBondBody,
    admin_user: dict = Depends(require_admin),
):
    """approved → executed (Session 82.30 · Saga)."""
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request id")
    nom = _parse_dec(body.nominal_amount, "nominal_amount")
    px = _parse_dec(body.execution_price_pct, "execution_price_pct")
    acc = _parse_dec(body.accrued_interest or "0", "accrued_interest")
    fee = _parse_dec(body.fees or "0", "fees")
    try:
        res = await execute_bond_request(
            db, ObjectId(request_id),
            nominal_amount=nom, execution_price_pct=px,
            decision_note=body.decision_note,
            admin_id=str(admin_user.get("id")),
            fail_after=body.fail_after,
            accrued_interest=acc, fees=fee,
            bank_reference=body.bank_reference, bank_confirmed_at=body.bank_confirmed_at,
        )
    except BondExecCrash as exc:
        raise HTTPException(status_code=555, detail=f"[injected-crash] {exc}")
    except BondExecError as exc:
        raise HTTPException(status_code=exc.http_status, detail=f"{exc.code}: {exc.detail}")
    await write_audit(db, "bond_request", request_id, "executed", {"status": "approved"},
                      {"status": "executed", "nominal": str(nom), "price_pct": str(px),
                       "accrued_interest": str(acc), "fees": str(fee),
                       "bank_reference": body.bank_reference, "bank_confirmed_at": body.bank_confirmed_at}, admin_user)
    return res


# ═══════════════════════════════════════════════════════════════════════
# Session 82.90b — Safe Bond-Request Archive (Soft-Delete)
# ═══════════════════════════════════════════════════════════════════════
class AdminBondArchiveBody(BaseModel):
    archive_note: Optional[str] = Field(default=None, max_length=500)
    model_config = {"extra": "forbid"}


@admin_router.post("/requests/{request_id}/archive")
async def admin_archive_bond_request(
    request_id: str,
    body: AdminBondArchiveBody = AdminBondArchiveBody(),
    admin_user: dict = Depends(require_admin),
):
    """Soft-Archive für Bond-Request. Physical-Delete von executed Records
    ist verboten (Audit-Trail-Preservation).

    - Nur `status ∈ {rejected, cancelled}`.
    - Idempotent.
    """
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request id")
    existing = await db.bond_purchase_requests.find_one({"_id": ObjectId(request_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Anfrage nicht gefunden")
    if existing.get("is_archived"):
        return await _serialize_admin(existing)
    if existing.get("status") not in ("rejected", "cancelled"):
        raise HTTPException(
            status_code=409,
            detail=f"Archive nur für rejected/cancelled zulässig — aktuell '{existing.get('status')}'",
        )
    now = datetime.now(timezone.utc)
    result = await db.bond_purchase_requests.find_one_and_update(
        {"_id": ObjectId(request_id), "is_archived": {"$ne": True}},
        {"$set": {
            "is_archived": True,
            "archived_at": now,
            "archived_by": ObjectId(admin_user["id"]),
            "archive_note": (body.archive_note or "").strip()[:500] or None,
            "updated_at": now,
        }},
        return_document=True,
    )
    await write_audit(db, "bond_request", request_id, "archived", None,
                      {"archive_note": (body.archive_note or "").strip()[:500] or None}, admin_user)
    return await _serialize_admin(result or existing)


async def ensure_indexes():
    """Partial-Unique-Index für Duplicate-Guard + Query-Indizes."""
    await db.bond_purchase_requests.create_index(
        [("user_id", 1), ("bond_id", 1)],
        unique=True,
        partialFilterExpression={"status": "pending"},
        name="uniq_pending_user_bond",
    )
    await db.bond_purchase_requests.create_index(
        [("user_id", 1), ("created_at", -1)],
        name="user_created_desc",
    )
    await db.bond_purchase_requests.create_index(
        [("status", 1), ("created_at", -1)],
        name="status_created_desc",
    )
    # Session 82.30 · Bond-Execution-Saga Indizes
    await ensure_bond_exec_indexes(db)
