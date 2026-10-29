"""
IPO Zeichnungsanfragen — FastAPI/Mongo-native Customer-Write-Pfad.

Kontext:
  Kunden-Requests waren bisher direkter Supabase-INSERT in
  `ipo_subscription_requests`. Weil FastAPI-native User (Mongo-ObjectId)
  keine Supabase-Auth-Session besitzen, blockierte die RLS + FK-Constraint
  jeden Kunden-Write mit HTTP 400.

  Session 82.02 (Schritt 3C):
  - Neue Mongo-Collection `ipo_requests` — Source of Truth für ALLE neuen
    Kunden-Anfragen (Legacy-Tabelle in Supabase bleibt unangetastet).
  - Auth strikt aus `Depends(get_current_user)` → Cookie-JWT.
  - Client darf NICHT setzen: user_id, status, source, handled_*, decision_note.
  - IPO-Validierung READ-ONLY über Supabase REST anon-Key (RLS erlaubt
    SELECT auf ipo_catalog mit is_visible=true für die anon-Rolle).
  - Duplicate-Guard: (user_id, ipo_id, status='pending') unique via partial
    Index + serverseitiger Recheck.
"""

from __future__ import annotations

from datetime import datetime, timezone, date
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from bson.decimal128 import Decimal128
from typing import Optional, Literal

from bson import ObjectId
from fastapi import APIRouter, Body, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from pymongo.errors import DuplicateKeyError

# get_current_user + db aus dem Haupt-Server-Modul; bewusst dynamisch importiert,
# damit dieses Modul ohne Zirkular-Import registrierbar bleibt.
from server import get_current_user, db, require_admin  # type: ignore[attr-defined]

# Session 82.03 — Katalog-Lookup jetzt gegen Mongo-Native `ipo_catalog`,
# nicht mehr gegen Supabase REST.
from routes.ipo_catalog import get_investable_ipo_by_id  # type: ignore[attr-defined]


router = APIRouter(prefix="/api/ipo", tags=["ipo-requests"])


# ─── Pydantic-Models ────────────────────────────────────────────────────
class IpoRequestCreate(BaseModel):
    """Whitelist der Felder, die ein Kunde beim Erstellen setzen darf."""

    ipo_id: str = Field(..., min_length=1, max_length=64)
    amount_eur: Optional[float] = Field(default=None)
    shares_requested: int = Field(..., ge=1)
    notes: Optional[str] = Field(default=None, max_length=2000)

    model_config = {"extra": "forbid"}  # user_id/status/source werden hart abgelehnt

    @field_validator("amount_eur")
    @classmethod
    def _amount_finite(cls, v):
        if v is None:
            return None
        if not isinstance(v, (int, float)) or v != v:  # NaN check
            raise ValueError("amount_eur muss numerisch sein")
        if v <= 0:
            raise ValueError("amount_eur muss > 0 sein")
        return float(v)


class IpoRequestOut(BaseModel):
    id: str
    user_id: str
    ipo_id: str
    company_name: Optional[str]
    ticker: Optional[str]
    amount_eur: Optional[float]
    shares_requested: int
    notes: Optional[str]
    status: Literal["pending", "approved", "rejected", "allocated"]
    source: str
    created_at: str
    updated_at: Optional[str]
    # Session 82.29 · Allocation-Metadaten (nur gesetzt bei status='allocated')
    allocated_shares: Optional[int] = None
    subscription_price_per_share: Optional[str] = None
    listing_price_per_share: Optional[str] = None
    allocation_gross_amount: Optional[str] = None
    allocation_date: Optional[str] = None
    allocation_id: Optional[str] = None
    position_id: Optional[str] = None
    use_admin_valuation: bool = True
    valuation_set_at: Optional[str] = None
    valuation: Optional[dict] = None


_CENT = Decimal("0.01")


def _dec_or_none(v) -> Optional[Decimal]:
    if v is None:
        return None
    try:
        d = v.to_decimal() if hasattr(v, "to_decimal") else Decimal(str(v))
    except (InvalidOperation, TypeError, ValueError):
        return None
    return d if d.is_finite() and d > 0 else None


def _money(d: Optional[Decimal]) -> Optional[str]:
    return str(d.quantize(_CENT, rounding=ROUND_HALF_UP)) if d is not None else None


