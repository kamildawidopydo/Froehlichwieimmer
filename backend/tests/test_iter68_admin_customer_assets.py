# Iteration 68: Admin customer assets (contracts/stocks/bonds/cash/docs/profile), offers CRUD, authz + customer isolation
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as fh:
        for line in fh:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

UID = "6adf710ec883ed7588dd7e36"
ADMIN = ("petrowski616@outlook.com", "HHHKKK222")
CUST = ("tester@mester.de", "HHHKKK222")
DEMO = ("demo.kunde@essenceinvest.com", "KundeDemo2026!")
PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"


def _login(creds):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": creds[0], "password": creds[1]})
    if r.status_code != 200:
        pytest.skip(f"login failed {creds[0]}: {r.status_code} {r.text[:200]}")
    return s


@pytest.fixture(scope="module")
def admin():
    return _login(ADMIN)


@pytest.fixture(scope="module")
def cust():
    return _login(CUST)


@pytest.fixture(scope="module")
def bank_id(admin):
    r = admin.get(f"{BASE_URL}/api/admin/banks/list?limit=500")
    assert r.status_code == 200
    return r.json()["items"][0]["id"]


@pytest.fixture(scope="module")
def created(admin):
    store = {"contracts": [], "stocks": [], "bonds": [], "docs": [], "offers": []}
    yield store
    for c in store["contracts"]:
        admin.delete(f"{BASE_URL}/api/admin/depot-contracts/{c}")
    for c in store["stocks"]:
        admin.delete(f"{BASE_URL}/api/admin/stock-positions/{c}")
    for c in store["bonds"]:
        admin.delete(f"{BASE_URL}/api/admin/bond-positions/{c}")
    for c in store["docs"]:
        admin.delete(f"{BASE_URL}/api/admin/customer-documents/{c}")
    for c in store["offers"]:
        admin.delete(f"{BASE_URL}/api/admin/offers/{c}")


# --- authz: customer must not access admin endpoints
class TestAuthz:
    def test_customer_forbidden(self, cust):
        endpoints = [
            ("get", f"/api/admin/customers/{UID}/assets", None),
            ("post", f"/api/admin/customers/{UID}/depot-contracts", {}),
            ("post", f"/api/admin/customers/{UID}/stock-positions", {}),
            ("post", f"/api/admin/customers/{UID}/bond-positions", {}),
            ("patch", f"/api/admin/customers/{UID}/profile", {}),
            ("post", "/api/admin/offers", {}),
            ("delete", "/api/admin/offers/6a902a9021dd315c76a44eba", None),
            ("delete", "/api/admin/depot-contracts/6adf7ac512b630c8294855a6", None),
        ]
        bad = []
        for m, p, body in endpoints:
            r = getattr(cust, m)(f"{BASE_URL}{p}", json=body) if body is not None else getattr(cust, m)(f"{BASE_URL}{p}")
            if r.status_code not in (401, 403):
                bad.append((m, p, r.status_code))
        assert not bad, bad

    def test_anonymous_forbidden(self):
        r = requests.get(f"{BASE_URL}/api/admin/customers/{UID}/assets")
        assert r.status_code in (401, 403)
        r = requests.get(f"{BASE_URL}/api/portfolio/depot-contracts")
        assert r.status_code in (401, 403)


