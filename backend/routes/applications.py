"""Session 82.102 — Applications-Submit-Endpoint (FastAPI/Mongo).

Ersetzt den Legacy-Supabase-Insert nach `applications` und den
`send-application-email` Edge-Function-Trigger. Persistenz-First-Kontrakt:
Application wird zuerst gespeichert, danach best-effort E-Mail (Fehler beim
Versand rollen die Application NICHT zurück).

Sicherheit:
- Client-Payload wird durch Pydantic mit `extra='forbid'` validiert.
- Client darf `status`, `admin_notes`, `role`, `user_id`, `approved` nicht
  autoritativ setzen (Mass-Assignment blockiert). Server setzt `status="Neu"`
  und `created_at` selbst.
- Idempotency via optionalem `idempotency_key`; identische Payload liefert
  denselben Application-Datensatz zurück (nur EIN Mail-Job).
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, Body, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

_client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
_db = _client[os.environ["DB_NAME"]]

router = APIRouter(prefix="/api", tags=["applications"])

# Session 82.104a — Inline Rate-Limit (slowapi-Decorator bricht Pydantic
# ForwardRef auf typed Bodies). 5 Applications/min pro IP.
import time as _time_mod
from collections import defaultdict as _defaultdict
_APP_RL: dict = _defaultdict(list)

def _check_app_rl(request: Request) -> None:
    from routes.formular_access import _client_ip
    ip = _client_ip(request)
    now = _time_mod.time()
    hist = [t for t in _APP_RL[ip] if t > now - 60]
    if len(hist) >= 5:
        raise HTTPException(status_code=429, detail="Zu viele Anfragen. Bitte kurz warten.")
    hist.append(now)
    _APP_RL[ip] = hist
    if len(_APP_RL) > 500:
        _APP_RL.clear()


class ApplicationPayload(BaseModel):
    personal_data: Dict[str, Any] = Field(...)
    investment_data: Dict[str, Any] = Field(...)
    documents: Optional[List[Dict[str, Any]]] = Field(default=None, max_length=20)
    terms_accepted: bool = Field(...)
    privacy_accepted: bool = Field(...)
    idempotency_key: Optional[str] = Field(default=None, max_length=128)
    model_config = {"extra": "forbid"}


@router.post("/applications", status_code=201)
async def submit_application(request: Request, body: ApplicationPayload = Body(...)) -> Dict[str, Any]:
    _check_app_rl(request)
    if not body.terms_accepted or not body.privacy_accepted:
        raise HTTPException(status_code=422, detail="AGB und Datenschutz müssen akzeptiert werden.")

    # Idempotency check
    if body.idempotency_key:
        existing = await _db.applications.find_one({"idempotency_key": body.idempotency_key})
        if existing:
            return {"id": str(existing["_id"]), "status": existing.get("status", "Neu"), "idempotent": True}

    now = datetime.now(timezone.utc)
    doc = {
        "personal_data": body.personal_data,
        "investment_data": body.investment_data,
        "documents": body.documents or [],
        "terms_accepted": body.terms_accepted,
        "privacy_accepted": body.privacy_accepted,
        "idempotency_key": body.idempotency_key,
        "status": "Neu",
        "status_history": [{"status": "Neu", "timestamp": now.isoformat()}],
        "admin_email_sent": False,
        "admin_email_error": None,
        "created_at": now,
        "updated_at": now,
    }
    try:
        res = await _db.applications.insert_one(doc)
        app_id = str(res.inserted_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Persistenz fehlgeschlagen: {e}")

    # Best-effort email (never rollback the application on mail failure)
    email_status = "pending"
    email_error: Optional[str] = None
    try:
        from server import _send_email_via_emergent, EMAIL_REPLY_TO  # type: ignore
        pd = body.personal_data or {}
        first = str(pd.get("first_name") or "").strip()
        last = str(pd.get("last_name") or "").strip()
        cust_email = str(pd.get("email") or "").strip()
        admin_to = EMAIL_REPLY_TO or os.environ.get("APPLICATIONS_ADMIN_EMAIL")
        subject = f"Neuer Antrag: {first} {last}".strip() or "Neuer Antrag"
        html_admin = (
            f'<p>Neuer Antrag eingegangen.</p>'
            f'<ul><li>ID: {app_id}</li>'
            f'<li>Name: {first} {last}</li>'
            f'<li>E-Mail: {cust_email}</li>'
            f'<li>Bank: {(body.investment_data or {}).get("bank_name", "–")}</li>'
            f'<li>Betrag: {(body.investment_data or {}).get("investment_amount", "–")}</li>'
            f'<li>Dokumente: {len(body.documents or [])}</li></ul>'
        )
        if admin_to:
            await _send_email_via_emergent(to=admin_to, subject=subject, html=html_admin)
        if cust_email:
            html_cust = (
                f'<p>Guten Tag {first},</p>'
                f'<p>vielen Dank für Ihren Antrag bei Fröhlich Vermögensberatung GmbH. '
                f'Wir haben Ihre Unterlagen erhalten und melden uns in Kürze.</p>'
                f'<p>Ihre Referenz: <strong>{app_id}</strong></p>'
            )
            await _send_email_via_emergent(to=cust_email, subject="Antragsbestätigung — Fröhlich Vermögensberatung", html=html_cust)
        email_status = "sent"
        await _db.applications.update_one(
            {"_id": ObjectId(app_id)},
            {"$set": {"admin_email_sent": True, "updated_at": datetime.now(timezone.utc)}},
        )
    except Exception as e:
        email_status = "failed"
        email_error = str(e)[:400]
        await _db.applications.update_one(
            {"_id": ObjectId(app_id)},
            {"$set": {"admin_email_sent": False, "admin_email_error": email_error,
                      "updated_at": datetime.now(timezone.utc)}},
        )

    return {"id": app_id, "status": "Neu", "email_status": email_status,
            "email_error": email_error, "idempotent": False}
