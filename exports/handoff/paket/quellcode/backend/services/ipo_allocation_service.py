"""
IPO-Allocation-Saga (Session 82.29 · Depot P0).

Spiegelt das Buy-Saga-Muster (82.26) auf approved IPO-Requests:
  1. Cash-Debit (append-only Ledger, `ipo_purchase`)
  2. Position-Apply (stock_positions upsert; Guard via `applied_allocation_ids`)
  3. Request-Settle (ipo_requests → status=allocated)
  4. Completed

MongoDB Standalone: kein Multi-Document-Transaction; persistierte Saga.
"""
from __future__ import annotations

import asyncio
import logging
from collections import defaultdict
from datetime import datetime, timezone
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
_alloc_locks: dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)


class AllocationError(Exception):
    def __init__(self, code: str, detail: str, http_status: int = 400):
        super().__init__(detail)
        self.code, self.detail, self.http_status = code, detail, http_status


class AllocationCrash(Exception):
    pass


def _q_money(d: Decimal) -> Decimal:
    return d.quantize(_MONEY, rounding=ROUND_HALF_EVEN)


def _q_price(d: Decimal) -> Decimal:
    return d.quantize(_PRICE, rounding=ROUND_HALF_EVEN)


def _now():
    return datetime.now(timezone.utc)


def _key_cash(rid: ObjectId) -> str:
    return f"ipo-allocation:{rid}:cash"


def _key_reversal(rid: ObjectId) -> str:
    return f"ipo-allocation:{rid}:cash-reversal"


