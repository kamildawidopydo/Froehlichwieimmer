"""
Bond-Execution-Saga (Session 82.30 · Depot P0).

Ausführung eines approved Bond-Kaufauftrags über persistierte Saga
(MongoDB Standalone → keine Multi-Document-Transaction).

States: created → cash_debited → position_applied → request_settled → completed
        (+ failed, compensation_required)

Rules:
  * Nur approved Requests (`bond_purchase_requests.status == "approved"`).
  * Bond aus Katalog muss `is_available=True` und maturity in Zukunft haben.
  * `nominal_amount` respektiert `denomination` (Vielfaches).
  * `execution_price_pct > 0`, Symbol/ISIN aus Katalog (nicht Client).
  * Weighted-Average auf `bond_positions.(user_id,isin)`.
  * Kein Bond-Marktpreis → `current_price_pct=null · market_value=null · valuation_complete=false`.
"""
from __future__ import annotations

import asyncio
import logging
from collections import defaultdict
from datetime import datetime, timezone, date as _date
from decimal import Decimal, ROUND_HALF_EVEN
from typing import Optional

from bson import ObjectId
from bson.decimal128 import Decimal128
from pymongo.errors import DuplicateKeyError

from services.cash_service import (
    create_cash_event, get_cash_summary, _decimal_from_bson,
)


logger = logging.getLogger(__name__)
_MONEY = Decimal("0.01")
_PRICE = Decimal("0.0001")
_locks: dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)


class BondExecError(Exception):
    def __init__(self, code: str, detail: str, http_status: int = 400):
        super().__init__(detail)
        self.code, self.detail, self.http_status = code, detail, http_status


class BondExecCrash(Exception):
    pass


def _q_money(d: Decimal) -> Decimal:
    return d.quantize(_MONEY, rounding=ROUND_HALF_EVEN)


def _q_price(d: Decimal) -> Decimal:
    return d.quantize(_PRICE, rounding=ROUND_HALF_EVEN)


def _now():
    return datetime.now(timezone.utc)


def _key_cash(rid: ObjectId) -> str:
    return f"bond-execution:{rid}:cash"


def _serialize(doc: dict) -> dict:
    def _dec(v):
        if v is None: return None
        return format(_decimal_from_bson(v), "f")

    def _iso(v):
        return v.isoformat() if isinstance(v, datetime) else v

    return {
        "id": str(doc["_id"]),
        "bond_request_id": str(doc.get("bond_request_id")) if doc.get("bond_request_id") else None,
        "user_id": str(doc.get("user_id")) if doc.get("user_id") else None,
        "bond_id": doc.get("bond_id"),
        "isin": doc.get("isin"),
        "nominal_amount": _dec(doc.get("nominal_amount")),
        "execution_price_pct": _dec(doc.get("execution_price_pct")),
        "gross_amount": _dec(doc.get("gross_amount")),
        "currency": doc.get("currency", "EUR"),
        "status": doc.get("status"),
        "cash_event_id": str(doc.get("cash_event_id")) if doc.get("cash_event_id") else None,
        "position_id": str(doc.get("position_id")) if doc.get("position_id") else None,
        "attempt_count": int(doc.get("attempt_count") or 0),
        "last_error": doc.get("last_error"),
        "created_at": _iso(doc.get("created_at")),
        "updated_at": _iso(doc.get("updated_at")),
        "completed_at": _iso(doc.get("completed_at")),
    }


async def ensure_indexes(db) -> None:
    await db.bond_executions.create_index(
        [("bond_request_id", 1)], unique=True, name="bond_request_id_unique",
    )
    await db.bond_executions.create_index([("user_id", 1), ("created_at", -1)])
    await db.bond_positions.create_index(
        [("user_id", 1), ("isin", 1)], unique=True, sparse=True, name="user_isin_unique",
    )


