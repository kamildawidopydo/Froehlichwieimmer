"""Session 93 · Phase 3 — Validation Engine für importierte Konditionsdaten.

Reine Business-Logik ohne DB-Zugriff. Validiert eine Reihe von Regeln, die
verhindern sollen, dass unplausible / gefährliche Werte in `savings_offers`
landen.
"""
from __future__ import annotations
import os
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# Konfigurierbare Grenzen.
# ---------------------------------------------------------------------------
RATE_MIN = float(os.environ.get("SAVINGS_RATE_MIN", "0.0"))
RATE_MAX = float(os.environ.get("SAVINGS_RATE_MAX", "8.0"))
TERM_MIN_MONTHS = int(os.environ.get("SAVINGS_TERM_MIN", "1"))
TERM_MAX_MONTHS = int(os.environ.get("SAVINGS_TERM_MAX", "120"))


class ValidationResult(dict):
    """dict-basiert für einfaches JSON-Serialisieren."""

    @classmethod
    def ok(cls) -> "ValidationResult":
        return cls(valid=True, errors=[], warnings=[])

    @classmethod
    def failed(cls, errors: List[str], warnings: Optional[List[str]] = None) -> "ValidationResult":
        return cls(valid=False, errors=list(errors), warnings=list(warnings or []))


def _num(v):
    try:
        return float(v) if v is not None else None
    except (TypeError, ValueError):
        return None


def validate_offer_record(record: Dict[str, Any], known_country_codes: set, known_dgs_codes: set) -> ValidationResult:
    """Validiert einen einzelnen Import-Datensatz.

    Args:
        record: Rohdaten (unnormalisiert).
        known_country_codes: erlaubte ISO-2-Codes (aus `countries`-Collection).
        known_dgs_codes: erlaubte DGS-Codes (ISO-2 der Länder).
    """
    errors: List[str] = []
    warnings: List[str] = []

    # Pflichtfelder --------------------------------------------------------
    bank_slug = (record.get("bank_slug") or "").strip()
    product_type = (record.get("product_type") or "").strip().lower()
    if not bank_slug:
        errors.append("bank_slug missing")
    if product_type not in {"tagesgeld", "festgeld", "flexgeld"}:
        errors.append(f"invalid product_type: {product_type!r}")

    # Rate -----------------------------------------------------------------
    rate = _num(record.get("interest_rate"))
    if rate is None:
        errors.append("interest_rate missing")
    else:
        if not (RATE_MIN <= rate <= RATE_MAX):
            errors.append(f"rate {rate} outside plausible range [{RATE_MIN}, {RATE_MAX}]")

    # Deposits -------------------------------------------------------------
    min_amt = _num(record.get("min_amount"))
    max_amt = _num(record.get("max_amount"))
    if min_amt is not None and min_amt < 0:
        errors.append("min_amount must be >= 0")
    if max_amt is not None and min_amt is not None and max_amt < min_amt:
        errors.append("max_amount < min_amount")

    # Laufzeit -------------------------------------------------------------
    term = record.get("term_months")
    if product_type == "festgeld":
        if not isinstance(term, int) or term <= 0:
            errors.append("festgeld requires positive term_months")
        elif not (TERM_MIN_MONTHS <= term <= TERM_MAX_MONTHS):
            errors.append(f"term_months {term} outside range [{TERM_MIN_MONTHS}, {TERM_MAX_MONTHS}]")
    elif product_type == "tagesgeld":
        if term not in (None, 0):
            errors.append("tagesgeld must not have a binding term_months")

    # Promo-Konsistenz -----------------------------------------------------
    rate_type = (record.get("interest_rate_type") or "standard").lower()
    if rate_type == "promo":
        promo_rate = _num(record.get("promo_rate"))
        promo_months = record.get("promo_duration_months")
        std = _num(record.get("standard_rate_after_promo"))
        if promo_rate is None or not isinstance(promo_months, int) or promo_months <= 0:
            errors.append("promo requires promo_rate + promo_duration_months (int > 0)")
        if std is None:
            warnings.append("promo without standard_rate_after_promo → Folgezins unbekannt")

    # Länder / DGS ---------------------------------------------------------
    country = record.get("country")
    if country and country not in known_country_codes:
        errors.append(f"unknown country_code: {country!r}")
    dgs = record.get("deposit_guarantee_country")
    if dgs and dgs not in known_dgs_codes:
        warnings.append(f"unknown deposit_guarantee_country: {dgs!r}")

    if errors:
        return ValidationResult.failed(errors, warnings)
    return ValidationResult(valid=True, errors=[], warnings=warnings)


PROMOTION_RANGE_HINT = {
    "rate_min": RATE_MIN,
    "rate_max": RATE_MAX,
    "term_min_months": TERM_MIN_MONTHS,
    "term_max_months": TERM_MAX_MONTHS,
}
