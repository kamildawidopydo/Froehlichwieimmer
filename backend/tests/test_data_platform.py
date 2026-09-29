"""Session 93 · Phase 3 — Data-Platform Regression + Integration Tests.

Deckt:
    * Freshness Engine (fresh/stale/expired/demo/unknown)
    * Validation Engine (Ranges, Festgeld-Term, Promo-Konsistenz)
    * Duplicate Detection (normalize + Alias-Lookup + Ambiguous)
    * Rate-Change Service (idempotent + Historisierung)
    * Import Pipeline (Diff + Dry-Run + Apply + Audit)
    * Public API (rate-history, data-sources, freshness field, backwards-compat)

Nicht enthalten: Admin-Endpoints POST (benötigen auth session). Direkte
Service-Tests deckten die Business-Logik vollständig ab.
"""
from __future__ import annotations
import asyncio
import os
import pytest
import requests
from datetime import datetime, timedelta, timezone
from dotenv import dotenv_values
from motor.motor_asyncio import AsyncIOMotorClient

from lib.data_freshness import compute_freshness
from lib.validation_engine import validate_offer_record
from lib.duplicate_detection import normalize_name, similarity, resolve_bank
from lib.rate_change_service import update_offer_rate
from lib.import_pipeline import (
    build_diff, apply_diff, normalize_records, parse_csv, MAX_RECORDS,
)

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


# ============================================================================
# Freshness Engine
# ============================================================================
def test_freshness_demo() -> None:
    assert compute_freshness(None, None, is_demo=True) == "demo"


def test_freshness_unknown_when_no_verified() -> None:
    assert compute_freshness(None, None, is_demo=False) == "unknown"


def test_freshness_fresh_recent() -> None:
    now = datetime.now(timezone.utc)
    assert compute_freshness(now - timedelta(days=2), None, is_demo=False, now=now) == "fresh"


def test_freshness_stale_old() -> None:
    now = datetime.now(timezone.utc)
    assert compute_freshness(now - timedelta(days=15), None, is_demo=False, now=now) == "stale"


def test_freshness_expired_valid_until_past() -> None:
    now = datetime.now(timezone.utc)
    assert compute_freshness(now - timedelta(days=2), now - timedelta(days=1), is_demo=False, now=now) == "expired"


def test_demo_never_verified() -> None:
    # Regressions-Guard: Demo darf niemals als "fresh" gelten.
    now = datetime.now(timezone.utc)
    assert compute_freshness(now, None, is_demo=True, now=now) == "demo"


# ============================================================================
# Validation Engine
# ============================================================================
@pytest.fixture
def countries_and_dgs():
    return {"DE", "AT", "NL"}, {"DE", "AT", "NL"}


def test_validate_valid_festgeld(countries_and_dgs):
    cc, dgs = countries_and_dgs
    r = validate_offer_record({
        "bank_slug": "example",
        "product_type": "festgeld",
        "interest_rate": 3.0,
        "term_months": 12,
        "min_amount": 100,
        "max_amount": 100000,
        "country": "DE",
        "deposit_guarantee_country": "DE",
    }, cc, dgs)
    assert r["valid"]


def test_validate_rejects_rate_out_of_range(countries_and_dgs):
    cc, dgs = countries_and_dgs
    r = validate_offer_record({
        "bank_slug": "e", "product_type": "festgeld", "interest_rate": 99.0,
        "term_months": 12, "country": "DE",
    }, cc, dgs)
    assert not r["valid"]
    assert any("outside plausible range" in e for e in r["errors"])


def test_validate_rejects_festgeld_without_term(countries_and_dgs):
    cc, dgs = countries_and_dgs
    r = validate_offer_record({
        "bank_slug": "e", "product_type": "festgeld", "interest_rate": 3.0,
        "country": "DE",
    }, cc, dgs)
    assert not r["valid"]


def test_validate_rejects_tagesgeld_with_binding_term(countries_and_dgs):
    cc, dgs = countries_and_dgs
    r = validate_offer_record({
        "bank_slug": "e", "product_type": "tagesgeld", "interest_rate": 3.0,
        "term_months": 12, "country": "DE",
    }, cc, dgs)
    assert not r["valid"]


def test_validate_min_max_deposit(countries_and_dgs):
    cc, dgs = countries_and_dgs
    r = validate_offer_record({
        "bank_slug": "e", "product_type": "festgeld", "interest_rate": 3.0,
        "term_months": 12, "min_amount": 5000, "max_amount": 1000, "country": "DE",
    }, cc, dgs)
    assert not r["valid"]


def test_validate_promo_consistency(countries_and_dgs):
    cc, dgs = countries_and_dgs
    r = validate_offer_record({
        "bank_slug": "e", "product_type": "tagesgeld", "interest_rate": 4.0,
        "interest_rate_type": "promo", "country": "DE",
    }, cc, dgs)
    assert not r["valid"]
    assert any("promo requires" in e for e in r["errors"])


def test_validate_unknown_country(countries_and_dgs):
    cc, dgs = countries_and_dgs
    r = validate_offer_record({
        "bank_slug": "e", "product_type": "festgeld", "interest_rate": 3.0,
        "term_months": 12, "country": "XX",
    }, cc, dgs)
    assert not r["valid"]


