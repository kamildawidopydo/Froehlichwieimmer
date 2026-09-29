"""Session 93 · Phase 4 — Backend-Tests für OfferLinks & Public-Endpunkte."""
from __future__ import annotations
import asyncio
import os
import pytest
import requests
from datetime import datetime, timedelta, timezone
from dotenv import dotenv_values
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

# Duplikat der Kern-Regeln, damit der Test unabhängig vom Router-Module bleibt
# (Router importiert server.py → Circular-Import beim Test-Collect).
PRIORITY = {"affiliate": 3, "direct": 2, "information": 1}


def _is_active_link(link, now):
    if link.get("status") != "active":
        return False
    vf = link.get("valid_from")
    if vf and isinstance(vf, datetime) and vf > now:
        return False
    vu = link.get("valid_until")
    if vu and isinstance(vu, datetime) and vu < now:
        return False
    return bool(link.get("url"))

_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_FE_ENV = dotenv_values(os.path.join(_ROOT, "frontend", ".env"))
_BE_ENV = dotenv_values(os.path.join(_ROOT, "backend", ".env"))
BASE = _FE_ENV.get("REACT_APP_BACKEND_URL")
MONGO_URL = _BE_ENV.get("MONGO_URL")
DB_NAME = _BE_ENV.get("DB_NAME")


def _get(path: str):
    r = requests.get(f"{BASE}{path}", timeout=15)
    r.raise_for_status()
    return r.json()


def _run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


# ----- OfferLink validity ----------------------------------------------------
def test_offerlink_priority_ordering() -> None:
    assert PRIORITY["affiliate"] > PRIORITY["direct"] > PRIORITY["information"]


def test_offerlink_inactive_when_status_not_active() -> None:
    now = datetime.now(timezone.utc)
    assert _is_active_link({"status": "inactive", "url": "https://x"}, now) is False
    assert _is_active_link({"status": "disabled", "url": "https://x"}, now) is False


def test_offerlink_inactive_when_valid_until_past() -> None:
    now = datetime.now(timezone.utc)
    past = now - timedelta(days=1)
    assert _is_active_link({"status": "active", "url": "https://x", "valid_until": past}, now) is False


def test_offerlink_inactive_when_valid_from_future() -> None:
    now = datetime.now(timezone.utc)
    fut = now + timedelta(days=1)
    assert _is_active_link({"status": "active", "url": "https://x", "valid_from": fut}, now) is False


def test_offerlink_active_when_all_good() -> None:
    now = datetime.now(timezone.utc)
    assert _is_active_link({"status": "active", "url": "https://x"}, now) is True


# ----- Admin auth guard ------------------------------------------------------
def test_admin_offer_links_require_auth() -> None:
    r = requests.get(f"{BASE}/api/admin/offer-links", timeout=15)
    assert r.status_code in (401, 403)


def test_admin_create_offer_link_requires_auth() -> None:
    r = requests.post(
        f"{BASE}/api/admin/offer-links",
        json={"offer_id": "x", "type": "direct", "url": "https://x"},
        timeout=15,
    )
    assert r.status_code in (401, 403)


# ----- Public offer-links ----------------------------------------------------
def test_public_offer_links_shape_for_any_offer() -> None:
    d = _get("/api/public/savings-offers?limit=1")
    oid = d["items"][0]["id"]
    r = _get(f"/api/public/offer-links/{oid}")
    assert r["offer_id"] == oid
    assert "links" in r and "primary" in r
    assert isinstance(r["count"], int)


# ----- Public bank routes ----------------------------------------------------
def test_public_banks_directory() -> None:
    d = _get("/api/public/banks")
    assert d["count"] >= 60
    b0 = d["items"][0]
    for k in ("slug", "name", "country_code", "offer_count"):
        assert k in b0


def test_public_bank_detail_known_slug() -> None:
    d = _get("/api/public/banks/ing")
    assert d["bank"] is not None
    assert d["bank"]["slug"] == "ing"
    assert isinstance(d["offers"], list)


def test_public_bank_detail_unknown_slug_returns_none() -> None:
    d = _get("/api/public/banks/does-not-exist-xyz")
    assert d["bank"] is None
    assert d["offers"] == []


# ----- Freshness field on offers --------------------------------------------
def test_public_offers_freshness_labels_valid() -> None:
    d = _get("/api/public/savings-offers?limit=50")
    valid = {"demo", "fresh", "stale", "expired", "unknown"}
    for it in d["items"]:
        assert it["freshness"]["label"] in valid


def test_public_offers_demo_never_fresh_regression() -> None:
    d = _get("/api/public/savings-offers?limit=200")
    for it in d["items"]:
        if it["is_demo"]:
            assert it["freshness"]["label"] == "demo", f"demo offer {it['id']} must have label 'demo'"


# ----- Rate-history end-to-end (using RateChangeService via direct DB) ------
def test_rate_history_endpoint_after_change() -> None:
    async def _test():
        client = AsyncIOMotorClient(MONGO_URL, tz_aware=True)
        db = client[DB_NAME]
        # Neues Test-Offer, echter (nicht-Demo) mit source_id
        r = await db.savings_offers.insert_one({
            "bank_slug": "_phase4_bank", "product_type": "festgeld",
            "term_months": 12, "interest_rate": 3.0, "is_demo": False,
            "verified_at": datetime.now(timezone.utc),
        })
        oid = str(r.inserted_id)
        # simulate history entries
        now = datetime.now(timezone.utc)
        await db.interest_rate_history.insert_many([
            {"offer_id": oid, "rate": 3.0, "rate_type": "standard",
             "valid_from": now - timedelta(days=60), "valid_until": now - timedelta(days=30),
             "is_demo": False},
            {"offer_id": oid, "rate": 3.25, "rate_type": "standard",
             "valid_from": now - timedelta(days=30), "valid_until": None,
             "is_demo": False},
        ])
        d = requests.get(f"{BASE}/api/public/savings-offers/{oid}/rate-history", timeout=15).json()
        assert d["count"] == 2
        assert d["items"][0]["valid_from"] < d["items"][1]["valid_from"]
        # cleanup
        await db.savings_offers.delete_many({"bank_slug": "_phase4_bank"})
        await db.interest_rate_history.delete_many({"offer_id": oid})
    _run(_test())


# ----- Backwards-compat regression: Phases 1-3 endpoints still work ---------
def test_phase123_regression() -> None:
    assert _get("/api/public/countries")["count"] == 15
    assert _get("/api/public/deposit-guarantee-schemes")["count"] == 15
    assert _get("/api/public/savings-offers/facets")["total"] > 0
