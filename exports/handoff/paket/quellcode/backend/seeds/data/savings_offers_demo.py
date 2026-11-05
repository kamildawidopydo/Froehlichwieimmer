"""Demo savings-offer generator — Session 93.

Erzeugt für jede Bank deterministische Demo-Angebote:

    * 1 × Tagesgeld  (Aktionszins + Standard danach)
    * 3 × Festgeld    (12 / 24 / 36 Monate — Struktur unterstützt beliebige
                       Laufzeiten, siehe FIXED_TERMS)

Wichtig:
    * Zinsen werden pro Bank deterministisch (Seed = bank_slug) generiert, damit
      dasselbe Ergebnis bei jedem Seed-Lauf entsteht — trotzdem klar als
      Demo-Daten (`is_demo=True`, `data_source="demo_seed"`, `verified_at=None`).
    * Ranges bewusst realitätsnah, damit Frontend-Filter/Slider sinnvoll wirken,
      aber KEINE realen Marktzinsen darstellen.
"""
from __future__ import annotations
import hashlib
import random
from datetime import datetime, timezone
from typing import List, Dict, Any


FIXED_TERMS = [12, 24, 36]

# Zins-Ranges (Demo, keine Marktannahme):
TAGESGELD_PROMO_RANGE = (2.20, 3.80)      # 1. Halbjahr Aktionszins
TAGESGELD_STANDARD_RANGE = (0.80, 1.90)   # danach
FESTGELD_RANGE = {
    12: (1.80, 3.40),
    24: (1.90, 3.35),
    36: (1.95, 3.20),
}
TAGESGELD_MIN_AMOUNT_CHOICES = [1, 500, 1000, 2500]
FESTGELD_MIN_AMOUNT_CHOICES = [500, 1000, 2500, 5000]
INTEREST_FREQUENCY_CHOICES = ["monthly", "quarterly", "yearly", "at_maturity"]


def _rng(bank_slug: str) -> random.Random:
    seed = int(hashlib.sha256(bank_slug.encode("utf-8")).hexdigest()[:8], 16)
    return random.Random(seed)


def _round_rate(v: float) -> float:
    return round(v, 2)


def build_offers_for_bank(bank: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Erzeugt die Standard-Demo-Angebote (1× Tagesgeld + 3× Festgeld) für eine Bank.

    Rückgabe: Liste von Dokumenten, die 1:1 in `savings_offers` gespeichert werden.
    """
    rng = _rng(bank["slug"])
    country_cc = bank["country_code"]
    dgs_country = country_cc  # DGS-Land = Bank-Sitz (Ausnahmen später in Admin-UI)
    offers: List[Dict[str, Any]] = []

    # ---------------- Tagesgeld ----------------------------------------------
    promo = _round_rate(rng.uniform(*TAGESGELD_PROMO_RANGE))
    standard = _round_rate(rng.uniform(*TAGESGELD_STANDARD_RANGE))
    promo_months = rng.choice([3, 4, 6, 6, 6, 12])
    min_amt = rng.choice(TAGESGELD_MIN_AMOUNT_CHOICES)
    freq = rng.choice(["monthly", "quarterly", "yearly"])
    offers.append({
        "bank_slug": bank["slug"],
        "product_key": f'{bank["slug"]}__tagesgeld',
        "product_type": "tagesgeld",
        "product_name": f'{bank["name"]} Tagesgeld',
        "interest_rate": promo,
        "interest_rate_type": "promo",
        "promo_rate": promo,
        "promo_duration_months": promo_months,
        "standard_rate_after_promo": standard,
        "term_months": None,
        "min_amount": min_amt,
        "max_amount": rng.choice([100000, 250000, 500000, 1000000]),
        "currency": "EUR",
        "new_customers_only": True,
        "existing_customers_offer": rng.random() < 0.35,
        "interest_frequency": freq,
        "online_account_opening": True,
        "available_for_de_customers": True,
        "country": country_cc,
        "deposit_guarantee_country": dgs_country,
        "deposit_guarantee_limit": 100000,
        "affiliate_url": None,
        "conditions": None,
        "welcome_bonus": None,
        "notes": "Demo-Kondition · nicht als Live-Zinssatz interpretieren.",
        "source_name": "demo_seed",
        "source_url": bank.get("website_url"),
        "source_timestamp": None,
        "status": "active",
        "is_active": True,
        "is_demo": True,
        "data_source": "demo_seed",
        "verified_at": None,
    })

    # ---------------- Festgeld -----------------------------------------------
    for term in FIXED_TERMS:
        lo, hi = FESTGELD_RANGE[term]
        rate = _round_rate(rng.uniform(lo, hi))
        min_amt = rng.choice(FESTGELD_MIN_AMOUNT_CHOICES)
        freq = rng.choice(["yearly", "at_maturity", "quarterly"])
        offers.append({
            "bank_slug": bank["slug"],
            "product_key": f'{bank["slug"]}__festgeld',
            "product_type": "festgeld",
            "product_name": f'{bank["name"]} Festgeld {term} Monate',
            "interest_rate": rate,
            "interest_rate_type": "fixed",
            "promo_rate": None,
            "promo_duration_months": None,
            "standard_rate_after_promo": None,
            "term_months": term,
            "min_amount": min_amt,
            "max_amount": rng.choice([100000, 250000, 500000]),
            "currency": "EUR",
            "new_customers_only": rng.random() < 0.4,
            "existing_customers_offer": True,
            "interest_frequency": freq,
            "online_account_opening": True,
            "available_for_de_customers": True,
            "country": country_cc,
            "deposit_guarantee_country": dgs_country,
            "deposit_guarantee_limit": 100000,
            "affiliate_url": None,
            "conditions": None,
            "welcome_bonus": None,
            "notes": "Demo-Kondition · nicht als Live-Zinssatz interpretieren.",
            "source_name": "demo_seed",
            "source_url": bank.get("website_url"),
            "source_timestamp": None,
            "status": "active",
            "is_active": True,
            "is_demo": True,
            "data_source": "demo_seed",
            "verified_at": None,
        })

    return offers


def build_all_offers(banks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for b in banks:
        out.extend(build_offers_for_bank(b))
    return out
