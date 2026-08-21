"""Pytest suite — Phase 2 Market Data (Alpha Vantage integration).

Runs against the live backend and requires MongoDB to be available.
"""

from __future__ import annotations

import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any

import pytest
import requests

BASE_URL = os.environ.get("BACKEND_URL", "http://localhost:8001").rstrip("/")
API = f"{BASE_URL}/api"


# ----- helpers ---------------------------------------------------------------

def _get(path: str, **kwargs: Any) -> requests.Response:
    return requests.get(f"{API}{path}", timeout=10, **kwargs)


def _iso_within(iso_str: str, minutes: int = 5) -> bool:
    """Return True if `iso_str` is a valid ISO datetime within `minutes` of now."""
    try:
        ts = datetime.fromisoformat(iso_str)
    except ValueError:
        return False
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return abs((datetime.now(timezone.utc) - ts).total_seconds()) < minutes * 60


# ----- overview endpoint -----------------------------------------------------

def test_overview_shape_and_defaults():
    r = _get("/news-markte/market/overview")
    assert r.status_code == 200
    data = r.json()
    for key in ("indices", "commodities", "fx", "last_updated", "is_delayed", "provider_configured", "data_source_summary"):
        assert key in data, f"missing key: {key}"
    assert isinstance(data["indices"], list) and len(data["indices"]) == 4
    assert {q["symbol"] for q in data["indices"]} == {"DAX", "SPX", "NDX", "DJI"}
    assert {q["symbol"] for q in data["commodities"]} == {"GOLD", "SILVER", "OIL"}
    assert {q["symbol"] for q in data["fx"]} == {"EURUSD"}


def test_overview_last_updated_fresh():
    data = _get("/news-markte/market/overview").json()
    assert _iso_within(data["last_updated"], minutes=15)


def test_overview_no_secrets_leaked():
    text = _get("/news-markte/market/overview").text
    # Alpha Vantage keys are typically ~16 uppercase letters/digits.
    assert "apikey" not in text.lower()
    assert not re.search(r"[A-Z0-9]{16,}", text), "possible AV key leaked in response"


def test_overview_provider_configured_matches_env():
    # When the key is empty in .env, provider_configured must be False and everything comes from fallback.
    provider_configured = bool((os.environ.get("ALPHA_VANTAGE_API_KEY") or os.environ.get("ALPHA_VANTAGE_KEY") or "").strip())
    data = _get("/news-markte/market/overview").json()
    assert data["provider_configured"] is provider_configured


# ----- quote normalisation ---------------------------------------------------

@pytest.mark.parametrize("symbol", ["DAX", "SPX", "NDX", "DJI", "GOLD", "SILVER", "OIL", "EURUSD", "NVDA", "AAPL", "SAP"])
def test_single_quote_full_shape(symbol):
    r = _get(f"/news-markte/market/quote/{symbol}")
    assert r.status_code == 200, r.text
    q = r.json()
    for key in ("symbol", "name", "price", "change", "change_percent", "currency",
                "last_updated", "market_status", "data_source", "is_delayed"):
        assert key in q, f"{symbol}: missing {key}"
    assert isinstance(q["price"], (int, float)) and q["price"] > 0
    assert q["currency"] in {"USD", "EUR", "GBP", "JPY", "CHF", None}
    assert q["market_status"] in {"live", "delayed"}
    assert q["data_source"] in {"alpha_vantage", "cache", "stale_cache", "fallback"}
    assert isinstance(q["is_delayed"], bool)
    # New currency-normalisation contract
    for key in ("asset_class", "original_price", "original_currency", "display_price",
                "display_currency", "fx_rate", "fx_updated_at", "conversion_available"):
        assert key in q, f"{symbol}: missing {key}"
    assert q["asset_class"] in {"index", "stock", "commodity", "fx"}


def test_unknown_symbol_returns_404():
    r = _get("/news-markte/market/quote/DOES_NOT_EXIST")
    assert r.status_code == 404
    assert "Unbekanntes Symbol" in r.json().get("detail", "")


