"""
Portfolio Read-Layer — FastAPI/Mongo-native (Session 82.17 · Depot Phase 1).

READ-ONLY. Kein Cash-Write, keine Position-Erzeugung, keine IPO-/Bond-Allocation.

Zielsetzung: Frontend liest ausschließlich über diese Endpunkte statt direkt
gegen Supabase. Damit endet die Identity-Diskontinuität (Mongo-ObjectId gegen
Supabase-UUID-Filter → 0 Rows) und der Dashboard-Fehlerbanner verschwindet
bei sauberem Empty-State.

Endpunkte (alle require_current_user):
  GET /api/portfolio/summary
  GET /api/portfolio/stock-positions
  GET /api/portfolio/bond-positions
  GET /api/portfolio/orders
  GET /api/portfolio/cash
  GET /api/portfolio/watchlist
  GET /api/portfolio/alerts
  GET /api/portfolio/snapshots

Ownership: `user_id = ObjectId(current_user["id"])` — serverseitig gebunden,
niemals aus Client-Query. Cross-User-Read unmöglich.

Empty-State-Vertrag: fehlende Daten liefern 200 mit `[]` oder mathematischen
Zero-Werten. KEINE Fake-Positionen, keine erfundenen Preise, keine synthetische
Performance.
"""

from __future__ import annotations

import asyncio
import re
from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_EVEN, InvalidOperation
from typing import Optional

from bson import ObjectId
from bson.decimal128 import Decimal128
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel, Field

from server import get_current_user, db, require_admin  # type: ignore[attr-defined]

# Session 82.18 · Depot Phase 2 — Cash-Ledger als Source of Truth
from services.cash_service import (  # noqa: E402
    get_cash_summary,
    get_cash_history,
    create_cash_event,
    ensure_indexes as ensure_cash_indexes,
    ALLOWED_CURRENCIES,
)


router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])
admin_router = APIRouter(prefix="/api/admin/portfolio", tags=["admin-portfolio"])


# ─── Helpers ─────────────────────────────────────────────────────────────
def _oid(user: dict) -> ObjectId:
    """Extrahiert Mongo-ObjectId aus dem eingeloggten User."""
    return ObjectId(user["id"])


def _user_filter(user: dict) -> dict:
    """
    Ownership-Filter. Kompatibel zu Legacy-Rows, die `user_id` als STRING
    persistieren (bestehende watchlists/stock_alerts vor Session 82.17).
    Sync-Writes ab Phase 2 verwenden ausschließlich ObjectId — dieser
    `$or`-Filter bleibt jedoch defensiv erhalten, bis eine explizite
    Normalisierung erfolgt.
    """
    oid = ObjectId(user["id"])
    return {"$or": [{"user_id": oid}, {"user_id": str(oid)}]}


def _iso(v):
    return v.isoformat() if isinstance(v, datetime) else v


def _num(v, default=0.0) -> float:
    """Sicheres Float-Cast; None/NaN → default."""
    if v is None:
        return default
    try:
        f = float(v)
    except (TypeError, ValueError):
        return default
    if f != f:  # NaN
        return default
    return f


def _serialize_position(doc: dict, kind: str) -> dict:
    """Kompakter Serializer für stock/bond Positionen (Empty-tolerant)."""
    return {
        "id": str(doc["_id"]),
        "kind": kind,
        "symbol": doc.get("symbol"),
        "isin": doc.get("isin"),
        "name": doc.get("name") or doc.get("bond_name"),
        "quantity": _num(doc.get("quantity")) if kind == "stock" else None,
        "nominal_betrag": _num(doc.get("nominal_betrag")) if kind == "bond" else None,
        "avg_cost": _num(doc.get("avg_cost")),
        "aktueller_kurs": _num(doc.get("aktueller_kurs")) if kind == "bond" else None,
        "currency": doc.get("currency") or "EUR",
        "is_active": bool(doc.get("is_active", True)),
        "created_at": _iso(doc.get("created_at")),
        "updated_at": _iso(doc.get("updated_at")),
    }


