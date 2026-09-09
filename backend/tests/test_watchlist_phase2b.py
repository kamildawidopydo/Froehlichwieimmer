"""Watchlist + symbol search + sparkline endpoints (Phase 2b)."""

from __future__ import annotations

import os
import re
import requests
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
# Load frontend .env to reach the same public URL the browser hits — required
# because auth cookies are pinned to `Domain=preview.emergentagent.com`.
_FE_ENV = Path(__file__).resolve().parents[2] / "frontend" / ".env"
if _FE_ENV.exists():
    load_dotenv(_FE_ENV, override=False)

BASE_URL = (
    os.environ.get("BACKEND_URL")
    or os.environ.get("REACT_APP_BACKEND_URL")
    or "http://localhost:8001"
).rstrip("/")
API = f"{BASE_URL}/api"


def _login():
    s = requests.Session()
    email = os.environ.get("ADMIN_EMAIL", "admin@kapitalmitte.com")
    password = os.environ.get("ADMIN_PASSWORD", "admin123")
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=10)
    assert r.status_code == 200, r.text
    return s


def _cleanup(session):
    lst = session.get(f"{API}/watchlist", timeout=10).json()
    for i in lst.get("items", []):
        session.delete(f"{API}/watchlist/{i['symbol']}", timeout=10)


# ----- auth ------------------------------------------------------------------

def test_watchlist_requires_auth():
    for method, path, kwargs in [
        ("get", "/watchlist", {}),
        ("post", "/watchlist", {"json": {"symbol": "NVDA"}}),
        ("delete", "/watchlist/NVDA", {}),
        ("put", "/watchlist/order", {"json": {"symbols": []}}),
        ("get", "/watchlist/search?q=x", {}),
    ]:
        r = getattr(requests, method)(f"{API}{path}", timeout=10, **kwargs)
        assert r.status_code in (401, 403), f"{method} {path} → {r.status_code}"


# ----- add / list / dedupe ---------------------------------------------------

def test_add_curated_symbol_populates_metadata():
    s = _login()
    _cleanup(s)
    try:
        r = s.post(f"{API}/watchlist", json={"symbol": "NVDA"}, timeout=10)
        assert r.status_code == 201, r.text
        item = r.json()
        assert item["symbol"] == "NVDA"
        assert item["asset_type"] == "stock"
        assert item["display_name"] == "NVIDIA"
        assert item["sort_order"] == 0
    finally:
        _cleanup(s)


def test_add_normalises_and_uppercases_symbol():
    s = _login()
    _cleanup(s)
    try:
        r = s.post(f"{API}/watchlist", json={"symbol": "  vow3.de "}, timeout=10)
        assert r.status_code == 201
        assert r.json()["symbol"] == "VOW3.DE"
        assert r.json()["display_name"] == "Volkswagen VZ"
    finally:
        _cleanup(s)


def test_add_duplicate_is_idempotent():
    s = _login()
    _cleanup(s)
    try:
        first = s.post(f"{API}/watchlist", json={"symbol": "DAX"}, timeout=10).json()
        second = s.post(f"{API}/watchlist", json={"symbol": "DAX"}, timeout=10).json()
        assert first["symbol"] == second["symbol"] == "DAX"
        lst = s.get(f"{API}/watchlist", timeout=10).json()
        assert lst["count"] == 1
    finally:
        _cleanup(s)


def test_add_arbitrary_symbol_defaults_to_stock():
    s = _login()
    _cleanup(s)
    try:
        item = s.post(f"{API}/watchlist", json={"symbol": "FOOBAR"}, timeout=10).json()
        assert item["symbol"] == "FOOBAR"
        assert item["asset_type"] == "stock"
        assert item["display_name"] == "FOOBAR"
        # Not part of the known universe → quote should be None
        lst = s.get(f"{API}/watchlist", timeout=10).json()
        entry = next(i for i in lst["items"] if i["symbol"] == "FOOBAR")
        assert entry["quote"] is None
    finally:
        _cleanup(s)


