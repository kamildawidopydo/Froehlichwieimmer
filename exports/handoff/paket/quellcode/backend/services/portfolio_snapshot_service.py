"""
Portfolio-Snapshot-Service (Session 82.25 · Depot P0).

Persistiert genau EINEN Tages-Snapshot pro (user_id, snapshot_date).
Erneutes Laufen am gleichen Tag AKTUALISIERT den Snapshot mit dem
neuesten Live-Wert — es entsteht kein zweites Dokument.

Rules:
  * Source of Truth = `compute_portfolio_state` (identisch zu /api/portfolio/summary).
  * Cash für `total_value` = `cash.balance` (nicht `available`).
  * `stocks_valuation_complete` und `bonds_valuation_complete` werden mit
    persistiert, damit die UI unvollständige Bewertungen erkennen kann.
  * Kein historischer Fake-Backfill: es wird ausschließlich der HEUTIGE Wert
    geschrieben. Vergangene Tage werden nie rekonstruiert.
  * Kein 100%-Nominalwert bei fehlendem Bond-Preis, kein Fake-Bond-Preis.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone, date
from typing import Any, Optional

from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from services.portfolio_state import compute_portfolio_state


logger = logging.getLogger(__name__)


COLLECTION = "portfolio_snapshots"


async def ensure_indexes(db) -> None:
    """Idempotency-Index `(user_id, snapshot_date)` — bereits in
    portfolio.py als `user_date_unique` deklariert, hier defensiv."""
    await db[COLLECTION].create_index(
        [("user_id", 1), ("snapshot_date", 1)],
        unique=True,
        sparse=True,
        name="user_date_unique",
    )


def _today_iso() -> str:
    return date.today().isoformat()


async def create_or_update_daily_snapshot(
    db,
    user_oid: ObjectId,
    *,
    trigger: str = "manual",
) -> dict[str, Any]:
    """
    Berechnet den aktuellen Portfolio-State und upsertet den Snapshot
    für `today`. Rückgabe: der neue Snapshot-Datensatz (BSON-serialisiert).
    """
    state = await compute_portfolio_state(db, user_oid)
    today = _today_iso()
    now = datetime.now(timezone.utc)

    doc = {
        "user_id": user_oid,
        "snapshot_date": today,
        "total_value": float(state["total_value"]),
        "cash_value": float(state["cash"]["balance"]),
        "stock_value": float(state["stocks"]["market_value"]),
        "bond_value": float(state["bonds"]["market_value"]),
        "invested": float(state["invested"]),
        "profit_loss": float(state["profit_loss"]),
        "profit_loss_pct": float(state["profit_loss_pct"]),
        "stocks_valuation_complete": bool(state["stocks"]["valuation_complete"]),
        "bonds_valuation_complete": bool(state["bonds"]["valuation_complete"]),
        "unpriced_symbols": list(state["stocks"].get("unpriced_symbols") or []),
        "currency": "EUR",
        "updated_at": now,
        "trigger": trigger,
    }

    # Upsert nach (user_id, snapshot_date) — Idempotenz per Unique-Index.
    try:
        await db[COLLECTION].update_one(
            {"user_id": user_oid, "snapshot_date": today},
            {
                "$set": doc,
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
        )
    except DuplicateKeyError:
        # Race-Condition (paralleler Lauf) — zweiter Versuch als reines Update.
        await db[COLLECTION].update_one(
            {"user_id": user_oid, "snapshot_date": today},
            {"$set": doc},
        )

    return doc


async def run_daily_snapshots_for_all_users(
    db,
    *,
    trigger: str = "cron",
    limit: Optional[int] = None,
) -> dict[str, Any]:
    """
    Iteriert alle aktiven User (nicht deleted/inactive) und erzeugt/aktualisiert
    deren Tages-Snapshot. Kein Aggregations-Rollup — pro User ein Snapshot.
    """
    started_at = datetime.now(timezone.utc)
    query: dict[str, Any] = {"is_active": {"$ne": False}}
    cursor = db.users.find(query, projection={"_id": 1}).sort("_id", 1)
    if limit and limit > 0:
        cursor = cursor.limit(int(limit))

    total = 0
    success = 0
    errors = 0
    error_samples: list[dict[str, Any]] = []

    async for u in cursor:
        total += 1
        uid = u["_id"]
        if not isinstance(uid, ObjectId):
            # Legacy-Row mit String-ID — überspringen (Snapshot-Writes strikt ObjectId).
            errors += 1
            if len(error_samples) < 5:
                error_samples.append({"user_id": str(uid), "reason": "non-objectid"})
            continue
        try:
            await create_or_update_daily_snapshot(db, uid, trigger=trigger)
            success += 1
        except Exception as exc:  # noqa: BLE001
            errors += 1
            logger.exception("snapshot_failed uid=%s", str(uid))
            if len(error_samples) < 5:
                error_samples.append({"user_id": str(uid), "reason": str(exc)[:180]})

    finished_at = datetime.now(timezone.utc)
    report = {
        "trigger": trigger,
        "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat(),
        "duration_ms": int((finished_at - started_at).total_seconds() * 1000),
        "users_total": total,
        "success": success,
        "errors": errors,
        "error_samples": error_samples,
        "snapshot_date": _today_iso(),
    }
    logger.info("portfolio_snapshots_run report=%s", report)
    return report
