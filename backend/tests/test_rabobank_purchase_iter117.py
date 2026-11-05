# Iteration 117 · Rabobank XS1002121454 purchase flow: offer request (no binding price), separate admin toggles
# requests_enabled/orders_enabled, binding test price -> direct order awaiting_bank, insufficient funds advisory,
# admin counts. Uses real test customer tester@mester.de; strict cleanup of only created records. Run: pytest -n 0
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


def _rabo(sess):
    r = sess.get(f"{BASE_URL}/api/bonds/catalog")
    assert r.status_code == 200
    items = r.json() if isinstance(r.json(), list) else r.json().get("items", [])
    return next((b for b in items if b["id"] == RABO_ID), None)


@pytest.fixture(scope="module")
def env():
    admin = _session(*ADMIN)
    cust = _session(*CUST)
    uid = mdb.users.find_one({"email": CUST[0]})["_id"]
    t0 = datetime.now(timezone.utc)
    before_ledger = {d["_id"] for d in mdb.cash_ledger.find({"user_id": {"$in": [uid, str(uid)]}}, {"_id": 1})}
    before_pos = mdb.bond_positions.count_documents({"user_id": {"$in": [uid, str(uid)]}})
    ctx = {"admin": admin, "cust": cust, "uid": uid, "deposit_keys": [], "before_ledger": before_ledger,
           "before_pos": before_pos}
    yield ctx
    # CLEANUP
    admin.patch(f"{BASE_URL}/api/admin/bonds/catalog/{RABO_ID}",
                json={**{k: None for k in PRICE_FIELDS}, "requests_enabled": True, "orders_enabled": True})
    reqs = [d["_id"] for d in mdb.bond_purchase_requests.find(
        {"user_id": uid, "isin": "XS1002121454", "created_at": {"$gte": t0 - timedelta(seconds=5)}}, {"_id": 1})]
    print("CLEANUP requests", reqs)
    mdb.bond_purchase_requests.delete_many({"_id": {"$in": reqs}})
    mdb.audit_log.delete_many({"entity_id": {"$in": [str(o) for o in reqs] + reqs}})
    print("CLEANUP ibp", mdb.insufficient_buying_power_events.delete_many(
        {"user_id": uid, "bond_id": RABO_ID, "created_at": {"$gte": t0 - timedelta(seconds=5)}}).deleted_count)
    new_ledger = [d["_id"] for d in mdb.cash_ledger.find({"user_id": {"$in": [uid, str(uid)]}}, {"_id": 1})
                  if d["_id"] not in before_ledger]
    print("CLEANUP ledger", new_ledger)
    mdb.cash_ledger.delete_many({"_id": {"$in": new_ledger}})
    d = mdb.bond_catalog.find_one({"_id": ObjectId(RABO_ID)})
    print("FINAL bond", {k: d.get(k) for k in PRICE_FIELDS + ("requests_enabled", "orders_enabled")})


def _patch(env, **kw):
    r = env["admin"].patch(f"{BASE_URL}/api/admin/bonds/catalog/{RABO_ID}", json=kw)
    assert r.status_code == 200, r.text
    return r.json()


def _binding(env):
    now = datetime.now(timezone.utc)
    return _patch(env, kaufkurs=109.10, kaufkurs_art="verbindlich", kaufkurs_quelle="TEST Vorschau",
                  kaufkurs_quoted_at=now.isoformat(), kaufkurs_valid_until=(now + timedelta(hours=2)).isoformat())