def _serialize(doc: dict) -> dict:
    def _dec(v):
        if v is None: return None
        return format(_decimal_from_bson(v), "f")

    def _iso(v):
        return v.isoformat() if isinstance(v, datetime) else v

    return {
        "id": str(doc["_id"]),
        "ipo_request_id": str(doc.get("ipo_request_id")) if doc.get("ipo_request_id") else None,
        "user_id": str(doc.get("user_id")) if doc.get("user_id") else None,
        "ipo_id": doc.get("ipo_id"),
        "symbol": doc.get("symbol"),
        "allocated_shares": int(doc.get("allocated_shares") or 0),
        "subscription_price_per_share": _dec(doc.get("subscription_price_per_share")),
        "listing_price_per_share": _dec(doc.get("listing_price_per_share")),
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
    await db.ipo_allocations.create_index(
        [("ipo_request_id", 1)], unique=True, name="ipo_request_id_unique",
    )
    await db.ipo_allocations.create_index([("user_id", 1), ("created_at", -1)])


async def allocate_ipo_request(
    db,
    request_id: ObjectId,
    *,
    allocated_shares: int,
    subscription_price_per_share: Decimal,
    listing_price_per_share: Optional[Decimal] = None,
    decision_note: Optional[str] = None,
    admin_id: Optional[str] = None,
    fail_after: Optional[str] = None,   # "cash" | "position" | "settle"
) -> dict:
    if fail_after and fail_after not in ("cash", "position", "settle"):
        raise AllocationError("BAD_FAIL_AFTER", "fail_after muss cash|position|settle sein", 422)

    lock = _alloc_locks[str(request_id)]
    async with lock:
        return await _allocate_locked(
            db, request_id,
            allocated_shares=allocated_shares,
            subscription_price_per_share=subscription_price_per_share,
            listing_price_per_share=listing_price_per_share,
            decision_note=decision_note,
            admin_id=admin_id,
            fail_after=fail_after,
        )


async def _allocate_locked(db, request_id, *, allocated_shares, subscription_price_per_share,
                            listing_price_per_share, decision_note, admin_id, fail_after):
    # 1. Request laden + validieren
    req = await db.ipo_requests.find_one({"_id": request_id})
    if not req:
        raise AllocationError("REQUEST_NOT_FOUND", "IPO-Request existiert nicht", 404)

    st = req.get("status")
    # Session 82.29 · Bugfix Crash-after-settle Retry:
    # Nur bei bereits COMPLETED Allocation early-return, sonst Saga fortsetzen
    # (auch wenn request.status schon 'allocated' ist).
    if st == "allocated":
        existing_alloc = await db.ipo_allocations.find_one({"ipo_request_id": request_id})
        if existing_alloc and existing_alloc.get("status") == "completed":
            return {"allocation": _serialize(existing_alloc), "resumed": True,
                    "request": {"id": str(request_id), "status": "allocated"}}
        # sonst fällt Ausführung durch → Saga läuft die verbleibenden Schritte
        # (request-settle ist idempotent via `find_one_and_update({status: approved})`;
        # bei bereits allocated status matched_count=0, das ist ok).
    elif st != "approved":
        raise AllocationError("REQUEST_BAD_STATUS", f"Nur approved zulässig (aktuell '{st}')", 409)

    user_id = req.get("user_id")
    if not isinstance(user_id, ObjectId):
        try: user_id = ObjectId(str(user_id))
        except Exception: raise AllocationError("BAD_USER_ID", "user_id ungültig", 500)

    shares_requested = int(req.get("shares_requested") or 0)
    if allocated_shares <= 0:
        raise AllocationError("BAD_SHARES", "allocated_shares muss > 0 sein", 422)
    if allocated_shares > shares_requested:
        raise AllocationError("OVER_ALLOCATION",
                              f"allocated_shares {allocated_shares} > requested {shares_requested}", 422)
    if subscription_price_per_share <= 0:
        raise AllocationError("BAD_PRICE", "subscription_price_per_share muss > 0 sein", 422)

    # Symbol vom Katalog (nicht aus Payload)
    symbol = (req.get("ticker") or "").strip().upper()
    if not symbol:
        # Fallback: aus Katalog laden
        from routes.ipo_catalog import get_investable_ipo_by_id  # lazy
        try:
            cat = await get_investable_ipo_by_id(req.get("ipo_id"))
            symbol = (cat.get("ticker_proposed") or "").strip().upper()
        except Exception:
            symbol = ""
    if not symbol:
        raise AllocationError("MISSING_SYMBOL",
                              "IPO hat kein handelbares Ticker-Symbol — Allocation gestoppt.", 409)

    sub_price = _q_price(subscription_price_per_share)
    gross = _q_money(sub_price * Decimal(allocated_shares))
    listing = _q_price(listing_price_per_share) if listing_price_per_share is not None else None

    # 2. Allocation-Doc anlegen/laden (UNIQUE ipo_request_id)
    alloc = await db.ipo_allocations.find_one({"ipo_request_id": request_id})
    resumed = alloc is not None
    now = _now()
    if alloc is None:
        new_doc = {
            "ipo_request_id": request_id,
            "user_id": user_id,
            "ipo_id": req.get("ipo_id"),
            "symbol": symbol,
            "allocated_shares": allocated_shares,
            "subscription_price_per_share": Decimal128(sub_price),
            "listing_price_per_share": Decimal128(listing) if listing is not None else None,
            "gross_amount": Decimal128(gross),
            "currency": "EUR",
            "status": "created",
            "cash_event_id": None, "position_id": None,
            "attempt_count": 1, "last_error": None,
            "created_at": now, "updated_at": now, "completed_at": None,
            "triggered_by": admin_id,
            "decision_note": (decision_note or "").strip()[:500] or None,
        }
        try:
            r = await db.ipo_allocations.insert_one(new_doc)
            new_doc["_id"] = r.inserted_id
            alloc = new_doc
        except DuplicateKeyError:
            alloc = await db.ipo_allocations.find_one({"ipo_request_id": request_id})
            resumed = True
    else:
        await db.ipo_allocations.update_one(
            {"_id": alloc["_id"]},
            {"$inc": {"attempt_count": 1}, "$set": {"updated_at": now}},
        )

    persisted_shares = int(alloc["allocated_shares"])
    persisted_price = _decimal_from_bson(alloc["subscription_price_per_share"])
    persisted_gross = _decimal_from_bson(alloc["gross_amount"])
    persisted_symbol = alloc["symbol"]

    # 3. CASH-DEBIT
    if alloc["status"] == "created":
        cs = await get_cash_summary(db, {"id": str(user_id)})
        if Decimal(cs["balance"]) < persisted_gross:
            await db.ipo_allocations.update_one(
                {"_id": alloc["_id"]},
                {"$set": {"status": "failed", "last_error": f"INSUFFICIENT_CASH balance={cs['balance']} gross={persisted_gross}", "updated_at": _now()}},
            )
            raise AllocationError("INSUFFICIENT_CASH",
                f"Nicht genügend verfügbare Liquidität für die IPO-Zuteilung (Balance {cs['balance']} EUR, benötigt {persisted_gross} EUR).",
                400,
            )
        cash_res = await create_cash_event(
            db,
            user_id=str(user_id),
            event_type="ipo_purchase", direction="debit",
            amount=str(persisted_gross), currency="EUR", status="settled",
            idempotency_key=_key_cash(request_id),
            description=f"IPO-Zuteilung {persisted_shares} × {persisted_symbol} @ {persisted_price}",
            source="ipo_allocation", source_reference_id=str(request_id),
            created_by=admin_id,
        )
        ce_id = ObjectId(cash_res["event"]["id"])
        await db.ipo_allocations.update_one(
            {"_id": alloc["_id"]},
            {"$set": {"status": "cash_debited", "cash_event_id": ce_id, "updated_at": _now()}},
        )
        alloc["status"] = "cash_debited"
        alloc["cash_event_id"] = ce_id
        if fail_after == "cash":
            raise AllocationCrash("simulated crash after ipo cash-debit")

    # 4. POSITION-APPLY
    if alloc["status"] == "cash_debited":
        pos_id = await _apply_position(db, user_id=user_id, symbol=persisted_symbol,
                                        qty=persisted_shares, price=persisted_price,
                                        request_id=request_id)
        await db.ipo_allocations.update_one(
            {"_id": alloc["_id"]},
            {"$set": {"status": "position_applied", "position_id": pos_id, "updated_at": _now()}},
        )
        alloc["status"] = "position_applied"
        alloc["position_id"] = pos_id
        if fail_after == "position":
            raise AllocationCrash("simulated crash after ipo position-apply")

    # 5. REQUEST-SETTLE
    if alloc["status"] == "position_applied":
        now_s = _now()
        upd = await db.ipo_requests.update_one(
            {"_id": request_id, "status": "approved"},
            {"$set": {
                "status": "allocated",
                "allocated_shares": persisted_shares,
                "subscription_price_per_share": Decimal128(persisted_price),
                "listing_price_per_share": Decimal128(_q_price(listing_price_per_share))
                    if listing_price_per_share is not None else None,
                "allocation_gross_amount": Decimal128(persisted_gross),
                "allocation_date": now_s,
                "allocation_id": alloc["_id"],
                "position_id": alloc.get("position_id"),
                "handled_at": now_s,
                "handled_by": ObjectId(admin_id) if admin_id and ObjectId.is_valid(admin_id) else None,
                "updated_at": now_s,
            }},
        )
        if upd.matched_count == 0:
            fresh_req = await db.ipo_requests.find_one({"_id": request_id})
            if (fresh_req or {}).get("status") == "rejected":
                await db.ipo_allocations.update_one(
                    {"_id": alloc["_id"]},
                    {"$set": {"status": "compensation_required",
                              "last_error": "REQUEST_REJECTED_MID_SAGA", "updated_at": now_s}},
                )
                raise AllocationError("REQUEST_REJECTED_RACE",
                    "Request wurde während der Zuteilung abgelehnt — compensation_required.", 409)
        await db.ipo_allocations.update_one(
            {"_id": alloc["_id"]},
            {"$set": {"status": "request_settled", "updated_at": now_s}},
        )
        alloc["status"] = "request_settled"
        if fail_after == "settle":
            raise AllocationCrash("simulated crash after ipo request-settle")

    # 6. COMPLETE
    if alloc["status"] == "request_settled":
        now_c = _now()
        await db.ipo_allocations.update_one(
            {"_id": alloc["_id"]},
            {"$set": {"status": "completed", "completed_at": now_c, "updated_at": now_c}},
        )
        alloc["status"] = "completed"
        alloc["completed_at"] = now_c

    fresh = await db.ipo_allocations.find_one({"_id": alloc["_id"]})
    fresh_req = await db.ipo_requests.find_one({"_id": request_id})

    # Session 82.52 — Non-critical Customer-Notification NACH IPO-Completion.
    # Idempotent via `ipo-allocated:{request_id}`. Fehler nicht propagieren.
    if fresh and fresh.get("status") == "completed" and fresh_req:
        try:
            from services.notification_service import (
                insert_financial_notification,
                format_eur_de,
            )
            symbol = fresh_req.get("symbol") or fresh.get("symbol") or ""
            qty = fresh.get("allocated_quantity") or fresh.get("allocated_qty") or 0
            price_raw = fresh.get("allocation_price_per_share")
            try:
                price = float(price_raw.to_decimal()) if price_raw is not None and hasattr(price_raw, "to_decimal") else (float(price_raw) if price_raw is not None else None)
            except Exception:  # noqa: BLE001
                price = None
            if price is not None:
                msg = f"{qty} {symbol}-Aktien wurden Ihnen zu {format_eur_de(price)} zugeteilt."
            else:
                msg = f"{qty} {symbol}-Aktien wurden Ihnen zugeteilt."
            await insert_financial_notification(
                db,
                user_id=str(fresh_req.get("user_id") or fresh.get("user_id")),
                event_type="ipo_allocated",
                event_key=f"ipo-allocated:{str(request_id)}",
                title="IPO-Zuteilung erfolgt",
                message=msg,
                route="/dashboard/orders",
                symbol=symbol or None,
                reference_type="ipo_request",
                reference_id=str(request_id),
            )
        except Exception:  # noqa: BLE001
            logger.exception("ipo_allocated notification side-effect failed request_id=%s", request_id)
    return {
        "allocation": _serialize(fresh),
        "resumed": resumed,
        "request": {"id": str(request_id), "status": (fresh_req or {}).get("status")},
    }


async def _apply_position(db, *, user_id, symbol, qty, price, request_id) -> ObjectId:
    rid_str = str(request_id)
    pos = await db.stock_positions.find_one({"user_id": user_id, "symbol": symbol})
    if not pos:
        pos = await db.stock_positions.find_one({"user_id": str(user_id), "symbol": symbol})
        if pos:
            await db.stock_positions.update_one(
                {"_id": pos["_id"]}, {"$set": {"user_id": user_id}},
            )
            pos["user_id"] = user_id
    if pos and rid_str in (pos.get("applied_allocation_ids") or []):
        return pos["_id"]

    now = _now()
    if pos is None:
        new_doc = {
            "user_id": user_id, "symbol": symbol,
            "quantity": qty, "avg_cost": Decimal128(_q_price(price)),
            "currency": "EUR", "is_active": True,
            "applied_allocation_ids": [rid_str],
            "created_at": now, "updated_at": now,
        }
        try:
            r = await db.stock_positions.insert_one(new_doc)
            return r.inserted_id
        except DuplicateKeyError:
            pos = await db.stock_positions.find_one({"user_id": user_id, "symbol": symbol})
            if pos and rid_str in (pos.get("applied_allocation_ids") or []):
                return pos["_id"]

    old_qty = int(pos.get("quantity") or 0)
    old_avg = _decimal_from_bson(pos.get("avg_cost"))
    new_qty = old_qty + qty
    numer = (Decimal(old_qty) * old_avg) + (Decimal(qty) * price)
    new_avg = _q_price(numer / Decimal(new_qty))

    upd = await db.stock_positions.update_one(
        {"_id": pos["_id"], "applied_allocation_ids": {"$ne": rid_str}},
        {"$set": {"quantity": new_qty, "avg_cost": Decimal128(new_avg),
                  "updated_at": now, "is_active": True},
         "$addToSet": {"applied_allocation_ids": rid_str}},
    )
    if upd.matched_count == 0:
        pos2 = await db.stock_positions.find_one({"_id": pos["_id"]})
        if pos2 and rid_str in (pos2.get("applied_allocation_ids") or []):
            return pos["_id"]
    return pos["_id"]
