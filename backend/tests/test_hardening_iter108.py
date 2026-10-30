# Iter108: Hardening - CSRF origin check, CORS no-wildcard, per-email login lockout.
# Writes: only AAPL limit order place+cancel for test_eur_qa; failed logins only with non-existent emails.
# IP lockout test lives in test_hardening_ip_lockout_iter108.py (run LAST, then clear ip: counters).
import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

CUST = ("test_eur_qa@example.com", "TestEur-Qa-2026!")
EVIL = "https://evil.example"
CSRF_MSG = "fremder Herkunft"


def _login(email, pw):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pw}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"login failed {email}: {r.status_code} {r.text[:100]}")
    return s


@pytest.fixture(scope="module")
def customer():
    return _login(*CUST)


def _body(**kw):
    b = {"side": "buy", "order_type": "limit", "quantity": "1", "limit_price": "1.00",
         "idempotency_key": "TEST_it108_" + uuid.uuid4().hex[:12]}
    b.update(kw)
    return b


# --- CSRF
class TestCsrf:
    def test_evil_origin_with_cookie_blocked(self, customer):
        r = customer.post(f"{BASE_URL}/api/portfolio/orders", json=_body(symbol="AAPL"), headers={"Origin": EVIL}, timeout=30)
        print("evil origin", r.status_code, r.text[:150])
        assert r.status_code == 403
        assert CSRF_MSG in r.json()["detail"]

    def test_evil_referer_without_origin_blocked(self, customer):
        r = customer.post(f"{BASE_URL}/api/portfolio/orders", json=_body(symbol="AAPL"),
                          headers={"Referer": EVIL + "/attack.html"}, timeout=30)
        print("evil referer", r.status_code, r.text[:150])
        assert r.status_code == 403

    def test_null_origin_blocked(self, customer):
        r = customer.post(f"{BASE_URL}/api/portfolio/orders", json=_body(symbol="AAPL"), headers={"Origin": "null"}, timeout=30)
        print("null origin", r.status_code)
        assert r.status_code == 403

    def test_lookalike_origin_blocked(self, customer):
        host = BASE_URL.split("://", 1)[1]
        r = customer.post(f"{BASE_URL}/api/portfolio/orders", json=_body(symbol="AAPL"),
                          headers={"Origin": f"https://{host}.evil.example"}, timeout=30)
        print("lookalike", r.status_code)
        assert r.status_code == 403

    def test_evil_origin_delete_blocked(self, customer):
        r = customer.delete(f"{BASE_URL}/api/watchlist/AAPL", headers={"Origin": EVIL}, timeout=30)
        print("delete evil", r.status_code)
        assert r.status_code == 403

    def test_same_origin_normal_validation(self, customer):
        # market order is rejected by validation (400) -> proves the CSRF check passed
        r = customer.post(f"{BASE_URL}/api/portfolio/orders", json=_body(symbol="AAPL", order_type="market"),
                          headers={"Origin": BASE_URL}, timeout=30)
        print("same origin market", r.status_code, r.text[:150])
        assert r.status_code in (400, 422)
        assert CSRF_MSG not in r.text

    def test_same_origin_place_and_cancel(self, customer):
        r = customer.post(f"{BASE_URL}/api/portfolio/orders", json=_body(symbol="AAPL"), headers={"Origin": BASE_URL}, timeout=30)
        print("place", r.status_code, r.text[:200])
        assert r.status_code in (200, 201)
        oid = r.json().get("id") or r.json().get("order", {}).get("id")
        assert oid
        c = customer.post(f"{BASE_URL}/api/portfolio/orders/{oid}/cancel", headers={"Origin": BASE_URL}, timeout=30)
        print("cancel", c.status_code, c.text[:200])
        assert c.status_code == 200

    def test_no_origin_with_cookie_allowed(self, customer):
        r = customer.post(f"{BASE_URL}/api/portfolio/orders", json=_body(symbol="AAPL", order_type="market"), timeout=30)
        assert r.status_code in (400, 422)

    def test_no_cookie_evil_origin_gets_401(self):
        r = requests.post(f"{BASE_URL}/api/portfolio/orders", json=_body(symbol="AAPL"), headers={"Origin": EVIL}, timeout=30)
        print("no cookie evil", r.status_code, r.text[:100])
        assert r.status_code == 401

    def test_get_with_evil_origin_not_blocked(self, customer):
        r = customer.get(f"{BASE_URL}/api/auth/me", headers={"Origin": EVIL}, timeout=30)
        assert r.status_code == 200
        assert r.headers.get("access-control-allow-origin") != EVIL


# --- CORS
class TestCors:
    def _preflight(self, origin):
        return requests.options(f"{BASE_URL}/api/portfolio/orders", headers={
            "Origin": origin, "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type"}, timeout=30)

    def test_preflight_evil_rejected(self):
        r = self._preflight(EVIL)
        print("evil preflight", r.status_code, dict(r.headers))
        assert r.headers.get("access-control-allow-origin") not in (EVIL, "*")

    def test_preflight_preview_allowed(self):
        r = self._preflight(BASE_URL)
        print("preview preflight", r.status_code, r.headers.get("access-control-allow-origin"), r.headers.get("access-control-allow-credentials"))
        assert r.status_code == 200
        assert r.headers.get("access-control-allow-origin") == BASE_URL
        assert r.headers.get("access-control-allow-credentials") == "true"


# --- Per-email lockout (non-existent email)
class TestEmailLockout:
    def test_email_lockout_after_5(self):
        email = f"nobody_it108_{uuid.uuid4().hex[:8]}@example.com"
        codes = []
        for _ in range(6):
            r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "wrong-pass-123"}, timeout=30)
            codes.append(r.status_code)
        print("email codes", codes)
        assert codes[:5] == [401] * 5
        assert codes[5] == 429