class TestRabobankFlow:
    # C) no executable price -> offer request
    def test_01_initial_state(self, env):
        b = _rabo(env["cust"])
        assert b, "Rabobank not in customer catalog"
        print({k: b.get(k) for k in ("requests_enabled", "orders_enabled", "buy_executable", "aktueller_kurs",
                                     "kurs_typ", "kaufkurs", "kaufkurs_art")})
        assert b["requests_enabled"] is True and b["orders_enabled"] is True
        assert b["buy_executable"] is False

    def test_02_reference_price_never_used(self, env):
        r = env["cust"].post(f"{BASE_URL}/api/bonds/orders/check", json={"bond_id": RABO_ID, "amount_eur": 1000})
        assert r.status_code == 409
        assert "kein verbindlicher Kaufkurs" in r.json()["detail"]

    def test_03_create_offer_request(self, env):
        r = env["cust"].post(f"{BASE_URL}/api/bonds/requests", json={"bond_id": RABO_ID, "amount_eur": 1000})
        assert r.status_code == 201, r.text
        d = r.json()
        assert d["status"] == "pending" and d["isin"] == "XS1002121454"
        env["req_id"] = d["id"]
        mine = env["cust"].get(f"{BASE_URL}/api/bonds/requests/me").json()
        assert any(x["id"] == d["id"] for x in mine)
        adm = env["admin"].get(f"{BASE_URL}/api/admin/bonds/requests")
        assert adm.status_code == 200
        items = adm.json() if isinstance(adm.json(), list) else adm.json().get("items", [])
        assert any(x["id"] == d["id"] for x in items)

    def test_04_duplicate_409(self, env):
        r = env["cust"].post(f"{BASE_URL}/api/bonds/requests", json={"bond_id": RABO_ID, "amount_eur": 1000})
        assert r.status_code == 409
        assert "offene Kaufanfrage" in r.json()["detail"]

    def test_05_requests_disabled_400(self, env):
        out = _patch(env, requests_enabled=False)
        assert out["requests_enabled"] is False
        assert _rabo(env["cust"])["requests_enabled"] is False
        r = env["cust"].post(f"{BASE_URL}/api/bonds/requests", json={"bond_id": RABO_ID, "amount_eur": 2000})
        assert r.status_code == 400
        assert r.json()["detail"] == "Diese Anleihe ist derzeit nicht für neue Angebotsanfragen freigegeben."
        _patch(env, requests_enabled=True)

    # A) binding price -> direct order awaiting_bank, no depot booking
    def test_06_binding_price_order(self, env):
        out = _binding(env)
        assert out["buy_executable"] is True
        assert _rabo(env["cust"])["buy_executable"] is True
        cash = env["cust"].get(f"{BASE_URL}/api/portfolio/cash").json()
        print("cash available", cash.get("cash_available"))
        r = env["cust"].post(f"{BASE_URL}/api/bonds/orders/check", json={"bond_id": RABO_ID, "amount_eur": 1000})
        assert r.status_code == 200, r.text
        q = r.json()
        print("quote", q)
        assert q["price_pct"] == 109.10
        if not q["sufficient"]:
            k = f"TEST_rabo117_{uuid.uuid4().hex}"
            d = env["admin"].post(f"{BASE_URL}/api/admin/portfolio/cash/deposit",
                                  json={"user_id": str(env["uid"]), "amount": "2000.00", "idempotency_key": k,
                                        "description": "TEST Vorschau-Guthaben"})
            assert d.status_code in (200, 201), d.text
            q = env["cust"].post(f"{BASE_URL}/api/bonds/orders/check",
                                 json={"bond_id": RABO_ID, "amount_eur": 1000}).json()
            assert q["sufficient"]
        ledger_before = mdb.cash_ledger.count_documents({"user_id": {"$in": [env["uid"], str(env["uid"])]}})
        r = env["cust"].post(f"{BASE_URL}/api/bonds/orders",
                             json={"bond_id": RABO_ID, "amount_eur": 1000, "expected_total": q["total"]})
        assert r.status_code == 201, r.text
        o = r.json()
        assert o["status"] == "awaiting_bank"
        items = env["admin"].get(f"{BASE_URL}/api/admin/bonds/requests").json()
        items = items if isinstance(items, list) else items.get("items", [])
        assert any(x["id"] == o["id"] and x["status"] == "awaiting_bank" for x in items)
        assert mdb.bond_positions.count_documents({"user_id": {"$in": [env["uid"], str(env["uid"])]}}) == env["before_pos"]
        assert mdb.cash_ledger.count_documents({"user_id": {"$in": [env["uid"], str(env["uid"])]}}) == ledger_before
        cash2 = env["cust"].get(f"{BASE_URL}/api/portfolio/cash").json()
        print("cash after order", cash2.get("cash_available"), cash2.get("cash_balance"))

    def test_07_orders_disabled(self, env):
        out = _patch(env, orders_enabled=False)
        assert out["orders_enabled"] is False and out["buy_executable"] is False
        r = env["cust"].post(f"{BASE_URL}/api/bonds/orders/check", json={"bond_id": RABO_ID, "amount_eur": 1000})
        assert r.status_code == 409
        assert r.json()["detail"] == "Diese Anleihe ist derzeit nicht für neue Kaufaufträge freigegeben."
        r = env["cust"].post(f"{BASE_URL}/api/bonds/orders", json={"bond_id": RABO_ID, "amount_eur": 1000})
        assert r.status_code == 409
        _patch(env, orders_enabled=True)

    # B) insufficient funds -> advisory request
    def test_08_insufficient_funds(self, env):
        r = env["cust"].post(f"{BASE_URL}/api/bonds/orders/check",
                             json={"bond_id": RABO_ID, "amount_eur": 10_000_000})
        assert r.status_code == 200, r.text
        assert r.json()["sufficient"] is False
        r = env["cust"].post(f"{BASE_URL}/api/bonds/orders", json={"bond_id": RABO_ID, "amount_eur": 10_000_000})
        assert r.status_code == 402
        assert r.json()["detail"]["message"] == ("Ihr verfügbares Guthaben reicht für diesen Kauf derzeit nicht aus. "
                                                 "Ein persönlicher Berater wird sich mit Ihnen in Verbindung setzen.")
        ev = list(mdb.insufficient_buying_power_events.find({"user_id": env["uid"], "bond_id": RABO_ID}))
        assert len(ev) == 1 and ev[0]["status"] == "new"
        adm = env["admin"].get(f"{BASE_URL}/api/admin/insufficient-buying-power-events")
        print("ibp admin", adm.status_code, str(adm.json())[:300])
        assert adm.status_code == 200
        assert "XS1002121454" in adm.text

    def test_09_counts(self, env):
        c = env["admin"].get(f"{BASE_URL}/api/admin/notifications/counts").json()["counts"]
        assert isinstance(c["pending_insufficient_buying_power"], int) and c["pending_insufficient_buying_power"] >= 1
        exp = mdb.bond_purchase_requests.count_documents({"status": {"$in": ["pending", "awaiting_bank"]}})
        assert c["pending_bond_requests"] == exp and exp >= 2

    def test_10_over_limit_validation(self, env):
        r = env["cust"].post(f"{BASE_URL}/api/bonds/orders/check",
                             json={"bond_id": RABO_ID, "amount_eur": 20_000_000})
        print("over limit", r.status_code, r.text[:200])
        assert r.status_code == 422