def _serialize_order(doc: dict) -> dict:
    def _amt(v):
        if v is None:
            return None
        if isinstance(v, Decimal128):
            return format(v.to_decimal(), "f")
        return str(v)
    return {
        "id": str(doc["_id"]),
        "symbol": doc.get("symbol"),
        "side": doc.get("side"),
        "order_type": doc.get("order_type"),
        "quantity": _num(doc.get("quantity")),
        "requested_price": _amt(doc.get("limit_price")) if doc.get("limit_price") is not None else (
            _amt(doc.get("requested_price")) if doc.get("requested_price") is not None else None
        ),
        "limit_price": _amt(doc.get("limit_price")) if doc.get("limit_price") is not None else None,
        "executed_price": _amt(doc.get("executed_price")) if doc.get("executed_price") is not None else None,
        "reserved_cash": _amt(doc.get("reserved_cash")) if doc.get("reserved_cash") is not None else None,
        "status": doc.get("status", "pending"),
        "currency": doc.get("currency") or "EUR",
        "created_at": _iso(doc.get("created_at")),
        "updated_at": _iso(doc.get("updated_at")),
        "executed_at": _iso(doc.get("executed_at")),
        "cancelled_at": _iso(doc.get("cancelled_at")),
    }


def _serialize_cash_tx(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "amount": _num(doc.get("amount")),
        "type": doc.get("type"),
        "description": doc.get("description"),
        "balance_after": _num(doc.get("balance_after")) if doc.get("balance_after") is not None else None,
        "created_at": _iso(doc.get("created_at")),
    }


def _serialize_watchlist(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "symbol": doc.get("symbol"),
        "asset_type": doc.get("asset_type", "stock"),
        "display_name": doc.get("display_name"),
        "sort_order": doc.get("sort_order"),
        "created_at": _iso(doc.get("created_at")),
    }


def _serialize_alert(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "symbol": doc.get("symbol"),
        "alert_type": doc.get("alert_type"),
        "threshold": _num(doc.get("threshold")) if doc.get("threshold") is not None else None,
        "channel": doc.get("channel"),
        "is_active": bool(doc.get("is_active", True)),
        "last_triggered_at": _iso(doc.get("last_triggered_at")),
        "created_at": _iso(doc.get("created_at")),
    }


def _serialize_snapshot(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "snapshot_date": doc.get("snapshot_date"),
        "total_value": _num(doc.get("total_value")),
        "cash_value": _num(doc.get("cash_value")),
        "stock_value": _num(doc.get("stock_value")),
        "bond_value": _num(doc.get("bond_value")),
    }


# ─── Endpoints ───────────────────────────────────────────────────────────
@router.get("/stock-positions")
async def list_stock_positions(user: dict = Depends(get_current_user)):
    cursor = db.stock_positions.find(_user_filter(user)).sort("updated_at", -1)
    return [_serialize_position(doc, "stock") async for doc in cursor]


@router.get("/bond-positions")
async def list_bond_positions(user: dict = Depends(get_current_user)):
    cursor = db.bond_positions.find(_user_filter(user)).sort("updated_at", -1)
    return [_serialize_position(doc, "bond") async for doc in cursor]


@router.get("/orders")
async def list_orders(
    limit: int = 50,
    user: dict = Depends(get_current_user),
):
    limit = max(1, min(int(limit or 50), 200))
    cursor = db.stock_orders.find(_user_filter(user)).sort("created_at", -1).limit(limit)
    return [_serialize_order(doc) async for doc in cursor]


@router.get("/cash")
async def get_cash(
    history_limit: int = 100,
    user: dict = Depends(get_current_user),
):
    """
    Cash-Read (Session 82.18 · Depot Phase 2 · Ledger-basiert).

    Balance = Σ settled credits − Σ settled debits (aus `cash_ledger`).
    Kein `users.cash_balance`-Feld mehr als Source of Truth.
    Empty-State: alle Werte 0.00, history=[].
    """
    history_limit = max(1, min(int(history_limit or 100), 500))
    summary = await get_cash_summary(db, user)
    history = await get_cash_history(db, user, history_limit)
    return {
        "cash_balance": float(summary["balance"]),
        "cash_available": float(summary["available"]),
        "cash_unsettled": float(summary["unsettled"]),
        "buying_power": float(summary["available"]),
        "currency": summary["currency"],
        "history": history,
        "settlements": [],
    }


@router.get("/watchlist")
async def list_watchlist(user: dict = Depends(get_current_user)):
    cursor = db.watchlists.find(_user_filter(user)).sort(
        [("sort_order", 1), ("created_at", -1)]
    )
    return [_serialize_watchlist(doc) async for doc in cursor]


