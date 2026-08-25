"""Provider interfaces for automated stock research pipeline (Session 78.7).

Two abstract provider families feed the `stock_research` collection:

* `MarketPriceProvider` — supplies live/recent quotes for one or more tickers.
  Reused for auto-updating `current_price` + `price_updated_at` on published
  rows without touching manually-curated fields (analyst, target, source).

* `AnalystResearchProvider` — supplies verified analyst rows (target price,
  research house, source URL, research date). Any concrete implementation
  MUST guarantee that returned rows have a nachvollziehbare Quelle. No
  auto-generated AI opinions, no scraped data without a canonical URL.

Concrete implementations live in sibling modules. The sync runner in
`routes/stock_research_sync.py` orchestrates them, upserts safely, and never
deletes existing valid data when a provider is temporarily unavailable.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional


# ---------------------------------------------------------------------------
# Market prices
# ---------------------------------------------------------------------------


@dataclass
class MarketPrice:
    ticker: str
    company_name: Optional[str]
    price: float
    currency: str
    previous_close: Optional[float] = None
    price_change_percent: Optional[float] = None
    price_source: str = ""            # human-readable, e.g. "Fröhlich Market Quote"
    price_source_url: Optional[str] = None
    price_updated_at: Optional[datetime] = None
    is_delayed: bool = False


class MarketPriceProvider(ABC):
    """Fetches current (or recent) market prices for a list of tickers.

    Providers MUST NOT invent data. If a ticker is unknown, they omit it from
    the returned list rather than fabricating a price. Callers rely on this
    contract to preserve existing manually-curated data.
    """

    name: str = "base"

    @abstractmethod
    async def fetch(self, tickers: List[str]) -> List[MarketPrice]:  # noqa: D401
        """Return one `MarketPrice` per known ticker (order irrelevant)."""


# ---------------------------------------------------------------------------
# Analyst research
# ---------------------------------------------------------------------------


@dataclass
class AnalystRow:
    ticker: str
    company_name: Optional[str]
    analyst: Optional[str]
    research_house: Optional[str]
    rating: Optional[str]
    target_price: float
    currency: str
    research_date: datetime
    source_name: str
    source_url: Optional[str]
    fetched_at: datetime


class AnalystResearchProvider(ABC):
    """Fetches verifiable analyst research rows for a list of tickers.

    Contract:
      * Every returned row has ``target_price > 0``, a valid ``research_date``
        (not in the future), a non-empty ``source_name`` and (if the provider
        exposes it) a canonical ``source_url``.
      * Providers MUST NOT synthesize data with LLMs, scrape unstructured
        webpages, or return rows without a nachvollziehbare Quelle.
      * If the provider has no data for a ticker, it omits it. Empty lists
        are the honest signal.
    """

    name: str = "base"
    available: bool = False   # concrete impls flip to True when configured

    @abstractmethod
    async def fetch(self, tickers: List[str]) -> List[AnalystRow]:  # noqa: D401
        """Return verified analyst rows for the given tickers."""
