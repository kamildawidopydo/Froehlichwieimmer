"""
Session 82.61a — Coupon-Domain Tests.

Diese Tests sind offline (kein Uvicorn), sie sprechen direkt gegen die Preview-
MongoDB via `MONGO_URL`/`DB_NAME` aus `backend/.env`. Sie prüfen die reine
Domain-Logik (Peek, Reserve, Release, Consume, State-Machine, Concurrency,
Idempotenz) und die Legacy-Parität der Rabatt-Formel.

Ausführung:
    cd /app/backend && python -m pytest tests/test_coupon_flow.py -q
"""

from __future__ import annotations

import asyncio
import os
import uuid
from decimal import Decimal
from pathlib import Path

import pytest
from bson import ObjectId
from bson.decimal128 import Decimal128
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# .env laden (MONGO_URL, DB_NAME)
_ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(_ENV_PATH)

from services.coupon_service import (  # noqa: E402
    CouponError,
    STATUS_ACTIVE,
    STATUS_CONSUMED,
    STATUS_RESERVED,
    admin_create_coupon,
    compute_discount,
    compute_net,
    consume_coupon_for_order,
    ensure_indexes,
    peek_coupon,
    release_coupon_for_order,
    reserve_coupon_for_order,
)


MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

QA_SESSION = "82.61a-pytest"


@pytest.fixture
async def db():
    client = AsyncIOMotorClient(MONGO_URL)
    _db = client[DB_NAME]
    await ensure_indexes(_db)
    yield _db
    # Cleanup unbenutzter (active) Preview-Coupons dieser QA-Session
    await _db.stock_trade_coupons.delete_many(
        {"qa_session": QA_SESSION, "status": STATUS_ACTIVE, "preview_only": True}
    )
    client.close()


async def _mk_coupon(db, pct: Decimal, code: str = None):
    return await admin_create_coupon(
        db, percent=pct, preview_only=True, qa_session=QA_SESSION, code=code,
    )


# ─── Legacy-Parity Rechen-Formel ────────────────────────────────────────
def test_discount_formula_legacy_parity():
    # 10 × 100.00 EUR, 10% Coupon → gross=1000.00, discount=100.00, net=900.00
    gross = Decimal("1000.00")
    pct = Decimal("10")
    assert compute_discount(gross, pct) == Decimal("100.00")
    assert compute_net(gross, pct) == Decimal("900.00")

    # 3 × 33.33 EUR, 15% → gross=99.99, discount=round(99.99*0.15,2)=15.00 (14.9985→15.00)
    gross2 = Decimal("99.99")
    assert compute_discount(gross2, Decimal("15")) == Decimal("15.00")
    assert compute_net(gross2, Decimal("15")) == Decimal("84.99")

    # 1 × 1.00 EUR, 5% → gross=1.00, discount=0.05, net=0.95
    assert compute_discount(Decimal("1.00"), Decimal("5")) == Decimal("0.05")
    assert compute_net(Decimal("1.00"), Decimal("5")) == Decimal("0.95")

    # Ohne Coupon → net == gross
    assert compute_net(Decimal("500.00"), None) == Decimal("500.00")


# ─── Peek ───────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_peek_valid(db):
    c = await _mk_coupon(db, Decimal("10"))
    res = await peek_coupon(
        db, code=c["code"], side="buy", quantity=10, limit_price=Decimal("100"),
    )
    assert res["percent"] in ("10", "10.0000")
    assert Decimal(res["gross"]) == Decimal("1000.00")
    assert Decimal(res["discount"]) == Decimal("100.00")
    assert Decimal(res["net"]) == Decimal("900.00")


@pytest.mark.asyncio
async def test_peek_sell_forbidden(db):
    c = await _mk_coupon(db, Decimal("10"))
    with pytest.raises(CouponError) as ei:
        await peek_coupon(db, code=c["code"], side="sell", quantity=1, limit_price=Decimal("10"))
    assert ei.value.code == "COUPON_SELL_FORBIDDEN"


