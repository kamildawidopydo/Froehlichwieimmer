# Iteration 109 – Depot + Admin full defect audit (preview only). Writes ONLY on test_eur_qa@example.com.
import os
import time
import uuid
import json
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    for line in open("/app/frontend/.env"):
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
ORIGIN = BASE_URL
CUST = ("test_eur_qa@example.com", "TestEur-Qa-2026!")
ADMIN = ("qa.admin@kapital-direkt24.de", "Qa-ra46CVrWIW3wg6l5EI6IKqbx")
ZERO_ID = "000000000000000000000000"


def _login(email, pw):
    s = requests.Session()
    s.headers.update({"Origin": ORIGIN, "Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pw}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"login failed {email}: {r.status_code} {r.text[:200]}")
    return s, r.json()


@pytest.fixture(scope="module")
def cust():
    return _login(*CUST)


@pytest.fixture(scope="module")
def admin():
    return _login(*ADMIN)


def _order(s, **kw):
    body = {"symbol": "AAPL", "side": "buy", "order_type": "limit", "quantity": "1",
            "limit_price": "1.00", "idempotency_key": f"TEST_{uuid.uuid4().hex}"}
    body.update(kw)
    return s.post(f"{BASE_URL}/api/portfolio/orders", json=body, timeout=30)


def _cancel(s, oid):
    return s.post(f"{BASE_URL}/api/portfolio/orders/{oid}/cancel", timeout=30)


def _cash(s):
    return s.get(f"{BASE_URL}/api/portfolio/cash", timeout=30).json()


# ── Orders: validation ───────────────────────────────────────────────────
class TestOrderValidation:
    @pytest.mark.parametrize("qty", ["0", "-1", "NaN", "abc", "1.5", "1e3", "", " "])
    def test_bad_quantity(self, cust, qty):
        r = _order(cust[0], quantity=qty)
        print(qty, r.status_code, r.text[:160])
        assert r.status_code in (400, 422)

    def test_huge_quantity_buy(self, cust):
        r = _order(cust[0], quantity="9" * 30)
        print(r.status_code, r.text[:200])
        assert r.status_code in (400, 422)

    def test_huge_quantity_sell(self, cust):
        r = _order(cust[0], side="sell", quantity="9" * 30)
        print(r.status_code, r.text[:200])
        assert r.status_code in (400, 422)

    @pytest.mark.parametrize("price", ["0", "-5", "NaN", "Infinity", "1e40", "abc", "0.004"])
    def test_bad_price(self, cust, price):
        r = _order(cust[0], limit_price=price)
        print(price, r.status_code, r.text[:160])
        assert r.status_code in (400, 422)

    def test_float_price_rejected(self, cust):
        r = _order(cust[0], limit_price=1.5)
        assert r.status_code == 422

    def test_market_rejected(self, cust):
        r = _order(cust[0], order_type="market", limit_price=None)
        assert r.status_code == 400 and "Market" in r.json()["detail"]

    def test_extra_fields_forbidden(self, cust):
        r = _order(cust[0], reserved_cash="0", user_id=ZERO_ID)
        assert r.status_code == 422

    def test_insufficient_cash_german(self, cust):
        r = _order(cust[0], limit_price="999999.00", quantity="10")
        print(r.text)
        assert r.status_code == 400 and "Liquidität" in r.json()["detail"]

    def test_sell_more_than_held(self, cust):
        r = _order(cust[0], side="sell", quantity="4")  # AAPL held 3
        print(r.text)
        assert r.status_code == 400 and "Stücke" in r.json()["detail"]

    def test_sell_not_held(self, cust):
        r = _order(cust[0], symbol="MSFT", side="sell", quantity="1")
        assert r.status_code == 400


# ── Orders: reservation / idempotency / cancel ───────────────────────────
class TestOrderLifecycle:
    def test_buy_reserves_cash_and_cancel_releases(self, cust):
        s = cust[0]
        before = _cash(s)
        r = _order(s, quantity="2", limit_price="10.00")
        assert r.status_code == 201, r.text
        o = r.json()
        assert o["status"] == "pending" and o["reserved_cash"] == "20.00"
        mid = _cash(s)
        assert round(before["cash_available"] - mid["cash_available"], 2) == 20.00
        # order listed
        lst = s.get(f"{BASE_URL}/api/portfolio/orders").json()
        assert any(x["id"] == o["id"] and x["status"] == "pending" for x in lst)
        c = _cancel(s, o["id"])
        assert c.status_code == 200 and c.json()["status"] == "cancelled"
        after = _cash(s)
        assert after["cash_available"] == before["cash_available"]
        # cancel again idempotent
        assert _cancel(s, o["id"]).json()["status"] == "cancelled"

    def test_available_cash_exceed_with_pending(self, cust):
        s = cust[0]
        avail = _cash(s)["cash_available"]
        half = f"{(avail / 2) + 1:.2f}"
        r1 = _order(s, limit_price=half)
        assert r1.status_code == 201, r1.text
        try:
            r2 = _order(s, limit_price=half)
            print(r2.status_code, r2.text[:200])
            assert r2.status_code == 400, "second buy exceeding available (reservation) must be rejected"
        finally:
            _cancel(s, r1.json()["id"])

    def test_sell_reservation(self, cust):
        s = cust[0]
        r1 = _order(s, side="sell", quantity="2", limit_price="9999.00")
        assert r1.status_code == 201, r1.text
        try:
            r2 = _order(s, side="sell", quantity="2", limit_price="9999.00")
            print(r2.text)
            assert r2.status_code == 400 and "reserviert 2" in r2.json()["detail"]
        finally:
            _cancel(s, r1.json()["id"])

    def test_idempotency_same_key(self, cust):
        s = cust[0]
        key = f"TEST_{uuid.uuid4().hex}"
        r1 = _order(s, idempotency_key=key)
        r2 = _order(s, idempotency_key=key)
        assert r1.status_code == 201 and r2.status_code in (200, 201)
        assert r1.json()["id"] == r2.json()["id"]
        lst = s.get(f"{BASE_URL}/api/portfolio/orders").json()
        _cancel(s, r1.json()["id"])

    def test_idempotency_parallel(self, cust):
        import concurrent.futures as cf
        s = cust[0]
        key = f"TEST_{uuid.uuid4().hex}"
        with cf.ThreadPoolExecutor(5) as ex:
            res = list(ex.map(lambda _: _order(s, idempotency_key=key), range(5)))
        ids = {r.json().get("id") for r in res if r.status_code in (200, 201)}
        print([r.status_code for r in res], ids)
        assert len(ids) == 1
        _cancel(s, ids.pop())

    def test_cancel_invalid_and_unknown(self, cust):
        assert _cancel(cust[0], "xyz").status_code == 422
        assert _cancel(cust[0], ZERO_ID).status_code == 404


# ── IDOR ─────────────────────────────────────────────────────────────────
class TestIDOR:
    def test_cancel_foreign_order(self, cust, admin):
        uid = cust[1]["id"]
        orders = admin[0].get(f"{BASE_URL}/api/admin/portfolio/orders?limit=500").json()
        orders = orders.get("items", orders) if isinstance(orders, dict) else orders
        foreign = [o for o in orders if str(o.get("user_id")) != uid]
        if not foreign:
            pytest.skip("no foreign orders")
        f = foreign[0]
        # use a NON-pending one preferably to be safe; endpoint must 404 before status check anyway
        f = next((o for o in foreign if o.get("status") != "pending"), f)
        r = _cancel(cust[0], f["id"])
        print(f["id"], f.get("status"), r.status_code, r.text[:100])
        assert r.status_code == 404

    def test_positions_ignore_user_param(self, cust, admin):
        s = cust[0]
        mine = s.get(f"{BASE_URL}/api/portfolio/stock-positions").json()
        other = s.get(f"{BASE_URL}/api/portfolio/stock-positions?user_id={ZERO_ID}").json()
        assert [p["symbol"] for p in mine] == [p["symbol"] for p in other]
        for ep in ["orders", "cash", "summary", "watchlist", "alerts", "depot-contracts", "documents"]:
            a = s.get(f"{BASE_URL}/api/portfolio/{ep}").text
            b = s.get(f"{BASE_URL}/api/portfolio/{ep}?user_id={ZERO_ID}&uid={ZERO_ID}").text
            assert len(a) > 0 and (a == b or ep in ("summary", "cash")), ep

    def test_foreign_document_download(self, cust):
        r = cust[0].get(f"{BASE_URL}/api/portfolio/documents/{ZERO_ID}/download")
        assert r.status_code in (403, 404)

    def test_customer_cannot_post_positions(self, cust):
        s = cust[0]
        r1 = s.post(f"{BASE_URL}/api/portfolio/stock-positions", json={"symbol": "AAPL", "quantity": 1000})
        r2 = s.put(f"{BASE_URL}/api/portfolio/stock-positions", json={"symbol": "AAPL", "quantity": 1000})
        print(r1.status_code, r2.status_code)
        assert r1.status_code in (404, 405) and r2.status_code in (404, 405)


# ── Sensitive data ───────────────────────────────────────────────────────
class TestSensitive:
    BAD = ["password_hash", "hashed_password", "refresh_token", "reset_token", "totp_secret", "\"_id\""]

    def test_customer_responses(self, cust):
        s = cust[0]
        for ep in ["/api/auth/me", "/api/portfolio/orders", "/api/portfolio/stock-positions",
                   "/api/portfolio/summary", "/api/portfolio/cash", "/api/portfolio/watchlist"]:
            t = s.get(BASE_URL + ep).text
            for b in self.BAD:
                assert b not in t, f"{b} in {ep}"

    def test_admin_responses(self, admin, cust):
        s = admin[0]
        uid = cust[1]["id"]
        for ep in [f"/api/admin/users?limit=200", f"/api/admin/users/{uid}",
                   f"/api/admin/customers/{uid}/details", f"/api/admin/customers/{uid}/assets",
                   "/api/admin/customers/overview"]:
            t = s.get(BASE_URL + ep).text
            for b in self.BAD:
                assert b not in t, f"{b} in {ep}"


# ── Admin role checks ────────────────────────────────────────────────────
def _admin_ops():
    d = json.load(open("/tmp/openapi.json"))
    ops = []
    for p, v in d["paths"].items():
        if not p.startswith("/api/admin"):
            continue
        for m in v:
            path = p
            import re
            path = re.sub(r"\{[^}]+\}", ZERO_ID, path)
            ops.append((m.upper(), path))
    return ops


class TestAdminAuthz:
    def test_customer_403_everywhere(self, cust):
        s = cust[0]
        bad = []
        for m, p in _admin_ops():
            r = s.request(m, BASE_URL + p, json={} if m in ("POST", "PUT", "PATCH") else None, timeout=30)
            if r.status_code != 403:
                bad.append((m, p, r.status_code))
        print("non-403:", bad)
        assert not bad

    def test_unauth_401_everywhere(self):
        s = requests.Session()
        bad = []
        for m, p in _admin_ops():
            r = s.request(m, BASE_URL + p, timeout=30)
            if r.status_code not in (401, 403):
                bad.append((m, p, r.status_code))
        print("non-401:", bad)
        assert not bad


# ── Admin depot management on test customer ──────────────────────────────
class TestAdminWrites:
    def test_admin_stock_position_create_shows_and_delete(self, admin, cust):
        a, c = admin[0], cust[0]
        uid = cust[1]["id"]
        r = a.post(f"{BASE_URL}/api/admin/customers/{uid}/stock-positions",
                   json={"symbol": "MSFT", "name": "TEST_Microsoft", "quantity": 2, "avg_cost": 300})
        print(r.status_code, r.text[:300])
        assert r.status_code == 201
        pid = r.json().get("id")
        try:
            pos = c.get(f"{BASE_URL}/api/portfolio/stock-positions").json()
            m = [p for p in pos if p["symbol"] == "MSFT"]
            print(m)
            assert m and float(m[0]["quantity"]) == 2
            # customer sells the admin-created position -> must not 500
            so = _order(c, symbol="MSFT", side="sell", quantity="1", limit_price="9999.00")
            print("sell admin pos:", so.status_code, so.text[:200])
            if so.status_code == 201:
                _cancel(c, so.json()["id"])
            assert so.status_code == 201
        finally:
            d = a.delete(f"{BASE_URL}/api/admin/stock-positions/{pid}")
            print("delete", d.status_code)
            assert d.status_code == 200
            pos = c.get(f"{BASE_URL}/api/portfolio/stock-positions").json()
            assert not [p for p in pos if p["symbol"] == "MSFT"]

    def test_admin_fractional_qty_position(self, admin, cust):
        a = admin[0]
        uid = cust[1]["id"]
        r = a.post(f"{BASE_URL}/api/admin/customers/{uid}/stock-positions",
                   json={"symbol": "NVDA", "quantity": 0.5, "avg_cost": 100})
        print(r.status_code, r.text[:200])
        if r.status_code == 201:
            pos = cust[0].get(f"{BASE_URL}/api/portfolio/stock-positions").json()
            print([p for p in pos if p["symbol"] == "NVDA"])
            a.delete(f"{BASE_URL}/api/admin/stock-positions/{r.json()['id']}")

    def test_admin_cash_deposit(self, admin, cust):
        a, c = admin[0], cust[0]
        before = _cash(c)["cash_balance"]
        key = f"TEST_dep_{uuid.uuid4().hex}"
        body = {"user_id": cust[1]["id"], "amount": "1.00", "description": "TEST_ iter109", "idempotency_key": key}
        r = a.post(f"{BASE_URL}/api/admin/portfolio/cash/deposit", json=body)
        r2 = a.post(f"{BASE_URL}/api/admin/portfolio/cash/deposit", json=body)
        print(r.status_code, r.text[:200], r2.status_code)
        assert r.status_code in (200, 201)
        after = _cash(c)["cash_balance"]
        assert round(after - before, 2) == 1.00
        neg = a.post(f"{BASE_URL}/api/admin/portfolio/cash/deposit", json={**body, "amount": "-5", "idempotency_key": key + "n"})
        assert neg.status_code in (400, 422)


# ── CSRF / CORS / headers ────────────────────────────────────────────────
class TestTransport:
    def test_csrf_foreign_origin(self, cust):
        s = cust[0]
        r = s.post(f"{BASE_URL}/api/portfolio/orders", headers={"Origin": "https://evil.example"},
                   json={"symbol": "AAPL"})
        assert r.status_code == 403

    def test_cors_preflight_foreign(self):
        r = requests.options(f"{BASE_URL}/api/portfolio/orders", headers={
            "Origin": "https://evil.example", "Access-Control-Request-Method": "POST"})
        assert "access-control-allow-origin" not in {k.lower() for k in r.headers}

    def test_security_headers(self, cust):
        r = cust[0].get(f"{BASE_URL}/api/auth/me")
        h = {k.lower(): v for k, v in r.headers.items()}
        missing = [x for x in ["strict-transport-security", "x-content-type-options", "x-frame-options",
                               "content-security-policy"] if x not in h]
        print("missing:", missing)
        assert not missing

    def test_login_limit_nonexistent_email(self):
        email = f"TEST_nobody_{uuid.uuid4().hex[:8]}@example.com"
        codes = []
        for _ in range(6):
            r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "x"},
                              headers={"Origin": ORIGIN})
            codes.append(r.status_code)
        print(codes)
        assert codes[:5] == [401] * 5 and codes[5] == 429


