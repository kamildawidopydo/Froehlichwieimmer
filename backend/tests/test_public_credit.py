"""Tests for public credit offers endpoint (Session 94).

Mimics the sync pattern of tests/test_data_platform.py: `requests` against the
running preview backend + direct Mongo writes for fixtures. Fixtures use a
unique prefix and are torn down after each test; no persistent fake offers.
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict

import pytest
import requests
from dotenv import dotenv_values
from pymongo import MongoClient


_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_FE_ENV = dotenv_values(os.path.join(_ROOT, "frontend", ".env"))
_BE_ENV = dotenv_values(os.path.join(_ROOT, "backend", ".env"))
BASE = _FE_ENV.get("REACT_APP_BACKEND_URL")
MONGO_URL = _BE_ENV.get("MONGO_URL")
DB_NAME = _BE_ENV.get("DB_NAME")

TEST_PREFIX = "__p94_credit_fx__"


def _now(): return datetime.now(timezone.utc)


def _db():
    return MongoClient(MONGO_URL)[DB_NAME]


def _cleanup():
    db = _db()
    banks = list(db.banks.find({"slug": {"$regex": f"^{TEST_PREFIX}"}}))
    bank_oids = [b["_id"] for b in banks]
    bank_str_ids = [str(b["_id"]) for b in banks]
    if bank_oids:
        db.credit_offers.delete_many({
            "$or": [
                {"bank_id": {"$in": bank_oids}},
                {"bank_id": {"$in": bank_str_ids}},
                {"product_name": {"$regex": f"^{TEST_PREFIX}"}},
            ]
        })
        db.banks.delete_many({"_id": {"$in": bank_oids}})
    db.credit_offers.delete_many({"product_name": {"$regex": f"^{TEST_PREFIX}"}})
    db.credit_offers.delete_many({"source_id": "test_fixture"})


@pytest.fixture
def clean_db():
    _cleanup()
    yield _db()
    _cleanup()


def _seed_bank(db, name: str) -> str:
    slug = f"{TEST_PREFIX}{uuid.uuid4().hex[:6]}"
    r = db.banks.insert_one({
        "slug": slug, "name": name, "country": "DE",
        "logo_url": None, "is_active": True,
        "created_at": _now(), "updated_at": _now(),
    })
    return str(r.inserted_id)


def _seed_offer(db, bank_id: str, **overrides) -> str:
    base: Dict[str, Any] = {
        "bank_id": bank_id,
        "product_name": f"{TEST_PREFIX}Ratenkredit",
        "min_amount_eur": 1000.0, "max_amount_eur": 50000.0,
        "min_term_months": 12, "max_term_months": 120,
        "effective_rate_from": 5.5, "effective_rate_to": 9.9,
        "nominal_rate_from": 5.2,
        "purposes": ["Freie Verwendung"],
        "features": ["Sondertilgung möglich"],
        "is_active": True, "is_demo": False,
        "source_id": "test_fixture",
        "source_url": "https://example.test/credit-fixture",
        "source_retrieved_at": _now(),
        "verified_at": _now(),
        "verification_method": "unit_test_fixture",
        "created_at": _now(),
    }
    base.update(overrides)
    return str(db.credit_offers.insert_one(base).inserted_id)


def _get(path: str, params=None):
    r = requests.get(f"{BASE}{path}", params=params, timeout=15)
    r.raise_for_status()
    return r.json()


# ─── Tests ──────────────────────────────────────────────────────────────
def test_endpoint_reachable_empty(clean_db):
    body = _get("/api/public/credit-offers")
    assert "items" in body and "count" in body and "sort" in body


def test_amount_filter(clean_db):
    b = _seed_bank(clean_db, f"{TEST_PREFIX}FB1")
    _seed_offer(clean_db, b, min_amount_eur=1000, max_amount_eur=10000, effective_rate_from=4.5)
    _seed_offer(clean_db, b, min_amount_eur=15000, max_amount_eur=80000, effective_rate_from=6.0)

    body = _get("/api/public/credit-offers", {"amount": 20000})
    ours = [i for i in body["items"] if str(i.get("bank_id")) == b]
    assert len(ours) == 1
    assert ours[0]["min_amount_eur"] == 15000

    body = _get("/api/public/credit-offers", {"amount": 5000})
    ours = [i for i in body["items"] if str(i.get("bank_id")) == b]
    assert len(ours) == 1
    assert ours[0]["max_amount_eur"] == 10000


def test_term_filter(clean_db):
    b = _seed_bank(clean_db, f"{TEST_PREFIX}FB2")
    _seed_offer(clean_db, b, min_term_months=12, max_term_months=60, effective_rate_from=4.9)
    _seed_offer(clean_db, b, min_term_months=60, max_term_months=120, effective_rate_from=5.5)
    body = _get("/api/public/credit-offers", {"term_months": 84})
    ours = [i for i in body["items"] if str(i.get("bank_id")) == b]
    assert len(ours) == 1
    assert ours[0]["min_term_months"] == 60


def test_purpose_filter_and_freie_verwendung_fallback(clean_db):
    b = _seed_bank(clean_db, f"{TEST_PREFIX}FB3")
    _seed_offer(clean_db, b, purposes=["Auto"], effective_rate_from=3.9,
                 product_name=f"{TEST_PREFIX}AutoOnly")
    _seed_offer(clean_db, b, purposes=["Freie Verwendung"], effective_rate_from=6.9,
                 product_name=f"{TEST_PREFIX}FVFallback")

    body = _get("/api/public/credit-offers", {"purpose": "Auto"})
    ours = [i for i in body["items"] if str(i.get("bank_id")) == b]
    names = [i["product_name"] for i in ours]
    assert f"{TEST_PREFIX}AutoOnly" in names
    assert f"{TEST_PREFIX}FVFallback" in names

    body = _get("/api/public/credit-offers", {"purpose": "Umschuldung"})
    ours = [i for i in body["items"] if str(i.get("bank_id")) == b]
    assert all("Freie Verwendung" in i["purposes"] for i in ours)


def test_sorting_effective_rate_asc(clean_db):
    b = _seed_bank(clean_db, f"{TEST_PREFIX}FB4")
    _seed_offer(clean_db, b, effective_rate_from=7.9, product_name=f"{TEST_PREFIX}High")
    _seed_offer(clean_db, b, effective_rate_from=3.5, product_name=f"{TEST_PREFIX}Low")
    _seed_offer(clean_db, b, effective_rate_from=5.2, product_name=f"{TEST_PREFIX}Mid")

    body = _get("/api/public/credit-offers", {"sort": "effective_rate_asc"})
    rates = [i["effective_rate_from"] for i in body["items"]
             if str(i.get("bank_id")) == b]
    assert rates == sorted(rates)
    assert rates[0] == 3.5


def test_inactive_offer_excluded(clean_db):
    b = _seed_bank(clean_db, f"{TEST_PREFIX}FB5")
    active_id = _seed_offer(clean_db, b, effective_rate_from=4.4, product_name=f"{TEST_PREFIX}Act")
    inactive_id = _seed_offer(clean_db, b, is_active=False, effective_rate_from=1.0,
                                product_name=f"{TEST_PREFIX}Inact")
    body = _get("/api/public/credit-offers")
    ids = [i["id"] for i in body["items"]]
    assert active_id in ids
    assert inactive_id not in ids


def test_demo_excluded_by_default(clean_db):
    b = _seed_bank(clean_db, f"{TEST_PREFIX}FB6")
    _seed_offer(clean_db, b, is_demo=True, effective_rate_from=2.0,
                 product_name=f"{TEST_PREFIX}DemoOff")
    body = _get("/api/public/credit-offers")
    ours = [i for i in body["items"] if str(i.get("bank_id")) == b]
    assert all(not i["is_demo"] for i in ours)


def test_full_scenario_20k_84m_freie_verwendung(clean_db):
    """Regression: 20.000 € / 84 M / Freie Verwendung"""
    b = _seed_bank(clean_db, f"{TEST_PREFIX}FB7")
    good = _seed_offer(clean_db, b,
        min_amount_eur=5000, max_amount_eur=50000,
        min_term_months=12, max_term_months=120,
        purposes=["Freie Verwendung"], effective_rate_from=5.5,
        product_name=f"{TEST_PREFIX}Good")
    _seed_offer(clean_db, b,
        min_amount_eur=1000, max_amount_eur=10000,
        min_term_months=12, max_term_months=120,
        purposes=["Freie Verwendung"], effective_rate_from=3.0,
        product_name=f"{TEST_PREFIX}TooSmall")
    _seed_offer(clean_db, b,
        min_amount_eur=5000, max_amount_eur=50000,
        min_term_months=12, max_term_months=48,
        purposes=["Freie Verwendung"], effective_rate_from=4.0,
        product_name=f"{TEST_PREFIX}TermTooShort")
    body = _get("/api/public/credit-offers",
                 {"amount": 20000, "term_months": 84, "purpose": "Freie Verwendung"})
    ours = [i for i in body["items"] if str(i.get("bank_id")) == b]
    ids = [i["id"] for i in ours]
    assert ids == [good]


def test_bank_join_present(clean_db):
    b = _seed_bank(clean_db, f"{TEST_PREFIX}JoinedBank")
    _seed_offer(clean_db, b, effective_rate_from=4.0, product_name=f"{TEST_PREFIX}WithBank")
    body = _get("/api/public/credit-offers")
    match = next((i for i in body["items"] if str(i.get("bank_id")) == b), None)
    assert match is not None
    assert match["banks"] is not None
    assert match["banks"]["name"].startswith(TEST_PREFIX)


def test_regression_10k_60m(clean_db):
    b = _seed_bank(clean_db, f"{TEST_PREFIX}Reg1")
    a = _seed_offer(clean_db, b, min_amount_eur=5000, max_amount_eur=15000,
                     min_term_months=24, max_term_months=72,
                     purposes=["Freie Verwendung"], effective_rate_from=4.5,
                     product_name=f"{TEST_PREFIX}Match10k60m")
    body = _get("/api/public/credit-offers",
                 {"amount": 10000, "term_months": 60, "purpose": "Freie Verwendung"})
    ours = [i for i in body["items"] if str(i.get("bank_id")) == b]
    assert [i["id"] for i in ours] == [a]


def test_regression_30k_72m(clean_db):
    b = _seed_bank(clean_db, f"{TEST_PREFIX}Reg2")
    hit = _seed_offer(clean_db, b, min_amount_eur=20000, max_amount_eur=40000,
                       min_term_months=36, max_term_months=84,
                       purposes=["Freie Verwendung"], effective_rate_from=5.5,
                       product_name=f"{TEST_PREFIX}Match30k72m")
    body = _get("/api/public/credit-offers",
                 {"amount": 30000, "term_months": 72, "purpose": "Freie Verwendung"})
    ours = [i for i in body["items"] if str(i.get("bank_id")) == b]
    assert [i["id"] for i in ours] == [hit]


def test_data_status_verified_when_provenance_complete(clean_db):
    b = _seed_bank(clean_db, f"{TEST_PREFIX}Ver")
    oid = _seed_offer(clean_db, b, effective_rate_from=4.0,
                       product_name=f"{TEST_PREFIX}Verified")
    body = _get("/api/public/credit-offers")
    m = next((i for i in body["items"] if i["id"] == oid), None)
    assert m and m["data_status"] == "verified"


def test_data_status_unverified_when_missing_provenance(clean_db):
    b = _seed_bank(clean_db, f"{TEST_PREFIX}Unv")
    oid = _seed_offer(clean_db, b, effective_rate_from=4.0,
                       source_id=None, source_url=None,
                       verified_at=None, verification_method=None,
                       product_name=f"{TEST_PREFIX}Unverified")
    body = _get("/api/public/credit-offers")
    m = next((i for i in body["items"] if i["id"] == oid), None)
    assert m and m["data_status"] == "unverified"
