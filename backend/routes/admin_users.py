"""
Session 82.81 — Admin-Users API (Mongo-native · read-only + admin-create).

Bewusst KEIN approve/reject/status/verified — diese Felder existieren im
bestehenden `users`-Datenmodell nicht (Audit 82.81). Wir erfinden weder
Zustände noch Business-Regeln.
"""

from __future__ import annotations

import secrets
import string
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId
import asyncio
import logging
from html import escape as html_escape

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, EmailStr, Field

from server import db, hash_password, require_admin

router = APIRouter(prefix="/api/admin/users", tags=["admin-users"])
logger = logging.getLogger(__name__)
_BG_TASKS: set = set()


def _welcome_email_html(name: str, email: str, temp_pw: str, link: str) -> str:
    greet = f"Guten Tag {html_escape(name)}," if name else "Guten Tag,"
    return f"""
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;color:#0B1F33;">
      <div style="background:#0A2540;padding:24px;"><h1 style="color:#fff;font-size:18px;margin:0;">Ihr Kundenkonto ist eingerichtet</h1></div>
      <div style="padding:24px;background:#fff;">
        <p style="font-size:14px;">{greet}</p>
        <p style="font-size:14px;">für Sie wurde ein Kundenkonto bei der Fröhlich Vermögensberatung angelegt. Ihre Zugangsdaten:</p>
        <table style="font-size:14px;margin:16px 0;border-collapse:collapse;">
          <tr><td style="padding:4px 16px 4px 0;color:#6B7C93;">E-Mail</td><td style="padding:4px 0;"><strong>{html_escape(email)}</strong></td></tr>
          <tr><td style="padding:4px 16px 4px 0;color:#6B7C93;">Vorläufiges Passwort</td><td style="padding:4px 0;font-family:monospace;"><strong>{html_escape(temp_pw)}</strong></td></tr>
        </table>
        <p style="margin:24px 0;"><a href="{link}" style="background:#1F4D3A;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-size:14px;">Jetzt anmelden</a></p>
        <p style="font-size:13px;color:#6B7C93;">Bei der ersten Anmeldung werden Sie gebeten, ein eigenes Passwort festzulegen.</p>
        <p style="font-size:12px;color:#8894a6;margin-top:28px;line-height:1.5;">Fröhlich Vermögensberatung GmbH · Bösgrunder Weg 62 · 55543 Bad Kreuznach<br>Amtsgericht Bad Kreuznach · HRB 23436 · Geschäftsführer: Manfred Franz Fröhlich</p>
      </div>
    </div>
    """


# ─── Schemas ────────────────────────────────────────────────────────────
class AdminUserCreateInput(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)

    model_config = {"extra": "forbid"}


class _UserOut(BaseModel):
    """Response shape — nie password_hash, keine Auth-Internals."""

    id: str
    email: str
    name: Optional[str] = None
    role: str
    avatar_url: Optional[str] = None
    created_at: Optional[str] = None
    last_password_reset_at: Optional[str] = None


# ─── Helpers ────────────────────────────────────────────────────────────
def _iso(v):
    if isinstance(v, datetime):
        return v.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    return v


def _serialize(doc: dict) -> dict:
    """
    Whitelist — `password_hash`, `email_verification_token`,
    `password_reset_token` u. ä. werden NIE serialisiert.
    """
    return {
        "id": str(doc["_id"]),
        "email": doc.get("email"),
        "name": doc.get("name") or doc.get("display_name"),
        "role": doc.get("role") or "user",
        "avatar_url": doc.get("avatar_url"),
        "created_at": _iso(doc.get("created_at")),
        "last_password_reset_at": _iso(doc.get("last_password_reset_at")),
    }


def _gen_temp_password() -> str:
    alphabet = string.ascii_letters + string.digits + "!@%&*+-="
    return "".join(secrets.choice(alphabet) for _ in range(20))


