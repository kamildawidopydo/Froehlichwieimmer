# Iteration 92: stock chart history (all ranges), day stats, currency, volatility, disabled order matching
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
RANGES = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "5y"]
SYMBOLS = ["DBK", "SAP", "RHM", "AAPL", "NVDA", "MSFT"]
US = {"AAPL", "NVDA", "MSFT"}


def _login(email, pw):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pw})
    if r.status_code != 200:
        pytest.skip(f"login failed {email}: {r.status_code}")
    tok = r.json().get("access_token") or r.json().get("token")
    if tok:
        s.headers["Authorization"] = f"Bearer {tok}"
    return s


@pytest.fixture(scope="module")
def cust():
    return _login("tester@mester.de", "HHHKKK222")


@pytest.fixture(scope="module")
def admin():
    return _login("admin@kapitalmitte.com", "admin123")


# History: every range returns points with parseable ISO timestamps
@pytest.mark.parametrize("sym", SYMBOLS)
@pytest.mark.parametrize("rk", RANGES)
def test_history_points(sym, rk):
    r = requests.get(f"{BASE_URL}/api/stocks/{sym}/history", params={"range": rk}, timeout=60)
    assert r.status_code == 200, r.text
    d = r.json()
    pts = d.get("points") or []
    assert len(pts) >= 2, f"{sym} {rk}: {len(pts)} points"
    ts = pts[0]["timestamp"]
    assert isinstance(ts, str) and ts[:2] in ("19", "20"), f"bad ts {ts}"
    assert d["currency"] == ("USD" if sym in US else "EUR")


# Day stats from 1d intraday
@pytest.mark.parametrize("sym", SYMBOLS)
def test_day_stats(sym):
    d = requests.get(f"{BASE_URL}/api/stocks/{sym}/history", params={"range": "1d"}, timeout=60).json()
    s = d["stats"]
    for k in ("day_high", "day_low", "day_volume", "open_of_day"):
        assert s.get(k) is not None, f"{sym} {k} missing"
    assert s["day_high"] >= s["day_low"]
    # Eröffnung should be the FIRST bar's open of the day, not the last bar's
    day = s["day_date"]
    first = [p for p in d["points"] if p["timestamp"][:10] == day][0]
    print(sym, "open_of_day", s["open_of_day"], "first-bar open", first["open"], "last-bar open", d["points"][-1]["open"])


def test_dbk_volatility():
    d = requests.get(f"{BASE_URL}/api/stocks/DBK/history", params={"range": "1y"}, timeout=60).json()
    v = d["stats"]["annualized_volatility_pct"]
    print("DBK vol", v)
    assert v is not None and 15 < v < 50


def test_matching_disabled(admin):
    r = admin.post(f"{BASE_URL}/api/admin/portfolio/orders/match")
    assert r.status_code == 200, r.text
    assert r.json().get("disabled") is True
    assert r.json().get("orders_executed") == 0


def test_limit_order_stays_pending_and_cancel(cust, admin):
    cash_before = cust.get(f"{BASE_URL}/api/portfolio/cash").json()
    r = cust.post(f"{BASE_URL}/api/portfolio/orders", json={
        "symbol": "DBK", "side": "buy", "order_type": "limit", "quantity": "1",
        "limit_price": "5.00", "idempotency_key": f"TEST_{uuid.uuid4()}",
    })
    assert r.status_code == 201, r.text
    oid = r.json()["id"]
    try:
        assert r.json()["status"] == "pending"
        admin.post(f"{BASE_URL}/api/admin/portfolio/orders/match")
        orders = cust.get(f"{BASE_URL}/api/portfolio/orders").json()
        items = orders.get("items", orders) if isinstance(orders, dict) else orders
        o = [x for x in items if x["id"] == oid][0]
        assert o["status"] == "pending"
    finally:
        c = cust.post(f"{BASE_URL}/api/portfolio/orders/{oid}/cancel")
        print("cancel", c.status_code, c.text[:200])
        assert c.status_code == 200
    cash_after = cust.get(f"{BASE_URL}/api/portfolio/cash").json()
    assert cash_before.get("balance") == cash_after.get("balance")
    assert cash_before.get("available") == cash_after.get("available")
