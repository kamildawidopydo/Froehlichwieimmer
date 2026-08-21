"""Regression tests for News & Märkte sections 16-21 (anlagetrends, investment-radar,
market-voices, and category feeds used by the new frontend sections/detail pages)."""
import os

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _unwrap(payload, key):
    """Endpoints may return a bare list or {key: [...]}"""
    if isinstance(payload, list):
        return payload
    assert isinstance(payload, dict), f"unexpected payload type {type(payload)}"
    for k in (key, "items", "data"):
        if k in payload:
            return payload[k]
    pytest.fail(f"could not locate list in payload keys={list(payload.keys())}")


# --- Anlagetrends ---
def test_anlagetrends(client):
    r = client.get(f"{BASE_URL}/api/news-markte/anlagetrends", timeout=30)
    assert r.status_code == 200, r.text[:300]
    items = _unwrap(r.json(), "trends")
    assert len(items) == 9, f"expected 9 trends, got {len(items)}"
    for it in items:
        for f in ("id", "slug", "title", "summary", "detail", "tag", "icon"):
            assert f in it and it[f] not in (None, ""), f"missing/empty {f} in {it}"
        assert "_id" not in it


# --- Investment-Radar ---
def test_investment_radar(client):
    r = client.get(f"{BASE_URL}/api/news-markte/investment-radar", timeout=30)
    assert r.status_code == 200, r.text[:300]
    items = _unwrap(r.json(), "items")
    assert len(items) == 6, f"expected 6 radar items, got {len(items)}"
    for it in items:
        for f in ("theme", "category", "why", "horizon", "tag"):
            assert it.get(f), f"missing {f} in {it}"
        assert "related_slug" in it
        assert "_id" not in it


# --- Stimmen zum Markt / market voices ---
def test_market_voices(client):
    r = client.get(f"{BASE_URL}/api/news-markte/market-voices", timeout=30)
    assert r.status_code == 200, r.text[:300]
    items = _unwrap(r.json(), "voices")
    assert len(items) == 6, f"expected 6 voices, got {len(items)}"
    for it in items:
        for f in ("source", "source_url", "topic", "excerpt", "published_at"):
            assert it.get(f), f"missing {f} in {it}"
        assert "_id" not in it


# --- Category feeds used by detail pages ---
@pytest.mark.parametrize("category,min_count", [
    ("fonds-etfs", 3),
    ("rohstoffe", 3),
    ("seltene-erden", 2),
    ("anleihen", 1),
    ("investmenttrends", 1),
    ("aktien", 1),
    ("zinsen", 1),
    ("waehrungen", 1),
    ("unternehmen", 1),
    ("alle", 5),
])
def test_feed_category(client, category, min_count):
    r = client.get(f"{BASE_URL}/api/news-markte/feed", params={"category": category}, timeout=30)
    assert r.status_code == 200, r.text[:300]
    data = r.json()
    assert "overview" in data, f"no overview key: {list(data.keys())}"
    overview = data["overview"]
    assert isinstance(overview, list)
    assert len(overview) >= min_count, f"{category}: expected >={min_count}, got {len(overview)}"
    for a in overview:
        assert a.get("title")
        assert "_id" not in a


def test_feed_unknown_category(client):
    r = client.get(f"{BASE_URL}/api/news-markte/feed", params={"category": "does-not-exist"}, timeout=30)
    assert r.status_code in (200, 400, 404), r.text[:300]


# --- Supporting endpoints for the /news page ---
def test_market_insights(client):
    r = client.get(f"{BASE_URL}/api/news-markte/markets", timeout=30)
    assert r.status_code == 200, r.text[:300]
    items = _unwrap(r.json(), "insights")
    assert len(items) > 0
    symbols = {i.get("symbol") for i in items}
    assert symbols & {"DAX", "SPX", "NDX", "XAU/USD", "EUR/USD"}, symbols


def test_editorial(client):
    r = client.get(f"{BASE_URL}/api/news-markte/editorial", timeout=30)
    assert r.status_code == 200, r.text[:300]
    items = _unwrap(r.json(), "posts")
    assert isinstance(items, list)
