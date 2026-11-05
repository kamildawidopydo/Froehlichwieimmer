"""Zentrale EUR-Umrechnung (Yahoo Finance EUR{ccy}=X). Keine erfundenen Kurse."""
from __future__ import annotations

import asyncio
import time
from datetime import datetime, timezone
from typing import Optional

_CACHE: dict = {}
_TTL = 300
_STALE_MAX = 3600


def normalize_ccy(ccy) -> tuple[Optional[str], float]:
    """Returns (ISO currency, minor-unit factor). GBp/GBX → GBP with factor 100."""
    if not ccy:
        return None, 1.0
    c = str(ccy).strip()
    if c in ("GBp", "GBX"):
        return "GBP", 100.0
    return c.upper(), 1.0


def _fetch(base: str):
    try:
        import yfinance as yf  # type: ignore
        fi = yf.Ticker(f"EUR{base}=X").fast_info
        last = getattr(fi, "last_price", None)
        prev = getattr(fi, "previous_close", None)
        last = float(last) if last and last > 0 else None
        prev = float(prev) if prev and prev > 0 else None
        return last, prev
    except Exception:  # noqa: BLE001
        return None, None


async def eur_rate(ccy) -> Optional[dict]:
    """Units of `ccy` per 1 EUR (spot + previous close) or None if unavailable."""
    base, _ = normalize_ccy(ccy)
    if not base:
        return None
    if base == "EUR":
        return {"rate": 1.0, "prev_rate": 1.0, "pair": "EUR/EUR", "source": None, "as_of": None}
    hit = _CACHE.get(base)
    if hit and time.time() - hit[1] < _TTL:
        return hit[0]
    last, prev = await asyncio.to_thread(_fetch, base)
    if not last:
        return hit[0] if hit and time.time() - hit[1] < _STALE_MAX else None
    info = {
        "rate": last,
        "prev_rate": prev,
        "pair": f"EUR/{base}",
        "source": f"Yahoo Finance EUR{base}=X",
        "as_of": datetime.now(timezone.utc).isoformat(),
    }
    _CACHE[base] = (info, time.time())
    return info


async def to_eur(amount, ccy, *, prev: bool = False) -> Optional[float]:
    """Native amount → EUR. None when currency/rate is unknown (never assumes EUR)."""
    if amount is None:
        return None
    base, factor = normalize_ccy(ccy)
    if not base:
        return None
    info = await eur_rate(base)
    if not info:
        return None
    rate = info["prev_rate"] if prev and info.get("prev_rate") else info["rate"]
    return float(amount) / factor / rate


def fx_meta(info: Optional[dict], ccy) -> Optional[dict]:
    base, _ = normalize_ccy(ccy)
    if not info or not base or base == "EUR":
        return None
    return {"original_currency": str(ccy), "rate": info["rate"], "pair": info["pair"],
            "source": info["source"], "as_of": info["as_of"]}
