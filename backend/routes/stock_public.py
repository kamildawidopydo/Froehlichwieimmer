"""Session 80.72 — Public single-stock endpoints for the /aktien/:symbol page.

Two endpoints backed by yfinance, with server-side allowlist and Mongo cache:
  GET /api/stocks/{symbol}/history?range=1m|1w|1m|3m|1y|5y|max
  GET /api/stocks/{symbol}/fundamentals

Only tickers that appear in the current stock-research feed are allowed.
No user-provided ticker is forwarded to yfinance. Missing/failed data returns
`data_source: "unavailable"` with `points: []` / `null` fields — no synthetics.
"""

from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

# ---- Mongo (reuse app connection) -----------------------------------------
_client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
_db = _client[os.environ["DB_NAME"]]

router = APIRouter(prefix="/api", tags=["stocks-public"])


# Allowlist — tickers currently visible on /Aktien-mit-Potenzial → yfinance symbol.
ALLOWED: Dict[str, str] = {
    "NVDA": "NVDA",
    "AAPL": "AAPL",
    "MSFT": "MSFT",
    "GOOGL": "GOOGL",
    "AMZN": "AMZN",
    "SAP": "SAP.DE",
    "SIE": "SIE.DE",
    "ALV": "ALV.DE",
    "DBK": "DBK.DE",
    "IFX": "IFX.DE",
    "RHM": "RHM.DE",
}

# range → (yfinance period, interval, cache TTL seconds)
RANGE_MAP: Dict[str, Dict[str, Any]] = {
    "1d":  {"period": "1d",  "interval": "5m",  "ttl": 5 * 60},
    "1w":  {"period": "5d",  "interval": "30m", "ttl": 15 * 60},
    "1m":  {"period": "1mo", "interval": "1d",  "ttl": 30 * 60},
    "3m":  {"period": "3mo", "interval": "1d",  "ttl": 60 * 60},
    "1y":  {"period": "1y",  "interval": "1wk", "ttl": 6 * 60 * 60},
    "5y":  {"period": "5y",  "interval": "1mo", "ttl": 24 * 60 * 60},
    "max": {"period": "max", "interval": "3mo", "ttl": 24 * 60 * 60},
}

FUNDAMENTALS_TTL_S = 6 * 60 * 60


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _check(symbol: str) -> str:
    sym = (symbol or "").upper().strip()
    if sym not in ALLOWED:
        raise HTTPException(404, detail=f"Ticker {sym} nicht freigeschaltet.")
    return sym


# ---- History ---------------------------------------------------------------

def _yf_history_sync(yf_sym: str, period: str, interval: str) -> Optional[List[dict]]:
    try:
        import yfinance as yf  # type: ignore
    except Exception:  # noqa: BLE001
        return None
    try:
        t = yf.Ticker(yf_sym)
        hist = t.history(period=period, interval=interval, prepost=False, auto_adjust=False)
        if hist is None or hist.empty:
            return None
        pts: List[dict] = []
        for idx, row in hist.iterrows():
            try:
                close = float(row["Close"])
            except (TypeError, ValueError, KeyError):
                continue
            if not (close > 0):
                continue
            ts = idx.to_pydatetime() if hasattr(idx, "to_pydatetime") else idx
            if getattr(ts, "tzinfo", None) is None:
                ts = ts.replace(tzinfo=timezone.utc)
            pts.append({"t": ts.astimezone(timezone.utc).isoformat(), "c": round(close, 4)})
        return pts if len(pts) >= 2 else None
    except Exception as exc:  # noqa: BLE001
        logger.info("yfinance history %s (%s/%s) error: %s", yf_sym, period, interval, str(exc)[:120])
        return None


