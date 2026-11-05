"""Session 93 · Phase 3 — Data-Provenance & Import-Domain Models.

Ergänzt das Phase-1/2-Datenmodell um vollständige Herkunfts-Verfolgung,
Bank-Alias-Auflösung, Import-Audit und Offer-Link-Modell. Alle Modelle sind
bewusst additiv — bestehende `banks`, `savings_offers` und Public-API-Response
werden nicht destruktiv verändert.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


SourceType = Literal[
    "official_bank",       # Bank-eigene Konditionen-Seite / PDF
    "official_document",   # Preisverzeichnis, Factsheet
    "partner_feed",        # Partner-API (WeltSparen/Raisin etc.)
    "manual_verified",     # Mitarbeiter hat manuell geprüft
    "api",                 # generische API-Anbindung
    "import",              # CSV/JSON-Import
    "demo_seed",           # Interner Demo-Seed (nur zur Vollständigkeit)
]

DataStatus = Literal["draft", "active", "needs_review", "stale", "expired", "disabled"]
RateType = Literal["standard", "promotional", "bonus", "tier"]
LinkType = Literal["affiliate", "direct", "information"]
ImportStatus = Literal["pending", "running", "success", "partial", "failed"]


# ---------------------------------------------------------------------------
# DataSource — jede echte Kondition wird auf eine DataSource zurückgeführt.
# ---------------------------------------------------------------------------
class DataSource(BaseModel):
    slug: str = Field(..., description="Eindeutig, z. B. 'bank:ing:tagesgeld' oder 'partner:raisin'")
    name: str
    type: SourceType
    source_url: Optional[str] = None
    provider: Optional[str] = None  # z. B. "Raisin GmbH"
    country_code: Optional[str] = None
    update_frequency_hours: Optional[int] = None
    status: DataStatus = "active"
    last_success_at: Optional[datetime] = None
    last_failure_at: Optional[datetime] = None
    last_error: Optional[str] = None
    is_public_source_url: bool = False  # nur `True` → in UI verlinkbar
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# BankAlias — normalisierte Namen zur Duplikaterkennung.
# ---------------------------------------------------------------------------
class BankAlias(BaseModel):
    canonical_slug: str  # zeigt auf `banks.slug`
    alias: str           # z. B. "ING-DiBa"
    normalized: str      # lowercased, entstopfte Version
    external_ids: Optional[dict] = None  # {"bic": "INGDDEFFXXX", "raisin_id": "..."}
    confidence: Literal["exact", "high", "medium", "low"] = "exact"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# OfferLink — CTAs mit Herkunfts-Transparenz.
# ---------------------------------------------------------------------------
class OfferLink(BaseModel):
    offer_id: str
    type: LinkType
    url: str
    provider: Optional[str] = None
    is_affiliate: bool = False
    status: DataStatus = "active"
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    last_checked_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# InterestRateHistory — echte, geschlossene Zeiträume.
# ---------------------------------------------------------------------------
class InterestRateHistoryEntry(BaseModel):
    offer_id: str
    offer_key: Optional[str] = None
    rate_type: RateType = "standard"
    rate: float
    valid_from: datetime
    valid_until: Optional[datetime] = None  # None ⇒ aktuell gültig
    source_id: Optional[str] = None  # slug → data_sources
    source_url: Optional[str] = None
    verified_at: Optional[datetime] = None
    verification_method: Optional[str] = None
    is_demo: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# ImportRun — Audit-Log
# ---------------------------------------------------------------------------
class ImportRun(BaseModel):
    source_slug: str
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    finished_at: Optional[datetime] = None
    status: ImportStatus = "pending"
    records_received: int = 0
    records_valid: int = 0
    records_invalid: int = 0
    records_changed: int = 0
    records_unchanged: int = 0
    records_needs_review: int = 0
    applied_by: Optional[str] = None
    error_summary: Optional[str] = None
    diff_preview: Optional[list] = None  # nur bei Dry-Run gefüllt
