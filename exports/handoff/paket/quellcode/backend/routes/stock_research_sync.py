"""Automated sync runner for `stock_research` (Session 78.7).

Responsibilities:
  1. Discover the ticker universe to monitor.
  2. Call the configured `MarketPriceProvider` and upsert live prices onto
     existing published rows (`current_price`, `price_updated_at`,
     `price_source*`). Manually-curated fields (target_price, analyst,
     research_house, source_*, research_date) are never overwritten by the
     price sync.
  3. Call the configured `AnalystResearchProvider` and upsert new / updated
     analyst rows using the same duplicate key as manual entries
     (ticker + research_house + analyst + research_date + target_price).
  4. Validate every automatically-ingested analyst row before publish;
     invalid rows are stored as ``published=False`` with a rejection reason
     so they can be reviewed but never leak onto the homepage.

Design principles:
  * Provider outages must NOT delete or blank existing valid data.
  * No fake analysts, no fake targets — providers that cannot deliver
    verifiable rows simply return empty lists.
  * The sync is idempotent: identical repeat runs produce zero writes when
    nothing changed upstream.
"""
from __future__ import annotations

import asyncio
import logging
import secrets as _secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from providers.base import MarketPriceProvider, AnalystResearchProvider, AnalystRow
from providers.market_price_internal import InternalQuoteProvider
from providers.analyst_null import NullAnalystProvider

# `server` provides the shared db handle + require_admin dependency.
from server import db, require_admin, _verify_cron_bearer
from routes.stock_research import (  # reuse existing helpers, no duplication
    _duplicate_key,
    _ensure_indexes_once,
    _publish_guard,
    serialize_admin,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["stock-research-sync"])


# ---------------------------------------------------------------------------
# Configuration knobs (kept intentionally simple; adjust via env if needed)
# ---------------------------------------------------------------------------

STALE_ANALYST_DAYS = 90
UNIVERSE_HARD_CAP = 40    # safety net so a cron job can never blow provider quotas
JOB_COLLECTION = "stock_research_sync_runs"


# ---------------------------------------------------------------------------
# Ticker universe discovery
# ---------------------------------------------------------------------------


async def _discover_universe() -> List[str]:
    """Tickers we want fresh data for. Priority order per Phase 6.

    Session 78.10: Seedet zusätzlich aus dem projekteigenen
    ``MARKET_STOCK_SYMBOLS``-Universum in server.py, damit die Analystenpipeline
    auch dann läuft, wenn noch keine manuellen ``stock_research``-Rows
    angelegt wurden.
    """
    seen: List[str] = []

    async def _add(cursor):
        async for doc in cursor:
            t = (doc.get("ticker") or doc.get("symbol") or "").upper().strip()
            if t and t not in seen and len(seen) < UNIVERSE_HARD_CAP:
                seen.append(t)

    # 1) Published research rows first — those already ship in production.
    await _add(db.stock_research.find({"published": True}, {"ticker": 1}))
    # 2) Any research rows (drafts included) so autopublish candidates get prices.
    await _add(db.stock_research.find({}, {"ticker": 1}))
    # 3) Built-in project stock universe from server.py — used as automatic seed.
    try:
        from server import MARKET_STOCK_SYMBOLS  # curated in-house list
        for entry in MARKET_STOCK_SYMBOLS or []:
            t = (entry.get("symbol") or "").upper().strip()
            if t and t not in seen and len(seen) < UNIVERSE_HARD_CAP:
                seen.append(t)
    except Exception as exc:  # noqa: BLE001
        logger.info("universe seed from MARKET_STOCK_SYMBOLS skipped: %s", exc)
    # 4) Fall back to the built-in watchlist collection if present.
    try:
        await _add(db.watchlist.find({}, {"symbol": 1}).limit(UNIVERSE_HARD_CAP))
    except Exception:  # noqa: BLE001
        pass
    return seen


# ---------------------------------------------------------------------------
# Provider wiring — replace `NullAnalystProvider` with a real client when
# `FINNHUB_API_KEY` (or similar) becomes available.
# ---------------------------------------------------------------------------


