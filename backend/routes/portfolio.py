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
from fastapi import APIRouter, Depends, HTTPException, Body, Query
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

# Session 82.22 · Depot Phase 4A — Stock-Price-Service (yfinance read-through cache)
from services.stock_price_service import (  # noqa: E402
    get_quotes as get_stock_quotes,
    ensure_indexes as ensure_stock_price_indexes,
)

# Session 82.25 · Depot Phase 5 — Portfolio-State & Snapshot-Services
from services.portfolio_state import compute_portfolio_state  # noqa: E402
from services.portfolio_snapshot_service import (  # noqa: E402
    create_or_update_daily_snapshot,
    run_daily_snapshots_for_all_users,
    ensure_indexes as ensure_snapshot_indexes,
)

# Session 82.26 · Depot P0 — Order-Execution-Saga
from services.order_execution_service import (  # noqa: E402
    execute_order,
    ExecutionError,
    ExecutionCrash,
    ensure_indexes as ensure_execution_indexes,
)

# Session 82.61a · Coupon-Domain (Mongo-native Legacy-Parität)
from services.coupon_service import (  # noqa: E402
    CouponError,
    peek_coupon as coupon_peek,
    reserve_coupon_for_order,
    release_coupon_for_order,
    admin_create_coupon,
    admin_revoke_coupon,
    serialize_coupon,
    normalize_code as normalize_coupon_code,
    compute_net as compute_coupon_net,
    ensure_indexes as ensure_coupon_indexes,
    STATUS_ACTIVE as COUPON_STATUS_ACTIVE,
)

# Session 82.27 · Depot P0 — Auto-Matching-Service
from services.order_matching_service import (  # noqa: E402
    run_pending_limit_buy_matching,
)

# Session 82.39 · Depot P1 — Kontoauszug-Service
from services.portfolio_statement_service import (  # noqa: E402
    build_statement as build_statement_svc,
    build_csv as build_statement_csv,
    build_pdf as build_statement_pdf,
)
from services.statement_email_service import (  # noqa: E402  · Session 82.42
    send_monthly_statement_email,
    run_monthly_batch as run_monthly_statement_batch,
    ensure_delivery_indexes as ensure_statement_delivery_indexes,
    previous_month as prev_statement_month,
)
from fastapi.responses import Response  # noqa: E402


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
    """Sicheres Float-Cast; None/NaN/Decimal128 → korrekter Float."""
    if v is None:
        return default
    if isinstance(v, Decimal128):
        try:
            f = float(v.to_decimal())
        except Exception:
            return default
    else:
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
        "invested": _num(doc.get("invested")),
        "profit_loss": _num(doc.get("profit_loss")),
        "profit_loss_pct": _num(doc.get("profit_loss_pct")),
        "stocks_valuation_complete": bool(doc.get("stocks_valuation_complete", False)),
        "bonds_valuation_complete": bool(doc.get("bonds_valuation_complete", False)),
        "currency": doc.get("currency", "EUR"),
    }


# Range-Mapping für /api/portfolio/snapshots (Session 82.25).
_SNAPSHOT_RANGE_DAYS: dict[str, Optional[int]] = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "1y": 365,
    "max": None,  # keine Cut-off
}


# ─── Endpoints ───────────────────────────────────────────────────────────
@router.get("/quotes")
async def get_portfolio_quotes(
    symbols: str = "",
    user: dict = Depends(get_current_user),
):
    """
    Session 82.22 · Batch-Quotes (Read-Through Cache). `symbols` = CSV.
    Empty → `{}`. Real prices only; `price_status ∈ fresh|stale|unavailable`.
    """
    sym_list = [s.strip().upper() for s in (symbols or "").split(",") if s.strip()]
    if not sym_list:
        return {}
    return await get_stock_quotes(db, sym_list)


