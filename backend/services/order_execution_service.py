"""
Order-Execution-Saga (Session 82.26 · Depot P0 · Limit-Buy).

Führt offene **Limit-Buy**-Orders sicher aus. Weil MongoDB Standalone keine
Multi-Document-Transaktionen erlaubt, implementieren wir ein persistiertes,
idempotentes Saga-Muster über die neue Collection `order_executions`.

Saga-Schritte (jeder für sich atomar & idempotent):
  1. QUOTE-GATE      — reale, frische Quote laden; `real_price <= limit_price`
  2. LOAD/CREATE     — Execution-Dokument holen oder anlegen (`UNIQUE order_id`)
  3. CASH-DEBIT      — genau ein `cash_ledger`-Event mit
                       `idempotency_key = execution:{order_id}:cash`
  4. POSITION-APPLY  — `stock_positions` upserten mit persistenter
                       `applied_execution_ids`-Liste als Retry-Guard
  5. ORDER-SETTLE    — Order auf `executed` setzen, Preis/Menge/Zeitpunkt
  6. COMPLETE        — Execution auf `completed`

Retry: gleiche Order erneut ausführen → jeder Schritt erkennt seinen Zustand
und macht nichts mehr, wenn er bereits erledigt ist. Kein doppelter Cash-Debit,
keine doppelte Position, kein zweites Settlement.

Rules:
  * Nur `side='buy'` und `order_type='limit'` und `status='pending'`.
  * Nur echte Quotes mit `price_status='fresh'`.
  * `execution_price = real_price` (nicht limit_price).
  * Decimal only; ROUND_HALF_EVEN.
  * Kein automatischer Rollback bei unklarem Zustand → `compensation_required`.
"""

from __future__ import annotations

import asyncio
import logging
from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_EVEN
from typing import Any, Optional

from bson import ObjectId
from bson.decimal128 import Decimal128
from pymongo.errors import DuplicateKeyError

from services.cash_service import (
    create_cash_event,
    get_cash_summary,
    _decimal_from_bson,
)
from services.stock_price_service import get_quotes as get_stock_quotes


logger = logging.getLogger(__name__)

_MONEY = Decimal("0.01")
_PRICE_QUANT = Decimal("0.0001")

# Per-Order-Lock (Same-Instance-Serialisierung). DB-Idempotenz bleibt Primärschutz.
_exec_locks: dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)


# ─── Fehlerklassen ──────────────────────────────────────────────────────
class ExecutionError(Exception):
    """Sanft: Execution konnte nicht durchgeführt werden, aber Order bleibt
    sicher (kein Cash-Debit, keine Position)."""

    def __init__(self, code: str, detail: str, http_status: int = 400):
        super().__init__(detail)
        self.code = code
        self.detail = detail
        self.http_status = http_status


class ExecutionCrash(Exception):
    """Test-Injektion: simuliert Crash nach einem Saga-Schritt.
    Der Zustand in DB ist bereits konsistent — Retry setzt sauber fort."""


# ─── Helpers ────────────────────────────────────────────────────────────
def _q_money(d: Decimal) -> Decimal:
    return d.quantize(_MONEY, rounding=ROUND_HALF_EVEN)


def _q_price(d: Decimal) -> Decimal:
    return d.quantize(_PRICE_QUANT, rounding=ROUND_HALF_EVEN)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _cache_key_cash(order_id: ObjectId) -> str:
    return f"execution:{order_id}:cash"


def _cache_key_reversal(order_id: ObjectId) -> str:
    return f"execution:{order_id}:cash-reversal"


def _serialize_execution(doc: dict) -> dict:
    def _dec(v):
        if v is None:
            return None
        d = _decimal_from_bson(v)
        return format(d, "f")

    def _iso(v):
        if isinstance(v, datetime):
            return v.isoformat()
        return v

    return {
        "id": str(doc["_id"]),
        "order_id": str(doc.get("order_id")) if doc.get("order_id") else None,
        "user_id": str(doc.get("user_id")) if doc.get("user_id") else None,
        "symbol": doc.get("symbol"),
        "quantity": int(doc.get("quantity") or 0),
        "execution_price": _dec(doc.get("execution_price")),
        "gross_amount": _dec(doc.get("gross_amount")),
        "currency": doc.get("currency", "EUR"),
        "status": doc.get("status"),
        "cash_event_id": str(doc.get("cash_event_id")) if doc.get("cash_event_id") else None,
        "position_id": str(doc.get("position_id")) if doc.get("position_id") else None,
        "quote_source": doc.get("quote_source"),
        "quote_as_of": doc.get("quote_as_of"),
        "quote_price_status": doc.get("quote_price_status"),
        "attempt_count": int(doc.get("attempt_count") or 0),
        "last_error": doc.get("last_error"),
        "created_at": _iso(doc.get("created_at")),
        "updated_at": _iso(doc.get("updated_at")),
        "completed_at": _iso(doc.get("completed_at")),
    }


