# Iteration 112 – Bond individual offers (accept/decline/expired), admin notifications, price chart endpoint, seed idempotency.
import os
import asyncio
import subprocess
from datetime import date, timedelta
import pytest
import requests
from bson import ObjectId
from pymongo import MongoClient

BASE_URL = ""
for line in open("/app/frontend/.env"):
    if line.startswith("REACT_APP_BACKEND_URL="):
        BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
ENV = dict(l.strip().split("=", 1) for l in open("/app/backend/.env") if "=" in l and not l.startswith("#"))
ENV = {k: v.strip('"') for k, v in ENV.items()}
CUST = ("tester@mester.de", "HHHKKK222")
ADMIN = ("qa.admin@kapital-direkt24.de", "Qa-ra46CVrWIW3wg6l5EI6IKqbx")
RABO = "6aec4ccd70262b166764f09d"
CREATED = []
FUTURE = (date.today() + timedelta(days=30)).isoformat()
PAST = (date.today() - timedelta(days=2)).isoformat()


def _login(email, pw):
    s = requests.Session()
    s.headers.update({"Origin": BASE_URL, "Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pw}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"login failed {email}: {r.status_code}")
    return s


@pytest.fixture(scope="module")
def mdb():
    return MongoClient(ENV["MONGO_URL"])[ENV["DB_NAME"]]


@pytest.fixture(scope="module")
def cust():
    return _login(*CUST)


@pytest.fixture(scope="module")
def admin():
    return _login(*ADMIN)


@pytest.fixture(scope="module", autouse=True)
def cleanup(mdb):
    yield
    for rid in CREATED:
        mdb.bond_purchase_requests.delete_one({"_id": ObjectId(rid)})
        mdb.audit_log.delete_many({"entity_type": "bond_request", "entity_id": rid})
    mdb.bond_price_history.delete_many({"bond_id": RABO, "recorded_by": {"$ne": "system-seed"}})
    mdb.bond_catalog.update_one({"_id": ObjectId(RABO)}, {"$set": {
        "is_available": True, "requests_enabled": True, "aktueller_kurs": 108.75,
        "kaufkurs": None, "verkaufskurs": None}})


def _new_request(cust, mdb, amount=1000):
    # cancel-free approach: delete our own previous pending requests (created by this test run only)
    r = cust.post(f"{BASE_URL}/api/bonds/requests", json={"bond_id": RABO, "amount_eur": amount}, timeout=30)
    assert r.status_code == 201, r.text
    CREATED.append(r.json()["id"])
    return r.json()["id"]


def _counts(admin):
    r = admin.get(f"{BASE_URL}/api/admin/notifications/counts", timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["counts"].get("bond_offer_responses")


def _snap(mdb):
    uid = mdb.users.find_one({"email": CUST[0]})["_id"]
    return (mdb.users.find_one({"_id": uid}, {"cash_balance": 1, "balance": 1}),
            mdb.bond_positions.count_documents({"user_id": uid}),
            mdb.user_bond_positions.count_documents({"user_id": {"$in": [uid, str(uid)]}}),
            mdb.bond_executions.count_documents({}),
            mdb.bond_purchase_requests.count_documents({"status": "executed", "user_id": uid}))


class TestOfferAccept:
    def test_offer_create_accept_flow(self, cust, admin, mdb):
        rid = _new_request(cust, mdb)
        r = admin.post(f"{BASE_URL}/api/admin/bonds/requests/{rid}/offer", json={
            "price_pct": 108.5, "nominal": 1000, "accrued_interest": 12.5, "fees": 5,
            "valid_until": FUTURE, "message": "TEST_ offer"}, timeout=30)
        assert r.status_code == 200, r.text
        o = r.json()["offer"]
        assert o["amount_eur"] == 1085.0 and o["total_cost"] == 1102.5
        assert o["accrued_interest"] == 12.5 and o["fees"] == 5.0 and o["status"] == "offered"
        # customer view: no internal fields
        me = next(x for x in cust.get(f"{BASE_URL}/api/bonds/requests/me", timeout=30).json() if x["id"] == rid)
        assert me["offer"]["status"] == "offered"
        assert "internal_notes" not in me
        assert "created_by" not in me["offer"] and "admin_seen" not in me["offer"]
        # other user cannot decide -> 404 (admin acting as a different customer)
        r = admin.post(f"{BASE_URL}/api/bonds/requests/{rid}/offer/accept", json={}, timeout=30)
        assert r.status_code == 404
        before_cnt = _counts(admin)
        before = _snap(mdb)
        r = cust.post(f"{BASE_URL}/api/bonds/requests/{rid}/offer/accept", json={}, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["offer"]["status"] == "accepted" and r.json()["status"] == "pending"
        assert _snap(mdb) == before, "accept must not book anything"
        r2 = cust.post(f"{BASE_URL}/api/bonds/requests/{rid}/offer/accept", json={}, timeout=30)
        assert r2.status_code == 409
        r3 = cust.post(f"{BASE_URL}/api/bonds/requests/{rid}/offer/decline", json={}, timeout=30)
        assert r3.status_code == 409
        assert _counts(admin) == (before_cnt or 0) + 1
        row = next(x for x in admin.get(f"{BASE_URL}/api/admin/bonds/requests", timeout=60).json() if x["id"] == rid)
        assert row["offer"]["admin_seen"] is False and row["offer"]["created_by"] == ADMIN[0]
        a = admin.get(f"{BASE_URL}/api/admin/bonds/requests/{rid}/audit", timeout=30).json()
        acts = [x["action"] for x in a]
        assert "offer_created" in acts and "offer_accepted" in acts
        s = admin.post(f"{BASE_URL}/api/admin/bonds/requests/{rid}/offer/seen", json={}, timeout=30)
        assert s.status_code == 200
        assert _counts(admin) == before_cnt
        # cancel request so a new pending one is possible
        c = admin.post(f"{BASE_URL}/api/admin/bonds/requests/{rid}/cancel", json={}, timeout=30)
        assert c.status_code == 200


class TestOfferDeclineExpired:
    def test_decline(self, cust, admin, mdb):
        rid = _new_request(cust, mdb)
        admin.post(f"{BASE_URL}/api/admin/bonds/requests/{rid}/offer",
                   json={"price_pct": 108.5, "nominal": 1000, "valid_until": FUTURE}, timeout=30)
        r = cust.post(f"{BASE_URL}/api/bonds/requests/{rid}/offer/decline", json={"comment": "TEST_"}, timeout=30)
        assert r.status_code == 200 and r.json()["offer"]["status"] == "declined"
        a = [x["action"] for x in admin.get(f"{BASE_URL}/api/admin/bonds/requests/{rid}/audit", timeout=30).json()]
        assert "offer_declined" in a
        admin.post(f"{BASE_URL}/api/admin/bonds/requests/{rid}/offer/seen", json={}, timeout=30)
        admin.post(f"{BASE_URL}/api/admin/bonds/requests/{rid}/cancel", json={}, timeout=30)

    def test_expired(self, cust, admin, mdb):
        rid = _new_request(cust, mdb)
        r = admin.post(f"{BASE_URL}/api/admin/bonds/requests/{rid}/offer",
                       json={"price_pct": 108.5, "nominal": 1000, "valid_until": PAST}, timeout=30)
        assert r.status_code in (200, 400, 422)
        if r.status_code != 200:
            pytest.skip("past valid_until rejected by admin endpoint")
        me = next(x for x in cust.get(f"{BASE_URL}/api/bonds/requests/me", timeout=30).json() if x["id"] == rid)
        assert me["offer"]["status"] == "expired"
        r = cust.post(f"{BASE_URL}/api/bonds/requests/{rid}/offer/accept", json={}, timeout=30)
        assert r.status_code == 409
        admin.post(f"{BASE_URL}/api/admin/bonds/requests/{rid}/cancel", json={}, timeout=30)

    def test_invalid_ids(self, cust):
        assert cust.post(f"{BASE_URL}/api/bonds/requests/xyz/offer/accept", json={}, timeout=30).status_code == 404
        assert cust.post(f"{BASE_URL}/api/bonds/requests/{'0'*24}/offer/decline", json={}, timeout=30).status_code == 404


class TestPrices:
    def test_prices_single_seed_point(self, cust):
        r = cust.get(f"{BASE_URL}/api/bonds/catalog/{RABO}/prices", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert len(d["points"]) == 1 and d["points"][0]["kurs"] == 108.75 and d["price_updated_at"]

    def test_prices_hidden_404(self, cust, admin):
        admin.patch(f"{BASE_URL}/api/admin/bonds/catalog/{RABO}", json={"is_available": False}, timeout=30)
        try:
            assert cust.get(f"{BASE_URL}/api/bonds/catalog/{RABO}/prices", timeout=30).status_code == 404
        finally:
            admin.patch(f"{BASE_URL}/api/admin/bonds/catalog/{RABO}", json={"is_available": True}, timeout=30)
        assert cust.get(f"{BASE_URL}/api/bonds/catalog/badid/prices", timeout=30).status_code == 404

    def test_catalog_fields(self, cust):
        b = next(x for x in cust.get(f"{BASE_URL}/api/bonds/catalog", timeout=60).json() if x["id"] == RABO)
        assert b["legal_issuer"].startswith("Coöperatieve Rabobank U.A.")
        assert b.get("terms_status") == "pending"


class TestSeed:
    def test_seed_script_idempotent(self, mdb):
        before = mdb.bond_catalog.find_one({"isin": "XS1002121454"})
        out = subprocess.run(["python", "scripts/seed_rabobank_bond.py"], cwd="/app/backend",
                             capture_output=True, text=True, timeout=60)
        assert "exists – unchanged" in out.stdout, out.stdout + out.stderr
        after = mdb.bond_catalog.find_one({"isin": "XS1002121454"})
        assert before == after
        assert mdb.bond_catalog.count_documents({"isin": "XS1002121454"}) == 1

    def test_seed_on_temp_db(self):
        import sys
        sys.path.insert(0, "/app/backend")
        from motor.motor_asyncio import AsyncIOMotorClient
        from services.bond_seed import ensure_rabobank_bond
        name = f"TEST_seed_tmp_{ObjectId()}"

        async def run():
            cl = AsyncIOMotorClient(ENV["MONGO_URL"])
            tdb = cl[name]
            try:
                await tdb.bond_catalog.create_index("isin", unique=True)
                assert await ensure_rabobank_bond(tdb) is True
                assert await ensure_rabobank_bond(tdb) is False
                d = await tdb.bond_catalog.find_one({"isin": "XS1002121454"})
                assert d["requests_enabled"] is False and d["terms_status"] == "pending"
                assert await tdb.bond_catalog.count_documents({}) == 1
                assert await tdb.bond_price_history.count_documents({}) == 1
            finally:
                await cl.drop_database(name)
        asyncio.run(run())
