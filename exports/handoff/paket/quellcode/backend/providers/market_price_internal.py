"""Market-price provider that reuses the in-house quote endpoint (Session 78.7).

Rationale:
* The project already ships a well-tested market-data helper via
  ``server.market_quote`` which knows how to talk to Alpha Vantage when a key
  is present and gracefully falls back to a curated snapshot otherwise.
* Wrapping it as a provider avoids a duplicate integration surface, keeps
  configuration in one place, and honours the fallback signalling
  (``data_source``, ``is_delayed``) needed by the sync runner.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import List

from .base import MarketPrice, MarketPriceProvider

logger = logging.getLogger(__name__)


class InternalQuoteProvider(MarketPriceProvider):
    name = "internal-quote"

    async def fetch(self, tickers: List[str]) -> List[MarketPrice]:
        # Lazy import to avoid circulars — the sync runner is registered by
        # server.py once module init completed.
        from server import market_quote  # type: ignore

        out: List[MarketPrice] = []
        for raw in tickers:
            ticker = (raw or "").strip().upper()
            if not ticker:
                continue
            try:
                q = await market_quote(symbol=ticker, display_currency=None)
            except Exception as exc:  # noqa: BLE001
                # 404 or provider hiccup — we silently skip, per contract.
                logger.info("market-price skip %s: %s", ticker, str(exc)[:120])
                continue
            price = q.get("display_price") if isinstance(q.get("display_price"), (int, float)) else q.get("price")
            currency = q.get("display_currency") or q.get("currency")
            if not isinstance(price, (int, float)) or price <= 0 or not currency:
                continue
            last_updated_raw = q.get("last_updated")
            try:
                pu = datetime.fromisoformat(last_updated_raw.replace("Z", "+00:00")) if isinstance(last_updated_raw, str) else None
                if pu and pu.tzinfo is None:
                    pu = pu.replace(tzinfo=timezone.utc)
            except (ValueError, AttributeError):
                pu = None
            out.append(MarketPrice(
                ticker=(q.get("symbol") or ticker).upper(),
                company_name=q.get("name") or None,
                price=float(price),
                currency=str(currency).upper(),
                previous_close=q.get("previous_close") if isinstance(q.get("previous_close"), (int, float)) else None,
                price_change_percent=q.get("change_percent") if isinstance(q.get("change_percent"), (int, float)) else None,
                price_source=q.get("data_source") or "internal-quote",
                price_source_url=None,
                price_updated_at=pu,
                is_delayed=bool(q.get("is_delayed") or q.get("data_source") == "fallback"),
            ))
        return out