def _price_provider() -> MarketPriceProvider:
    return InternalQuoteProvider()


def _analyst_provider() -> AnalystResearchProvider:
    """Fallback chain (Session 78.10):
      1. Finnhub, wenn `FINNHUB_API_KEY` gesetzt
      2. Yahoo Finance (yfinance) — kein Key nötig, aggregierte Konsensdaten
      3. NullAnalystProvider — ehrliches No-Op
    """
    from providers.analyst_finnhub import FinnhubAnalystProvider, _finnhub_available
    if _finnhub_available():
        return FinnhubAnalystProvider()
    from providers.analyst_yfinance import YFinanceAnalystProvider, _yfinance_available
    if _yfinance_available():
        return YFinanceAnalystProvider()
    return NullAnalystProvider()


# ---------------------------------------------------------------------------
# Analyst-row validation (Phase 3)
# ---------------------------------------------------------------------------


def _validate_analyst(row: AnalystRow, now: datetime) -> Optional[str]:
    """Return a rejection reason string, or None if the row is valid.

    Session 78.8 — Provider-consensus rows (aggregated data without a named
    analyst) skip the "analyst OR research_house required" rule because the
    source is the provider itself; the row is transparently modelled with
    ``record_type="provider_consensus"``.
    """
    meta = getattr(row, "_provider_meta", None) or {}
    is_provider_consensus = meta.get("record_type") == "provider_consensus"

    if not row.ticker:
        return "ticker fehlt"
    if not isinstance(row.target_price, (int, float)) or row.target_price <= 0:
        return "target_price ungültig"
    if not row.currency or len(row.currency) != 3:
        return "currency ungültig"
    if not isinstance(row.research_date, datetime):
        return "research_date fehlt"
    if row.research_date > now + timedelta(days=1):
        return "research_date liegt in der Zukunft"
    if not (row.source_name or "").strip():
        return "source_name fehlt"
    if not is_provider_consensus and not (row.analyst or row.research_house):
        return "weder analyst noch research_house angegeben"
    return None


# ---------------------------------------------------------------------------
# Market-price sync (Phase 5)
# ---------------------------------------------------------------------------


async def _sync_prices(tickers: List[str]) -> Dict[str, int]:
    """Update current_price for existing DB rows using the price provider."""
    if not tickers:
        return {"updated": 0, "provider_hits": 0, "unchanged": 0, "skipped": 0}
    provider = _price_provider()
    try:
        quotes = await provider.fetch(tickers)
    except Exception as exc:  # noqa: BLE001
        logger.warning("price provider crash — keeping existing data: %s", exc)
        return {"updated": 0, "provider_hits": 0, "unchanged": 0, "skipped": len(tickers), "provider_error": str(exc)[:200]}

    now = datetime.now(timezone.utc)
    updated = unchanged = 0
    for q in quotes:
        if not q.price or q.price <= 0:
            continue
        set_doc: Dict[str, Any] = {
            "current_price": float(q.price),
            "currency": q.currency,                    # legacy alias — bleibt gefüllt für Rückwärtskompat
            "current_price_currency": q.currency,     # neu 78.11 — explizite Preiswährung
            "price_updated_at": q.price_updated_at or now,
            "price_source": q.price_source or provider.name,
            "price_is_delayed": bool(q.is_delayed),
        }
        # Also fill company_name only if empty (never overwrite curator input).
        if q.company_name:
            res = await db.stock_research.update_many(
                {"ticker": q.ticker, "$or": [{"company_name": {"$in": [None, ""]}}, {"company_name": {"$exists": False}}]},
                {"$set": {"company_name": q.company_name}},
            )
            if res.modified_count:
                updated += res.modified_count
        res = await db.stock_research.update_many(
            {"ticker": q.ticker},
            {"$set": set_doc},
        )
        if res.modified_count:
            updated += res.modified_count
        else:
            unchanged += 1
    return {"updated": updated, "provider_hits": len(quotes), "unchanged": unchanged, "skipped": max(0, len(tickers) - len(quotes))}


# ---------------------------------------------------------------------------
# Analyst-row sync (Phase 5 + Phase 4 upsert semantics)
# ---------------------------------------------------------------------------