# ─── Index-Ensure ───────────────────────────────────────────────────────
async def ensure_indexes(db) -> None:
    """Idempotente Indizes."""
    await db.order_executions.create_index(
        [("order_id", 1)], unique=True, name="order_id_unique",
    )
    await db.order_executions.create_index(
        [("user_id", 1), ("created_at", -1)], name="user_created_desc",
    )
    await db.order_executions.create_index(
        [("status", 1)], name="status_idx",
    )
    # Positions: Retry-Guard-Liste
    await db.stock_positions.create_index(
        [("user_id", 1), ("symbol", 1)],
        unique=True, sparse=True, name="user_symbol_unique",
    )


# ─── Saga ───────────────────────────────────────────────────────────────
async def execute_order(
    db,
    order_id: ObjectId,
    *,
    admin_id: Optional[str] = None,
    fail_after: Optional[str] = None,  # test only: "cash" | "position" | "settle"
) -> dict[str, Any]:
    """
    Öffentlicher Einstiegspunkt. Rückgabe:
      {
        "execution": {..serialized..},
        "resumed": bool,
        "order": {..status..}
      }
    Wirft `ExecutionError` bei sanften Fehlern (Quote/Cash/Limit).
    """
    if fail_after and fail_after not in ("cash", "position", "settle"):
        raise ExecutionError("BAD_FAIL_AFTER", "fail_after muss cash|position|settle sein", 422)

    lock = _exec_locks[str(order_id)]
    async with lock:
        return await _execute_order_locked(db, order_id, admin_id=admin_id, fail_after=fail_after)


