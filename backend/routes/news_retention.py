"""HTTP-Routen für die News Retention Archive-Pipeline und News-Alert-Rehearsal.

Wird aus `server.py` am Ende geladen (analog zu den anderen Route-Modulen), damit
`require_admin` und die Mongo-DB-Instanz bereits initialisiert sind.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from server import db, require_admin, _send_email_via_emergent
from news_retention import (
    DEFAULT_BATCH_SIZE,
    DEFAULT_RETENTION_DAYS,
    retention_status,
    run_retention_archive,
)
from news_alert import send_escalation_test_mail

router = APIRouter(prefix="/api", tags=["news-retention"])

# Session 79.4 — kurzer serverseitiger Cooldown gegen Spam-Klicks. Wir
# verwenden das bereits vorhandene `job_summaries.last_attempt_at` als Quelle;
# keine neue Rate-Limit-Infrastruktur.
REHEARSAL_COOLDOWN_SECONDS = 60


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


@router.post(
    "/news/admin/alerts/escalation/test",
    summary="Admin: Test-Eskalationsmail über die echte Mail-Infra versenden (kein Incident)",
)
async def _admin_escalation_rehearsal(user: dict = Depends(require_admin)):
    """Löst genau eine Rehearsal-Mail an ``NEWS_ALERT_ESCALATION_TO`` aus.

    Wichtige Garantien:
    - Verwendet exakt denselben Mail-Sender wie die echte Eskalation.
    - Verändert **keinen** produktiven Alert-State (`alert_state`).
    - Wird in ``job_summaries._id="news_alert_escalation_rehearsal"`` auditiert.
    - Server-seitiger 60s-Cooldown pro Umgebung gegen versehentliche Spam-Klicks.
    """
    now = datetime.now(timezone.utc)
    # Cooldown-Check (nutzt vorhandenes job_summaries — keine neue Infrastruktur).
    prev = await db.job_summaries.find_one({"_id": "news_alert_escalation_rehearsal"}) or {}
    last_attempt = prev.get("last_attempt_at")
    if isinstance(last_attempt, datetime):
        elapsed = (now - last_attempt).total_seconds()
        if elapsed < REHEARSAL_COOLDOWN_SECONDS:
            wait = int(REHEARSAL_COOLDOWN_SECONDS - elapsed)
            raise HTTPException(
                status_code=429,
                detail=f"Rehearsal-Cooldown aktiv — bitte in {wait}s erneut versuchen.",
            )

    admin_email = (user or {}).get("email") if isinstance(user, dict) else None
    result = await send_escalation_test_mail(db, _send_email_via_emergent, admin_email=admin_email)
    return result


@router.get(
    "/news/admin/alerts/escalation/rehearsal-status",
    summary="Admin: Zeitpunkt und Ergebnis des letzten Rehearsal-Versands",
)
async def _admin_escalation_rehearsal_status(_user: dict = Depends(require_admin)):
    doc = await db.job_summaries.find_one({"_id": "news_alert_escalation_rehearsal"}) or {}

    def _iso(v):
        return v.isoformat() if isinstance(v, datetime) else None

    return {
        "last_attempt_at": _iso(doc.get("last_attempt_at")),
        "last_admin": doc.get("last_admin"),
        "last_summary": doc.get("last_summary"),
    }