def compute_ipo_valuation(doc: dict) -> dict:
    """Estimated (unrealised) EUR valuation. Uses allocated shares once allocated.
    Missing price/value/shares -> totals stay None (no fake profit)."""
    allocated = doc.get("status") == "allocated"
    shares = doc.get("allocated_shares") if allocated else doc.get("shares_requested")
    shares = int(shares) if shares else None
    price = _dec_or_none(doc.get("subscription_price_per_share"))
    est = _dec_or_none(doc.get("listing_price_per_share"))
    cost = price * shares if price is not None and shares else None
    total = est * shares if est is not None and shares else None
    profit = total - cost if cost is not None and total is not None else None
    pct = (profit / cost * 100) if profit is not None and cost else None
    return {
        "currency": "EUR",
        "shares": shares,
        "shares_basis": "allocated" if allocated else "requested",
        "purchase_price_per_share": _money(price),
        "estimated_value_per_share": _money(est),
        "total_cost": _money(cost),
        "estimated_total": _money(total),
        "estimated_profit": _money(profit),
        "estimated_return_pct": _money(pct),
        "is_estimate": True,
    }


def _serialize(doc: dict) -> dict:
    ca = doc.get("created_at")
    ua = doc.get("updated_at")
    alloc_at = doc.get("allocation_date")
    return {
        "id": str(doc["_id"]),
        "user_id": str(doc.get("user_id", "")),
        "ipo_id": doc.get("ipo_id"),
        "company_name": doc.get("company_name"),
        "ticker": doc.get("ticker"),
        "amount_eur": doc.get("amount_eur"),
        "shares_requested": int(doc.get("shares_requested", 1)),
        "notes": doc.get("notes"),
        "status": doc.get("status", "pending"),
        "source": doc.get("source", "customer"),
        "created_at": ca.isoformat() if isinstance(ca, datetime) else (ca or ""),
        "updated_at": ua.isoformat() if isinstance(ua, datetime) else ua,
        # Session 82.29 · Allocation-Metadaten (nur wenn gesetzt)
        "allocated_shares": doc.get("allocated_shares"),
        "subscription_price_per_share": (
            str(doc["subscription_price_per_share"].to_decimal())
            if hasattr(doc.get("subscription_price_per_share"), "to_decimal")
            else doc.get("subscription_price_per_share")
        ),
        "listing_price_per_share": (
            str(doc["listing_price_per_share"].to_decimal())
            if hasattr(doc.get("listing_price_per_share"), "to_decimal")
            else doc.get("listing_price_per_share")
        ),
        "allocation_gross_amount": (
            str(doc["allocation_gross_amount"].to_decimal())
            if hasattr(doc.get("allocation_gross_amount"), "to_decimal")
            else doc.get("allocation_gross_amount")
        ),
        "allocation_date": alloc_at.isoformat() if isinstance(alloc_at, datetime) else alloc_at,
        "allocation_id": str(doc.get("allocation_id")) if doc.get("allocation_id") else None,
        "position_id": str(doc.get("position_id")) if doc.get("position_id") else None,
        "use_admin_valuation": doc.get("use_admin_valuation") is not False,
        "valuation_set_at": doc["valuation_set_at"].isoformat()
        if isinstance(doc.get("valuation_set_at"), datetime) else doc.get("valuation_set_at"),
        "valuation": compute_ipo_valuation(doc),
    }


# ─── Katalog-Lookup (Session 82.03: Mongo-native, kein Supabase mehr) ────
async def _fetch_ipo_from_catalog(ipo_id: str) -> dict:
    """
    Lookup gegen Mongo `ipo_catalog`. Delegiert an
    `routes.ipo_catalog.get_investable_ipo_by_id`, das 404 wirft, wenn IPO
    nicht existiert oder is_visible=false ist.
    """
    doc = await get_investable_ipo_by_id(ipo_id)
    # Normalisierung auf gleiches Schema wie zuvor (Supabase-Anon-JSON)
    return {
        "id": str(doc["_id"]),
        "company_name": doc.get("company_name"),
        "ticker_proposed": doc.get("ticker_proposed"),
        "status": doc.get("status", "upcoming"),
        "is_visible": bool(doc.get("is_visible", False)),
        "subscription_start": doc.get("subscription_start"),
        "subscription_end": doc.get("subscription_end"),
        "ipo_date": doc.get("ipo_date"),
        "min_investment_eur": doc.get("min_investment_eur"),
        "lot_size": int(doc.get("lot_size", 1)),
        "price_currency": doc.get("price_currency", "EUR"),
    }


