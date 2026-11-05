"""Session 93 · Savings Comparison Platform — Datenmodell (Phase 1).

Ziel: skalierbare, europaweite Vergleichs-Plattform (500+ Banken, tausende
Angebote) mit sauberer Trennung zwischen Bank, Produkt und einzelnem
Zinssatz-/Angebots-Datensatz. Bewusst additiv modelliert — alle bestehenden
Felder werden weiterhin vom Public-Endpoint ausgeliefert (Backwards-Compat).

Kern-Entitäten (siehe /app/memory/PRD.md):
    Country                    ISO-Land + deutsche Bezeichnung
    DepositGuaranteeScheme     Einlagensicherung pro Land / Institution
    Bank                       Bank-Stammsatz (referenziert Country + DGS)
    SavingsProduct             Produkt einer Bank (Tagesgeld / Festgeld)
                               – aktuell implizit über (bank_slug, product_type,
                                 product_name); dediziertes Collection kommt in
                                 Phase 2, damit das Datenmodell aber schon
                                 sauber getrennt ist, tragen wir `product_key`
                                 in jedem Offer mit.
    SavingsOffer               Konkrete Zinsperiode / Laufzeit-Variante inkl.
                               Aktions-/Standardzins.
    InterestRateHistory        (Vorbereitet — noch nicht geseedet.)
    Rating                     Optionale, strukturierte Rating-Angaben.

Wichtige Konventionen:
    * `is_demo=True` markiert JEDES Demo-Dokument. Nur Demo-Dokumente werden
      vom Seed überschrieben. Echte Produktions-Datensätze (z. B. spätere
      API-Feeds) sind durch `is_demo=False` geschützt.
    * `data_source`: `"demo_seed"` (Seed), `"manual"` (Admin-UI), `"api:<name>"`
      (Provider-Feed).
    * `status`: `"active" | "inactive" | "draft"` — steuert später Sichtbarkeit
      unabhängig vom `is_active`-Flag (Backwards-Compat).
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums / Typen
# ---------------------------------------------------------------------------
ProductType = Literal["tagesgeld", "festgeld", "flexgeld"]
InterestRateType = Literal["standard", "promo", "fixed"]
InterestFrequency = Literal["monthly", "quarterly", "yearly", "at_maturity"]
Status = Literal["active", "inactive", "draft"]
DataSource = Literal["demo_seed", "manual"] | str  # "api:<provider>" erlaubt


# ---------------------------------------------------------------------------
# Reference: Country
# ---------------------------------------------------------------------------
class Country(BaseModel):
    code: str = Field(..., description="ISO 3166-1 alpha-2")
    name: str = Field(..., description="Anzeige-Name (Englisch, Legacy-Kompat)")
    name_de: str = Field(..., description="Deutsche Bezeichnung")
    region: Optional[str] = None  # z. B. "EU", "EEA"
    is_active: bool = True


# ---------------------------------------------------------------------------
# Reference: Deposit Guarantee Scheme
# ---------------------------------------------------------------------------
class DepositGuaranteeScheme(BaseModel):
    code: str = Field(..., description="Eindeutiger Code, z. B. 'DE_EDB'")
    country_code: str
    name: str
    coverage_limit_eur: int = 100000
    authority: Optional[str] = None
    source_url: Optional[str] = None
    is_demo: bool = False


# ---------------------------------------------------------------------------
# Embedded: Rating
# ---------------------------------------------------------------------------
class Rating(BaseModel):
    """Optionale strukturierte Rating-Angaben. Im Demo-Seed leer."""
    fitch: Optional[str] = None
    moodys: Optional[str] = None
    sp: Optional[str] = None
    verified_at: Optional[datetime] = None
    source_url: Optional[str] = None


# ---------------------------------------------------------------------------
# Bank
# ---------------------------------------------------------------------------
class Bank(BaseModel):
    slug: str
    name: str
    legal_name: Optional[str] = None
    country_code: str  # ISO-2
    country: str  # Legacy-Display (z. B. "Germany") — bleibt kompatibel
    dgs_code: Optional[str] = None
    deposit_guarantee_country_code: Optional[str] = None
    # Legacy-Textfelder — vom Frontend aktuell verwendet.
    deposit_protection: Optional[str] = None
    deposit_protection_amount: Optional[str] = None
    logo_url: Optional[str] = None
    website_url: Optional[str] = None
    founded_year: Optional[int] = None
    regulator_name: Optional[str] = None
    credit_rating: Optional[Rating] = None
    available_for_de_customers: bool = True
    online_account_opening: bool = True
    interest_frequency_default: Optional[InterestFrequency] = None
    description: Optional[str] = None
    # Governance / CRUD-Ready
    status: Status = "active"
    is_active: bool = True
    is_demo: bool = False
    data_source: str = "manual"
    verified_at: Optional[datetime] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# SavingsProduct (implizit über product_key, dediziertes Collection ist
# Phase-2-Migrationsziel — Datenmodell dokumentiert es hier bereits).
# ---------------------------------------------------------------------------
class SavingsProduct(BaseModel):
    product_key: str = Field(
        ...,
        description="Stabile ID: '<bank_slug>__<product_type>' bzw. '<bank_slug>__<product_type>__<product_name_slug>'",
    )
    bank_slug: str
    product_type: ProductType
    product_name: str
    currency: str = "EUR"
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    new_customers_only: bool = False
    existing_customers_offer: bool = True
    interest_frequency: Optional[InterestFrequency] = None
    online_account_opening: bool = True
    available_for_de_customers: bool = True
    affiliate_url: Optional[str] = None
    conditions: Optional[str] = None
    status: Status = "active"
    is_active: bool = True
    is_demo: bool = False
    data_source: str = "manual"
    verified_at: Optional[datetime] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# SavingsOffer — konkrete Zinsperiode
# ---------------------------------------------------------------------------
class SavingsOffer(BaseModel):
    bank_slug: str
    product_key: Optional[str] = None
    product_type: ProductType
    product_name: str
    interest_rate: float
    interest_rate_type: InterestRateType = "standard"
    promo_rate: Optional[float] = None
    promo_duration_months: Optional[int] = None
    standard_rate_after_promo: Optional[float] = None
    term_months: Optional[int] = None  # None ⇒ Tagesgeld (flexibel)
    min_amount: float = 0
    max_amount: Optional[float] = None
    currency: str = "EUR"
    new_customers_only: bool = False
    existing_customers_offer: bool = True
    interest_frequency: Optional[InterestFrequency] = None
    online_account_opening: bool = True
    available_for_de_customers: bool = True
    country: Optional[str] = None  # ISO-2 – konsistent mit Frontend
    deposit_guarantee_country: Optional[str] = None
    deposit_guarantee_limit: Optional[int] = 100000
    affiliate_url: Optional[str] = None
    conditions: Optional[str] = None
    welcome_bonus: Optional[str] = None
    notes: Optional[str] = None
    source_name: Optional[str] = None
    source_url: Optional[str] = None
    source_timestamp: Optional[datetime] = None
    # Governance / CRUD-Ready
    status: Status = "active"
    is_active: bool = True
    is_demo: bool = False
    data_source: str = "manual"
    verified_at: Optional[datetime] = None  # letzte Zinsprüfung
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# InterestRateHistory (Struktur nur — Seed liefert später Snapshots)
# ---------------------------------------------------------------------------
class InterestRateHistory(BaseModel):
    offer_key: str  # z. B. "<bank_slug>__<product_type>__<term_months or 'flex'>"
    rate: float
    effective_from: datetime
    effective_to: Optional[datetime] = None
    source: str = "demo_seed"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# Hilfsfunktionen
# ---------------------------------------------------------------------------
def make_product_key(bank_slug: str, product_type: str, suffix: Optional[str] = None) -> str:
    base = f"{bank_slug}__{product_type}"
    return f"{base}__{suffix}" if suffix else base


def make_offer_key(bank_slug: str, product_type: str, term_months: Optional[int]) -> str:
    term_part = f"{term_months}m" if term_months else "flex"
    return f"{bank_slug}__{product_type}__{term_part}"
