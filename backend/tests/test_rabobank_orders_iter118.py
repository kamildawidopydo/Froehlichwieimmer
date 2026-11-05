# Iteration 118 · Rabobank XS1002121454 follow-up: min-investment basis (purchase/nominal), duplicate-order guard,
# bank-submit/execute -> depot booking, insufficient funds advisory only on confirm, price-expiry alerts.
# Uses tester@mester.de; strict cleanup of only records created in this run. Run: pytest -n 0
import os
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
load_dotenv("/app/backend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN = ("qa.admin@kapital-direkt24.de", "Qa-ra46CVrWIW3wg6l5EI6IKqbx")
CUST = ("tester@mester.de", "HHHKKK222")
RABO_ID = "6aec4ccd70262b166764f09d"
PRICE_FIELDS = ("kaufkurs", "kaufkurs_art", "kaufkurs_quelle", "kaufkurs_quoted_at", "kaufkurs_valid_until")
mdb = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]


def _session(email, pw):
    s = requests.Session()
    s.headers.update({"Origin": BASE_URL, "Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pw})
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def env():
    admin = _session(*ADMIN)
    cust = _session(*CUST)
    uid = mdb.users.find_one({"email": CUST[0]})["_id"]
    uq = {"user_id": {"$in": [uid, str(uid)]}}
    t0 = datetime.now(timezone.utc)
    before_ledger = {d["_id"] for d in mdb.cash_ledger.find(uq, {"_id": 1})}
    before_pos = {d["_id"] for d in mdb.bond_positions.find(uq, {"_id": 1})}
    ctx = {"admin": admin, "cust": cust, "uid": uid, "uq": uq}
    yield ctx
    # CLEANUP (only artefacts of this run)
    admin.patch(f"{BASE_URL}/api/admin/bonds/catalog/{RABO_ID}",
                json={**{k: None for k in PRICE_FIELDS}, "min_order_basis": "purchase",
                      "requests_enabled": True, "orders_enabled": True})
    reqs = [d["_id"] for d in mdb.bond_purchase_requests.find(
        {**uq, "isin": "XS1002121454", "created_at": {"$gte": t0 - timedelta(seconds=5)}}, {"_id": 1})]
    print("CLEANUP requests", reqs)
    mdb.bond_executions.delete_many({"bond_request_id": {"$in": reqs}})
    mdb.bond_purchase_requests.delete_many({"_id": {"$in": reqs}})
    mdb.audit_log.delete_many({"entity_id": {"$in": [str(o) for o in reqs] + reqs}})
    mdb.insufficient_buying_power_events.delete_many({**uq, "bond_id": RABO_ID,
                                                      "created_at": {"$gte": t0 - timedelta(seconds=5)}})
    new_pos = [d["_id"] for d in mdb.bond_positions.find(uq, {"_id": 1}) if d["_id"] not in before_pos]
    mdb.bond_positions.delete_many({"_id": {"$in": new_pos}})
    new_ledger = [d["_id"] for d in mdb.cash_ledger.find(uq, {"_id": 1}) if d["_id"] not in before_ledger]
    print("CLEANUP ledger", new_ledger, "positions", new_pos)
    mdb.cash_ledger.delete_many({"_id": {"$in": new_ledger}})
    # bond_executed customer notifications created by the execution saga in this run
    mdb.stock_alert_notifications.delete_many({"user_id": str(uid), "type": "bond_executed",
                                               "_id": {"$gte": ObjectId.from_datetime(t0 - timedelta(seconds=5))}})


def _patch(env, **kw):
    r = env["admin"].patch(f"{BASE_URL}/api/admin/bonds/catalog/{RABO_ID}", json=kw)
    assert r.status_code == 200, r.text
    return r.json()


def _binding(env, hours=2):
    now = datetime.now(timezone.utc)
    return _patch(env, kaufkurs=109.10, kaufkurs_art="verbindlich", kaufkurs_quelle="TEST Vorschau",
                  kaufkurs_quoted_at=(now - timedelta(minutes=1)).isoformat(),
                  kaufkurs_valid_until=(now + timedelta(hours=hours)).isoformat())


def _check(env, amount):
    return env["cust"].post(f"{BASE_URL}/api/bonds/orders/check", json={"bond_id": RABO_ID, "amount_eur": amount})


def _order(env, amount, **kw):
    return env["cust"].post(f"{BASE_URL}/api/bonds/orders", json={"bond_id": RABO_ID, "amount_eur": amount, **kw})


def _ibp(env):
    return mdb.insufficient_buying_power_events.count_documents({**env["uq"], "bond_id": RABO_ID})


def _cash(env):
    c = env["cust"].get(f"{BASE_URL}/api/portfolio/cash").json(); c.pop("history", None); return c


class TestRabobankOrders:
    def test_01_offer_request_without_price(self, env):
        r = _check(env, 1000)
        assert r.status_code == 409 and "kein verbindlicher Kaufkurs" in r.json()["detail"]
        r = env["cust"].post(f"{BASE_URL}/api/bonds/requests", json={"bond_id": RABO_ID, "amount_eur": 1000})
        assert r.status_code == 201, r.text
        assert r.json()["status"] == "pending"
        env["offer_req"] = r.json()["id"]
        # cancel so it doesn't interfere
        c = env["admin"].post(f"{BASE_URL}/api/admin/bonds/requests/{env['offer_req']}/cancel", json={})
        assert c.status_code == 200 and c.json()["status"] == "cancelled"

    def test_02_quote_purchase_basis(self, env):
        out = _binding(env)
        assert out["buy_executable"] is True
        q = _check(env, 1000)
        assert q.status_code == 200, q.text
        q = q.json()
        print("quote purchase", q)
        assert q["pieces"] == 37 and q["nominal"] == 925.0 and q["purchase_amount"] == 1009.18
        assert q["total"] == 1009.18 and q["adjusted_to_minimum"] is True and q["min_order_basis"] == "purchase"
        assert q["fees"] == 0.0 and q["price_pct"] == 109.10

    def test_03_quote_nominal_basis(self, env):
        out = _patch(env, min_order_basis="nominal")
        assert out.get("min_order_basis") == "nominal"
        q = _check(env, 1000).json()
        print("quote nominal", q)
        assert q["pieces"] == 40 and q["nominal"] == 1000.0 and q["total"] == 1091.0
        assert q["adjusted_to_minimum"] is True and q["min_order_basis"] == "nominal"
        out = _patch(env, min_order_basis="purchase")
        assert out.get("min_order_basis") == "purchase"
        assert _check(env, 1000).json()["pieces"] == 37

    def test_04_insufficient_check_no_ibp(self, env):
        before = _ibp(env)
        r = _check(env, 5_000_000)
        assert r.status_code == 200 and r.json()["sufficient"] is False
        assert _ibp(env) == before, "orders/check must not create IBP"
        r = _order(env, 5_000_000)
        assert r.status_code == 402
        assert r.json()["detail"]["message"] == ("Ihr verfügbares Guthaben reicht für diesen Kauf derzeit nicht aus. "
                                                 "Ein persönlicher Berater wird sich mit Ihnen in Verbindung setzen.")
        assert _ibp(env) == before + 1
        _check(env, 5_000_000)
        assert _ibp(env) == before + 1

    def test_05_order_sufficient(self, env):
        q = _check(env, 1000).json()
        if q["available"] < 3500:
            d = env["admin"].post(f"{BASE_URL}/api/admin/portfolio/cash/deposit",
                                  json={"user_id": str(env["uid"]), "amount": "3500.00",
                                        "idempotency_key": f"TEST_rabo118_{uuid.uuid4().hex}",
                                        "description": "TEST Vorschau-Guthaben"})
            assert d.status_code in (200, 201), d.text
        c0 = _cash(env)
        env["cash0"] = c0
        print("cash before", c0)
        led0 = mdb.cash_ledger.count_documents(env["uq"])
        q = _check(env, 1000).json()
        assert q["sufficient"] is True and q["open_orders"] == []
        r = _order(env, 1000, expected_total=q["total"])
        assert r.status_code == 201, r.text
        o = r.json()
        assert o["status"] == "awaiting_bank"
        env["order1"] = o["id"]
        assert mdb.cash_ledger.count_documents(env["uq"]) == led0
        assert mdb.bond_positions.count_documents({**env["uq"], "isin": "XS1002121454"}) == 0
        c1 = _cash(env)
        print("cash after", c1)
        assert round(float(c0["cash_available"]) - float(c1["cash_available"]), 2) == 1009.18
        assert float(c0["cash_balance"]) == float(c1["cash_balance"])

    def test_06_duplicate_same_amount(self, env):
        q = _check(env, 1000).json()
        assert len(q["open_orders"]) == 1 and q["open_orders"][0]["nominal"] == 925.0
        r = _order(env, 1000, expected_total=q["total"])
        assert r.status_code == 409 and r.json()["detail"]["code"] == "DUPLICATE_ORDER"
        r = _order(env, 1000, confirm_additional=True)
        assert r.status_code == 409 and r.json()["detail"]["code"] == "DUPLICATE_ORDER"

    def test_07_different_amount_needs_confirm(self, env):
        r = _order(env, 2000)
        assert r.status_code == 409 and r.json()["detail"]["code"] == "OPEN_ORDER_EXISTS"
        r = _order(env, 2000, confirm_additional=True)
        assert r.status_code == 201, r.text
        env["order2"] = r.json()["id"]

    def test_08_bank_submit_execute(self, env):
        a = env["admin"]
        oid = env["order1"]
        r = a.post(f"{BASE_URL}/api/admin/bonds/requests/{oid}/execute",
                   json={"nominal_amount": "925", "execution_price_pct": "109.10"})
        print("execute before submit", r.status_code, r.text[:200])
        assert r.status_code == 409
        r = a.post(f"{BASE_URL}/api/admin/bonds/requests/{oid}/bank-submit", json={"note": "TEST"})
        assert r.status_code == 200 and r.json()["status"] == "bank_submitted", r.text
        # still duplicate while bank_submitted
        assert _order(env, 1000).json()["detail"]["code"] == "DUPLICATE_ORDER"
        c_before = _cash(env)
        led0 = mdb.cash_ledger.count_documents(env["uq"])
        r = a.post(f"{BASE_URL}/api/admin/bonds/requests/{oid}/execute",
                   json={"nominal_amount": "925", "execution_price_pct": "109.10", "bank_reference": "TEST-REF-118",
                         "bank_confirmed_at": datetime.now(timezone.utc).isoformat()})
        print("execute", r.status_code, r.text[:400])
        assert r.status_code == 200, r.text
        r2 = a.post(f"{BASE_URL}/api/admin/bonds/requests/{oid}/execute",
                    json={"nominal_amount": "925", "execution_price_pct": "109.10"})
        print("re-execute", r2.status_code, r2.text[:200])
        assert mdb.cash_ledger.count_documents(env["uq"]) == led0 + 1
        debit = mdb.cash_ledger.find_one({**env["uq"], "source_reference_id": oid})
        print("debit", debit)
        assert debit["direction"] == "debit"
        assert abs(float(str(debit["amount"])) - 1009.18) < 0.001
        pos = list(mdb.bond_positions.find({**env["uq"], "isin": "XS1002121454"}))
        print("positions", pos)
        assert len(pos) == 1
        assert abs(float(str(pos[0].get("nominal") or pos[0].get("nominal_amount"))) - 925) < 0.001
        c_after = _cash(env)
        print("cash before/after exec", c_before, c_after)
        assert round(float(c_before["cash_balance"]) - float(c_after["cash_balance"]), 2) == 1009.18
        # reservation released: available unchanged by execution (reserve -> debit)
        assert round(float(c_before["cash_available"]), 2) == round(float(c_after["cash_available"]), 2)
        st = mdb.bond_purchase_requests.find_one({"_id": ObjectId(oid)})["status"]
        assert st == "executed"

    def test_09_same_amount_after_execute_and_cancel(self, env):
        # order2 (2000) still open -> 1000 needs confirm_additional, but not duplicate
        r = _order(env, 1000)
        assert r.status_code == 409 and r.json()["detail"]["code"] == "OPEN_ORDER_EXISTS"
        c = env["admin"].post(f"{BASE_URL}/api/admin/bonds/requests/{env['order2']}/cancel", json={})
        assert c.status_code == 200 and c.json()["status"] == "cancelled"
        q = _check(env, 1000).json()
        assert q["open_orders"] == []
        r = _order(env, 1000, expected_total=q["total"])
        assert r.status_code == 201, r.text
        env["order3"] = r.json()["id"]
        c = env["admin"].post(f"{BASE_URL}/api/admin/bonds/requests/{env['order3']}/cancel", json={})
        assert c.status_code == 200

    def test_10_price_expiring_alerts(self, env):
        _binding(env, hours=3)
        r = env["admin"].get(f"{BASE_URL}/api/admin/bonds/price-alerts")
        assert r.status_code == 200
        al = [x for x in r.json()["alerts"] if x["id"] == RABO_ID]
        assert al and al[0]["status"] == "expiring"
        c = env["admin"].get(f"{BASE_URL}/api/admin/notifications/counts").json()["counts"]
        assert c["bond_price_alerts"] >= 1
        assert _check(env, 1000).status_code == 200

    def test_11_price_expired(self, env):
        now = datetime.now(timezone.utc)
        _patch(env, kaufkurs_quoted_at=(now - timedelta(hours=3)).isoformat(),
               kaufkurs_valid_until=(now - timedelta(minutes=5)).isoformat())
        r = env["admin"].get(f"{BASE_URL}/api/admin/bonds/price-alerts")
        al = [x for x in r.json()["alerts"] if x["id"] == RABO_ID]
        assert al and al[0]["status"] == "expired"
        r = _check(env, 1000)
        assert r.status_code == 409 and "kein verbindlicher Kaufkurs" in r.json()["detail"]
        b = next(x for x in env["cust"].get(f"{BASE_URL}/api/bonds/catalog").json() if x["id"] == RABO_ID) \
            if isinstance(env["cust"].get(f"{BASE_URL}/api/bonds/catalog").json(), list) else None
        if b:
            assert b["buy_executable"] is False

    def test_12_amount_below_minimum(self, env):
        _binding(env)
        r = _check(env, 999)
        print("below min", r.status_code, r.text[:200])
        assert r.status_code == 400