@router.get("/stock-positions")
async def list_stock_positions(user: dict = Depends(get_current_user)):
    cursor = db.stock_positions.find(_user_filter(user)).sort("updated_at", -1)
    positions = [_serialize_position(doc, "stock") async for doc in cursor]
    # Session 82.22 — Enrichment mit realen Quotes.
    symbols = list({p["symbol"] for p in positions if p.get("symbol")})
    quotes = await get_stock_quotes(db, symbols) if symbols else {}
    for p in positions:
        q = quotes.get(p.get("symbol")) if p.get("symbol") else None
        qty = float(p.get("quantity") or 0)
        avg = float(p.get("avg_cost") or 0)
        cost = qty * avg
        p["cost_basis"] = round(cost, 2)
        if q and q.get("price") is not None:
            price = float(q["price"])
            mv = round(qty * price, 2)
            p["price"] = price
            p["market_value"] = mv
            p["profit_loss"] = round(mv - cost, 2)
            p["profit_loss_pct"] = round((mv - cost) / cost * 100, 4) if cost > 0 else None
            p["as_of"] = q.get("as_of")
            p["price_status"] = q.get("price_status")
            p["price_source"] = q.get("source")
        else:
            p["price"] = None
            p["market_value"] = None
            p["profit_loss"] = None
            p["profit_loss_pct"] = None
            p["as_of"] = None
            p["price_status"] = q.get("price_status") if q else "unavailable"
            p["price_source"] = None
    return positions


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


@router.get("/statements")
async def get_statement(
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = Query(None),
    format: str = Query("json"),
    user: dict = Depends(get_current_user),
):
    """
    Kunden-Kontoauszug (Session 82.39 · P1).

    Query-Parameter:
      * `from` (YYYY-MM-DD, optional) — inklusive Untergrenze
      * `to`   (YYYY-MM-DD, optional) — inklusive Obergrenze
      * `format` ∈ json | csv | pdf (default json)

    Ownership: ausschließlich eingeloggter Customer (`user_id` aus Session).
    Source of Truth: `cash_ledger` (settled). Executions/Allocations/Bonds
    dienen nur zur Anreicherung (Symbol/ISIN/Qty/Kurs).
    """
    from datetime import date as _date  # noqa: WPS433

    def _parse(s: Optional[str], name: str):
        if s in (None, ""):
            return None
        try:
            return _date.fromisoformat(s)
        except (ValueError, TypeError):
            raise HTTPException(status_code=422, detail=f"invalid {name} date (YYYY-MM-DD erwartet)")

    date_from = _parse(from_, "from")
    date_to = _parse(to, "to")
    if date_from and date_to and date_from > date_to:
        raise HTTPException(status_code=422, detail="from muss <= to sein")

    fmt = (format or "json").lower().strip()
    if fmt not in {"json", "csv", "pdf"}:
        raise HTTPException(status_code=422, detail="format muss json|csv|pdf sein")

    statement = await build_statement_svc(db, _oid(user), date_from, date_to)

    if fmt == "json":
        return statement

    if fmt == "csv":
        payload = build_statement_csv(statement)
        fn_from = date_from.isoformat() if date_from else "start"
        fn_to = date_to.isoformat() if date_to else "heute"
        return Response(
            content=payload,
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="kontoauszug-{fn_from}-{fn_to}.csv"',
            },
        )

    # PDF
    profile = await db.users.find_one({"_id": _oid(user)}) or {}
    customer = {
        "email": profile.get("email") or user.get("email"),
        "name": " ".join(
            [p for p in (profile.get("first_name"), profile.get("last_name")) if p]
        ) or None,
    }
    pdf_bytes = build_statement_pdf(statement, customer)
    fn_from = date_from.isoformat() if date_from else "start"
    fn_to = date_to.isoformat() if date_to else "heute"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="kontoauszug-{fn_from}-{fn_to}.pdf"',
        },
    )


