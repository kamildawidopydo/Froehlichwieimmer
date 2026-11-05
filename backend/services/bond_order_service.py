"""Direkter Anleihekauf aus dem Guthaben: Kurs-Prüfung, Kostenberechnung, Beratungsanfrage.

Keine Ausführung: Orders werden reserviert und warten auf die Bestätigung der Partnerbank.
"""
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal, ROUND_DOWN, ROUND_HALF_UP
from typing import Optional

from bson import ObjectId

from services.cash_service import get_cash_summary

OPEN_ORDER_STATUSES = ("awaiting_bank", "bank_submitted")
_C = Decimal("0.01")


def _money(d: Decimal) -> Decimal:
    return d.quantize(_C, rounding=ROUND_HALF_UP)


def _parse_dt(v) -> Optional[datetime]:
    if isinstance(v, datetime):
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
    if not v:
        return None
    try:
        d = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
    except ValueError:
        return None
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def executable_buy_price(bond: dict) -> Optional[Decimal]:
    """Nur eine verbindliche, gültige Kursstellung der Partnerbank ist ausführbar.
    Der angezeigte (Referenz-)Kurs `aktueller_kurs` wird nie verwendet."""
    if not bond.get("is_available") or bond.get("requests_enabled") is False:
        return None
    kp = bond.get("kaufkurs")
    if not kp or float(kp) <= 0 or bond.get("kaufkurs_art") != "verbindlich":
        return None
    if not (bond.get("kaufkurs_quelle") or "").strip() or not _parse_dt(bond.get("kaufkurs_quoted_at")):
        return None
    vu = _parse_dt(bond.get("kaufkurs_valid_until"))
    if not vu or vu <= datetime.now(timezone.utc):
        return None
    return Decimal(str(kp))


def compute_quote(bond: dict, amount_eur: Decimal, price: Decimal) -> dict:
    denom = Decimal(str(bond.get("denomination") or 0)) or Decimal("1")
    unit_cost = denom * price / Decimal(100)
    pieces = int((amount_eur / unit_cost).to_integral_value(rounding=ROUND_DOWN)) if unit_cost > 0 else 0
    nominal = denom * pieces
    purchase = _money(nominal * price / Decimal(100))
    acc_pct = bond.get("accrued_interest_pct")
    accrued = _money(nominal * Decimal(str(acc_pct)) / Decimal(100)) if acc_pct is not None else Decimal("0.00")
    fee = Decimal("0.00")
    if bond.get("buy_fee_pct") is not None:
        fee += purchase * Decimal(str(bond["buy_fee_pct"])) / Decimal(100)
    if bond.get("buy_fee_min_eur") is not None:
        fee = max(fee, Decimal(str(bond["buy_fee_min_eur"])))
    if bond.get("buy_fee_fixed_eur") is not None:
        fee += Decimal(str(bond["buy_fee_fixed_eur"]))
    fee = _money(fee)
    return {
        "pieces": pieces,
        "nominal": nominal,
        "denomination": denom,
        "price_pct": price,
        "purchase_amount": purchase,
        "accrued_interest": accrued,
        "accrued_note": bond.get("accrued_note"),
        "fees": fee,
        "total": _money(purchase + accrued + fee),
        "price_source": bond.get("kaufkurs_quelle"),
        "price_quoted_at": bond.get("kaufkurs_quoted_at"),
        "price_valid_until": bond.get("kaufkurs_valid_until"),
    }


async def available_cash(db, user_id: str) -> Decimal:
    cs = await get_cash_summary(db, {"id": user_id})
    return Decimal(cs["available"])


def quote_to_json(q: dict, available: Decimal) -> dict:
    out = {k: (float(v) if isinstance(v, Decimal) else v) for k, v in q.items()}
    missing = max(Decimal("0"), q["total"] - available)
    out.update({
        "available": float(available),
        "sufficient": missing == 0,
        "missing": float(_money(missing)),
    })
    return out


async def record_advisory_request(db, user: dict, bond: dict, amount_eur: Decimal, required: Decimal,
                                  available: Decimal) -> None:
    """Beratungsanfrage (insufficient_buying_power_events), eine offene je Kunde + Anleihe."""
    now = datetime.now(timezone.utc)
    uid = ObjectId(user["id"])
    name = " ".join(x for x in (user.get("first_name"), user.get("last_name")) if x).strip() or user.get("email")
    await db.insufficient_buying_power_events.update_one(
        {"user_id": uid, "asset_type": "bond", "bond_id": str(bond["_id"]),
         "status": {"$in": ["new", "in_progress"]}, "deleted_at": {"$in": [None, False]}},
        {"$set": {
            "symbol": bond.get("isin"),
            "isin": bond.get("isin"),
            "stock_name": bond.get("bond_name"),
            "customer_name": name,
            "customer_display_id": f"KD-{str(uid)[-8:].upper()}",
            "requested_amount": float(amount_eur),
            "required_amount": float(required),
            "available_amount": float(available),
            "missing_amount": float(_money(max(Decimal("0"), required - available))),
            "order_type": "bond_buy",
            "currency": "EUR",
            "updated_at": now,
            "last_attempt_at": now,
        }, "$setOnInsert": {"created_at": now, "deleted_at": None, "status": "new"}},
        upsert=True,
    )
