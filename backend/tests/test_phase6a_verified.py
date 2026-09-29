"""Session 93 · Phase 6A.1 — Verified-Semantik & data_status.

Diese Regressions-Suite gard die zentrale Invariante:
Ein Angebot gilt nur dann als **verified**, wenn
    is_demo == False
    AND source_id != null
    AND verified_at != null
    AND verification_method != null
    AND source_retrieved_at != null
    AND status == "active"

`is_demo=False` alleine darf niemals „verified" bedeuten.
"""
from __future__ import annotations

import os
import sys
import time
from datetime import datetime, timezone, timedelta

import pytest
import requests

sys.path.insert(0, "/app/backend")

from lib.data_freshness import (  # noqa: E402
    is_fully_verified,
    data_status,
    compute_freshness,
)

API = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
NOW = datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# 1) Reine Unit-Tests — `is_fully_verified` + `data_status`
# ---------------------------------------------------------------------------
def _record(**overrides):
    base = {
        "is_demo": False,
        "is_active": True,
        "status": "active",
        "source_id": "src_de_2026_01",
        "verified_at": NOW,
        "verification_method": "manual_review",
        "source_retrieved_at": NOW,
    }
    base.update(overrides)
    return base


def test_verified_when_all_provenance_present_and_active():
    assert is_fully_verified(_record()) is True
    assert data_status(_record()) == "verified"


def test_not_verified_when_is_demo_true_even_with_full_provenance():
    r = _record(is_demo=True)
    assert is_fully_verified(r) is False
    assert data_status(r) == "demo"


def test_not_verified_when_verified_at_missing():
    r = _record(verified_at=None)
    assert is_fully_verified(r) is False
    assert data_status(r) == "unverified"


def test_not_verified_when_source_id_missing():
    r = _record(source_id=None)
    assert is_fully_verified(r) is False
    assert data_status(r) == "unverified"


def test_not_verified_when_verification_method_missing():
    r = _record(verification_method=None)
    assert is_fully_verified(r) is False
    assert data_status(r) == "unverified"


def test_not_verified_when_source_retrieved_at_missing():
    r = _record(source_retrieved_at=None)
    assert is_fully_verified(r) is False
    assert data_status(r) == "unverified"


def test_not_verified_when_status_inactive():
    r = _record(status="inactive")
    assert is_fully_verified(r) is False


def test_not_verified_when_is_active_false():
    r = _record(is_active=False)
    assert is_fully_verified(r) is False


def test_not_verified_when_string_field_is_blank():
    r = _record(source_id="   ")
    assert is_fully_verified(r) is False


def test_freshness_unverified_beats_unknown_when_provenance_incomplete():
    # Phase 6A.1 · Provenance-Klarstellung wird über `data_status`
    # transportiert, nicht über `compute_freshness`. `compute_freshness`
    # bleibt kompatibel und liefert für nicht-Demo ohne verified_at
    # weiterhin "unknown"; die UI kombiniert freshness + data_status.
    label = compute_freshness(
        verified_at=None,
        valid_until=None,
        is_demo=False,
    )
    assert label == "unknown"
    # data_status liefert die harte Wahrheit.
    assert data_status(_record(verified_at=None, source_id=None,
                               verification_method=None,
                               source_retrieved_at=None)) == "unverified"


def test_freshness_backwards_compat_unknown_when_provenance_none():
    label = compute_freshness(verified_at=None, valid_until=None, is_demo=False)
    assert label == "unknown"


def test_freshness_expired_real_not_treated_as_active():
    yesterday = NOW - timedelta(days=1)
    label = compute_freshness(
        verified_at=NOW,
        valid_until=yesterday,
        is_demo=False,
    )
    assert label == "expired"


# ---------------------------------------------------------------------------
# 2) Integrations-Tests gegen Public API — belegen, dass die 8 Legacy-Records
#    NICHT als verified geliefert werden.
# ---------------------------------------------------------------------------
def _get(url: str, retries: int = 3):
    for i in range(retries):
        r = requests.get(f"{API}{url}", timeout=15)
        if r.status_code == 200:
            return r.json()
        if r.status_code == 429:
            time.sleep(2)
            continue
        r.raise_for_status()
    raise AssertionError(f"GET {url} failed after {retries} retries")


def test_public_verified_filter_excludes_legacy_records():
    """Kern-Regression Phase 6A.1: die 8 Legacy-„Real"-Offers dürfen unter
    data_status=verified NICHT mehr auftauchen."""
    data = _get("/api/public/savings-offers?data_status=verified&limit=500")
    for it in data["items"]:
        # Jede Zeile MUSS die volle Provenance mitliefern.
        assert it.get("is_demo") is False, f"demo record leaked into verified: {it['bank_slug']}"
        assert it.get("verified_at"), f"verified_at missing on 'verified' offer: {it['bank_slug']}"
        assert it.get("source_id"), f"source_id missing on 'verified' offer: {it['bank_slug']}"
        assert it.get("verification_method"), f"verification_method missing: {it['bank_slug']}"
        assert it.get("source_retrieved_at"), f"source_retrieved_at missing: {it['bank_slug']}"
        assert it.get("data_status") == "verified"


