"""Session 82.86 — Forex Public Router (Legacy-Cutover).

Ersetzt den letzten Legacy-Backend-Touch in `frontend/src/services/forexService.js`
(Legacy Serverless-Funktion `stock-prices` mit FX-Symbolen)
durch einen nativen FastAPI-Endpoint auf Basis des bestehenden
`providers/fx_yfinance.get_fx_rate()`.

Endpoint:
    GET /api/forex/quotes?pairs=EURUSD,GBPUSD,USDJPY,...

Response:
    {
      "items": [
        {
          "pair": "EURUSD", "base": "EUR", "quote": "USD",
          "rate": 1.0842, "as_of": "2026-02-…", "data_source": "yfinance",
          "data_status": "fresh"
        },
        …
      ],
      "last_updated": "…",
      "is_delayed": true
    }

Caching:
- Mongo-Kollektion `forex_rate_cache` (Read-Through, TTL 120 s).
- Bei Cache-Hit: `data_status="fresh"` bis TTL, danach re-fetch.
- Bei Provider-Ausfall: falls Cache mit älterem Wert existiert →
  `data_status="stale"` (echter Wert, aber überaltert); sonst
  `rate=null, data_status="unavailable"`.
- Pairs werden gebündelt parallel geladen (asyncio.gather) — kein N+1.

Regeln:
- Keine Hardcoded-Rates.
- Keine erfundenen Cross-Rates.
- Keine stale-als-fresh-Signalisierung.
- Ungültige Pairs (falsche Länge / unerlaubte Zeichen) → `data_status="unavailable"`.
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

_client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
_db = _client[os.environ["DB_NAME"]]

router = APIRouter(prefix="/api/forex", tags=["forex"])

# Fresh-TTL: 120 s (angelehnt an frontend RATES_TTL). Stale-Fenster: 60 min
# (danach gilt der Wert als "unavailable", auch wenn er noch im Cache liegt).
_FRESH_TTL_S = 120
_STALE_MAX_S = 60 * 60

# Sanity-Gate für Pair-Namen: exakt 6 Zeichen A-Z (3+3).
_PAIR_RE = re.compile(r"^[A-Z]{6}$")

# Maximale Anzahl Pairs pro Request — verhindert N+1-Fanout gegen Provider.
_MAX_PAIRS = 25


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_pair(pair: str) -> Optional[tuple[str, str]]:
    p = (pair or "").upper().strip()
    if not _PAIR_RE.match(p):
        return None
    return p[:3], p[3:]


async def _fetch_one(pair: str) -> Dict[str, Any]:
    """Ein Pair auflösen: Cache-Read → Provider-Read → Cache-Write.

    Rückgabe-Shape ist der finale Serializer für die Route.
    """
    parsed = _parse_pair(pair)
    if not parsed:
        return {
            "pair": (pair or "").upper(),
            "base": None,
            "quote": None,
            "rate": None,
            "as_of": None,
            "data_source": None,
            "data_status": "unavailable",
        }
    base, quote = parsed
    key = f"{base}{quote}"

    cached = await _db.forex_rate_cache.find_one({"_id": key})
    now = _now()
    if cached:
        cached_at = cached.get("cached_at")
        if isinstance(cached_at, datetime):
            age_s = (now - cached_at).total_seconds()
            if age_s < _FRESH_TTL_S and cached.get("rate") is not None:
                return {
                    "pair": key,
                    "base": base,
                    "quote": quote,
                    "rate": float(cached["rate"]),
                    "as_of": cached_at.isoformat(),
                    "data_source": cached.get("data_source", "yfinance"),
                    "data_status": "fresh",
                }

    # Fresh-TTL überschritten oder kein Cache → Provider abfragen.
    try:
        from providers.fx_yfinance import get_fx_rate  # type: ignore
    except Exception:  # noqa: BLE001
        get_fx_rate = None  # type: ignore

    rate: Optional[float] = None
    if get_fx_rate is not None:
        try:
            rate = await get_fx_rate(base, quote)
        except Exception as exc:  # noqa: BLE001
            logger.info("forex provider error %s: %s", key, str(exc)[:120])
            rate = None

    if rate is not None and rate > 0:
        # Cache-Write (Read-Through). `as_of` = jetzt (Provider liefert live).
        await _db.forex_rate_cache.update_one(
            {"_id": key},
            {"$set": {
                "_id": key,
                "pair": key,
                "base": base,
                "quote": quote,
                "rate": float(rate),
                "cached_at": now,
                "data_source": "yfinance",
            }},
            upsert=True,
        )
        return {
            "pair": key, "base": base, "quote": quote,
            "rate": float(rate),
            "as_of": now.isoformat(),
            "data_source": "yfinance",
            "data_status": "fresh",
        }

    # Provider unavailable → wenn wir einen älteren Cache-Eintrag haben, den
    # markieren wir explizit als "stale" (echter Wert, aber überaltert), sonst
    # "unavailable" mit rate=None.
    if cached and cached.get("rate") is not None:
        cached_at = cached.get("cached_at")
        age_s = (now - cached_at).total_seconds() if isinstance(cached_at, datetime) else _STALE_MAX_S + 1
        if age_s <= _STALE_MAX_S:
            return {
                "pair": key, "base": base, "quote": quote,
                "rate": float(cached["rate"]),
                "as_of": cached_at.isoformat() if isinstance(cached_at, datetime) else None,
                "data_source": cached.get("data_source", "yfinance"),
                "data_status": "stale",
            }

    return {
        "pair": key, "base": base, "quote": quote,
        "rate": None,
        "as_of": None,
        "data_source": None,
        "data_status": "unavailable",
    }


@router.get("/quotes")
async def forex_quotes(
    pairs: str = Query(default="", description="Comma-separated pairs: EURUSD,GBPUSD"),
) -> Dict[str, Any]:
    """Batch-Endpoint für FX-Paare. Pairs werden parallel aufgelöst — kein N+1."""
    raw = [p.strip().upper() for p in (pairs or "").split(",") if p.strip()]
    if not raw:
        raise HTTPException(400, detail="pairs is required (comma-separated)")
    # De-Dup unter Erhalt der Reihenfolge.
    seen: set[str] = set()
    ordered: List[str] = []
    for p in raw:
        if p not in seen:
            seen.add(p)
            ordered.append(p)
    if len(ordered) > _MAX_PAIRS:
        raise HTTPException(400, detail=f"too many pairs (max {_MAX_PAIRS})")

    items = await asyncio.gather(*[_fetch_one(p) for p in ordered])
    last_updated_candidates = [i["as_of"] for i in items if i.get("as_of")]
    return {
        "items": items,
        "last_updated": max(last_updated_candidates) if last_updated_candidates else _now().isoformat(),
        "is_delayed": True,
    }


async def ensure_indexes() -> Dict[str, Any]:
    """Cache-Kollektion braucht nur den `_id`-Primärindex — bereits vorhanden."""
    return {"cache_collection": "forex_rate_cache", "primary_key": "_id"}