@router.get("/stocks/{symbol}/history")
async def stock_history(symbol: str, range: str = Query(default="3m")) -> Dict[str, Any]:
    sym = _check(symbol)
    rk = (range or "3m").lower()
    if rk not in RANGE_MAP:
        raise HTTPException(400, detail=f"Ungültiger Zeitraum: {range}")

    cfg = RANGE_MAP[rk]
    cache_key = f"{sym}:{rk}"
    cached = await _db.stock_public_history_cache.find_one({"_id": cache_key})
    if cached and cached.get("expires_at") and cached["expires_at"] > _now():
        return {
            "symbol": sym,
            "range": rk,
            "currency": cached.get("currency"),
            "data_source": cached.get("data_source", "cache"),
            "points": cached.get("points", []),
            "cached_until": cached["expires_at"].isoformat(),
        }

    yf_sym = ALLOWED[sym]
    pts = await asyncio.to_thread(_yf_history_sync, yf_sym, cfg["period"], cfg["interval"])
    source = "yfinance" if pts else "unavailable"
    points = [{"timestamp": p["t"], "close": p["c"]} for p in (pts or [])]

    # currency heuristic from ticker suffix
    currency = "EUR" if yf_sym.endswith(".DE") else "USD"

    expires_at = _now() + timedelta(seconds=cfg["ttl"])
    await _db.stock_public_history_cache.update_one(
        {"_id": cache_key},
        {"$set": {
            "_id": cache_key,
            "symbol": sym,
            "range": rk,
            "yf_symbol": yf_sym,
            "period": cfg["period"],
            "interval": cfg["interval"],
            "currency": currency,
            "data_source": source,
            "points": points,
            "cached_at": _now(),
            "expires_at": expires_at,
        }},
        upsert=True,
    )
    return {
        "symbol": sym,
        "range": rk,
        "currency": currency,
        "data_source": source,
        "points": points,
        "cached_until": expires_at.isoformat(),
    }


# ---- Fundamentals ----------------------------------------------------------

def _yf_fundamentals_sync(yf_sym: str) -> Optional[Dict[str, Any]]:
    try:
        import yfinance as yf  # type: ignore
    except Exception:  # noqa: BLE001
        return None
    try:
        t = yf.Ticker(yf_sym)
        info = None
        try:
            info = t.get_info()
        except Exception:  # noqa: BLE001
            try:
                info = getattr(t, "info", None) or None
            except Exception:  # noqa: BLE001
                info = None
        fi = getattr(t, "fast_info", None)

        def _num(v):
            try:
                if v is None:
                    return None
                v = float(v)
                return v if v == v else None  # NaN check
            except (TypeError, ValueError):
                return None

        def _pick(key: str):
            if info and key in info:
                return info.get(key)
            return None

        result: Dict[str, Any] = {
            "company_name": _pick("longName") or _pick("shortName"),
            "sector": _pick("sector"),
            "industry": _pick("industry"),
            "exchange": _pick("exchange") or _pick("fullExchangeName"),
            "currency": _pick("currency") or (getattr(fi, "currency", None) if fi else None),
            "market_cap": _num(_pick("marketCap")) or _num(getattr(fi, "market_cap", None) if fi else None),
            "trailing_pe": _num(_pick("trailingPE")),
            "forward_pe": _num(_pick("forwardPE")),
            "eps": _num(_pick("trailingEps") or _pick("epsTrailingTwelveMonths")),
            "dividend_yield": _num(_pick("dividendYield")),
            "day_high": _num(_pick("dayHigh")) or _num(getattr(fi, "day_high", None) if fi else None),
            "day_low": _num(_pick("dayLow")) or _num(getattr(fi, "day_low", None) if fi else None),
            "fifty_two_week_high": _num(_pick("fiftyTwoWeekHigh")) or _num(getattr(fi, "year_high", None) if fi else None),
            "fifty_two_week_low": _num(_pick("fiftyTwoWeekLow")) or _num(getattr(fi, "year_low", None) if fi else None),
            "previous_close": _num(_pick("previousClose")) or _num(getattr(fi, "previous_close", None) if fi else None),
            "volume": _num(_pick("volume")) or _num(getattr(fi, "last_volume", None) if fi else None),
            "average_volume": _num(_pick("averageVolume")) or _num(_pick("averageVolume10days")),
        }
        # Yahoo returns dividendYield as decimal fraction (e.g. 0.0053) sometimes as pct (0.53). Normalise to pct.
        dy = result.get("dividend_yield")
        if dy is not None and dy < 1:
            result["dividend_yield"] = round(dy * 100.0, 4)
        # Yahoo occasionally returns implausible dividend yields (>20% for large-cap
        # equities). Hide those rather than fabricate a plausible number.
        if result.get("dividend_yield") is not None and result["dividend_yield"] > 20:
            result["dividend_yield"] = None
        return result
    except Exception as exc:  # noqa: BLE001
        logger.info("yfinance fundamentals %s error: %s", yf_sym, str(exc)[:120])
        return None


