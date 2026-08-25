"""News-Pipeline Freshness Alarm (Session 77.6 + 79.1 Escalation Ladder).

Serverseitige Two-Strike-Alarmierung basierend auf `job_summaries`. Wird nach
jedem Cron/Manual-Lauf von fetch/synthesize aufgerufen. Sendet genau EINE
Warnmail beim Übergang in den Alarmzustand und optional eine Recovery-Mail
beim Übergang zurück.

Session 79.1 — Escalation Ladder
────────────────────────────────
Wenn ein Alarm ≥ `ESCALATION_AGE_HOURS` (Default 6h) ununterbrochen aktiv
bleibt, wird zusätzlich genau **eine** Eskalations-Mail an einen erweiterten
Verteiler (`NEWS_ALERT_ESCALATION_TO`, kommagetrennt) versendet. Bei Recovery
wird der Incident-State komplett zurückgesetzt, sodass ein neuer Incident
wieder eskalierbar ist.

State-Doc: `job_summaries._id = "alert_state"`
    consecutive_problem_count: int
    alert_active: bool
    last_alert_at: datetime | None            (Zeitpunkt der ersten WARN-Mail)
    last_recovery_at: datetime | None
    last_status: "fresh" | "stale" | "error"
    updated_at: datetime
    # neu ab 79.1
    incident_started_at: datetime | None      (Beginn der aktuellen Incident-Periode)
    escalation_sent_at: datetime | None       (verhindert doppelte Eskalationen)
    last_escalation_error: str | None         (letzte Fehlermeldung beim Versand)

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

# Session 79.1 — Eskalations-Schwelle.
ESCALATION_AGE_HOURS = float(os.environ.get("NEWS_ALERT_ESCALATION_HOURS", "6") or 6)


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


def _escalation_html(*, status: str, fetch: dict, synth: dict, newest_at: Optional[datetime],
                     incident_started_at: datetime, first_alert_sent_at: Optional[datetime],
                     age_hours: float, now: datetime) -> str:
    """Session 79.1 — Body für die 2. Eskalations-Mail. Klar als
    Eskalation gekennzeichnet, hebt Dauer und ersten Alert hervor. Keine Secrets.
    """
    ls = fetch.get("last_summary") or {}
    ss = synth.get("last_summary") or {}
    fetch_errors = ls.get("errors")
    return f"""
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color:#1E292B; line-height:1.5;">
      <div style="background:#B91C1C; color:#fff; padding:12px 16px; border-radius:8px; margin-bottom:16px;">
        <h2 style="margin:0; font-size:18px;">ESKALATION — Fröhlich News-Pipeline ununterbrochen gestört</h2>
      </div>
      <p style="margin:0 0 12px; color:#1E292B;">
        Die News-Pipeline befindet sich seit <b>≥ {age_hours:.1f} Stunden</b> ununterbrochen im Alarmzustand
        <b style="color:{'#B45309' if status == 'stale' else '#B91C1C'};">{status.upper()}</b>.
        Der erste Alarm wurde bereits versendet, ohne dass sich die Situation erholt hat.
      </p>
      <table style="border-collapse:collapse; font-size:13px; margin:12px 0;">
        <tr><td style="padding:4px 12px 4px 0; color:#667675;">Incident gestartet:</td>
            <td><b>{_iso(incident_started_at) or '—'}</b></td></tr>
        <tr><td style="padding:4px 12px 4px 0; color:#667675;">Erster Alarm versendet:</td>
            <td><b>{_iso(first_alert_sent_at) or '—'}</b></td></tr>
        <tr><td style="padding:4px 12px 4px 0; color:#667675;">Aktuelle Dauer:</td>
            <td><b>{age_hours:.1f} Stunden</b></td></tr>
        <tr><td style="padding:4px 12px 4px 0; color:#667675;">Aktueller Status:</td>
            <td><b>{status.upper()}</b></td></tr>
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
        Diese Mail wird pro Incident genau einmal versendet. Details im Admin:
        <a href="/admin" style="color:#527F7B;">/admin</a>
      </p>
    </div>
    """


def _alert_recipient() -> Optional[str]:
    """NEWS_ALERT_TO ist optional; Fallback auf verifizierten PRODUCT_INQUIRY_TO
    (kapitalmitte.com-Domain, bereits produktiv im Einsatz)."""
    val = (os.environ.get("NEWS_ALERT_TO") or os.environ.get("PRODUCT_INQUIRY_TO") or "").strip()
    return val or None


def _escalation_recipients() -> list[str]:
    """Session 79.1 — Eskalationsverteiler.

    Kommagetrennte Liste in `NEWS_ALERT_ESCALATION_TO`. Whitespace-getrimmte
    Adressen; leere Einträge werden verworfen. Wenn die ENV fehlt/leer ist,
    liefert die Funktion `[]` — der Aufrufer muss dann sauber überspringen.
    """
    raw = (os.environ.get("NEWS_ALERT_ESCALATION_TO") or "").strip()
    if not raw:
        return []
    return [a.strip() for a in raw.split(",") if a.strip()]


async def _maybe_escalate(db, send_email, *, state: dict, fetch: dict, synth: dict,
                          freshness: str, now: datetime) -> dict:
    """Session 79.1 — Prüft, ob eine Eskalations-Mail fällig ist, und versendet
    ggf. genau eine. Idempotent: `escalation_sent_at` verhindert Doppel-Versand.

    Rückgabe: Sub-Result mit `escalation_due`, `escalation_sent` und optional
    `mail_error`. Wird vom Caller in die Log-Zeile gemerged.
    """
    incident_started_at = state.get("incident_started_at")
    already_escalated = state.get("escalation_sent_at") is not None

    if not isinstance(incident_started_at, datetime):
        return {"escalation_due": False, "escalation_sent": False}

    age_hours = (now - incident_started_at).total_seconds() / 3600.0
    if age_hours < ESCALATION_AGE_HOURS:
        return {"escalation_due": False, "escalation_sent": False,
                "age_hours": round(age_hours, 3)}
    if already_escalated:
        return {"escalation_due": False, "escalation_sent": False,
                "age_hours": round(age_hours, 3), "reason": "already_sent"}

    recipients = _escalation_recipients()
    if not recipients:
        logger.warning("news_alert: escalation due (%.2fh) but NEWS_ALERT_ESCALATION_TO is not set — skipping",
                       age_hours)
        return {"escalation_due": True, "escalation_sent": False,
                "age_hours": round(age_hours, 3), "reason": "no_recipients"}

    newest = await db.news_articles.find_one(
        {"status": "published"}, sort=[("published_at", -1)],
        projection={"published_at": 1, "_id": 0},
    )
    newest_at = newest.get("published_at") if newest else None
    first_alert_sent_at = state.get("last_alert_at")

    subject = f"[ESKALATION] Fröhlich News-Pipeline seit ≥{age_hours:.1f}h gestört ({freshness})"
    html = _escalation_html(
        status=freshness, fetch=fetch, synth=synth, newest_at=newest_at,
        incident_started_at=incident_started_at, first_alert_sent_at=first_alert_sent_at,
        age_hours=age_hours, now=now,
    )

    # Ein Recipient-Fehler darf die anderen nicht blockieren. Wir versuchen alle
    # und markieren `escalation_sent_at` nur, wenn mindestens 1 Empfang bestätigt
    # ist. Für Retry-Bewertung wird der letzte Fehler in `last_escalation_error`
    # persistiert (überschrieben pro Run — kein Log-Flooding).
    delivered: list[dict] = []
    last_error: Optional[str] = None
    for to in recipients:
        try:
            email_id = await send_email(to, subject, html)
            delivered.append({"to": to, "email_id": email_id})
            logger.info("news_alert: ESCALATION mail sent to=%s status=%s email_id=%s age=%.2fh",
                        to, freshness, email_id, age_hours)
        except Exception as e:  # noqa: BLE001
            last_error = f"{type(e).__name__}: {e}"
            logger.warning("news_alert: ESCALATION mail send failed to=%s err=%s", to, e)

    if not delivered:
        # Kein Empfänger erreicht → escalation_sent_at NICHT setzen (Retry beim
        # nächsten Check). last_escalation_error für Observability persistieren.
        await db.job_summaries.update_one(
            {"_id": STATE_ID},
            {"$set": {"last_escalation_error": last_error, "updated_at": now}},
            upsert=True,
        )
        return {"escalation_due": True, "escalation_sent": False,
                "age_hours": round(age_hours, 3), "mail_error": last_error}

    # Mindestens 1 Empfänger bestätigt → als „eskaliert" markieren.
    update = {
        "escalation_sent_at": now,
        "updated_at": now,
    }
    if last_error is None:
        update["last_escalation_error"] = None
    else:
        update["last_escalation_error"] = last_error
    await db.job_summaries.update_one({"_id": STATE_ID}, {"$set": update}, upsert=True)
    return {
        "escalation_due": True,
        "escalation_sent": True,
        "age_hours": round(age_hours, 3),
        "recipients": [d["to"] for d in delivered],
        "email_ids": [d["email_id"] for d in delivered],
        "mail_error": last_error,
    }


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

    result: dict = {"freshness": freshness, "action": "noop"}

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
                    # Session 79.1 — Incident-Start markieren, Eskalations-State
                    # sauber zurücksetzen. Falls hier ein Legacy-Alert bereits
                    # aktiv wäre (Migration), würde die Erst-Mail nie erneut
                    # senden — daher nur beim tatsächlichen Erst-Versand setzen.
                    update["incident_started_at"] = now
                    update["escalation_sent_at"] = None
                    update["last_escalation_error"] = None
                    result["action"] = "alert_sent"
                    result["email_id"] = email_id
                    logger.info("news_alert: WARN mail sent to=%s status=%s email_id=%s",
                                recipient, freshness, email_id)
                except Exception as e:  # noqa: BLE001
                    logger.warning("news_alert: WARN mail send failed: %s", e)
                    result["action"] = "alert_send_failed"
        await db.job_summaries.update_one({"_id": STATE_ID}, {"$set": update}, upsert=True)

        # Session 79.1 — Escalation-Check läuft NACH dem WARN-Block, damit ein
        # bereits aktiver Alarm nach 6h+ eskaliert wird. Bei frisch versandter
        # WARN-Mail lädt _maybe_escalate den neuen `incident_started_at` (=now),
        # wodurch die Alterprüfung 0h ergibt → keine Doppel-Mail.
        try:
            fresh_state = await db.job_summaries.find_one({"_id": STATE_ID}) or {}
            esc = await _maybe_escalate(db, send_email, state=fresh_state,
                                        fetch=fetch_sum, synth=synth_sum,
                                        freshness=freshness, now=now)
            if esc.get("escalation_sent"):
                # Erst-Mail hat action='alert_sent' bereits gesetzt; die Eskalation
                # überschreibt keine erste Aktion — sie wird separat in result gemerged.
                if result["action"] == "noop":
                    result["action"] = "escalation_sent"
                else:
                    result["also"] = "escalation_sent"
            result["escalation"] = esc
        except Exception:  # noqa: BLE001
            logger.exception("news_alert: escalation check failed")
        return result

    # Freshness == "fresh" — Recovery-Pfad.
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
        # Session 79.1 — Incident-State vollständig zurücksetzen, damit ein neuer
        # Incident wieder eskalierbar ist.
        update["incident_started_at"] = None
        update["escalation_sent_at"] = None
        update["last_escalation_error"] = None
    await db.job_summaries.update_one({"_id": STATE_ID}, {"$set": update}, upsert=True)
    return result
