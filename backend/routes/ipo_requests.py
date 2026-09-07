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

import os
from datetime import datetime, timezone, date
from typing import Optional, Literal

import httpx
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from pymongo.errors import DuplicateKeyError

# get_current_user + db aus dem Haupt-Server-Modul; bewusst dynamisch importiert,
# damit dieses Modul ohne Zirkular-Import registrierbar bleibt.
from server import get_current_user, db, require_admin  # type: ignore[attr-defined]


router = APIRouter(prefix="/api/ipo", tags=["ipo-requests"])


# ─── Konfiguration ──────────────────────────────────────────────────────
SUPABASE_URL = os.environ.get("REACT_APP_SUPABASE_URL") or os.environ.get(
    "SUPABASE_URL"
)
SUPABASE_ANON_KEY = os.environ.get("REACT_APP_SUPABASE_ANON_KEY") or os.environ.get(
    "SUPABASE_ANON_KEY"
)


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
    status: Literal["pending", "approved", "rejected"]
    source: str
    created_at: str
    updated_at: Optional[str]


def _serialize(doc: dict) -> dict:
    ca = doc.get("created_at")
    ua = doc.get("updated_at")
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
    }


# ─── Supabase READ-ONLY IPO-Lookup (anon-Key, RLS-safe) ──────────────────
async def _fetch_ipo_from_catalog(ipo_id: str) -> dict:
    """
    Read-only Lookup gegen Supabase `ipo_catalog` mit anon-Key.
    Die RLS-Policy erlaubt SELECT für die anon-Rolle nur für is_visible=true —
    das ist genau die fachliche Sichtbarkeitsprüfung, die wir brauchen.
    """
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise HTTPException(status_code=503, detail="IPO-Katalog nicht erreichbar")

    async with httpx.AsyncClient(timeout=8.0) as client:
        try:
            resp = await client.get(
                f"{SUPABASE_URL.rstrip('/')}/rest/v1/ipo_catalog",
                params={
                    "id": f"eq.{ipo_id}",
                    "select": "id,company_name,ticker_proposed,status,is_visible,"
                    "subscription_start,subscription_end,ipo_date,min_investment_eur,"
                    "lot_size,price_currency",
                    "limit": "1",
                },
                headers={
                    "apikey": SUPABASE_ANON_KEY,
                    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                    "Accept": "application/json",
                },
            )
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=503, detail=f"IPO-Katalog nicht erreichbar: {exc}"
            ) from exc

    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"IPO-Katalog Fehler ({resp.status_code})",
        )
    rows = resp.json() or []
    if not rows:
        # anon-RLS zeigt nur is_visible=true — 0 rows == existiert nicht ODER
        # nicht sichtbar. Beides fachlich „nicht zeichenbar".
        raise HTTPException(
            status_code=404, detail="IPO nicht gefunden oder nicht sichtbar"
        )
    return rows[0]


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
    if ipo.get("status") in ("listed", "cancelled"):
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
            detail="Für diesen Börsengang besteht bereits eine offene Zeichnungsanfrage.",
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
            detail="Für diesen Börsengang besteht bereits eine offene Zeichnungsanfrage.",
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
