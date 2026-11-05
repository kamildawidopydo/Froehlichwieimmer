# Iteration 114 · Direct bond purchase from cash balance (check/order/reserve/bank-submit/execute/reject/cancel,
# insufficient-advisory events, binding Kaufkurs validation). Run sequentially: pytest -n 0
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
TESTER = ("tester@mester.de", "HHHKKK222")
RABO_ID = "6aec4ccd70262b166764f09d"
TEST_ISIN = "TEST00000099"

mdb = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
STATE = {"order_ids": [], "ibp_ids": set()}


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
    # TEST customer
    email = f"test_bondorder_{uuid.uuid4().hex[:6]}@example.com"
    r = admin.post(f"{BASE_URL}/api/admin/users", json={"email": email, "name": "TEST_Bond Kunde"})
    assert r.status_code == 201, r.text
    uid = r.json()["id"]
    cust = _session(email, r.json()["temporary_password"])
    r = admin.post(f"{BASE_URL}/api/admin/portfolio/cash/deposit",
                   json={"user_id": uid, "amount": "1500.00", "idempotency_key": f"TEST_dep_{uuid.uuid4().hex}",
                         "description": "TEST deposit"})
    assert r.status_code in (200, 201), r.text
    # TEST bond
    now = datetime.now(timezone.utc)
    bond = {
        "isin": TEST_ISIN, "bond_name": "TEST_Direktkauf Anleihe", "issuer": "TEST Issuer", "kupon_rate": 5.0,
        "kaufkurs": 101.5, "aktueller_kurs": 101.5, "faelligkeitsdatum": "2030-12-31", "min_order_eur": 1000,
        "denomination": 25, "currency": "EUR", "is_available": True,
        "kaufkurs_art": "verbindlich", "kaufkurs_quelle": "TEST Partnerbank",
        "kaufkurs_quoted_at": _iso(now), "kaufkurs_valid_until": _iso(now + timedelta(days=2)),
        "buy_fee_pct": 0.25, "buy_fee_min_eur": 10, "buy_fee_fixed_eur": 2.5, "accrued_interest_pct": 0.8,
        "accrued_note": "TEST Stückzinsen",
    }
    r = admin.post(f"{BASE_URL}/api/admin/bonds/catalog", json=bond)
    assert r.status_code == 201, r.text
    bid = r.json()["id"]
    tester = _session(*TESTER)
    yield {"admin": admin, "cust": cust, "uid": uid, "bid": bid, "tester": tester, "bond": bond}
    # ── cleanup by id ──
    uoid = ObjectId(uid)
    oids = [ObjectId(x) for x in STATE["order_ids"]]
    reqs = list(mdb.bond_purchase_requests.find({"user_id": uoid}, {"_id": 1}))
    oids = list({*oids, *[d["_id"] for d in reqs]})
    print("CLEANUP orders", [str(o) for o in oids])
    mdb.bond_executions.delete_many({"bond_request_id": {"$in": oids}})
    mdb.bond_purchase_requests.delete_many({"_id": {"$in": oids}})
    mdb.audit_log.delete_many({"entity_id": {"$in": [str(o) for o in oids] + oids}})
    ibp = [ObjectId(x) for x in STATE["ibp_ids"]]
    ibp += [d["_id"] for d in mdb.insufficient_buying_power_events.find({"bond_id": bid}, {"_id": 1})]
    print("CLEANUP ibp", [str(x) for x in set(ibp)])
    mdb.insufficient_buying_power_events.delete_many({"_id": {"$in": list(set(ibp))}})
    for c in ("bond_positions", "cash_ledger"):
        print("CLEANUP", c, mdb[c].delete_many({"user_id": {"$in": [uoid, uid]}}).deleted_count)
    admin.delete(f"{BASE_URL}/api/admin/users/{uid}")
    r = admin.delete(f"{BASE_URL}/api/admin/bonds/catalog/{bid}")
    print("CLEANUP bond", bid, r.status_code)
    mdb.bond_price_history.delete_many({"bond_id": {"$in": [bid, ObjectId(bid)]}})


