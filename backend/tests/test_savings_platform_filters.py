"""Session 93 · Phase 2 — API-Filter/Sort/Pagination/Facets-Tests."""
from __future__ import annotations
import os
import pytest
import requests
from dotenv import dotenv_values

_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_FE_ENV = dotenv_values(os.path.join(_ROOT, "frontend", ".env"))
BASE = _FE_ENV.get("REACT_APP_BACKEND_URL")

pytestmark = pytest.mark.skipif(not BASE, reason="REACT_APP_BACKEND_URL missing")


def _get(path: str):
    r = requests.get(f"{BASE}{path}", timeout=15)
    r.raise_for_status()
    return r.json()


# --------- Facets ---------------------------------------------------------
def test_facets_endpoint_shape() -> None:
    d = _get("/api/public/savings-offers/facets")
    assert d["total"] > 0
    assert isinstance(d["countries"], list)
    assert isinstance(d["dgs_countries"], list)
    assert isinstance(d["product_types"], list)
    assert isinstance(d["terms_available"], list)
    assert d["rate_range"]["min"] <= d["rate_range"]["max"]


def test_facets_flexible_terms_include_null() -> None:
    d = _get("/api/public/savings-offers/facets")
    terms = [t["term_months"] for t in d["terms_available"]]
    # Tagesgeld → term_months = null darf im Facet erscheinen
    assert None in terms


# --------- Server-side filters -------------------------------------------
def test_filter_product_type_tagesgeld() -> None:
    d = _get("/api/public/savings-offers?product_type=tagesgeld&limit=500")
    assert d["total"] > 0
    assert all(it["product_type"] == "tagesgeld" for it in d["items"])


def test_filter_product_type_festgeld() -> None:
    d = _get("/api/public/savings-offers?product_type=festgeld&limit=500")
    assert d["total"] > 0
    assert all(it["product_type"] == "festgeld" for it in d["items"])


def test_filter_country_single() -> None:
    d = _get("/api/public/savings-offers?countries=DE&limit=500")
    assert d["total"] > 0
    for it in d["items"]:
        assert it["country_code"] == "DE" or it["banks"]["country_code"] == "DE"


def test_filter_country_multi_combined() -> None:
    d = _get("/api/public/savings-offers?countries=DE,AT&limit=500")
    assert d["total"] > 0
    for it in d["items"]:
        assert (it["country_code"] in {"DE", "AT"}) or (
            it["banks"]["country_code"] in {"DE", "AT"}
        )


def test_filter_dgs_country() -> None:
    d = _get("/api/public/savings-offers?dgs_countries=NL&limit=500")
    assert d["total"] > 0
    assert all(it["deposit_guarantee_country"] == "NL" for it in d["items"])


def test_filter_amount_respects_min_max() -> None:
    d = _get("/api/public/savings-offers?amount=100&limit=500")
    # 100 € muss > jeder min_amount und ≤ jeder max_amount sein
    for it in d["items"]:
        mn = it.get("min_amount") or 0
        mx = it.get("max_amount")
        assert 100 >= mn
        if mx is not None:
            assert 100 <= mx


def test_filter_rate_range() -> None:
    d = _get("/api/public/savings-offers?rate_min=3&rate_max=3.5&limit=500")
    for it in d["items"]:
        r = it["interest_rate"]
        assert r is None or (3 <= r <= 3.5)


def test_filter_new_customers_only() -> None:
    d = _get("/api/public/savings-offers?new_customers_only=true&limit=500")
    assert d["total"] > 0
    assert all(it["new_customers_only"] is True for it in d["items"])


def test_filter_combined_yields_intersection() -> None:
    a = _get("/api/public/savings-offers?product_type=festgeld&limit=1000")["total"]
    de = _get("/api/public/savings-offers?product_type=festgeld&countries=DE&limit=1000")["total"]
    assert de < a  # DE-Untermenge


# --------- Sort ----------------------------------------------------------
# Phase 6A.1: Die Public-API sortiert per Default „real-first"
# (verified > unverified > demo, dann Kriterium). Die Legacy-Tests bleiben
# valide mit `real_first=false`, weil sie reine Kriteriumsortierung testen.
def test_sort_rate_desc() -> None:
    d = _get("/api/public/savings-offers?sort=rate&real_first=false&limit=50")
    rates = [it["interest_rate"] for it in d["items"] if it["interest_rate"] is not None]
    assert rates == sorted(rates, reverse=True)


def test_sort_bank_name() -> None:
    d = _get("/api/public/savings-offers?sort=bank_name&real_first=false&limit=50")
    names = [(it["banks"] or {}).get("name") or "" for it in d["items"]]
    assert names == sorted(names, key=lambda s: s.lower())


def test_sort_expected_yield_when_amount_given() -> None:
    d = _get("/api/public/savings-offers?sort=expected_yield&amount=25000&real_first=false&limit=50")
    yields = [
        (it.get("expected_yield") or {}).get("gross_return_eur")
        for it in d["items"]
    ]
    yields_present = [y for y in yields if y is not None]
    assert yields_present == sorted(yields_present, reverse=True)


# --------- Pagination ----------------------------------------------------
def test_pagination_page_size() -> None:
    p1 = _get("/api/public/savings-offers?limit=20&page=1")
    p2 = _get("/api/public/savings-offers?limit=20&page=2")
    assert p1["count"] <= 20
    assert p2["count"] <= 20
    ids1 = {it["id"] for it in p1["items"]}
    ids2 = {it["id"] for it in p2["items"]}
    assert not (ids1 & ids2)  # keine Überlappung


# --------- Expected yield computation ------------------------------------
def test_expected_yield_returned_when_amount() -> None:
    d = _get("/api/public/savings-offers?amount=10000&limit=5")
    for it in d["items"]:
        y = it.get("expected_yield")
        assert y is not None
        assert "gross_return_eur" in y
        assert "breakdown" in y


def test_expected_yield_null_when_no_amount() -> None:
    d = _get("/api/public/savings-offers?limit=5")
    for it in d["items"]:
        assert it.get("expected_yield") is None


# --------- Regression guards from Phase 1 (must stay green) --------------
def test_phase1_facets_and_partner_banks_still_intact() -> None:
    assert _get("/api/public/countries")["count"] == 15
    assert _get("/api/public/deposit-guarantee-schemes")["count"] == 15
    assert _get("/api/public/partner-banks")["count"] >= 60
