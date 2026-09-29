"""Session 93 · Phase 6B — Publish-Status, Calculation-Guard, Demo→Real-Replace.

Kern-Invarianten:
- Demo→Real erzeugt neue ID; Demo bleibt is_demo=true, is_active=false.
- Rate-History der neuen Real-ID enthält NICHT die Demo-History.
- publish_status ist orthogonal zu data_status.
- Calculation-Engine erfindet keinen Ertrag > Promo-Dauer ohne Folgezins.
- no_min_amount / no_max_amount unterscheiden „unbekannt" von „explizit keine Grenze".
"""
from __future__ import annotations
import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone

import pytest

sys.path.insert(0, "/app/backend")
from lib.data_freshness import data_status, publish_status, publish_status_reasons  # noqa: E402
from lib.savings_calculator import compute_yield  # noqa: E402
from lib.import_pipeline import build_diff, apply_diff, normalize_records  # noqa: E402

from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402
from dotenv import load_dotenv  # noqa: E402
load_dotenv("/app/backend/.env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
NOW = datetime.now(timezone.utc)


# ============================================================================
# 1) publish_status — pure unit tests
# ============================================================================
def _base_verified():
    return {
        "is_demo": False, "is_active": True, "status": "active",
        "source_id": "src", "verified_at": NOW,
        "verification_method": "manual", "source_retrieved_at": NOW,
        "deposit_guarantee_country": "DE",
    }


def test_publish_status_complete_when_dgs_and_no_promo():
    o = _base_verified()
    assert publish_status(o) == "complete"
    assert data_status(o) == "verified"


def test_publish_status_incomplete_when_missing_dgs():
    o = _base_verified(); o.pop("deposit_guarantee_country")
    assert publish_status(o) == "incomplete"
    assert "missing_dgs" in publish_status_reasons(o)


def test_publish_status_incomplete_when_promo_without_follow_on():
    o = _base_verified()
    o.update(promo_rate=3.8, promo_duration_months=5, standard_rate_after_promo=None)
    assert publish_status(o) == "incomplete"
    assert "missing_follow_on_rate" in publish_status_reasons(o)


def test_publish_status_complete_when_promo_with_follow_on():
    o = _base_verified()
    o.update(promo_rate=3.8, promo_duration_months=5, standard_rate_after_promo=1.5)
    assert publish_status(o) == "complete"


def test_publish_status_needs_review_when_flag_set():
    o = _base_verified(); o["needs_review"] = True
    assert publish_status(o) == "needs_review"


def test_verified_can_be_incomplete_orthogonal():
    o = _base_verified()
    o.update(promo_rate=3.8, promo_duration_months=5, standard_rate_after_promo=None)
    assert data_status(o) == "verified"
    assert publish_status(o) == "incomplete"


# ============================================================================
# 2) Calculation-Guard — Promo ohne Folgezins
# ============================================================================
def test_yield_promo_within_guarantee_horizon():
    offer = {"product_type":"tagesgeld","interest_rate":3.8,"interest_rate_type":"promo",
             "promo_rate":3.8,"promo_duration_months":5,"standard_rate_after_promo":None}
    r = compute_yield(offer, 10000, horizon_months=5)
    assert r["calculation_complete"] is True
    assert r["gross_return_eur"] == round(10000*3.8/100*5/12, 2)


def test_yield_promo_beyond_guarantee_no_follow_on_returns_none():
    offer = {"product_type":"tagesgeld","interest_rate":3.8,"interest_rate_type":"promo",
             "promo_rate":3.8,"promo_duration_months":5,"standard_rate_after_promo":None}
    r = compute_yield(offer, 10000, horizon_months=12)
    assert r["calculation_complete"] is False
    assert r["gross_return_eur"] is None
    assert r["partial_gross_return_eur"] == round(10000*3.8/100*5/12, 2)
    assert "missing_follow_on_rate" in r["calculation_reasons"]


def test_yield_promo_with_follow_on_full_horizon():
    offer = {"product_type":"tagesgeld","interest_rate":3.8,"interest_rate_type":"promo",
             "promo_rate":3.8,"promo_duration_months":5,"standard_rate_after_promo":1.5}
    r = compute_yield(offer, 10000, horizon_months=12)
    assert r["calculation_complete"] is True
    expected = round(10000*3.8/100*5/12 + 10000*1.5/100*7/12, 2)
    assert r["gross_return_eur"] == expected


def test_yield_standard_no_regression():
    offer = {"product_type":"tagesgeld","interest_rate":1.0}
    r = compute_yield(offer, 10000, horizon_months=12)
    assert r["gross_return_eur"] == 100.0
    assert r["calculation_complete"] is True


def test_yield_festgeld_no_regression():
    offer = {"product_type":"festgeld","interest_rate":2.5,"term_months":12}
    r = compute_yield(offer, 10000)
    assert r["gross_return_eur"] == 250.0
    assert r["calculation_complete"] is True


# ============================================================================
# 3) Demo→Real-Replacement matcher fix (build_diff)
# ============================================================================
@pytest.mark.asyncio
async def test_disabled_demo_is_not_matched_for_update():
    """Der Bug-Fix: build_diff darf ein deaktiviertes Demo-Offer NICHT als
    Update-Target verwenden. Sonst würde demo-replace das Demo in-place
    überschreiben statt einen neuen Real-Datensatz mit eigener ID zu erzeugen."""
    client = AsyncIOMotorClient(MONGO_URL, tz_aware=True)
    db = client[DB_NAME]
    fixture_bank_slug = f"__test_phase6b_{uuid.uuid4().hex[:8]}"

    # Bank + deaktiviertes Demo-Offer anlegen
    await db.banks.insert_one({"slug": fixture_bank_slug, "name": "P6B Test Bank",
                               "country_code": "DE", "is_demo": True})
    demo_res = await db.savings_offers.insert_one({
        "bank_slug": fixture_bank_slug, "product_type": "tagesgeld",
        "term_months": None, "interest_rate": 2.5, "is_demo": True,
        "is_active": False, "status": "disabled",
    })
    try:
        real_record = {
            "bank_slug": fixture_bank_slug, "product_type": "tagesgeld",
            "interest_rate": 3.0, "term_months": None, "country": "DE",
            "deposit_guarantee_country": "DE",
        }
        diffs, counts = await build_diff(
            normalize_records([real_record]),
            banks_collection=db.banks,
            aliases_collection=db.bank_aliases,
            offers_collection=db.savings_offers,
            countries_collection=db.countries,
            dgs_collection=db.deposit_guarantee_schemes,
        )
        # Der KRITISCHE Assert: action muss `create` sein, NICHT `update`.
        assert counts["create"] == 1, f"erwartet create=1, bekommen counts={counts} diffs={diffs}"
        assert counts["update"] == 0

        # Apply → neue Real-ID; Demo unverändert.
        applied = await apply_diff(
            diffs, source_slug="phase6b_fixture",
            source_url="https://example.com/phase6b",
            verification_method="fixture_test",
            applied_by="pytest", now=datetime.now(timezone.utc),
            offers_collection=db.savings_offers,
            history_collection=db.interest_rate_history,
        )
        assert applied["created"] == 1

        # Real-Datensatz finden
        real = await db.savings_offers.find_one({
            "bank_slug": fixture_bank_slug, "is_demo": False,
        })
        assert real is not None
        assert str(real["_id"]) != str(demo_res.inserted_id), "A != B"
        assert real.get("is_demo") is False
        assert real.get("source_id") == "phase6b_fixture"
        assert real.get("verified_at") is not None
        assert real.get("verification_method") == "fixture_test"
        assert real.get("source_retrieved_at") is not None

        # Demo bleibt unverändert Demo + inactive
        demo_after = await db.savings_offers.find_one({"_id": demo_res.inserted_id})
        assert demo_after.get("is_demo") is True
        assert demo_after.get("is_active") is False

        # Rate-History: Real hat EINE Zeile, Demo-Historie nicht vererbt.
        real_hist = await db.interest_rate_history.count_documents({"offer_id": str(real["_id"])})
        demo_hist = await db.interest_rate_history.count_documents({"offer_id": str(demo_res.inserted_id)})
        assert real_hist == 1, f"Real muss initiale History-Zeile haben, hat {real_hist}"
        assert demo_hist == 0, f"Demo hätte keine History haben dürfen (Fixture), hat {demo_hist}"

    finally:
        # Cleanup — komplett, keine Fixture-Rückstände.
        await db.savings_offers.delete_many({"bank_slug": fixture_bank_slug})
        await db.banks.delete_many({"slug": fixture_bank_slug})
        await db.interest_rate_history.delete_many({
            "offer_id": {"$in": [str(demo_res.inserted_id)]}
        })
        # neue Real-Historie via bank_slug im product_key aufräumen
        await db.interest_rate_history.delete_many({
            "offer_key": {"$regex": f"^{fixture_bank_slug}"}
        })
        client.close()


# ============================================================================
# 4) no_min / no_max Semantik
# ============================================================================
def test_no_min_no_max_marker_distinguishes_unknown_from_no_limit():
    from routes.public_reads import _serialize_offer
    unknown = {"_id": "1", "min_amount": None, "max_amount": None, "conditions": {}}
    explicit = {"_id": "2", "min_amount": None, "max_amount": None,
                "conditions": {"no_min_amount": True, "no_max_amount": True}}
    su = _serialize_offer(unknown, None, None)
    se = _serialize_offer(explicit, None, None)
    assert su["min_amount"] is None and su["max_amount"] is None
    assert su["no_min_amount"] is False and su["no_max_amount"] is False
    assert se["min_amount"] is None and se["max_amount"] is None
    assert se["no_min_amount"] is True and se["no_max_amount"] is True


# ============================================================================
# 5) Incomplete calculations dürfen Sort nicht als 0 € einordnen
# ============================================================================
def test_incomplete_yield_sort_stability():
    """Bei calculation_complete=False muss gross_return_eur=None sein — sonst
    würde eine expected_yield-Sortierung fälschlicherweise 0 € als Ergebnis
    einordnen und Promo-Angebote nach unten drücken."""
    offer = {"product_type":"tagesgeld","interest_rate":3.8,"interest_rate_type":"promo",
             "promo_rate":3.8,"promo_duration_months":5,"standard_rate_after_promo":None}
    r = compute_yield(offer, 10000, horizon_months=12)
    assert r["gross_return_eur"] is None
    # partial_gross_return_eur bleibt einsehbar für UI-Anzeige
    assert r["partial_gross_return_eur"] is not None
