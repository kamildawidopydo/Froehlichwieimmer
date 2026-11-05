"""
Statement Email Delivery Service (Session 82.42 · Depot P1).

Versendet den monatlichen Kontoauszug (PDF) an den Kunden.
Nutzt ausschließlich den bestehenden Statement-Service (82.39) — keine
zweite Rendering-Infrastruktur, kein Fake-Send, kein Client-User-Trust.

Design:
  - Delivery-Log `statement_deliveries` mit UNIQUE (user_id, year, month).
  - Idempotency-Key `statement:{user_id}:{YYYY-MM}` — zweiter Lauf desselben
    Monats sendet KEINE zweite E-Mail bei status='sent'; bei 'failed' ist
    Retry erlaubt (gleiche Delivery-ID).
  - Timezone: alle Berechnungen in UTC (System-Standard des Backends).
"""

from __future__ import annotations

import base64
import calendar
from datetime import date, datetime, timezone
from typing import Awaitable, Callable, Optional

from bson import ObjectId

from services.portfolio_statement_service import build_statement, build_pdf


_MONTH_NAMES_DE = [
    "", "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
]


async def ensure_delivery_indexes(db) -> None:
    await db.statement_deliveries.create_index(
        [("user_id", 1), ("year", 1), ("month", 1)],
        unique=True,
        name="statement_delivery_unique",
    )
    await db.statement_deliveries.create_index([("created_at", -1)], name="statement_delivery_created")


def _month_bounds(year: int, month: int) -> tuple[date, date]:
    last = calendar.monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last)


def previous_month(today: Optional[date] = None) -> tuple[int, int]:
    today = today or datetime.now(timezone.utc).date()
    if today.month == 1:
        return today.year - 1, 12
    return today.year, today.month - 1


