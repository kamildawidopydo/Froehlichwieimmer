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
from typing import Optional, Literal

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from pymongo.errors import DuplicateKeyError

from server import get_current_user, db, require_admin  # type: ignore[attr-defined]


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
        "isin": doc.get("isin"),
        "kupon_rate": doc.get("kupon_rate"),
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

    # Minimum-Investment prüfen (aus Katalog, nicht aus Client-Payload)
    min_order = bond.get("min_order_eur")
    if min_order and payload.amount_eur < float(min_order):
        raise HTTPException(
            status_code=400,
            detail=f"Mindestinvestition nicht erreicht ({min_order} EUR)",
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
    doc = {
        "user_id": user_oid,
        "bond_id": payload.bond_id,
        # Stammdaten aus dem VALIDIERTEN Katalog, nicht aus Client
        "bond_name": bond.get("bond_name"),
        "isin": bond.get("isin"),
        "kupon_rate": bond.get("kupon_rate"),
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
    base.update({**customer, "handled_by_name": handled_by_name, "backend": "mongo"})
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
        {"_id": ObjectId(request_id), "status": "pending"},
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
    return await _serialize_admin(result)


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
from decimal import Decimal, InvalidOperation  # noqa: E402
from services.bond_execution_service import (  # noqa: E402
    execute_bond_request, BondExecError, BondExecCrash,
    ensure_indexes as ensure_bond_exec_indexes,
)


class AdminExecuteBondBody(BaseModel):
    nominal_amount: str = Field(..., description="Nominal als Dezimal-String")
    execution_price_pct: str = Field(..., description="Ausführungskurs in %, Dezimal-String")
    decision_note: Optional[str] = Field(default=None, max_length=500)
    fail_after: Optional[str] = Field(default=None)

    model_config = {"extra": "forbid"}


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
    try:
        return await execute_bond_request(
            db, ObjectId(request_id),
            nominal_amount=nom, execution_price_pct=px,
            decision_note=body.decision_note,
            admin_id=str(admin_user.get("id")),
            fail_after=body.fail_after,
        )
    except BondExecCrash as exc:
        raise HTTPException(status_code=555, detail=f"[injected-crash] {exc}")
    except BondExecError as exc:
        raise HTTPException(status_code=exc.http_status, detail=f"{exc.code}: {exc.detail}")


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
