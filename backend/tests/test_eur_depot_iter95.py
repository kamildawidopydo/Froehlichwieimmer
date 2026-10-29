# Iter95: EUR-only customer depot — central FX quotes, fundamentals ?display=EUR, catalog, IPO EUR, order FX snapshot
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
EUR_USER = ("test_eur_qa@example.com", "TestEur-Qa-2026!")
REG_USER = ("tester@mester.de", "HHHKKK222")


def _login(email, pw):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pw}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"login failed {email}: {r.status_code} {r.text[:200]}")
    return s


@pytest.fixture(scope="module")
def eur():
    return _login(*EUR_USER)


@pytest.fixture(scope="module")
def reg():
    return _login(*REG_USER)


# --- Quotes: central EUR conversion ---
def test_quotes_eur(eur):
    r = eur.get(f"{BASE_URL}/api/portfolio/quotes",
                params={"symbols": "AAPL,MSFT,NVDA,DBK,SAP,VOLV-B.ST"}, timeout=60)
    assert r.status_code == 200
    d = r.json()
    expected_native = {"AAPL": "USD", "MSFT": "USD", "NVDA": "USD", "DBK": "EUR", "SAP": "EUR", "VOLV-B.ST": "SEK"}
    for sym, ccy in expected_native.items():
        q = d[sym]
        print(sym, {k: q.get(k) for k in ("price", "native_price", "native_currency", "fx_rate", "prev_close", "change", "change_pct", "price_status", "source")})
        assert q["price"] is not None, f"{sym} no price {q}"
        assert q["currency"] == "EUR"
        assert q["native_currency"] == ccy, f"{sym} native {q['native_currency']}"
        if ccy == "EUR":
            assert q.get("fx_rate") is None
            assert abs(q["price"] - q["native_price"]) < 1e-6
        else:
            assert q["fx_rate"] and q["fx_pair"] == f"EUR/{ccy}"
            assert q["fx_source"] == f"Yahoo Finance EUR{ccy}=X"
            assert abs(q["price"] - q["native_price"] / q["fx_rate"]) < 0.01
            if ccy == "USD":
                assert 0.9 < q["fx_rate"] < 1.4
            if ccy == "SEK":
                assert 9 < q["fx_rate"] < 13
        if q.get("prev_close"):
            assert abs(q["change"] - (q["price"] - q["prev_close"])) < 0.01
            assert abs(q["change_pct"] - q["change"] / q["prev_close"] * 100) < 0.01


# --- Fundamentals ?display=EUR vs native ---
def test_fundamentals_display_eur():
    nat = requests.get(f"{BASE_URL}/api/stocks/AAPL/fundamentals", timeout=60).json()
    e = requests.get(f"{BASE_URL}/api/stocks/AAPL/fundamentals", params={"display": "EUR"}, timeout=60).json()
    print("native mc", nat.get("market_cap"), nat.get("currency"), "eur mc", e.get("market_cap"), e.get("fx"))
    assert nat.get("currency") == "USD"
    assert "native" not in nat
    assert e["currency"] == "EUR" and e["original_currency"] == "USD"
    rate = e["fx"]["rate"]
    for k in ("market_cap", "eps", "fifty_two_week_high", "fifty_two_week_low"):
        if e["native"].get(k) is not None:
            assert abs(e[k] - e["native"][k] / rate) <= max(0.01, abs(e[k]) * 1e-6), k
    assert e["native"]["market_cap"] == nat["market_cap"] or abs(e["native"]["market_cap"] - nat["market_cap"]) / nat["market_cap"] < 0.02


# --- Catalog with_quotes ---
def test_catalog_with_quotes_eur():
    r = requests.get(f"{BASE_URL}/api/stocks/catalog", params={"with_quotes": "true"}, timeout=60)
    assert r.status_code == 200
    items = r.json()["items"]
    assert items
    for it in items:
        assert it["currency"] == "EUR"
        assert "native_currency" in it
    aapl = next(i for i in items if i["symbol"] == "AAPL")
    print("catalog AAPL", aapl)
    assert aapl["native_currency"] == "USD"


# --- IPO catalog EUR equivalents ---
def test_ipo_catalog_eur(eur):
    r = eur.get(f"{BASE_URL}/api/ipo/catalog", timeout=60)
    assert r.status_code == 200
    items = r.json()
    items = items if isinstance(items, list) else items.get("items", [])
    found = 0
    for it in items:
        if it.get("price_currency") and it["price_currency"] != "EUR" and it.get("price_range_low") is not None:
            found += 1
            print(it.get("company_name"), it["price_range_low"], it["price_range_high"], it.get("price_range_low_eur"), it.get("price_range_high_eur"), it.get("fx"))
            fx = it["fx"]
            assert fx and fx["rate"] and fx["pair"] and fx["source"] and fx["as_of"]
            assert abs(it["price_range_low_eur"] - it["price_range_low"] / fx["rate"]) < 0.01
            if it.get("price_range_high") is not None:
                assert abs(it["price_range_high_eur"] - it["price_range_high"] / fx["rate"]) < 0.01
    names = " ".join((i.get("company_name") or "") for i in items)
    print("ipo names:", names)
    assert found >= 2