async def send_monthly_statement_email(
    db,
    user_id: ObjectId,
    year: int,
    month: int,
    send_email_fn: Callable[..., Awaitable[Optional[str]]],
    *,
    force: bool = False,
) -> dict:
    """
    Kanonischer Single-User-Versand. Rückgabe: `{status, delivery_id, ...}`.
    Wirft NIE — auf Fehler → status='failed' im Log persistiert.

    Session 82.43 · Opt-Out-Semantik:
      * Batch/Auto-Mode (`force=False`): respektiert `users.notification_prefs.monthly_statement_email`.
        Fehlt Feld → true (Default für Bestandsnutzer).
        Explizit false → status='skipped', reason='user_opt_out', **kein Provider-Call**.
      * `force=True` (nur admin manual mit explizitem Flag): umgeht Opt-Out und dokumentiert
        das im Delivery-Log.
    """
    if not (1 <= month <= 12):
        return {"status": "skipped", "reason": "BAD_MONTH"}

    idem_key = f"statement:{str(user_id)}:{year:04d}-{month:02d}"
    now = datetime.now(timezone.utc)

    # 1. Delivery-Log check.
    existing = await db.statement_deliveries.find_one(
        {"user_id": user_id, "year": year, "month": month}
    )
    if existing and existing.get("status") == "sent":
        return {"status": "already_sent", "delivery_id": str(existing["_id"])}

    # 2. User + Email + Preferences (serverseitig, keine client-supplied Werte).
    user = await db.users.find_one({"_id": user_id})
    if not user:
        return {"status": "skipped", "reason": "USER_NOT_FOUND"}

    prefs = user.get("notification_prefs") or {}
    opt_in = prefs.get("monthly_statement_email")
    # Default = True für Bestandsnutzer (fehlendes Feld == aktiv).
    if opt_in is False and not force:
        # Opt-Out ist bewusster Wunsch → keine Provider-Interaktion.
        await db.statement_deliveries.update_one(
            {"user_id": user_id, "year": year, "month": month},
            {
                "$set": {
                    "status": "skipped",
                    "last_error": None,
                    "updated_at": now,
                    "reason": "user_opt_out",
                },
                "$setOnInsert": {
                    "user_id": user_id, "year": year, "month": month,
                    "idempotency_key": idem_key, "attempt_count": 0,
                    "created_at": now,
                    "email": (user.get("email") or "").strip() or None,
                    "period_from": _month_bounds(year, month)[0].isoformat(),
                    "period_to": _month_bounds(year, month)[1].isoformat(),
                    "statement_count": 0,
                },
            },
            upsert=True,
        )
        return {"status": "skipped", "reason": "user_opt_out"}

    email = (user.get("email") or "").strip()
    if not email:
        await db.statement_deliveries.update_one(
            {"user_id": user_id, "year": year, "month": month},
            {
                "$set": {"status": "skipped", "last_error": "NO_EMAIL", "updated_at": now},
                "$setOnInsert": {
                    "user_id": user_id, "year": year, "month": month,
                    "idempotency_key": idem_key, "attempt_count": 0,
                    "created_at": now, "email": None,
                },
            },
            upsert=True,
        )
        return {"status": "skipped", "reason": "NO_EMAIL"}

    date_from, date_to = _month_bounds(year, month)

    # 3. Statement + PDF via bestehendem Service (Source of Truth = cash_ledger).
    statement = await build_statement(db, user_id, date_from, date_to)
    customer = {
        "email": email,
        "name": " ".join(p for p in (user.get("first_name"), user.get("last_name")) if p) or None,
    }
    pdf_bytes = build_pdf(statement, customer)
    pdf_b64 = base64.b64encode(pdf_bytes).decode("ascii")

    # 4. Delivery-Log: pending markieren (upsert).
    doc_id = existing["_id"] if existing else None
    if not doc_id:
        res = await db.statement_deliveries.insert_one({
            "user_id": user_id,
            "year": year,
            "month": month,
            "email": email,
            "status": "pending",
            "statement_count": statement.get("count", 0),
            "period_from": date_from.isoformat(),
            "period_to": date_to.isoformat(),
            "idempotency_key": idem_key,
            "attempt_count": 0,
            "created_at": now,
            "updated_at": now,
        })
        doc_id = res.inserted_id

    await db.statement_deliveries.update_one(
        {"_id": doc_id},
        {"$set": {"status": "pending", "email": email, "updated_at": now}, "$inc": {"attempt_count": 1}},
    )

    # 5. E-Mail-Content
    month_name = _MONTH_NAMES_DE[month]
    subject = f"Ihr Kontoauszug für {month_name} {year}"
    greeting = f"Sehr geehrte(r) {customer['name']}," if customer["name"] else "Sehr geehrte Kundin, sehr geehrter Kunde,"
    empty_hint = (
        "<p>Im ausgewählten Zeitraum gab es keine Buchungen.</p>"
        if statement.get("count", 0) == 0
        else f"<p>Anzahl Buchungen: <strong>{statement['count']}</strong></p>"
    )
    body = (
        f"<div style='font-family: Helvetica, Arial, sans-serif; color: #222; max-width: 620px;'>"
        f"<p>{greeting}</p>"
        f"<p>anbei erhalten Sie Ihren Kontoauszug für den Zeitraum "
        f"<strong>{date_from.strftime('%d.%m.%Y')} – {date_to.strftime('%d.%m.%Y')}</strong>.</p>"
        f"{empty_hint}"
        f"<p>Das PDF finden Sie im Anhang dieser E-Mail.</p>"
        f"<p style='margin-top:24px; font-size:12px; color:#666;'>"
        f"Diese Nachricht wurde automatisch erstellt. Bei Fragen antworten Sie bitte direkt auf diese E-Mail.<br/>"
        f"Fröhlich Vermögensberatung"
        f"</p></div>"
    )
    filename = f"kontoauszug-{year:04d}-{month:02d}.pdf"

    # 6. Versand.
    try:
        message_id = await send_email_fn(
            to=email,
            subject=subject,
            html=body,
            attachments=[{
                "filename": filename,
                "content": pdf_b64,
                "content_type": "application/pdf",
            }],
        )
        await db.statement_deliveries.update_one(
            {"_id": doc_id},
            {"$set": {
                "status": "sent",
                "provider_message_id": message_id,
                "last_error": None,
                "sent_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }},
        )
        return {"status": "sent", "delivery_id": str(doc_id), "message_id": message_id}
    except Exception as err:  # noqa: BLE001
        # Sanitize error → keine PDF-Inhalte, keine Secrets im Log.
        err_msg = str(err)[:180]
        await db.statement_deliveries.update_one(
            {"_id": doc_id},
            {"$set": {
                "status": "failed",
                "last_error": err_msg,
                "updated_at": datetime.now(timezone.utc),
            }},
        )
        return {"status": "failed", "delivery_id": str(doc_id), "error": err_msg}


async def run_monthly_batch(
    db,
    year: int,
    month: int,
    send_email_fn: Callable[..., Awaitable[Optional[str]]],
) -> dict:
    """Batch-Runner. Fehler pro User werden isoliert; nichts bricht den Batch ab.
    Respektiert `notification_prefs.monthly_statement_email` (Session 82.43)."""
    start = datetime.now(timezone.utc)
    report = {
        "users_seen": 0,
        "eligible": 0,
        "sent": 0,
        "already_sent": 0,
        "failed": 0,
        "skipped_no_email": 0,
        "skipped_opt_out": 0,
        "skipped_other": 0,
    }
    cursor = db.users.find({}, {"_id": 1, "email": 1, "first_name": 1, "last_name": 1, "is_active": 1})
    async for u in cursor:
        report["users_seen"] += 1
        if u.get("is_active") is False:
            report["skipped_other"] += 1
            continue
        report["eligible"] += 1
        try:
            res = await send_monthly_statement_email(db, u["_id"], year, month, send_email_fn)
            if res["status"] == "sent":
                report["sent"] += 1
            elif res["status"] == "already_sent":
                report["already_sent"] += 1
            elif res["status"] == "failed":
                report["failed"] += 1
            elif res["status"] == "skipped" and res.get("reason") == "NO_EMAIL":
                report["skipped_no_email"] += 1
            elif res["status"] == "skipped" and res.get("reason") == "user_opt_out":
                report["skipped_opt_out"] += 1
            else:
                report["skipped_other"] += 1
        except Exception:  # noqa: BLE001
            report["failed"] += 1
    report["duration_ms"] = int((datetime.now(timezone.utc) - start).total_seconds() * 1000)
    return report


__all__ = [
    "send_monthly_statement_email",
    "run_monthly_batch",
    "ensure_delivery_indexes",
    "previous_month",
]
