"""Session 93 · Regression-Tests für die Savings-Comparison-Plattform.

Diese Tests sprechen die öffentliche API über REACT_APP_BACKEND_URL an — also
denselben Ingress-Pfad, den das Frontend nutzt. Damit werden Routing, CORS und
Serialisierung mitgetestet.

Ausführen:
    cd /app/backend && python3 -m pytest tests/test_savings_platform.py -q
"""
from __future__ import annotations
import os
import pytest
import requests
from dotenv import dotenv_values

# .env aus /app/frontend/.env laden (REACT_APP_BACKEND_URL).
_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_FE_ENV = dotenv_values(os.path.join(_ROOT, "frontend", ".env"))
BASE = _FE_ENV.get("REACT_APP_BACKEND_URL")

pytestmark = pytest.mark.skipif(not BASE, reason="REACT_APP_BACKEND_URL missing")


def _get(path: str):
    r = requests.get(f"{BASE}{path}", timeout=15)
    r.raise_for_status()
    return r.json()


def test_countries_endpoint_returns_seeded_15() -> None:
    d = _get("/api/public/countries")
    assert d["count"] == 15
    codes = {c["code"] for c in d["items"]}
    for expected in {"DE", "AT", "NL", "BE", "FR", "ES", "IT", "PT", "IE", "LU", "EE", "LV", "LT", "FI", "SE"}:
        assert expected in codes, f"missing country: {expected}"


def test_dgs_endpoint_returns_seeded_15() -> None:
    d = _get("/api/public/deposit-guarantee-schemes")
    assert d["count"] == 15
    assert all(item.get("coverage_limit_eur") == 100000 for item in d["items"])


def test_partner_banks_covers_all_countries() -> None:
    d = _get("/api/public/partner-banks")
    # Mindestens 60 Banken erwartet.
    assert d["count"] >= 60
    ccs = {b.get("country_code") for b in d["items"] if b.get("country_code")}
    for expected in {"DE", "AT", "NL", "ES", "FR", "IT", "PT", "IE", "BE", "LU", "EE", "LV", "LT", "FI", "SE"}:
        assert expected in ccs


def test_savings_offers_has_demo_flag_and_bank_join() -> None:
    d = _get("/api/public/savings-offers")
    assert d["count"] > 200
    assert d["has_demo"] is True
    assert d["demo_count"] > 0
    # jedes Item muss die Bank-Referenz enthalten (Bank-Join)
    without_bank = [it for it in d["items"] if not it.get("banks")]
    assert not without_bank, f"Offers ohne Bank-Verknüpfung: {len(without_bank)}"


def test_savings_offers_has_tagesgeld_and_festgeld() -> None:
    d = _get("/api/public/savings-offers")
    types = {it["product_type"] for it in d["items"]}
    assert "tagesgeld" in types
    assert "festgeld" in types


def test_savings_offers_new_fields_present() -> None:
    d = _get("/api/public/savings-offers")
    sample = d["items"][0]
    for key in (
        "is_demo", "data_source", "status", "verified_at",
        "country_code", "affiliate_url", "conditions",
        "online_account_opening", "available_for_de_customers",
        "existing_customers_offer", "product_key",
    ):
        assert key in sample, f"missing key: {key}"


def test_no_invented_ratings_in_demo_banks() -> None:
    """Regressions-Guard: Demo-Banken dürfen NIEMALS erfundene Ratings enthalten."""
    d = _get("/api/public/partner-banks")
    for b in d["items"]:
        if b.get("is_demo"):
            assert b.get("credit_rating") is None, (
                f"Demo-Bank {b.get('slug')} hat unerlaubtes Rating gesetzt"
            )


def test_no_verified_at_in_demo_offers() -> None:
    """Regressions-Guard: Demo-Angebote dürfen kein verified_at haben."""
    d = _get("/api/public/savings-offers")
    for it in d["items"]:
        if it.get("is_demo"):
            assert it.get("verified_at") is None, (
                f"Demo-Offer {it.get('id')} hat unerlaubtes verified_at gesetzt"
            )
