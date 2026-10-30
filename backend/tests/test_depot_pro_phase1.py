# Depot Pro Phase 1: batched sparklines + unlisted IPO sell block
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
EMAIL = "test_eur_qa@example.com"
PW = "TestEur-Qa-2026!"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    r = sess.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PW})
    if r.status_code != 200:
        pytest.skip(f"login failed {r.status_code}")
    yield sess
    # cleanup: cancel orders created by this module
    for oid in getattr(sess, "_created", []):
        sess.post(f"{BASE_URL}/api/portfolio/orders/{oid}/cancel")


# --- Sparklines batch endpoint
class TestSparklines:
    def test_batch_items(self):
        r = requests.get(f"{BASE_URL}/api/stocks/sparklines", params={"symbols": "AAPL,DBK,VOLV-B.ST,TESTIPO", "range": "1mo"}, timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert d["currency"] == "EUR"
        items = d["items"]
        for sym in ["AAPL", "DBK", "VOLV-B.ST"]:
            assert items.get(sym), f"{sym} missing"
            c = items[sym]["closes"]
            assert 15 <= len(c) <= 25, f"{sym} len {len(c)}"
            assert all(isinstance(x, (int, float)) for x in c)
        assert "TESTIPO" in items and items["TESTIPO"] is None

    @pytest.mark.parametrize("sym", ["AAPL", "DBK", "VOLV-B.ST"])
    def test_matches_history(self, sym):
        sp = requests.get(f"{BASE_URL}/api/stocks/sparklines", params={"symbols": sym, "range": "1mo"}, timeout=60).json()
        h = requests.get(f"{BASE_URL}/api/stocks/{sym}/history", params={"range": "1mo"}, timeout=60).json()
        hc = [p["close"] for p in h["points"] if isinstance(p.get("close"), (int, float))]
        assert h["currency"] == "EUR"
        assert sp["items"][sym]["closes"] == hc

    def test_missing_symbols_param(self):
        r = requests.get(f"{BASE_URL}/api/stocks/sparklines")
        assert r.status_code == 422

    def test_lowercase_and_dupes(self):
        r = requests.get(f"{BASE_URL}/api/stocks/sparklines", params={"symbols": "aapl,AAPL, ,", "range": "1mo"}, timeout=60)
        assert r.status_code == 200
        assert list(r.json()["items"].keys()) == ["AAPL"]


# --- Orders: unlisted IPO block, normal buy unaffected
class TestOrders:
    @pytest.mark.parametrize("sym,qty", [("PRVT3", "1"), ("TESTIPO", "1")])
    def test_sell_unlisted_ipo_blocked(self, s, sym, qty):
        r = s.post(f"{BASE_URL}/api/portfolio/orders", json={
            "symbol": sym, "side": "sell", "order_type": "limit", "quantity": qty,
            "limit_price": "50.00", "idempotency_key": f"TEST_{uuid.uuid4().hex}"})
        print(sym, r.status_code, r.text[:300])
        if r.status_code in (200, 201):
            s._created = getattr(s, "_created", []) + [r.json().get("id")]
        assert r.status_code == 409
        assert "nicht börsennotiert" in r.json()["detail"]

    def test_aapl_limit_buy_still_works(self, s):
        r = s.post(f"{BASE_URL}/api/portfolio/orders", json={
            "symbol": "AAPL", "side": "buy", "order_type": "limit", "quantity": "1",
            "limit_price": "100.00", "idempotency_key": f"TEST_{uuid.uuid4().hex}"})
        assert r.status_code == 201, r.text
        d = r.json()
        s._created = getattr(s, "_created", []) + [d["id"]]
        assert d["status"] == "pending" and d["symbol"] == "AAPL" and d["side"] == "buy"

    def test_aapl_limit_sell_still_works(self, s):
        r = s.post(f"{BASE_URL}/api/portfolio/orders", json={
            "symbol": "AAPL", "side": "sell", "order_type": "limit", "quantity": "1",
            "limit_price": "9999.00", "idempotency_key": f"TEST_{uuid.uuid4().hex}"})
        assert r.status_code == 201, r.text
        s._created = getattr(s, "_created", []) + [r.json()["id"]]