# ── Quotes / summary / perf ──────────────────────────────────────────────
class TestQuotesPerf:
    def test_quotes_eur(self, cust):
        r = cust[0].get(f"{BASE_URL}/api/portfolio/quotes?symbols=AAPL,DBK,VOLV-B.ST,TESTIPO")
        q = r.json()
        print(json.dumps(q)[:800])
        assert q["AAPL"]["price"] is not None and q["AAPL"].get("currency", "EUR") == "EUR"
        assert q["AAPL"]["price_status"] in ("fresh", "stale")
        assert q["TESTIPO"]["price"] is None

    def test_quotes_unbounded_symbols(self, cust):
        syms = ",".join(f"ZZ{i}" for i in range(150))
        t = time.time()
        r = cust[0].get(f"{BASE_URL}/api/portfolio/quotes?symbols={syms}", timeout=120)
        dt = time.time() - t
        print(r.status_code, round(dt, 2), len(r.json()) if r.ok else r.text[:100])
        assert r.status_code in (400, 422) or len(r.json()) <= 50, "no cap on symbols"

    def test_summary_consistency(self, cust):
        s = cust[0]
        summ = s.get(f"{BASE_URL}/api/portfolio/summary").json()
        pos = s.get(f"{BASE_URL}/api/portfolio/stock-positions").json()
        cash = _cash(s)
        print(json.dumps(summ)[:1200])
        mv = sum(p["market_value"] or 0 for p in pos)
        print("mv", mv, "cash", cash["cash_balance"])
        for p in pos:
            if p["market_value"] is not None:
                assert abs(p["profit_loss"] - (p["market_value"] - p["cost_basis"])) < 0.02

    @pytest.mark.parametrize("ep", ["/api/portfolio/summary", "/api/portfolio/stock-positions", "/api/portfolio/orders",
                                    "/api/portfolio/cash", "/api/portfolio/quotes?symbols=AAPL,DBK,VOLV-B.ST",
                                    "/api/portfolio/snapshots", "/api/portfolio/statements", "/api/auth/me"])
    def test_customer_timing(self, cust, ep):
        t = time.time()
        r = cust[0].get(BASE_URL + ep, timeout=60)
        dt = time.time() - t
        print(f"TIMING {ep} {r.status_code} {dt:.2f}s")
        assert r.status_code == 200

    @pytest.mark.parametrize("ep", ["/api/admin/users?limit=200", "/api/admin/portfolio/orders",
                                    "/api/admin/portfolio/stock-positions", "/api/admin/customers/overview",
                                    "/api/admin/ipo/requests", "/api/admin/portfolio/orders?status=pending"])
    def test_admin_timing(self, admin, ep):
        t = time.time()
        r = admin[0].get(BASE_URL + ep, timeout=60)
        dt = time.time() - t
        print(f"TIMING {ep} {r.status_code} {dt:.2f}s {len(r.content)}B")
        assert r.status_code == 200