@pytest.mark.asyncio
async def test_peek_invalid_code(db):
    with pytest.raises(CouponError) as ei:
        await peek_coupon(db, code="DOES_NOT_EXIST_XYZ", side="buy", quantity=1, limit_price=Decimal("10"))
    assert ei.value.code == "COUPON_INVALID"


@pytest.mark.asyncio
async def test_peek_is_read_only(db):
    c = await _mk_coupon(db, Decimal("10"))
    for _ in range(3):
        await peek_coupon(db, code=c["code"], side="buy", quantity=1, limit_price=Decimal("100"))
    doc = await db.stock_trade_coupons.find_one({"_id": c["_id"]})
    assert doc["status"] == STATUS_ACTIVE
    assert doc.get("reserved_order_id") is None
    assert doc.get("consumed_at") is None


# ─── Reserve ────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_reserve_success(db):
    c = await _mk_coupon(db, Decimal("10"))
    oid = ObjectId()
    updated = await reserve_coupon_for_order(db, code=c["code"], order_id=oid, side="buy")
    assert updated["status"] == STATUS_RESERVED
    assert updated["reserved_order_id"] == oid


@pytest.mark.asyncio
async def test_reserve_sell_forbidden(db):
    c = await _mk_coupon(db, Decimal("10"))
    with pytest.raises(CouponError) as ei:
        await reserve_coupon_for_order(db, code=c["code"], order_id=ObjectId(), side="sell")
    assert ei.value.code == "COUPON_SELL_FORBIDDEN"


@pytest.mark.asyncio
async def test_second_reserve_same_coupon_blocked(db):
    c = await _mk_coupon(db, Decimal("10"))
    o1 = ObjectId()
    await reserve_coupon_for_order(db, code=c["code"], order_id=o1, side="buy")
    with pytest.raises(CouponError) as ei:
        await reserve_coupon_for_order(db, code=c["code"], order_id=ObjectId(), side="buy")
    assert ei.value.code == "COUPON_NOT_AVAILABLE"


@pytest.mark.asyncio
async def test_concurrent_reservation_exactly_one_wins(db):
    c = await _mk_coupon(db, Decimal("15"))
    oids = [ObjectId() for _ in range(5)]
    results = await asyncio.gather(
        *[reserve_coupon_for_order(db, code=c["code"], order_id=o, side="buy") for o in oids],
        return_exceptions=True,
    )
    successes = [r for r in results if not isinstance(r, Exception)]
    failures = [r for r in results if isinstance(r, CouponError) and r.code == "COUPON_NOT_AVAILABLE"]
    assert len(successes) == 1, f"expected exactly 1 successful reservation, got {len(successes)}"
    assert len(failures) == 4


# ─── Release ────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_release_success_and_idempotent(db):
    c = await _mk_coupon(db, Decimal("10"))
    oid = ObjectId()
    await reserve_coupon_for_order(db, code=c["code"], order_id=oid, side="buy")
    r1 = await release_coupon_for_order(db, coupon_id=c["_id"], order_id=oid)
    r2 = await release_coupon_for_order(db, coupon_id=c["_id"], order_id=oid)
    assert r1 is True
    assert r2 is False  # idempotent no-op
    doc = await db.stock_trade_coupons.find_one({"_id": c["_id"]})
    assert doc["status"] == STATUS_ACTIVE
    assert doc.get("reserved_order_id") is None


@pytest.mark.asyncio
async def test_release_wrong_order_does_not_release(db):
    c = await _mk_coupon(db, Decimal("10"))
    oid = ObjectId()
    await reserve_coupon_for_order(db, code=c["code"], order_id=oid, side="buy")
    r = await release_coupon_for_order(db, coupon_id=c["_id"], order_id=ObjectId())
    assert r is False
    doc = await db.stock_trade_coupons.find_one({"_id": c["_id"]})
    assert doc["status"] == STATUS_RESERVED