# ─── Endpoints ──────────────────────────────────────────────────────────
@router.get("/requests/me", response_model=list[IpoRequestOut])
async def list_my_requests(user: dict = Depends(get_current_user)):
    """Nur eigene Anfragen des aktuell authentifizierten Users."""
    user_oid = ObjectId(user["id"])
    cursor = db.ipo_requests.find({"user_id": user_oid}).sort("created_at", -1)
    return [_serialize(doc) async for doc in cursor]


@router.post("/requests", response_model=IpoRequestOut, status_code=201)
async def create_request(
    payload: IpoRequestCreate,
    request: Request,
    user: dict = Depends(get_current_user),
):
    """
    Kunden-Write. user_id/status/source werden serverseitig gesetzt.
    """
    # 1) IPO validieren gegen Supabase-Katalog (anon-Read, RLS-safe)
    ipo = await _fetch_ipo_from_catalog(payload.ipo_id)
    if not ipo.get("is_visible"):
        raise HTTPException(status_code=400, detail="IPO nicht sichtbar")
    if ipo.get("status") in ("listed", "cancelled", "planned", "unavailable"):
        raise HTTPException(
            status_code=400,
            detail=f"IPO-Status '{ipo.get('status')}' nicht zeichenbar",
        )

    # Zeichnungsfenster prüfen (nur wenn gesetzt)
    today = date.today()
    sub_start = ipo.get("subscription_start")
    sub_end = ipo.get("subscription_end")
    if sub_start:
        try:
            if date.fromisoformat(sub_start) > today:
                raise HTTPException(
                    status_code=400,
                    detail="Zeichnungsfenster noch nicht geöffnet",
                )
        except ValueError:
            pass
    if sub_end:
        try:
            if date.fromisoformat(sub_end) < today:
                raise HTTPException(
                    status_code=400, detail="Zeichnungsfenster abgelaufen"
                )
        except ValueError:
            pass

    # 2) Business-Rules
    min_invest = ipo.get("min_investment_eur")
    if (
        min_invest
        and payload.amount_eur is not None
        and payload.amount_eur < float(min_invest)
    ):
        raise HTTPException(
            status_code=400,
            detail=f"Mindestinvestition nicht erreicht ({min_invest} EUR)",
        )
    lot_size = int(ipo.get("lot_size") or 1)
    if lot_size > 1 and payload.shares_requested % lot_size != 0:
        raise HTTPException(
            status_code=400,
            detail=f"Stückzahl muss Vielfaches der Losgröße ({lot_size}) sein",
        )

    # 3) Duplicate-Guard (partial-Index deckt Race Condition ab)
    existing = await db.ipo_requests.find_one(
        {
            "user_id": ObjectId(user["id"]),
            "ipo_id": payload.ipo_id,
            "status": "pending",
        }
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Für diesen Börsengang besteht bereits eine offene Investitionsanfrage.",
        )

    # 4) Insert — user_id/status/source serverseitig
    now = datetime.now(timezone.utc)
    doc = {
        "user_id": ObjectId(user["id"]),
        "ipo_id": payload.ipo_id,
        # company_name/ticker aus dem VALIDIERTEN Katalog, nicht aus Client-Payload
        "company_name": ipo.get("company_name"),
        "ticker": ipo.get("ticker_proposed"),
        "amount_eur": payload.amount_eur,
        "shares_requested": int(payload.shares_requested),
        "notes": (payload.notes or "").strip() or None,
        "status": "pending",
        "source": "customer",
        "created_at": now,
        "updated_at": now,
    }
    try:
        result = await db.ipo_requests.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail="Für diesen Börsengang besteht bereits eine offene Investitionsanfrage.",
        )
    doc["_id"] = result.inserted_id
    return _serialize(doc)


async def ensure_indexes():
    """Partial-Unique-Index für Duplicate-Guard (idempotent)."""
    await db.ipo_requests.create_index(
        [("user_id", 1), ("ipo_id", 1)],
        unique=True,
        partialFilterExpression={"status": "pending"},
        name="uniq_pending_user_ipo",
    )
    await db.ipo_requests.create_index([("user_id", 1), ("created_at", -1)])
    # Session 82.29 · IPO-Allocation-Indizes
    await ensure_allocation_indexes(db)


# ─── ADMIN ENDPOINTS (Schritt 4) ────────────────────────────────────────
class AdminDecisionBody(BaseModel):
    decision_note: Optional[str] = Field(default=None, max_length=2000)
    model_config = {"extra": "forbid"}