@router.get("/alerts")
async def list_alerts(user: dict = Depends(get_current_user)):
    # Bestehende Collection ist `stock_alerts`
    cursor = db.stock_alerts.find(_user_filter(user)).sort("created_at", -1)
    return [_serialize_alert(doc) async for doc in cursor]


@router.get("/snapshots")
async def list_snapshots(
    days: int = 400,
    user: dict = Depends(get_current_user),
):
    """
    Portfolio-Snapshots (Mongo-native). Aktuell keine Generator-Implementierung —
    liefert bestehende Rows, falls Historie existiert; sonst leere Liste.
    """
    days = max(1, min(int(days or 400), 730))
    # Cut-off als ISO YYYY-MM-DD gegen `snapshot_date` (String) matchen
    from datetime import date, timedelta
    from_date = (date.today() - timedelta(days=days)).isoformat()
    ownership = _user_filter(user)
    query = {**ownership, "snapshot_date": {"$gte": from_date}} if "$or" not in ownership else {
        "$and": [ownership, {"snapshot_date": {"$gte": from_date}}]
    }
    cursor = db.portfolio_snapshots.find(query).sort("snapshot_date", 1)
    return [_serialize_snapshot(doc) async for doc in cursor]


@router.get("/summary")
async def get_summary(user: dict = Depends(get_current_user)):
    """
    Aggregierter Depot-Zustand aus Mongo-nativen Quellen.
    Bei fehlenden Daten mathematisch korrekter Zero-State.
    """
    uid = _oid(user)
    ownership = _user_filter(user)

    # Cash aus Ledger (Session 82.18 — single Source of Truth)
    cash_summary = await get_cash_summary(db, user)
    cash_balance = float(cash_summary["balance"])
    cash_available = float(cash_summary["available"])
    cash_unsettled = float(cash_summary["unsettled"])

    # Stock-Wert = sum(quantity * avg_cost) — Preise-Bereich kommt in Phase 2.
    stock_agg = db.stock_positions.aggregate([
        {"$match": {**ownership, "is_active": {"$ne": False}}},
        {"$group": {
            "_id": None,
            "einstand": {"$sum": {"$multiply": [
                {"$ifNull": ["$quantity", 0]},
                {"$ifNull": ["$avg_cost", 0]},
            ]}},
            "positions": {"$sum": 1},
        }},
    ])
    stock_einstand = 0.0
    stock_positions_count = 0
    async for row in stock_agg:
        stock_einstand = _num(row.get("einstand"))
        stock_positions_count = int(row.get("positions") or 0)

    # Bond-Wert
    bond_agg = db.bond_positions.aggregate([
        {"$match": {**ownership, "is_active": {"$ne": False}}},
        {"$group": {
            "_id": None,
            "wert": {"$sum": {"$multiply": [
                {"$ifNull": ["$nominal_betrag", 0]},
                {"$divide": [{"$ifNull": ["$aktueller_kurs", 100]}, 100]},
            ]}},
            "positions": {"$sum": 1},
        }},
    ])
    bond_wert = 0.0
    bond_positions_count = 0
    async for row in bond_agg:
        bond_wert = _num(row.get("wert"))
        bond_positions_count = int(row.get("positions") or 0)

    # Empty-State fallback: keine market_value bekannt → market_value = einstand
    stock_market_value = stock_einstand
    invested = stock_einstand + bond_wert
    total_value = cash_balance + stock_market_value + bond_wert
    profit_loss = 0.0
    profit_loss_pct = 0.0

    return {
        "total_value": total_value,
        "invested": invested,
        "cash": {
            "balance": cash_balance,
            "available": cash_available,
            "unsettled": cash_unsettled,
        },
        "stocks": {
            "market_value": stock_market_value,
            "cost_basis": stock_einstand,
            "positions": stock_positions_count,
        },
        "bonds": {
            "market_value": bond_wert,
            "positions": bond_positions_count,
        },
        "profit_loss": profit_loss,
        "profit_loss_pct": profit_loss_pct,
        # Phase 2 wird tagesbezogene Performance liefern.
        "day_change": 0.0,
        "day_change_pct": 0.0,
    }