async def _sync_analysts(tickers: List[str], *, auto_publish: bool = False) -> Dict[str, int]:
    provider = _analyst_provider()
    if not provider.available:
        return {"provider": provider.name, "available": False, "inserted": 0, "updated": 0, "rejected": 0}
    try:
        rows = await provider.fetch(tickers)
    except Exception as exc:  # noqa: BLE001
        logger.warning("analyst provider crash — keeping existing data: %s", exc)
        return {"provider": provider.name, "available": True, "inserted": 0, "updated": 0, "rejected": 0, "provider_error": str(exc)[:200]}

    # Session 78.11 — precompute FX rates for target→price currency conversion.
    from providers.fx_yfinance import get_fx_rate
    price_ccy_by_ticker: Dict[str, str] = {}
    async for pdoc in db.stock_research.find({"ticker": {"$in": [r.ticker.upper() for r in rows]}}, {"ticker": 1, "current_price_currency": 1, "currency": 1}):
        t = pdoc.get("ticker")
        c = (pdoc.get("current_price_currency") or pdoc.get("currency") or "").upper()
        if t and c and t not in price_ccy_by_ticker:
            price_ccy_by_ticker[t] = c

    now = datetime.now(timezone.utc)
    inserted = updated = rejected = 0
    consensus_rows = 0
    fx_hits = 0
    for row in rows:
        reason = _validate_analyst(row, now)
        meta = getattr(row, "_provider_meta", None) or {}
        record_type = meta.get("record_type") or "analyst_research"
        if record_type == "provider_consensus":
            consensus_rows += 1
        stored = {
            "ticker": row.ticker.upper(),
            "company_name": row.company_name or None,
            "analyst": row.analyst or None,
            "research_house": row.research_house or None,
            "rating": row.rating or None,
            "target_price": float(row.target_price) if row.target_price else 0.0,
            "currency": row.currency,                        # legacy — bleibt für Rückwärtskompat
            "target_price_currency": row.currency,          # neu 78.11 — explizite Targetwährung
            "source_name": row.source_name or "",
            "source_url": row.source_url or None,
            "research_date": row.research_date,
            "fetched_at": row.fetched_at,
            "ingestion_source": provider.name,
            "record_type": record_type,
            # Provider metadata — indexed for transparency but stored flat.
            "provider_meta": {k: v for k, v in meta.items() if k != "record_type"},
        }
        # Session 78.11 — precompute FX rate (target→price currency) so the
        # serializer needs no async at read time.
        price_ccy = price_ccy_by_ticker.get(stored["ticker"], "")
        if price_ccy and row.currency and price_ccy != row.currency.upper():
            fx = await get_fx_rate(row.currency, price_ccy)
            if isinstance(fx, (int, float)) and fx > 0:
                stored["fx_rate"] = float(fx)
                stored["fx_source"] = "yahoo-finance"
                stored["fx_updated_at"] = now
                fx_hits += 1
        else:
            # Same-currency case — clear any stale FX artefacts from previous
            # ADR-mismatch runs so the serializer treats the row as native.
            stored["fx_rate"] = None
            stored["fx_source"] = None
            stored["fx_updated_at"] = None
        # Session 78.12 — persist provider symbol + exchange (additive).
        pmeta = stored.get("provider_meta") or {}
        if pmeta.get("provider_symbol"):
            stored["provider_symbol"] = pmeta["provider_symbol"]
        if pmeta.get("exchange"):
            stored["exchange"] = pmeta["exchange"]
        if reason:
            rejected += 1
            # Store rejection audit trail — but never published.
            await db.stock_research_rejects.insert_one({
                **stored, "reason": reason, "created_at": now,
            })
            continue
        stored["dedupe_key"] = _duplicate_key(stored)
        stored["updated_at"] = now
        # Session 79.2 — publish-Semantik fix: manuelle Syncs ohne auto_publish
        # dürfen NICHT den `published`-Status bereits publizierter Rows
        # zurücksetzen. Sonst schaltet jeder Debug-Sync die Homepage-Sektion
        # auf Empty State.
        #   • auto_publish=True  → probe→guard→published True/False
        #   • auto_publish=False → auf UPDATES `published` unangetastet lassen,
        #                          auf INSERTS Draft-First (published=False)
        if auto_publish:
            probe = dict(stored)
            probe["current_price"] = 1.0  # publish_guard only checks presence
            try:
                _publish_guard(probe)
                stored["published"] = True
            except HTTPException:
                stored["published"] = False

        # Schritt 13 — Provider-Consensus-Rows werden pro
        # (ticker, ingestion_source, record_type) upsertet, damit ein täglicher
        # Sync KEINE neuen Duplikate mehr erzeugt. Manuell gepflegte Rows und
        # andere record_types folgen weiterhin dem historischen dedupe_key-Pfad.
        # Der `published`-Status wird bei provider_consensus-UPDATES IMMER
        # bewahrt (auch bei auto_publish=True) — die einmalige Freigabe-
        # Entscheidung eines Admins soll ein Refresh-Sync nie überschreiben.
        if record_type == "provider_consensus":
            lookup = {
                "ticker": stored["ticker"],
                "ingestion_source": provider.name,
                "record_type": "provider_consensus",
            }
            existing_doc = await db.stock_research.find_one(
                lookup, {"_id": 1, "published": 1}, sort=[("fetched_at", -1)]
            )
            if existing_doc:
                stored.pop("published", None)  # published bleibt unverändert
                await db.stock_research.update_one({"_id": existing_doc["_id"]}, {"$set": stored})
                updated += 1
            else:
                stored["created_at"] = now
                stored.setdefault("published", False)  # Draft-First für neue Rows
                await db.stock_research.insert_one(stored)
                inserted += 1
            continue

        exists = await db.stock_research.find_one({"dedupe_key": stored["dedupe_key"]}, {"_id": 1})
        if exists:
            if not auto_publish:
                # `published` intentionally NOT overwritten on update.
                stored.pop("published", None)
            await db.stock_research.update_one({"_id": exists["_id"]}, {"$set": stored})
            updated += 1
        else:
            stored["created_at"] = now
            stored.setdefault("published", False)  # Draft-First für neue Rows
            await db.stock_research.insert_one(stored)
            inserted += 1
    return {"provider": provider.name, "available": True, "inserted": inserted, "updated": updated, "rejected": rejected, "consensus_rows": consensus_rows, "fx_hits": fx_hits}