@router.get("/snapshots")
async def list_snapshots(
    range: Optional[str] = None,
    days: Optional[int] = None,
    user: dict = Depends(get_current_user),
):
    """
    Portfolio-Snapshots (Mongo-native · Session 82.25).

    Parameter:
      * `range` ∈ 7d | 30d | 90d | 1y | max  (bevorzugt)
      * `days`  fallback (int, 1..730) — bleibt für Backwards-Compat.

    Rückgabe: chronologisch aufsteigende Liste realer Tages-Snapshots.
    Kein Fake-Backfill, keine synthetischen Zwischenpunkte. Bei 0 Punkten
    reine leere Liste, damit die UI einen Empty-State rendern kann.
    """
    from datetime import date, timedelta

    cutoff_days: Optional[int]
    if range:
        r = range.strip().lower()
        if r not in _SNAPSHOT_RANGE_DAYS:
            raise HTTPException(status_code=422, detail="range muss 7d|30d|90d|1y|max sein")
        cutoff_days = _SNAPSHOT_RANGE_DAYS[r]
    else:
        cutoff_days = max(1, min(int(days or 400), 730))

    ownership = _user_filter(user)
    if cutoff_days is None:
        query = ownership
    else:
        from_date = (date.today() - timedelta(days=cutoff_days)).isoformat()
        query = {"$and": [ownership, {"snapshot_date": {"$gte": from_date}}]}
    cursor = db.portfolio_snapshots.find(query).sort("snapshot_date", 1)
    return [_serialize_snapshot(doc) async for doc in cursor]


