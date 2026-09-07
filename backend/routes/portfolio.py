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

from datetime import datetime
from typing import Optional

from bson import ObjectId
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
    return {
        "id": str(doc["_id"]),
        "symbol": doc.get("symbol"),
        "side": doc.get("side"),
        "quantity": _num(doc.get("quantity")),
        "requested_price": _num(doc.get("requested_price")) if doc.get("requested_price") is not None else None,
        "executed_price": _num(doc.get("executed_price")) if doc.get("executed_price") is not None else None,
        "status": doc.get("status", "pending"),
        "currency": doc.get("currency") or "EUR",
        "created_at": _iso(doc.get("created_at")),
        "executed_at": _iso(doc.get("executed_at")),
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
    # Orders
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
    await db.cash_ledger.create_index(
        [("user_id", 1), ("created_at", -1)], name="user_created_desc",
    )
    # Watchlist / Alerts
    await db.watchlists.create_index(
        [("user_id", 1), ("symbol", 1)],
        unique=True,
        sparse=True,
        name="user_symbol_unique",
    )
    await db.stock_alerts.create_index(
        [("user_id", 1), ("created_at", -1)], name="user_created_desc",
    )
    # Snapshots (per Tag ein Doc/User)
    await db.portfolio_snapshots.create_index(
        [("user_id", 1), ("snapshot_date", 1)],
        unique=True,
        sparse=True,
        name="user_date_unique",
    )
    # Depot-Verträge
    await db.depot_contracts.create_index(
        [("user_id", 1), ("is_active", -1)], name="user_active",
    )
