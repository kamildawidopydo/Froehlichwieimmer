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

_FRESH_SECONDS = 4  # Session 82.83 — 4s Cache-TTL für 5s-Frontend-Polling


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
        "currency": q.get("currency"),
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
    """Ruft bestehende Market-Route intern auf; für Symbole ohne Treffer
    (z. B. `.ST`, `.PA`, `.L`, `.MI` außerhalb der News-Route-Universe) folgt
    ein direkter yfinance-Fallback — kein Fake-Preis, echte Provider-Antwort."""
    if not symbols:
        return {}
    items: dict[str, dict] = {}
    try:
        from routes.news import market_quotes  # type: ignore
        resp = await market_quotes(symbols=",".join(symbols))
        for row in (resp or {}).get("items", []) if isinstance(resp, dict) else (resp or []):
            sym = row.get("symbol")
            if sym:
                # Native values only — EUR conversion happens centrally in _quote_to_eur.
                if row.get("original_price") is not None and row.get("original_currency"):
                    row = {**row, "price": row["original_price"], "currency": row["original_currency"]}
                items[sym] = row
    except Exception:
        pass

    missing = [s for s in symbols if not items.get(s) or items.get(s, {}).get("price") in (None, 0)]
    if missing:
        import asyncio as _asyncio
        import os as _os

        # Session 82.83b — Primärer Realtime-Provider: Twelve Data (Free-Tier,
        # stabiler als yfinance, bessere Rate-Limits). yfinance bleibt als
        # Fallback für Symbole, die TD nicht kennt.
        try:
            from routes.stock_public import ALLOWED as _ALLOWED  # type: ignore
        except Exception:
            _ALLOWED = {}

        td_key = _os.environ.get("TWELVEDATA_API_KEY")

        def _td_batch(syms: list[str]) -> dict[str, dict]:
            """Twelve Data /quote batch. Strippt `.DE`/`.ST` etc. — TD nutzt
            Auto-Exchange-Detection über primäres Listing."""
            out: dict[str, dict] = {}
            if not td_key or not syms:
                return out
            try:
                import requests  # type: ignore
            except Exception:
                return out
            # Map originales Symbol → TD-Symbol (nur bereinigen, nichts erfinden)
            td_map: dict[str, str] = {}
            for s in syms:
                base = s.split(".")[0] if "." in s else s
                td_map[s] = base
            csv = ",".join({td_map[s] for s in syms})
            try:
                r = requests.get(
                    "https://api.twelvedata.com/quote",
                    params={"symbol": csv, "apikey": td_key},
                    timeout=6,
                )
                data = r.json() if r.ok else {}
            except Exception:
                return out
            if not isinstance(data, dict):
                return out
            # TD packt Single-Symbol als Top-Level-Dict, Multi als Dict[sym→dict]
            if data.get("symbol") and data.get("close"):
                data = {data["symbol"]: data}
            for orig, td_sym in td_map.items():
                row = data.get(td_sym)
                if not isinstance(row, dict) or row.get("status") == "error":
                    continue
                try:
                    price = float(row.get("close") or row.get("open") or 0)
                except (TypeError, ValueError):
                    price = 0
                if price <= 0:
                    continue
                out[orig] = {
                    "symbol": orig,
                    "price": price,
                    "currency": row.get("currency"),
                    "change": float(row["change"]) if row.get("change") not in (None, "") else None,
                    "change_percent": float(row["percent_change"]) if row.get("percent_change") not in (None, "") else None,
                    "last_updated": None,
                    "data_source": "twelvedata",
                }
            return out

        def _yf_batch(syms: list[str]) -> dict[str, dict]:
            out: dict[str, dict] = {}
            try:
                import yfinance as yf  # type: ignore
            except Exception:
                return out
            for s in syms:
                yf_sym = _ALLOWED.get(s, s)
                try:
                    fi = yf.Ticker(yf_sym).fast_info
                    price = getattr(fi, "last_price", None)
                    if price is None and hasattr(fi, "get"):
                        price = fi.get("lastPrice")
                    if price is None:
                        continue
                    currency = getattr(fi, "currency", None) or (
                        fi.get("currency") if hasattr(fi, "get") else None
                    )
                    prev = getattr(fi, "previous_close", None)
                    prev = float(prev) if prev and prev > 0 else None
                    out[s] = {
                        "symbol": s,
                        "price": float(price),
                        "currency": currency,
                        "change": round(float(price) - prev, 6) if prev else None,
                        "change_percent": round((float(price) - prev) / prev * 100, 6) if prev else None,
                        "last_updated": None,
                        "data_source": "yfinance",
                    }
                except Exception:
                    continue
            return out

        # 1) Primär: Twelve Data (Realtime-Token) 2) Fallback: yfinance
        td_items = await _asyncio.to_thread(_td_batch, missing)
        for s, row in td_items.items():
            items[s] = row
        still_missing = [s for s in missing if s not in td_items]
        if still_missing:
            yf_items = await _asyncio.to_thread(_yf_batch, still_missing)
            for s, row in yf_items.items():
                items[s] = row
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
    for sym, q in result.items():
        await _quote_to_eur(q)
    return result


async def _quote_to_eur(q: dict) -> None:
    """Central EUR display conversion. Day change = EUR price vs. EUR previous close
    (previous close converted with the previous FX close) — no double conversion."""
    from services.fx_service import eur_rate, normalize_ccy
    price = q.get("price")
    if price is None:
        return
    ccy = q.get("currency")
    base, factor = normalize_ccy(ccy)
    q["native_price"], q["native_currency"] = price, ccy
    q["native_change"], q["native_change_pct"] = q.get("change"), q.get("change_pct")
    if not base:
        # Unknown trading currency: never assume EUR.
        q.update({"price": None, "change": None, "change_pct": None, "currency": None,
                  "price_status": "currency_unknown"})
        return
    info = await eur_rate(base)
    if not info:
        q.update({"price": None, "change": None, "change_pct": None, "currency": None,
                  "price_status": "fx_unavailable"})
        return
    rate = info["rate"]
    prev_rate = info.get("prev_rate") or rate
    native_prev = None
    if q.get("change") is not None:
        native_prev = float(price) - float(q["change"])
    elif q.get("change_pct") is not None and float(q["change_pct"]) != -100:
        native_prev = float(price) / (1 + float(q["change_pct"]) / 100)
    price_eur = float(price) / factor / rate
    q["price"] = round(price_eur, 4)
    q["currency"] = "EUR"
    if native_prev and native_prev > 0:
        prev_eur = native_prev / factor / prev_rate
        q["prev_close"] = round(prev_eur, 4)
        q["change"] = round(price_eur - prev_eur, 4)
        q["change_abs"] = q["change"]
        q["change_pct"] = round((price_eur - prev_eur) / prev_eur * 100, 4)
    else:
        q["prev_close"] = q["change"] = q["change_abs"] = q["change_pct"] = None
    if base != "EUR":
        q.update({"fx_rate": rate, "fx_prev_rate": prev_rate, "fx_pair": info["pair"],
                  "fx_as_of": info["as_of"], "fx_source": info["source"]})


async def ensure_indexes(db) -> None:
    await db.stock_prices_cache.create_index(
        [("symbol", 1)], unique=True, name="symbol_unique",
    )
    await db.stock_prices_cache.create_index(
        [("fetched_at", -1)], name="fetched_desc",
    )