def test_list_enriches_known_symbols_with_quote():
    s = _login()
    _cleanup(s)
    try:
        s.post(f"{API}/watchlist", json={"symbol": "NVDA"}, timeout=10)
        s.post(f"{API}/watchlist", json={"symbol": "DAX"}, timeout=10)
        data = s.get(f"{API}/watchlist", timeout=10).json()
        for i in data["items"]:
            assert i["quote"] is not None
            assert i["quote"]["price"] > 0
            assert i["quote"]["data_source"] in {"alpha_vantage", "cache", "stale_cache", "fallback"}
    finally:
        _cleanup(s)


def test_reject_bad_asset_type():
    s = _login()
    _cleanup(s)
    r = s.post(f"{API}/watchlist", json={"symbol": "NVDA", "asset_type": "hackish"}, timeout=10)
    assert r.status_code == 400


# ----- reorder + delete ------------------------------------------------------

def test_reorder_preserves_provided_order():
    s = _login()
    _cleanup(s)
    try:
        for sym in ("NVDA", "SAP", "DAX", "TSLA"):
            s.post(f"{API}/watchlist", json={"symbol": sym}, timeout=10)
        r = s.put(f"{API}/watchlist/order", json={"symbols": ["DAX", "TSLA", "SAP", "NVDA"]}, timeout=10)
        assert r.status_code == 200 and r.json()["reordered"] == 4
        data = s.get(f"{API}/watchlist", timeout=10).json()
        assert [i["symbol"] for i in data["items"]] == ["DAX", "TSLA", "SAP", "NVDA"]
    finally:
        _cleanup(s)


def test_delete_removes_and_404s():
    s = _login()
    _cleanup(s)
    try:
        s.post(f"{API}/watchlist", json={"symbol": "NVDA"}, timeout=10)
        r = s.delete(f"{API}/watchlist/NVDA", timeout=10)
        assert r.status_code == 200
        r = s.delete(f"{API}/watchlist/NVDA", timeout=10)
        assert r.status_code == 404
    finally:
        _cleanup(s)


# ----- search ----------------------------------------------------------------

def test_search_empty_query():
    s = _login()
    data = s.get(f"{API}/watchlist/search", timeout=10).json()
    assert data == {"items": [], "source": "empty"}


def test_search_matches_curated():
    s = _login()
    r = s.get(f"{API}/watchlist/search", params={"q": "NVDA"}, timeout=10)
    data = r.json()
    assert any(i["symbol"] == "NVDA" for i in data["items"])
    assert data["source"] in {"curated", "alpha_vantage"}


def test_search_matches_by_name():
    s = _login()
    data = s.get(f"{API}/watchlist/search", params={"q": "Apple"}, timeout=10).json()
    assert any(i["symbol"] == "AAPL" for i in data["items"])


def test_search_matches_german_symbol():
    s = _login()
    data = s.get(f"{API}/watchlist/search", params={"q": "vow3"}, timeout=10).json()
    assert any(i["symbol"] == "VOW3.DE" for i in data["items"])


# ----- sparklines ------------------------------------------------------------

def test_sparkline_supported_indices():
    for sym in ("DAX", "SPX", "NDX", "DJI"):
        r = requests.get(f"{API}/news-markte/market/sparkline/{sym}", timeout=10)
        assert r.status_code == 200, sym
        data = r.json()
        assert len(data["points"]) >= 2
        # Session 82.104 — yfinance in Whitelist (Session 82.15+ Provider-Erweiterung).
        assert data["data_source"] in {"alpha_vantage", "cache", "fallback", "yfinance"}
        assert data["prev_close"] > 0


def test_sparkline_unsupported_returns_404():
    r = requests.get(f"{API}/news-markte/market/sparkline/NVDA", timeout=10)
    assert r.status_code == 404


def test_sparkline_ttl_cached_second_call():
    r1 = requests.get(f"{API}/news-markte/market/sparkline/DAX", timeout=10).json()
    r2 = requests.get(f"{API}/news-markte/market/sparkline/DAX", timeout=10).json()
    # points list must be identical (deterministic within TTL)
    assert r1["points"] == r2["points"]


def test_no_secrets_in_watchlist_search_response():
    s = _login()
    text = s.get(f"{API}/watchlist/search", params={"q": "NVDA"}, timeout=10).text
    assert "apikey" not in text.lower()
    assert not re.search(r"[A-Z0-9]{16,}", text), "possible AV key leaked"