async def _execute_order_locked(
    db,
    order_id: ObjectId,
    *,
    admin_id: Optional[str],
    fail_after: Optional[str],
) -> dict[str, Any]:
    # ── 1. Order laden + validieren ──────────────────────────────────
    order = await db.stock_orders.find_one({"_id": order_id})
    if not order:
        raise ExecutionError("ORDER_NOT_FOUND", "Order existiert nicht", 404)

    order_status = order.get("status")
    if order_status == "cancelled":
        raise ExecutionError("ORDER_CANCELLED", "Order wurde storniert", 409)
    if order_status not in ("pending", "executed"):
        raise ExecutionError("ORDER_BAD_STATUS", f"Order-Status '{order_status}' nicht ausführbar", 409)

    # Wenn Order bereits executed ist, aber Execution nicht completed:
    # Saga-Retry setzt fort (Idempotenz garantiert kein Doppel-Debit / Doppel-Position).
    exec_precheck = await db.order_executions.find_one({"order_id": order_id})
    if order_status == "executed" and exec_precheck and exec_precheck.get("status") == "completed":
        return {
            "execution": _serialize_execution(exec_precheck),
            "resumed": True,
            "order": {"status": "executed", "id": str(order_id)},
        }

    if (order.get("side") or "").lower() != "buy":
        raise ExecutionError("ORDER_NOT_BUY", "Nur Buy-Orders werden ausgeführt", 409)
    if (order.get("order_type") or "").lower() != "limit":
        raise ExecutionError("ORDER_NOT_LIMIT", "Nur Limit-Orders werden ausgeführt", 409)

    user_id = order["user_id"]
    if not isinstance(user_id, ObjectId):
        try:
            user_id = ObjectId(str(user_id))
        except Exception:
            raise ExecutionError("BAD_USER_ID", "Ungültiges user_id-Format in Order", 500)

    symbol = order["symbol"]
    qty = int(order["quantity"])
    limit_price = _decimal_from_bson(order["limit_price"])
    if qty <= 0 or limit_price <= 0:
        raise ExecutionError("ORDER_BAD_MATH", "quantity/limit_price ungültig", 500)

    # ── 2. Real Quote Gate ───────────────────────────────────────────
    quotes = await get_stock_quotes(db, [symbol])
    q = quotes.get(symbol) or {}
    price_status = q.get("price_status")
    real_price_raw = q.get("price")
    if real_price_raw is None or price_status == "unavailable":
        raise ExecutionError(
            "QUOTE_UNAVAILABLE",
            f"Keine echte Quote für {symbol} — Order bleibt pending.",
            409,
        )
    if price_status != "fresh":
        raise ExecutionError(
            "QUOTE_STALE",
            f"Quote für {symbol} ist {price_status} — Order bleibt pending.",
            409,
        )
    real_price = _q_price(Decimal(str(real_price_raw)))
    if real_price <= 0:
        raise ExecutionError("QUOTE_NON_POSITIVE", "Quote-Preis <= 0", 409)

    if real_price > limit_price:
        raise ExecutionError(
            "LIMIT_NOT_REACHED",
            f"Marktpreis {real_price} > Limit {limit_price} — Order bleibt pending.",
            409,
        )

    execution_price = real_price
    gross_amount = _q_money(execution_price * Decimal(qty))

    # ── 3. Execution-Dokument laden/anlegen (UNIQUE order_id) ────────
    exec_doc = await db.order_executions.find_one({"order_id": order_id})
    resumed = exec_doc is not None
    now = _now()
    if exec_doc is None:
        new_doc = {
            "order_id": order_id,
            "user_id": user_id,
            "symbol": symbol,
            "quantity": qty,
            "execution_price": Decimal128(execution_price),
            "gross_amount": Decimal128(gross_amount),
            "currency": "EUR",
            "status": "created",
            "cash_event_id": None,
            "position_id": None,
            "quote_source": q.get("source"),
            "quote_as_of": q.get("as_of"),
            "quote_price_status": price_status,
            "attempt_count": 1,
            "last_error": None,
            "created_at": now,
            "updated_at": now,
            "completed_at": None,
            "triggered_by": admin_id,
        }
        try:
            res = await db.order_executions.insert_one(new_doc)
            new_doc["_id"] = res.inserted_id
            exec_doc = new_doc
        except DuplicateKeyError:
            exec_doc = await db.order_executions.find_one({"order_id": order_id})
            resumed = True
    else:
        # Bei Resume: attempt_count anheben und Preis auf Original halten
        # (Preis darf sich zwischen Retries NICHT ändern, sonst würden
        # bereits gebuchte Cash-/Position-Beträge inkonsistent werden).
        await db.order_executions.update_one(
            {"_id": exec_doc["_id"]},
            {"$inc": {"attempt_count": 1}, "$set": {"updated_at": now}},
        )

    if exec_doc is None:  # theoretisch unmöglich
        raise ExecutionError("EXEC_MISSING", "Execution-Dokument nicht auffindbar", 500)

    # Aus dem persistierten Doc arbeiten (falls Resume mit anderem Preis-Vorschlag).
    persisted_price = _decimal_from_bson(exec_doc["execution_price"])
    persisted_gross = _decimal_from_bson(exec_doc["gross_amount"])
    persisted_qty = int(exec_doc["quantity"])
    persisted_symbol = exec_doc["symbol"]

    # ── 4. Saga-Schritt: CASH-DEBIT ──────────────────────────────────
    if exec_doc["status"] == "created":
        # Cash-Sufficient-Check (Ledger-basiert, nicht nur Reservation vertrauen).
        summary = await get_cash_summary(db, {"id": str(user_id)})
        balance = Decimal(summary["balance"])
        if balance < persisted_gross:
            await _mark_failed(db, exec_doc["_id"], "INSUFFICIENT_CASH",
                               f"balance={balance} < gross={persisted_gross}")
            raise ExecutionError(
                "INSUFFICIENT_CASH",
                f"Cash unzureichend: balance={balance} EUR, benötigt {persisted_gross} EUR.",
                400,
            )

        cash_res = await create_cash_event(
            db,
            user_id=str(user_id),
            event_type="stock_purchase",
            direction="debit",
            amount=str(persisted_gross),
            currency="EUR",
            status="settled",
            idempotency_key=_cache_key_cash(order_id),
            description=f"Kauf {persisted_qty} × {persisted_symbol} @ {persisted_price}",
            source="order_execution",
            source_reference_id=str(order_id),
            created_by=admin_id,
        )
        cash_event_id_str = cash_res["event"]["id"]
        cash_event_id = ObjectId(cash_event_id_str)
        await db.order_executions.update_one(
            {"_id": exec_doc["_id"]},
            {"$set": {
                "status": "cash_debited",
                "cash_event_id": cash_event_id,
                "updated_at": _now(),
            }},
        )
        exec_doc["status"] = "cash_debited"
        exec_doc["cash_event_id"] = cash_event_id

        if fail_after == "cash":
            raise ExecutionCrash("simulated crash after cash-debit")

    # ── 5. Saga-Schritt: POSITION-APPLY ──────────────────────────────
    if exec_doc["status"] == "cash_debited":
        position_id = await _apply_position(
            db,
            user_id=user_id,
            symbol=persisted_symbol,
            qty=persisted_qty,
            price=persisted_price,
            order_id=order_id,
        )
        await db.order_executions.update_one(
            {"_id": exec_doc["_id"]},
            {"$set": {
                "status": "position_applied",
                "position_id": position_id,
                "updated_at": _now(),
            }},
        )
        exec_doc["status"] = "position_applied"
        exec_doc["position_id"] = position_id

        if fail_after == "position":
            raise ExecutionCrash("simulated crash after position-apply")

    # ── 6. Saga-Schritt: ORDER-SETTLE ────────────────────────────────
    if exec_doc["status"] == "position_applied":
        now2 = _now()
        # CAS: nur setzen, wenn Order noch pending ist (Race-Schutz).
        upd = await db.stock_orders.update_one(
            {"_id": order_id, "status": "pending"},
            {"$set": {
                "status": "executed",
                "executed_price": Decimal128(persisted_price),
                "executed_quantity": persisted_qty,
                "executed_at": now2,
                "execution_id": exec_doc["_id"],
                "reserved_cash": Decimal128(Decimal("0.00")),  # Reservation aufheben
                "updated_at": now2,
            }},
        )
        if upd.matched_count == 0:
            # Cancel-Race: Order könnte zwischenzeitlich cancelled sein
            # (obwohl `cancel_order` einen Guard hat — Sicherheitsnetz).
            fresh_order = await db.stock_orders.find_one({"_id": order_id})
            fresh_status = (fresh_order or {}).get("status")
            if fresh_status == "cancelled":
                # Kritischer Zustand: Cash debited + Position applied + Order cancelled.
                # Compensation ist erforderlich (Cash-Reversal); Position bleibt
                # bestehen (Kunde hat Anspruch auf gebuchte Stücke), aber der
                # Ops-Flag markiert die Order zur manuellen Klärung.
                await db.order_executions.update_one(
                    {"_id": exec_doc["_id"]},
                    {"$set": {
                        "status": "compensation_required",
                        "last_error": "CANCEL_RACE: order cancelled after cash+position",
                        "updated_at": now2,
                    }},
                )
                raise ExecutionError(
                    "CANCEL_RACE",
                    "Order wurde während der Ausführung storniert — compensation_required.",
                    409,
                )
            # Andernfalls: Order ist bereits executed durch parallelen Lauf — OK.
        # order_settled auch dann setzen, wenn CAS 0 traf, aber Order executed ist.
        await db.order_executions.update_one(
            {"_id": exec_doc["_id"]},
            {"$set": {"status": "order_settled", "updated_at": now2}},
        )
        exec_doc["status"] = "order_settled"

        if fail_after == "settle":
            raise ExecutionCrash("simulated crash after order-settle")

    # ── 7. Complete ──────────────────────────────────────────────────
    if exec_doc["status"] == "order_settled":
        now3 = _now()
        await db.order_executions.update_one(
            {"_id": exec_doc["_id"]},
            {"$set": {
                "status": "completed",
                "completed_at": now3,
                "updated_at": now3,
            }},
        )
        exec_doc["status"] = "completed"
        exec_doc["completed_at"] = now3

    fresh = await db.order_executions.find_one({"_id": exec_doc["_id"]})
    fresh_order = await db.stock_orders.find_one({"_id": order_id})
    return {
        "execution": _serialize_execution(fresh),
        "resumed": resumed,
        "order": {
            "id": str(order_id),
            "status": fresh_order.get("status") if fresh_order else None,
            "executed_price": str(_decimal_from_bson(fresh_order.get("executed_price")))
                if fresh_order and fresh_order.get("executed_price") is not None else None,
            "executed_quantity": fresh_order.get("executed_quantity") if fresh_order else None,
            "executed_at": fresh_order["executed_at"].isoformat()
                if fresh_order and isinstance(fresh_order.get("executed_at"), datetime) else None,
        },
    }