# ─── ADMIN Cash Endpoints (Session 82.18 · Phase 2) ─────────────────────
class AdminCashDepositIn(BaseModel):
    user_id: str = Field(..., min_length=8, max_length=64)
    amount: str = Field(..., description="Positiver Dezimalbetrag als String")
    currency: str = Field(default="EUR", max_length=8)
    description: Optional[str] = Field(default=None, max_length=500)
    idempotency_key: str = Field(..., min_length=8, max_length=200)

    model_config = {"extra": "forbid"}


class AdminCashAdjustmentIn(BaseModel):
    user_id: str = Field(..., min_length=8, max_length=64)
    direction: str = Field(..., description="'credit' oder 'debit'")
    amount: str = Field(...)
    currency: str = Field(default="EUR", max_length=8)
    reason: str = Field(..., min_length=3, max_length=500)
    idempotency_key: str = Field(..., min_length=8, max_length=200)

    model_config = {"extra": "forbid"}


async def _resolve_target_user(target_user_id: str) -> ObjectId:
    try:
        oid = ObjectId(target_user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ungültige user_id")
    exists = await db.users.find_one({"_id": oid}, projection={"_id": 1})
    if not exists:
        raise HTTPException(status_code=404, detail="Zieluser existiert nicht")
    return oid


@admin_router.post("/cash/deposit")
async def admin_deposit_cash(
    payload: AdminCashDepositIn = Body(...),
    admin: dict = Depends(require_admin),
):
    """
    Admin-Cash-Einzahlung. Schreibt genau EIN append-only Ledger-Event.
    Idempotent per `(user_id, idempotency_key)`. Kein direkter Balance-Set.
    """
    await _resolve_target_user(payload.user_id)
    try:
        result = await create_cash_event(
            db,
            user_id=payload.user_id,
            event_type="deposit",
            direction="credit",
            amount=payload.amount,
            currency=payload.currency,
            status="settled",
            idempotency_key=payload.idempotency_key,
            description=payload.description or "Admin-Einzahlung",
            source="admin",
            created_by=str(admin.get("id")),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return result


@admin_router.post("/cash/adjustment")
async def admin_adjust_cash(
    payload: AdminCashAdjustmentIn = Body(...),
    admin: dict = Depends(require_admin),
):
    """
    Manuelle Cash-Korrektur (z. B. für Reversal einer Test-Einzahlung).
    Erzeugt genau EIN Ledger-Event mit type=adjustment.
    """
    await _resolve_target_user(payload.user_id)
    try:
        result = await create_cash_event(
            db,
            user_id=payload.user_id,
            event_type="adjustment",
            direction=payload.direction,
            amount=payload.amount,
            currency=payload.currency,
            status="settled",
            idempotency_key=payload.idempotency_key,
            description=payload.reason,
            source="admin",
            created_by=str(admin.get("id")),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return result


@admin_router.get("/cash/summary")
async def admin_cash_summary_for_user(
    user_id: str,
    _admin: dict = Depends(require_admin),
):
    """Admin-Read: Cash-Summary für beliebigen Kunden (nur Read)."""
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ungültige user_id")
    fake_user = {"id": str(oid)}
    return await get_cash_summary(db, fake_user)


# ═══════════════════════════════════════════════════════════════════════
# SESSION 82.19 · Phase 3 — Write-Layer: Watchlist / Alerts / Orders
# ═══════════════════════════════════════════════════════════════════════

_SYMBOL_RE = re.compile(r"^[A-Z0-9.\-]{1,12}$")

# Per-User Order-Lock (Same-Instance-Serialization für parallele Buy-Orders).
_order_locks: dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)


def _norm_symbol(s: str) -> str:
    return (s or "").strip().upper()


def _validate_symbol(sym: str) -> str:
    s = _norm_symbol(sym)
    if not _SYMBOL_RE.match(s):
        raise HTTPException(status_code=422, detail="ungültiges Symbol")
    return s


def _to_decimal_strict(value, field: str) -> Decimal:
    if value is None:
        raise HTTPException(status_code=422, detail=f"{field} fehlt")
    if isinstance(value, float):
        raise HTTPException(status_code=422, detail=f"{field} muss als String übergeben werden (keine Floats)")
    try:
        d = Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_EVEN)
    except (InvalidOperation, TypeError):
        raise HTTPException(status_code=422, detail=f"{field} ist kein gültiger Betrag")
    if d != d:
        raise HTTPException(status_code=422, detail=f"{field} ist NaN")
    return d


# ─── WATCHLIST ─────────────────────────────────────────────────────────
class WatchlistCreateIn(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=12)
    display_name: Optional[str] = Field(default=None, max_length=100)
    notes: Optional[str] = Field(default=None, max_length=500)

    model_config = {"extra": "forbid"}


@router.post("/watchlist", status_code=201)
async def add_watchlist(
    payload: WatchlistCreateIn = Body(...),
    user: dict = Depends(get_current_user),
):
    sym = _validate_symbol(payload.symbol)
    uid = ObjectId(user["id"])
    now = datetime.now(timezone.utc)
    # sort_order = current count + 1
    count = await db.watchlists.count_documents({"user_id": uid})
    doc = {
        "user_id": uid,
        "symbol": sym,
        "asset_type": "stock",
        "display_name": (payload.display_name or sym)[:100],
        "notes": (payload.notes or None),
        "sort_order": count + 1,
        "created_at": now,
    }
    try:
        res = await db.watchlists.insert_one(doc)
        doc["_id"] = res.inserted_id
        return _serialize_watchlist(doc)
    except Exception as exc:
        if getattr(exc, "code", None) == 11000 or "duplicate key" in str(exc).lower():
            existing = await db.watchlists.find_one({"user_id": uid, "symbol": sym})
            if existing:
                return _serialize_watchlist(existing)
        raise HTTPException(status_code=500, detail=f"watchlist insert failed: {exc}")


@router.delete("/watchlist/{symbol}", status_code=204)
async def delete_watchlist(
    symbol: str,
    user: dict = Depends(get_current_user),
):
    sym = _validate_symbol(symbol)
    uid = ObjectId(user["id"])
    res = await db.watchlists.delete_one({"user_id": uid, "symbol": sym})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Watchlist-Eintrag nicht gefunden")
    return None


# ─── ALERTS ─────────────────────────────────────────────────────────────
_ALERT_DIRECTIONS = frozenset({"above", "below"})


class AlertCreateIn(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=12)
    target_price: str = Field(..., description="Positiver Dezimalbetrag")
    direction: str = Field(..., description="'above' | 'below'")
    note: Optional[str] = Field(default=None, max_length=500)
    channel: Optional[str] = Field(default="app", max_length=50)

    model_config = {"extra": "forbid"}


@router.post("/alerts", status_code=201)
async def create_alert(
    payload: AlertCreateIn = Body(...),
    user: dict = Depends(get_current_user),
):
    sym = _validate_symbol(payload.symbol)
    direction = payload.direction.lower()
    if direction not in _ALERT_DIRECTIONS:
        raise HTTPException(status_code=422, detail="direction muss 'above' oder 'below' sein")
    price = _to_decimal_strict(payload.target_price, "target_price")
    if price <= Decimal("0.00"):
        raise HTTPException(status_code=422, detail="target_price muss > 0 sein")

    uid = ObjectId(user["id"])
    # Duplicate-Guard: gleicher aktiver Alert (Symbol + Direction + Preis)
    existing = await db.stock_alerts.find_one({
        "user_id": uid,
        "symbol": sym,
        "alert_type": f"price_{direction}",
        "threshold": Decimal128(price),
        "is_active": True,
    })
    if existing:
        return _serialize_alert(existing)

    now = datetime.now(timezone.utc)
    doc = {
        "user_id": uid,
        "symbol": sym,
        "alert_type": f"price_{direction}",
        "threshold": Decimal128(price),
        "channel": (payload.channel or "app")[:50],
        "note": (payload.note or None),
        "is_active": True,
        "last_triggered_at": None,
        "created_at": now,
        "updated_at": now,
    }
    res = await db.stock_alerts.insert_one(doc)
    doc["_id"] = res.inserted_id
    return _serialize_alert(doc)


@router.delete("/alerts/{alert_id}", status_code=204)
async def delete_alert(
    alert_id: str,
    user: dict = Depends(get_current_user),
):
    try:
        oid = ObjectId(alert_id)
    except Exception:
        raise HTTPException(status_code=422, detail="ungültige alert_id")
    uid = ObjectId(user["id"])
    res = await db.stock_alerts.delete_one({"_id": oid, "user_id": uid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alert nicht gefunden")
    return None


# ─── ORDERS ─────────────────────────────────────────────────────────────
_ORDER_SIDES = frozenset({"buy", "sell"})
_ORDER_TYPES = frozenset({"market", "limit"})


class OrderCreateIn(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=12)
    side: str = Field(...)
    order_type: str = Field(...)
    quantity: str = Field(..., description="Ganzzahliger Positive-Stückzahl-String")
    limit_price: Optional[str] = Field(default=None)
    idempotency_key: str = Field(..., min_length=8, max_length=200)
    client_reference: Optional[str] = Field(default=None, max_length=200)

    model_config = {"extra": "forbid"}


def _serialize_stock_order(doc: dict) -> dict:
    def _amt(v):
        if v is None:
            return None
        if isinstance(v, Decimal128):
            return format(v.to_decimal(), "f")
        return str(v)
    return {
        "id": str(doc["_id"]),
        "symbol": doc.get("symbol"),
        "side": doc.get("side"),
        "order_type": doc.get("order_type"),
        "quantity": int(doc.get("quantity") or 0),
        "limit_price": _amt(doc.get("limit_price")),
        "reserved_cash": _amt(doc.get("reserved_cash")),
        "currency": doc.get("currency") or "EUR",
        "status": doc.get("status", "pending"),
        "source": doc.get("source"),
        "created_at": _iso(doc.get("created_at")),
        "updated_at": _iso(doc.get("updated_at")),
        "cancelled_at": _iso(doc.get("cancelled_at")),
    }


@router.post("/orders", status_code=201)
async def create_order(
    payload: OrderCreateIn = Body(...),
    user: dict = Depends(get_current_user),
):
    side = payload.side.lower()
    order_type = payload.order_type.lower()
    if side not in _ORDER_SIDES:
        raise HTTPException(status_code=422, detail="side muss 'buy' oder 'sell' sein")
    if order_type not in _ORDER_TYPES:
        raise HTTPException(status_code=422, detail="order_type muss 'market' oder 'limit' sein")

    sym = _validate_symbol(payload.symbol)
    try:
        qty = int(payload.quantity)
    except (ValueError, TypeError):
        raise HTTPException(status_code=422, detail="quantity muss eine positive Ganzzahl sein")
    if qty <= 0:
        raise HTTPException(status_code=422, detail="quantity muss > 0 sein")

    if order_type == "market":
        # Keine verlässliche Preisquelle in Phase 3 — verhindere Fake-Preis-Reservierung.
        raise HTTPException(
            status_code=400,
            detail="Market-Orders sind derzeit noch nicht verfügbar.",
        )

    limit_price = _to_decimal_strict(payload.limit_price, "limit_price")
    if limit_price <= Decimal("0.00"):
        raise HTTPException(status_code=422, detail="limit_price muss > 0 sein")

    uid = ObjectId(user["id"])
    reserved = (limit_price * Decimal(qty)).quantize(Decimal("0.01"), rounding=ROUND_HALF_EVEN)

    lock = _order_locks[str(uid)]
    async with lock:
        # Idempotency-Check
        existing = await db.stock_orders.find_one({
            "user_id": uid,
            "idempotency_key": payload.idempotency_key,
        })
        if existing:
            return _serialize_stock_order(existing)

        if side == "buy":
            summary = await get_cash_summary(db, user)
            available = Decimal(summary["available"])
            if reserved > available:
                raise HTTPException(
                    status_code=400,
                    detail=f"Nicht genügend verfügbare Liquidität (benötigt {reserved} EUR, verfügbar {summary['available']} EUR).",
                )
        else:  # sell
            pos = await db.stock_positions.find_one({
                "$or": [{"user_id": uid}, {"user_id": str(uid)}],
                "symbol": sym,
            })
            avail_qty = int(pos.get("quantity") or 0) if pos else 0
            if avail_qty < qty:
                raise HTTPException(
                    status_code=400,
                    detail=f"Nicht genügend Stücke im Bestand (benötigt {qty}, verfügbar {avail_qty}).",
                )
            reserved = Decimal("0.00")  # Sell reserviert kein Cash

        now = datetime.now(timezone.utc)
        doc = {
            "user_id": uid,
            "symbol": sym,
            "side": side,
            "order_type": order_type,
            "quantity": qty,
            "limit_price": Decimal128(limit_price),
            "reserved_cash": Decimal128(reserved),
            "currency": "EUR",
            "status": "pending",
            "idempotency_key": payload.idempotency_key,
            "source": "customer",
            "client_reference": payload.client_reference,
            "created_at": now,
            "updated_at": now,
            "cancelled_at": None,
        }
        try:
            res = await db.stock_orders.insert_one(doc)
            doc["_id"] = res.inserted_id
            return _serialize_stock_order(doc)
        except Exception as exc:
            if getattr(exc, "code", None) == 11000 or "duplicate key" in str(exc).lower():
                existing = await db.stock_orders.find_one({
                    "user_id": uid,
                    "idempotency_key": payload.idempotency_key,
                })
                if existing:
                    return _serialize_stock_order(existing)
            raise HTTPException(status_code=500, detail=f"order insert failed: {exc}")


@router.post("/orders/{order_id}/cancel")
async def cancel_order(
    order_id: str,
    user: dict = Depends(get_current_user),
):
    try:
        oid = ObjectId(order_id)
    except Exception:
        raise HTTPException(status_code=422, detail="ungültige order_id")
    uid = ObjectId(user["id"])
    order = await db.stock_orders.find_one({"_id": oid, "user_id": uid})
    if not order:
        raise HTTPException(status_code=404, detail="Order nicht gefunden")
    if order.get("status") == "cancelled":
        return _serialize_stock_order(order)  # idempotent
    if order.get("status") != "pending":
        raise HTTPException(status_code=409, detail="Order ist nicht mehr stornierbar")
    now = datetime.now(timezone.utc)
    await db.stock_orders.update_one(
        {"_id": oid, "user_id": uid, "status": "pending"},
        {"$set": {"status": "cancelled", "cancelled_at": now, "updated_at": now}},
    )
    fresh = await db.stock_orders.find_one({"_id": oid})
    return _serialize_stock_order(fresh)


# ─── Indizes ─────────────────────────────────────────────────────────────
async def ensure_indexes():
    """
    Idempotente Ownership-Indizes für alle Portfolio-Collections.
    Erzeugt keine Business-Dokumente.
    """
    # Session 82.18 — Cash-Ledger-Indizes
    await ensure_cash_indexes(db)
    # Stock-Positions
    await db.stock_positions.create_index(
        [("user_id", 1), ("symbol", 1)],
        unique=True,
        sparse=True,
        name="user_symbol_unique",
    )
    await db.stock_positions.create_index(
        [("user_id", 1), ("updated_at", -1)], name="user_updated_desc",
    )
    # Bond-Positions
    await db.bond_positions.create_index(
        [("user_id", 1), ("isin", 1)],
        unique=True,
        sparse=True,
        name="user_isin_unique",
    )
    await db.bond_positions.create_index(
        [("user_id", 1), ("updated_at", -1)], name="user_updated_desc",
    )
    # Orders (Session 82.19)
    await db.stock_orders.create_index(
        [("user_id", 1), ("idempotency_key", 1)],
        unique=True,
        name="user_idem_unique",
    )
    await db.stock_orders.create_index(
        [("user_id", 1), ("created_at", -1)], name="user_created_desc",
    )
    await db.stock_orders.create_index(
        [("user_id", 1), ("status", 1)], name="user_status",
    )
    # Cash
    await db.cash_transactions.create_index(
        [("user_id", 1), ("created_at", -1)], name="user_created_desc",
    )
    # Watchlist / Alerts (Session 82.19 — nach Normalisierung)
    await db.watchlists.create_index(
        [("user_id", 1), ("symbol", 1)],
        unique=True,
        name="user_symbol_unique",
    )
    await db.stock_alerts.create_index(
        [("user_id", 1), ("created_at", -1)], name="user_created_desc",
    )
    # Snapshots
    await db.portfolio_snapshots.create_index(
        [("user_id", 1), ("snapshot_date", 1)],
        unique=True,
        sparse=True,
        name="user_date_unique",
    )
    await db.depot_contracts.create_index(
        [("user_id", 1), ("is_active", -1)], name="user_active",
    )


# ─── ADMIN Cash Endpoints (Session 82.18 · Phase 2) ─────────────────────
