# Iteration 111 – Rabobank bond (XS1002121454) customer request flow + admin catalog/requests management, audit, price history.
import os
import pytest
import requests
from bson import ObjectId
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    for line in open("/app/frontend/.env"):
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
ENV = dict(l.strip().split("=", 1) for l in open("/app/backend/.env") if "=" in l and not l.startswith("#"))
ENV = {k: v.strip('"') for k, v in ENV.items()}
CUST = ("tester@mester.de", "HHHKKK222")
ADMIN = ("qa.admin@kapital-direkt24.de", "Qa-ra46CVrWIW3wg6l5EI6IKqbx")
RABO = "6aec4ccd70262b166764f09d"
CREATED_REQ_IDS = []


def _login(email, pw):
    s = requests.Session()
    s.headers.update({"Origin": BASE_URL, "Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pw}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"login failed {email}: {r.status_code} {r.text[:200]}")
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
    # restore rabobank + delete created requests by id
    mdb.bond_catalog.update_one({"_id": ObjectId(RABO)}, {"$set": {
        "is_available": True, "requests_enabled": True, "aktueller_kurs": 108.75,
        "kaufkurs": None, "verkaufskurs": None}})
    for rid in CREATED_REQ_IDS:
        mdb.bond_purchase_requests.delete_one({"_id": ObjectId(rid)})
    mdb.bond_catalog.delete_many({"isin": "TEST00000001", "bond_name": {"$regex": "^TEST_"}})


# --- Customer catalog
class TestCustomerCatalog:
    def test_rabobank_in_public_catalog(self, cust):
        r = cust.get(f"{BASE_URL}/api/bonds/catalog", timeout=60)
        assert r.status_code == 200
        b = next((x for x in r.json() if x["id"] == RABO), None)
        assert b is not None
        assert b["isin"] == "XS1002121454" and b["wkn"] == "A1ZCS8"
        assert b["kupon_rate"] == 6.5 and b["aktueller_kurs"] == 108.75
        assert b["is_perpetual"] is True and b["faelligkeitsdatum"] is None
        assert b["kurs_typ"] == "reference" and b["denomination"] == 25.0 and b["min_order_eur"] == 1000.0
        assert b["legal_issuer"] == "Stichting AK Rabobank Certificaten"
        assert b["requests_enabled"] is True and b["price_updated_at"]

    def test_customer_forbidden_admin(self, cust):
        for path in ("/api/admin/bonds/catalog", "/api/admin/bonds/requests", f"/api/admin/bonds/catalog/{RABO}/history"):
            r = cust.get(f"{BASE_URL}{path}", timeout=30)
            assert r.status_code == 403, path
        r = cust.patch(f"{BASE_URL}/api/admin/bonds/catalog/{RABO}", json={"aktueller_kurs": 1}, timeout=30)
        assert r.status_code == 403


# --- Customer request flow
class TestCustomerRequest:
    def test_below_min_rejected(self, cust):
        r = cust.post(f"{BASE_URL}/api/bonds/requests", json={"bond_id": RABO, "amount_eur": 999}, timeout=30)
        assert r.status_code == 400 and "Mindestinvestition" in r.json()["detail"]

    def test_create_request_snapshot_no_booking(self, cust, mdb):
        uid = mdb.users.find_one({"email": CUST[0]})["_id"]
        before_pos = (mdb.bond_positions.count_documents({"user_id": uid}),
                      mdb.user_bond_positions.count_documents({"user_id": {"$in": [uid, str(uid)]}}),
                      mdb.bond_executions.count_documents({}))
        before_user = mdb.users.find_one({"_id": uid}, {"cash_balance": 1, "balance": 1})
        r = cust.post(f"{BASE_URL}/api/bonds/requests", json={"bond_id": RABO, "amount_eur": 1000}, timeout=30)
        assert r.status_code == 201, r.text
        d = r.json()
        CREATED_REQ_IDS.append(d["id"])
        assert d["status"] == "pending" and d["bond_id"] == RABO
        assert d["customer_display_id"].startswith("KD-")
        assert d["isin"] == "XS1002121454" and d["kupon_rate"] == 6.5
        assert d["reference_price_pct"] == 108.75 and d["reference_price_type"] == "reference"
        assert d["reference_price_updated_at"] and d["requested_at"]
        assert "internal_notes" not in d
        doc = mdb.bond_purchase_requests.find_one({"_id": ObjectId(d["id"])})
        assert doc["customer_name_snapshot"] == "Tester Mester"
        after_pos = (mdb.bond_positions.count_documents({"user_id": uid}),
                     mdb.user_bond_positions.count_documents({"user_id": {"$in": [uid, str(uid)]}}),
                     mdb.bond_executions.count_documents({}))
        assert before_pos == after_pos
        assert before_user == mdb.users.find_one({"_id": uid}, {"cash_balance": 1, "balance": 1})

    def test_duplicate_pending_409(self, cust):
        r = cust.post(f"{BASE_URL}/api/bonds/requests", json={"bond_id": RABO, "amount_eur": 2000}, timeout=30)
        assert r.status_code == 409 and "offene Kaufanfrage" in r.json()["detail"]


# --- Admin request handling
class TestAdminRequests:
    def test_admin_list_contains(self, admin):
        rid = CREATED_REQ_IDS[0]
        r = admin.get(f"{BASE_URL}/api/admin/bonds/requests", timeout=60)
        assert r.status_code == 200
        row = next(x for x in r.json() if x["id"] == rid)
        assert row["customer_name"] == "Tester Mester" and row["customer_display_id"].startswith("KD-")
        assert row["reference_price_pct"] == 108.75

    def test_note_offer_cancel_audit(self, admin, cust):
        rid = CREATED_REQ_IDS[0]
        r = admin.post(f"{BASE_URL}/api/admin/bonds/requests/{rid}/notes", json={"text": "TEST_ intern"}, timeout=30)
        assert r.status_code == 200 and r.json()["internal_notes"][-1]["text"] == "TEST_ intern"
        # customer must not see internal notes
        me = cust.get(f"{BASE_URL}/api/bonds/requests/me", timeout=30).json()
        mine = next(x for x in me if x["id"] == rid)
        assert "internal_notes" not in mine and "TEST_ intern" not in str(mine)
        r = admin.post(f"{BASE_URL}/api/admin/bonds/requests/{rid}/offer", json={"price_pct": 108.5, "nominal": 1010}, timeout=30)
        assert r.status_code == 400 and "Vielfaches" in r.json()["detail"]
        r = admin.post(f"{BASE_URL}/api/admin/bonds/requests/{rid}/offer",
                       json={"price_pct": 108.5, "nominal": 1000, "valid_until": "2026-12-31"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["offer"]["amount_eur"] == 1085.0 and r.json()["status"] == "pending"
        r = admin.post(f"{BASE_URL}/api/admin/bonds/requests/{rid}/cancel", json={"decision_note": "TEST_"}, timeout=30)
        assert r.status_code == 200 and r.json()["status"] == "cancelled" and r.json()["cancelled_at"]
        r = admin.post(f"{BASE_URL}/api/admin/bonds/requests/{rid}/cancel", json={}, timeout=30)
        assert r.status_code == 409
        a = admin.get(f"{BASE_URL}/api/admin/bonds/requests/{rid}/audit", timeout=30)
        assert a.status_code == 200
        actions = [x["action"] for x in a.json()]
        for act in ("note_added", "offer_created", "cancelled"):
            assert act in actions

    def test_approve_and_reject(self, admin, cust):
        # new pending request now possible (previous was cancelled)
        r = cust.post(f"{BASE_URL}/api/bonds/requests", json={"bond_id": RABO, "amount_eur": 1500}, timeout=30)
        assert r.status_code == 201, r.text
        rid = r.json()["id"]; CREATED_REQ_IDS.append(rid)
        r = admin.post(f"{BASE_URL}/api/admin/bonds/requests/{rid}/approve", json={"decision_note": "TEST_ ok"}, timeout=30)
        assert r.status_code == 200 and r.json()["status"] == "approved"
        r = cust.post(f"{BASE_URL}/api/bonds/requests", json={"bond_id": RABO, "amount_eur": 1000}, timeout=30)
        assert r.status_code == 201
        rid2 = r.json()["id"]; CREATED_REQ_IDS.append(rid2)
        r = admin.post(f"{BASE_URL}/api/admin/bonds/requests/{rid2}/reject", json={}, timeout=30)
        assert r.status_code == 200 and r.json()["status"] == "rejected"
        r = admin.post(f"{BASE_URL}/api/admin/bonds/requests/{rid}/cancel", json={}, timeout=30)
        assert r.status_code == 200 and r.json()["status"] == "cancelled"


# --- Admin catalog management
class TestAdminCatalog:
    def test_toggle_requests_and_visibility(self, admin, cust):
        r = admin.patch(f"{BASE_URL}/api/admin/bonds/catalog/{RABO}", json={"requests_enabled": False}, timeout=30)
        assert r.status_code == 200 and r.json()["requests_enabled"] is False
        r = cust.post(f"{BASE_URL}/api/bonds/requests", json={"bond_id": RABO, "amount_eur": 1000}, timeout=30)
        assert r.status_code == 400 and "keine Kaufanfragen" in r.json()["detail"]
        admin.patch(f"{BASE_URL}/api/admin/bonds/catalog/{RABO}", json={"requests_enabled": True}, timeout=30)
        r = admin.patch(f"{BASE_URL}/api/admin/bonds/catalog/{RABO}", json={"is_available": False}, timeout=30)
        assert r.status_code == 200 and r.json()["is_available"] is False
        ids = [x["id"] for x in cust.get(f"{BASE_URL}/api/bonds/catalog", timeout=60).json()]
        assert RABO not in ids
        r = admin.patch(f"{BASE_URL}/api/admin/bonds/catalog/{RABO}", json={"is_available": True}, timeout=30)
        assert r.json()["is_available"] is True

    def test_price_update_history_audit(self, admin):
        before = admin.get(f"{BASE_URL}/api/admin/bonds/catalog/{RABO}/history", timeout=30).json()
        n_prices = len(before["prices"])
        r = admin.patch(f"{BASE_URL}/api/admin/bonds/catalog/{RABO}",
                        json={"kaufkurs": 109.1, "verkaufskurs": 108.4}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["kaufkurs"] == 109.1 and d["verkaufskurs"] == 108.4 and d["price_updated_at"]
        h = admin.get(f"{BASE_URL}/api/admin/bonds/catalog/{RABO}/history", timeout=30).json()
        assert len(h["prices"]) == n_prices + 1 and h["prices"][0]["kaufkurs"] == 109.1
        top = h["audit"][0]
        assert top["action"] == "update" and "kaufkurs" in top["changed_fields"] and "verkaufskurs" in top["changed_fields"]
        r = admin.patch(f"{BASE_URL}/api/admin/bonds/catalog/{RABO}",
                        json={"kaufkurs": None, "verkaufskurs": None, "aktueller_kurs": 108.75}, timeout=30)
        assert r.status_code == 200 and r.json()["kaufkurs"] is None and r.json()["verkaufskurs"] is None

    def test_create_duplicate_delete(self, admin):
        payload = {"bond_name": "TEST_ Bond", "isin": "TEST00000001", "issuer": "TEST_ Issuer",
                   "kupon_rate": 3.0, "aktueller_kurs": 100.0, "is_perpetual": True, "denomination": 1000,
                   "min_order_eur": 1000, "currency": "EUR", "is_available": False}
        r = admin.post(f"{BASE_URL}/api/admin/bonds/catalog", json=payload, timeout=30)
        assert r.status_code == 201, r.text
        bid = r.json()["id"]
        assert r.json()["source"] == "manual" and r.json()["requests_enabled"] is True
        r2 = admin.post(f"{BASE_URL}/api/admin/bonds/catalog", json=payload, timeout=30)
        assert r2.status_code == 409
        h = admin.get(f"{BASE_URL}/api/admin/bonds/catalog/{bid}/history", timeout=30).json()
        assert h["audit"][0]["action"] == "create" and len(h["prices"]) == 1
        d = admin.delete(f"{BASE_URL}/api/admin/bonds/catalog/{bid}", timeout=30)
        assert d.status_code == 204
        assert admin.get(f"{BASE_URL}/api/admin/bonds/catalog/{bid}/history", timeout=30).status_code == 404

    def test_patch_isin_to_existing_conflict(self, admin):
        # Changing an ISIN to an already used one should return 409, not 500
        r = admin.get(f"{BASE_URL}/api/admin/bonds/catalog", timeout=60).json()
        other = next(x for x in r if x["isin"] and x["id"] != RABO)
        payload = {"bond_name": "TEST_ Bond2", "isin": "TEST00000001", "is_available": False}
        c = admin.post(f"{BASE_URL}/api/admin/bonds/catalog", json=payload, timeout=30)
        bid = c.json()["id"]
        try:
            p = admin.patch(f"{BASE_URL}/api/admin/bonds/catalog/{bid}", json={"isin": other["isin"]}, timeout=30)
            assert p.status_code == 409, f"got {p.status_code}"
        finally:
            admin.delete(f"{BASE_URL}/api/admin/bonds/catalog/{bid}", timeout=30)
