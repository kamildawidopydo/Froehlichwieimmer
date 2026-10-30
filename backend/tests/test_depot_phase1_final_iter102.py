# Depot Phase 1 final (iter 102): server-side IPO lock on all order paths + sparklines batch
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
EMAIL = "test_eur_qa@example.com"
PW = "TestEur-Qa-2026!"
MSG = "Diese IPO-Beteiligung ist nicht börsennotiert – kein regulärer Börsenhandel möglich."


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    r = sess.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PW})
    if r.status_code != 200:
        pytest.skip(f"login failed {r.status_code}")
    sess._created = []
    yield sess
    for oid in sess._created:
        sess.post(f"{BASE_URL}/api/portfolio/orders/{oid}/cancel")


def _order(s, sym, side, qty="1", price="30"):
    r = s.post(f"{BASE_URL}/api/portfolio/orders", json={
        "symbol": sym, "side": side, "order_type": "limit", "quantity": qty,
        "limit_price": price, "idempotency_key": f"TEST_{uuid.uuid4().hex}"})
    if r.status_code in (200, 201):
        s._created.append(r.json().get("id"))
    return r


# --- IPO lock: sell + buy, case-insensitive, unvalued IPO, over-qty
class TestIpoLock:
    @pytest.mark.parametrize("sym", ["TESTIPO", "testipo", "PRVT3", "PRVNV", " prvt3 "])
    @pytest.mark.parametrize("side", ["sell", "buy"])
    def test_blocked(self, s, sym, side):
        r = _order(s, sym, side)
        print(sym, side, r.status_code, r.text[:200])
        assert r.status_code == 409, r.text
        assert r.json()["detail"] == MSG

    def test_over_quantity_sell_still_409(self, s):
        r = _order(s, "PRVT3", "sell", qty="500")
        assert r.status_code == 409, r.text

    def test_market_order_ipo(self, s):
        r = s.post(f"{BASE_URL}/api/portfolio/orders", json={
            "symbol": "TESTIPO", "side": "sell", "order_type": "market", "quantity": "1",
            "idempotency_key": f"TEST_{uuid.uuid4().hex}"})
        assert r.status_code in (400, 409, 422)


# --- Listed symbol still tradeable
class TestListed:
    def test_aapl_buy(self, s):
        r = _order(s, "AAPL", "buy", price="100.00")
        assert r.status_code == 201, r.text
        d = r.json()
        assert d["symbol"] == "AAPL" and d["side"] == "buy" and d["status"] == "pending"

    def test_aapl_sell(self, s):
        r = _order(s, "AAPL", "sell", price="9999.00")
        assert r.status_code in (201, 400), r.text  # 400 only if all pieces reserved
        print("aapl sell", r.status_code, r.text[:200])

    def test_unauth(self):
        r = requests.post(f"{BASE_URL}/api/portfolio/orders", json={
            "symbol": "TESTIPO", "side": "sell", "order_type": "limit", "quantity": "1",
            "limit_price": "30", "idempotency_key": "TEST_unauth123"})
        assert r.status_code in (401, 403)


# --- Sparklines batch
class TestSparklines:
    def test_batch(self):
        r = requests.get(f"{BASE_URL}/api/stocks/sparklines", params={"symbols": "AAPL,DBK,VOLV-B.ST", "range": "1mo"}, timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert d["currency"] == "EUR"
        for sym in ["AAPL", "DBK", "VOLV-B.ST"]:
            assert d["items"].get(sym) and len(d["items"][sym]["closes"]) >= 2

    def test_stable(self):
        a = requests.get(f"{BASE_URL}/api/stocks/sparklines", params={"symbols": "AAPL,DBK", "range": "1mo"}, timeout=60).json()
        b = requests.get(f"{BASE_URL}/api/stocks/sparklines", params={"symbols": "AAPL,DBK", "range": "1mo"}, timeout=60).json()
        assert a["items"] == b["items"]
