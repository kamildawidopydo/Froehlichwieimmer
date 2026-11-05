# Iteration 115 · Retest of direct bond order fixes: rounding parity (quote == ledger debit), total cap ≤ amount,
# IBP customer_name fallback, reject audit 'before', execute response fields + regression. Run: pytest -n 0
import os
import re
import uuid
import concurrent.futures as cf
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
TEST_ISIN = "TEST00000097"

mdb = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
STATE = {"order_ids": []}


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
    email = f"test_bo115_{uuid.uuid4().hex[:6]}@example.com"
    r = admin.post(f"{BASE_URL}/api/admin/users", json={"email": email, "name": "TEST_Bond115 Kunde"})
    assert r.status_code == 201, r.text
    uid = r.json()["id"]
    cust = _session(email, r.json()["temporary_password"])
    r = admin.post(f"{BASE_URL}/api/admin/portfolio/cash/deposit",
                   json={"user_id": uid, "amount": "1500.00", "idempotency_key": f"TEST_dep_{uuid.uuid4().hex}",
                         "description": "TEST deposit"})
    assert r.status_code in (200, 201), r.text
    now = datetime.now(timezone.utc)
    bond = {
        "isin": TEST_ISIN, "bond_name": "TEST_Direktkauf115 Anleihe", "issuer": "TEST Issuer", "kupon_rate": 5.0,
        "kaufkurs": 101.5, "aktueller_kurs": 101.5, "faelligkeitsdatum": "2030-12-31", "min_order_eur": 1000,
        "denomination": 25, "currency": "EUR", "is_available": True,
        "kaufkurs_art": "verbindlich", "kaufkurs_quelle": "TEST Partnerbank",
        "kaufkurs_quoted_at": _iso(now), "kaufkurs_valid_until": _iso(now + timedelta(days=2)),
        "buy_fee_pct": 1, "buy_fee_min_eur": 10,
    }
    r = admin.post(f"{BASE_URL}/api/admin/bonds/catalog", json=bond)
    assert r.status_code == 201, r.text
    bid = r.json()["id"]
    rabo_before = mdb.bond_catalog.find_one({"_id": ObjectId(RABO_ID)}) if "bond_catalog" in mdb.list_collection_names() else None
    yield {"admin": admin, "cust": cust, "uid": uid, "bid": bid, "email": email, "rabo_before": rabo_before}
    uoid = ObjectId(uid)
    oids = [ObjectId(x) for x in STATE["order_ids"]]
    oids = list({*oids, *[d["_id"] for d in mdb.bond_purchase_requests.find({"user_id": uoid}, {"_id": 1})]})
    print("CLEANUP orders", [str(o) for o in oids])
    mdb.bond_executions.delete_many({"bond_request_id": {"$in": oids}})
    mdb.bond_purchase_requests.delete_many({"_id": {"$in": oids}})
    mdb.audit_log.delete_many({"entity_id": {"$in": [str(o) for o in oids]}})
    mdb.audit_log.delete_many({"entity_id": bid})
    print("CLEANUP ibp", mdb.insufficient_buying_power_events.delete_many({"bond_id": bid, "user_id": uoid}).deleted_count)
    for c in ("bond_positions", "cash_ledger", "notifications"):
        print("CLEANUP", c, mdb[c].delete_many({"user_id": {"$in": [uoid, uid]}}).deleted_count)
    admin.delete(f"{BASE_URL}/api/admin/users/{uid}")
    r = admin.delete(f"{BASE_URL}/api/admin/bonds/catalog/{bid}")
    print("CLEANUP bond", bid, r.status_code)
    mdb.bond_price_history.delete_many({"bond_id": {"$in": [bid, ObjectId(bid)]}})
    mdb.audit_log.delete_many({"entity_type": "bond", "entity_id": bid})


def _cash(env):
    r = env["admin"].get(f"{BASE_URL}/api/admin/portfolio/cash/summary", params={"user_id": env["uid"]})
    assert r.status_code == 200, r.text
    return r.json().get("summary") or r.json()


def _check(env, amount=1000):
    return env["cust"].post(f"{BASE_URL}/api/bonds/orders/check", json={"bond_id": env["bid"], "amount_eur": amount})


def _order(env, amount=1000, **kw):
    return env["cust"].post(f"{BASE_URL}/api/bonds/orders", json={"bond_id": env["bid"], "amount_eur": amount, **kw})


