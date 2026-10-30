# Iter107: Go-live readiness. READ-ONLY except placing+cancelling AAPL limit order for test_eur_qa.
import os
import time
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

ADMIN = ("qa.admin@kapital-direkt24.de", "Qa-ra46CVrWIW3wg6l5EI6IKqbx")
CUST = ("test_eur_qa@example.com", "TestEur-Qa-2026!")
IPO_SYMS = ["TESTIPO", "PRVT3", "PRVNV"]


def _login(email, pw):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pw}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"login failed {email}: {r.status_code}")
    return s


@pytest.fixture(scope="module")
def admin():
    return _login(*ADMIN)


@pytest.fixture(scope="module")
def customer():
    return _login(*CUST)


@pytest.fixture(scope="module")
def ids(admin):
    ov = admin.get(f"{BASE_URL}/api/admin/customers/overview", timeout=60).json()
    qa = next(i for i in ov["items"] if i["email"] == CUST[0])
    other = next(i for i in ov["items"] if i["email"] != CUST[0])
    return {"qa": qa["id"], "other": other["id"], "qa_row": qa}


def _key():
    return "TEST_iter107_" + uuid.uuid4().hex[:12]


def _order(s, **kw):
    body = {"side": "buy", "order_type": "limit", "quantity": "1", "limit_price": "1.00", "idempotency_key": _key()}
    body.update(kw)
    return s.post(f"{BASE_URL}/api/portfolio/orders", json=body, timeout=30)


# --- Speed: IPO symbols return unavailable quickly
def test_ipo_quotes_unavailable_fast(customer):
    customer.get(f"{BASE_URL}/api/portfolio/quotes", params={"symbols": ",".join(IPO_SYMS)}, timeout=60)  # warm probe
    times = []
    for _ in range(3):
        t = time.perf_counter()
        r = customer.get(f"{BASE_URL}/api/portfolio/quotes", params={"symbols": ",".join(IPO_SYMS)}, timeout=60)
        times.append(time.perf_counter() - t)
        assert r.status_code == 200
        d = r.json()
        for s in IPO_SYMS:
            assert d[s]["price_status"] == "unavailable", d[s]
            assert d[s]["price"] is None
    print("IPO quote times", [round(x, 3) for x in times])
    assert max(times) < 1.5


def test_full_depot_quotes_time(customer):
    syms = "AAPL,VOLV-B.ST,DBK,TESTIPO,PRVT3,PRVNV"
    times = []
    for _ in range(3):
        t = time.perf_counter()
        r = customer.get(f"{BASE_URL}/api/portfolio/quotes", params={"symbols": syms}, timeout=60)
        times.append(time.perf_counter() - t)
        assert r.status_code == 200
    print("full quote times", [round(x, 3) for x in times])


# --- EUR conversion
@pytest.mark.parametrize("sym,ccy", [("AAPL", "USD"), ("VOLV-B.ST", "SEK")])
def test_eur_conversion(customer, sym, ccy):
    q = customer.get(f"{BASE_URL}/api/portfolio/quotes", params={"symbols": sym}, timeout=60).json()[sym]
    # API exposes native_price/native_currency; fx_rate = foreign units per 1 EUR (pair EURxxx) -> price = native / fx_rate
    print(sym, {k: q.get(k) for k in ("price", "currency", "native_currency", "native_price", "fx_rate", "fx_pair", "price_status")})
    assert q["currency"] == "EUR"
    assert q["native_currency"] == ccy
    assert q["fx_rate"] and float(q["fx_rate"]) > 0
    assert abs(float(q["native_price"]) / float(q["fx_rate"]) - float(q["price"])) < 0.01


# --- Security
def test_unauth_portfolio_401():
    for p in ("summary", "stock-positions", "bond-positions", "orders", "cash", "quotes?symbols=AAPL"):
        r = requests.get(f"{BASE_URL}/api/portfolio/{p}", timeout=30)
        assert r.status_code == 401, (p, r.status_code)
    r = requests.post(f"{BASE_URL}/api/portfolio/orders", json={}, timeout=30)
    assert r.status_code in (401, 422), r.status_code