@router.get("/summary")
async def get_summary(user: dict = Depends(get_current_user)):
    """
    Aggregierter Depot-Zustand aus Mongo-nativen Quellen.
    Delegiert an `services.portfolio_state.compute_portfolio_state` — Snapshot-
    Service konsumiert exakt dieselbe Berechnung (Session 82.25).
    """
    return await compute_portfolio_state(db, _oid(user))


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
    # Session 82.61a — Optionaler Coupon (nur buy). Alle Financial-Werte werden
    # serverseitig ermittelt; Client darf KEINE Coupon-Financial-Felder senden.
    coupon_code: Optional[str] = Field(default=None, max_length=64)

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
        # Session 82.61a · Coupon-Felder (nur wenn Coupon gesetzt).
        "coupon_code": doc.get("coupon_code"),
        "coupon_id": str(doc.get("coupon_id")) if doc.get("coupon_id") else None,
        "coupon_discount_percent": _amt(doc.get("coupon_discount_percent")),
        "coupon_discount_amount": _amt(doc.get("coupon_discount_amount")),
        "coupon_status": doc.get("coupon_status"),
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

    # Session 82.61a — Coupon-Sell-Guard bereits VOR dem Lock (billig, keine DB-Writes).
    if payload.coupon_code and side == "sell":
        raise HTTPException(
            status_code=400,
            detail="Gutscheine sind nur für Kaufaufträge gültig",
        )

    lock = _order_locks[str(uid)]
    async with lock:
        # Idempotency-Check — MUSS vor Coupon-Peek stehen, damit ein Retry
        # mit gleichem idempotency_key auch dann noch die ursprüngliche
        # Order (inkl. Coupon-Reservation) zurückgibt, wenn der Coupon
        # zwischenzeitlich als "reserved" markiert wurde.
        existing = await db.stock_orders.find_one({
            "user_id": uid,
            "idempotency_key": payload.idempotency_key,
        })
        if existing:
            return _serialize_stock_order(existing)

        # Session 82.61a — Coupon Peek + Discount-Computation (Legacy-Parität).
        coupon_code_norm: Optional[str] = None
        coupon_percent: Optional[Decimal] = None
        coupon_id_pre: Optional[ObjectId] = None
        if payload.coupon_code:
            coupon_code_norm = normalize_coupon_code(payload.coupon_code)
            if not coupon_code_norm:
                raise HTTPException(status_code=422, detail="Gutscheincode ist leer")
            pre_doc = await db.stock_trade_coupons.find_one(
                {"code": coupon_code_norm, "status": COUPON_STATUS_ACTIVE}
            )
            if not pre_doc:
                raise HTTPException(
                    status_code=404,
                    detail="Ungültiger oder bereits verwendeter Gutscheincode",
                )
            try:
                coupon_percent = pre_doc["percent"].to_decimal() if isinstance(pre_doc.get("percent"), Decimal128) else Decimal(str(pre_doc.get("percent")))
            except Exception:
                coupon_percent = None
            coupon_id_pre = pre_doc["_id"]

        gross = (limit_price * Decimal(qty)).quantize(Decimal("0.01"), rounding=ROUND_HALF_EVEN)
        reserved = compute_coupon_net(gross, coupon_percent) if side == "buy" else Decimal("0.00")
        coupon_discount_amount = (gross - reserved).quantize(Decimal("0.01"), rounding=ROUND_HALF_EVEN) if coupon_percent is not None else Decimal("0.00")

        if side == "buy":
            summary = await get_cash_summary(db, user)
            available = Decimal(summary["available"])
            if reserved > available:
                raise HTTPException(
                    status_code=400,
                    detail=f"Nicht genügend verfügbare Liquidität (benötigt {reserved} EUR, verfügbar {summary['available']} EUR).",
                )
        else:  # sell (Session 82.28 · Position-Reservation aus pending Sell-Orders)
            pos = await db.stock_positions.find_one({
                "$or": [{"user_id": uid}, {"user_id": str(uid)}],
                "symbol": sym,
            })
            total_qty = int(pos.get("quantity") or 0) if pos else 0
            # Bereits reservierte Stücke aus offenen (pending) Sell-Orders zählen.
            open_reserved = 0
            async for o in db.stock_orders.find({
                "user_id": uid, "symbol": sym,
                "side": "sell", "order_type": "limit", "status": "pending",
            }):
                open_reserved += int(o.get("quantity") or 0)
            avail_qty = total_qty - open_reserved
            if avail_qty < qty:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Nicht genügend verfügbare Stücke (Bestand {total_qty}, "
                        f"bereits reserviert {open_reserved}, verfügbar {avail_qty}, "
                        f"benötigt {qty})."
                    ),
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
        # Session 82.61a — Coupon-Snapshot auf Order (BEFORE reserve).
        if coupon_code_norm and coupon_percent is not None:
            doc["coupon_code"] = coupon_code_norm
            doc["coupon_id"] = coupon_id_pre
            doc["coupon_discount_percent"] = Decimal128(coupon_percent)
            doc["coupon_discount_amount"] = Decimal128(coupon_discount_amount)
            doc["coupon_status"] = "pending_reserve"
        try:
            res = await db.stock_orders.insert_one(doc)
            doc["_id"] = res.inserted_id
        except Exception as exc:
            if getattr(exc, "code", None) == 11000 or "duplicate key" in str(exc).lower():
                existing = await db.stock_orders.find_one({
                    "user_id": uid,
                    "idempotency_key": payload.idempotency_key,
                })
                if existing:
                    return _serialize_stock_order(existing)
            raise HTTPException(status_code=500, detail=f"order insert failed: {exc}")

        # Session 82.61a — CAS-Reserve NACH Order-Insert.
        # Race-safe: nur EIN paralleler Order-Insert kann Coupon reservieren.
        # Bei Miss: Order löschen (safe: keine Cash-/Position-Nebenwirkung).
        if coupon_code_norm:
            try:
                await reserve_coupon_for_order(
                    db,
                    code=coupon_code_norm,
                    order_id=doc["_id"],
                    side=side,
                )
                await db.stock_orders.update_one(
                    {"_id": doc["_id"]},
                    {"$set": {"coupon_status": "reserved", "updated_at": datetime.now(timezone.utc)}},
                )
                doc["coupon_status"] = "reserved"
            except CouponError as ce:
                # Rollback: Order wieder entfernen (safe — noch keine Financials).
                await db.stock_orders.delete_one({"_id": doc["_id"], "status": "pending"})
                raise HTTPException(status_code=ce.http_status, detail=ce.detail)

        return _serialize_stock_order(doc)


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
    # Session 82.27 · Cancel-Race-Guard: wenn eine Execution bereits Cash
    # gebucht ODER die Position angewendet hat, dürfen wir die Order nicht
    # mehr canceln — sonst hätten wir cash_debited + position_applied +
    # cancelled (finanziell inkonsistent).
    exec_running = await db.order_executions.find_one({
        "order_id": oid,
        "status": {"$in": ["cash_debited", "position_applied", "order_settled", "completed"]},
    })
    if exec_running:
        raise HTTPException(
            status_code=409,
            detail="Order befindet sich bereits in Ausführung und kann nicht mehr storniert werden.",
        )
    now = datetime.now(timezone.utc)
    # CAS: nur setzen, solange Status pending ist UND keine Execution kritisch läuft.
    res = await db.stock_orders.update_one(
        {"_id": oid, "user_id": uid, "status": "pending"},
        {"$set": {"status": "cancelled", "cancelled_at": now, "updated_at": now}},
    )
    if res.modified_count == 0:
        # Zwischenzeitlich ausgeführt → aktueller Zustand zurückgeben.
        fresh = await db.stock_orders.find_one({"_id": oid})
        raise HTTPException(status_code=409, detail=f"Order ist nicht mehr stornierbar (Status: {fresh.get('status') if fresh else 'unbekannt'})")

    # Session 82.61a — Coupon-Release bei erfolgreichem Cancel (idempotent per CAS).
    if order.get("coupon_id"):
        try:
            released = await release_coupon_for_order(
                db,
                coupon_id=order.get("coupon_id"),
                order_id=oid,
            )
            if released:
                await db.stock_orders.update_one(
                    {"_id": oid},
                    {"$set": {"coupon_status": "released", "updated_at": datetime.now(timezone.utc)}},
                )
        except Exception:
            # Coupon-Release-Fehler blockiert NICHT den Order-Cancel — Order ist
            # bereits erfolgreich cancelled. Ops-Ticket über orphaned reservation
            # bleibt separater Fix.
            pass

    fresh = await db.stock_orders.find_one({"_id": oid})
    return _serialize_stock_order(fresh)


