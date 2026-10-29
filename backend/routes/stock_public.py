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
# Session 81.03 — DE-Universe erweitert für Dividendenkalender + Deutschland im Fokus.
# Nur Symbole mit realem yfinance-Coverage aufnehmen (Public-Symbol = XETRA-Kürzel).
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
    # DE-Universe-Erweiterung (Session 81.03) — XETRA-Kürzel → yfinance .DE
    "DTE":  "DTE.DE",   # Deutsche Telekom
    "MUV2": "MUV2.DE",  # Münchener Rück
    "BAS":  "BAS.DE",   # BASF
    "MBG":  "MBG.DE",   # Mercedes-Benz Group
    "BMW":  "BMW.DE",   # BMW
    "VOW3": "VOW3.DE",  # Volkswagen Vz.
    "EOAN": "EOAN.DE",  # E.ON
    "RWE":  "RWE.DE",   # RWE
    "HEN3": "HEN3.DE",  # Henkel Vz.
    "BEI":  "BEI.DE",   # Beiersdorf
    "ENR":  "ENR.DE",   # Siemens Energy
    "DHL":  "DHL.DE",   # DHL Group (ex Deutsche Post)
    "VNA":  "VNA.DE",   # Vonovia
    "FRE":  "FRE.DE",   # Fresenius
    "CBK":  "CBK.DE",   # Commerzbank
    "ADS":  "ADS.DE",   # Adidas
    # Benchmark indices — Session 80.75 (Investment-Calculator).
    "NDX": "^NDX",     # Nasdaq-100
    "DAX": "^GDAXI",   # DAX 40
}

# Benchmark mapping for each equity → index symbol used above.
BENCHMARK_FOR: Dict[str, str] = {
    "NVDA": "NDX", "AAPL": "NDX", "MSFT": "NDX", "GOOGL": "NDX", "AMZN": "NDX",
    "SAP": "DAX", "SIE": "DAX", "ALV": "DAX", "DBK": "DAX", "IFX": "DAX", "RHM": "DAX",
    # DE-Universe-Erweiterung → alle DAX-Benchmark
    "DTE": "DAX", "MUV2": "DAX", "BAS": "DAX", "MBG": "DAX", "BMW": "DAX",
    "VOW3": "DAX", "EOAN": "DAX", "RWE": "DAX", "HEN3": "DAX", "BEI": "DAX",
    "ENR": "DAX", "DHL": "DAX", "VNA": "DAX", "FRE": "DAX", "CBK": "DAX", "ADS": "DAX",
}

# range → (yfinance period, interval, cache TTL seconds)
# Session 82.84 — Frontend nutzt yfinance-Style-Keys (`5d`, `1mo`, `3mo`, `6mo`).
# Backend akzeptiert beide Notationen: yfinance-Style (kanonisch) + Legacy
# Kurzkeys (`1w`, `1m`, `3m`) als Aliase. Zusätzlich `6mo` neu unterstützt.
RANGE_MAP: Dict[str, Dict[str, Any]] = {
    "1d":  {"period": "1d",  "interval": "5m",  "ttl": 5 * 60},
    "5d":  {"period": "5d",  "interval": "30m", "ttl": 15 * 60},
    "1w":  {"period": "5d",  "interval": "30m", "ttl": 15 * 60},   # Legacy alias
    "1mo": {"period": "1mo", "interval": "1d",  "ttl": 30 * 60},
    "1m":  {"period": "1mo", "interval": "1d",  "ttl": 30 * 60},   # Legacy alias
    "3mo": {"period": "3mo", "interval": "1d",  "ttl": 60 * 60},
    "3m":  {"period": "3mo", "interval": "1d",  "ttl": 60 * 60},   # Legacy alias
    "6mo": {"period": "6mo", "interval": "1d",  "ttl": 2 * 60 * 60},
    "1y":  {"period": "1y",  "interval": "1wk", "ttl": 6 * 60 * 60},
    "5y":  {"period": "5y",  "interval": "1mo", "ttl": 24 * 60 * 60},
    "max": {"period": "max", "interval": "3mo", "ttl": 24 * 60 * 60},
}

FUNDAMENTALS_TTL_S = 6 * 60 * 60
ANALYST_TTL_S = 6 * 60 * 60
DIVIDENDS_TTL_S = 12 * 60 * 60
EARNINGS_TTL_S = 3 * 60 * 60
COMPARE_TTL_S = 60 * 60