# ---------------------------------------------------------------------------
# Orchestrator + audit log
# ---------------------------------------------------------------------------


_VALID_SYNC_TYPES = {"prices", "analyst", "both"}


async def _run_sync(
    *,
    auto_publish_analysts: bool = False,
    tickers: Optional[List[str]] = None,
    sync_type: str = "both",
) -> Dict[str, Any]:
    """Run one or both halves of the sync pipeline.

    Session 78.9 — cron separation:
      * `sync_type="prices"`   → only market-price provider (fast, /45 min cron)
      * `sync_type="analyst"`  → only analyst provider (2×daily cron, protects
                                 Finnhub rate limits)
      * `sync_type="both"`     → legacy behaviour (manual admin trigger)
    """
    if sync_type not in _VALID_SYNC_TYPES:
        raise HTTPException(status_code=400, detail=f"sync_type muss in {sorted(_VALID_SYNC_TYPES)} sein")

    await _ensure_indexes_once()
    started = datetime.now(timezone.utc)
    t0 = time.perf_counter()
    universe = [t.upper() for t in tickers] if tickers else await _discover_universe()

    price_summary: Optional[Dict[str, Any]] = None
    analyst_summary: Optional[Dict[str, Any]] = None
    # Session 78.12 — analyst first (may create new rows), then prices
    # (fills current_price on those new rows).
    if sync_type in ("analyst", "both"):
        analyst_summary = await _sync_analysts(universe, auto_publish=auto_publish_analysts)
    if sync_type in ("prices", "both"):
        price_summary = await _sync_prices(universe)

    duration_ms = int((time.perf_counter() - t0) * 1000)
    audit = {
        "started_at": started,
        "duration_ms": duration_ms,
        "universe_size": len(universe),
        "tickers": universe,
        "sync_type": sync_type,
        "price": price_summary,          # None when skipped (transparent to observers)
        "analyst": analyst_summary,
    }
    try:
        await db[JOB_COLLECTION].insert_one({**audit, "created_at": started})
    except Exception as exc:  # noqa: BLE001
        logger.warning("sync audit insert failed: %s", exc)
    logger.info("stock-research sync done in %dms: %s", duration_ms, audit)
    return {**audit, "started_at": started.isoformat()}