def _audit_before(oid, action):
    a = mdb.audit_log.find_one({"entity_id": oid, "action": action}, sort=[("_id", -1)])
    return (a or {}).get("before")


class TestIter115:
    # Rounding + cap: spec example (fee 1 %, min 10) -> 39 pcs, 989.62, total 999.62
    def test_quote_spec_example(self, env):
        r = _check(env)
        assert r.status_code == 200, r.text
        q = r.json()
        assert q["pieces"] == 39 and q["nominal"] == 975
        assert q["purchase_amount"] == 989.62 and q["fees"] == 10 and q["accrued_interest"] == 0
        assert q["total"] == 999.62 and q["total"] <= 1000

    # Cap with fixed fee + accrued -> pieces reduced (39 would be 1009.92 > 1000)
    def test_total_cap_reduces_pieces(self, env):
        a = env["admin"]
        r = a.patch(f"{BASE_URL}/api/admin/bonds/catalog/{env['bid']}",
                    json={"buy_fee_pct": 0.25, "buy_fee_fixed_eur": 2.5, "accrued_interest_pct": 0.8})
        assert r.status_code == 200, r.text
        try:
            q = _check(env).json()
            assert q["pieces"] == 38 and q["total"] == 984.35 and q["total"] <= 1000, q
            q = _check(env, 1009.92).json()
            assert q["pieces"] == 39 and q["total"] == 1009.92, q
            q = _check(env, 1009.91).json()
            assert q["pieces"] == 38, q
        finally:
            r = a.patch(f"{BASE_URL}/api/admin/bonds/catalog/{env['bid']}",
                        json={"buy_fee_pct": 1, "buy_fee_fixed_eur": None, "accrued_interest_pct": None})
            assert r.status_code == 200, r.text
        assert _check(env).json()["total"] == 999.62

    def test_expected_total_mismatch_409(self, env):
        r = _order(env, expected_total=1000.00)
        assert r.status_code == 409 and "Kurs oder Kosten" in r.json()["detail"]

    # Parallel no double-spend + reject awaiting_bank audit before
    def test_parallel_then_reject_awaiting_bank(self, env):
        with cf.ThreadPoolExecutor(2) as ex:
            res = list(ex.map(lambda _: _order(env, expected_total=999.62), range(2)))
        for r in res:
            if r.status_code == 201:
                STATE["order_ids"].append(r.json()["id"])
        assert sorted(r.status_code for r in res) == [201, 402]
        o = next(r.json() for r in res if r.status_code == 201)
        assert float(o["reserved_cash"]) == 999.62 and o["status"] == "awaiting_bank"
        assert re.fullmatch(r"AO-\d{8}-[0-9A-F]{8}", o["transaction_no"])
        assert round(float(_cash(env)["available"]), 2) == 500.38
        r = env["admin"].post(f"{BASE_URL}/api/admin/bonds/requests/{o['id']}/reject", json={"decision_note": "TEST"})
        assert r.status_code == 200 and r.json()["status"] == "rejected"
        assert _audit_before(o["id"], "rejected") == {"status": "awaiting_bank"}
        assert float(_cash(env)["available"]) == 1500

    def test_reject_bank_submitted_audit_before(self, env):
        r = _order(env, expected_total=999.62)
        assert r.status_code == 201, r.text
        oid = r.json()["id"]
        STATE["order_ids"].append(oid)
        a = env["admin"]
        assert a.post(f"{BASE_URL}/api/admin/bonds/requests/{oid}/bank-submit", json={}).status_code == 200
        r = a.post(f"{BASE_URL}/api/admin/bonds/requests/{oid}/reject", json={"decision_note": "TEST"})
        assert r.status_code == 200 and r.json()["status"] == "rejected"
        assert _audit_before(oid, "rejected") == {"status": "bank_submitted"}
        assert float(_cash(env)["available"]) == 1500

    # Execute: debit == reserved, response fields
    def test_execute_debit_equals_reserved(self, env):
        a = env["admin"]
        r = _order(env, expected_total=999.62)
        assert r.status_code == 201, r.text
        oid = r.json()["id"]
        STATE["order_ids"].append(oid)
        assert a.post(f"{BASE_URL}/api/admin/bonds/requests/{oid}/bank-submit", json={}).status_code == 200
        body = {"nominal_amount": "975", "execution_price_pct": "101.5", "accrued_interest": "0", "fees": "10.00"}
        r = a.post(f"{BASE_URL}/api/admin/bonds/requests/{oid}/execute", json=body)
        assert r.status_code == 422 and "BANK_CONFIRMATION_REQUIRED" in r.json()["detail"]
        r = a.post(f"{BASE_URL}/api/admin/bonds/requests/{oid}/execute",
                   json={**body, "bank_reference": "TEST-REF-115", "bank_confirmed_at": "2026-01-15"})
        assert r.status_code == 200, r.text
        ex = r.json()["execution"]
        print("EXEC", ex)
        assert ex["total_amount"] == "999.62" and ex["gross_amount"] == "989.62"
        assert float(ex["accrued_interest"]) == 0 and float(ex["fees"]) == 10
        assert ex["bank_reference"] == "TEST-REF-115"
        uq = {"user_id": {"$in": [ObjectId(env["uid"]), env["uid"]]}}
        debits = list(mdb.cash_ledger.find({**uq, "direction": "debit"}))
        assert len(debits) == 1
        amt = debits[0]["amount"]
        amt = float(amt.to_decimal()) if hasattr(amt, "to_decimal") else float(amt)
        assert amt == 999.62
        c = _cash(env)
        assert round(float(c["balance"]), 2) == 500.38 and round(float(c["available"]), 2) == 500.38
        assert float(c["open_buy_reservations"]) == 0
        assert mdb.bond_positions.count_documents(uq) == 1
        r2 = a.post(f"{BASE_URL}/api/admin/bonds/requests/{oid}/execute",
                    json={**body, "bank_reference": "TEST-REF-115", "bank_confirmed_at": "2026-01-15"})
        assert r2.status_code == 200 and r2.json()["resumed"] is True
        assert mdb.cash_ledger.count_documents({**uq, "direction": "debit"}) == 1
        mine = next(x for x in env["cust"].get(f"{BASE_URL}/api/bonds/requests/me").json() if x["id"] == oid)
        assert mine["status"] == "executed" and mine["bank_reference"] == "TEST-REF-115"

    # Insufficient -> 402 + IBP with users.name as customer_name
    def test_insufficient_ibp_customer_name(self, env):
        q = _check(env).json()
        assert q["sufficient"] is False and q["missing"] == round(999.62 - 500.38, 2)
        r = _order(env, expected_total=999.62)
        assert r.status_code == 402
        evs = list(mdb.insufficient_buying_power_events.find({"user_id": ObjectId(env["uid"]), "bond_id": env["bid"]}))
        assert len(evs) == 1
        assert evs[0]["customer_name"] == "TEST_Bond115 Kunde", evs[0]["customer_name"]
        items = env["admin"].get(f"{BASE_URL}/api/admin/insufficient-buying-power-events").json()["items"]
        it = next(i for i in items if i["id"] == str(evs[0]["_id"]))
        assert it["customer_name"] == "TEST_Bond115 Kunde"

    def test_cancel_releases_reservation(self, env):
        a = env["admin"]
        a.post(f"{BASE_URL}/api/admin/portfolio/cash/deposit",
               json={"user_id": env["uid"], "amount": "600.00", "idempotency_key": f"TEST_dep_{uuid.uuid4().hex}"})
        r = _order(env)
        assert r.status_code == 201, r.text
        oid = r.json()["id"]
        STATE["order_ids"].append(oid)
        assert round(float(_cash(env)["available"]), 2) == round(1100.38 - 999.62, 2)
        r = a.post(f"{BASE_URL}/api/admin/bonds/requests/{oid}/cancel", json={"decision_note": "TEST"})
        assert r.status_code == 200 and r.json()["status"] == "cancelled"
        assert round(float(_cash(env)["available"]), 2) == 1100.38

    def test_rabobank_untouched(self, env):
        cat = env["cust"].get(f"{BASE_URL}/api/bonds/catalog").json()
        items = cat if isinstance(cat, list) else cat.get("items", [])
        rabo = next(b for b in items if b["id"] == RABO_ID)
        assert rabo["buy_executable"] is False and rabo.get("kaufkurs") in (None, 0)
        assert float(rabo["aktueller_kurs"]) == 108.75