# Compare ranges use daily bars so we can compute daily-return-based volatility
# and drawdowns. `max` falls back to weekly to keep payload size reasonable.
COMPARE_RANGE_MAP: Dict[str, Dict[str, Any]] = {
    "1y":  {"period": "1y",  "interval": "1d",  "trading_days": 252},
    "3y":  {"period": "3y",  "interval": "1d",  "trading_days": 252},
    "5y":  {"period": "5y",  "interval": "1d",  "trading_days": 252},
    "max": {"period": "max", "interval": "1wk", "trading_days": 52},
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _check(symbol: str) -> str:
    """
    Session 82.82b — Allowlist ist keine harte Barriere mehr. yfinance selbst
    ist authoritativer Provider: wenn Ticker unterstützt → Daten; wenn nicht
    → yfinance liefert leer und der Endpoint gibt sauber `unavailable` zurück.
    Wir sanitizen nur das Format (Länge/Zeichen), damit kein Injection-Risiko
    entsteht.
    """
    sym = (symbol or "").upper().strip()
    if not sym or len(sym) > 15:
        raise HTTPException(404, detail=f"Ticker {sym!r} ungültig.")
    # Zulässige Zeichen: A–Z, 0–9, `.` `-` (z. B. `BOL.ST`, `VOLV-B.ST`, `BRK-B`)
    for ch in sym:
        if not (ch.isalnum() or ch in ".-"):
            raise HTTPException(404, detail=f"Ticker {sym!r} ungültig.")
    return sym


# ---- History ---------------------------------------------------------------

def _yf_history_sync(yf_sym: str, period: str, interval: str) -> Optional[List[dict]]:
    try:
        import yfinance as yf  # type: ignore
    except Exception:  # noqa: BLE001
        return None
    # Session 82.84 — YFRateLimitError defensiv abfangen: kein synthetischer
    # Fallback, kein 500. Signalisieren via `None` → Endpoint gibt sauber
    # `data_status: "unavailable"` mit leeren Points zurück.
    try:
        from yfinance.exceptions import YFRateLimitError  # type: ignore
    except Exception:  # noqa: BLE001
        YFRateLimitError = None  # type: ignore
    try:
        t = yf.Ticker(yf_sym)
        hist = t.history(period=period, interval=interval, prepost=False, auto_adjust=False)
        if hist is None or hist.empty:
            return None
        pts: List[dict] = []
        # Session 82.58a — OHLCV pro Bar aus yfinance direkt übernehmen.
        # KEINE synthetischen Werte, KEINE Interpolation.
        # Invalide Bars (low > high, close/open <= 0, NaN) werden ausschließlich
        # geskippt, niemals korrigiert. Anzahl skipped wird beim Aufrufer via
        # Längen-Diff sichtbar (points_returned < bars_seen).
        for idx, row in hist.iterrows():
            try:
                close = float(row["Close"])
                open_v = float(row["Open"])
                high = float(row["High"])
                low = float(row["Low"])
                vol_raw = row["Volume"]
                volume = int(vol_raw) if vol_raw is not None and vol_raw == vol_raw else None  # NaN-safe
            except (TypeError, ValueError, KeyError):
                continue
            # Skip NaN/Infinity/non-finite via python check.
            import math
            if any((x is None or (isinstance(x, float) and (math.isnan(x) or math.isinf(x))))
                   for x in [close, open_v, high, low]):
                continue
            # OHLC Sanity-Gates: low <= min(open,close) und high >= max(open,close), low<=high.
            if not (close > 0 and open_v > 0 and high > 0 and low > 0):
                continue
            if low > high or low > min(open_v, close) or high < max(open_v, close):
                continue
            if volume is not None and volume < 0:
                volume = None
            ts = idx.to_pydatetime() if hasattr(idx, "to_pydatetime") else idx
            if getattr(ts, "tzinfo", None) is None:
                ts = ts.replace(tzinfo=timezone.utc)
            pts.append({
                "t": ts.astimezone(timezone.utc).isoformat(),
                "c": round(close, 4),
                "o": round(open_v, 4),
                "h": round(high, 4),
                "l": round(low, 4),
                "v": volume,
            })
        return pts if len(pts) >= 2 else None
    except Exception as exc:  # noqa: BLE001
        # Session 82.84 — Rate-Limit explizit loggen, aber Verhalten identisch:
        # `None` zurückgeben → Endpoint liefert `data_status: "unavailable"`.
        if YFRateLimitError is not None and isinstance(exc, YFRateLimitError):
            logger.warning("yfinance rate-limit hit for %s (%s/%s) — returning unavailable",
                           yf_sym, period, interval)
        else:
            logger.info("yfinance history %s (%s/%s) error: %s", yf_sym, period, interval, str(exc)[:120])
        return None


_PERIODS_PER_YEAR = {"1d": 252, "1wk": 52, "1mo": 12}


_SUFFIX_CCY = {
    "DE": "EUR", "F": "EUR", "PA": "EUR", "MI": "EUR", "AS": "EUR", "MC": "EUR", "BR": "EUR",
    "VI": "EUR", "HE": "EUR", "LS": "EUR", "IR": "EUR", "ST": "SEK", "L": "GBp", "SW": "CHF",
    "CO": "DKK", "OL": "NOK", "TO": "CAD", "HK": "HKD", "T": "JPY",
}


def _native_currency(yf_sym: str) -> str:
    if yf_sym.startswith("^"):
        return "USD" if yf_sym in {"^NDX", "^GSPC", "^DJI", "^IXIC"} else "EUR"
    suffix = yf_sym.rsplit(".", 1)[1].upper() if "." in yf_sym else ""
    return _SUFFIX_CCY.get(suffix, "USD")


async def _convert_points_to_eur(points: List[dict], ccy: str, cfg: Dict[str, Any]):
    """Converts each bar with the FX bar valid at that time (Yahoo EUR{ccy}=X)."""
    import bisect
    factor = 100.0 if ccy in ("GBp", "GBX") else 1.0
    ccy = "GBP" if factor == 100.0 else ccy
    pair = f"EUR{ccy}=X"
    fx = await asyncio.to_thread(_yf_history_sync, pair, cfg["period"], cfg["interval"])
    if not fx:
        return [], None
    fx_ts = [datetime.fromisoformat(f["t"]) for f in fx]
    out = []
    for p in points:
        ts = datetime.fromisoformat(p["timestamp"])
        i = bisect.bisect_right(fx_ts, ts) - 1
        if i < 0:
            if (fx_ts[0] - ts) > timedelta(days=4):
                continue
            i = 0
        if (ts - fx_ts[i]) > timedelta(days=4):
            continue
        rate = fx[i]["c"] * factor
        conv = lambda v: round(v / rate, 4) if v is not None else None  # noqa: E731
        out.append({**p, "close": conv(p["close"]), "open": conv(p.get("open")),
                    "high": conv(p.get("high")), "low": conv(p.get("low")),
                    "native_close": p["close"], "fx_rate": rate, "fx_time": fx[i]["t"]})
    if len(out) < 2:
        return [], None
    meta = {"pair": f"EUR/{ccy}", "source": f"Yahoo Finance {pair}", "native_currency": ccy,
            "latest_rate": fx[-1]["c"], "latest_rate_time": fx[-1]["t"],
            "method": "Kurs je Zeitpunkt / EUR-Wechselkurs desselben oder vorherigen Zeitpunkts"}
    return out, meta


def _compute_history_stats(points: List[dict], interval: str = "1d") -> Dict[str, Any]:
    """Session 82.58a — Aggregat-Statistiken NUR aus echten Provider-Bars.
    Kein synthetischer Punkt, keine Interpolation. Bei zu wenig Daten: null.
    """
    import math
    if not points or len(points) < 2:
        return {
            "fifty_two_week_high": None,
            "fifty_two_week_low": None,
            "open_of_day": None,
            "one_year_return_pct": None,
            "annualized_volatility_pct": None,
            "average_volume": None,
        }
    highs = [p["high"] for p in points if p.get("high") is not None]
    lows = [p["low"] for p in points if p.get("low") is not None]
    closes = [p["close"] for p in points if p.get("close") is not None]
    vols = [p["volume"] for p in points if p.get("volume") is not None and p["volume"] > 0]
    latest = points[-1]
    open_of_day = latest.get("open") if latest.get("open") is not None else None
    fifty_two_high = max(highs) if highs else None
    fifty_two_low = min(lows) if lows else None
    # 1Y-Return aus erstem/letztem echtem Close.
    one_year_return_pct = None
    if len(closes) >= 2 and closes[0] > 0:
        one_year_return_pct = round(((closes[-1] - closes[0]) / closes[0]) * 100, 4)
    # Annualized daily-log volatility (× √252).
    ann_vol = None
    if len(closes) >= 3:
        rets = []
        for i in range(1, len(closes)):
            if closes[i - 1] > 0:
                rets.append(math.log(closes[i] / closes[i - 1]))
        if len(rets) >= 2:
            mean = sum(rets) / len(rets)
            var = sum((r - mean) ** 2 for r in rets) / (len(rets) - 1)  # sample variance
            periods = _PERIODS_PER_YEAR.get(interval)
            ann_vol = round(math.sqrt(var) * math.sqrt(periods) * 100, 4) if periods else None
    avg_vol = int(sum(vols) / len(vols)) if vols else None
    day = {}
    if interval.endswith("m") and not interval.endswith("mo"):
        last_day = str(points[-1].get("timestamp", ""))[:10]
        dp = [p for p in points if str(p.get("timestamp", ""))[:10] == last_day]
        dh = [p["high"] for p in dp if p.get("high") is not None]
        dl = [p["low"] for p in dp if p.get("low") is not None]
        dv = [p["volume"] for p in dp if p.get("volume")]
        prev = [p["close"] for p in points if str(p.get("timestamp", ""))[:10] < last_day and p.get("close") is not None]
        day = {
            "prev_close": round(prev[-1], 4) if prev else None,
            "last_close": round(dp[-1]["close"], 4) if dp and dp[-1].get("close") is not None else None,
            "open_of_day": round(dp[0]["open"], 4) if dp and dp[0].get("open") is not None else None,
            "day_high": round(max(dh), 4) if dh else None,
            "day_low": round(min(dl), 4) if dl else None,
            "day_volume": int(sum(dv)) if dv else None,
            "day_date": last_day or None,
        }
    return {
        "fifty_two_week_high": round(fifty_two_high, 4) if fifty_two_high is not None else None,
        "fifty_two_week_low": round(fifty_two_low, 4) if fifty_two_low is not None else None,
        "open_of_day": round(open_of_day, 4) if open_of_day is not None else None,
        "one_year_return_pct": one_year_return_pct,
        "annualized_volatility_pct": ann_vol,
        "average_volume": avg_vol,
        **day,
    }


@router.get("/stocks/{symbol}/history")
async def stock_history(symbol: str, range: str = Query(default="3m")) -> Dict[str, Any]:
    sym = _check(symbol)
    rk = (range or "3m").lower()
    if rk not in RANGE_MAP:
        raise HTTPException(400, detail=f"Ungültiger Zeitraum: {range}")

    cfg = RANGE_MAP[rk]
    cache_key = f"eur2:{sym}:{rk}"
    cached = await _db.stock_public_history_cache.find_one({"_id": cache_key})
    if cached and cached.get("expires_at") and cached["expires_at"] > _now():
        stale = bool(cached.get("stale")) and bool(cached.get("points"))
        return {
            "symbol": sym,
            "range": rk,
            "currency": cached.get("currency"),
            "native_currency": cached.get("native_currency"),
            "fx": cached.get("fx"),
            "data_source": cached.get("data_source", "cache"),
            "data_status": "stale" if stale else ("fresh" if cached.get("data_source") == "yfinance" else "unavailable"),
            "data_as_of": cached["cached_at"].isoformat() if cached.get("cached_at") else None,
            "points": cached.get("points", []),
            "stats": _compute_history_stats(cached.get("points", []), cfg["interval"]),
            "cached_until": cached["expires_at"].isoformat(),
        }

    yf_sym = ALLOWED.get(sym, sym)
    pts = await asyncio.to_thread(_yf_history_sync, yf_sym, cfg["period"], cfg["interval"])
    source = "yfinance" if pts else "unavailable"
    # Session 82.58a — additive OHLCV Felder. `close` bleibt für backward-compat.
    points = [{
        "timestamp": p["t"],
        "close": p["c"],
        "open": p.get("o"),
        "high": p.get("h"),
        "low": p.get("l"),
        "volume": p.get("v"),
    } for p in (pts or [])]
    if not points and cached and cached.get("points"):
        # Provider hiccup: keep last valid data (marked stale), retry in 60s.
        retry_at = _now() + timedelta(seconds=60)
        await _db.stock_public_history_cache.update_one(
            {"_id": cache_key}, {"$set": {"expires_at": retry_at, "stale": True, "last_error_at": _now()}})
        return {
            "symbol": sym, "range": rk, "currency": cached.get("currency"),
            "native_currency": cached.get("native_currency"), "fx": cached.get("fx"),
            "data_source": cached.get("data_source"), "data_status": "stale",
            "data_as_of": cached["cached_at"].isoformat() if cached.get("cached_at") else None,
            "points": cached["points"],
            "stats": _compute_history_stats(cached["points"], cfg["interval"]),
            "cached_until": retry_at.isoformat(),
        }
    stats = _compute_history_stats(points, cfg["interval"])

    # currency from ticker suffix (see _native_currency)
    native_currency = _native_currency(yf_sym)
    currency = native_currency
    fx_meta = None
    fx_failed = False
    if points and currency != "EUR" and not yf_sym.startswith("^"):
        points, fx_meta = await _convert_points_to_eur(points, currency, cfg)
        if points:
            currency = "EUR"
            stats = _compute_history_stats(points, cfg["interval"])
        else:
            source = "unavailable"
            fx_failed = True
            stats = _compute_history_stats([], cfg["interval"])

    # Empty results (provider hiccup) are cached for 60s only, so charts recover quickly.
    expires_at = _now() + timedelta(seconds=cfg["ttl"] if points else 60)
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
            "native_currency": native_currency,
            "fx": fx_meta,
            "data_source": source,
            "points": points,
            "stats": stats,
            "stale": False,
            "cached_at": _now(),
            "expires_at": expires_at,
        }},
        upsert=True,
    )
    return {
        "symbol": sym,
        "range": rk,
        "currency": currency,
        "native_currency": native_currency,
        "fx": fx_meta,
        "data_source": source,
        "data_status": "fresh" if source == "yfinance" else ("fx_unavailable" if fx_failed else "unavailable"),
        "data_as_of": _now().isoformat() if points else None,
        "points": points,
        "stats": stats,
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

        # Public symbol for curated-label fallback (Session 86): strip exchange
        # suffix so "ADS.DE" → "ADS", "NVDA" → "NVDA".
        pub_sym = (yf_sym or "").split(".")[0].upper()
        result: Dict[str, Any] = {
            "company_name": _pick("longName") or _pick("shortName") or COMPANY_LABELS.get(pub_sym),
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
    # US mega caps (with legal suffix used by Yahoo/Wikipedia)
    "NVDA": "NVIDIA Corporation",
    "AAPL": "Apple Inc.",
    "MSFT": "Microsoft Corporation",
    "GOOGL": "Alphabet Inc.",
    "AMZN": "Amazon.com, Inc.",
    # DAX blue chips (offizielle Handelsregister-Namen)
    "SAP":  "SAP SE",
    "SIE":  "Siemens AG",
    "ALV":  "Allianz SE",
    "DBK":  "Deutsche Bank AG",
    "IFX":  "Infineon Technologies AG",
    "RHM":  "Rheinmetall AG",
    "ADS":  "adidas AG",
    "DTE":  "Deutsche Telekom AG",
    "MUV2": "Münchener Rückversicherungs-Gesellschaft AG",
    "BAS":  "BASF SE",
    "MBG":  "Mercedes-Benz Group AG",
    "BMW":  "Bayerische Motoren Werke AG",
    "VOW3": "Volkswagen AG",
    "EOAN": "E.ON SE",
    "RWE":  "RWE AG",
    "HEN3": "Henkel AG & Co. KGaA",
    "BEI":  "Beiersdorf AG",
    "ENR":  "Siemens Energy AG",
    "DHL":  "DHL Group",
    "VNA":  "Vonovia SE",
    "FRE":  "Fresenius SE & Co. KGaA",
    "CBK":  "Commerzbank AG",
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


# ---- Analyst consensus + valuation + profitability (Session 80.76) ---------

def _yf_analyst_sync(yf_sym: str) -> Optional[Dict[str, Any]]:
    """Return analyst consensus, price targets, valuation and profitability
    metrics using yfinance only. Missing keys stay `None` — never fabricated."""
    try:
        import yfinance as yf  # type: ignore
    except Exception:  # noqa: BLE001
        return None
    try:
        t = yf.Ticker(yf_sym)
        info: Dict[str, Any] = {}
        try:
            info = t.get_info() or {}
        except Exception:  # noqa: BLE001
            try:
                info = getattr(t, "info", None) or {}
            except Exception:  # noqa: BLE001
                info = {}

        def _num(v):
            try:
                if v is None:
                    return None
                v = float(v)
                return v if v == v else None  # NaN check
            except (TypeError, ValueError):
                return None

        def _int(v):
            n = _num(v)
            return int(n) if n is not None else None

        # ---- Consensus buckets ---------------------------------------------
        buckets = {"strongBuy": None, "buy": None, "hold": None, "sell": None, "strongSell": None}
        rec_period: Optional[str] = None
        try:
            rec_df = t.recommendations
        except Exception:  # noqa: BLE001
            rec_df = None
        if rec_df is not None:
            try:
                if not rec_df.empty:
                    # yfinance now returns a period-indexed dataframe: pick the
                    # latest period row where every bucket key is present.
                    row = rec_df.iloc[0].to_dict()
                    rec_period = str(row.get("period") or rec_df.index[0])
                    for k in list(buckets.keys()):
                        if k in row:
                            buckets[k] = _int(row.get(k))
            except Exception:  # noqa: BLE001
                pass

        total_from_buckets = sum(v for v in buckets.values() if isinstance(v, int))
        num_analysts = _int(info.get("numberOfAnalystOpinions")) or (total_from_buckets or None)

        recommendations = {
            "strong_buy": buckets["strongBuy"],
            "buy": buckets["buy"],
            "hold": buckets["hold"],
            "sell": buckets["sell"],
            "strong_sell": buckets["strongSell"],
            "total": num_analysts,
            "mean": _num(info.get("recommendationMean")),
            "key": info.get("recommendationKey"),
            "period": rec_period,
        }
        # If yfinance has zero buckets AND no mean, treat as unavailable.
        has_any_bucket = any(isinstance(v, int) and v > 0 for v in buckets.values())
        has_consensus = has_any_bucket or recommendations["mean"] is not None

        # ---- Price targets --------------------------------------------------
        current_price = _num(info.get("currentPrice")) or _num(info.get("regularMarketPrice"))
        target_mean = _num(info.get("targetMeanPrice"))
        target_median = _num(info.get("targetMedianPrice"))
        target_high = _num(info.get("targetHighPrice"))
        target_low = _num(info.get("targetLowPrice"))
        upside = None
        if current_price and current_price > 0 and target_mean is not None:
            upside = round(((target_mean / current_price) - 1.0) * 100.0, 4)
        has_target = any(v is not None for v in (target_mean, target_median, target_high, target_low))
        price_target = {
            "mean": target_mean,
            "median": target_median,
            "high": target_high,
            "low": target_low,
            "current": current_price,
            "upside_pct": upside,
        }

        currency = info.get("currency")

        # ---- Valuation ------------------------------------------------------
        dividend_yield = _num(info.get("dividendYield"))
        if dividend_yield is not None:
            # yfinance today returns already-percentage values (SAP 1.36, NVDA 0.46).
            # Older mirrors returned decimals (0.0136). Only treat *very* small
            # values (<0.02 → below 2 %-decimal cutoff) as decimals to avoid
            # silently dropping legitimate low yields (e.g. NVDA 0.46 %).
            if 0 < dividend_yield < 0.02:
                dividend_yield = round(dividend_yield * 100.0, 4)
            # Guard against implausible values (>30 %) which are always upstream artefacts.
            if dividend_yield > 30:
                dividend_yield = None
        valuation = {
            "trailing_pe": _num(info.get("trailingPE")),
            "forward_pe": _num(info.get("forwardPE")),
            "price_to_sales": _num(info.get("priceToSalesTrailing12Months")),
            "price_to_book": _num(info.get("priceToBook")),
            "ev_to_ebitda": _num(info.get("enterpriseToEbitda")),
            "peg_ratio": _num(info.get("pegRatio") or info.get("trailingPegRatio")),
            "market_cap": _num(info.get("marketCap")),
            "enterprise_value": _num(info.get("enterpriseValue")),
            "dividend_yield": dividend_yield,
        }

        # ---- Profitability / Quality ---------------------------------------
        def _pct(v):
            n = _num(v)
            return round(n * 100.0, 4) if n is not None else None

        profitability = {
            "revenue_growth": _pct(info.get("revenueGrowth")),
            "earnings_growth": _pct(info.get("earningsGrowth")),
            "operating_margin": _pct(info.get("operatingMargins")),
            "profit_margin": _pct(info.get("profitMargins")),
            "return_on_equity": _pct(info.get("returnOnEquity")),
            "free_cashflow": _num(info.get("freeCashflow")),
            "debt_to_equity": _num(info.get("debtToEquity")),
        }

        return {
            "currency": currency,
            "recommendations": recommendations,
            "price_target": price_target,
            "valuation": valuation,
            "profitability": profitability,
            "has_consensus": has_consensus,
            "has_target": has_target,
        }
    except Exception as exc:  # noqa: BLE001
        logger.info("yfinance analyst %s error: %s", yf_sym, str(exc)[:120])
        return None


@router.get("/stocks/{symbol}/analyst")
async def stock_analyst(symbol: str) -> Dict[str, Any]:
    """Session 80.76 — Analyst consensus, price targets, valuation & profitability.

    Only real yfinance values. Missing fields stay `null`. Cached 6 h in Mongo.
    """
    sym = _check(symbol)

    cached = await _db.stock_public_analyst_cache.find_one({"_id": sym})
    if cached and cached.get("expires_at") and cached["expires_at"] > _now():
        payload = cached.get("data") or {}
        return {
            "symbol": sym,
            "data_source": cached.get("data_source", "cache"),
            "data_updated_at": cached.get("cached_at").isoformat() if cached.get("cached_at") else None,
            "cached_until": cached["expires_at"].isoformat(),
            **payload,
        }

    yf_sym = ALLOWED.get(sym, sym)
    data = await asyncio.to_thread(_yf_analyst_sync, yf_sym)
    source = "yfinance" if data else "unavailable"
    payload = data or {
        "currency": None,
        "recommendations": {
            "strong_buy": None, "buy": None, "hold": None, "sell": None, "strong_sell": None,
            "total": None, "mean": None, "key": None, "period": None,
        },
        "price_target": {
            "mean": None, "median": None, "high": None, "low": None,
            "current": None, "upside_pct": None,
        },
        "valuation": {
            "trailing_pe": None, "forward_pe": None, "price_to_sales": None,
            "price_to_book": None, "ev_to_ebitda": None, "peg_ratio": None,
            "market_cap": None, "enterprise_value": None, "dividend_yield": None,
        },
        "profitability": {
            "revenue_growth": None, "earnings_growth": None,
            "operating_margin": None, "profit_margin": None, "return_on_equity": None,
            "free_cashflow": None, "debt_to_equity": None,
        },
        "has_consensus": False,
        "has_target": False,
    }

    now = _now()
    expires_at = now + timedelta(seconds=ANALYST_TTL_S)
    await _db.stock_public_analyst_cache.update_one(
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


_FUND_MONEY = ("market_cap", "eps", "book_value", "day_high", "day_low",
               "fifty_two_week_high", "fifty_two_week_low", "previous_close")


async def _fundamentals_to_eur(resp: Dict[str, Any]) -> Dict[str, Any]:
    """Converts monetary fundamentals to EUR (native values preserved under `native`)."""
    from services.fx_service import eur_rate, normalize_ccy, fx_meta
    ccy = resp.get("currency")
    base, factor = normalize_ccy(ccy)
    info = await eur_rate(base) if base else None
    native = {k: resp.get(k) for k in _FUND_MONEY if k in resp}
    out = {**resp, "native": native, "original_currency": ccy,
           "currency": "EUR" if info else None, "fx": fx_meta(info, ccy)}
    for k, v in native.items():
        out[k] = round(float(v) / factor / info["rate"], 4) if info and v is not None else None
    if not info and any(v is not None for v in native.values()):
        out["fx_status"] = "fx_unavailable" if base else "currency_unknown"
    return out


@router.get("/stocks/{symbol}/fundamentals")
async def stock_fundamentals(symbol: str, display: Optional[str] = Query(default=None)) -> Dict[str, Any]:
    resp = await _stock_fundamentals_native(symbol)
    if (display or "").upper() == "EUR":
        return await _fundamentals_to_eur(resp)
    return resp


async def _stock_fundamentals_native(symbol: str) -> Dict[str, Any]:
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

    yf_sym = ALLOWED.get(sym, sym)
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


# ---- Dividends (Session 80.77 · Tool-Paket 3/4) ----------------------------

def _ts_to_iso_date(ts) -> Optional[str]:
    """UNIX seconds timestamp → ISO date string (YYYY-MM-DD). None on failure."""
    if ts is None:
        return None
    try:
        n = float(ts)
        if not (n == n) or n <= 0:
            return None
        return datetime.fromtimestamp(n, tz=timezone.utc).date().isoformat()
    except (TypeError, ValueError, OSError):
        return None


def _yf_dividends_sync(yf_sym: str) -> Optional[Dict[str, Any]]:
    """Real dividend history + summary via yfinance. No fabrication."""
    try:
        import yfinance as yf  # type: ignore
    except Exception:  # noqa: BLE001
        return None
    try:
        t = yf.Ticker(yf_sym)
        try:
            info = t.get_info() or {}
        except Exception:  # noqa: BLE001
            info = getattr(t, "info", None) or {}

        def _num(v):
            try:
                if v is None:
                    return None
                v = float(v)
                return v if v == v else None
            except (TypeError, ValueError):
                return None

        # ---- Dividend time series ------------------------------------------
        series = None
        try:
            series = t.dividends
        except Exception:  # noqa: BLE001
            series = None

        history: List[Dict[str, Any]] = []
        has_any = False
        latest_year: Optional[int] = None
        latest_pay_iso: Optional[str] = None
        if series is not None:
            try:
                if series is not None and not series.empty:
                    has_any = True
                    yearly = series.groupby(series.index.year).agg(["sum", "count"])
                    now_year = _now().year
                    now_date = _now().date()
                    latest_pay_dt = series.index[-1]
                    latest_pay_iso = latest_pay_dt.date().isoformat()
                    latest_year = int(latest_pay_dt.year)
                    for year, row in yearly.tail(12).iterrows():
                        total = float(row["sum"])
                        count = int(row["count"])
                        complete = True
                        if int(year) == now_year:
                            # Current calendar year — if we haven't crossed the
                            # last observed pay date yet or if more quarters are
                            # still due, mark as incomplete.
                            complete = (latest_pay_dt.date() < now_date and now_date.month >= 12)
                            if not complete:
                                # Heuristic: if the ticker paid quarterly last year
                                # and count so far < 4 this year, incomplete.
                                pass
                        history.append({
                            "year": int(year),
                            "total": round(total, 4),
                            "count": count,
                            "complete": complete,
                        })
            except Exception as exc:  # noqa: BLE001
                logger.info("yfinance dividends series %s error: %s", yf_sym, str(exc)[:120])

        # ---- Info-level summary --------------------------------------------
        div_yield_raw = _num(info.get("dividendYield"))
        # yfinance today returns pct (e.g. 1.36 for SAP). Only <0.02 → decimal.
        if div_yield_raw is not None and 0 < div_yield_raw < 0.02:
            div_yield_raw = round(div_yield_raw * 100.0, 4)
        if div_yield_raw is not None and div_yield_raw > 30:
            div_yield_raw = None

        payout_raw = _num(info.get("payoutRatio"))
        payout_pct = round(payout_raw * 100.0, 4) if payout_raw is not None else None

        fivey_avg = _num(info.get("fiveYearAvgDividendYield"))
        # fiveYearAvgDividendYield is returned already in % (e.g. 0.5, 1.29, 4.8).
        # Only normalize if suspiciously fractional (<0.02).
        if fivey_avg is not None and 0 < fivey_avg < 0.02:
            fivey_avg = round(fivey_avg * 100.0, 4)

        summary = {
            "dividend_rate_annual": _num(info.get("dividendRate")),
            "dividend_yield_pct": div_yield_raw,
            "payout_ratio_pct": payout_pct,
            "trailing_annual_rate": _num(info.get("trailingAnnualDividendRate")),
            "five_year_avg_yield_pct": fivey_avg,
            "last_dividend_value": _num(info.get("lastDividendValue")),
            "last_dividend_date": _ts_to_iso_date(info.get("lastDividendDate")),
            "next_ex_dividend_date": _ts_to_iso_date(info.get("exDividendDate")),
        }

        # ---- Growth / CAGR --------------------------------------------------
        growth = {"one_year_pct": None, "cagr_3y_pct": None, "cagr_5y_pct": None, "base_end_year": None}
        if history:
            # Only use *completed* years (exclude current-year partial if present).
            complete_years = [h for h in history if h["complete"] and h["total"] > 0]
            if len(complete_years) >= 2:
                base = complete_years[-1]
                growth["base_end_year"] = base["year"]
                # 1Y growth
                if len(complete_years) >= 2:
                    y0 = complete_years[-2]
                    if y0["total"] > 0:
                        growth["one_year_pct"] = round((base["total"] / y0["total"] - 1.0) * 100.0, 2)
                # 3Y CAGR
                if len(complete_years) >= 4:
                    y3 = complete_years[-4]
                    if y3["total"] > 0:
                        growth["cagr_3y_pct"] = round(((base["total"] / y3["total"]) ** (1 / 3) - 1.0) * 100.0, 2)
                # 5Y CAGR
                if len(complete_years) >= 6:
                    y5 = complete_years[-6]
                    if y5["total"] > 0:
                        growth["cagr_5y_pct"] = round(((base["total"] / y5["total"]) ** (1 / 5) - 1.0) * 100.0, 2)

        currency = info.get("currency")
        # Decide "has_dividends": any historic payment OR non-null rate/yield.
        has_dividends = bool(
            has_any or (summary["dividend_rate_annual"] and summary["dividend_rate_annual"] > 0)
            or (summary["dividend_yield_pct"] and summary["dividend_yield_pct"] > 0)
        )

        return {
            "currency": currency,
            "has_dividends": has_dividends,
            "summary": summary,
            "history": history,
            "growth": growth,
            "latest_pay_date": latest_pay_iso,
        }
    except Exception as exc:  # noqa: BLE001
        logger.info("yfinance dividends %s error: %s", yf_sym, str(exc)[:120])
        return None


@router.get("/stocks/{symbol}/dividends")
async def stock_dividends(symbol: str) -> Dict[str, Any]:
    sym = _check(symbol)
    cached = await _db.stock_public_dividends_cache.find_one({"_id": sym})
    if cached and cached.get("expires_at") and cached["expires_at"] > _now():
        payload = cached.get("data") or {}
        return {
            "symbol": sym,
            "data_source": cached.get("data_source", "cache"),
            "data_updated_at": cached.get("cached_at").isoformat() if cached.get("cached_at") else None,
            "cached_until": cached["expires_at"].isoformat(),
            **payload,
        }
    yf_sym = ALLOWED.get(sym, sym)
    data = await asyncio.to_thread(_yf_dividends_sync, yf_sym)
    source = "yfinance" if data else "unavailable"
    payload = data or {
        "currency": None, "has_dividends": False,
        "summary": {
            "dividend_rate_annual": None, "dividend_yield_pct": None, "payout_ratio_pct": None,
            "trailing_annual_rate": None, "five_year_avg_yield_pct": None,
            "last_dividend_value": None, "last_dividend_date": None, "next_ex_dividend_date": None,
        },
        "history": [], "growth": {"one_year_pct": None, "cagr_3y_pct": None, "cagr_5y_pct": None, "base_end_year": None},
        "latest_pay_date": None,
    }
    now = _now()
    expires_at = now + timedelta(seconds=DIVIDENDS_TTL_S)
    await _db.stock_public_dividends_cache.update_one(
        {"_id": sym},
        {"$set": {"_id": sym, "symbol": sym, "yf_symbol": yf_sym,
                  "data_source": source, "data": payload,
                  "cached_at": now, "expires_at": expires_at}},
        upsert=True,
    )
    return {"symbol": sym, "data_source": source,
            "data_updated_at": now.isoformat(),
            "cached_until": expires_at.isoformat(), **payload}


# ---- Earnings + important dates (Session 80.77 · Tool-Paket 3/4) -----------

def _yf_earnings_sync(yf_sym: str) -> Optional[Dict[str, Any]]:
    """Real earnings history + next-earnings estimate + calendar via yfinance."""
    try:
        import yfinance as yf  # type: ignore
    except Exception:  # noqa: BLE001
        return None
    try:
        t = yf.Ticker(yf_sym)
        try:
            info = t.get_info() or {}
        except Exception:  # noqa: BLE001
            info = getattr(t, "info", None) or {}

        def _num(v):
            try:
                if v is None:
                    return None
                v = float(v)
                return v if v == v else None
            except (TypeError, ValueError):
                return None

        currency = info.get("currency")
        history: List[Dict[str, Any]] = []
        next_row: Optional[Dict[str, Any]] = None

        try:
            edf = t.get_earnings_dates(limit=12)
        except Exception:  # noqa: BLE001
            edf = None

        if edf is not None:
            try:
                if not edf.empty:
                    now_utc = _now()
                    # Sort by index desc (most recent first) — yfinance already does this.
                    for idx, row in edf.iterrows():
                        try:
                            dt = idx.to_pydatetime() if hasattr(idx, "to_pydatetime") else idx
                            if getattr(dt, "tzinfo", None) is None:
                                dt = dt.replace(tzinfo=timezone.utc)
                            date_iso = dt.astimezone(timezone.utc).date().isoformat()
                        except Exception:  # noqa: BLE001
                            continue
                        est = _num(row.get("EPS Estimate"))
                        act = _num(row.get("Reported EPS"))
                        surp = _num(row.get("Surprise(%)"))
                        rec = {
                            "date": date_iso,
                            "eps_estimate": est,
                            "eps_actual": act,
                            "surprise_pct": surp,
                        }
                        if act is None and dt > now_utc:
                            # Future quarter — take the most recent (closest) as next.
                            if next_row is None or (dt < datetime.fromisoformat(next_row["_dt"])):
                                next_row = {**rec, "_dt": dt.astimezone(timezone.utc).isoformat()}
                        elif act is not None:
                            history.append(rec)
            except Exception as exc:  # noqa: BLE001
                logger.info("yfinance earnings_dates %s error: %s", yf_sym, str(exc)[:120])

        # Keep only 8 most-recent completed quarters (already desc).
        history = history[:8]

        # ---- Calendar (next earnings + dividend + ex-div) ------------------
        important: Dict[str, Any] = {
            "next_earnings_date": None,
            "next_earnings_date_end": None,
            "next_earnings_is_range": False,
            "dividend_payment_date": None,
            "ex_dividend_date": None,
        }
        est_pack: Dict[str, Any] = {
            "eps_estimate_avg": None, "eps_estimate_high": None, "eps_estimate_low": None,
            "revenue_estimate_avg": None, "revenue_estimate_high": None, "revenue_estimate_low": None,
        }
        try:
            cal = t.calendar
        except Exception:  # noqa: BLE001
            cal = None
        if isinstance(cal, dict) and cal:
            ed = cal.get("Earnings Date")
            if isinstance(ed, list) and ed:
                first, last = ed[0], ed[-1]
                try:
                    important["next_earnings_date"] = first.isoformat() if hasattr(first, "isoformat") else str(first)
                    important["next_earnings_date_end"] = last.isoformat() if hasattr(last, "isoformat") else str(last)
                    important["next_earnings_is_range"] = (important["next_earnings_date"] != important["next_earnings_date_end"])
                except Exception:  # noqa: BLE001
                    pass
            for src, dst in (
                ("Dividend Date", "dividend_payment_date"),
                ("Ex-Dividend Date", "ex_dividend_date"),
            ):
                v = cal.get(src)
                if v is not None:
                    try:
                        important[dst] = v.isoformat() if hasattr(v, "isoformat") else str(v)
                    except Exception:  # noqa: BLE001
                        pass
            est_pack["eps_estimate_avg"] = _num(cal.get("Earnings Average"))
            est_pack["eps_estimate_high"] = _num(cal.get("Earnings High"))
            est_pack["eps_estimate_low"] = _num(cal.get("Earnings Low"))
            est_pack["revenue_estimate_avg"] = _num(cal.get("Revenue Average"))
            est_pack["revenue_estimate_high"] = _num(cal.get("Revenue High"))
            est_pack["revenue_estimate_low"] = _num(cal.get("Revenue Low"))

        # Fallback for next-earnings date from info earnings timestamps.
        if not important["next_earnings_date"]:
            ts_start = info.get("earningsTimestampStart")
            ts_end = info.get("earningsTimestampEnd")
            ds = _ts_to_iso_date(ts_start)
            de = _ts_to_iso_date(ts_end)
            if ds:
                important["next_earnings_date"] = ds
                important["next_earnings_date_end"] = de or ds
                important["next_earnings_is_range"] = bool(de and de != ds)

        # ---- Merge next-quarter estimate into next_row --------------------
        next_out: Optional[Dict[str, Any]] = None
        if next_row or important["next_earnings_date"]:
            date_v = (next_row or {}).get("date") or important["next_earnings_date"]
            next_out = {
                "date": date_v,
                "date_end": important["next_earnings_date_end"] or date_v,
                "is_range": important["next_earnings_is_range"],
                "eps_estimate": (next_row or {}).get("eps_estimate") if next_row else est_pack["eps_estimate_avg"],
                "estimate_avg": est_pack["eps_estimate_avg"],
                "estimate_high": est_pack["eps_estimate_high"],
                "estimate_low": est_pack["eps_estimate_low"],
                "revenue_estimate_avg": est_pack["revenue_estimate_avg"],
                "revenue_estimate_high": est_pack["revenue_estimate_high"],
                "revenue_estimate_low": est_pack["revenue_estimate_low"],
            }

        # Provider caveat: yfinance does NOT reliably return REPORTED quarterly
        # revenue on the equity endpoints we already query. We deliberately
        # expose only the estimate (average/high/low), never a fabricated actual.
        return {
            "currency": currency,
            "history": history,
            "next": next_out,
            "important_dates": important,
            "revenue_reported_available": False,
        }
    except Exception as exc:  # noqa: BLE001
        logger.info("yfinance earnings %s error: %s", yf_sym, str(exc)[:120])
        return None


@router.get("/stocks/{symbol}/earnings")
async def stock_earnings(symbol: str) -> Dict[str, Any]:
    sym = _check(symbol)
    cached = await _db.stock_public_earnings_cache.find_one({"_id": sym})
    if cached and cached.get("expires_at") and cached["expires_at"] > _now():
        payload = cached.get("data") or {}
        return {
            "symbol": sym,
            "data_source": cached.get("data_source", "cache"),
            "data_updated_at": cached.get("cached_at").isoformat() if cached.get("cached_at") else None,
            "cached_until": cached["expires_at"].isoformat(),
            **payload,
        }
    yf_sym = ALLOWED.get(sym, sym)
    data = await asyncio.to_thread(_yf_earnings_sync, yf_sym)
    source = "yfinance" if data else "unavailable"
    payload = data or {
        "currency": None, "history": [], "next": None,
        "important_dates": {
            "next_earnings_date": None, "next_earnings_date_end": None,
            "next_earnings_is_range": False,
            "dividend_payment_date": None, "ex_dividend_date": None,
        },
        "revenue_reported_available": False,
    }
    now = _now()
    expires_at = now + timedelta(seconds=EARNINGS_TTL_S)
    await _db.stock_public_earnings_cache.update_one(
        {"_id": sym},
        {"$set": {"_id": sym, "symbol": sym, "yf_symbol": yf_sym,
                  "data_source": source, "data": payload,
                  "cached_at": now, "expires_at": expires_at}},
        upsert=True,
    )
    return {"symbol": sym, "data_source": source,
            "data_updated_at": now.isoformat(),
            "cached_until": expires_at.isoformat(), **payload}


# ---- Research suite (Session 80.79 · Tool-Paket 5) -------------------------

RESEARCH_TTL_S = 6 * 60 * 60

# Rule thresholds for the compact research-summary strip.
# Documented here so the classification is fully reproducible.
_TAG_THRESHOLDS = {
    "valuation": {"low": 15.0, "high": 25.0},        # trailing_pe cutoffs
    "growth": {"low": 0.0, "high": 15.0},            # revenue_growth in %
    "profitability": {"low": 10.0, "high": 25.0},    # operating_margin in %
    "dividend": {"low": 1.0, "high": 3.0},            # dividend_yield in %
    "risk": {"low": 25.0, "high": 40.0},              # annualised vol in %
}


def _yf_financials_sync(yf_sym: str) -> Optional[Dict[str, Any]]:
    """Real 5-year annual income statement + cash flow. Returns per-fiscal-year
    rows with revenue, net_income, eps, free_cashflow, operating_margin_pct."""
    try:
        import yfinance as yf  # type: ignore
    except Exception:  # noqa: BLE001
        return None
    try:
        t = yf.Ticker(yf_sym)
        try:
            inc = t.income_stmt
        except Exception:  # noqa: BLE001
            inc = None
        try:
            cf = t.cashflow
        except Exception:  # noqa: BLE001
            cf = None

        def _row(df, key):
            if df is None:
                return {}
            try:
                if key in df.index:
                    return df.loc[key].to_dict()
            except Exception:  # noqa: BLE001
                pass
            return {}

        rev = _row(inc, "Total Revenue")
        ni = _row(inc, "Net Income")
        op = _row(inc, "Operating Income")
        eps = _row(inc, "Basic EPS") or _row(inc, "Diluted EPS")
        fcf = _row(cf, "Free Cash Flow")

        cols = set()
        for d in (rev, ni, op, eps, fcf):
            cols.update(d.keys())
        if not cols:
            return None

        def _num(v):
            try:
                if v is None:
                    return None
                v = float(v)
                return v if v == v else None
            except (TypeError, ValueError):
                return None

        rows: List[Dict[str, Any]] = []
        for ts in sorted(cols):
            fy = getattr(ts, "year", None) or (ts.year if hasattr(ts, "year") else None)
            fy_iso = ts.date().isoformat() if hasattr(ts, "date") else str(ts)
            rev_v = _num(rev.get(ts))
            op_v = _num(op.get(ts))
            op_margin = None
            if rev_v and rev_v > 0 and op_v is not None:
                op_margin = round((op_v / rev_v) * 100.0, 4)
            rows.append({
                "fiscal_year": fy,
                "fiscal_period_end": fy_iso,
                "revenue": rev_v,
                "net_income": _num(ni.get(ts)),
                "eps": _num(eps.get(ts)),
                "free_cashflow": _num(fcf.get(ts)),
                "operating_margin_pct": op_margin,
            })
        # Keep last 5 completed fiscal years, chronological order.
        return {"annual": rows[-5:]}
    except Exception as exc:  # noqa: BLE001
        logger.info("yfinance financials %s error: %s", yf_sym, str(exc)[:120])
        return None


def _compute_drawdown_series(closes: List[float], dates: List[str]) -> Dict[str, Any]:
    if not closes or len(closes) < 2:
        return {"current_dd_pct": None, "max_dd_pct": None, "series": []}
    series: List[Dict[str, Any]] = []
    running = closes[0]
    max_dd = 0.0
    for d, c in zip(dates, closes):
        if c > running:
            running = c
        dd = (c / running - 1.0) if running > 0 else 0.0
        if dd < max_dd:
            max_dd = dd
        series.append({"t": d, "dd": round(dd * 100.0, 4)})
    cur_dd = series[-1]["dd"]
    return {"current_dd_pct": cur_dd, "max_dd_pct": round(max_dd * 100.0, 4), "series": series}


def _tag(value: Optional[float], key: str, invert: bool = False) -> Optional[str]:
    """Return 'niedrig' / 'mittel' / 'hoch' based on the documented thresholds.
    invert=True flips the mapping (higher raw value → lower label; used for risk
    only via caller). Missing value → None (not rendered)."""
    if value is None:
        return None
    t = _TAG_THRESHOLDS.get(key)
    if not t:
        return None
    lo, hi = t["low"], t["high"]
    if value < lo:
        base = "niedrig"
    elif value > hi:
        base = "hoch"
    else:
        base = "mittel"
    return base


def _build_investment_case(fin_rows, prof, div, risk, next_earn):
    ops, risks, watch = [], [], []
    # Growth from financials — need at least 2 completed years with revenue.
    revs = [r["revenue"] for r in (fin_rows or []) if r.get("revenue")]
    if len(revs) >= 3:
        if revs[-1] > revs[-3]:
            ops.append({"text": f"Umsatz über die letzten drei Geschäftsjahre gewachsen (von {revs[-3]/1e9:.1f} Mrd auf {revs[-1]/1e9:.1f} Mrd).", "source": "financials"})
        elif revs[-1] < revs[-3]:
            risks.append({"text": f"Umsatz über die letzten drei Geschäftsjahre rückläufig (von {revs[-3]/1e9:.1f} Mrd auf {revs[-1]/1e9:.1f} Mrd).", "source": "financials"})
    # Profitability
    if isinstance(prof, dict) and prof.get("operating_margin") is not None:
        om = prof["operating_margin"]
        if om >= 25:
            ops.append({"text": f"Operative Marge liegt bei {om:.1f} %.", "source": "fundamentals"})
        elif om < 5:
            risks.append({"text": f"Operative Marge liegt bei nur {om:.1f} %.", "source": "fundamentals"})
    # Risk from vola vs threshold
    if isinstance(risk, dict) and risk.get("volatility_annual_pct") is not None:
        v = risk["volatility_annual_pct"]
        if v > 40:
            risks.append({"text": f"Historische annualisierte Volatilität liegt bei {v:.1f} % (1J).", "source": "history"})
    # Max drawdown context
    if isinstance(risk, dict) and risk.get("max_drawdown_pct") is not None:
        mdd = risk["max_drawdown_pct"]
        if mdd < -30:
            risks.append({"text": f"Größter historischer Rückschlag im betrachteten Zeitraum: {mdd:.1f} %.", "source": "history"})
    # Dividend
    if isinstance(div, dict) and div.get("dividend_yield_pct") is not None:
        dy = div["dividend_yield_pct"]
        if dy >= 3:
            ops.append({"text": f"Dividendenrendite bei {dy:.2f} %.", "source": "dividends"})
        elif dy == 0 or dy is None:
            pass  # neither pro nor con
    # Next earnings — always watchable if known.
    if next_earn and next_earn.get("date"):
        watch.append({"text": f"Nächster Earnings-Termin am {next_earn['date']}.", "source": "earnings"})
    return {"opportunities": ops[:5], "risks": risks[:5], "watch": watch[:3]}


@router.get("/stocks/{symbol}/research")
async def stock_research(symbol: str) -> Dict[str, Any]:
    """Bundled research payload: 5y financials, drawdown series (1y/3y/5y),
    rule-based investment case, transparency block and summary tags."""
    sym = _check(symbol)
    cached = await _db.stock_public_research_cache.find_one({"_id": sym})
    if cached and cached.get("expires_at") and cached["expires_at"] > _now():
        payload = cached.get("data") or {}
        return {"symbol": sym, "data_source": cached.get("data_source", "cache"),
                "data_updated_at": cached.get("cached_at").isoformat() if cached.get("cached_at") else None,
                "cached_until": cached["expires_at"].isoformat(), **payload}

    yf_sym = ALLOWED.get(sym, sym)
    # Concurrent fetch: financials, fundamentals meta, dividends summary,
    # earnings next block, and three history ranges for drawdowns.
    fin_task = asyncio.to_thread(_yf_financials_sync, yf_sym)
    meta_task = asyncio.to_thread(_yf_compare_meta_sync, yf_sym)
    div_task = asyncio.to_thread(_yf_dividends_sync, yf_sym)
    earn_task = asyncio.to_thread(_yf_earnings_sync, yf_sym)
    h1_task = asyncio.to_thread(_yf_history_sync, yf_sym, "1y", "1d")
    h3_task = asyncio.to_thread(_yf_history_sync, yf_sym, "3y", "1d")
    h5_task = asyncio.to_thread(_yf_history_sync, yf_sym, "5y", "1d")
    fin, meta, div, earn, h1, h3, h5 = await asyncio.gather(
        fin_task, meta_task, div_task, earn_task, h1_task, h3_task, h5_task,
        return_exceptions=True,
    )
    fin = fin if isinstance(fin, dict) else None
    meta = meta if isinstance(meta, dict) else {}
    div_data = div if isinstance(div, dict) else None
    earn_data = earn if isinstance(earn, dict) else None

    def _dd_for(h):
        if isinstance(h, Exception) or not h:
            return {"current_dd_pct": None, "max_dd_pct": None, "series": []}
        closes = [p["c"] for p in h if p.get("c")]
        dates = [p["t"][:10] for p in h if p.get("c")]
        return _compute_drawdown_series(closes, dates)

    drawdown = {"1y": _dd_for(h1), "3y": _dd_for(h3), "5y": _dd_for(h5)}

    # Risk from 1y history for tags & investment case
    risk_1y: Dict[str, Any] = {}
    if not isinstance(h1, Exception) and h1:
        closes = [p["c"] for p in h1 if p.get("c")]
        risk_1y = _compute_risk(closes, 252)

    # Summary tags — only if underlying data available
    tags: Dict[str, Optional[str]] = {}
    tags["valuation"] = _tag(meta.get("trailing_pe"), "valuation")
    tags["growth"] = _tag(meta.get("revenue_growth_pct"), "growth")
    tags["profitability"] = _tag(meta.get("profit_margin_pct"), "profitability")
    div_yield = (div_data or {}).get("summary", {}).get("dividend_yield_pct") if div_data else None
    tags["dividend"] = _tag(div_yield, "dividend") if div_yield is not None else None
    tags["risk"] = _tag(risk_1y.get("volatility_annual_pct"), "risk")

    # Investment case
    prof_hint = {"operating_margin": None}
    if fin and fin.get("annual"):
        # Use most recent op margin from real financials
        last = fin["annual"][-1] if fin["annual"] else {}
        prof_hint["operating_margin"] = last.get("operating_margin_pct")
    case = _build_investment_case(
        (fin or {}).get("annual"),
        prof_hint,
        {"dividend_yield_pct": div_yield},
        risk_1y,
        (earn_data or {}).get("next") if earn_data else None,
    )

    # Data quality block
    exch = None
    price_at = None
    try:
        import yfinance as yf  # type: ignore
        fi = yf.Ticker(yf_sym).fast_info
        exch = getattr(fi, "exchange", None)
    except Exception:  # noqa: BLE001
        pass
    data_quality = {
        "price_source": "yfinance",
        "fundamentals_source": "yfinance",
        "exchange": exch,
        "currency": meta.get("currency"),
        "is_delayed_notice": "Kurse können zeitverzögert sein.",
        "history_start": (h5[0]["t"] if not isinstance(h5, Exception) and h5 else None),
        "benchmark": BENCHMARK_FOR.get(sym, "NDX"),
    }

    payload = {
        "currency": meta.get("currency"),
        "financials": (fin or {}).get("annual", []),
        "drawdown": drawdown,
        "investment_case": case,
        "summary_tags": tags,
        "data_quality": data_quality,
        "risk_1y": risk_1y,
        "valuation_snapshot": {
            "trailing_pe": meta.get("trailing_pe"),
            "forward_pe": meta.get("forward_pe"),
            "price_to_sales": meta.get("price_to_sales"),
            "price_to_book": meta.get("price_to_book"),
        },
    }

    now = _now()
    expires_at = now + timedelta(seconds=RESEARCH_TTL_S)
    await _db.stock_public_research_cache.update_one(
        {"_id": sym},
        {"$set": {"_id": sym, "symbol": sym, "yf_symbol": yf_sym,
                  "data_source": "yfinance", "data": payload,
                  "cached_at": now, "expires_at": expires_at,
                  "thresholds": _TAG_THRESHOLDS}},
        upsert=True,
    )
    return {"symbol": sym, "data_source": "yfinance",
            "data_updated_at": now.isoformat(),
            "cached_until": expires_at.isoformat(),
            "thresholds": _TAG_THRESHOLDS, **payload}




# ---- Compare & Risk (Session 80.78 · Tool-Paket 4/4) -----------------------

# Peers exposed to the compare selector — all ALLOWED equities except indices.
COMPARE_PEERS: List[str] = ["NVDA", "AAPL", "MSFT", "GOOGL", "AMZN",
                            "SAP", "SIE", "ALV", "DBK", "IFX", "RHM"]
COMPARE_BENCHMARKS: Dict[str, str] = {"NDX": "Nasdaq-100", "DAX": "DAX", "SPX": "S&P 500"}
# S&P is not yet in ALLOWED; keep a private mapping only for compare.
_COMPARE_BENCHMARK_YF: Dict[str, str] = {"NDX": "^NDX", "DAX": "^GDAXI", "SPX": "^GSPC"}


def _compute_risk(closes: List[float], trading_days: int) -> Dict[str, Any]:
    """Volatility (annualised), max drawdown, total & annualised return.
    Uses simple daily returns. Returns None fields when data is insufficient."""
    if not closes or len(closes) < 5:
        return {"volatility_annual_pct": None, "max_drawdown_pct": None,
                "total_return_pct": None, "annual_return_pct": None,
                "period_high": None, "period_low": None}
    import math
    rets = []
    prev = closes[0]
    for c in closes[1:]:
        if prev and prev > 0:
            rets.append(c / prev - 1.0)
        prev = c
    if not rets:
        return {"volatility_annual_pct": None, "max_drawdown_pct": None,
                "total_return_pct": None, "annual_return_pct": None,
                "period_high": None, "period_low": None}
    mean = sum(rets) / len(rets)
    var = sum((r - mean) ** 2 for r in rets) / max(1, len(rets) - 1)
    std_daily = math.sqrt(var)
    vol_ann = std_daily * math.sqrt(trading_days) * 100.0

    running_max = closes[0]
    max_dd = 0.0
    for c in closes:
        if c > running_max:
            running_max = c
        if running_max > 0:
            dd = c / running_max - 1.0
            if dd < max_dd:
                max_dd = dd

    total_ret = (closes[-1] / closes[0] - 1.0) * 100.0 if closes[0] > 0 else None
    years = max(len(closes) / float(trading_days), 1 / 12)
    ann_ret = None
    if closes[0] > 0 and closes[-1] > 0:
        ann_ret = ((closes[-1] / closes[0]) ** (1 / years) - 1.0) * 100.0

    return {
        "volatility_annual_pct": round(vol_ann, 4),
        "max_drawdown_pct": round(max_dd * 100.0, 4),
        "total_return_pct": round(total_ret, 4) if total_ret is not None else None,
        "annual_return_pct": round(ann_ret, 4) if ann_ret is not None else None,
        "period_high": round(max(closes), 4),
        "period_low": round(min(closes), 4),
    }


def _compute_beta(sym_rets: List[float], bench_rets: List[float]) -> Optional[float]:
    """cov(sym, bench) / var(bench). Requires len >= 20. None otherwise."""
    n = min(len(sym_rets), len(bench_rets))
    if n < 20:
        return None
    s = sym_rets[-n:]
    b = bench_rets[-n:]
    ms = sum(s) / n
    mb = sum(b) / n
    cov = sum((s[i] - ms) * (b[i] - mb) for i in range(n)) / max(1, n - 1)
    var_b = sum((b[i] - mb) ** 2 for i in range(n)) / max(1, n - 1)
    if var_b <= 0:
        return None
    return round(cov / var_b, 4)


def _yf_daily_closes_sync(yf_sym: str, period: str, interval: str) -> Optional[List[dict]]:
    """Daily (or weekly for max) close series for compare & risk math."""
    return _yf_history_sync(yf_sym, period, interval)


def _yf_compare_meta_sync(yf_sym: str) -> Dict[str, Any]:
    """One-shot yfinance meta pull used for the fundamentals row + 52w high/low."""
    try:
        import yfinance as yf  # type: ignore
    except Exception:  # noqa: BLE001
        return {}
    try:
        t = yf.Ticker(yf_sym)
        try:
            info = t.get_info() or {}
        except Exception:  # noqa: BLE001
            info = getattr(t, "info", None) or {}
    except Exception:  # noqa: BLE001
        return {}

    def _num(v):
        try:
            if v is None:
                return None
            v = float(v)
            return v if v == v else None
        except (TypeError, ValueError):
            return None

    def _pct(v):
        n = _num(v)
        return round(n * 100.0, 4) if n is not None else None

    dy = _num(info.get("dividendYield"))
    if dy is not None and 0 < dy < 0.02:
        dy = round(dy * 100.0, 4)
    if dy is not None and dy > 30:
        dy = None
    payout = _num(info.get("payoutRatio"))
    return {
        "company_name": info.get("longName") or info.get("shortName"),
        "currency": info.get("currency"),
        "current_price": _num(info.get("currentPrice")) or _num(info.get("regularMarketPrice")),
        "market_cap": _num(info.get("marketCap")),
        "trailing_pe": _num(info.get("trailingPE")),
        "forward_pe": _num(info.get("forwardPE")),
        "price_to_sales": _num(info.get("priceToSalesTrailing12Months")),
        "price_to_book": _num(info.get("priceToBook")),
        "dividend_yield_pct": dy,
        "payout_ratio_pct": round(payout * 100.0, 4) if payout is not None else None,
        "revenue_growth_pct": _pct(info.get("revenueGrowth")),
        "earnings_growth_pct": _pct(info.get("earningsGrowth")),
        "profit_margin_pct": _pct(info.get("profitMargins")),
        "return_on_equity_pct": _pct(info.get("returnOnEquity")),
        "debt_to_equity": _num(info.get("debtToEquity")),
        "beta_provider": _num(info.get("beta")),
        "fifty_two_week_high": _num(info.get("fiftyTwoWeekHigh")),
        "fifty_two_week_low": _num(info.get("fiftyTwoWeekLow")),
    }


@router.get("/stocks/bundle")
async def stocks_bundle(
    symbols: str = Query(..., description="Comma-separated tickers"),
    include_dividends: bool = Query(default=False, description="Include dividend summary + history"),
) -> Dict[str, Any]:
    """Session 80.99/81.00 — Batched Fundamentals+Dividends-Bundle.

    Ein einziger HTTP-Request liefert Fundamentals (und optional Dividenden-
    Kennzahlen inkl. bis zu 12-Jahres-Historie) für bis zu 12 Ticker.
    Wiederverwendet die bestehenden Caches:
      * `stock_public_fundamentals_cache` (TTL 6h)
      * `stock_public_dividends_cache` via `stock_dividends()` (TTL 12h)
    Kein Live-yfinance-Call pro Ticker sobald warm — auch bei
    `include_dividends=true` bleibt das Request-Budget konstant.
    """
    raw = [s.strip().upper() for s in (symbols or "").split(",") if s.strip()]
    if not raw:
        raise HTTPException(400, detail="Keine Symbole angegeben.")
    if len(raw) > 30:
        raise HTTPException(400, detail="Maximal 30 Symbole pro Bundle.")
    accepted = [s for s in raw if s in ALLOWED and s not in {"NDX", "DAX"}]
    unknown = [s for s in raw if s not in ALLOWED or s in {"NDX", "DAX"}]

    items: List[Dict[str, Any]] = []
    for sym in accepted:
        try:
            fdata = await stock_fundamentals(sym)
        except HTTPException:
            continue
        price = fdata.get("previous_close")
        high = fdata.get("fifty_two_week_high")
        try:
            dist = (float(price) / float(high) - 1.0) * 100.0 if price and high and float(high) > 0 else None
        except (TypeError, ValueError, ZeroDivisionError):
            dist = None
        item = {
            "symbol": fdata.get("symbol"),
            "company_name": fdata.get("company_name"),
            "exchange": fdata.get("exchange"),
            "currency": fdata.get("currency"),
            "sector": fdata.get("sector"),
            "market_cap": fdata.get("market_cap"),
            "trailing_pe": fdata.get("trailing_pe"),
            "forward_pe": fdata.get("forward_pe"),
            "dividend_yield": fdata.get("dividend_yield"),
            "previous_close": fdata.get("previous_close"),
            "day_high": fdata.get("day_high"),
            "day_low": fdata.get("day_low"),
            "fifty_two_week_high": fdata.get("fifty_two_week_high"),
            "fifty_two_week_low": fdata.get("fifty_two_week_low"),
            "distance_from_high_pct": dist,
            "data_source": fdata.get("data_source"),
            "cached_until": fdata.get("cached_until"),
        }

        if include_dividends:
            try:
                ddata = await stock_dividends(sym)
            except HTTPException:
                ddata = None
            if ddata and (ddata.get("has_dividends") or (ddata.get("history") or [])):
                summary = ddata.get("summary") or {}
                growth = ddata.get("growth") or {}
                history = ddata.get("history") or []
                # „Stabile/steigende Jahre" — nur aus complete years mit total>0
                complete = [h for h in history if h.get("complete") and (h.get("total") or 0) > 0]
                # Serie ab dem letzten Rückgang oder Nullpunkt zählen
                rising_years = 0
                stable_or_rising_years = 0
                prev = None
                for h in complete:
                    tot = float(h["total"])
                    if prev is not None:
                        if tot > prev - 1e-9:
                            stable_or_rising_years += 1
                            if tot > prev + 1e-9:
                                rising_years += 1
                            else:
                                # stable — still counts toward stable_or_rising
                                pass
                        else:
                            stable_or_rising_years = 0
                            rising_years = 0
                    prev = tot
                item["dividends"] = {
                    "has_dividends": bool(ddata.get("has_dividends")),
                    "dividend_yield_pct": summary.get("dividend_yield_pct"),
                    "dividend_rate_annual": summary.get("dividend_rate_annual"),
                    "payout_ratio_pct": summary.get("payout_ratio_pct"),
                    "five_year_avg_yield_pct": summary.get("five_year_avg_yield_pct"),
                    "last_dividend_value": summary.get("last_dividend_value"),
                    "last_dividend_date": summary.get("last_dividend_date"),
                    "next_ex_dividend_date": summary.get("next_ex_dividend_date"),
                    "one_year_growth_pct": growth.get("one_year_pct"),
                    "cagr_3y_pct": growth.get("cagr_3y_pct"),
                    "cagr_5y_pct": growth.get("cagr_5y_pct"),
                    "history_5y": history[-6:] if history else [],
                    "stable_or_rising_years": stable_or_rising_years,
                    "rising_years": rising_years,
                }
            else:
                item["dividends"] = None
        items.append(item)
    return {"items": items, "unknown": unknown, "count": len(items)}


@router.get("/stocks/compare")
async def stock_compare(
    symbols: str = Query(..., description="Comma-separated tickers (2-4)"),
    range: str = Query(default="1y"),
    benchmark: Optional[str] = Query(default=None),
) -> Dict[str, Any]:
    # ---- Validate input ---------------------------------------------------
    raw = [s.strip().upper() for s in (symbols or "").split(",") if s.strip()]
    if not (2 <= len(raw) <= 4):
        raise HTTPException(400, detail="Bitte 2 bis 4 Ticker angeben.")
    syms: List[str] = []
    for s in raw:
        if s not in ALLOWED or s in {"NDX", "DAX"}:
            raise HTTPException(404, detail=f"Ticker {s} nicht freigeschaltet für Vergleich.")
        if s not in syms:
            syms.append(s)
    rk = (range or "1y").lower()
    if rk not in COMPARE_RANGE_MAP:
        raise HTTPException(400, detail=f"Ungültiger Zeitraum: {range}")

    # Auto-benchmark: NDX if any US equity is in the mix, else DAX.
    bm = (benchmark or "").upper().strip() or None
    if bm and bm not in _COMPARE_BENCHMARK_YF:
        raise HTTPException(400, detail=f"Ungültiger Benchmark: {benchmark}")
    if not bm:
        base = syms[0]
        bm = BENCHMARK_FOR.get(base, "NDX")

    # ---- Cache lookup -----------------------------------------------------
    cache_key = f"{','.join(sorted(syms))}|{rk}|{bm}"
    cached = await _db.stock_public_compare_cache.find_one({"_id": cache_key})
    if cached and cached.get("expires_at") and cached["expires_at"] > _now():
        return {**cached.get("data", {}),
                "data_source": cached.get("data_source", "cache"),
                "data_updated_at": cached.get("cached_at").isoformat() if cached.get("cached_at") else None,
                "cached_until": cached["expires_at"].isoformat()}

    cfg = COMPARE_RANGE_MAP[rk]
    period, interval, tdays = cfg["period"], cfg["interval"], cfg["trading_days"]

    # ---- Parallel yfinance fetch -----------------------------------------
    yf_symbols = [ALLOWED[s] for s in syms]
    yf_bench = _COMPARE_BENCHMARK_YF[bm] if bm else None
    tasks = [asyncio.to_thread(_yf_daily_closes_sync, yfs, period, interval) for yfs in yf_symbols]
    if yf_bench:
        tasks.append(asyncio.to_thread(_yf_daily_closes_sync, yf_bench, period, interval))
    meta_tasks = [asyncio.to_thread(_yf_compare_meta_sync, yfs) for yfs in yf_symbols]
    results = await asyncio.gather(*tasks, *meta_tasks, return_exceptions=True)

    histories = results[: len(yf_symbols) + (1 if yf_bench else 0)]
    metas = results[len(histories):]
    bench_hist = histories[-1] if yf_bench else None
    stock_hists = histories[: len(yf_symbols)]

    # ---- Align on common trading days ------------------------------------
    def _dkey(iso: str) -> str: return (iso or "")[:10]
    day_maps: List[Dict[str, float]] = []
    for h in stock_hists:
        if isinstance(h, Exception) or not h:
            day_maps.append({})
        else:
            day_maps.append({_dkey(p["t"]): p["c"] for p in h})
    bench_map: Dict[str, float] = {}
    if bench_hist and not isinstance(bench_hist, Exception):
        bench_map = {_dkey(p["t"]): p["c"] for p in bench_hist}

    # common days = intersection across stock symbols
    common: Optional[set] = None
    for m in day_maps:
        if not m:
            common = set()
            break
        common = set(m.keys()) if common is None else (common & set(m.keys()))
    common_days = sorted(common) if common else []

    # ---- Build indexed series --------------------------------------------
    series: List[Dict[str, Any]] = []
    risk_out: List[Dict[str, Any]] = []
    bench_daily_returns: List[float] = []
    if bench_map and common_days:
        prev_b = None
        for d in common_days:
            if d in bench_map:
                cur = bench_map[d]
                if prev_b and prev_b > 0:
                    bench_daily_returns.append(cur / prev_b - 1.0)
                prev_b = cur

    for i, sym in enumerate(syms):
        m = day_maps[i]
        if not m or not common_days:
            series.append({"symbol": sym, "points": []})
            risk_out.append({"symbol": sym})
            continue
        closes = [m[d] for d in common_days if d in m]
        risk = _compute_risk(closes, tdays)
        # daily returns for beta
        sym_returns: List[float] = []
        prev = None
        for c in closes:
            if prev and prev > 0:
                sym_returns.append(c / prev - 1.0)
            prev = c
        beta = _compute_beta(sym_returns, bench_daily_returns) if bench_daily_returns else None
        base_val = closes[0]
        points = [{"t": d, "v": round((c / base_val) * 100.0, 4)} for d, c in zip(common_days, closes)]
        series.append({"symbol": sym, "points": points})
        risk_out.append({"symbol": sym, "beta": beta, **risk})

    # Benchmark series (indexed to same anchor day)
    bench_series: Optional[Dict[str, Any]] = None
    if bench_map and common_days:
        base_day = common_days[0]
        b0 = bench_map.get(base_day)
        if b0 and b0 > 0:
            b_pts = [{"t": d, "v": round((bench_map[d] / b0) * 100.0, 4)} for d in common_days if d in bench_map]
            bench_series = {"symbol": bm, "label": COMPARE_BENCHMARKS.get(bm, bm), "points": b_pts}

    # ---- Fundamentals table + 52w hints ----------------------------------
    fundamentals: List[Dict[str, Any]] = []
    for i, sym in enumerate(syms):
        meta = metas[i] if not isinstance(metas[i], Exception) else {}
        meta = meta or {}
        fundamentals.append({"symbol": sym, **meta})

    payload = {
        "symbols": syms,
        "range": rk,
        "benchmark": {"symbol": bm, "label": COMPARE_BENCHMARKS.get(bm, bm)} if bm else None,
        "common_days": len(common_days),
        "series": series,
        "benchmark_series": bench_series,
        "risk_metrics": risk_out,
        "fundamentals": fundamentals,
    }

    now = _now()
    expires_at = now + timedelta(seconds=COMPARE_TTL_S)
    await _db.stock_public_compare_cache.update_one(
        {"_id": cache_key},
        {"$set": {"_id": cache_key, "data": payload,
                  "data_source": "yfinance" if common_days else "unavailable",
                  "cached_at": now, "expires_at": expires_at}},
        upsert=True,
    )
    return {**payload,
            "data_source": "yfinance" if common_days else "unavailable",
            "data_updated_at": now.isoformat(),
            "cached_until": expires_at.isoformat()}


@router.get("/stocks/compare/peers")
async def stock_compare_peers() -> Dict[str, Any]:
    """Static list of allowed peers + benchmarks for the compare selector."""
    return {
        "peers": [{"symbol": s, "label": COMPANY_LABELS.get(s, s)} for s in COMPARE_PEERS],
        "benchmarks": [{"symbol": k, "label": v} for k, v in COMPARE_BENCHMARKS.items()],
    }