# ---- News matching (Session 80.73) -----------------------------------------
# `news_articles` has no `related_symbols` field. We use a strict alias
# dictionary with word boundaries and per-field scoring (title=3, subtitle=2,
# summary=1) to avoid false positives like a generic DAX article merely
# mentioning "Siemens" in passing.

import re

NEWS_ALIASES: Dict[str, List[str]] = {
    "NVDA":  ["NVIDIA", "Nvidia", "NVDA"],
    "AAPL":  ["Apple", "AAPL"],
    "MSFT":  ["Microsoft", "MSFT"],
    "GOOGL": ["Alphabet", "Google", "GOOGL"],
    "AMZN":  ["Amazon", "AMZN"],
    "SAP":   ["SAP SE", "SAP-Kurs", "SAP-Aktie", "SAP-Konzern", "SAP-Chef", "SAP-Gewinn", "SAP-Umsatz", "SAP-Prognose"],
    "SIE":   ["Siemens AG", "Siemens-Aktie", "Siemens-Konzern", "Siemens-Chef"],
    "ALV":   ["Allianz SE", "Allianz-Aktie", "Allianz-Konzern"],
    "DBK":   ["Deutsche Bank"],
    "IFX":   ["Infineon"],
    "RHM":   ["Rheinmetall"],
}
# Company display names for the section headline.
COMPANY_LABELS: Dict[str, str] = {
    "NVDA": "NVIDIA", "AAPL": "Apple", "MSFT": "Microsoft", "GOOGL": "Alphabet",
    "AMZN": "Amazon", "SAP": "SAP", "SIE": "Siemens", "ALV": "Allianz",
    "DBK": "Deutsche Bank", "IFX": "Infineon", "RHM": "Rheinmetall",
}
NEWS_TTL_S = 30 * 60  # 30 min cache

_ALIAS_PATTERNS: Dict[str, re.Pattern] = {
    sym: re.compile(r"\b(" + "|".join(re.escape(a) for a in aliases) + r")\b")
    for sym, aliases in NEWS_ALIASES.items()
}


def _score_article(doc: dict, pat: re.Pattern) -> int:
    """Match strength: title=3, subtitle=2, summary=1. Return 0 if no hit."""
    score = 0
    for field, weight in (("title", 3), ("subtitle", 2), ("summary", 1)):
        v = doc.get(field) or ""
        if isinstance(v, str) and pat.search(v):
            score += weight
    return score


def detect_related_symbols(*, title: str = "", subtitle: str = "", summary: str = "") -> List[str]:
    """Single source of truth: return the deduped list of ticker symbols
    whose alias matched title/subtitle/summary via strict word boundaries.
    Called at synthesis time to populate `news_articles.related_symbols`."""
    fake = {"title": title or "", "subtitle": subtitle or "", "summary": summary or ""}
    hits: List[str] = []
    for sym, pat in _ALIAS_PATTERNS.items():
        if _score_article(fake, pat) > 0:
            hits.append(sym)
    # Preserve insertion order, dedup (dict.fromkeys preserves order).
    return list(dict.fromkeys(hits))


def _published_at(doc: dict) -> Optional[datetime]:
    v = doc.get("published_at")
    if isinstance(v, datetime):
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
    if isinstance(v, str):
        try:
            dt = datetime.fromisoformat(v.replace("Z", "+00:00"))
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except ValueError:
            return None
    return None