async def execute_bond_request(
    db, request_id: ObjectId, *,
    nominal_amount: Decimal, execution_price_pct: Decimal,
    decision_note: Optional[str] = None,
    admin_id: Optional[str] = None,
    fail_after: Optional[str] = None,
    accrued_interest: Decimal = Decimal("0"),
    fees: Decimal = Decimal("0"),
    bank_reference: Optional[str] = None,
    bank_confirmed_at: Optional[str] = None,
) -> dict:
    if fail_after and fail_after not in ("cash", "position", "settle"):
        raise BondExecError("BAD_FAIL_AFTER", "fail_after muss cash|position|settle sein", 422)
    async with _locks[str(request_id)]:
        return await _run(
            db, request_id,
            nominal_amount=nominal_amount, execution_price_pct=execution_price_pct,
            decision_note=decision_note, admin_id=admin_id, fail_after=fail_after,
            accrued_interest=accrued_interest, fees=fees,
            bank_reference=bank_reference, bank_confirmed_at=bank_confirmed_at,
        )


EXECUTABLE_STATUSES = ("approved", "bank_submitted")


async def _run(db, request_id, *, nominal_amount, execution_price_pct, decision_note, admin_id, fail_after,
               accrued_interest=Decimal("0"), fees=Decimal("0"), bank_reference=None, bank_confirmed_at=None):
    # 1. Request laden
    req = await db.bond_purchase_requests.find_one({"_id": request_id})
    if not req:
        raise BondExecError("REQUEST_NOT_FOUND", "Bond-Request existiert nicht", 404)

    st = req.get("status")
    if st == "executed":
        exec_prev = await db.bond_executions.find_one({"bond_request_id": request_id})
        if exec_prev and exec_prev.get("status") == "completed":
            return {"execution": _serialize(exec_prev), "resumed": True,
                    "request": {"id": str(request_id), "status": "executed"}}
    elif st not in EXECUTABLE_STATUSES:
        raise BondExecError("REQUEST_BAD_STATUS", f"Nur genehmigte bzw. an die Bank übermittelte Aufträge zulässig (aktuell '{st}')", 409)
    is_direct = req.get("order_type") == "direct"
    if is_direct and st != "executed" and (not (bank_reference or "").strip() or not bank_confirmed_at):
        raise BondExecError("BANK_CONFIRMATION_REQUIRED",
            "Ausführung nur mit Referenz und Datum der Ausführungsbestätigung der Partnerbank.", 422)
    if accrued_interest < 0 or fees < 0:
        raise BondExecError("BAD_AMOUNT", "Stückzinsen und Gebühren dürfen nicht negativ sein", 422)

    user_id = req.get("user_id")
    if not isinstance(user_id, ObjectId):
        try: user_id = ObjectId(str(user_id))
        except Exception: raise BondExecError("BAD_USER_ID", "user_id ungültig", 500)

    # 2. Bond aus Katalog laden + validieren
    bond_id = req.get("bond_id")
    if not bond_id or not ObjectId.is_valid(bond_id):
        raise BondExecError("BOND_NOT_FOUND", "bond_id ungültig", 404)
    bond = await db.bond_catalog.find_one({"_id": ObjectId(bond_id)})
    if not bond:
        raise BondExecError("BOND_NOT_FOUND", "Bond existiert nicht", 404)
    if not bond.get("is_available"):
        raise BondExecError("BOND_UNAVAILABLE", "Anleihe ist nicht verfügbar", 409)
    maturity = bond.get("faelligkeitsdatum")
    if maturity:
        try:
            if _date.fromisoformat(maturity) < _date.today():
                raise BondExecError("BOND_EXPIRED", "Anleihe ist bereits fällig", 409)
        except ValueError:
            pass  # unparseable → tolerieren (Katalog-Fehler)

    isin = (bond.get("isin") or "").strip().upper()
    if not isin:
        raise BondExecError("MISSING_ISIN", "Bond hat keine ISIN — Execution gestoppt", 409)

    # 3. Nominal/Preis validieren
    if nominal_amount <= 0:
        raise BondExecError("BAD_NOMINAL", "nominal_amount muss > 0 sein", 422)
    if execution_price_pct <= 0:
        raise BondExecError("BAD_PRICE", "execution_price_pct muss > 0 sein", 422)

    denom = bond.get("denomination")
    if denom:
        d_dec = Decimal(str(denom))
        if (nominal_amount % d_dec) != 0:
            raise BondExecError("INVALID_DENOMINATION",
                f"nominal_amount muss Vielfaches der Stückelung {d_dec} sein", 422)

    requested_nom = req.get("requested_nominal")
    if requested_nom:
        if nominal_amount > Decimal(str(requested_nom)):
            raise BondExecError("OVER_NOMINAL",
                f"nominal_amount {nominal_amount} > requested {requested_nom}", 422)

    price_pct = _q_price(execution_price_pct)
    gross = _q_money(nominal_amount * price_pct / Decimal(100))
    total = _q_money(gross + accrued_interest + fees)

    # 4. Execution-Doc anlegen/laden
    exec_doc = await db.bond_executions.find_one({"bond_request_id": request_id})
    resumed = exec_doc is not None
    now = _now()
    if exec_doc is None:
        new_doc = {
            "bond_request_id": request_id,
            "user_id": user_id,
            "bond_id": bond_id,
            "isin": isin,
            "nominal_amount": Decimal128(nominal_amount),
            "execution_price_pct": Decimal128(price_pct),
            "gross_amount": Decimal128(gross),
            "accrued_interest": Decimal128(_q_money(accrued_interest)),
            "fees": Decimal128(_q_money(fees)),
            "total_amount": Decimal128(total),
            "bank_reference": (bank_reference or "").strip()[:120] or None,
            "bank_confirmed_at": bank_confirmed_at,
            "currency": bond.get("currency") or "EUR",
            "status": "created",
            "cash_event_id": None, "position_id": None,
            "attempt_count": 1, "last_error": None,
            "created_at": now, "updated_at": now, "completed_at": None,
            "triggered_by": admin_id,
            "decision_note": (decision_note or "").strip()[:500] or None,
        }
        try:
            r = await db.bond_executions.insert_one(new_doc)
            new_doc["_id"] = r.inserted_id
            exec_doc = new_doc
        except DuplicateKeyError:
            exec_doc = await db.bond_executions.find_one({"bond_request_id": request_id})
            resumed = True
    else:
        await db.bond_executions.update_one(
            {"_id": exec_doc["_id"]},
            {"$inc": {"attempt_count": 1}, "$set": {"updated_at": now}},
        )

    persisted_nominal = _decimal_from_bson(exec_doc["nominal_amount"])
    persisted_price = _decimal_from_bson(exec_doc["execution_price_pct"])
    persisted_gross = _decimal_from_bson(exec_doc["gross_amount"])
    persisted_total = _decimal_from_bson(exec_doc.get("total_amount") or exec_doc["gross_amount"])
    persisted_isin = exec_doc["isin"]

    # 5. CASH-DEBIT
    if exec_doc["status"] == "created":
        cs = await get_cash_summary(db, {"id": str(user_id)})
        if Decimal(cs["balance"]) < persisted_total:
            await db.bond_executions.update_one(
                {"_id": exec_doc["_id"]},
                {"$set": {"status": "failed",
                          "last_error": f"INSUFFICIENT_CASH balance={cs['balance']} total={persisted_total}",
                          "updated_at": _now()}},
            )
            raise BondExecError("INSUFFICIENT_CASH",
                f"Nicht genügend verfügbare Liquidität für die Anleiheausführung (Balance {cs['balance']} EUR, benötigt {persisted_total} EUR).",
                400)
        cash_res = await create_cash_event(
            db, user_id=str(user_id),
            event_type="bond_purchase", direction="debit",
            amount=str(persisted_total), currency=exec_doc["currency"], status="settled",
            idempotency_key=_key_cash(request_id),
            description=(f"Anleihekauf {persisted_isin} · Nominal {persisted_nominal} @ {persisted_price}%"
                         + (f" · Bankref. {exec_doc.get('bank_reference')}" if exec_doc.get("bank_reference") else "")),
            source="bond_execution", source_reference_id=str(request_id),
            created_by=admin_id,
        )
        ce_id = ObjectId(cash_res["event"]["id"])
        await db.bond_executions.update_one(
            {"_id": exec_doc["_id"]},
            {"$set": {"status": "cash_debited", "cash_event_id": ce_id, "updated_at": _now()}},
        )
        exec_doc["status"] = "cash_debited"
        exec_doc["cash_event_id"] = ce_id
        if fail_after == "cash":
            raise BondExecCrash("simulated crash after bond cash-debit")

    # 6. POSITION-APPLY
    if exec_doc["status"] == "cash_debited":
        pos_id = await _apply_position(
            db, user_id=user_id, isin=persisted_isin, bond=bond, req=req,
            nominal=persisted_nominal, price_pct=persisted_price, request_id=request_id,
        )
        await db.bond_executions.update_one(
            {"_id": exec_doc["_id"]},
            {"$set": {"status": "position_applied", "position_id": pos_id, "updated_at": _now()}},
        )
        exec_doc["status"] = "position_applied"
        exec_doc["position_id"] = pos_id
        if fail_after == "position":
            raise BondExecCrash("simulated crash after bond position-apply")

    # 7. REQUEST-SETTLE
    if exec_doc["status"] == "position_applied":
        now_s = _now()
        upd = await db.bond_purchase_requests.update_one(
            {"_id": request_id, "status": {"$in": list(EXECUTABLE_STATUSES)}},
            {"$set": {
                "status": "executed",
                "executed_nominal": Decimal128(persisted_nominal),
                "execution_price_pct": Decimal128(persisted_price),
                "gross_amount": Decimal128(persisted_gross),
                "total_amount": Decimal128(persisted_total),
                "bank_reference": exec_doc.get("bank_reference"),
                "bank_confirmed_at": exec_doc.get("bank_confirmed_at"),
                "executed_at": now_s,
                "execution_id": exec_doc["_id"],
                "position_id": exec_doc.get("position_id"),
                "handled_at": now_s,
                "handled_by": ObjectId(admin_id) if admin_id and ObjectId.is_valid(admin_id) else None,
                "updated_at": now_s,
            }},
        )
        if upd.matched_count == 0:
            fresh = await db.bond_purchase_requests.find_one({"_id": request_id})
            if (fresh or {}).get("status") == "rejected":
                await db.bond_executions.update_one(
                    {"_id": exec_doc["_id"]},
                    {"$set": {"status": "compensation_required",
                              "last_error": "REQUEST_REJECTED_MID_SAGA", "updated_at": now_s}},
                )
                raise BondExecError("REQUEST_REJECTED_RACE",
                    "Request wurde während der Ausführung abgelehnt — compensation_required.", 409)
        await db.bond_executions.update_one(
            {"_id": exec_doc["_id"]},
            {"$set": {"status": "request_settled", "updated_at": now_s}},
        )
        exec_doc["status"] = "request_settled"
        if fail_after == "settle":
            raise BondExecCrash("simulated crash after bond request-settle")

    # 8. COMPLETE
    if exec_doc["status"] == "request_settled":
        now_c = _now()
        await db.bond_executions.update_one(
            {"_id": exec_doc["_id"]},
            {"$set": {"status": "completed", "completed_at": now_c, "updated_at": now_c}},
        )
        exec_doc["status"] = "completed"
        exec_doc["completed_at"] = now_c

    fresh = await db.bond_executions.find_one({"_id": exec_doc["_id"]})
    fresh_req = await db.bond_purchase_requests.find_one({"_id": request_id})

    # Session 82.52 — Non-critical Customer-Notification NACH Bond-Completion.
    # Idempotent via `bond-executed:{request_id}`. Fehler nicht propagieren.
    if fresh and fresh.get("status") == "completed" and fresh_req:
        try:
            from services.notification_service import (
                insert_financial_notification,
                format_pct_de,
            )
            isin = fresh_req.get("isin") or fresh.get("isin") or ""
            price_pct_raw = fresh.get("execution_price_pct")
            try:
                price_pct = float(price_pct_raw.to_decimal()) if price_pct_raw is not None and hasattr(price_pct_raw, "to_decimal") else (float(price_pct_raw) if price_pct_raw is not None else None)
            except Exception:  # noqa: BLE001
                price_pct = None
            if fresh_req.get("order_type") == "direct":
                msg = (f"Ihr Kaufauftrag für die {fresh_req.get('bond_name') or isin} wurde erfolgreich ausgeführt. "
                       "Die Anleihe wurde Ihrem Depot gutgeschrieben.")
            elif price_pct is not None:
                msg = f"Ihre Anleihe {isin} wurde zu {format_pct_de(price_pct)} ausgeführt."
            else:
                msg = f"Ihre Anleihe {isin} wurde ausgeführt."
            await insert_financial_notification(
                db,
                user_id=str(fresh_req.get("user_id") or fresh.get("user_id")),
                event_type="bond_executed",
                event_key=f"bond-executed:{str(request_id)}",
                title="Anleihe ausgeführt",
                message=msg,
                route="/dashboard/orders",
                isin=isin or None,
                reference_type="bond_request",
                reference_id=str(request_id),
            )
        except Exception:  # noqa: BLE001
            logger.exception("bond_executed notification side-effect failed request_id=%s", request_id)
    return {
        "execution": _serialize(fresh),
        "resumed": resumed,
        "request": {"id": str(request_id), "status": (fresh_req or {}).get("status")},
    }