# ----- batch endpoint --------------------------------------------------------

def test_batch_quotes_and_unknown_partition():
    r = _get("/news-markte/market/quotes", params={"symbols": "DAX,NVDA,GOLD,BOGUS,AAPL"})
    assert r.status_code == 200
    data = r.json()
    known = {q["symbol"] for q in data["items"]}
    assert known == {"DAX", "NVDA", "GOLD", "AAPL"}
    assert data["unknown"] == ["BOGUS"]


def test_batch_lowercase_and_whitespace_normalised():
    r = _get("/news-markte/market/quotes", params={"symbols": "  dax , sap , NVDA"})
    data = r.json()
    assert {q["symbol"] for q in data["items"]} == {"DAX", "SAP", "NVDA"}


# ----- stocks endpoint -------------------------------------------------------

def test_stocks_endpoint_full_list():
    data = _get("/news-markte/market/stocks").json()
    assert isinstance(data["items"], list)
    assert len(data["items"]) == 11  # SAP, SIE, ALV, DBK, IFX, RHM, NVDA, AAPL, MSFT, GOOGL, AMZN
    symbols = {q["symbol"] for q in data["items"]}
    assert {"SAP", "SIE", "ALV", "DBK", "IFX", "RHM", "NVDA", "AAPL", "MSFT", "GOOGL", "AMZN"} <= symbols
    for q in data["items"]:
        assert q["price"] > 0
        assert q["data_source"] in {"alpha_vantage", "cache", "stale_cache", "fallback"}


# ----- commodities / fx ------------------------------------------------------

def test_commodities_endpoint():
    data = _get("/news-markte/market/commodities").json()
    assert {q["symbol"] for q in data["items"]} == {"GOLD", "SILVER", "OIL"}
    for q in data["items"]:
        # Commodities are proxied via ETFs → note must be present
        assert q.get("note"), f"missing proxy note for {q['symbol']}"


def test_fx_endpoint():
    data = _get("/news-markte/market/fx").json()
    assert len(data["items"]) == 1
    q = data["items"][0]
    assert q["symbol"] == "EURUSD"
    assert 0.5 < q["price"] < 2.5


# ----- caching ---------------------------------------------------------------

def test_provider_absent_returns_fallback():
    """Without an ALPHA_VANTAGE_API_KEY, every quote must be a `fallback` source."""
    if (os.environ.get("ALPHA_VANTAGE_API_KEY") or os.environ.get("ALPHA_VANTAGE_KEY") or "").strip():
        pytest.skip("Alpha Vantage key configured — fallback path not applicable.")
    data = _get("/news-markte/market/overview").json()
    all_sources = {q["data_source"] for q in data["indices"] + data["commodities"] + data["fx"]}
    assert all_sources == {"fallback"}


def test_cache_ttl_index_present():
    """The MongoDB TTL index on market_quotes_cache.expires_at must exist."""
    from pathlib import Path
    from dotenv import load_dotenv
    from motor.motor_asyncio import AsyncIOMotorClient
    import asyncio

    load_dotenv(Path(__file__).resolve().parents[1] / ".env")

    async def check():
        client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
        db = client[os.environ["DB_NAME"]]
        indexes = await db.market_quotes_cache.index_information()
        ttl_found = any(
            info.get("expireAfterSeconds") == 0 and info.get("key") == [("expires_at", 1)]
            for info in indexes.values()
        )
        client.close()
        return ttl_found

    assert asyncio.run(check()), "TTL index on market_quotes_cache.expires_at missing"


# ----- regression: existing endpoints unaffected -----------------------------

def test_existing_endpoints_still_ok():
    for path in ("/health", "/reviews/stats", "/reviews/topics", "/news-markte/markets"):
        r = _get(path)
        assert r.status_code == 200, f"regression on {path}: {r.status_code}"