@router.get("/stocks/{symbol}/news")
async def stock_news(symbol: str, limit: int = Query(default=5, ge=1, le=10)) -> Dict[str, Any]:
    sym = _check(symbol)
    cache_key = f"{sym}:{limit}"
    cached = await _db.stock_public_news_cache.find_one({"_id": cache_key})
    if cached and cached.get("expires_at") and cached["expires_at"] > _now():
        return {
            "symbol": sym,
            "company_label": COMPANY_LABELS[sym],
            "articles": cached.get("articles", []),
            "total": len(cached.get("articles", [])),
            "data_source": cached.get("data_source", "cache"),
            "cached_until": cached["expires_at"].isoformat(),
        }

    pat = _ALIAS_PATTERNS[sym]
    now = _now()
    cutoff = now - timedelta(days=7)

    projection = {
        "slug": 1, "title": 1, "subtitle": 1, "summary": 1, "category": 1,
        "published_at": 1, "source_names": 1, "source_urls": 1,
        "hero_image_url": 1, "image_url": 1, "related_symbols": 1,
    }
    cursor = _db.news_articles.find(
        {"status": {"$in": ["published", None]}, "is_archived": {"$ne": True}},
        projection,
    ).sort("published_at", -1).limit(400)
    docs = await cursor.to_list(400)

    matches = []
    for d in docs:
        pub = _published_at(d)
        if not pub or pub < cutoff:
            continue
        # Priority A: explicit related_symbols tag written by synthesizer.
        rs = d.get("related_symbols") or []
        if isinstance(rs, list) and sym in rs:
            score = 10  # explicit tag beats any alias hit
        else:
            # Priority B: legacy alias fallback for docs pre-related_symbols.
            score = _score_article(d, pat)
            if score <= 0:
                continue
        matches.append((score, pub, d))

    # Sort: score desc, pub desc.
    matches.sort(key=lambda t: (-t[0], -t[1].timestamp()))

    articles = []
    seen_slugs = set()
    seen_title_stems = set()
    for score, pub, d in matches:
        slug = d.get("slug")
        if not slug or slug in seen_slugs:
            continue
        title = (d.get("title") or "").strip()
        # Dedup near-duplicate stories that share the same first 40 chars.
        stem = re.sub(r"[\W_]+", " ", title.lower())[:28].strip()
        if stem and stem in seen_title_stems:
            continue
        seen_slugs.add(slug)
        if stem:
            seen_title_stems.add(stem)
        articles.append({
            "slug": slug,
            "title": d.get("title") or "",
            "subtitle": d.get("subtitle") or "",
            "summary": d.get("summary") or "",
            "category": d.get("category"),
            "published_at": pub.isoformat(),
            "source_name": (d.get("source_names") or [None])[0],
            "source_url": (d.get("source_urls") or [None])[0],
            "hero_image_url": d.get("hero_image_url") or d.get("image_url"),
            "match_score": score,
        })
        if len(articles) >= limit:
            break

    expires_at = now + timedelta(seconds=NEWS_TTL_S)
    await _db.stock_public_news_cache.update_one(
        {"_id": cache_key},
        {"$set": {
            "_id": cache_key, "symbol": sym, "articles": articles,
            "data_source": "news_articles",
            "cached_at": now, "expires_at": expires_at,
        }},
        upsert=True,
    )
    return {
        "symbol": sym,
        "company_label": COMPANY_LABELS[sym],
        "articles": articles,
        "total": len(articles),
        "data_source": "news_articles",
        "cached_until": expires_at.isoformat(),
    }


@router.get("/stocks/{symbol}/fundamentals")
async def stock_fundamentals(symbol: str) -> Dict[str, Any]:
    sym = _check(symbol)

    cached = await _db.stock_public_fundamentals_cache.find_one({"_id": sym})
    if cached and cached.get("expires_at") and cached["expires_at"] > _now():
        payload = cached.get("data") or {}
        return {
            "symbol": sym,
            "data_source": cached.get("data_source", "cache"),
            "data_updated_at": cached.get("cached_at").isoformat() if cached.get("cached_at") else None,
            "cached_until": cached["expires_at"].isoformat(),
            **payload,
        }

    yf_sym = ALLOWED[sym]
    data = await asyncio.to_thread(_yf_fundamentals_sync, yf_sym)
    source = "yfinance" if data else "unavailable"
    payload = data or {
        "company_name": None, "sector": None, "industry": None, "exchange": None,
        "currency": None, "market_cap": None, "trailing_pe": None, "forward_pe": None,
        "eps": None, "dividend_yield": None, "day_high": None, "day_low": None,
        "fifty_two_week_high": None, "fifty_two_week_low": None, "previous_close": None,
        "volume": None, "average_volume": None,
    }

    now = _now()
    expires_at = now + timedelta(seconds=FUNDAMENTALS_TTL_S)
    await _db.stock_public_fundamentals_cache.update_one(
        {"_id": sym},
        {"$set": {
            "_id": sym, "symbol": sym, "yf_symbol": yf_sym,
            "data_source": source, "data": payload,
            "cached_at": now, "expires_at": expires_at,
        }},
        upsert=True,
    )
    return {
        "symbol": sym,
        "data_source": source,
        "data_updated_at": now.isoformat(),
        "cached_until": expires_at.isoformat(),
        **payload,
    }
