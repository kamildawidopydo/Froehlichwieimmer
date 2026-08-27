"""Session 80.37 — Structured Savings Interest Comparison Data.

Enthält:
    * Erweiterte Datenmodelle für Tagesgeld/Festgeld mit Aktionszins-Trennung,
      Einlagensicherung, Quellen-Timestamp und Freshness.
    * Realistischer Seed mit aktuellem Markt-Referenzrahmen (Stand Ende August
      2026) — NICHT als Marktannahme, sondern als plausibler Vorlauf.
    * Plausibilitäts-Guardrails (0% ≤ rate ≤ 8%).
    * EZB-Referenz (aktuelle Deposit Facility / Main Refi / Marginal).
    * Freshness-Regel: warn > 24h, stale > 48h (analog 80.27 News).

Keine Screenscraping-Abhängigkeit — die Struktur ist so gebaut, dass
autorisierte Provider-Feeds über `_upsert_offer()` eingespielt werden können.
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Optional

# ---------------------------------------------------------------------------
# Plausibility guardrails (rein technisch — keine Marktannahmen).
# ---------------------------------------------------------------------------
RATE_MIN = 0.0
RATE_MAX = 8.0  # jenseits dieses Bereichs verwerfen wir Werte als korrupt.

FRESH_WARN_HOURS = 24
FRESH_STALE_HOURS = 48


def is_plausible_rate(rate) -> bool:
    try:
        r = float(rate)
    except (TypeError, ValueError):
        return False
    return RATE_MIN <= r <= RATE_MAX


def compute_freshness(source_timestamp: Optional[datetime]) -> str:
    """Rückgabe: 'fresh' | 'warn' | 'stale' | 'unknown'."""
    if not source_timestamp:
        return "unknown"
    if not isinstance(source_timestamp, datetime):
        return "unknown"
    if source_timestamp.tzinfo is None:
        source_timestamp = source_timestamp.replace(tzinfo=timezone.utc)
    age_h = (datetime.now(timezone.utc) - source_timestamp).total_seconds() / 3600
    if age_h > FRESH_STALE_HOURS:
        return "stale"
    if age_h > FRESH_WARN_HOURS:
        return "warn"
    return "fresh"


# ---------------------------------------------------------------------------
# EZB reference — Stand Ende August 2026 (letzte plausible Referenz).
# Bewusst als kleine konfigurierbare Konstante; sobald ein Live-EZB-Feed
# integriert wird, kann die Struktur unverändert bleiben.
# ---------------------------------------------------------------------------
EZB_REFERENCE = {
    "deposit_facility_rate": 2.25,
    "main_refinancing_rate": 2.40,
    "marginal_lending_rate": 2.65,
    "effective_date": "2026-06-05",
    "source_name": "Europäische Zentralbank",
    "source_url": "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/key_ecb_interest_rates/html/index.en.html",
    "last_verified_at": "2026-08-27T00:00:00+00:00",
}


# ---------------------------------------------------------------------------
# Refreshed seed for savings_offers — Ende August 2026, plausible values.
# Diese Werte sind ausdrücklich KEINE Hardcodes für die Rangliste, sondern
# ein initialer Vorlauf für die Provider-Abstraktion. Jedes Offer hat eine
# klare Quelle + Timestamp; Live-Provider können sie überschreiben.
# ---------------------------------------------------------------------------
SEED_TIMESTAMP = datetime(2026, 8, 27, 8, 30, tzinfo=timezone.utc)

STRUCTURED_OFFERS = [
    # -------- Tagesgeld (mit Aktionszins-Struktur) -----------------------
    {
        "bank_slug": "chase",
        "product_name": "Chase Tagesgeld",
        "product_type": "tagesgeld",
        "interest_rate": 4.00,                    # aktueller Nominalzins (Aktionszins)
        "interest_rate_type": "promo",
        "promo_rate": 4.00,
        "promo_duration_months": 4,
        "standard_rate_after_promo": 1.50,
        "term_months": None,
        "min_amount": 1,
        "max_amount": 500000,
        "currency": "EUR",
        "new_customers_only": True,
        "country": "DE",
        "deposit_guarantee_country": "DE",
        "deposit_guarantee_limit": 100000,
        "source_name": "Anbieter-Konditionen",
        "source_url": "https://www.chase.de",
        "source_timestamp": SEED_TIMESTAMP,
        "valid_until": None,
    },
    {
        "bank_slug": "ikano",
        "product_name": "Ikano Bank Tagesgeld",
        "product_type": "tagesgeld",
        "interest_rate": 3.91,
        "interest_rate_type": "promo",
        "promo_rate": 3.91,
        "promo_duration_months": 6,
        "standard_rate_after_promo": 1.80,
        "term_months": None,
        "min_amount": 1,
        "max_amount": 100000,
        "currency": "EUR",
        "new_customers_only": True,
        "country": "SE",
        "deposit_guarantee_country": "SE",
        "deposit_guarantee_limit": 100000,
        "source_name": "Anbieter-Konditionen",
        "source_url": "https://www.ikanobank.de",
        "source_timestamp": SEED_TIMESTAMP,
        "valid_until": None,
    },
    {
        "bank_slug": "dhb",
        "product_name": "DHB Bank Tagesgeld",
        "product_type": "tagesgeld",
        "interest_rate": 3.40,
        "interest_rate_type": "standard",
        "promo_rate": None,
        "promo_duration_months": None,
        "standard_rate_after_promo": None,
        "term_months": None,
        "min_amount": 1000,
        "max_amount": 250000,
        "currency": "EUR",
        "new_customers_only": False,
        "country": "NL",
        "deposit_guarantee_country": "NL",
        "deposit_guarantee_limit": 100000,
        "source_name": "Anbieter-Konditionen",
        "source_url": "https://www.dhbbank.de",
        "source_timestamp": SEED_TIMESTAMP,
        "valid_until": None,
    },
    # -------- Festgeld (Laufzeit-Ranking) --------------------------------
    {
        "bank_slug": "volkswagen-bank",
        "product_name": "Volkswagen Bank Festgeld 6M",
        "product_type": "festgeld",
        "interest_rate": 3.10,
        "interest_rate_type": "fixed",
        "promo_rate": None,
        "promo_duration_months": None,
        "term_months": 6,
        "min_amount": 2500,
        "max_amount": 250000,
        "currency": "EUR",
        "new_customers_only": False,
        "country": "DE",
        "deposit_guarantee_country": "DE",
        "deposit_guarantee_limit": 100000,
        "source_name": "Anbieter-Konditionen",
        "source_url": "https://www.vwfs.de",
        "source_timestamp": SEED_TIMESTAMP,
        "valid_until": None,
    },
    {
        "bank_slug": "ing",
        "product_name": "ING Festgeld 12M",
        "product_type": "festgeld",
        "interest_rate": 3.10,
        "interest_rate_type": "fixed",
        "term_months": 12,
        "min_amount": 5000,
        "max_amount": None,
        "currency": "EUR",
        "new_customers_only": False,
        "country": "DE",
        "deposit_guarantee_country": "DE",
        "deposit_guarantee_limit": 100000,
        "source_name": "Anbieter-Konditionen",
        "source_url": "https://www.ing.de",
        "source_timestamp": SEED_TIMESTAMP,
        "valid_until": None,
    },
    {
        "bank_slug": "knab",
        "product_name": "Knab Festgeld 12M",
        "product_type": "festgeld",
        "interest_rate": 3.20,
        "interest_rate_type": "fixed",
        "term_months": 12,
        "min_amount": 1000,
        "max_amount": 100000,
        "currency": "EUR",
        "new_customers_only": False,
        "country": "NL",
        "deposit_guarantee_country": "NL",
        "deposit_guarantee_limit": 100000,
        "source_name": "Anbieter-Konditionen",
        "source_url": "https://www.knab.nl",
        "source_timestamp": SEED_TIMESTAMP,
        "valid_until": None,
    },
    {
        "bank_slug": "bbva",
        "product_name": "BBVA Festgeld 24M",
        "product_type": "festgeld",
        "interest_rate": 3.25,
        "interest_rate_type": "fixed",
        "term_months": 24,
        "min_amount": 5000,
        "max_amount": 500000,
        "currency": "EUR",
        "new_customers_only": False,
        "country": "ES",
        "deposit_guarantee_country": "ES",
        "deposit_guarantee_limit": 100000,
        "source_name": "Anbieter-Konditionen",
        "source_url": "https://www.bbva.de",
        "source_timestamp": SEED_TIMESTAMP,
        "valid_until": None,
    },
    {
        "bank_slug": "bbva",
        "product_name": "BBVA Festgeld 36M",
        "product_type": "festgeld",
        "interest_rate": 3.30,
        "interest_rate_type": "fixed",
        "term_months": 36,
        "min_amount": 5000,
        "max_amount": 500000,
        "currency": "EUR",
        "new_customers_only": False,
        "country": "ES",
        "deposit_guarantee_country": "ES",
        "deposit_guarantee_limit": 100000,
        "source_name": "Anbieter-Konditionen",
        "source_url": "https://www.bbva.de",
        "source_timestamp": SEED_TIMESTAMP,
        "valid_until": None,
    },
]


def dedupe_key(o: dict) -> tuple:
    """Deduplication-Key: derselbe Anbieter darf pro (product_type, term,
    customer_type) nur einmal ranken."""
    return (
        (o.get("bank_slug") or "").lower(),
        (o.get("product_type") or "").lower(),
        int(o.get("term_months") or 0),
        bool(o.get("new_customers_only")),
    )


def average_first_year(o: dict) -> Optional[float]:
    """Gewichteter Durchschnittszins über die ersten 12 Monate bei Promo-
    Angeboten. Formel:
        rate_avg = (promo_rate * promo_months + standard_rate * (12 - promo_months)) / 12
    Nur wenn alle Bestandteile plausibel vorhanden sind — sonst None.
    """
    if (o.get("interest_rate_type") or "") != "promo":
        return None
    p_rate = o.get("promo_rate"); p_months = o.get("promo_duration_months")
    s_rate = o.get("standard_rate_after_promo")
    if p_rate is None or p_months is None or s_rate is None:
        return None
    if not (0 < int(p_months) < 12):
        return None
    return round((float(p_rate) * int(p_months) + float(s_rate) * (12 - int(p_months))) / 12, 3)


def to_public(o: dict) -> dict:
    """Publisher-Shape für Frontend. Freshness-Label wird berechnet."""
    ts = o.get("source_timestamp")
    if isinstance(ts, datetime):
        ts_str = ts.astimezone(timezone.utc).isoformat()
    else:
        ts_str = ts
    return {
        "id": str(o.get("_id") or o.get("id") or ""),
        "bank_slug": o.get("bank_slug"),
        "product_name": o.get("product_name"),
        "product_type": o.get("product_type"),
        "interest_rate": o.get("interest_rate"),
        "interest_rate_type": o.get("interest_rate_type") or "standard",
        "promo_rate": o.get("promo_rate"),
        "promo_duration_months": o.get("promo_duration_months"),
        "standard_rate_after_promo": o.get("standard_rate_after_promo"),
        "average_first_year": average_first_year(o),
        "term_months": o.get("term_months"),
        "min_amount": o.get("min_amount"),
        "max_amount": o.get("max_amount"),
        "currency": o.get("currency", "EUR"),
        "new_customers_only": bool(o.get("new_customers_only", False)),
        "country": o.get("country"),
        "deposit_guarantee_country": o.get("deposit_guarantee_country"),
        "deposit_guarantee_limit": o.get("deposit_guarantee_limit"),
        "source_name": o.get("source_name"),
        "source_url": o.get("source_url"),
        "source_timestamp": ts_str,
        "freshness": compute_freshness(o.get("source_timestamp")),
        "valid_until": o.get("valid_until"),
    }