async def _apply_position(db, *, user_id, isin, bond, req, nominal, price_pct, request_id) -> ObjectId:
    rid = str(request_id)
    pos = await db.bond_positions.find_one({"user_id": user_id, "isin": isin})
    if pos and rid in (pos.get("applied_execution_ids") or []):
        return pos["_id"]

    now = _now()
    if pos is None:
        cost_basis = _q_money(nominal * price_pct / Decimal(100))
        new_doc = {
            "user_id": user_id,
            "bond_id": req.get("bond_id"),
            "isin": isin,
            "bond_name": bond.get("bond_name"),
            "issuer": bond.get("issuer"),
            "currency": bond.get("currency") or "EUR",
            "nominal_amount": Decimal128(nominal),
            "average_purchase_price_pct": Decimal128(price_pct),
            "cost_basis": Decimal128(cost_basis),
            "kupon_rate": bond.get("kupon_rate"),
            "coupon_rate": bond.get("kupon_rate"),
            "maturity_date": bond.get("faelligkeitsdatum"),
            "denomination": bond.get("denomination"),
            "is_active": True,
            "applied_execution_ids": [rid],
            "created_at": now, "updated_at": now,
        }
        try:
            r = await db.bond_positions.insert_one(new_doc)
            return r.inserted_id
        except DuplicateKeyError:
            pos = await db.bond_positions.find_one({"user_id": user_id, "isin": isin})
            if pos and rid in (pos.get("applied_execution_ids") or []):
                return pos["_id"]

    old_nom = _decimal_from_bson(pos.get("nominal_amount"))
    old_avg = _decimal_from_bson(pos.get("average_purchase_price_pct"))
    new_nom = old_nom + nominal
    if new_nom <= 0:
        raise BondExecError("BAD_NOMINAL_STATE", "Neue Position-Nominal <= 0", 500)
    numer = (old_nom * old_avg) + (nominal * price_pct)
    new_avg = _q_price(numer / new_nom)
    new_cost = _q_money(new_nom * new_avg / Decimal(100))

    upd = await db.bond_positions.update_one(
        {"_id": pos["_id"], "applied_execution_ids": {"$ne": rid}},
        {"$set": {
            "nominal_amount": Decimal128(new_nom),
            "average_purchase_price_pct": Decimal128(new_avg),
            "cost_basis": Decimal128(new_cost),
            "updated_at": now, "is_active": True,
        }, "$addToSet": {"applied_execution_ids": rid}},
    )
    if upd.matched_count == 0:
        pos2 = await db.bond_positions.find_one({"_id": pos["_id"]})
        if pos2 and rid in (pos2.get("applied_execution_ids") or []):
            return pos["_id"]
    return pos["_id"]
