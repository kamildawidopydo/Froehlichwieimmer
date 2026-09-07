"""
Order-Matching-Service (Session 82.27 · Depot P0 · Auto-Limit-Match).

Zweck: pending **Limit-Buy**-Orders periodisch gegen echte Quotes prüfen
und bei erfüllter Limit-Bedingung über die BESTEHENDE Order-Execution-Saga
(Session 82.26) ausführen.

Design:
  * KEINE eigene Cash-/Position-/Settlement-Logik.
  * Genau EIN Codepfad für Order-Ausführung: `execute_order(db, order_id, ...)`.
  * Sequenzielle Verarbeitung nach `created_at ASC` (deterministische Priorität).
  * Nur `price_status='fresh'` triggert einen Match — stale/unavailable → skip.
  * Cancel- und Cash-Races sind bereits durch die Saga abgesichert
    (Status-Recheck, Balance-Recheck, DB-Idempotenz).

Rückgabe: kompakter Report mit Zählern pro Kategorie.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from decimal import Decimal

from bson.decimal128 import Decimal128

from services.order_execution_service import execute_order, ExecutionError
from services.stock_price_service import get_quotes as get_stock_quotes


logger = logging.getLogger(__name__)


def _to_decimal(v) -> Decimal:
    if v is None:
        return Decimal("0")
    if isinstance(v, Decimal128):
        return v.to_decimal()
    if isinstance(v, Decimal):
        return v
    return Decimal(str(v))


async def run_pending_limit_buy_matching(
    db,
    *,
    trigger: str = "manual",
    max_orders: int = 500,
) -> dict:
    """
    Läuft einmal durch alle pending Limit-Buy-Orders und ruft für jede
    ausführungsfähige Order die bestehende Saga auf.
    """
    started_at = datetime.now(timezone.utc)

    # ── 1. Pending Buy-Limit-Orders (ältere zuerst) ──────────────────
    query = {"status": "pending", "side": "buy", "order_type": "limit"}
    orders: list[dict] = await db.stock_orders.find(query).sort("created_at", 1).limit(max_orders).to_list(max_orders)

    counters = {
        "orders_seen": len(orders),
        "orders_eligible": 0,
        "orders_limit_not_reached": 0,
        "orders_quote_stale": 0,
        "orders_quote_unavailable": 0,
        "orders_executed": 0,
        "orders_failed": 0,
        "orders_cancelled_during_run": 0,
        "insufficient_cash": 0,
        "quotes_fresh": 0,
        "quotes_stale": 0,
        "quotes_unavailable": 0,
        "quote_errors": 0,
    }

    if not orders:
        finished_at = datetime.now(timezone.utc)
        return {
            "trigger": trigger,
            "started_at": started_at.isoformat(),
            "finished_at": finished_at.isoformat(),
            "duration_ms": int((finished_at - started_at).total_seconds() * 1000),
            **counters,
            "results": [],
        }

    # ── 2. Quotes gebündelt laden ────────────────────────────────────
    symbols = sorted({o.get("symbol") for o in orders if o.get("symbol")})
    try:
        quotes = await get_stock_quotes(db, symbols) if symbols else {}
    except Exception:  # noqa: BLE001
        logger.exception("matching: quote-fetch failed")
        counters["quote_errors"] = len(symbols)
        quotes = {}

    for sym in symbols:
        st = (quotes.get(sym) or {}).get("price_status")
        if st == "fresh":
            counters["quotes_fresh"] += 1
        elif st == "stale":
            counters["quotes_stale"] += 1
        else:
            counters["quotes_unavailable"] += 1

    # ── 3. Sequenzielle Verarbeitung ────────────────────────────────
    results: list[dict] = []
    for o in orders:
        symbol = o.get("symbol")
        order_id = o["_id"]
        limit_price = _to_decimal(o.get("limit_price"))
        q = quotes.get(symbol) or {}
        status = q.get("price_status")
        price_raw = q.get("price")

        # Quote-Gates (Reject-loggen, aber Order bleibt pending)
        if status != "fresh" or price_raw is None:
            if status == "stale":
                counters["orders_quote_stale"] += 1
                reason = "quote_stale"
            else:
                counters["orders_quote_unavailable"] += 1
                reason = "quote_unavailable"
            results.append({"order_id": str(order_id), "symbol": symbol, "action": "skip", "reason": reason})
            continue

        real_price = _to_decimal(price_raw)
        if real_price <= 0:
            counters["orders_quote_unavailable"] += 1
            results.append({"order_id": str(order_id), "symbol": symbol, "action": "skip", "reason": "quote_non_positive"})
            continue

        if real_price > limit_price:
            counters["orders_limit_not_reached"] += 1
            results.append({
                "order_id": str(order_id), "symbol": symbol, "action": "skip",
                "reason": "limit_not_reached",
                "real_price": str(real_price), "limit_price": str(limit_price),
            })
            continue

        counters["orders_eligible"] += 1

        # ── Delegate an bestehende Saga (Session 82.26) ─────────────
        try:
            saga_result = await execute_order(
                db, order_id, admin_id=f"matcher:{trigger}",
            )
        except ExecutionError as exc:
            # Sanfte Ablehnungen der Saga (Race gegen Cancel, Balance-Recheck etc.)
            code = getattr(exc, "code", "EXEC_ERROR")
            if code == "ORDER_CANCELLED":
                counters["orders_cancelled_during_run"] += 1
                action = "skip"
            elif code == "INSUFFICIENT_CASH":
                counters["insufficient_cash"] += 1
                action = "skip"
            elif code == "LIMIT_NOT_REACHED":
                # Kann durch Race zwischen Read und Saga-Recheck passieren.
                counters["orders_limit_not_reached"] += 1
                action = "skip"
            elif code in ("QUOTE_UNAVAILABLE", "QUOTE_STALE"):
                # Cache konnte zwischen Batch-Read und Saga-Recheck ausschlagen.
                if code == "QUOTE_STALE":
                    counters["orders_quote_stale"] += 1
                else:
                    counters["orders_quote_unavailable"] += 1
                action = "skip"
            else:
                counters["orders_failed"] += 1
                action = "failed"
            results.append({
                "order_id": str(order_id), "symbol": symbol,
                "action": action, "reason": code, "detail": exc.detail,
            })
            continue
        except Exception as exc:  # noqa: BLE001
            logger.exception("matching: saga crashed order_id=%s", str(order_id))
            counters["orders_failed"] += 1
            results.append({
                "order_id": str(order_id), "symbol": symbol,
                "action": "failed", "reason": "SAGA_CRASH", "detail": str(exc)[:200],
            })
            continue

        exec_status = (saga_result.get("execution") or {}).get("status")
        order_status = (saga_result.get("order") or {}).get("status")
        if order_status == "executed":
            counters["orders_executed"] += 1
            results.append({
                "order_id": str(order_id), "symbol": symbol,
                "action": "executed",
                "execution_price": (saga_result.get("execution") or {}).get("execution_price"),
                "execution_status": exec_status,
            })
        else:
            counters["orders_failed"] += 1
            results.append({
                "order_id": str(order_id), "symbol": symbol,
                "action": "failed", "reason": "SAGA_INCOMPLETE",
                "execution_status": exec_status,
            })

    finished_at = datetime.now(timezone.utc)
    report = {
        "trigger": trigger,
        "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat(),
        "duration_ms": int((finished_at - started_at).total_seconds() * 1000),
        **counters,
        "results": results,
    }
    logger.info(
        "portfolio_matcher done trigger=%s seen=%d executed=%d skipped_limit=%d stale=%d unavail=%d cancelled=%d cash_insuf=%d failed=%d ms=%d",
        trigger, counters["orders_seen"], counters["orders_executed"],
        counters["orders_limit_not_reached"], counters["orders_quote_stale"],
        counters["orders_quote_unavailable"], counters["orders_cancelled_during_run"],
        counters["insufficient_cash"], counters["orders_failed"], report["duration_ms"],
    )
    return report
