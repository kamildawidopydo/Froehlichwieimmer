# EUR-only depot: history endpoint FX conversion (historical per-bar rate) + quotes in EUR
import os
import statistics
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
RANGES = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "5y"]
US = ["AAPL", "NVDA", "MSFT", "AMZN", "TSLA"]
DE = ["DBK", "SAP"]


def _hist(sym, rng):
    r = requests.get(f"{BASE_URL}/api/stocks/{sym}/history", params={"range": rng}, timeout=60)
    assert r.status_code == 200, r.text[:200]
    return r.json()


# US stocks: converted per bar
@pytest.mark.parametrize("sym", US)
@pytest.mark.parametrize("rng", RANGES)
def test_us_history_eur(sym, rng):
    d = _hist(sym, rng)
    assert d["data_status"] in ("fresh", "stale"), d["data_status"]
    assert d["currency"] == "EUR"
    assert d["native_currency"] == "USD"
    assert d["fx"] and d["fx"]["source"] == "Yahoo Finance EURUSD=X"
    pts = d["points"]
    assert len(pts) >= 2
    for p in pts:
        assert p.get("native_close") and p.get("fx_rate")
        assert abs(p["close"] - p["native_close"] / p["fx_rate"]) < 0.01
        assert 0.9 < p["fx_rate"] < 1.4
    s = d["stats"]
    closes = [p["close"] for p in pts]
    if s.get("fifty_two_week_high") is not None:
        assert s["fifty_two_week_high"] >= max(closes) - 0.01
        assert s["fifty_two_week_low"] <= min(closes) + 0.01
    if s.get("prev_close") is not None:
        # prev_close in EUR must match a converted close (not native)
        assert any(abs(s["prev_close"] - c) < 0.01 for c in closes)


@pytest.mark.parametrize("sym", ["AAPL", "NVDA"])
@pytest.mark.parametrize("rng", ["1y", "5y"])
def test_us_fx_rate_varies(sym, rng):
    d = _hist(sym, rng)
    rates = [p["fx_rate"] for p in d["points"]]
    assert len(set(rates)) > 10, f"fx not historical: {len(set(rates))} distinct"
    assert statistics.pstdev(rates) > 0.005


@pytest.mark.parametrize("sym", DE)
@pytest.mark.parametrize("rng", RANGES)
def test_de_history_eur(sym, rng):
    d = _hist(sym, rng)
    assert d["data_status"] in ("fresh", "stale")
    assert d["currency"] == "EUR"
    assert d["native_currency"] in ("EUR", None)
    assert len(d["points"]) >= 2


def test_quotes_eur_logged_in():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": "tester@mester.de", "password": "HHHKKK222"}, timeout=30)
    if r.status_code != 200:
        pytest.skip("login failed")
    q = s.get(f"{BASE_URL}/api/portfolio/quotes", params={"symbols": "AAPL,NVDA,MSFT,DBK,SAP"}, timeout=60).json()
    for sym in ["AAPL", "NVDA", "MSFT", "DBK", "SAP"]:
        assert q[sym]["currency"] == "EUR", (sym, q[sym])


@pytest.mark.parametrize("sym", ["AAPL", "NVDA", "MSFT"])
def test_quote_vs_history_consistency(sym):
    s = requests.Session()
    s.post(f"{BASE_URL}/api/auth/login", json={"email": "tester@mester.de", "password": "HHHKKK222"}, timeout=30)
    q = s.get(f"{BASE_URL}/api/portfolio/quotes", params={"symbols": sym}, timeout=60).json()[sym]
    d = _hist(sym, "5d")
    last = d["points"][-1]["close"]
    # quote EUR price should be within 3% of last EUR history close
    assert abs(q["price"] - last) / last < 0.03, (q["price"], last)