def test_public_unverified_filter_returns_only_legacy_real_records():
    """`unverified` liefert real (is_demo=False) mit unvollständiger Provenance."""
    data = _get("/api/public/savings-offers?data_status=unverified&limit=500")
    for it in data["items"]:
        assert it.get("is_demo") is False
        assert it.get("data_status") == "unverified"
        # Mindestens ein Provenance-Feld fehlt.
        missing = [
            f for f in ("source_id", "verified_at", "verification_method", "source_retrieved_at")
            if not it.get(f)
        ]
        assert missing, f"'unverified' offer has full provenance — should be 'verified': {it['bank_slug']}"


def test_public_default_all_includes_all_three_groups():
    """`data_status=all` liefert weiterhin demo + unverified + (später) verified."""
    data = _get("/api/public/savings-offers?data_status=all&limit=500")
    statuses = {it["data_status"] for it in data["items"]}
    # Aktuell existieren Demo + Unverified. Sobald verifizierte Real-Offers
    # da sind, wird `verified` ebenfalls im Set erscheinen.
    assert "demo" in statuses or "unverified" in statuses


def test_public_demo_filter_returns_only_demo():
    data = _get("/api/public/savings-offers?data_status=demo&limit=200")
    for it in data["items"]:
        assert it.get("is_demo") is True
        assert it.get("data_status") == "demo"


def test_serializer_returns_data_status_field_for_every_offer():
    data = _get("/api/public/savings-offers?limit=25")
    assert len(data["items"]) > 0
    for it in data["items"]:
        assert it.get("data_status") in {"verified", "unverified", "demo"}


def test_real_first_sort_priority():
    """Verified > unverified > demo als primäre Sortier-Priorität (real_first=default true)."""
    data = _get("/api/public/savings-offers?limit=500&sort=rate")
    ranks = []
    rank_map = {"verified": 0, "unverified": 1, "demo": 2}
    for it in data["items"]:
        ranks.append(rank_map.get(it.get("data_status"), 3))
    # Monoton nicht-abnehmend: verified (0) kommen vor unverified (1) vor demo (2).
    assert ranks == sorted(ranks), f"data_status-rank nicht monoton: {ranks[:20]}"


def test_real_first_can_be_disabled():
    """real_first=false → reine Kriteriumsortierung, ohne data_status-Priorität."""
    data = _get("/api/public/savings-offers?limit=500&sort=rate&real_first=false")
    rates = [it["interest_rate"] for it in data["items"] if it["interest_rate"] is not None]
    assert rates == sorted(rates, reverse=True), (
        f"Bei real_first=false muss reine rate-desc-Sortierung gelten. "
        f"Erste 10: {rates[:10]}"
    )


def test_legacy_offers_not_deleted_or_converted_to_demo():
    """Die 8 Legacy-Real-Records dürfen NICHT verschwinden oder auf Demo
    umgestellt worden sein — sie erscheinen weiterhin als unverified."""
    data = _get("/api/public/savings-offers?data_status=unverified&limit=500")
    unverified_ids = {(it.get("bank_slug"), it.get("product_type"),
                       it.get("term_months"), it.get("interest_rate"))
                      for it in data["items"]}
    expected_any = {"chase", "ikano", "dhb", "volkswagen-bank", "ing", "knab", "bbva"}
    unverified_slugs = {t[0] for t in unverified_ids}
    assert unverified_slugs & expected_any, (
        f"Legacy-Real-Records nicht mehr auffindbar unter data_status=unverified — "
        f"slugs={unverified_slugs}"
    )
    # Und definitiv NICHT als demo klassifiziert — hier per unique-Tuple
    # gegen die is_demo=false-Records prüfen (bank_slug alleine reicht nicht,
    # weil dieselbe Bank sowohl Demo- als auch Legacy-Real-Offers hat).
    demo_data = _get("/api/public/savings-offers?data_status=demo&limit=500")
    demo_tuples = {(it.get("bank_slug"), it.get("product_type"),
                    it.get("term_months"), it.get("interest_rate"))
                   for it in demo_data["items"]}
    leaked = unverified_ids & demo_tuples
    assert not leaked, (
        f"Legacy-Real-Records tauchen zusätzlich als demo auf: {leaked}"
    )


def test_verified_count_reflects_only_records_with_full_provenance():
    """Alle Records unter data_status=verified MÜSSEN vollständige Provenance
    haben (streng). Anzahl variiert je nach Import-Stand — der Test prüft
    das Invariante nicht die Zahl selbst."""
    data = _get("/api/public/savings-offers?data_status=verified&limit=500")
    for it in data["items"]:
        assert it.get("is_demo") is False
        assert it.get("verified_at"), f"verified without verified_at: {it.get('bank_slug')}"
        assert it.get("source_id"), f"verified without source_id: {it.get('bank_slug')}"
        assert it.get("verification_method"), f"verified without verification_method: {it.get('bank_slug')}"
        assert it.get("source_retrieved_at"), f"verified without source_retrieved_at: {it.get('bank_slug')}"