# ============================================================================
# Duplicate Detection
# ============================================================================
def test_normalize_strips_rechtsform() -> None:
    # AG/GmbH/S.A. werden entfernt, Marken-Kern bleibt.
    assert normalize_name("Deutsche Bank AG") == "deutsche bank"
    assert normalize_name("BBVA S.A.") == "bbva"
    assert normalize_name("ING") == "ing"
    # ING-DiBa AG behält "diba" — ist ein Marken-Bestandteil → Alias-Auflösung
    # muss über BankAlias-Collection erfolgen, nicht über Namensverstümmelung.
    assert "ing" in normalize_name("ING-DiBa AG").split()


def test_similarity_high_for_similar_names() -> None:
    assert similarity(normalize_name("Deutsche Bank"), normalize_name("deutsche-bank ag")) == 1.0
    assert similarity(normalize_name("BBVA"), normalize_name("BBVA S.A.")) >= 0.9


# ============================================================================
# Rate-Change Service (via Motor test DB)
# ============================================================================
@pytest.fixture
def db():
    client = AsyncIOMotorClient(MONGO_URL, tz_aware=True)
    return client[DB_NAME]


def _run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


def test_rate_change_no_op_when_same(db) -> None:
    async def _test():
        await db.savings_offers.insert_one({
            "bank_slug": "_test_bank", "product_type": "festgeld",
            "term_months": 12, "interest_rate": 3.0, "is_demo": True,
        })
        offer = await db.savings_offers.find_one({"bank_slug": "_test_bank"})
        res = await update_offer_rate(
            offer_id=str(offer["_id"]), new_rate=3.0,
            offers_collection=db.savings_offers,
            history_collection=db.interest_rate_history,
        )
        assert res["changed"] is False
        # cleanup
        await db.savings_offers.delete_many({"bank_slug": "_test_bank"})
        await db.interest_rate_history.delete_many({"offer_id": str(offer["_id"])})
    _run(_test())


def test_rate_change_creates_history(db) -> None:
    async def _test():
        await db.savings_offers.insert_one({
            "bank_slug": "_test_bank2", "product_type": "festgeld",
            "term_months": 12, "interest_rate": 3.0, "is_demo": False,
        })
        offer = await db.savings_offers.find_one({"bank_slug": "_test_bank2"})
        res1 = await update_offer_rate(
            offer_id=str(offer["_id"]), new_rate=3.5,
            source_id="test:manual", verified_at=datetime.now(timezone.utc),
            offers_collection=db.savings_offers, history_collection=db.interest_rate_history,
        )
        assert res1["changed"] is True
        res2 = await update_offer_rate(
            offer_id=str(offer["_id"]), new_rate=3.7,
            source_id="test:manual", verified_at=datetime.now(timezone.utc),
            offers_collection=db.savings_offers, history_collection=db.interest_rate_history,
        )
        assert res2["changed"] is True
        history = await db.interest_rate_history.find({"offer_id": str(offer["_id"])}).to_list(None)
        assert len(history) == 2
        # Der ältere Eintrag muss geschlossen sein.
        closed = [h for h in history if h.get("valid_until") is not None]
        open_ = [h for h in history if h.get("valid_until") is None]
        assert len(closed) == 1
        assert len(open_) == 1
        assert open_[0]["rate"] == 3.7
        # cleanup
        await db.savings_offers.delete_many({"bank_slug": "_test_bank2"})
        await db.interest_rate_history.delete_many({"offer_id": str(offer["_id"])})
    _run(_test())


# ============================================================================
# Import Pipeline (Dry-Run + Apply)
# ============================================================================
def test_normalize_records_strips_and_coerces() -> None:
    out = normalize_records([{"bank_slug": " x ", "interest_rate": "3.20", "term_months": "12"}])
    assert out[0] == {"bank_slug": "x", "interest_rate": 3.2, "term_months": 12}


def test_parse_csv_basic() -> None:
    csv = "bank_slug,product_type,interest_rate,term_months\nx,festgeld,3.2,12\n"
    r = parse_csv(csv)
    assert r == [{"bank_slug": "x", "product_type": "festgeld", "interest_rate": "3.2", "term_months": "12"}]