def _cash(env):
    r = env["admin"].get(f"{BASE_URL}/api/admin/portfolio/cash/summary", params={"user_id": env["uid"]})
    assert r.status_code == 200, r.text
    s = r.json().get("summary") or r.json()
    c = env["cust"].get(f"{BASE_URL}/api/portfolio/cash").json()
    assert c["buying_power"] == float(s["available"]) and c["cash_balance"] == float(s["balance"])
    return s


def _order(env, sess=None, amount=1000, **kw):
    return (sess or env["cust"]).post(f"{BASE_URL}/api/bonds/orders",
                                      json={"bond_id": env["bid"], "amount_eur": amount, **kw})


class TestDirectOrders:
    # Catalog: binding price validation + buy_executable flag
    def test_catalog_binding_validation(self, env):
        a = env["admin"]
        r = a.post(f"{BASE_URL}/api/admin/bonds/catalog", json={
            "isin": "TEST00000098", "bond_name": "TEST_x", "kaufkurs": 100, "kaufkurs_art": "verbindlich"})
        assert r.status_code == 422 and "Kursquelle" in str(r.json()), r.text
        r = a.patch(f"{BASE_URL}/api/admin/bonds/catalog/{env['bid']}", json={"kaufkurs_quelle": None})
        assert r.status_code == 422 and "verbindlicher Kaufkurs" in str(r.json())
        cat = env["cust"].get(f"{BASE_URL}/api/bonds/catalog").json()
        items = cat if isinstance(cat, list) else cat.get("items", [])
        me = next(b for b in items if b["id"] == env["bid"])
        rabo = next(b for b in items if b["id"] == RABO_ID)
        assert me["buy_executable"] is True and rabo["buy_executable"] is False

    def test_check_non_executable_rabobank_409(self, env):
        r = env["cust"].post(f"{BASE_URL}/api/bonds/orders/check", json={"bond_id": RABO_ID, "amount_eur": 1000})
        assert r.status_code == 409 and "Kaufangebot" in r.json()["detail"]

    def test_check_quote_values(self, env):
        r = env["cust"].post(f"{BASE_URL}/api/bonds/orders/check", json={"bond_id": env["bid"], "amount_eur": 1000})
        assert r.status_code == 200, r.text
        q = r.json()
        assert q["pieces"] == 39 and q["nominal"] == 975
        assert q["purchase_amount"] == 989.63 and q["accrued_interest"] == 7.8
        assert q["fees"] == 12.5 and q["total"] == 1009.93
        assert q["available"] == 1500 and q["sufficient"] is True and q["missing"] == 0
        r = env["cust"].post(f"{BASE_URL}/api/bonds/orders/check", json={"bond_id": env["bid"], "amount_eur": 999})
        assert r.status_code == 400

    def test_expected_total_mismatch_409(self, env):
        r = _order(env, expected_total=1000.00)
        assert r.status_code == 409 and "Kurs oder Kosten haben sich geändert" in r.json()["detail"]

    def test_parallel_orders_no_double_spend_then_reject(self, env):
        with cf.ThreadPoolExecutor(2) as ex:
            res = list(ex.map(lambda _: _order(env, expected_total=1009.93), range(2)))
        codes = sorted(r.status_code for r in res)
        for r in res:
            if r.status_code == 201:
                STATE["order_ids"].append(r.json()["id"])
        assert codes == [201, 402], codes
        o = next(r.json() for r in res if r.status_code == 201)
        assert o["status"] == "awaiting_bank" and o["order_type"] == "direct"
        assert re.fullmatch(r"AO-\d{8}-[0-9A-F]{8}", o["transaction_no"]), o["transaction_no"]
        assert float(o["reserved_cash"]) == 1009.93
        c = _cash(env)
        assert float(c["balance"]) == 1500 and float(c["available"]) == 490.07
        assert float(c["open_buy_reservations"]) == 1009.93
        assert mdb.bond_positions.count_documents({"user_id": {"$in": [ObjectId(env["uid"]), env["uid"]]}}) == 0
        # reject releases reservation
        r = env["admin"].post(f"{BASE_URL}/api/admin/bonds/requests/{o['id']}/reject", json={"decision_note": "TEST"})
        assert r.status_code == 200 and r.json()["status"] == "rejected"
        assert float(_cash(env)["available"]) == 1500

    def test_bank_submit_execute_idempotent(self, env):
        a = env["admin"]
        r = _order(env, expected_total=1009.93)
        assert r.status_code == 201, r.text
        oid = r.json()["id"]
        STATE["order_ids"].append(oid)
        lst = a.get(f"{BASE_URL}/api/admin/bonds/requests").json()
        row = next(x for x in lst if x["id"] == oid)
        assert row["customer_display_id"].startswith("KD-") and row["transaction_no"].startswith("AO-")
        # execute before bank-submit without ref
        body = {"nominal_amount": "975", "execution_price_pct": "101.5", "accrued_interest": "7.80", "fees": "12.50"}
        r = a.post(f"{BASE_URL}/api/admin/bonds/requests/{oid}/execute", json=body)
        assert r.status_code == 409 and "REQUEST_BAD_STATUS" in r.json()["detail"]
        r = a.post(f"{BASE_URL}/api/admin/bonds/requests/{oid}/bank-submit", json={"note": "TEST"})
        assert r.status_code == 200 and r.json()["status"] == "bank_submitted"
        r = a.post(f"{BASE_URL}/api/admin/bonds/requests/{oid}/bank-submit", json={})
        assert r.status_code == 409
        assert float(_cash(env)["available"]) == 490.07
        r = a.post(f"{BASE_URL}/api/admin/bonds/requests/{oid}/execute", json=body)
        assert r.status_code == 422 and "BANK_CONFIRMATION_REQUIRED" in r.json()["detail"]
        r = a.post(f"{BASE_URL}/api/admin/bonds/requests/{oid}/execute",
                   json={**body, "bank_reference": "TEST-REF-1", "bank_confirmed_at": "2026-01-15", "fees": "-1"})
        assert r.status_code == 422
        r = a.post(f"{BASE_URL}/api/admin/bonds/requests/{oid}/execute",
                   json={**body, "bank_reference": "TEST-REF-1", "bank_confirmed_at": "2026-01-15"})
        assert r.status_code == 200, r.text
        ex = mdb.bond_executions.find_one({"bond_request_id": ObjectId(oid)})
        STATE["exec_total"] = float(ex["total_amount"].to_decimal())
        STATE["bal"] = round(1500 - STATE["exec_total"], 2)
        c = _cash(env)
        assert float(c["balance"]) == STATE["bal"] and float(c["available"]) == STATE["bal"], c
        assert float(c["open_buy_reservations"]) == 0
        uq = {"user_id": {"$in": [ObjectId(env["uid"]), env["uid"]]}}
        debits = list(mdb.cash_ledger.find({**uq, "direction": "debit"}))
        assert len(debits) == 1
        pos = list(mdb.bond_positions.find(uq))
        assert len(pos) == 1
        r2 = a.post(f"{BASE_URL}/api/admin/bonds/requests/{oid}/execute",
                    json={**body, "bank_reference": "TEST-REF-1", "bank_confirmed_at": "2026-01-15"})
        assert r2.status_code == 200 and r2.json().get("resumed") is True
        assert mdb.cash_ledger.count_documents({**uq, "direction": "debit"}) == 1
        me = env["cust"].get(f"{BASE_URL}/api/bonds/requests/me").json()
        mine = next(x for x in me if x["id"] == oid)
        assert mine["status"] == "executed" and mine["bank_reference"] == "TEST-REF-1"

    def test_insufficient_creates_single_ibp_and_402(self, env):
        r = env["cust"].post(f"{BASE_URL}/api/bonds/orders/check", json={"bond_id": env["bid"], "amount_eur": 1000})
        q = r.json()
        assert q["sufficient"] is False and q["missing"] == round(1009.93 - STATE["bal"], 2)
        r = _order(env, expected_total=1009.93)
        assert r.status_code == 402
        d = r.json()["detail"]
        assert d["message"].startswith("Ihr verfügbares Guthaben reicht") and d["missing"] == round(1009.93 - STATE["bal"], 2)
        evs = list(mdb.insufficient_buying_power_events.find({"user_id": ObjectId(env["uid"]), "bond_id": env["bid"]}))
        assert len(evs) == 1
        STATE["ibp_ids"].add(str(evs[0]["_id"]))
        a = env["admin"]
        items = a.get(f"{BASE_URL}/api/admin/insufficient-buying-power-events").json()["items"]
        it = next(i for i in items if i["id"] == str(evs[0]["_id"]))
        assert it["asset_type"] == "bond" and it["isin"] == TEST_ISIN and it["customer_display_id"].startswith("KD-")
        assert it["requested_amount"] == 1000 and it["missing_amount"] == round(1009.93 - STATE["bal"], 2)
        r = a.patch(f"{BASE_URL}/api/admin/insufficient-buying-power-events/{it['id']}", json={"status": "in_progress"})
        assert r.status_code == 200
        env["cust"].post(f"{BASE_URL}/api/bonds/orders/check", json={"bond_id": env["bid"], "amount_eur": 1000})
        assert mdb.insufficient_buying_power_events.count_documents(
            {"user_id": ObjectId(env["uid"]), "bond_id": env["bid"]}) == 1

    def test_cancel_releases_reservation(self, env):
        a = env["admin"]
        r = a.post(f"{BASE_URL}/api/admin/portfolio/cash/deposit",
                   json={"user_id": env["uid"], "amount": "600.00", "idempotency_key": f"TEST_dep_{uuid.uuid4().hex}"})
        assert r.status_code in (200, 201)
        r = _order(env)
        assert r.status_code == 201, r.text
        oid = r.json()["id"]
        STATE["order_ids"].append(oid)
        assert float(_cash(env)["available"]) == round(STATE["bal"] + 600 - 1009.93, 2)
        a.post(f"{BASE_URL}/api/admin/bonds/requests/{oid}/bank-submit", json={})
        r = a.post(f"{BASE_URL}/api/admin/bonds/requests/{oid}/cancel", json={"decision_note": "TEST"})
        assert r.status_code == 200 and r.json()["status"] == "cancelled"
        assert float(_cash(env)["available"]) == round(STATE["bal"] + 600, 2)

    def test_tester_insufficient_dedupe(self, env):
        t = env["tester"]
        for _ in range(2):
            r = t.post(f"{BASE_URL}/api/bonds/orders/check", json={"bond_id": env["bid"], "amount_eur": 1000})
            assert r.status_code == 200 and r.json()["sufficient"] is False
        tid = mdb.users.find_one({"email": TESTER[0]})["_id"]
        evs = list(mdb.insufficient_buying_power_events.find({"user_id": tid, "bond_id": env["bid"]}))
        for e in evs:
            STATE["ibp_ids"].add(str(e["_id"]))
        assert len(evs) == 1 and evs[0]["available_amount"] == 300

    def test_expired_and_indicative_not_executable(self, env):
        a = env["admin"]
        past = _iso(datetime.now(timezone.utc) - timedelta(hours=1))
        r = a.patch(f"{BASE_URL}/api/admin/bonds/catalog/{env['bid']}", json={"kaufkurs_valid_until": past})
        assert r.status_code == 200 and r.json()["buy_executable"] is False
        r = env["cust"].post(f"{BASE_URL}/api/bonds/orders/check", json={"bond_id": env["bid"], "amount_eur": 1000})
        assert r.status_code == 409
        r = a.patch(f"{BASE_URL}/api/admin/bonds/catalog/{env['bid']}", json={
            "kaufkurs_valid_until": _iso(datetime.now(timezone.utc) + timedelta(days=1)), "kaufkurs_art": "indikativ"})
        assert r.status_code == 200 and r.json()["buy_executable"] is False

    # BUG check: executed debit must equal the reserved/confirmed total shown to the customer (same admin inputs)
    def test_execution_total_equals_reserved_total(self, env):
        assert STATE.get("exec_total") == 1009.93, f"executed {STATE.get('exec_total')} != reserved 1009.93 (HALF_EVEN vs HALF_UP)"