# ─── Position-Apply (Retry-Safe) ────────────────────────────────────────
async def _apply_position(
    db,
    *,
    user_id: ObjectId,
    symbol: str,
    qty: int,
    price: Decimal,
    order_id: ObjectId,
) -> ObjectId:
    """
    Wendet die Execution auf `stock_positions` an.
    Retry-Guard: `applied_execution_ids` (Liste). Wenn `order_id` bereits
    enthalten ist → No-Op, gleiche Position-ID zurückgeben (Idempotenz).
    """
    order_id_str = str(order_id)
    existing = await db.stock_positions.find_one(
        {"user_id": user_id, "symbol": symbol}
    )

    # Legacy-Rows haben user_id evtl. als String — defensiv migrieren.
    if not existing:
        existing = await db.stock_positions.find_one(
            {"user_id": str(user_id), "symbol": symbol}
        )
        if existing:
            # Legacy-Row auf ObjectId hochheben, damit weitere Reads stimmen.
            await db.stock_positions.update_one(
                {"_id": existing["_id"]},
                {"$set": {"user_id": user_id}},
            )
            existing["user_id"] = user_id

    # Idempotenz-Check: bereits angewendet?
    if existing and order_id_str in (existing.get("applied_execution_ids") or []):
        return existing["_id"]

    now = _now()
    if existing is None:
        # Neu-Insert. Unique-Index auf (user_id, symbol) verhindert Race-Duplikate.
        new_doc = {
            "user_id": user_id,
            "symbol": symbol,
            "quantity": qty,
            "avg_cost": Decimal128(_q_price(price)),
            "currency": "EUR",
            "is_active": True,
            "applied_execution_ids": [order_id_str],
            "created_at": now,
            "updated_at": now,
        }
        try:
            res = await db.stock_positions.insert_one(new_doc)
            return res.inserted_id
        except DuplicateKeyError:
            # Concurrent create → re-load und wende Update-Pfad an.
            existing = await db.stock_positions.find_one(
                {"user_id": user_id, "symbol": symbol}
            )
            if existing and order_id_str in (existing.get("applied_execution_ids") or []):
                return existing["_id"]

    # Update-Pfad — Weighted Average.
    old_qty = int(existing.get("quantity") or 0)
    old_avg = _decimal_from_bson(existing.get("avg_cost"))
    new_qty = old_qty + qty
    if new_qty <= 0:
        raise ExecutionError("BAD_POSITION_QTY", "Neu-Quantity <= 0", 500)
    numer = (Decimal(old_qty) * old_avg) + (Decimal(qty) * price)
    new_avg = _q_price(numer / Decimal(new_qty))

    # CAS: nur wenn order_id noch nicht in applied_execution_ids.
    upd = await db.stock_positions.update_one(
        {
            "_id": existing["_id"],
            "applied_execution_ids": {"$ne": order_id_str},
        },
        {
            "$set": {
                "quantity": new_qty,
                "avg_cost": Decimal128(new_avg),
                "updated_at": now,
                "is_active": True,
            },
            "$addToSet": {"applied_execution_ids": order_id_str},
        },
    )
    if upd.matched_count == 0:
        # Zwischenzeitlich angewendet → idempotent, gleiche Position-ID.
        return existing["_id"]
    return existing["_id"]


async def _mark_failed(db, exec_id: ObjectId, code: str, detail: str) -> None:
    await db.order_executions.update_one(
        {"_id": exec_id},
        {"$set": {
            "status": "failed",
            "last_error": f"{code}: {detail}"[:500],
            "updated_at": _now(),
        }},
    )
