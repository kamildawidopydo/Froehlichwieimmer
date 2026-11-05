# Iteration 113 – retest: offer overwrite guard (409), past valid_until 422, bond_offer_responses no double count.
from datetime import date, timedelta
import pytest
import requests
from bson import ObjectId
from pymongo import MongoClient

BASE_URL = [l.split("=", 1)[1].strip() for l in open("/app/frontend/.env") if l.startswith("REACT_APP_BACKEND_URL=")][0].rstrip("/")
ENV = {k: v.strip().strip('"') for k, v in (l.strip().split("=", 1) for l in open("/app/backend/.env") if "=" in l and not l.startswith("#"))}
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


def _new(cust):
    r = cust.post(f"{BASE_URL}/api/bonds/requests", json={"bond_id": RABO, "amount_eur": 1000}, timeout=30)
    assert r.status_code == 201, r.text
    CREATED.append(r.json()["id"])
    return r.json()["id"]


def _offer(admin, rid, price=108.5, valid=FUTURE):
    return admin.post(f"{BASE_URL}/api/admin/bonds/requests/{rid}/offer",
                      json={"price_pct": price, "nominal": 1000, "valid_until": valid}, timeout=30)


def _counts(admin):
    c = admin.get(f"{BASE_URL}/api/admin/notifications/counts", timeout=30).json()["counts"]
    return c.get("pending_bond_requests") or 0, c.get("bond_offer_responses_badge") or 0


def _cancel(admin, rid):
    admin.post(f"{BASE_URL}/api/admin/bonds/requests/{rid}/cancel", json={}, timeout=30)


class TestOfferGuards:
    def test_replace_offered_allowed(self, cust, admin):
        rid = _new(cust)
        try:
            assert _offer(admin, rid).status_code == 200
            r = _offer(admin, rid, price=109.0)
            assert r.status_code == 200, r.text
            assert r.json()["offer"]["price_pct"] == 109.0 and r.json()["offer"]["status"] == "offered"
        finally:
            _cancel(admin, rid)

    def test_accepted_offer_cannot_be_overwritten(self, cust, admin, mdb):
        rid = _new(cust)
        try:
            assert _offer(admin, rid).status_code == 200
            assert cust.post(f"{BASE_URL}/api/bonds/requests/{rid}/offer/accept", json={}, timeout=30).status_code == 200
            p_before, r_before = _counts(admin)
            r = _offer(admin, rid, price=110)
            assert r.status_code == 409, r.text
            assert "entschieden" in r.json()["detail"]
            doc = mdb.bond_purchase_requests.find_one({"_id": ObjectId(rid)})
            assert doc["offer"]["status"] == "accepted" and doc["offer"]["price_pct"] == 108.5
            # pending request with unseen response: must not be counted twice
            assert r_before == mdb.bond_purchase_requests.count_documents(
                {"offer.status": {"$in": ["accepted", "declined"]}, "offer.admin_seen": False, "status": {"$ne": "pending"}})
            _cancel(admin, rid)
            p_after, r_after = _counts(admin)
            assert p_after == p_before - 1
            assert r_after == r_before + 1, "after cancel, unseen decided offer should count as response"
            admin.post(f"{BASE_URL}/api/admin/bonds/requests/{rid}/offer/seen", json={}, timeout=30)
            assert _counts(admin)[1] == r_before
        finally:
            _cancel(admin, rid)

    def test_declined_offer_cannot_be_overwritten(self, cust, admin, mdb):
        rid = _new(cust)
        try:
            assert _offer(admin, rid).status_code == 200
            assert cust.post(f"{BASE_URL}/api/bonds/requests/{rid}/offer/decline", json={"comment": "TEST_"}, timeout=30).status_code == 200
            r = _offer(admin, rid, price=107)
            assert r.status_code == 409
            assert mdb.bond_purchase_requests.find_one({"_id": ObjectId(rid)})["offer"]["status"] == "declined"
            me = next(x for x in cust.get(f"{BASE_URL}/api/bonds/requests/me", timeout=30).json() if x["id"] == rid)
            assert me["offer"]["status"] == "declined"
        finally:
            admin.post(f"{BASE_URL}/api/admin/bonds/requests/{rid}/offer/seen", json={}, timeout=30)
            _cancel(admin, rid)

    def test_past_valid_until_422(self, cust, admin, mdb):
        rid = _new(cust)
        try:
            r = _offer(admin, rid, valid=PAST)
            assert r.status_code == 422, r.text
            assert "Vergangenheit" in r.text
            assert not mdb.bond_purchase_requests.find_one({"_id": ObjectId(rid)}).get("offer")
            assert _offer(admin, rid, valid=date.today().isoformat()).status_code == 200
            assert _offer(admin, rid, valid="31-12-2027").status_code == 422
        finally:
            _cancel(admin, rid)
