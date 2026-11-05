# Iteration 116 · Final retest: customer_name resolution (first+last -> users.name -> email) for IBP + direct-order
# snapshot, execute audit 'before' = actual prior status, resumed execute writes no duplicate audit row. Run: pytest -n 0
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
RABO_ID = "6aec4ccd70262b166764f09d"
TEST_ISIN = "TEST00000096"

mdb = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]


def _session(email, pw):
    s = requests.Session()
    s.headers.update({"Origin": BASE_URL, "Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pw})
    assert r.status_code == 200, r.text
    return s


def _iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M")


@pytest.fixture(scope="module")
def env():
    admin = _session(*ADMIN)
    email = f"test_bo116_{uuid.uuid4().hex[:6]}@example.com"
    r = admin.post(f"{BASE_URL}/api/admin/users", json={"email": email, "name": "TEST_altname"})
    assert r.status_code == 201, r.text
    uid = r.json()["id"]
    mdb.users.update_one({"_id": ObjectId(uid)}, {"$set": {"first_name": "TEST_Vor", "last_name": "Nach"}})
    cust = _session(email, r.json()["temporary_password"])
    r = admin.post(f"{BASE_URL}/api/admin/portfolio/cash/deposit",
                   json={"user_id": uid, "amount": "1500.00", "idempotency_key": f"TEST_dep_{uuid.uuid4().hex}",
                         "description": "TEST deposit"})
    assert r.status_code in (200, 201), r.text
    now = datetime.now(timezone.utc)
    bond = {
        "isin": TEST_ISIN, "bond_name": "TEST_Direktkauf116 Anleihe", "issuer": "TEST Issuer", "kupon_rate": 5.0,
        "kaufkurs": 101.5, "aktueller_kurs": 101.5, "faelligkeitsdatum": "2030-12-31", "min_order_eur": 1000,
        "denomination": 25, "currency": "EUR", "is_available": True,
        "kaufkurs_art": "verbindlich", "kaufkurs_quelle": "TEST Partnerbank",
        "kaufkurs_quoted_at": _iso(now), "kaufkurs_valid_until": _iso(now + timedelta(days=2)),
        "buy_fee_pct": 1, "buy_fee_min_eur": 10,
    }
    r = admin.post(f"{BASE_URL}/api/admin/bonds/catalog", json=bond)
    assert r.status_code == 201, r.text
    bid = r.json()["id"]
    yield {"admin": admin, "cust": cust, "uid": uid, "bid": bid, "email": email}
    uoid = ObjectId(uid)
    oids = [d["_id"] for d in mdb.bond_purchase_requests.find({"user_id": uoid}, {"_id": 1})]
    print("CLEANUP orders", [str(o) for o in oids])
    mdb.bond_executions.delete_many({"bond_request_id": {"$in": oids}})
    mdb.bond_purchase_requests.delete_many({"_id": {"$in": oids}})
    mdb.audit_log.delete_many({"entity_id": {"$in": [str(o) for o in oids]}})
    print("CLEANUP ibp", mdb.insufficient_buying_power_events.delete_many({"user_id": uoid}).deleted_count)
    for c in ("bond_positions", "cash_ledger", "notifications", "stock_alert_notifications"):
        print("CLEANUP", c, mdb[c].delete_many({"user_id": {"$in": [uoid, uid]}}).deleted_count)
    admin.delete(f"{BASE_URL}/api/admin/users/{uid}")
    mdb.users.delete_one({"_id": uoid})
    r = admin.delete(f"{BASE_URL}/api/admin/bonds/catalog/{bid}")
    print("CLEANUP bond", bid, r.status_code)
    mdb.bond_price_history.delete_many({"bond_id": {"$in": [bid, ObjectId(bid)]}})
    mdb.audit_log.delete_many({"entity_id": bid})


def _order(env, amount=1000, **kw):
    return env["cust"].post(f"{BASE_URL}/api/bonds/orders", json={"bond_id": env["bid"], "amount_eur": amount, **kw})


def _ibp(env):
    return list(mdb.insufficient_buying_power_events.find({"user_id": ObjectId(env["uid"]), "bond_id": env["bid"]}))


class TestIter116:
    # Direct-order snapshot: first+last wins over users.name
    def test_snapshot_first_last(self, env):
        r = _order(env, expected_total=999.62)
        assert r.status_code == 201, r.text
        oid = r.json()["id"]
        env["oid"] = oid
        doc = mdb.bond_purchase_requests.find_one({"_id": ObjectId(oid)})
        assert doc["customer_name_snapshot"] == "TEST_Vor Nach", doc.get("customer_name_snapshot")
        rows = env["admin"].get(f"{BASE_URL}/api/admin/bonds/requests").json()
        rows = rows if isinstance(rows, list) else rows.get("items", [])
        row = next(x for x in rows if x["id"] == oid)
        print("ADMIN ROW customer_name", row.get("customer_name"))

    # Execute: audit before == bank_submitted; resumed writes no duplicate; one debit
    def test_execute_audit_before_and_resumed(self, env):
        a, oid = env["admin"], env["oid"]
        assert a.post(f"{BASE_URL}/api/admin/bonds/requests/{oid}/bank-submit", json={}).status_code == 200
        body = {"nominal_amount": "975", "execution_price_pct": "101.5", "accrued_interest": "0", "fees": "10.00",
                "bank_reference": "TEST-REF-116", "bank_confirmed_at": "2026-01-15"}
        r = a.post(f"{BASE_URL}/api/admin/bonds/requests/{oid}/execute", json=body)
        assert r.status_code == 200, r.text
        assert r.json().get("resumed") in (False, None)
        rows = list(mdb.audit_log.find({"entity_id": oid, "action": "executed"}))
        assert len(rows) == 1 and rows[0]["before"] == {"status": "bank_submitted"}, rows
        r2 = a.post(f"{BASE_URL}/api/admin/bonds/requests/{oid}/execute", json=body)
        assert r2.status_code == 200 and r2.json()["resumed"] is True
        assert mdb.audit_log.count_documents({"entity_id": oid, "action": "executed"}) == 1
        uq = {"user_id": {"$in": [ObjectId(env["uid"]), env["uid"]]}, "direction": "debit"}
        assert mdb.cash_ledger.count_documents(uq) == 1
        amt = mdb.cash_ledger.find_one(uq)["amount"]
        amt = float(amt.to_decimal()) if hasattr(amt, "to_decimal") else float(amt)
        assert amt == 999.62

    # IBP: first+last
    def test_ibp_first_last(self, env):
        r = _order(env, expected_total=999.62)
        assert r.status_code == 402, r.text
        evs = _ibp(env)
        assert len(evs) == 1 and evs[0]["customer_name"] == "TEST_Vor Nach", evs[0]["customer_name"]

    # IBP: no first/last -> users.name
    def test_ibp_name_fallback(self, env):
        mdb.users.update_one({"_id": ObjectId(env["uid"])}, {"$unset": {"first_name": "", "last_name": ""}})
        r = env["cust"].post(f"{BASE_URL}/api/bonds/orders/check", json={"bond_id": env["bid"], "amount_eur": 1000})
        assert r.status_code == 200 and r.json()["sufficient"] is False
        _order(env, expected_total=999.62)
        evs = _ibp(env)
        assert len(evs) == 1 and evs[0]["customer_name"] == "TEST_altname", evs[0]["customer_name"]

    # IBP: no name -> email ; direct-order snapshot: name fallback
    def test_ibp_email_fallback_and_snapshot_name(self, env):
        mdb.users.update_one({"_id": ObjectId(env["uid"])}, {"$unset": {"name": ""}})
        _order(env, expected_total=999.62)
        evs = _ibp(env)
        assert evs[0]["customer_name"] == env["email"], evs[0]["customer_name"]
        mdb.users.update_one({"_id": ObjectId(env["uid"])}, {"$set": {"name": "TEST_altname"}})
        env["admin"].post(f"{BASE_URL}/api/admin/portfolio/cash/deposit",
                          json={"user_id": env["uid"], "amount": "600.00", "idempotency_key": f"TEST_dep_{uuid.uuid4().hex}"})
        r = _order(env, expected_total=999.62)
        assert r.status_code == 201, r.text
        doc = mdb.bond_purchase_requests.find_one({"_id": ObjectId(r.json()["id"])})
        assert doc["customer_name_snapshot"] == "TEST_altname"
        r = env["admin"].post(f"{BASE_URL}/api/admin/bonds/requests/{r.json()['id']}/cancel", json={"decision_note": "TEST"})
        assert r.status_code == 200

    def test_rabobank_untouched(self, env):
        r = mdb.bond_catalog.find_one({"_id": ObjectId(RABO_ID)})
        assert r.get("kaufkurs") is None and r.get("requests_enabled") is True and float(r["aktueller_kurs"]) == 108.75