admin_router = APIRouter(prefix="/api/admin/ipo", tags=["admin-ipo-requests"])


async def _serialize_with_customer(doc: dict) -> dict:
    """Serialize inkl. serverseitig aufgelöster Kundendaten."""
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
                    " ".join(
                        x for x in (hb.get("first_name"), hb.get("last_name")) if x
                    ).strip()
                    or hb.get("name")
                    or hb.get("email")
                )
        except Exception:
            pass
    base.update(
        {
            **customer,
            "decision_note": doc.get("decision_note"),
            "handled_at": doc["handled_at"].isoformat()
            if isinstance(doc.get("handled_at"), datetime)
            else doc.get("handled_at"),
            "handled_by": str(doc["handled_by"]) if doc.get("handled_by") else None,
            "handled_by_name": handled_by_name,
            "backend": "mongo",
        }
    )
    return base


@admin_router.get("/requests")
async def admin_list_requests(_admin: dict = Depends(require_admin)):
    """Alle Mongo-native IPO-Zeichnungsanfragen (customer-created)."""
    cursor = db.ipo_requests.find({}).sort("created_at", -1)
    return [await _serialize_with_customer(doc) async for doc in cursor]


async def _transition_status(
    request_id: str,
    admin_user: dict,
    to_status: str,
    body: AdminDecisionBody,
) -> dict:
    """Atomarer pending→approved|rejected Übergang (idempotent per findOneAndUpdate)."""
    if to_status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Invalid target status")
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

    # Atomar: nur wenn Request derzeit noch pending → verhindert Double-Approve/Reject.
    result = await db.ipo_requests.find_one_and_update(
        {"_id": ObjectId(request_id), "status": "pending"},
        update_doc,
        return_document=True,  # ReturnDocument.AFTER
    )
    if not result:
        existing = await db.ipo_requests.find_one({"_id": ObjectId(request_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Anfrage nicht gefunden")
        raise HTTPException(
            status_code=409,
            detail=f"Anfrage bereits '{existing.get('status')}' — kein weiterer Übergang möglich",
        )
    return await _serialize_with_customer(result)


@admin_router.post("/requests/{request_id}/approve")
async def admin_approve(
    request_id: str,
    body: AdminDecisionBody = AdminDecisionBody(),
    admin_user: dict = Depends(require_admin),
):
    """
    pending → approved. Setzt Status + Audit-Felder.

    NOTE (Schritt 4 Blocker-Dokumentation): Die Erzeugung einer Depotposition
    bei Approve ist in dieser Iteration NICHT vorgesehen, da das Portfolio-
    Model derzeit in Supabase liegt und Position-Writes ohne Service-Role
    RLS-blockiert wären. Die Depot-Position-Erstellung wird in einem
    Folgeschritt (nach Portfolio-Migration / Service-Role) implementiert.
    Der bestehende Legacy-Approve→Position-Trigger auf Supabase greift NICHT
    für Mongo-native Requests, da diese nicht in ipo_subscription_requests
    liegen.
    """
    return await _transition_status(request_id, admin_user, "approved", body)


@admin_router.post("/requests/{request_id}/reject")
async def admin_reject(
    request_id: str,
    body: AdminDecisionBody = AdminDecisionBody(),
    admin_user: dict = Depends(require_admin),
):
    """pending → rejected. Setzt Status + Audit-Felder. Keine Position."""
    return await _transition_status(request_id, admin_user, "rejected", body)


# ═══════════════════════════════════════════════════════════════════════
# Session 82.29 · IPO Allocation
# ═══════════════════════════════════════════════════════════════════════
from services.ipo_allocation_service import (  # noqa: E402
    allocate_ipo_request, AllocationError, AllocationCrash,
    ensure_indexes as ensure_allocation_indexes,
)


class AdminAllocateBody(BaseModel):
    allocated_shares: int = Field(..., gt=0)
    subscription_price_per_share: str = Field(..., description="Positiver Dezimalbetrag als String")
    listing_price_per_share: Optional[str] = Field(default=None)
    decision_note: Optional[str] = Field(default=None, max_length=500)
    fail_after: Optional[str] = Field(default=None, description="test-only: 'cash'|'position'|'settle'")

    model_config = {"extra": "forbid"}


def _parse_dec(v: str, field: str) -> Decimal:
    if v is None:
        raise HTTPException(status_code=422, detail=f"{field} fehlt")
    try:
        d = Decimal(str(v))
    except (InvalidOperation, TypeError):
        raise HTTPException(status_code=422, detail=f"{field} ist kein gültiger Betrag")
    if d != d:
        raise HTTPException(status_code=422, detail=f"{field} ist NaN")
    return d


@admin_router.post("/requests/{request_id}/allocate")
async def admin_allocate(
    request_id: str,
    body: AdminAllocateBody,
    admin_user: dict = Depends(require_admin),
):
    """
    approved → allocated (Session 82.29 · Saga).
    Delegiert an `services.ipo_allocation_service.allocate_ipo_request`.
    """
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request id")
    sub = _parse_dec(body.subscription_price_per_share, "subscription_price_per_share")
    listing = _parse_dec(body.listing_price_per_share, "listing_price_per_share") \
        if body.listing_price_per_share is not None else None
    try:
        return await allocate_ipo_request(
            db,
            ObjectId(request_id),
            allocated_shares=body.allocated_shares,
            subscription_price_per_share=sub,
            listing_price_per_share=listing,
            decision_note=body.decision_note,
            admin_id=str(admin_user.get("id")),
            fail_after=body.fail_after,
        )
    except AllocationCrash as exc:
        raise HTTPException(status_code=555, detail=f"[injected-crash] {exc}")
    except AllocationError as exc:
        raise HTTPException(status_code=exc.http_status, detail=f"{exc.code}: {exc.detail}")


# ═══════════════════════════════════════════════════════════════════════
# Session 82.90b — Safe Admin-Financial Backend Enablement
# ═══════════════════════════════════════════════════════════════════════
class AdminIpoValuationUpdate(BaseModel):
    """Whitelist der Bewertungs-Metadaten (EUR). listing_price_per_share = aktuell
    geschätzter Wert je Aktie. Keine Buchung, keine Positions-/Cash-Änderung."""
    subscription_price_per_share: Optional[str] = Field(default=None)
    listing_price_per_share: Optional[str] = Field(default=None)
    use_admin_valuation: Optional[bool] = Field(default=None)
    decision_note: Optional[str] = Field(default=None, max_length=500)
    model_config = {"extra": "forbid"}


def _positive_dec(v: str, field: str) -> Decimal:
    d = _parse_dec(str(v).strip().replace(",", "."), field)
    if not d.is_finite() or d <= 0:
        raise HTTPException(status_code=422, detail=f"{field} muss größer als 0 sein")
    return d.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)


@admin_router.patch("/requests/{request_id}/valuation")
async def admin_update_ipo_valuation(
    request_id: str,
    body: AdminIpoValuationUpdate,
    admin_user: dict = Depends(require_admin),
):
    """PATCH auf Bewertungs-Metadaten (nur ipo_requests; keine Cash-/Positions-Buchung).

    - pending/approved: Kaufpreis + geschätzter Wert änderbar.
    - allocated: nur geschätzter Wert (Kaufpreis ist durch die Zuteilung gebucht).
    - rejected/cancelled: 409.
    """
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request id")
    if all(v is None for v in (body.subscription_price_per_share, body.listing_price_per_share,
                                body.use_admin_valuation, body.decision_note)):
        raise HTTPException(status_code=422, detail="Kein Feld zum Aktualisieren angegeben")
    existing = await db.ipo_requests.find_one({"_id": ObjectId(request_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Anfrage nicht gefunden")
    status = existing.get("status")
    if status not in ("pending", "approved", "allocated"):
        raise HTTPException(status_code=409,
                            detail=f"Bewertung in Status '{status}' nicht änderbar")
    now = datetime.now(timezone.utc)
    updates: dict = {"updated_at": now}
    if body.subscription_price_per_share is not None:
        sub = _positive_dec(body.subscription_price_per_share, "subscription_price_per_share")
        if status == "allocated":
            if _dec_or_none(existing.get("subscription_price_per_share")) != sub:
                raise HTTPException(
                    status_code=409,
                    detail="Der IPO-Kaufpreis ist durch die Zuteilung gebucht und kann nicht mehr geändert werden.",
                )
        else:
            updates["subscription_price_per_share"] = Decimal128(sub)
    if body.listing_price_per_share is not None:
        updates["listing_price_per_share"] = Decimal128(
            _positive_dec(body.listing_price_per_share, "listing_price_per_share"))
        updates["valuation_set_at"] = now
    if body.use_admin_valuation is not None:
        updates["use_admin_valuation"] = body.use_admin_valuation
    if body.decision_note is not None:
        updates["decision_note"] = body.decision_note.strip() or None
    history = {"at": now, "by": ObjectId(admin_user["id"]),
               "subscription_price_per_share": updates.get("subscription_price_per_share"),
               "listing_price_per_share": updates.get("listing_price_per_share")}
    result = await db.ipo_requests.find_one_and_update(
        {"_id": ObjectId(request_id), "status": status},
        {"$set": updates, "$push": {"valuation_history": history}},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=409, detail="Anfrage wurde parallel geändert")
    return await _serialize_with_customer(result)


class AdminIpoCreateForUserBody(BaseModel):
    """Admin erstellt eine IPO-Zeichnungsanfrage im Namen eines Users.

    Whitelist: keine client-controlled ID/Status/Allocation-States.
    """
    user_id: str = Field(..., min_length=1, max_length=64)
    ipo_id: str = Field(..., min_length=1, max_length=64)
    shares_requested: int = Field(..., ge=1)
    amount_eur: Optional[float] = Field(default=None)
    notes: Optional[str] = Field(default=None, max_length=2000)
    model_config = {"extra": "forbid"}


@admin_router.post("/requests/create-for-user", status_code=201)
async def admin_create_ipo_request_for_user(
    body: AdminIpoCreateForUserBody,
    admin_user: dict = Depends(require_admin),
):
    """Admin erstellt eine IPO-Request im Namen eines Kunden.

    - Status server-authoritative auf `pending`.
    - Duplicate-Guard: (user_id, ipo_id, pending) unique via partial index.
    - Keine direkte Allocation. Keine Position-Erzeugung.
    - `source='admin'` für Audit-Unterscheidung.
    """
    if not ObjectId.is_valid(body.user_id):
        raise HTTPException(status_code=422, detail="Ungültige user_id")
    user = await db.users.find_one({"_id": ObjectId(body.user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User nicht gefunden")
    ipo = await _fetch_ipo_from_catalog(body.ipo_id)
    if not ipo.get("is_visible"):
        raise HTTPException(status_code=409, detail="IPO nicht zeichenbar")
    now = datetime.now(timezone.utc)
    doc = {
        "user_id": ObjectId(body.user_id),
        "ipo_id": body.ipo_id,
        "company_name": ipo.get("company_name"),
        "ticker": ipo.get("ticker_proposed"),
        "amount_eur": body.amount_eur,
        "shares_requested": body.shares_requested,
        "notes": body.notes,
        "status": "pending",
        "source": "admin",
        "created_by": ObjectId(admin_user["id"]),
        "created_at": now,
        "updated_at": now,
    }
    try:
        result = await db.ipo_requests.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail="Für diesen User existiert bereits eine pending-Anfrage zu diesem IPO.",
        )
    inserted = await db.ipo_requests.find_one({"_id": result.inserted_id})
    return await _serialize_with_customer(inserted)


class AdminArchiveBody(BaseModel):
    archive_note: Optional[str] = Field(default=None, max_length=500)
    model_config = {"extra": "forbid"}


@admin_router.post("/requests/{request_id}/archive")
async def admin_archive_ipo_request(
    request_id: str,
    body: AdminArchiveBody = Body(default_factory=AdminArchiveBody),
    admin_user: dict = Depends(require_admin),
):
    """Soft-Archive: setzt `is_archived=True + archived_at`. Physical Delete
    von audit-relevanten Financial-Records ist verboten.

    - Nur wenn `status ∈ {rejected, cancelled}` — ausgeführte/pending Requests
      dürfen nicht archiviert werden (Audit-Trail muss sichtbar bleiben).
    - Idempotent: erneuter Aufruf auf bereits archivierten Request → 200 no-op.
    """
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request id")
    existing = await db.ipo_requests.find_one({"_id": ObjectId(request_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Anfrage nicht gefunden")
    if existing.get("is_archived"):
        return await _serialize_with_customer(existing)
    if existing.get("status") not in ("rejected", "cancelled"):
        raise HTTPException(
            status_code=409,
            detail=f"Archive nur für rejected/cancelled zulässig — aktuell '{existing.get('status')}'",
        )
    now = datetime.now(timezone.utc)
    result = await db.ipo_requests.find_one_and_update(
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
    return await _serialize_with_customer(result or existing)