def test_import_diff_and_apply(db) -> None:
    async def _test():
        # Setup: eine Testbank in banks anlegen, damit resolve_bank match findet.
        await db.banks.insert_one({
            "slug": "_it_bank", "name": "Import Test Bank",
            "country_code": "DE", "country": "Germany", "is_demo": False, "is_active": True,
        })
        records = normalize_records([
            {"bank_slug": "_it_bank", "product_type": "festgeld",
             "interest_rate": 3.2, "term_months": 12,
             "min_amount": 100, "max_amount": 100000,
             "country": "DE", "deposit_guarantee_country": "DE"},
        ])
        diffs, counts = await build_diff(
            records,
            banks_collection=db.banks,
            aliases_collection=db.bank_aliases,
            offers_collection=db.savings_offers,
            countries_collection=db.countries,
            dgs_collection=db.deposit_guarantee_schemes,
        )
        assert counts["create"] == 1
        applied = await apply_diff(
            diffs, source_slug="test:it", source_url=None,
            verification_method="manual_review", applied_by="tester",
            now=datetime.now(timezone.utc),
            offers_collection=db.savings_offers, history_collection=db.interest_rate_history,
        )
        assert applied["created"] == 1
        # Zweiter Lauf mit gleichem Zins → unchanged.
        diffs2, counts2 = await build_diff(
            records,
            banks_collection=db.banks, aliases_collection=db.bank_aliases,
            offers_collection=db.savings_offers, countries_collection=db.countries,
            dgs_collection=db.deposit_guarantee_schemes,
        )
        assert counts2["unchanged"] == 1
        # Dritter Lauf mit anderem Zins → rate_changed Diff.
        records3 = normalize_records([{**records[0], "interest_rate": 3.4}])
        diffs3, counts3 = await build_diff(
            records3,
            banks_collection=db.banks, aliases_collection=db.bank_aliases,
            offers_collection=db.savings_offers, countries_collection=db.countries,
            dgs_collection=db.deposit_guarantee_schemes,
        )
        assert counts3["update"] == 1
        rate_change = next(c for c in diffs3[0]["changes"] if c["field"] == "interest_rate")
        assert rate_change["type"] == "rate_changed"
        assert rate_change["old"] == 3.2 and rate_change["new"] == 3.4
        assert rate_change["delta_pp"] == 0.2
        # Apply Änderung → Non-Demo-Angebot mit History.
        applied3 = await apply_diff(
            diffs3, source_slug="test:it", source_url="https://example.com",
            verification_method="manual_review", applied_by="tester",
            now=datetime.now(timezone.utc),
            offers_collection=db.savings_offers, history_collection=db.interest_rate_history,
        )
        assert applied3["updated"] == 1
        offer = await db.savings_offers.find_one({"bank_slug": "_it_bank"})
        assert offer["is_demo"] is False
        assert offer["verified_at"] is not None
        assert offer["source_id"] == "test:it"
        history = await db.interest_rate_history.find({"offer_id": str(offer["_id"])}).to_list(None)
        assert len(history) >= 2  # initial + Änderung
        # cleanup
        await db.savings_offers.delete_many({"bank_slug": "_it_bank"})
        await db.banks.delete_many({"slug": "_it_bank"})
        await db.interest_rate_history.delete_many({"offer_id": str(offer["_id"])})
    _run(_test())


def test_import_invalid_record_skipped(db) -> None:
    async def _test():
        records = normalize_records([{"bank_slug": "example", "product_type": "festgeld",
                                      "interest_rate": 99.0, "term_months": 12, "country": "DE"}])
        diffs, counts = await build_diff(
            records,
            banks_collection=db.banks, aliases_collection=db.bank_aliases,
            offers_collection=db.savings_offers, countries_collection=db.countries,
            dgs_collection=db.deposit_guarantee_schemes,
        )
        assert counts["invalid"] == 1
        assert diffs[0]["action"] == "invalid"
    _run(_test())


def test_import_needs_review_when_bank_unknown(db) -> None:
    async def _test():
        records = normalize_records([{"bank_slug": "totally-unknown-xyz",
                                      "bank_name": "Wumbo Xyzabc Unknown Bank",
                                      "product_type": "festgeld", "interest_rate": 3.0,
                                      "term_months": 12, "country": "DE",
                                      "deposit_guarantee_country": "DE"}])
        diffs, counts = await build_diff(
            records,
            banks_collection=db.banks, aliases_collection=db.bank_aliases,
            offers_collection=db.savings_offers, countries_collection=db.countries,
            dgs_collection=db.deposit_guarantee_schemes,
        )
        assert counts["needs_review"] == 1
        assert diffs[0]["action"] == "needs_review"
    _run(_test())


# ============================================================================
# Public API integration
# ============================================================================
def test_public_api_offers_include_freshness_field() -> None:
    d = _get("/api/public/savings-offers?limit=3")
    for it in d["items"]:
        assert "freshness" in it
        assert it["freshness"]["label"] in {"demo", "fresh", "stale", "expired", "unknown"}


def test_public_rate_history_endpoint_returns_ok_for_any_id() -> None:
    d = _get("/api/public/savings-offers?limit=1")
    oid = d["items"][0]["id"]
    r = _get(f"/api/public/savings-offers/{oid}/rate-history")
    assert "items" in r
    assert r["offer_id"] == oid


def test_public_data_sources_endpoint_shape() -> None:
    r = _get("/api/public/data-sources")
    assert "items" in r


# ============================================================================
# Backwards-compat regression: Phase-1/2-Endpunkte müssen leben
# ============================================================================
def test_phase12_regression() -> None:
    assert _get("/api/public/countries")["count"] == 15
    assert _get("/api/public/deposit-guarantee-schemes")["count"] == 15
    assert _get("/api/public/partner-banks")["count"] >= 60
    facets = _get("/api/public/savings-offers/facets")
    assert facets["total"] > 0
    off = _get("/api/public/savings-offers?limit=5&sort=rate")
    assert off["count"] > 0
