"""News-Pipeline Freshness Alarm (Session 77.6).

Serverseitige Two-Strike-Alarmierung basierend auf `job_summaries`. Wird nach
jedem Cron/Manual-Lauf von fetch/synthesize aufgerufen. Sendet genau EINE
Warnmail beim Übergang in den Alarmzustand und optional eine Recovery-Mail
beim Übergang zurück.

State-Doc: `job_summaries._id = "alert_state"`
    consecutive_problem_count: int
    alert_active: bool
    last_alert_at: datetime | None
    last_recovery_at: datetime | None
    last_status: "fresh" | "stale" | "error"
    updated_at: datetime

Aufruf muss immer in try/except gewrappt sein — Alarm-Fehler dürfen die
News-Pipeline NIE blockieren.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

STATE_ID = "alert_state"
PROBLEM_STATES = {"stale", "error"}
STRIKE_THRESHOLD = 2  # zweiter aufeinanderfolgender Problemzustand → Mail

FRESH_MAX_AGE_MIN = 120  # ≤2h seit letztem Success = fresh
ERROR_STALE_AGE_MIN = 60  # error nur, wenn zusätzlich >1h alt


def _iso(v):
    return v.isoformat() if isinstance(v, datetime) else None


def _compute_freshness(fetch_summary: Optional[dict], now: datetime) -> str:
    """Gleiche Regeln wie `/api/news/admin/status`."""
    if not fetch_summary:
        return "error"
    last_ok = fetch_summary.get("last_success_at")
    if not isinstance(last_ok, datetime):
        return "error"
    age_min = (now - last_ok).total_seconds() / 60.0
    errors_count = 0
    ls = fetch_summary.get("last_summary")
    if isinstance(ls, dict):
        errors_count = int(ls.get("errors") or 0)
    if errors_count > 0 and age_min > ERROR_STALE_AGE_MIN:
        return "error"
    if age_min <= FRESH_MAX_AGE_MIN:
        return "fresh"
    return "stale"


def _alert_html(*, status: str, fetch: dict, synth: dict, newest_at: Optional[datetime], now: datetime) -> str:
    ls = fetch.get("last_summary") or {}
    ss = synth.get("last_summary") or {}
    fetch_errors = ls.get("errors")
    return f"""
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color:#1E292B; line-height:1.5;">
      <h2 style="margin:0 0 12px; font-size:18px;">Fröhlich News-Pipeline: Aktualisierung gestört</h2>
      <p style="margin:0 0 12px; color:#667675;">Der automatische News-Freshness-Check meldet den Zustand
        <b style="color:{'#B45309' if status == 'stale' else '#B91C1C'};">{status.upper()}</b>
        in zwei aufeinanderfolgenden Läufen.</p>
      <table style="border-collapse:collapse; font-size:13px; margin:12px 0;">
        <tr><td style="padding:4px 12px 4px 0; color:#667675;">Letzter erfolgreicher Fetch:</td>
            <td><b>{_iso(fetch.get('last_success_at')) or '—'}</b></td></tr>
        <tr><td style="padding:4px 12px 4px 0; color:#667675;">Letzter erfolgreicher Synthesize:</td>
            <td><b>{_iso(synth.get('last_success_at')) or '—'}</b></td></tr>
        <tr><td style="padding:4px 12px 4px 0; color:#667675;">Neuester veröffentlichter Artikel:</td>
            <td><b>{_iso(newest_at) or '—'}</b></td></tr>
        <tr><td style="padding:4px 12px 4px 0; color:#667675;">Fetch-Fehler (letzter Lauf):</td>
            <td><b>{fetch_errors if fetch_errors is not None else '—'}</b></td></tr>
        <tr><td style="padding:4px 12px 4px 0; color:#667675;">Synthesize LLM-Fehler:</td>
            <td><b>{ss.get('llm_failed', '—')}</b></td></tr>
        <tr><td style="padding:4px 12px 4px 0; color:#667675;">Server-Zeit:</td>
            <td><b>{_iso(now)}</b></td></tr>
      </table>
      <p style="margin:16px 0 0; font-size:12px; color:#667675;">
        Details im Admin: <a href="/admin" style="color:#527F7B;">/admin</a>
      </p>
    </div>
    """


def _recovery_html(*, fetch: dict, synth: dict, newest_at: Optional[datetime], now: datetime) -> str:
    return f"""
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color:#1E292B; line-height:1.5;">
      <h2 style="margin:0 0 12px; font-size:18px;">Fröhlich News-Pipeline wieder aktuell</h2>
      <p style="margin:0 0 12px; color:#667675;">Der Freshness-Check ist wieder auf <b style="color:#527F7B;">FRESH</b>.</p>
      <table style="border-collapse:collapse; font-size:13px; margin:12px 0;">
        <tr><td style="padding:4px 12px 4px 0; color:#667675;">Erholt am:</td><td><b>{_iso(now)}</b></td></tr>
        <tr><td style="padding:4px 12px 4px 0; color:#667675;">Letzter erfolgreicher Fetch:</td>
            <td><b>{_iso(fetch.get('last_success_at')) or '—'}</b></td></tr>
        <tr><td style="padding:4px 12px 4px 0; color:#667675;">Letzter erfolgreicher Synthesize:</td>
            <td><b>{_iso(synth.get('last_success_at')) or '—'}</b></td></tr>
        <tr><td style="padding:4px 12px 4px 0; color:#667675;">Neuester Artikel:</td>
            <td><b>{_iso(newest_at) or '—'}</b></td></tr>
      </table>
    </div>
    """


def _alert_recipient() -> Optional[str]:
    """NEWS_ALERT_TO ist optional; Fallback auf verifizierten PRODUCT_INQUIRY_TO
    (kapitalmitte.com-Domain, bereits produktiv im Einsatz)."""
    val = (os.environ.get("NEWS_ALERT_TO") or os.environ.get("PRODUCT_INQUIRY_TO") or "").strip()
    return val or None


async def evaluate_and_alert(db, send_email) -> dict:
    """Bewertet Freshness und triggert Two-Strike-Mailing.

    Rückgabewert dient nur Debug/Tests — nie geworfene Exceptions.
    """
    now = datetime.now(timezone.utc)
    fetch_sum = await db.job_summaries.find_one({"_id": "fetch_feeds"}) or {}
    synth_sum = await db.job_summaries.find_one({"_id": "synthesize_pending"}) or {}
    state = await db.job_summaries.find_one({"_id": STATE_ID}) or {}

    freshness = _compute_freshness(fetch_sum, now)
    is_problem = freshness in PROBLEM_STATES
    prev_count = int(state.get("consecutive_problem_count") or 0)
    alert_active = bool(state.get("alert_active"))

    result = {"freshness": freshness, "action": "noop"}

    if is_problem:
        new_count = prev_count + 1
        should_send = (not alert_active) and new_count >= STRIKE_THRESHOLD
        update = {
            "consecutive_problem_count": new_count,
            "last_status": freshness,
            "updated_at": now,
        }
        if should_send:
            recipient = _alert_recipient()
            if not recipient:
                logger.warning("news_alert: no recipient configured (NEWS_ALERT_TO / PRODUCT_INQUIRY_TO)")
                result["action"] = "skipped_no_recipient"
            else:
                newest = await db.news_articles.find_one(
                    {"status": "published"}, sort=[("published_at", -1)],
                    projection={"published_at": 1, "_id": 0},
                )
                newest_at = newest.get("published_at") if newest else None
                try:
                    email_id = await send_email(
                        recipient,
                        f"Fröhlich News-Pipeline: Aktualisierung gestört ({freshness})",
                        _alert_html(status=freshness, fetch=fetch_sum, synth=synth_sum,
                                    newest_at=newest_at, now=now),
                    )
                    update["alert_active"] = True
                    update["last_alert_at"] = now
                    result["action"] = "alert_sent"
                    result["email_id"] = email_id
                    logger.info("news_alert: WARN mail sent to=%s status=%s email_id=%s",
                                recipient, freshness, email_id)
                except Exception as e:  # noqa: BLE001
                    logger.warning("news_alert: WARN mail send failed: %s", e)
                    result["action"] = "alert_send_failed"
        await db.job_summaries.update_one({"_id": STATE_ID}, {"$set": update}, upsert=True)
        return result

    # Freshness == "fresh"
    update = {
        "consecutive_problem_count": 0,
        "last_status": freshness,
        "updated_at": now,
    }
    if alert_active:
        recipient = _alert_recipient()
        if recipient:
            newest = await db.news_articles.find_one(
                {"status": "published"}, sort=[("published_at", -1)],
                projection={"published_at": 1, "_id": 0},
            )
            newest_at = newest.get("published_at") if newest else None
            try:
                email_id = await send_email(
                    recipient,
                    "Fröhlich News-Pipeline wieder aktuell",
                    _recovery_html(fetch=fetch_sum, synth=synth_sum, newest_at=newest_at, now=now),
                )
                result["action"] = "recovery_sent"
                result["email_id"] = email_id
                logger.info("news_alert: RECOVERY mail sent to=%s email_id=%s", recipient, email_id)
            except Exception as e:  # noqa: BLE001
                logger.warning("news_alert: RECOVERY mail send failed: %s", e)
                result["action"] = "recovery_send_failed"
        update["alert_active"] = False
        update["last_recovery_at"] = now
    await db.job_summaries.update_one({"_id": STATE_ID}, {"$set": update}, upsert=True)
    return result