# --- admin asset CRUD + customer visibility
class TestAssets:
    def test_contract_add_visible_to_customer(self, admin, cust, bank_id, created):
        r = admin.post(f"{BASE_URL}/api/admin/customers/{UID}/depot-contracts", json={
            "bank_id": bank_id, "product_type": "festgeld", "amount_eur": 12345.67, "zinssatz": 3.1,
            "laufzeit_monate": 12, "active_from": "2026-01-01", "active_until": "2027-01-01"})
        assert r.status_code == 201, r.text
        d = r.json()
        created["contracts"].append(d["id"])
        assert d["amount_eur"] == 12345.67 and d["lock_until"] == "2027-01-01" and d["banks"]["name"]
        mine = cust.get(f"{BASE_URL}/api/portfolio/depot-contracts").json()
        assert any(c["id"] == d["id"] for c in mine)
        assets = admin.get(f"{BASE_URL}/api/admin/customers/{UID}/assets").json()
        assert any(c["id"] == d["id"] for c in assets["depot_contracts"])

    def test_contract_validation(self, admin, bank_id):
        r = admin.post(f"{BASE_URL}/api/admin/customers/{UID}/depot-contracts", json={
            "bank_id": bank_id, "product_type": "festgeld", "amount_eur": 100, "zinssatz": 3,
            "active_from": "2026-05-01", "active_until": "2026-01-01"})
        assert r.status_code == 422
        r = admin.post(f"{BASE_URL}/api/admin/customers/{UID}/depot-contracts", json={
            "bank_id": "nonexistent-bank-xx", "product_type": "festgeld", "amount_eur": 100, "zinssatz": 3,
            "active_from": "2026-05-01"})
        assert r.status_code == 404
        r = admin.post(f"{BASE_URL}/api/admin/customers/000000000000000000000000/depot-contracts", json={
            "bank_id": bank_id, "product_type": "festgeld", "amount_eur": 100, "zinssatz": 3, "active_from": "2026-05-01"})
        assert r.status_code == 404

    def test_stock_add_and_delete(self, admin, created):
        r = admin.post(f"{BASE_URL}/api/admin/customers/{UID}/stock-positions",
                       json={"symbol": "test1x", "name": "TEST Stock", "quantity": 5, "avg_cost": 12.5})
        assert r.status_code == 201, r.text
        d = r.json()
        assert d["symbol"] == "TEST1X" and d["quantity"] == 5.0
        created["stocks"].append(d["id"])
        assets = admin.get(f"{BASE_URL}/api/admin/customers/{UID}/assets").json()
        assert any(s["id"] == d["id"] for s in assets["stock_positions"])
        dr = admin.delete(f"{BASE_URL}/api/admin/stock-positions/{d['id']}")
        assert dr.status_code == 200
        assert admin.delete(f"{BASE_URL}/api/admin/stock-positions/{d['id']}").status_code == 404
        created["stocks"].remove(d["id"])

    def test_bond_add(self, admin, created):
        r = admin.post(f"{BASE_URL}/api/admin/customers/{UID}/bond-positions",
                       json={"isin": "test00000001", "bond_name": "TEST Bond", "nominal_betrag": 5000, "kurs": 99,
                             "coupon_rate": 2.5, "maturity_date": "2030-01-01"})
        assert r.status_code == 201, r.text
        d = r.json()
        created["bonds"].append(d["id"])
        assert d["isin"] == "TEST00000001" and d["nominal_betrag"] == 5000 and d["aktueller_kurs"] == 99

    def test_cash_credit_debit(self, admin):
        before = admin.get(f"{BASE_URL}/api/admin/customers/{UID}/assets").json()["cash_balance"]
        r = admin.post(f"{BASE_URL}/api/admin/portfolio/cash/deposit", json={
            "user_id": UID, "amount": "1000", "description": "TEST credit", "idempotency_key": f"test-{uuid.uuid4().hex}"})
        assert r.status_code == 200, r.text
        mid = admin.get(f"{BASE_URL}/api/admin/customers/{UID}/assets").json()["cash_balance"]
        assert abs(mid - before - 1000) < 0.01
        r = admin.post(f"{BASE_URL}/api/admin/portfolio/cash/adjustment", json={
            "user_id": UID, "direction": "debit", "amount": "1000", "reason": "TEST debit",
            "idempotency_key": f"test-{uuid.uuid4().hex}"})
        assert r.status_code == 200, r.text
        after = admin.get(f"{BASE_URL}/api/admin/customers/{UID}/assets").json()["cash_balance"]
        assert abs(after - before) < 0.01

    def test_document_upload_download_isolation(self, admin, cust, created):
        r = admin.post(f"{BASE_URL}/api/admin/customers/{UID}/documents", data={"title": "TEST Vertrag"},
                       files={"file": ("test.pdf", PDF, "application/pdf")})
        assert r.status_code == 201, r.text
        doc = r.json()
        created["docs"].append(doc["id"])
        mine = cust.get(f"{BASE_URL}/api/portfolio/documents").json()
        assert any(x["id"] == doc["id"] for x in mine)
        dl = cust.get(f"{BASE_URL}/api/portfolio/documents/{doc['id']}/download")
        assert dl.status_code == 200 and dl.content.startswith(b"%PDF")
        adl = admin.get(f"{BASE_URL}/api/admin/customer-documents/{doc['id']}/download")
        assert adl.status_code == 200 and adl.content.startswith(b"%PDF")
        # wrong mime
        bad = admin.post(f"{BASE_URL}/api/admin/customers/{UID}/documents", data={"title": "x"},
                         files={"file": ("x.txt", b"hello", "text/plain")})
        assert bad.status_code == 415

    def test_other_customer_isolation(self, created):
        if not created["docs"]:
            pytest.skip("no doc")
        # temp second customer seeded directly in Mongo (cleaned up afterwards)
        import bcrypt
        from datetime import datetime, timezone
        from pymongo import MongoClient
        env = dict(l.strip().split("=", 1) for l in open("/app/backend/.env") if "=" in l)
        mc = MongoClient(env["MONGO_URL"].strip('"'))[env["DB_NAME"].strip('"')]
        email = f"test_iso_{uuid.uuid4().hex[:8]}@example.com"
        mc.users.insert_one({"email": email, "password_hash": bcrypt.hashpw(b"TestIso123!", bcrypt.gensalt()).decode(),
                             "name": "TEST Iso", "role": "user", "created_at": datetime.now(timezone.utc)})
        try:
            other = _login((email, "TestIso123!"))
            self._check_other(other, created)
        finally:
            mc.users.delete_many({"email": email})

    def _check_other(self, other, created):
        dl = other.get(f"{BASE_URL}/api/portfolio/documents/{created['docs'][0]}/download")
        assert dl.status_code == 404
        mine = other.get(f"{BASE_URL}/api/portfolio/documents").json()
        assert all(x["id"] not in created["docs"] for x in mine)
        contracts = other.get(f"{BASE_URL}/api/portfolio/depot-contracts").json()
        assert all(c["id"] not in created["contracts"] for c in contracts)

    def test_document_delete(self, admin, cust, created):
        did = created["docs"][0]
        assert admin.delete(f"{BASE_URL}/api/admin/customer-documents/{did}").status_code == 200
        assert cust.get(f"{BASE_URL}/api/portfolio/documents/{did}/download").status_code == 404
        created["docs"].remove(did)


