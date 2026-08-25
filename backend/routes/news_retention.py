"""HTTP-Routen für die News Retention Archive-Pipeline.

Wird aus `server.py` am Ende geladen (analog zu den anderen Route-Modulen), damit
`require_admin` und die Mongo-DB-Instanz bereits initialisiert sind.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from server import db, require_admin
from news_retention import (
    DEFAULT_BATCH_SIZE,
    DEFAULT_RETENTION_DAYS,
    retention_status,
    run_retention_archive,
)

router = APIRouter(prefix="/api", tags=["news-retention"])


@router.post(
    "/news/admin/retention/archive",
    summary="Admin: Retention-Archivierung ausführen (dry_run optional)",
)
async def _admin_retention_archive(
    dry_run: bool = Query(False, description="Nur Statistik, keine DB-Änderungen."),
    retention_days: int = Query(DEFAULT_RETENTION_DAYS, ge=1, le=3650),
    batch_size: int = Query(DEFAULT_BATCH_SIZE, ge=1, le=1000),
    _user: dict = Depends(require_admin),
):
    return await run_retention_archive(
        db,
        retention_days=retention_days,
        batch_size=batch_size,
        dry_run=dry_run,
    )


@router.get(
    "/news/admin/retention/status",
    summary="Admin: Retention-Health (Live-/Archive-Count + letzter Lauf)",
)
async def _admin_retention_status(_user: dict = Depends(require_admin)):
    return await retention_status(db)