# ---------------------------------------------------------------------------
# Admin trigger endpoint — also used by the cron entry in .emergent/crons.yml
# ---------------------------------------------------------------------------


@router.post("/admin/stock-research/sync", summary="Automatischer Marktpreis- und/oder Analystensync")
async def admin_sync(
    _user: dict = Depends(require_admin),
    auto_publish: bool = Query(default=False, description="Analystenrows nach Validierung automatisch veröffentlichen"),
    ticker: Optional[str] = Query(default=None, description="Optional: nur einen Ticker syncen (z. B. AAPL)"),
    sync_type: str = Query(default="both", regex="^(prices|analyst|both)$", description="prices=nur Marktpreise, analyst=nur Analystendaten, both=beides"),
):
    tickers = [t.strip().upper() for t in (ticker or "").split(",") if t.strip()] or None
    result = await _run_sync(auto_publish_analysts=auto_publish, tickers=tickers, sync_type=sync_type)
    return result


@router.get("/admin/stock-research/sync/history", summary="Letzte 10 Sync-Läufe")
async def admin_sync_history(_user: dict = Depends(require_admin)):
    items: List[Dict[str, Any]] = []
    async for doc in db[JOB_COLLECTION].find({}).sort([("started_at", -1)]).limit(10):
        items.append({
            "started_at": doc.get("started_at").isoformat() if isinstance(doc.get("started_at"), datetime) else None,
            "duration_ms": doc.get("duration_ms"),
            "universe_size": doc.get("universe_size"),
            "price": doc.get("price"),
            "analyst": doc.get("analyst"),
        })
    return {"items": items}


# ---------------------------------------------------------------------------
# Cron endpoint — täglicher Yahoo-Analystenkonsens-Refresh (Schritt 14)
# ---------------------------------------------------------------------------
# Bearer via `WEBHOOK_CRON_SECRET`. Endpoint ackt 2xx sofort und startet den
# eigentlichen Sync als asyncio-Background-Task (analog zu den anderen Crons
# in server.py), damit die 5s-Cron-Ack-Deadline sicher eingehalten wird.
#
# Idempotenz: `_run_sync(sync_type="analyst", auto_publish_analysts=False)`
# nutzt den in Schritt 13 eingeführten Upsert auf
# `(ticker, ingestion_source, record_type)` — der Job legt bei bestehenden
# provider_consensus-Rows KEINE neuen Duplikate an und lässt `published`
# unverändert. Bei Provider-Fehlern werden bestehende gültige Rows nicht
# überschrieben (siehe `_sync_analysts` Try/Except-Wrapper).


@router.post("/cron/stock-research-analyst-sync", summary="Täglicher Analystenkonsens-Refresh (Cron)")
async def cron_stock_research_analyst_sync(request: Request):
    _verify_cron_bearer(request.headers.get("authorization"))
    run_id = _secrets.token_hex(8)
    started = datetime.now(timezone.utc).isoformat()

    async def _job() -> None:
        try:
            result = await _run_sync(
                auto_publish_analysts=False,
                tickers=None,
                sync_type="analyst",
            )
            logger.info(
                "cron_stock_research_analyst_sync ok run_id=%s analyst=%s duration_ms=%s",
                run_id, result.get("analyst"), result.get("duration_ms"),
            )
        except Exception:  # noqa: BLE001
            logger.exception("cron_stock_research_analyst_sync failed run_id=%s", run_id)

    asyncio.create_task(_job())
    return {
        "accepted": True,
        "run_id": run_id,
        "job": "stock-research-analyst-sync",
        "started_at": started,
    }