# --- profile update via admin
class TestProfile:
    def test_profile_patch_persists(self, admin):
        u = admin.get(f"{BASE_URL}/api/admin/users/{UID}")
        orig = u.json() if u.status_code == 200 else {}
        orig = orig.get("user", orig)
        payload = {"first_name": "Tester", "last_name": "Mester", "phone": "+49 30 1234567", "country": "Deutschland",
                   "address_street": "Teststr.", "address_house_number": "1", "address_postal_code": "10115", "address_city": "Berlin"}
        r = admin.patch(f"{BASE_URL}/api/admin/customers/{UID}/profile", json=payload)
        assert r.status_code == 200, r.text
        g = admin.get(f"{BASE_URL}/api/admin/users/{UID}")
        assert g.status_code == 200, g.text
        body = g.json()
        body = body.get("user", body)
        assert body.get("name") == "Tester Mester", body
        assert body.get("phone") == "+49 30 1234567"
        assert body.get("address_city") == "Berlin"
        bad = admin.patch(f"{BASE_URL}/api/admin/customers/{UID}/profile", json={"first_name": ""})
        assert bad.status_code == 422


# --- offers CRUD
class TestOffers:
    def test_offer_crud(self, admin, bank_id, created):
        r = admin.post(f"{BASE_URL}/api/admin/offers", json={
            "bank_id": bank_id, "interest_rate": 9.87, "deposit_term": 12, "min_deposit": 1000,
            "deposit_protection": "TEST 100.000", "investment_type": "Festgeld"})
        assert r.status_code == 201, r.text
        oid = r.json()["id"]
        created["offers"].append(oid)
        lst = admin.get(f"{BASE_URL}/api/admin/offers/list?limit=500").json()["items"]
        o = next((x for x in lst if x["id"] == oid), None)
        assert o and o["interest_rate"] == 9.87 and o["product_type"] if "product_type" in o else o
        u = admin.put(f"{BASE_URL}/api/admin/offers/{oid}", json={
            "bank_id": bank_id, "interest_rate": 8.5, "deposit_term": 24, "min_deposit": 500, "investment_type": "Festgeld"})
        assert u.status_code == 200
        t = admin.patch(f"{BASE_URL}/api/admin/offers/{oid}/active?is_active=false")
        assert t.status_code == 200
        lst = admin.get(f"{BASE_URL}/api/admin/offers/list?limit=500").json()["items"]
        o = next((x for x in lst if x["id"] == oid), None)
        assert o and o["interest_rate"] == 8.5 and o["is_active"] is False and o["deposit_term"] == 24
        d = admin.delete(f"{BASE_URL}/api/admin/offers/{oid}")
        assert d.status_code == 200
        assert admin.delete(f"{BASE_URL}/api/admin/offers/{oid}").status_code == 404
        created["offers"].remove(oid)
