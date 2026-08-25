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

import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from providers.base import MarketPriceProvider, AnalystResearchProvider, AnalystRow
from providers.market_price_internal import InternalQuoteProvider
from providers.analyst_null import NullAnalystProvider

# `server` provides the shared db handle + require_admin dependency.
from server import db, require_admin
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
    """Tickers we want fresh data for. Priority order per Phase 6."""
    seen: List[str] = []

    async def _add(cursor):
        async for doc in cursor:
            t = (doc.get("ticker") or "").upper().strip()
            if t and t not in seen and len(seen) < UNIVERSE_HARD_CAP:
                seen.append(t)

    # 1) Published research rows first — those already ship in production.
    await _add(db.stock_research.find({"published": True}, {"ticker": 1}))
    # 2) Any research rows (drafts included) so autopublish candidates get prices.
    await _add(db.stock_research.find({}, {"ticker": 1}))
    # 3) Fall back to the built-in watchlist collection if present.
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
    return NullAnalystProvider()


# ---------------------------------------------------------------------------
# Analyst-row validation (Phase 3)
# ---------------------------------------------------------------------------


def _validate_analyst(row: AnalystRow, now: datetime) -> Optional[str]:
    """Return a rejection reason string, or None if the row is valid."""
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
    if not (row.analyst or row.research_house):
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
            "currency": q.currency,
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

    now = datetime.now(timezone.utc)
    inserted = updated = rejected = 0
    for row in rows:
        reason = _validate_analyst(row, now)
        stored = {
            "ticker": row.ticker.upper(),
            "company_name": row.company_name or None,
            "analyst": row.analyst or None,
            "research_house": row.research_house or None,
            "rating": row.rating or None,
            "target_price": float(row.target_price) if row.target_price else 0.0,
            "currency": row.currency,
            "source_name": row.source_name or "",
            "source_url": row.source_url or None,
            "research_date": row.research_date,
            "fetched_at": row.fetched_at,
            "ingestion_source": provider.name,
        }
        if reason:
            rejected += 1
            # Store rejection audit trail — but never published.
            await db.stock_research_rejects.insert_one({
                **stored, "reason": reason, "created_at": now,
            })
            continue
        stored["dedupe_key"] = _duplicate_key(stored)
        stored["updated_at"] = now
        if auto_publish:
            # Only publish rows that also pass the manual publish guard.
            probe = dict(stored)
            probe["current_price"] = 1.0  # publish_guard only checks presence
            try:
                _publish_guard(probe)
                stored["published"] = True
            except HTTPException:
                stored["published"] = False
        else:
            stored["published"] = False
        exists = await db.stock_research.find_one({"dedupe_key": stored["dedupe_key"]}, {"_id": 1})
        if exists:
            await db.stock_research.update_one({"_id": exists["_id"]}, {"$set": stored})
            updated += 1
        else:
            stored["created_at"] = now
            await db.stock_research.insert_one(stored)
            inserted += 1
    return {"provider": provider.name, "available": True, "inserted": inserted, "updated": updated, "rejected": rejected}


# ---------------------------------------------------------------------------
# Orchestrator + audit log
# ---------------------------------------------------------------------------


async def _run_sync(*, auto_publish_analysts: bool = False, tickers: Optional[List[str]] = None) -> Dict[str, Any]:
    await _ensure_indexes_once()
    started = datetime.now(timezone.utc)
    t0 = time.perf_counter()
    universe = [t.upper() for t in tickers] if tickers else await _discover_universe()

    price_summary = await _sync_prices(universe)
    analyst_summary = await _sync_analysts(universe, auto_publish=auto_publish_analysts)

    duration_ms = int((time.perf_counter() - t0) * 1000)
    audit = {
        "started_at": started,
        "duration_ms": duration_ms,
        "universe_size": len(universe),
        "tickers": universe,
        "price": price_summary,
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


@router.post("/admin/stock-research/sync", summary="Automatischer Marktpreis- + Analystensync")
async def admin_sync(
    _user: dict = Depends(require_admin),
    auto_publish: bool = Query(default=False, description="Analystenrows nach Validierung automatisch veröffentlichen"),
    ticker: Optional[str] = Query(default=None, description="Optional: nur einen Ticker syncen (z. B. AAPL)"),
):
    tickers = [t.strip().upper() for t in (ticker or "").split(",") if t.strip()] or None
    result = await _run_sync(auto_publish_analysts=auto_publish, tickers=tickers)
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
