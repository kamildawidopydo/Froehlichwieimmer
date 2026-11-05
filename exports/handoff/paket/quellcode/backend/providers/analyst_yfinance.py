"""Yahoo-Finance-Analystenprovider (Session 78.10).

**Warum yfinance:**
Yahoo Finance publiziert strukturierte, aggregierte Analystenkonsens-Daten
öffentlich (mean/median/high/low target, Anzahl Analysten). Das populäre
`yfinance`-Paket ist ein legitimer, gut gepflegter Wrapper darum und benötigt
**keinen API-Key**. Die Daten stammen aus Yahoos aggregierter Datenbank; **keine
Einzelanalysten und keine Research-Häuser** sind enthalten — perfekter Fit für
unser `provider_consensus`-Modell aus Session 78.8.

Contract identisch zu FinnhubAnalystProvider:
  * emittiert ausschließlich `record_type="provider_consensus"`-Rows
  * `analyst=None`, `research_house=None` (Yahoo liefert diese nicht)
  * `source_name="Yahoo Finance"`, `source_url=https://finance.yahoo.com/quote/<SYM>/analysis`
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Optional

from .base import AnalystResearchProvider, AnalystRow

logger = logging.getLogger(__name__)


def _yfinance_available() -> bool:
    try:
        import yfinance  # noqa: F401
        return True
    except ImportError:
        return False


class YFinanceAnalystProvider(AnalystResearchProvider):
    name = "yahoo-finance"

    def __init__(self):
        self.available = _yfinance_available()

    async def fetch(self, tickers: List[str]) -> List[AnalystRow]:
        if not self.available:
            return []
        import yfinance as yf

        out: List[AnalystRow] = []
        now = datetime.now(timezone.utc)

        def _fetch_one(symbol: str):
            try:
                t = yf.Ticker(symbol)
                atp = None
                if hasattr(t, "get_analyst_price_targets"):
                    try:
                        atp = t.get_analyst_price_targets()
                    except Exception:  # noqa: BLE001
                        atp = None
                # Session 78.12 — ALWAYS load info (currency, longName, etc.),
                # not only as fallback for atp.
                info = None
                try:
                    info = t.info
                except Exception:  # noqa: BLE001
                    info = None
                return atp, info
            except Exception as exc:  # noqa: BLE001
                logger.info("yfinance %s: %s", symbol, str(exc)[:120])
                return None, None

        for raw in tickers:
            symbol = (raw or "").strip().upper()
            if not symbol:
                continue
            # Session 78.12 — resolve canonical → Yahoo-listing to avoid ADR mismatch.
            from .symbol_map import resolve
            mapped = resolve(symbol, "yahoo-finance")
            fetch_symbol = mapped[0] if mapped else symbol
            exchange = mapped[1] if mapped else None
            atp, info = await asyncio.to_thread(_fetch_one, fetch_symbol)

            target_median = target_mean = target_high = target_low = current = None
            num_analysts = None
            company_name: Optional[str] = None
            currency = "USD"
            rating_label: Optional[str] = None

            if atp:
                target_median = atp.get("median")
                target_mean = atp.get("mean")
                target_high = atp.get("high")
                target_low = atp.get("low")
                current = atp.get("current")
            if info:
                target_median = target_median or info.get("targetMedianPrice")
                target_mean = target_mean or info.get("targetMeanPrice")
                target_high = target_high or info.get("targetHighPrice")
                target_low = target_low or info.get("targetLowPrice")
                current = current or info.get("currentPrice")
                num_analysts = info.get("numberOfAnalystOpinions")
                company_name = info.get("longName") or info.get("shortName")
                # Yahoo `currency` = Handelswährung (matches current + targets).
                # `financialCurrency` = Reporting-Währung (Bilanz) — NICHT für Kursziele.
                currency = (info.get("currency") or "USD").upper()
                rec = info.get("recommendationKey")
                if isinstance(rec, str) and rec:
                    rating_label = rec.replace("_", " ").title()

            target = target_median if isinstance(target_median, (int, float)) and target_median > 0 else target_mean
            if not isinstance(target, (int, float)) or target <= 0:
                logger.info("yfinance %s: no usable target — skipped", symbol)
                continue

            notes = (
                f"Yahoo Consensus · High={target_high} Median={target_median} "
                f"Mean={target_mean} Low={target_low} · #Analysten={num_analysts}"
            )
            row = AnalystRow(
                ticker=symbol,                     # canonical ticker (unchanged public value)
                company_name=company_name,
                analyst=None,           # Yahoo liefert keine Einzelanalysten
                research_house=None,    # Yahoo liefert keine Research-Häuser
                rating=rating_label,
                target_price=float(target),
                currency=currency,
                research_date=now,      # Yahoo bündelt fortlaufend — Sync-Zeitpunkt = as-of
                source_name="Yahoo Finance",
                source_url=f"https://finance.yahoo.com/quote/{fetch_symbol}/analysis",
                fetched_at=now,
            )
            setattr(row, "_provider_meta", {
                "record_type": "provider_consensus",
                "target_mean": target_mean,
                "target_median": target_median,
                "target_high": target_high,
                "target_low": target_low,
                "number_analysts": num_analysts,
                "current_price_provider": current,
                "notes": notes,
                "provider_endpoint": "yfinance.get_analyst_price_targets",
                # Session 78.12
                "provider_symbol": fetch_symbol,
                "exchange": exchange,
            })
            out.append(row)
        logger.info("yfinance emitted %d provider-consensus row(s) for %d ticker(s)", len(out), len(tickers))
        return out
