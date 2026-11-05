"""FX-Rate provider using yfinance (Session 78.11).

Yahoo Finance liefert FX-Paare als `EURUSD=X`, `USDJPY=X` etc. — legitime
öffentliche Marktdaten, kein API-Key. Kleiner In-Memory-Cache (10 min) reduziert
Provider-Calls.
"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

_CACHE: dict[str, Tuple[float, float]] = {}   # key -> (rate, epoch)
_TTL = 600.0


async def get_fx_rate(base: str, quote: str) -> Optional[float]:
    """Return how many `quote` units one `base` unit buys, or None."""
    base = (base or "").upper().strip()
    quote = (quote or "").upper().strip()
    if not base or not quote:
        return None
    if base == quote:
        return 1.0
    now = time.time()
    key = f"{base}{quote}"
    hit = _CACHE.get(key)
    if hit and now - hit[1] < _TTL:
        return hit[0]

    def _fetch():
        try:
            import yfinance as yf
            t = yf.Ticker(f"{key}=X")
            info = t.info or {}
            price = info.get("regularMarketPrice") or info.get("previousClose")
            if isinstance(price, (int, float)) and price > 0:
                return float(price)
        except Exception as exc:  # noqa: BLE001
            logger.info("fx %s=X error: %s", key, str(exc)[:120])
        return None

    rate = await asyncio.to_thread(_fetch)
    if rate is not None:
        _CACHE[key] = (rate, now)
    return rate