# --- Order FX snapshot (limit) + buying power ---
class TestOrders:
    created = []

    def test_cash(self, eur):
        c = eur.get(f"{BASE_URL}/api/portfolio/cash", timeout=30).json()
        print("cash", c["cash_balance"], c["cash_available"], c["currency"])
        assert c["currency"] == "EUR"
        assert c["cash_balance"] == 2000.0

    def test_limit_order_usd_fx_snapshot(self, eur):
        r = eur.post(f"{BASE_URL}/api/portfolio/orders", json={
            "symbol": "MSFT", "side": "buy", "order_type": "limit", "quantity": "1",
            "limit_price": "10.00", "idempotency_key": f"TEST_eur95_{uuid.uuid4().hex}"}, timeout=60)
        assert r.status_code == 201, r.text
        o = r.json()
        TestOrders.created.append(o["id"])
        print("order", {k: o.get(k) for k in ("currency", "original_currency", "fx_rate", "fx_pair", "fx_source", "fx_as_of", "native_limit_price", "reference_price_eur", "reference_price_native", "limit_price")})
        assert o["currency"] == "EUR"
        assert o["original_currency"] == "USD"
        assert o["fx_pair"] == "EUR/USD" and o["fx_source"] and o["fx_as_of"]
        assert abs(float(o["native_limit_price"]) - 10.0 * o["fx_rate"]) < 0.001
        assert abs(float(o["reference_price_eur"]) - float(o["reference_price_native"]) / o["fx_rate"]) < 0.01
        # persisted
        lst = eur.get(f"{BASE_URL}/api/portfolio/orders", timeout=30).json()
        p = next(x for x in lst if x["id"] == o["id"])
        assert p["fx_rate"] == o["fx_rate"] and p["native_limit_price"] == o["native_limit_price"]
        assert p["status"] == "pending"

    def test_limit_order_eur_stock(self, eur):
        r = eur.post(f"{BASE_URL}/api/portfolio/orders", json={
            "symbol": "SAP", "side": "buy", "order_type": "limit", "quantity": "1",
            "limit_price": "5.00", "idempotency_key": f"TEST_eur95_{uuid.uuid4().hex}"}, timeout=60)
        assert r.status_code == 201, r.text
        o = r.json()
        TestOrders.created.append(o["id"])
        print("SAP order", o.get("original_currency"), o.get("fx_rate"), o.get("fx_pair"), o.get("native_limit_price"))
        assert o["original_currency"] == "EUR" and o["fx_rate"] == 1.0
        assert abs(float(o["native_limit_price"]) - 5.0) < 1e-6

    def test_insufficient_buying_power(self, eur):
        r = eur.post(f"{BASE_URL}/api/portfolio/orders", json={
            "symbol": "AAPL", "side": "buy", "order_type": "limit", "quantity": "10",
            "limit_price": "300.00", "idempotency_key": f"TEST_eur95_{uuid.uuid4().hex}"}, timeout=60)
        print("ibp", r.status_code, r.text[:300])
        assert r.status_code == 400
        assert "EUR" in r.json()["detail"]

    def test_market_order_rejected(self, eur):
        r = eur.post(f"{BASE_URL}/api/portfolio/orders", json={
            "symbol": "AAPL", "side": "buy", "order_type": "market", "quantity": "1",
            "idempotency_key": f"TEST_eur95_{uuid.uuid4().hex}"}, timeout=30)
        assert r.status_code == 400

    def test_cleanup_cancel(self, eur):
        for oid in TestOrders.created:
            r = eur.post(f"{BASE_URL}/api/portfolio/orders/{oid}/cancel", json={}, timeout=30)
            print("cancel", oid, r.status_code)
            assert r.status_code == 200, r.text[:200]


# --- Positions EUR market value ---
def test_positions_eur(eur):
    pos = eur.get(f"{BASE_URL}/api/portfolio/stock-positions", timeout=60).json()
    syms = {p["symbol"]: p for p in pos}
    print({s: (p["quantity"], p["avg_cost"], p.get("price"), p.get("market_value"), p.get("profit_loss")) for s, p in syms.items()})
    for s in ("AAPL", "VOLV-B.ST", "DBK"):
        p = syms[s]
        assert p["price"] is not None
        assert abs(p["market_value"] - float(p["quantity"]) * p["price"]) < 0.02
    # sanity: VOLV in EUR should be ~20-40 not SEK (~250+)
    assert syms["VOLV-B.ST"]["price"] < 60
    assert "TESTIPO" in syms


def test_watchlist_alerts(eur):
    w = eur.get(f"{BASE_URL}/api/portfolio/watchlist", timeout=30).json()
    assert {x["symbol"] for x in w} >= {"AAPL", "VOLV-B.ST", "DBK"}
    a = eur.get(f"{BASE_URL}/api/portfolio/alerts", timeout=30).json()
    print("alerts", a)
    assert any(x["symbol"] == "AAPL" for x in a)


def test_ipo_requests_me(eur):
    r = eur.get(f"{BASE_URL}/api/ipo/requests/me", timeout=30)
    assert r.status_code == 200
    print("ipo req", r.json())
    assert any(x.get("ticker") == "TESTIPO" for x in r.json())


# --- Regression tester@mester.de (read-only) ---
def test_regression_tester(reg):
    c = reg.get(f"{BASE_URL}/api/portfolio/cash", timeout=30)
    assert c.status_code == 200
    print("tester cash", c.json()["cash_balance"], c.json()["cash_available"])
    p = reg.get(f"{BASE_URL}/api/portfolio/stock-positions", timeout=60)
    assert p.status_code == 200
    print("tester positions", [(x["symbol"], x["quantity"], x["avg_cost"], x.get("price"), x.get("market_value")) for x in p.json()])
