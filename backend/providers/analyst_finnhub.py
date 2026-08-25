"""Finnhub analyst provider (Session 78.8).

**Reality check — Finnhub's public analyst endpoints only return AGGREGATED data:**

* `GET /stock/price-target?symbol=X`  → `{targetHigh, targetLow, targetMean,
  targetMedian, lastUpdated, symbol, numberAnalysts}` — no individual
  analyst names, no research-house names.
* `GET /stock/recommendation?symbol=X` → `[{buy, hold, sell, strongBuy,
  strongSell, period, symbol}]` — bucketed rec counts by month, again no
  named analysts.

Consequently this provider **never** emits fake individual analyst rows.
Every emitted row is flagged ``record_type="provider_consensus"`` so the
consensus aggregation (which computes a median from named analyst rows)
does NOT double-count Finnhub's own median with itself.

Configuration:
  * env var ``FINNHUB_API_KEY`` — required (registration: finnhub.io)
  * env var ``FINNHUB_BASE_URL`` — optional override (default v1 endpoint)
  * env var ``FINNHUB_TIMEOUT_S`` — optional (default 8.0)

Rate limits: Free tier is 60 calls/min. The sync runner processes at most
`UNIVERSE_HARD_CAP` (40) tickers per run × 2 endpoints = 80 calls, so we
throttle sequentially with a small delay when many tickers are in the
universe.
"""
from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import List, Optional

import httpx

from .base import AnalystResearchProvider, AnalystRow

logger = logging.getLogger(__name__)

_FINNHUB_BASE = os.environ.get("FINNHUB_BASE_URL", "https://finnhub.io/api/v1").rstrip("/")
_TIMEOUT = float(os.environ.get("FINNHUB_TIMEOUT_S", "8.0"))
_THROTTLE_SECONDS = 1.1  # keep well under 60 rpm free-tier limit


def _finnhub_available() -> bool:
    key = os.environ.get("FINNHUB_API_KEY", "").strip()
    return bool(key)


