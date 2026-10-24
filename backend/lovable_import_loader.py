"""Idempotenter Import der Lovable-Kunden (backend/data/lovable_import/import.json).

Legt fehlende Konten, Newsletter-Anmeldungen und Vertragsanträge an. Einladungs-
E-Mails (Passwort setzen) werden nur außerhalb der Preview-Umgebung und je
Konto genau einmal verschickt.
"""
from __future__ import annotations

import asyncio
import hashlib
import html
import json
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlparse

logger = logging.getLogger(__name__)
_FILE = Path(__file__).parent / "data" / "lovable_import" / "import.json"
_SITE_URL = "https://essenceinvest.com"
_NO_INVITE = {"test@test.de"}
_USER_FIELDS = ("first_name", "last_name", "phone", "country", "street", "house_number",
                "address_addition", "postal_code", "city", "onboarding_completed")


def _dt(value):
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except Exception:
        return datetime.now(timezone.utc)


def _is_preview() -> bool:
    return "preview.emergentagent.com" in urlparse(os.environ.get("FRONTEND_URL", "")).netloc


def _invite_html(name: str, link: str) -> str:
    return (
        "<div style='font-family:Arial,sans-serif;color:#1a1a1d;line-height:1.6'>"
        f"<p>Guten Tag {html.escape(name or '')},</p>"
        "<p>die Website der Fröhlich Vermögensberatung ist umgezogen. Ihr Kundenkonto haben wir "
        "für Sie übernommen. Bitte legen Sie einmalig ein neues Passwort fest:</p>"
        f"<p><a href='{link}' style='display:inline-block;background:#1F4D3A;color:#fff;padding:12px 24px;"
        "border-radius:999px;text-decoration:none'>Passwort festlegen</a></p>"
        "<p style='color:#6b6459;font-size:13px'>Der Link ist 7 Tage gültig. Danach können Sie auf der "
        "Anmeldeseite jederzeit „Passwort vergessen“ nutzen.</p>"
        "<p>Mit freundlichen Grüßen<br>Fröhlich Vermögensberatung GmbH</p></div>"
    )


async def _import_users(db, users, hash_password) -> int:
    inserted = 0
    for u in users:
        if await db.users.find_one({"email": u["email"]}, {"_id": 1}):
            continue
        doc = {
            "email": u["email"],
            "name": u.get("name") or "",
            "role": u.get("role", "user"),
            "avatar_url": None,
            "password_hash": hash_password(secrets.token_urlsafe(32)),
            "must_change_password": True,
            "verified": bool(u.get("verified")),
            "imported_from": "lovable",
            "lovable_ids": u.get("lovable_ids", []),
            "created_at": _dt(u.get("created_at")),
            "imported_at": datetime.now(timezone.utc),
        }
        doc.update({k: u[k] for k in _USER_FIELDS if u.get(k) not in (None, "")})
        await db.users.insert_one(doc)
        inserted += 1
    return inserted


async def _import_submissions(db, subs) -> int:
    inserted = 0
    for s in subs:
        if s["type"] == "newsletter":
            if await db.newsletter_subscribers.find_one({"email": s["email"]}, {"_id": 1}):
                continue
            ts = _dt(s["created_at"]).isoformat()
            await db.newsletter_subscribers.insert_one({
                "email": s["email"], "source": s["source"], "consent": s["consent"], "consent_at": ts,
                "created_at": ts, "unsubscribed": False, "imported_from": "lovable", "lovable_id": s["lovable_id"],
            })
        else:
            if await db.contract_form_submissions.find_one({"lovable_id": s["lovable_id"]}, {"_id": 1}):
                continue
            await db.contract_form_submissions.insert_one({
                "product_key": s["product_key"], "bank_name": s["bank_name"],
                "customer_name": s["customer_name"], "customer_email": s["customer_email"],
                "summary": s["summary"], "files": [], "status": "imported",
                "imported_from": "lovable", "lovable_id": s["lovable_id"],
                "created_at": _dt(s["created_at"]), "updated_at": datetime.now(timezone.utc),
            })
        inserted += 1
    return inserted


async def _send_invites(db, send_email) -> int:
    sent = 0
    async for user in db.users.find({"imported_from": "lovable", "invite_sent_at": {"$exists": False},
                                     "email": {"$nin": list(_NO_INVITE)}}):
        raw = secrets.token_urlsafe(32)
        now = datetime.now(timezone.utc)
        await db.password_reset_tokens.insert_one({
            "token_hash": hashlib.sha256(raw.encode()).hexdigest(), "user_id": user["_id"], "used": False,
            "expires_at": now + timedelta(days=7), "created_at": now, "purpose": "lovable_invite",
        })
        try:
            await send_email(
                to=user["email"],
                subject="Ihr Kundenkonto bei der Fröhlich Vermögensberatung",
                html=_invite_html(user.get("name"), f"{_SITE_URL}/reset-password?token={raw}"),
            )
        except Exception as exc:
            logger.warning("lovable_import: invite failed for %s: %s", user["email"].split("@")[-1], exc)
            continue
        await db.users.update_one({"_id": user["_id"]}, {"$set": {"invite_sent_at": now}})
        sent += 1
        await asyncio.sleep(2)
    return sent


async def import_lovable_customers(db) -> dict:
    try:
        return await _run(db)
    except Exception as exc:
        logger.warning("lovable_import failed: %s", exc)
        return {}


async def _run(db) -> dict:
    from server import _send_email_via_emergent, hash_password  # type: ignore

    data = json.loads(_FILE.read_text(encoding="utf-8"))
    result = {
        "users": await _import_users(db, data["users"], hash_password),
        "submissions": await _import_submissions(db, data["submissions"]),
        "invites": 0 if _is_preview() else await _send_invites(db, _send_email_via_emergent),
    }
    logger.info("lovable_import: %s", result)
    return result
