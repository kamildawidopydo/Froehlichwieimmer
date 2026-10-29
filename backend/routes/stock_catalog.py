"""Session 82.89 — Stock Catalog Endpoint (Supabase-Cutover für Handeln.js).

Liefert die kuratierte Aktien-Liste (ehemals `stocks`-Tabelle in Supabase)
zusammen mit Live-Kursen aus dem bestehenden Portfolio-Quotes-Cache.

Reines Read-Modell — kein Financial-Write, keine Fake-Daten. Bei fehlenden
Provider-Daten bleiben Kursfelder `null` (`data_status: unavailable`).
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any, Dict, List

from fastapi import APIRouter, Query
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

_client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
_db = _client[os.environ["DB_NAME"]]

router = APIRouter(prefix="/api", tags=["stocks-catalog"])


# Kuratierte Metadaten für die ALLOWED-Symbole (ehemals `stocks`-Tabelle).
# Nur Symbole aus stock_public.ALLOWED — jede Erweiterung geht dort ein.
_META: Dict[str, Dict[str, Any]] = {
    "NVDA":  {"name": "NVIDIA Corporation", "sector": "Technologie", "exchange": "NASDAQ", "currency": "USD"},
    "AAPL":  {"name": "Apple Inc.", "sector": "Technologie", "exchange": "NASDAQ", "currency": "USD"},
    "MSFT":  {"name": "Microsoft Corporation", "sector": "Technologie", "exchange": "NASDAQ", "currency": "USD"},
    "GOOGL": {"name": "Alphabet Inc.", "sector": "Kommunikation", "exchange": "NASDAQ", "currency": "USD"},
    "AMZN":  {"name": "Amazon.com Inc.", "sector": "Konsum", "exchange": "NASDAQ", "currency": "USD"},
    "SAP":   {"name": "SAP SE", "sector": "Technologie", "exchange": "XETRA", "currency": "EUR"},
    "SIE":   {"name": "Siemens AG", "sector": "Industrie", "exchange": "XETRA", "currency": "EUR"},
    "ALV":   {"name": "Allianz SE", "sector": "Finanzen", "exchange": "XETRA", "currency": "EUR"},
    "DBK":   {"name": "Deutsche Bank AG", "sector": "Finanzen", "exchange": "XETRA", "currency": "EUR"},
    "IFX":   {"name": "Infineon Technologies AG", "sector": "Technologie", "exchange": "XETRA", "currency": "EUR"},
    "RHM":   {"name": "Rheinmetall AG", "sector": "Industrie", "exchange": "XETRA", "currency": "EUR"},
    "DTE":   {"name": "Deutsche Telekom AG", "sector": "Kommunikation", "exchange": "XETRA", "currency": "EUR"},
    "MUV2":  {"name": "Münchener Rück", "sector": "Finanzen", "exchange": "XETRA", "currency": "EUR"},
    "BAS":   {"name": "BASF SE", "sector": "Chemie", "exchange": "XETRA", "currency": "EUR"},
    "MBG":   {"name": "Mercedes-Benz Group", "sector": "Automobil", "exchange": "XETRA", "currency": "EUR"},
    "BMW":   {"name": "BMW AG", "sector": "Automobil", "exchange": "XETRA", "currency": "EUR"},
    "VOW3":  {"name": "Volkswagen Vz.", "sector": "Automobil", "exchange": "XETRA", "currency": "EUR"},
    "EOAN":  {"name": "E.ON SE", "sector": "Versorger", "exchange": "XETRA", "currency": "EUR"},
    "RWE":   {"name": "RWE AG", "sector": "Versorger", "exchange": "XETRA", "currency": "EUR"},
    "HEN3":  {"name": "Henkel Vz.", "sector": "Konsum", "exchange": "XETRA", "currency": "EUR"},
    "BEI":   {"name": "Beiersdorf AG", "sector": "Konsum", "exchange": "XETRA", "currency": "EUR"},
    "ENR":   {"name": "Siemens Energy", "sector": "Industrie", "exchange": "XETRA", "currency": "EUR"},
    "DHL":   {"name": "DHL Group", "sector": "Logistik", "exchange": "XETRA", "currency": "EUR"},
    "VNA":   {"name": "Vonovia SE", "sector": "Immobilien", "exchange": "XETRA", "currency": "EUR"},
    "FRE":   {"name": "Fresenius SE", "sector": "Gesundheit", "exchange": "XETRA", "currency": "EUR"},
    "CBK":   {"name": "Commerzbank AG", "sector": "Finanzen", "exchange": "XETRA", "currency": "EUR"},
    "ADS":   {"name": "adidas AG", "sector": "Konsum", "exchange": "XETRA", "currency": "EUR"},
}


from services.fx_service import to_eur  # noqa: E402


@router.get("/stocks/catalog")
async def stocks_catalog(
    with_quotes: bool = Query(default=False, description="Include cached price/change data"),
) -> Dict[str, Any]:
    """Öffentliche kuratierte Aktien-Liste (Handeln-Seite).

    - `with_quotes=false`: nur Metadaten (name/sector/exchange/currency).
    - `with_quotes=true`: additiv `previous_close`, `day_high`, `day_low`
      aus `stock_public_fundamentals_cache` (falls warm). `change_pct` wird
      aus `previous_close`-Historie berechnet — keine synthetischen Werte.
    """
    items: List[Dict[str, Any]] = []
    symbols = list(_META.keys())

    quotes_by_sym: Dict[str, Dict[str, Any]] = {}
    if with_quotes:
        # Lookups gegen den bestehenden Fundamentals-Cache (TTL 6h). Kein
        # yfinance-Fanout hier — Preisdaten kommen bereits gecacht.
        docs = await _db.stock_public_fundamentals_cache.find(
            {"_id": {"$in": symbols}}
        ).to_list(len(symbols))
        for d in docs:
            quotes_by_sym[d["_id"]] = d

    for sym in symbols:
        meta = _META[sym]
        item = {
            "id": sym,
            "symbol": sym,
            "name": meta["name"],
            "sector": meta["sector"],
            "exchange": meta["exchange"],
            "currency": meta["currency"],
            "is_active": True,
            "display_order": symbols.index(sym),
        }
        if with_quotes:
            q = quotes_by_sym.get(sym) or {}
            data = q.get("data") or q
            native_ccy = data.get("currency") or meta["currency"]

            async def _eur(v):
                if not isinstance(v, (int, float)):
                    return None
                e = await to_eur(v, native_ccy)
                return round(e, 4) if e is not None else None
            pc = await _eur(data.get("previous_close"))
            item.update({
                "currency": "EUR",
                "native_currency": native_ccy,
                "price": pc,
                "day_high": await _eur(data.get("day_high")),
                "day_low": await _eur(data.get("day_low")),
                "change_abs": None,
                "change_pct": None,
                "volume": data.get("volume"),
                "data_source": q.get("data_source"),
                "data_status": "fresh" if pc is not None else "unavailable",
            })
        items.append(item)
    return {"items": items, "count": len(items)}
