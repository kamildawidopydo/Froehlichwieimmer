"""Placeholder analyst-research provider (Session 78.7).

**Why this file exists as a stub, not a real integration:**

The project's declared providers (Alpha Vantage, Unsplash, Emergent LLM key,
Resend, Claude Sonnet 5) do **not** publish structured analyst-consensus data
with target prices, research houses, and source URLs. To ship a *real*
`AnalystResearchProvider` we need credentials for one of the following
established data vendors (in order of typical fit for retail-facing sites):

* **Finnhub** — `/stock/recommendation-trends` + `/stock/price-target` (free
  tier available; requires `FINNHUB_API_KEY`).
* **Financial Modeling Prep** — `/analyst-estimates`, `/price-target-summary`
  (requires `FMP_API_KEY`).
* **IEX Cloud (now Iexapis)** — `/stock/{sym}/estimates` (paid).
* **Refinitiv / LSEG I/B/E/S** — enterprise pricing (paid).

Any of the above returns a rich, structured payload we can map 1:1 to
`AnalystRow`. Until such a key is provisioned, `NullAnalystProvider.available`
stays `False` and `.fetch()` returns an empty list. The sync runner treats
this as an honest signal and does **not** invent data.
"""
from __future__ import annotations

import logging
from typing import List

from .base import AnalystResearchProvider, AnalystRow

logger = logging.getLogger(__name__)


class NullAnalystProvider(AnalystResearchProvider):
    name = "null-analyst"
    available = False  # flips to True once a real provider is wired up

    async def fetch(self, tickers: List[str]) -> List[AnalystRow]:
        logger.info(
            "analyst-provider: no configured vendor — expected keys FINNHUB_API_KEY "
            "or FMP_API_KEY. Skipping %d ticker(s).",
            len(tickers or []),
        )
        return []
