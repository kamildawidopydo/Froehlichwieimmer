"""Idempotenter Import der Lovable-Kunden (backend/data/lovable_import/import.json).

Legt fehlende Konten, Newsletter-Anmeldungen und Vertragsanträge an.
Es werden KEINE E-Mails an Kunden verschickt.
"""
from __future__ import annotations

import json
import logging
import secrets
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)
_FILE = Path(__file__).parent / "data" / "lovable_import" / "import.json"
_USER_FIELDS = ("first_name", "last_name", "phone", "country", "street", "house_number",
                "address_addition", "postal_code", "city", "onboarding_completed")


def _dt(value):
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except Exception:
        return datetime.now(timezone.utc)


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


async def import_lovable_customers(db) -> dict:
    try:
        from server import hash_password  # type: ignore

        data = json.loads(_FILE.read_text(encoding="utf-8"))
        result = {
            "users": await _import_users(db, data["users"], hash_password),
            "submissions": await _import_submissions(db, data["submissions"]),
        }
        logger.info("lovable_import: %s", result)
        return result
    except Exception as exc:
        logger.warning("lovable_import failed: %s", exc)
        return {}
