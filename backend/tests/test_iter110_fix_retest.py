# Iteration 110 – retest of iter109 fixes (Decimal128 qty, order caps, quote cap, sec headers, German 422). TEST customer only.
import os
import uuid
import pytest
import requests
from decimal import Decimal
from bson import ObjectId, Decimal128
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    for line in open("/app/frontend/.env"):
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
ENV = dict(l.strip().split("=", 1) for l in open("/app/backend/.env") if "=" in l and not l.startswith("#"))
CUST = ("test_eur_qa@example.com", "TestEur-Qa-2026!")
ADMIN = ("qa.admin@kapital-direkt24.de", "Qa-ra46CVrWIW3wg6l5EI6IKqbx")


def _login(email, pw):
    s = requests.Session()
    s.headers.update({"Origin": BASE_URL, "Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pw}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"login failed {email}: {r.status_code}")
    return s, r.json()


@pytest.fixture(scope="module")
def cust():
    return _login(*CUST)


@pytest.fixture(scope="module")
def admin():
    return _login(*ADMIN)


@pytest.fixture(scope="module")
def mdb():
    c = MongoClient(ENV["MONGO_URL"].strip('"'))
    yield c[ENV["DB_NAME"].strip('"')]
    c.close()


def _uid(cust):
    u = cust[1].get("user") or cust[1]
    return u.get("id") or u.get("_id")


def _order(s, **kw):
    body = {"symbol": "AAPL", "side": "buy", "order_type": "limit", "quantity": "1",
            "limit_price": "1.00", "idempotency_key": f"TEST_{uuid.uuid4().hex}"}
    body.update(kw)
    return s.post(f"{BASE_URL}/api/portfolio/orders", json=body, timeout=30)


def _cancel(s, oid):
    return s.post(f"{BASE_URL}/api/portfolio/orders/{oid}/cancel", timeout=30)


# Decimal128 / admin stock-position fix
class TestPositionQuantity:
    def test_admin_add_msft_then_sell(self, cust, admin, mdb):
        uid = _uid(cust)
        before = mdb.stock_positions.find_one({"user_id": ObjectId(uid), "symbol": "MSFT"})
        assert before is None, "test customer already has MSFT - refusing to overwrite"
        r = admin[0].post(f"{BASE_URL}/api/admin/customers/{uid}/stock-positions",
                          json={"symbol": "MSFT", "quantity": 2, "avg_cost": 300}, timeout=30)
        print(r.status_code, r.text[:300])
        assert r.status_code == 201
        pid = r.json().get("id")
        try:
            doc = mdb.stock_positions.find_one({"user_id": ObjectId(uid), "symbol": "MSFT"})
            assert isinstance(doc["quantity"], int) and doc["quantity"] == 2
            pos = cust[0].get(f"{BASE_URL}/api/portfolio/stock-positions", timeout=30)
            assert pos.status_code == 200
            o = _order(cust[0], symbol="MSFT", side="sell", quantity="1", limit_price="9999")
            print(o.status_code, o.text[:300])
            assert o.status_code == 201
            assert o.json()["status"] == "pending"
            c = _cancel(cust[0], o.json()["id"])
            assert c.status_code == 200
        finally:
            d = admin[0].delete(f"{BASE_URL}/api/admin/stock-positions/{pid or doc['_id']}", timeout=30)
            print("cleanup", d.status_code)

    def test_fractional_and_bad_symbol_rejected(self, cust, admin):
        uid = _uid(cust)
        for body in ({"symbol": "MSFT", "quantity": 0.5, "avg_cost": 300},
                     {"symbol": "AB$C", "quantity": 1, "avg_cost": 300}):
            r = admin[0].post(f"{BASE_URL}/api/admin/customers/{uid}/stock-positions", json=body, timeout=30)
            print(body, r.status_code, r.text[:200])
            assert r.status_code == 422

    def test_decimal128_position_readable_and_sellable(self, cust, mdb):
        uid = ObjectId(_uid(cust))
        assert mdb.stock_positions.find_one({"user_id": uid, "symbol": "NVDA"}) is None
        ins = mdb.stock_positions.insert_one({"user_id": uid, "symbol": "NVDA", "quantity": Decimal128("3.0"),
                                              "avg_cost": Decimal128("100"), "currency": "EUR", "is_active": True,
                                              "name": "TEST_NVDA"})
        try:
            pos = cust[0].get(f"{BASE_URL}/api/portfolio/stock-positions", timeout=30)
            print(pos.status_code, pos.text[:300])
            assert pos.status_code == 200
            o = _order(cust[0], symbol="NVDA", side="sell", quantity="2", limit_price="9999")
            print(o.status_code, o.text[:300])
            assert o.status_code == 201
            over = _order(cust[0], symbol="NVDA", side="sell", quantity="2", limit_price="9999")
            print("over", over.status_code, over.text[:200])
            assert over.status_code in (400, 409, 422)
            assert _cancel(cust[0], o.json()["id"]).status_code == 200
        finally:
            mdb.stock_positions.delete_one({"_id": ins.inserted_id})


# Order + coupon peek caps
class TestCaps:
    def test_huge_qty(self, cust):
        for side in ("buy", "sell"):
            r = _order(cust[0], side=side, quantity="9" * 30)
            print(side, r.status_code, r.text[:200])
            assert r.status_code == 422 and "Stückzahl zu hoch" in r.json()["detail"]

    def test_huge_limit(self, cust):
        r = _order(cust[0], limit_price="2000000")
        print(r.status_code, r.text[:200])
        assert r.status_code == 422 and "Limitkurs zu hoch" in r.json()["detail"]

    def test_peek_caps(self, cust):
        u = f"{BASE_URL}/api/portfolio/coupons/peek"
        base = {"coupon_code": "TESTNOPE", "side": "buy"}
        r1 = cust[0].post(u, json={**base, "quantity": "9" * 30, "limit_price": "1.00"}, timeout=30)
        r2 = cust[0].post(u, json={**base, "quantity": "1", "limit_price": "2000000"}, timeout=30)
        r3 = cust[0].post(u, json={**base, "quantity": "1", "limit_price": "-1"}, timeout=30)
        print(r1.status_code, r1.text[:200]); print(r2.status_code, r2.text[:200]); print(r3.status_code, r3.text[:200])
        assert r1.status_code == 422 and r2.status_code == 422
        assert r3.status_code != 500


# Quotes cap
class TestQuotes:
    def test_101_symbols(self, cust):
        syms = ",".join(f"Z{i:03d}" for i in range(101))
        r = cust[0].get(f"{BASE_URL}/api/portfolio/quotes", params={"symbols": syms}, timeout=30)
        print(r.status_code, r.text[:200])
        assert r.status_code == 422

    def test_invalid_filtered(self, cust):
        r = cust[0].get(f"{BASE_URL}/api/portfolio/quotes", params={"symbols": "AAPL,<script>,A$B"}, timeout=60)
        print(r.status_code, r.text[:300])
        assert r.status_code == 200
        keys = list(r.json().keys())
        assert all(k in ("AAPL",) for k in keys), keys

    def test_only_invalid(self, cust):
        r = cust[0].get(f"{BASE_URL}/api/portfolio/quotes", params={"symbols": "<x>,$$"}, timeout=30)
        assert r.status_code == 200 and r.json() == {}


# Security headers
class TestHeaders:
    @pytest.mark.parametrize("path", ["/api/auth/me", "/api/portfolio/cash", "/api/does-not-exist"])
    def test_headers(self, cust, path):
        r = cust[0].get(f"{BASE_URL}{path}", timeout=30)
        h = {k.lower(): v for k, v in r.headers.items()}
        print(path, r.status_code, {k: h.get(k) for k in ("strict-transport-security", "x-frame-options", "content-security-policy")})
        assert "max-age" in h.get("strict-transport-security", "")
        assert h.get("x-content-type-options") == "nosniff"
        assert h.get("x-frame-options") == "DENY"
        assert "frame-ancestors 'none'" in h.get("content-security-policy", "")
        assert h.get("referrer-policy")

    def test_headers_unauth_401(self):
        r = requests.get(f"{BASE_URL}/api/portfolio/cash", timeout=30)
        assert r.status_code == 401
        assert r.headers.get("x-frame-options") == "DENY"


# German validation errors
class TestGermanValidation:
    def test_missing_fields_order(self, cust):
        r = cust[0].post(f"{BASE_URL}/api/portfolio/orders", json={"secret_value_xyz": 1}, timeout=30)
        print(r.status_code, r.text[:400])
        assert r.status_code == 422
        d = r.json()["detail"]
        assert isinstance(d, str) and d.startswith("Ungültige Eingabe: bitte") and d.endswith("prüfen.")
        assert "secret_value_xyz\":" not in r.text or "input" not in r.text
        assert "\"input\"" not in r.text

    def test_register_short_password(self):
        r = requests.post(f"{BASE_URL}/api/auth/register", headers={"Origin": BASE_URL},
                          json={"email": f"test_{uuid.uuid4().hex[:6]}@example.com", "password": "short"}, timeout=30)
        print(r.status_code, r.text[:400])
        assert r.status_code == 422
        assert "password" in r.json()["detail"]
        assert "short" not in r.text.replace("too_short", "").replace("string_too_short", "")

    def test_custom_value_error_message(self, cust):
        r = cust[0].post(f"{BASE_URL}/api/bonds/requests", json={"amount_eur": "abc"}, timeout=30)
        print(r.status_code, r.text[:500])
        assert r.status_code == 422

    def test_custom_value_error_surfaced(self, admin):
        # admin catalog create with invalid ISIN -> 422, validator message should be visible (no DB write on 422)
        r = admin[0].post(f"{BASE_URL}/api/admin/bonds/catalog", json={"isin": "X!"}, timeout=30)
        print(r.status_code, r.text[:600])
        assert r.status_code == 422
        assert "ISIN ungültig" in r.json()["detail"], "custom validator message not in detail"


# Regression: CSRF, watchlist, admin APIs
class TestRegression:
    def test_csrf_foreign_origin(self, cust):
        r = cust[0].post(f"{BASE_URL}/api/portfolio/watchlist", json={"symbol": "IBM"},
                         headers={"Origin": "https://evil.example.com"}, timeout=30)
        assert r.status_code == 403

    def test_watchlist_add_remove(self, cust):
        s = cust[0]
        lst = s.get(f"{BASE_URL}/api/portfolio/watchlist", timeout=30).json()
        if "IBM" in str(lst):
            pytest.skip("IBM already on watchlist")
        a = s.post(f"{BASE_URL}/api/portfolio/watchlist", json={"symbol": "IBM"}, timeout=30)
        print(a.status_code, a.text[:200])
        assert a.status_code == 201
        assert "IBM" in str(s.get(f"{BASE_URL}/api/portfolio/watchlist", timeout=30).json())
        d = s.delete(f"{BASE_URL}/api/portfolio/watchlist/IBM", timeout=30)
        assert d.status_code == 204
        assert "IBM" not in str(s.get(f"{BASE_URL}/api/portfolio/watchlist", timeout=30).json())

    def test_customer_forbidden_admin(self, cust):
        assert cust[0].get(f"{BASE_URL}/api/admin/portfolio/orders", timeout=30).status_code in (401, 403)

    def test_admin_orders_list(self, admin):
        r = admin[0].get(f"{BASE_URL}/api/admin/portfolio/orders", timeout=30)
        print(r.status_code, r.text[:200])
        assert r.status_code == 200