# ─── Consume ────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_consume_success_and_idempotent(db):
    c = await _mk_coupon(db, Decimal("10"))
    oid = ObjectId()
    uid = ObjectId()
    await reserve_coupon_for_order(db, code=c["code"], order_id=oid, side="buy")
    r1 = await consume_coupon_for_order(db, coupon_id=c["_id"], order_id=oid, user_id=uid)
    r2 = await consume_coupon_for_order(db, coupon_id=c["_id"], order_id=oid, user_id=uid)
    assert r1 is True
    assert r2 is False  # idempotent
    doc = await db.stock_trade_coupons.find_one({"_id": c["_id"]})
    assert doc["status"] == STATUS_CONSUMED
    assert doc["consumed_order_id"] == oid
    assert doc["consumed_by_user_id"] == uid
    assert doc.get("reserved_order_id") is None


@pytest.mark.asyncio
async def test_consume_other_order_conflict(db):
    c = await _mk_coupon(db, Decimal("10"))
    oid1 = ObjectId()
    uid = ObjectId()
    await reserve_coupon_for_order(db, code=c["code"], order_id=oid1, side="buy")
    await consume_coupon_for_order(db, coupon_id=c["_id"], order_id=oid1, user_id=uid)
    with pytest.raises(CouponError) as ei:
        await consume_coupon_for_order(db, coupon_id=c["_id"], order_id=ObjectId(), user_id=uid)
    assert ei.value.code == "COUPON_STATE_CONFLICT"


@pytest.mark.asyncio
async def test_consume_without_reserve_fails(db):
    c = await _mk_coupon(db, Decimal("10"))
    with pytest.raises(CouponError):
        await consume_coupon_for_order(
            db, coupon_id=c["_id"], order_id=ObjectId(), user_id=ObjectId(),
        )


@pytest.mark.asyncio
async def test_concurrent_consume_exactly_one_wins(db):
    c = await _mk_coupon(db, Decimal("20"))
    oid = ObjectId()
    uid = ObjectId()
    await reserve_coupon_for_order(db, code=c["code"], order_id=oid, side="buy")
    results = await asyncio.gather(
        *[consume_coupon_for_order(db, coupon_id=c["_id"], order_id=oid, user_id=uid) for _ in range(5)],
        return_exceptions=True,
    )
    # Alle 5 sollten "success" liefern (1× True, 4× False idempotent).
    okays = [r for r in results if r in (True, False)]
    errors = [r for r in results if isinstance(r, Exception)]
    assert len(errors) == 0, f"unexpected exceptions: {errors}"
    assert okays.count(True) == 1
    assert okays.count(False) == 4


# ─── Legacy-Parity Rechen-Vergleich ─────────────────────────────────────
def test_legacy_avg_cost_parity_note():
    """
    Legacy-Parität (Doku aus Session 82.60):
    - BUY 10 × AAPL @ 100 EUR mit 10% Coupon → cash_debit=900, avg_cost=100.
    - Position-avg_cost bleibt bei vollem executed_price (nicht 90).
    - Diese Anomalie wird bewusst NICHT gefixt.

    Dieser Test dokumentiert die Erwartung explizit.
    """
    gross = Decimal("1000.00")
    pct = Decimal("10")
    cash_debit = compute_net(gross, pct)
    assert cash_debit == Decimal("900.00")

    # avg_cost = executed_price (100), NICHT (executed_price - discount/qty=10.00 - 1.00=9.00)
    executed_price = Decimal("100.00")
    legacy_avg_cost = executed_price
    fair_avg_cost = executed_price - Decimal("10.00")
    assert legacy_avg_cost == Decimal("100.00")
    assert legacy_avg_cost != fair_avg_cost  # unterschiedlich → bewusst behalten