# ─── Endpoints ──────────────────────────────────────────────────────────
@router.get("")
async def list_users(
    _admin: dict = Depends(require_admin),
    q: Optional[str] = Query(default=None, max_length=100),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    """Paginiertes Listing + Search (email + name substring, case-insensitive)."""
    filt: dict = {}
    if q:
        q = q.strip()
        if q:
            import re

            rx = re.compile(re.escape(q), re.IGNORECASE)
            filt["$or"] = [{"email": {"$regex": rx}}, {"name": {"$regex": rx}}]

    total = await db.users.count_documents(filt)
    cursor = (
        db.users.find(filt, projection={"password_hash": 0, "password_reset_tokens": 0})
        .sort("created_at", -1)
        .skip(offset)
        .limit(limit)
    )
    items = [_serialize(d) async for d in cursor]
    return {"total": total, "limit": limit, "offset": offset, "items": items}


@router.get("/{user_id}")
async def get_user(user_id: str, _admin: dict = Depends(require_admin)):
    try:
        oid = ObjectId(user_id)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="Ungültige user_id")
    doc = await db.users.find_one(
        {"_id": oid}, projection={"password_hash": 0, "password_reset_tokens": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    return _serialize(doc)


@router.post("", status_code=201)
async def admin_create_user(
    payload: AdminUserCreateInput,
    request: Request,
    _admin: dict = Depends(require_admin),
):
    """
    Admin-Provisioning: legt neuen Kunden mit `role='user'` + bcrypt-Hash eines
    zufälligen Temp-Passworts an. `role` ist server-authoritative und wird
    NICHT aus dem Payload gelesen (Pydantic `extra=forbid` verhindert Injection).
    Klartext-Passwort ist die EINZIGE Stelle, an der es zurückgegeben wird —
    danach nur der bcrypt-Hash in Mongo.
    """
    email = payload.email.lower().strip()
    if await db.users.find_one({"email": email}, projection={"_id": 1}):
        raise HTTPException(status_code=409, detail="E-Mail bereits vergeben")

    temp_pw = _gen_temp_password()
    now = datetime.now(timezone.utc)
    doc = {
        "email": email,
        "password_hash": hash_password(temp_pw),
        "name": payload.name.strip(),
        "role": "user",  # server-authoritative
        "avatar_url": None,
        "must_change_password": True,
        "created_at": now,
        "updated_at": now,
    }
    res = await db.users.insert_one(doc)

    from server import _send_email_via_emergent
    from routes.auth import _site_base
    link = f"{_site_base(request)}/login"

    async def _send_welcome() -> None:
        try:
            await _send_email_via_emergent(
                to=email,
                subject="Ihr Kundenkonto — Fröhlich Vermögensberatung",
                html=_welcome_email_html(doc["name"], email, temp_pw, link),
            )
        except Exception as exc:
            logger.warning("admin_create_user welcome email failed: %s", exc)

    task = asyncio.create_task(_send_welcome())
    _BG_TASKS.add(task)
    task.add_done_callback(_BG_TASKS.discard)
    return {
        "id": str(res.inserted_id),
        "email": email,
        "name": doc["name"],
        "role": "user",
        "temporary_password": temp_pw,
        "welcome_email": "queued",
    }


@router.delete("/{user_id}")
async def admin_delete_user(user_id: str, admin: dict = Depends(require_admin)):
    try:
        oid = ObjectId(user_id)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="Ungültige user_id")
    doc = await db.users.find_one({"_id": oid}, projection={"role": 1, "email": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    if str(oid) == str(admin.get("_id") or admin.get("id")):
        raise HTTPException(status_code=400, detail="Sie können sich nicht selbst löschen")
    if doc.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Administratoren können nicht gelöscht werden")
    await db.users.delete_one({"_id": oid})
    await db.password_reset_tokens.delete_many({"user_id": oid})
    return {"deleted": True, "id": user_id}
