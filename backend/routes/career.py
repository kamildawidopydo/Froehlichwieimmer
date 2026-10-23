from __future__ import annotations

import base64
import html
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import EmailStr, TypeAdapter, ValidationError

from routes.contract_submissions import _admin_target, _rate_limit

logger = logging.getLogger(__name__)
_db = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)[os.environ["DB_NAME"]]
router = APIRouter(prefix="/api/career", tags=["career"])

_MAX_CV_BYTES = 8 * 1024 * 1024
_ALLOWED_CV = {
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}
_EMAIL = TypeAdapter(EmailStr)


def _row(label: str, value: str) -> str:
    return f"<tr><td style='padding:6px 12px;color:#6b7280'>{label}</td><td style='padding:6px 12px'>{html.escape(value or '—')}</td></tr>"


def _admin_html(name: str, email: str, phone: str, message: str, has_cv: bool) -> str:
    msg = html.escape(message or "—").replace("\n", "<br>")
    return (
        "<div style='font-family:Arial,sans-serif;color:#0f1b2d'>"
        "<h2 style='margin:0 0 12px'>Neue Bewerbung: Finanzberater (Raum Hamburg)</h2>"
        f"<table style='border-collapse:collapse'>{_row('Name', name)}{_row('E-Mail', email)}{_row('Telefon', phone)}"
        f"{_row('Lebenslauf', 'im Anhang' if has_cv else 'nicht beigefügt')}</table>"
        f"<h3 style='margin:16px 0 6px'>Nachricht</h3><p>{msg}</p></div>"
    )


def _applicant_html(name: str) -> str:
    return (
        "<div style='font-family:Arial,sans-serif;color:#0f1b2d'>"
        f"<p>Guten Tag {html.escape(name)},</p>"
        "<p>vielen Dank für Ihre Bewerbung als Finanzberater im Raum Hamburg. "
        "Wir haben Ihre Unterlagen erhalten und melden uns zeitnah bei Ihnen.</p>"
        "<p>Mit freundlichen Grüßen<br>Fröhlich Vermögensberatung GmbH</p></div>"
    )


async def _read_cv(cv: Optional[UploadFile]) -> Optional[Dict[str, Any]]:
    if cv is None or not cv.filename:
        return None
    if cv.content_type not in _ALLOWED_CV:
        raise HTTPException(status_code=400, detail="Bitte den Lebenslauf als PDF oder Word-Datei hochladen.")
    data = await cv.read()
    if len(data) > _MAX_CV_BYTES:
        raise HTTPException(status_code=400, detail="Der Lebenslauf darf maximal 8 MB groß sein.")
    return {
        "filename": os.path.basename(cv.filename)[:150],
        "content_type": cv.content_type,
        "content": base64.b64encode(data).decode(),
        "size": len(data),
    }


@router.post("/apply")
async def apply(
    request: Request,
    name: str = Form(..., min_length=2, max_length=120),
    email: str = Form(..., max_length=200),
    phone: str = Form("", max_length=60),
    message: str = Form("", max_length=4000),
    consent: bool = Form(...),
    cv: Optional[UploadFile] = File(None),
) -> Dict[str, Any]:
    _rate_limit(request, bucket="career", limit_per_min=3)
    try:
        email = str(_EMAIL.validate_python(email.strip()))
    except ValidationError:
        raise HTTPException(status_code=400, detail="Bitte eine gültige E-Mail-Adresse angeben.")
    if not consent:
        raise HTTPException(status_code=400, detail="Bitte der Datenverarbeitung zustimmen.")
    name, phone, message = name.strip(), phone.strip(), message.strip()
    cv_doc = await _read_cv(cv)

    doc = {
        "position": "Finanzberater Raum Hamburg",
        "name": name,
        "email": email,
        "phone": phone,
        "message": message,
        "cv": cv_doc,
        "status": "new",
        "created_at": datetime.now(timezone.utc),
    }
    result = await _db.career_applications.insert_one(doc)

    from server import _send_email_via_emergent  # type: ignore

    attachments = [{k: cv_doc[k] for k in ("filename", "content", "content_type")}] if cv_doc else None
    admin_sent = True
    try:
        await _send_email_via_emergent(
            to=_admin_target(),
            subject=f"Neue Bewerbung Finanzberater Hamburg: {name}",
            html=_admin_html(name, email, phone, message, bool(cv_doc)),
            attachments=attachments,
        )
    except Exception as exc:
        admin_sent = False
        logger.warning("career admin-mail failed: %s", exc)
    try:
        await _send_email_via_emergent(
            to=email,
            subject="Ihre Bewerbung bei der Fröhlich Vermögensberatung",
            html=_applicant_html(name),
        )
    except Exception as exc:
        logger.warning("career applicant-mail failed: %s", exc)

    await _db.career_applications.update_one({"_id": result.inserted_id}, {"$set": {"admin_email_sent": admin_sent}})
    return {"success": True, "id": str(result.inserted_id)}