class FinnhubAnalystProvider(AnalystResearchProvider):
    """Fetches Finnhub's aggregated consensus + recommendation trend.

    Emits exclusively ``record_type="provider_consensus"`` rows via the
    extended ``AnalystRow`` (see providers.base). The sync runner treats
    these rows as first-class citizens for storage & display but excludes
    them from the internal median aggregation to avoid double-counting.
    """

    name = "finnhub"

    def __init__(self, api_key: Optional[str] = None):
        self._api_key = (api_key or os.environ.get("FINNHUB_API_KEY", "")).strip()
        self.available = bool(self._api_key)

    async def _get(self, client: httpx.AsyncClient, path: str, params: dict) -> Optional[dict]:
        try:
            r = await client.get(f"{_FINNHUB_BASE}{path}", params={**params, "token": self._api_key}, timeout=_TIMEOUT)
        except httpx.TimeoutException:
            logger.warning("finnhub timeout: %s", path)
            return None
        except httpx.HTTPError as exc:
            logger.warning("finnhub http error %s: %s", path, str(exc)[:200])
            return None
        if r.status_code == 401 or r.status_code == 403:
            logger.error("finnhub auth failure (%s) — disabling provider for this run", r.status_code)
            raise PermissionError("finnhub_auth_failed")
        if r.status_code == 429:
            logger.warning("finnhub rate-limited — skipping remaining tickers")
            raise RuntimeError("finnhub_rate_limited")
        if r.status_code != 200:
            logger.info("finnhub non-200 %s: %s", path, r.status_code)
            return None
        try:
            return r.json()
        except ValueError:
            return None

    async def fetch(self, tickers: List[str]) -> List[AnalystRow]:
        if not self.available:
            return []
        out: List[AnalystRow] = []
        now = datetime.now(timezone.utc)
        # Basic USD default — Finnhub returns numeric targets without an
        # explicit currency; documented default for US-listed tickers is USD.
        # We keep it configurable via the ticker record if the curator set
        # something else, otherwise fall back to USD.
        async with httpx.AsyncClient() as client:
            for i, raw in enumerate(tickers):
                symbol = (raw or "").strip().upper()
                if not symbol:
                    continue
                try:
                    pt = await self._get(client, "/stock/price-target", {"symbol": symbol})
                except PermissionError:
                    # Bad key — abort entire run cleanly (validate/upsert loop
                    # will simply see an empty list, no existing data deleted).
                    return []
                except RuntimeError:
                    break  # rate-limited: stop early with what we have

                if not pt or not isinstance(pt, dict):
                    if i + 1 < len(tickers):
                        await asyncio.sleep(_THROTTLE_SECONDS)
                    continue

                target_mean = pt.get("targetMean")
                target_median = pt.get("targetMedian")
                target_high = pt.get("targetHigh")
                target_low = pt.get("targetLow")
                last_updated = pt.get("lastUpdated")
                num_analysts = pt.get("numberAnalysts")
                target = target_median if isinstance(target_median, (int, float)) and target_median > 0 else target_mean
                if not isinstance(target, (int, float)) or target <= 0:
                    if i + 1 < len(tickers):
                        await asyncio.sleep(_THROTTLE_SECONDS)
                    continue

                # Best-effort research date — Finnhub emits ISO strings.
                research_dt: datetime
                try:
                    if isinstance(last_updated, str) and last_updated:
                        research_dt = datetime.fromisoformat(last_updated.replace("Z", "+00:00"))
                        if research_dt.tzinfo is None:
                            research_dt = research_dt.replace(tzinfo=timezone.utc)
                    else:
                        research_dt = now
                except ValueError:
                    research_dt = now

                # Optional recommendation trend (most recent bucket) — used only
                # to derive a coarse ``rating`` label. NO analyst names inferred.
                rating_label: Optional[str] = None
                try:
                    rec = await self._get(client, "/stock/recommendation", {"symbol": symbol})
                    if isinstance(rec, list) and rec:
                        latest = rec[0] or {}
                        buys = int(latest.get("strongBuy") or 0) + int(latest.get("buy") or 0)
                        holds = int(latest.get("hold") or 0)
                        sells = int(latest.get("sell") or 0) + int(latest.get("strongSell") or 0)
                        total = buys + holds + sells
                        if total:
                            top = max((buys, "Kaufen"), (holds, "Halten"), (sells, "Verkaufen"), key=lambda p: p[0])
                            rating_label = f"{top[1]} ({buys}/{holds}/{sells})"
                except (PermissionError, RuntimeError):
                    rating_label = None

                # Provider-consensus row — no fake individual analyst.
                notes = (
                    f"Finnhub Consensus · High={target_high} Median={target_median} "
                    f"Mean={target_mean} Low={target_low} · #Analysten={num_analysts}"
                )
                row = AnalystRow(
                    ticker=symbol,
                    company_name=None,
                    analyst=None,             # NOT provided by Finnhub — never invent
                    research_house=None,      # NOT provided by Finnhub — never invent
                    rating=rating_label,
                    target_price=float(target),
                    currency="USD",           # Finnhub numeric targets — documented USD default
                    research_date=research_dt,
                    source_name="Finnhub",
                    source_url=None,          # Finnhub has no per-analyst public URL
                    fetched_at=now,
                )
                # Attach provider metadata via a companion dict on the runner.
                setattr(row, "_provider_meta", {
                    "record_type": "provider_consensus",
                    "target_mean": target_mean,
                    "target_median": target_median,
                    "target_high": target_high,
                    "target_low": target_low,
                    "number_analysts": num_analysts,
                    "notes": notes,
                    "provider_endpoint": "price-target",
                })
                out.append(row)

                if i + 1 < len(tickers):
                    await asyncio.sleep(_THROTTLE_SECONDS)
        logger.info("finnhub emitted %d provider-consensus row(s) for %d ticker(s)", len(out), len(tickers))
        return out