def test_customer_blocked_admin(customer, ids):
    for p in ("customers/overview", f"customers/{ids['other']}/details", f"customers/{ids['qa']}/details", "users"):
        r = customer.get(f"{BASE_URL}/api/admin/{p}", timeout=30)
        assert r.status_code in (401, 403), (p, r.status_code)


def test_portfolio_only_own(customer, ids):
    pos = customer.get(f"{BASE_URL}/api/portfolio/stock-positions", timeout=30).json()
    items = pos if isinstance(pos, list) else pos.get("items") or pos.get("positions") or []
    uids = {str(p.get("user_id")) for p in items if p.get("user_id")}
    assert uids <= {ids["qa"]}, uids
    syms = {p.get("symbol") for p in items}
    assert {"AAPL", "DBK"} <= syms
    orders = customer.get(f"{BASE_URL}/api/portfolio/orders", timeout=30).json()
    oitems = orders if isinstance(orders, list) else orders.get("items") or orders.get("orders") or []
    assert {str(o.get("user_id")) for o in oitems if o.get("user_id")} <= {ids["qa"]}


def test_backup_manifest_404():
    assert requests.get(f"{BASE_URL}/api/backup/manifest", timeout=30).status_code == 404


# --- Order validation
def test_sell_more_than_held(customer):
    r = _order(customer, symbol="AAPL", side="sell", quantity="999", limit_price="100.00")
    print(r.status_code, r.text[:200])
    assert r.status_code == 400 and "Stücke" in r.text


@pytest.mark.parametrize("sym", IPO_SYMS)
def test_sell_ipo_409(customer, sym):
    r = _order(customer, symbol=sym, side="sell", quantity="1", limit_price="10.00")
    print(sym, r.status_code, r.text[:200])
    assert r.status_code == 409 and "nicht börsennotiert" in r.text


def test_buy_exceeding_cash(customer):
    r = _order(customer, symbol="AAPL", quantity="1000", limit_price="300.00")
    print(r.status_code, r.text[:200])
    assert r.status_code == 400 and "Liquidität" in r.text


def test_short_idempotency_key_422(customer):
    r = _order(customer, symbol="AAPL", idempotency_key="short")
    assert r.status_code == 422


def test_market_order_rejected(customer):
    r = _order(customer, symbol="AAPL", order_type="market", limit_price=None)
    assert r.status_code == 400


def test_valid_limit_order_pending_then_cancel(customer):
    cash_before = customer.get(f"{BASE_URL}/api/portfolio/cash", timeout=30).json()
    r = _order(customer, symbol="AAPL", quantity="1", limit_price="1.00", client_reference="TEST_iter107")
    assert r.status_code == 201, r.text
    o = r.json()
    oid = o.get("id") or o.get("order_id")
    try:
        assert o["status"] == "pending"
        assert o["symbol"] == "AAPL"
        time.sleep(3)
        lst = customer.get(f"{BASE_URL}/api/portfolio/orders", timeout=30).json()
        items = lst if isinstance(lst, list) else lst.get("items") or lst.get("orders") or []
        mine = next(x for x in items if (x.get("id") or x.get("order_id")) == oid)
        assert mine["status"] == "pending", "order should not execute (broker disabled)"
        pos = customer.get(f"{BASE_URL}/api/portfolio/stock-positions", timeout=30).json()
        pitems = pos if isinstance(pos, list) else pos.get("items") or pos.get("positions") or []
        aapl = next(p for p in pitems if p["symbol"] == "AAPL")
        assert float(aapl["quantity"]) == 3
        print("cash before", cash_before)
    finally:
        c = customer.post(f"{BASE_URL}/api/portfolio/orders/{oid}/cancel", timeout=30)
        print("cancel", c.status_code, c.text[:200])
    assert c.status_code == 200 and c.json()["status"] == "cancelled"
    cash_after = customer.get(f"{BASE_URL}/api/portfolio/cash", timeout=30).json()
    print("cash after", cash_after)
    assert cash_after.get("available") == cash_before.get("available")


# --- Perf admin overview
def test_admin_overview_time(admin, ids):
    t = time.perf_counter()
    r = admin.get(f"{BASE_URL}/api/admin/customers/overview", timeout=60)
    dt = time.perf_counter() - t
    print("overview", round(dt, 3), ids["qa_row"])
    assert r.status_code == 200 and dt < 3