# ─── Coupon Peek (Session 82.61a) ────────────────────────────────────────
class CouponPeekIn(BaseModel):
    coupon_code: str = Field(..., min_length=1, max_length=64)
    side: str = Field(default="buy")
    quantity: str = Field(...)
    limit_price: str = Field(...)

    model_config = {"extra": "forbid"}


@router.post("/coupons/peek")
async def coupon_peek_endpoint(
    payload: CouponPeekIn = Body(...),
    user: dict = Depends(get_current_user),
):
    """
    Read-only Preview eines Stock-Trade-Coupons.

    Berechnet `gross/discount/net` für Buy-Order (Legacy-Parität).
    Keine DB-Writes. Kein Reserve, kein Consume. Auth-only.
    """
    try:
        qty = int(payload.quantity)
    except (ValueError, TypeError):
        raise HTTPException(status_code=422, detail="quantity muss eine positive Ganzzahl sein")
    try:
        lp = _to_decimal_strict(payload.limit_price, "limit_price")
    except HTTPException:
        raise
    try:
        result = await coupon_peek(
            db,
            code=payload.coupon_code,
            side=(payload.side or "buy").lower(),
            quantity=qty,
            limit_price=lp,
        )
    except CouponError as ce:
        raise HTTPException(status_code=ce.http_status, detail=ce.detail)
    return result
class AdminSnapshotRunIn(BaseModel):
    user_id: Optional[str] = Field(default=None, description="Optional: nur ein User")
    limit: Optional[int] = Field(default=None, ge=1, le=10000)

    model_config = {"extra": "forbid"}


@admin_router.post("/snapshots/run")
async def admin_run_snapshots(
    payload: AdminSnapshotRunIn = Body(default_factory=AdminSnapshotRunIn),
    _admin: dict = Depends(require_admin),
):
    """
    Manueller Trigger für den Portfolio-Snapshot-Service (Session 82.25).

    Ohne `user_id` → alle aktiven Kunden werden verarbeitet.
    Mit `user_id`  → Snapshot nur für diesen einen Kunden.
    Idempotent: pro Kunde und Tag genau EIN Snapshot; erneuter Lauf am
    gleichen Tag aktualisiert den bestehenden Snapshot in-place.
    """
    if payload.user_id:
        try:
            target = ObjectId(payload.user_id)
        except Exception:
            raise HTTPException(status_code=400, detail="ungültige user_id")
        exists = await db.users.find_one({"_id": target}, projection={"_id": 1})
        if not exists:
            raise HTTPException(status_code=404, detail="User existiert nicht")
        snap = await create_or_update_daily_snapshot(db, target, trigger="admin-manual")
        return {"mode": "single", "user_id": str(target), "snapshot_date": snap["snapshot_date"]}
    return await run_daily_snapshots_for_all_users(db, trigger="admin-manual", limit=payload.limit)


