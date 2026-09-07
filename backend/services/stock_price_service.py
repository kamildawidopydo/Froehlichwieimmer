"""
Stock-Price-Service (Session 82.22 · Depot Phase 4A).

Read-through Cache über bestehende `/api/news-markte/market/quotes`-Route.
Speichert echte Provider-Antworten in Mongo `stock_prices_cache`.

Kein Fake-Fallback. Wenn Provider fehlschlägt und kein Cache existiert:
`price=None, price_status='unavailable'`.
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from decimal import Decimal, InvalidOperation
from typing import Optional

from bson.decimal128 import Decimal128

_FRESH_SECONDS = 15 * 60  # 15 Min


def _to_dec(v) -> Optional[Decimal]:
    if v is None:
        return None
    try:
        return Decimal(str(v))
    except (InvalidOperation, TypeError):
        return None


def _from_bson(v):
    if v is None:
        return None
    if isinstance(v, Decimal128):
        return v.to_decimal()
    if isinstance(v, Decimal):
        return v
    try:
        return Decimal(str(v))
    except Exception:
        return None


async def _persist_quote(db, symbol: str, q: dict) -> None:
    now = datetime.now(timezone.utc)
    price = _to_dec(q.get("price"))
    if price is None or price <= 0:
        return  # keine Fake-Werte cachen
    doc = {
        "symbol": symbol,
        "price": Decimal128(price),
        "currency": q.get("currency") or "EUR",
        "change": Decimal128(_to_dec(q.get("change"))) if q.get("change") is not None else None,
        "change_pct": Decimal128(_to_dec(q.get("change_percent"))) if q.get("change_percent") is not None else None,
        "as_of": q.get("last_updated") or now.isoformat(),
        "source": q.get("data_source") or "yfinance",
        "fetched_at": now,
    }
    await db.stock_prices_cache.update_one(
        {"symbol": symbol},
        {"$set": doc},
        upsert=True,
    )


def _cache_to_quote(doc: dict, status: str) -> dict:
    price = _from_bson(doc.get("price"))
    return {
        "symbol": doc.get("symbol"),
        "price": float(price) if price is not None else None,
        "currency": doc.get("currency"),
        "change": float(_from_bson(doc.get("change"))) if doc.get("change") is not None else None,
        "change_pct": float(_from_bson(doc.get("change_pct"))) if doc.get("change_pct") is not None else None,
        "as_of": doc.get("as_of"),
        "source": doc.get("source"),
        "price_status": status,
    }


async def _fetch_provider_batch(symbols: list[str]) -> dict[str, dict]:
    """Ruft bestehende Market-Route intern auf."""
    if not symbols:
        return {}
    try:
        from routes.news import market_quotes  # type: ignore
        # market_quotes akzeptiert query-Parameter "symbols=CSV"
        resp = await market_quotes(symbols=",".join(symbols))
    except Exception:
        return {}
    items = {}
    for row in (resp or {}).get("items", []) if isinstance(resp, dict) else (resp or []):
        sym = row.get("symbol")
        if sym:
            items[sym] = row
    return items


async def get_quotes(db, symbols: list[str]) -> dict[str, dict]:
    """
    Read-through: Cache-Hit wenn fresh; sonst Provider → Cache → return.
    Bei Provider-Fail: letzter Cache-Wert mit `status=stale`; sonst `unavailable`.
    """
    if not symbols:
        return {}
    symbols = [s.strip().upper() for s in symbols if s and isinstance(s, str)]
    symbols = list({s for s in symbols if s})

    now = datetime.now(timezone.utc)
    result: dict[str, dict] = {}
    stale_syms: list[str] = []

    cursor = db.stock_prices_cache.find({"symbol": {"$in": symbols}})
    cache_map: dict[str, dict] = {}
    async for d in cursor:
        cache_map[d["symbol"]] = d

    for sym in symbols:
        c = cache_map.get(sym)
        if c and c.get("fetched_at"):
            age = (now - c["fetched_at"]).total_seconds()
            if age <= _FRESH_SECONDS:
                result[sym] = _cache_to_quote(c, "fresh")
                continue
        stale_syms.append(sym)

    if stale_syms:
        provider = await _fetch_provider_batch(stale_syms)
        for sym in stale_syms:
            q = provider.get(sym)
            if q and q.get("price") is not None:
                await _persist_quote(db, sym, q)
                fresh_doc = await db.stock_prices_cache.find_one({"symbol": sym})
                result[sym] = _cache_to_quote(fresh_doc, "fresh") if fresh_doc else _cache_to_quote(
                    {"symbol": sym, "price": Decimal128(_to_dec(q["price"])), "currency": q.get("currency"), "source": q.get("data_source"), "as_of": q.get("last_updated")},
                    "fresh",
                )
            else:
                c = cache_map.get(sym)
                if c:
                    result[sym] = _cache_to_quote(c, "stale")
                else:
                    result[sym] = {
                        "symbol": sym,
                        "price": None,
                        "currency": None,
                        "change": None,
                        "change_pct": None,
                        "as_of": None,
                        "source": None,
                        "price_status": "unavailable",
                    }
    return result


async def ensure_indexes(db) -> None:
    await db.stock_prices_cache.create_index(
        [("symbol", 1)], unique=True, name="symbol_unique",
    )
    await db.stock_prices_cache.create_index(
        [("fetched_at", -1)], name="fetched_desc",
    )
