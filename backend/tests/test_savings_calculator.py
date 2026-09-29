"""Session 93 · Phase 2 — Unit-Tests für die Calculation Engine."""
from __future__ import annotations

import pytest

from lib.savings_calculator import compute_yield


def test_tagesgeld_simple_annual() -> None:
    offer = {"product_type": "tagesgeld", "interest_rate": 3.0, "interest_rate_type": "standard"}
    r = compute_yield(offer, 10000, 12)
    assert r["gross_return_eur"] == pytest.approx(300.0)
    assert r["effective_rate"] == pytest.approx(3.0)
    assert r["horizon_months"] == 12
    assert len(r["breakdown"]) == 1


def test_tagesgeld_promo_then_standard_full_year() -> None:
    # 4,00 % p.a. für 3 Monate, danach 2,10 % p.a. → 25 000 € Anlage, 12 M Horizont.
    offer = {
        "product_type": "tagesgeld",
        "interest_rate": 4.0,
        "interest_rate_type": "promo",
        "promo_rate": 4.0,
        "promo_duration_months": 3,
        "standard_rate_after_promo": 2.10,
    }
    r = compute_yield(offer, 25000, 12)
    # Erwartet: 25000 * 4% * 3/12 + 25000 * 2.10% * 9/12 = 250 + 393.75 = 643.75
    assert r["gross_return_eur"] == pytest.approx(643.75, abs=0.01)
    assert r["effective_rate"] == pytest.approx(2.575, abs=0.01)
    labels = [b["label"] for b in r["breakdown"]]
    assert labels == ["Aktionszins", "Folgezins"]
    assert any("Folgezins" in n for n in r["notes"])


def test_tagesgeld_promo_shorter_than_horizon_edge() -> None:
    offer = {
        "product_type": "tagesgeld",
        "interest_rate": 3.5,
        "interest_rate_type": "promo",
        "promo_rate": 3.5,
        "promo_duration_months": 6,
        "standard_rate_after_promo": 1.0,
    }
    r = compute_yield(offer, 10000, 6)  # Horizont = Promo-Dauer → keine Folgeperiode
    assert r["gross_return_eur"] == pytest.approx(175.0, abs=0.01)
    assert len(r["breakdown"]) == 1
    assert r["breakdown"][0]["label"] == "Aktionszins"


def test_festgeld_default_horizon_is_term() -> None:
    offer = {"product_type": "festgeld", "interest_rate": 3.0, "interest_rate_type": "fixed", "term_months": 24}
    r = compute_yield(offer, 10000, None)
    # 10000 * 3% * 24/12 = 600
    assert r["gross_return_eur"] == pytest.approx(600.0)
    assert r["horizon_months"] == 24
    assert r["effective_rate"] == pytest.approx(3.0)


def test_festgeld_horizon_greater_than_term_adds_note() -> None:
    offer = {"product_type": "festgeld", "interest_rate": 3.0, "term_months": 12}
    r = compute_yield(offer, 10000, 24)
    # Ertrag nur bis Ende Laufzeit: 10000 * 3% * 12/12 = 300
    assert r["gross_return_eur"] == pytest.approx(300.0)
    assert r["horizon_months"] == 24
    assert any("Laufzeit" in n for n in r["notes"])


def test_zero_amount_returns_none_gross() -> None:
    r = compute_yield({"product_type": "tagesgeld", "interest_rate": 3.0}, 0, 12)
    assert r["gross_return_eur"] is None


def test_missing_rate_is_safe() -> None:
    r = compute_yield({"product_type": "tagesgeld", "interest_rate": None}, 1000, 12)
    assert r["gross_return_eur"] is None


def test_flexible_term_months_supported() -> None:
    # Datenmodell erlaubt beliebige Laufzeiten — 9 Monate darf funktionieren.
    offer = {"product_type": "festgeld", "interest_rate": 2.5, "term_months": 9}
    r = compute_yield(offer, 5000, None)
    # 5000 * 2.5% * 9/12 = 93.75
    assert r["gross_return_eur"] == pytest.approx(93.75, abs=0.01)
    assert r["horizon_months"] == 9