# ─── ADMIN Order-Execution (Session 82.26 · Depot P0 · Limit-Buy) ───────
class AdminExecuteOrderIn(BaseModel):
    fail_after: Optional[str] = Field(
        default=None,
        description="test-only: crash-Punkt nach Saga-Schritt 'cash'|'position'|'settle'",
    )

    model_config = {"extra": "forbid"}


@admin_router.post("/orders/{order_id}/execute")
async def admin_execute_order(
    order_id: str,
    payload: AdminExecuteOrderIn = Body(default_factory=AdminExecuteOrderIn),
    admin: dict = Depends(require_admin),
):
    """
    Führt eine pending Limit-Buy-Order sicher aus (Saga).
    Idempotent: erneuter Aufruf setzt den letzten unvollständigen Saga-Schritt
    fort. Kein zweiter Cash-Debit, keine zweite Position, kein zweites Settlement.
    """
    try:
        oid = ObjectId(order_id)
    except Exception:
        raise HTTPException(status_code=422, detail="ungültige order_id")

    try:
        result = await execute_order(
            db,
            oid,
            admin_id=str(admin.get("id")),
            fail_after=payload.fail_after,
        )
    except ExecutionCrash as exc:
        # Test-Injection: DB-Zustand ist konsistent; wir signalisieren dem
        # Aufrufer die simulierte Unterbrechung. Retry setzt sauber fort.
        raise HTTPException(status_code=555, detail=f"[injected-crash] {exc}")
    except ExecutionError as exc:
        raise HTTPException(status_code=exc.http_status, detail=f"{exc.code}: {exc.detail}")
    return result


# ─── ADMIN Order-Matching (Session 82.27 · Depot P0) ────────────────────
@admin_router.post("/orders/match")
async def admin_match_orders(
    _admin: dict = Depends(require_admin),
):
    """
    Startet den Auto-Matching-Lauf für pending Limit-Buy-Orders.
    Delegiert an `services.order_matching_service.run_pending_limit_buy_matching`
    und liefert einen kompakten Report zurück. Preview-only Trigger.
    """
    return await run_pending_limit_buy_matching(db, trigger="admin-manual")


# ─── ADMIN Statement-Email (Session 82.42 · Depot P1) ──────────────────
@admin_router.post("/statements/send")
async def admin_send_statement(
    body: dict = Body(...),
    _admin: dict = Depends(require_admin),
):
    """
    Admin-Trigger für Monats-Kontoauszug-Versand.
    Payload: {user_id, year, month}. Nutzt Emergent-Managed Email-Provider.
    """
    from server import _send_email_via_emergent  # type: ignore[attr-defined]

    target_id = body.get("user_id")
    year = body.get("year")
    month = body.get("month")
    if not target_id or not isinstance(year, int) or not isinstance(month, int):
        raise HTTPException(status_code=422, detail="user_id, year, month erforderlich")
    if not ObjectId.is_valid(str(target_id)):
        raise HTTPException(status_code=422, detail="user_id ungültig")
    if not (2020 <= year <= 2100 and 1 <= month <= 12):
        raise HTTPException(status_code=422, detail="year/month außerhalb Bereichs")
    # Session 82.43 · `force=true` (admin-only, explizit) umgeht das Opt-Out.
    force = bool(body.get("force", False))
    result = await send_monthly_statement_email(
        db, ObjectId(str(target_id)), year, month, _send_email_via_emergent, force=force,
    )
    return result


