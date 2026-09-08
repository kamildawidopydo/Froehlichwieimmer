"""
Session 82.73 — Realized-PnL Backend Enrichment.

Prüft, dass `GET /api/portfolio/orders` das Feld `realized_pnl` authoritativ
aus `order_executions.realized_profit_loss` liefert:
  - Order OHNE Execution                → null
  - Order MIT Execution, PnL = null     → null
  - Order MIT Execution, PnL gesetzt    → String (Decimal128 formatiert)
  - Batched Query (kein N+1) — 1 zusätzliche DB-Query für n Orders.

Test läuft offline gegen Preview-Mongo (kein Uvicorn); ruft `list_orders`
direkt auf. Fixtures + Cleanup pro Testfall.
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

import pytest
import pytest_asyncio
from bson import ObjectId
from bson.decimal128 import Decimal128
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

_ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(_ENV_PATH)

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

# Break circular import: server.py imports routes.portfolio; routes.portfolio
# imports server. Ensure server module is fully loaded before we import from
# routes.portfolio in the tests below.
import server  # noqa: F401,E402
from routes.portfolio import list_orders  # noqa: E402
import routes.portfolio as pf  # noqa: E402

QA_SESSION = "82.73-pytest"


@pytest_asyncio.fixture
async def db():
    """
    Motor-Client pro Test (jeder Test = eigener Event-Loop unter pytest-asyncio).
    Wir patchen `routes.portfolio.db` auf denselben Client, damit `list_orders`
    nicht auf den beim Modul-Load erzeugten server-Client (falscher Loop) trifft.
    """
    client = AsyncIOMotorClient(MONGO_URL)
    _db = client[DB_NAME]
    orig_db = pf.db
    pf.db = _db
    try:
        yield _db
    finally:
        pf.db = orig_db
        client.close()


@pytest_asyncio.fixture
async def user_id(db):
    """Fresh throwaway ObjectId — no persistence needed for read-only test."""
    return ObjectId()


async def _seed_order(db, user_id: ObjectId, symbol: str = "TEST", side: str = "sell") -> ObjectId:
    now = datetime.now(timezone.utc)
    oid = ObjectId()
    await db.stock_orders.insert_one({
        "_id": oid,
        "user_id": user_id,
        "symbol": symbol,
        "side": side,
        "order_type": "market",
        "quantity": 10,
        "limit_price": Decimal128("100.00"),
        "status": "completed",
        "currency": "EUR",
        "idempotency_key": f"{QA_SESSION}-{uuid.uuid4()}",
        "created_at": now,
        "updated_at": now,
        "qa_session": QA_SESSION,
    })
    return oid


async def _seed_execution(db, order_id: ObjectId, user_id: ObjectId, realized: Decimal | None):
    now = datetime.now(timezone.utc)
    doc = {
        "_id": ObjectId(),
        "order_id": order_id,
        "user_id": user_id,
        "side": "sell",
        "symbol": "TEST",
        "quantity": 10,
        "execution_price": Decimal128("110.00"),
        "gross_amount": Decimal128("1100.00"),
        "cost_basis_sold": Decimal128("1000.00"),
        "status": "order_settled",
        "currency": "EUR",
        "created_at": now,
        "updated_at": now,
        "qa_session": QA_SESSION,
    }
    if realized is not None:
        doc["realized_profit_loss"] = Decimal128(realized)
    else:
        doc["realized_profit_loss"] = None
    await db.order_executions.insert_one(doc)


async def _cleanup(db, user_id: ObjectId):
    await db.stock_orders.delete_many({"user_id": user_id, "qa_session": QA_SESSION})
    await db.order_executions.delete_many({"user_id": user_id, "qa_session": QA_SESSION})


@pytest.mark.asyncio
async def test_realized_pnl_null_when_no_execution(db, user_id):
    oid = await _seed_order(db, user_id, symbol="NOEX")
    try:
        result = await list_orders(limit=50, user={"id": str(user_id)})
        row = next(r for r in result if r["id"] == str(oid))
        assert row["realized_pnl"] is None
    finally:
        await _cleanup(db, user_id)


@pytest.mark.asyncio
async def test_realized_pnl_null_when_execution_pnl_null(db, user_id):
    oid = await _seed_order(db, user_id, symbol="BUYX", side="buy")
    await _seed_execution(db, oid, user_id, realized=None)
    try:
        result = await list_orders(limit=50, user={"id": str(user_id)})
        row = next(r for r in result if r["id"] == str(oid))
        assert row["realized_pnl"] is None
    finally:
        await _cleanup(db, user_id)


@pytest.mark.asyncio
async def test_realized_pnl_positive(db, user_id):
    oid = await _seed_order(db, user_id, symbol="WINX")
    await _seed_execution(db, oid, user_id, realized=Decimal("123.45"))
    try:
        result = await list_orders(limit=50, user={"id": str(user_id)})
        row = next(r for r in result if r["id"] == str(oid))
        assert row["realized_pnl"] == "123.45"
    finally:
        await _cleanup(db, user_id)


@pytest.mark.asyncio
async def test_realized_pnl_negative(db, user_id):
    oid = await _seed_order(db, user_id, symbol="LOSSX")
    await _seed_execution(db, oid, user_id, realized=Decimal("-42.00"))
    try:
        result = await list_orders(limit=50, user={"id": str(user_id)})
        row = next(r for r in result if r["id"] == str(oid))
        assert row["realized_pnl"] == "-42.00"
    finally:
        await _cleanup(db, user_id)


@pytest.mark.asyncio
async def test_realized_pnl_batched_no_n_plus_one(db, user_id):
    """
    Prüft, dass für n Orders GENAU 1 zusätzliche `order_executions.find`-Query
    abgesetzt wird (kein N+1). Wir zählen `command_started`-Events an
    `order_executions` via Motor-CommandListener.
    """
    from pymongo import monitoring

    # 3 Orders + 2 Executions.
    oids = []
    for i in range(3):
        oid = await _seed_order(db, user_id, symbol=f"MIX{i}")
        oids.append(oid)
    await _seed_execution(db, oids[0], user_id, realized=Decimal("10.00"))
    await _seed_execution(db, oids[1], user_id, realized=Decimal("-5.00"))

    class _Counter(monitoring.CommandListener):
        def __init__(self):
            self.exec_find_count = 0

        def started(self, event):
            if event.command_name == "find" and event.command.get("filter", {}).get("order_id") is not None:
                # zählt find-Queries mit `order_id`-Filter → das ist der batched $in.
                self.exec_find_count += 1

        def succeeded(self, event): pass
        def failed(self, event): pass

    counter = _Counter()
    monitoring.register(counter)
    try:
        # Neuen Client aufmachen, damit Listener greift.
        client = AsyncIOMotorClient(MONGO_URL)
        _db = client[DB_NAME]

        # Patch: wir brauchen list_orders mit *diesem* db → temporär injizieren.
        orig_db = pf.db
        pf.db = _db
        try:
            result = await list_orders(limit=50, user={"id": str(user_id)})
        finally:
            pf.db = orig_db
            client.close()

        # Genau 1 Query mit `order_id`-Filter (der batched $in), NICHT 3.
        assert counter.exec_find_count == 1, (
            f"N+1 detected: expected 1 batched exec query, got {counter.exec_find_count}"
        )
        pnl_by_id = {r["id"]: r["realized_pnl"] for r in result if r["id"] in {str(o) for o in oids}}
        assert pnl_by_id[str(oids[0])] == "10.00"
        assert pnl_by_id[str(oids[1])] == "-5.00"
        assert pnl_by_id[str(oids[2])] is None
    finally:
        # Listener kann nicht deregistriert werden — best-effort no-op.
        await _cleanup(db, user_id)
