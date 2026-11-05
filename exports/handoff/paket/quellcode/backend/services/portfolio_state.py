"""
Portfolio-State-Service — Server-side Source of Truth (Session 82.25).

Konsolidierte Berechnung des aktuellen Depot-Zustands. Wird gleichzeitig von
`GET /api/portfolio/summary` UND vom Snapshot-Service konsumiert, damit
Live-Ansicht und persistierter Tages-Snapshot mathematisch identisch bleiben.

Kein Fake-Data-Fallback:
  * Stock ohne Quote → `stock_valuation_complete=False`, Symbol in `unpriced_symbols`.
  * Bond-Preis-Feed existiert (noch) nicht → `bond_valuation_complete=False`.

Cash-Regeln:
  * `cash.balance` wird für `total_value` verwendet (nicht `available`).
  * Offene Order-Reservations reduzieren `available`, nicht `balance` — daher
    dürfen sie das Vermögen nicht künstlich mindern.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Optional

from bson import ObjectId
from bson.decimal128 import Decimal128

from services.cash_service import get_cash_summary  # noqa: E402
from services.stock_price_service import get_quotes as get_stock_quotes  # noqa: E402


def _num(v, default: float = 0.0) -> float:
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


def _user_ownership(uid: ObjectId) -> dict:
    """Ownership-Filter kompatibel zu Legacy-Rows mit user_id als String."""
    return {"$or": [{"user_id": uid}, {"user_id": str(uid)}]}


async def compute_portfolio_state(db, user_oid: ObjectId) -> dict:
    """
    Aggregierter Depot-Zustand (Mongo-native). Rückgabestruktur identisch mit
    `GET /api/portfolio/summary`.
    """
    ownership = _user_ownership(user_oid)
    fake_user = {"id": str(user_oid)}

    # Cash (Ledger als Source of Truth) — balance ist ausschlaggebend für total_value.
    cash_summary = await get_cash_summary(db, fake_user)
    cash_balance = float(cash_summary["balance"])
    cash_available = float(cash_summary["available"])
    cash_unsettled = float(cash_summary["unsettled"])

    # Stock-Positionen (nur aktive) + reale Quotes aus dem Read-Through-Cache.
    stock_position_docs = await db.stock_positions.find(
        {**ownership, "is_active": {"$ne": False}}
    ).to_list(500)

    # Session 82.26 · Phase 0 — Quote-Integrity-Gate: bei fehlender Quote
    # KEIN Einstand-als-Marktwert-Fake. Unpriced Positions tragen weder zum
    # Marktwert noch zum P/L bei. Ihr Einstand fließt separat in
    # `stocks.cost_basis` (Anzeige erlaubt), aber NICHT in `market_value`.
    stock_total_einstand = 0.0        # ALLE Positionen (für cost_basis)
    stock_priced_einstand = 0.0       # NUR bepreiste (für P/L-Referenz)
    stock_market_value = 0.0          # NUR bepreiste (kein Fake)
    stock_positions_count = 0
    unpriced_symbols: list[str] = []
    if stock_position_docs:
        symbols = list({d.get("symbol") for d in stock_position_docs if d.get("symbol")})
        quotes = await get_stock_quotes(db, symbols) if symbols else {}
        for d in stock_position_docs:
            stock_positions_count += 1
            qty = _num(d.get("quantity"))
            avg = _num(d.get("avg_cost"))
            cost = qty * avg
            stock_total_einstand += cost
            q = quotes.get(d.get("symbol")) if d.get("symbol") else None
            if q and q.get("price") is not None:
                stock_market_value += qty * float(q["price"])
                stock_priced_einstand += cost
            else:
                if d.get("symbol"):
                    unpriced_symbols.append(d["symbol"])
    stock_valuation_complete = len(unpriced_symbols) == 0

    # Bond-Positionen — es existiert (noch) kein Bond-Live-Preis-Feed.
    # Wir summieren streng nach dem letzten bekannten Kurs `aktueller_kurs`
    # (in Prozent, wie Legacy). Fällt der Kurs, wird KEINE 100%-Nominalwert-
    # Schätzung erzwungen: valuation_complete bleibt False, bis ein echter
    # Bond-Preis-Feed existiert.
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
    bond_valuation_complete = False  # explizit — noch kein Live-Feed vorhanden.

    # Session 82.26 · Phase 0 — P/L wird ausschließlich über bepreiste Positionen
    # gerechnet. cost_basis bleibt Summe aller Positionen (Anzeige-Info),
    # market_value ist nur echtes market der bepreisten Positionen.
    stock_market_value = round(stock_market_value, 2)
    invested = stock_total_einstand + bond_wert
    profit_loss = round(stock_market_value - stock_priced_einstand, 2)
    profit_loss_pct = (
        round(profit_loss / stock_priced_einstand * 100, 4)
        if stock_priced_einstand > 0 else 0.0
    )
    # total_value: Cash + echtes Stock-Marktwert (bepreist) + Bond-Wert.
    # Unpriced-Positionen tragen NICHT zum total_value bei — UI erkennt
    # das an valuation_complete=false.
    total_value = cash_balance + stock_market_value + bond_wert

    return {
        "total_value": round(total_value, 2),
        "invested": round(invested, 2),
        "cash": {
            "balance": cash_balance,
            "available": cash_available,
            "unsettled": cash_unsettled,
        },
        "stocks": {
            "market_value": stock_market_value,
            "cost_basis": round(stock_total_einstand, 2),
            "priced_cost_basis": round(stock_priced_einstand, 2),
            "positions": stock_positions_count,
            "valuation_complete": stock_valuation_complete,
            "unpriced_symbols": unpriced_symbols,
        },
        "bonds": {
            "market_value": round(bond_wert, 2),
            "positions": bond_positions_count,
            "valuation_complete": bond_valuation_complete,
        },
        "profit_loss": profit_loss,
        "profit_loss_pct": profit_loss_pct,
        "day_change": 0.0,
        "day_change_pct": 0.0,
    }
