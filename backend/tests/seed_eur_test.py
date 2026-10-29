"""Preview-only EUR test fixture. Usage: python tests/seed_eur_test.py seed|clean"""
import asyncio
import os
import sys
from datetime import datetime, timezone, timedelta
from decimal import Decimal

import bcrypt
from bson import ObjectId
from bson.decimal128 import Decimal128
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
EMAIL = "test_eur_qa@example.com"
PASSWORD = "TestEur-Qa-2026!"
D = lambda v: Decimal128(Decimal(str(v)))  # noqa: E731
COLLS = ["cash_ledger", "stock_positions", "stock_orders", "watchlists", "stock_alerts",
         "ipo_requests", "portfolio_snapshots", "order_executions", "price_alerts"]


async def clean(db):
    u = await db.users.find_one({"email": EMAIL})
    if not u:
        return print("nothing to clean")
    for c in COLLS:
        r = await db[c].delete_many({"$or": [{"user_id": u["_id"]}, {"user_id": str(u["_id"])}]})
        print(c, r.deleted_count)
    await db.users.delete_one({"_id": u["_id"]})
    print("user deleted")


async def seed(db):
    await clean(db)
    now = datetime.now(timezone.utc)
    uid = ObjectId()
    await db.users.insert_one({
        "_id": uid, "email": EMAIL, "name": "TEST_EUR QA", "first_name": "TEST_EUR", "last_name": "QA",
        "role": "user", "status": "active", "is_test_account": True, "must_change_password": False,
        "onboarding_completed": True, "password_hash": bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt()).decode(),
        "created_at": now, "updated_at": now,
    })
    await db.cash_ledger.insert_one({
        "user_id": uid, "type": "deposit", "direction": "credit", "amount": D("2000.00"), "currency": "EUR",
        "status": "settled", "idempotency_key": "test-eur-deposit", "source": "admin",
        "description": "TEST_EUR Einzahlung", "effective_at": now, "created_at": now,
    })
    for sym, qty, avg in (("AAPL", 3, "280.00"), ("VOLV-B.ST", 10, "25.00"), ("DBK", 20, "27.00"), ("TESTIPO", 4, "20.00")):
        await db.stock_positions.insert_one({
            "user_id": uid, "symbol": sym, "quantity": qty, "avg_cost": D(avg), "currency": "EUR",
            "is_active": True, "created_at": now, "updated_at": now,
        })
    hist = [("AAPL", "buy", 3, "280.00", "280.00"), ("VOLV-B.ST", "buy", 12, "25.00", "25.00"),
            ("VOLV-B.ST", "sell", 2, "26.50", "26.50"), ("DBK", "buy", 20, "27.00", "27.00")]
    for i, (sym, side, qty, lim, ex) in enumerate(hist):
        t = now - timedelta(days=10 - i)
        await db.stock_orders.insert_one({
            "user_id": uid, "symbol": sym, "side": side, "order_type": "limit", "quantity": qty,
            "limit_price": D(lim), "reserved_cash": D("0.00"), "currency": "EUR", "status": "executed",
            "idempotency_key": f"test-eur-hist-{i}", "source": "customer", "created_at": t, "updated_at": t,
            "executed_at": t, "executed_price": D(ex), "executed_quantity": qty,
        })
    for i, s in enumerate(("AAPL", "VOLV-B.ST", "DBK")):
        await db.watchlists.insert_one({"user_id": uid, "symbol": s, "asset_type": "stock", "display_name": s,
                                        "sort_order": i + 1, "created_at": now})
    await db.price_alerts.insert_one({"user_id": str(uid), "symbol": "AAPL", "direction": "above",
                                      "target_price": 400.0, "currency": "EUR", "note": "TEST_EUR",
                                      "is_active": True, "triggered_at": None, "triggered_price": None,
                                      "triggered_count": 0, "cooldown_until": None,
                                      "created_at": now, "updated_at": now})
    await db.ipo_requests.insert_one({
        "user_id": uid, "ipo_id": "6a9e986f4ceb21981b2e5688", "company_name": "TEST_EUR IPO AG",
        "ticker": "TESTIPO", "amount_eur": 80.0, "shares_requested": 4, "notes": "TEST_EUR",
        "status": "allocated", "source": "customer", "created_at": now, "updated_at": now,
        "allocated_shares": 4, "subscription_price_per_share": D("20.0000"),
        "listing_price_per_share": D("25.0000"), "allocation_gross_amount": D("80.00"), "allocation_date": now,
    })
    print("seeded", uid)


async def main():
    db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    await (seed(db) if sys.argv[1] == "seed" else clean(db))


asyncio.run(main())