@admin_router.get("/statements/deliveries")
async def admin_list_deliveries(
    year: Optional[int] = None,
    month: Optional[int] = None,
    limit: int = 50,
    _admin: dict = Depends(require_admin),
):
    """Read-only Delivery-Log für Ops-Übersicht."""
    q: dict = {}
    if isinstance(year, int):
        q["year"] = year
    if isinstance(month, int):
        q["month"] = month
    limit = max(1, min(int(limit or 50), 500))
    cursor = db.statement_deliveries.find(q).sort([("created_at", -1)]).limit(limit)
    out = []
    async for d in cursor:
        out.append({
            "id": str(d["_id"]),
            "user_id": str(d.get("user_id")),
            "year": d.get("year"),
            "month": d.get("month"),
            "email": d.get("email"),
            "status": d.get("status"),
            "attempt_count": d.get("attempt_count", 0),
            "period_from": d.get("period_from"),
            "period_to": d.get("period_to"),
            "statement_count": d.get("statement_count"),
            "provider_message_id": d.get("provider_message_id"),
            "last_error": d.get("last_error"),
            "sent_at": d.get("sent_at").isoformat() if d.get("sent_at") else None,
            "created_at": d.get("created_at").isoformat() if d.get("created_at") else None,
        })
    return out


# ─── Indizes ─────────────────────────────────────────────────────────────
async def ensure_indexes():
    """
    Idempotente Ownership-Indizes für alle Portfolio-Collections.
    Erzeugt keine Business-Dokumente.
    """
    # Session 82.18 — Cash-Ledger-Indizes
    await ensure_cash_indexes(db)
    # Session 82.22 — Stock-Price-Cache-Indizes
    await ensure_stock_price_indexes(db)
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
    # Snapshots (Session 82.25 — konsolidiert im Snapshot-Service)
    await ensure_snapshot_indexes(db)
    # Session 82.26 · Order-Executions
    await ensure_execution_indexes(db)
    # Session 82.61a · Coupon-Collection
    await ensure_coupon_indexes(db)
    # Session 82.42 · Statement-Delivery-Log
    await ensure_statement_delivery_indexes(db)
    await db.depot_contracts.create_index(
        [("user_id", 1), ("is_active", -1)], name="user_active",
    )


# ─── ADMIN Coupon Endpoints (Session 82.61a) ─────────────────────────────
class AdminCouponCreateIn(BaseModel):
    percent: str = Field(..., description="Rabatt in Prozent (0<x<=100)")
    code: Optional[str] = Field(default=None, max_length=64)
    preview_only: bool = Field(default=True)
    qa_session: Optional[str] = Field(default=None, max_length=64)

    model_config = {"extra": "forbid"}


@admin_router.post("/coupons", status_code=201)
async def admin_create_coupon_endpoint(
    payload: AdminCouponCreateIn = Body(...),
    admin: dict = Depends(require_admin),
):
    try:
        pct = _to_decimal_strict(payload.percent, "percent")
    except HTTPException:
        raise
    try:
        doc = await admin_create_coupon(
            db,
            percent=pct,
            admin_id=str(admin.get("id")),
            preview_only=payload.preview_only,
            qa_session=payload.qa_session,
            code=payload.code,
        )
    except CouponError as ce:
        raise HTTPException(status_code=ce.http_status, detail=ce.detail)
    return serialize_coupon(doc)


@admin_router.get("/coupons")
async def admin_list_coupons(
    status: Optional[str] = Query(default=None),
    _admin: dict = Depends(require_admin),
):
    q: dict = {}
    if status:
        q["status"] = status.lower()
    cursor = db.stock_trade_coupons.find(q).sort([("created_at", -1)]).limit(500)
    return [serialize_coupon(d) async for d in cursor]


@admin_router.post("/coupons/{coupon_id}/revoke")
async def admin_revoke_coupon_endpoint(
    coupon_id: str,
    _admin: dict = Depends(require_admin),
):
    try:
        cid = ObjectId(coupon_id)
    except Exception:
        raise HTTPException(status_code=422, detail="ungültige coupon_id")
    try:
        await admin_revoke_coupon(db, coupon_id=cid)
    except CouponError as ce:
        raise HTTPException(status_code=ce.http_status, detail=ce.detail)
    doc = await db.stock_trade_coupons.find_one({"_id": cid})
    return serialize_coupon(doc)


# ─── ADMIN Cash Endpoints (Session 82.18 · Phase 2) ─────────────────────
