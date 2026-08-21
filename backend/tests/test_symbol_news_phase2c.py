"""Phase 2c — symbol-news endpoint tests (Alpha-Vantage NEWS_SENTIMENT)."""

from __future__ import annotations

import os
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
_FE_ENV = Path(__file__).resolve().parents[2] / "frontend" / ".env"
if _FE_ENV.exists():
    load_dotenv(_FE_ENV, override=False)

BASE_URL = (
    os.environ.get("BACKEND_URL")
    or os.environ.get("REACT_APP_BACKEND_URL")
    or "http://localhost:8001"
).rstrip("/")
API = f"{BASE_URL}/api"


def test_symbol_news_returns_normalised_shape():
    r = requests.get(f"{API}/news-markte/symbol/NVDA/news", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert set(("symbol", "items", "data_source", "cached_until", "provider_configured", "empty_reason")) <= set(data)
    assert data["symbol"] == "NVDA"
    assert isinstance(data["items"], list)


def test_symbol_news_empty_when_no_provider():
    """Without AV key, we deliberately return an empty list — never fake news."""
    provider = bool((os.environ.get("ALPHA_VANTAGE_API_KEY") or os.environ.get("ALPHA_VANTAGE_KEY") or "").strip())
    r = requests.get(f"{API}/news-markte/symbol/NVDA/news", timeout=10).json()
    if not provider:
        assert r["items"] == []
        assert r["data_source"] == "empty"
        assert r["empty_reason"] == "no_provider"
        assert r["provider_configured"] is False


def test_symbol_news_normalises_symbol():
    r = requests.get(f"{API}/news-markte/symbol/  nvda /news", timeout=10)
    assert r.status_code == 200
    assert r.json()["symbol"] == "NVDA"


def test_symbol_news_batch_endpoint():
    r = requests.get(f"{API}/news-markte/symbols/news", params={"symbols": "NVDA,SAP,DAX,BOGUS"}, timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert set(data["by_symbol"].keys()) == {"NVDA", "SAP", "DAX", "BOGUS"}
    for sym, node in data["by_symbol"].items():
        assert isinstance(node["items"], list)


def test_symbol_news_batch_respects_max():
    # 50 symbols → truncated to 25
    r = requests.get(f"{API}/news-markte/symbols/news", params={"symbols": ",".join([f"S{i}" for i in range(50)])}, timeout=10)
    data = r.json()
    assert len(data["requested"]) <= 25


def test_symbol_news_cache_stable_within_ttl():
    r1 = requests.get(f"{API}/news-markte/symbol/DAX/news", timeout=10).json()
    r2 = requests.get(f"{API}/news-markte/symbol/DAX/news", timeout=10).json()
    # Same list twice → cache hit within 30 min TTL
    assert r1["items"] == r2["items"]


def test_no_secrets_leaked_in_response():
    text = requests.get(f"{API}/news-markte/symbol/NVDA/news", timeout=10).text
    assert "apikey" not in text.lower()


def test_topic_indices_supported():
    for sym in ("DAX", "SPX", "NDX", "DJI"):
        r = requests.get(f"{API}/news-markte/symbol/{sym}/news", timeout=10)
        assert r.status_code == 200
        data = r.json()
        # Should never be null; empty list is fine when no provider
        assert isinstance(data["items"], list)
