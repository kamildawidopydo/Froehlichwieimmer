"""Session 82.107 — Bestandskunden-Bestätigung Generator.

Admin-only Flow:
  POST /api/admin/customer-confirmations         → generieren + speichern
  GET  /api/admin/customer-confirmations/{id}/view      → inline PDF (Preview/Print)
  GET  /api/admin/customer-confirmations/{id}/download  → attachment
  POST /api/admin/customer-confirmations/{id}/send-email → per Resend/Emergent
  GET  /api/admin/customer-confirmations               → Liste

Customer-side:
  GET  /api/users/documents                            → Kunden-„Meine Dokumente"
  GET  /api/users/documents/{id}/download              → Kunde eigene PDF

Keine öffentlichen Links. Alle Endpoints auth-guarded.
"""
from __future__ import annotations

import base64
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, Body, Depends, HTTPException, Path
from fastapi.responses import Response
from jinja2 import Environment, FileSystemLoader, select_autoescape
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from weasyprint import HTML  # type: ignore

from server import _send_email_via_emergent, get_current_user, require_admin  # type: ignore

logger = logging.getLogger(__name__)

_client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
_db = _client[os.environ["DB_NAME"]]

_TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
_env = Environment(loader=FileSystemLoader(_TEMPLATE_DIR), autoescape=select_autoescape(["html"]))

router = APIRouter(prefix="/api", tags=["customer-confirmations"])


class ConfirmationPayload(BaseModel):
    user_id: Optional[str] = None
    anrede: str = Field("Herr", pattern="^(Herr|Frau|Divers)$")
    vorname: str
    nachname: str
    strasse: Optional[str] = ""
    plz: Optional[str] = ""
    ort_kunde: Optional[str] = ""
    land: Optional[str] = "Deutschland"
    email: Optional[EmailStr] = None
    kundennummer: str
    aufnahmedatum: Optional[str] = None
    ort: str = "Frankfurt am Main"
    model_config = {"extra": "forbid"}


def _oid(x: str) -> ObjectId:
    if not ObjectId.is_valid(x):
        raise HTTPException(422, "Ungültige ID")
    return ObjectId(x)


def _render_pdf(data: Dict[str, Any]) -> bytes:
    tmpl = _env.get_template("bestandskunden_bestaetigung.html")
    now = datetime.now(timezone.utc)
    ctx = {
        **data,
        "datum_lang": now.strftime("%d. %B %Y").lstrip("0"),
        "aufnahmedatum": data.get("aufnahmedatum") or now.strftime("%d. %B %Y").lstrip("0"),
    }
    _DE_MONTHS = {"January":"Januar","February":"Februar","March":"März","April":"April","May":"Mai","June":"Juni","July":"Juli","August":"August","September":"September","October":"Oktober","November":"November","December":"Dezember"}
    for en, de in _DE_MONTHS.items():
        ctx["datum_lang"] = ctx["datum_lang"].replace(en, de)
        ctx["aufnahmedatum"] = ctx["aufnahmedatum"].replace(en, de)
    html_str = tmpl.render(**ctx)
    return HTML(string=html_str).write_pdf()


@router.post("/admin/customer-confirmations")
async def create_confirmation(body: ConfirmationPayload, _admin: dict = Depends(require_admin)) -> Dict[str, Any]:
    pdf_bytes = _render_pdf(body.model_dump())
    now = datetime.now(timezone.utc)
    doc = {
        "type": "bestandskunden_bestaetigung",
        "user_id": _oid(body.user_id) if body.user_id else None,
        "kundennummer": body.kundennummer,
        "recipient_name": f"{body.vorname} {body.nachname}",
        "recipient_email": body.email,
        "payload": body.model_dump(exclude={"email"}),
        "pdf_base64": base64.b64encode(pdf_bytes).decode("ascii"),
        "size_bytes": len(pdf_bytes),
        "created_at": now,
        "updated_at": now,
        "sent_at": None,
        "sent_to": None,
    }
    res = await _db.customer_confirmations.insert_one(doc)
    return {"id": str(res.inserted_id), "size_bytes": len(pdf_bytes), "created_at": now.isoformat()}


async def _load_pdf(cid: str) -> bytes:
    d = await _db.customer_confirmations.find_one({"_id": _oid(cid)})
    if not d:
        raise HTTPException(404, "Bestätigung nicht gefunden")
    return base64.b64decode(d["pdf_base64"])


@router.get("/admin/customer-confirmations/{cid}/view")
async def view_confirmation(cid: str, _admin: dict = Depends(require_admin)) -> Response:
    pdf = await _load_pdf(cid)
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'inline; filename="Bestaetigung-{cid}.pdf"'})


@router.get("/admin/customer-confirmations/{cid}/download")
async def download_confirmation(cid: str, _admin: dict = Depends(require_admin)) -> Response:
    pdf = await _load_pdf(cid)
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="Bestandskunden-Bestaetigung.pdf"'})


class SendEmailPayload(BaseModel):
    email: EmailStr
    message: Optional[str] = ""
    model_config = {"extra": "forbid"}


@router.post("/admin/customer-confirmations/{cid}/send-email")
async def send_confirmation_email(cid: str, body: SendEmailPayload = Body(...), _admin: dict = Depends(require_admin)) -> Dict[str, Any]:
    oid = _oid(cid)
    d = await _db.customer_confirmations.find_one({"_id": oid})
    if not d:
        raise HTTPException(404, "Bestätigung nicht gefunden")
    pdf_bytes = base64.b64decode(d["pdf_base64"])
    html = (body.message or "").strip() or (
        "<p>Sehr geehrte Damen und Herren,<br>"
        "im Anhang finden Sie Ihre Bestandskunden-Bestätigung.<br><br>"
        "Mit freundlichen Grüßen<br>Ihr Kundenservice von Kapitalmitte</p>"
    )
    try:
        await _send_email_via_emergent(
            to=body.email,
            subject="Ihre Bestandskunden-Bestätigung bei Kapitalmitte",
            html=html,
            attachments=[{
                "filename": "Bestandskunden-Bestaetigung.pdf",
                "content": base64.b64encode(pdf_bytes).decode("ascii"),
                "content_type": "application/pdf",
            }],
        )
    except HTTPException as he:
        # Resend blockt nicht-verifizierte Empfänger — als 422 klassifizieren,
        # damit die UI dem Admin einen umsetzbaren Hinweis geben kann.
        detail_txt = str(he.detail or "").lower()
        if he.status_code == 502 and ("undeliverable" in detail_txt or "422" in detail_txt):
            raise HTTPException(
                422,
                "Empfänger wurde vom E-Mail-Provider blockiert (nicht verifizierte Adresse). Nutzen Sie eine verifizierte Empfänger-Adresse.",
            )
        raise
    except Exception as e:
        logger.exception("send email failed")
        raise HTTPException(502, f"E-Mail-Versand fehlgeschlagen: {e}")
    now = datetime.now(timezone.utc)
    await _db.customer_confirmations.update_one({"_id": oid}, {"$set": {"sent_at": now, "sent_to": body.email, "updated_at": now}})
    return {"status": "sent", "sent_to": body.email, "sent_at": now.isoformat()}


@router.get("/admin/customer-confirmations")
async def list_confirmations(_admin: dict = Depends(require_admin)) -> Dict[str, Any]:
    items: List[Dict[str, Any]] = []
    async for d in _db.customer_confirmations.find({}, {"pdf_base64": 0}).sort([("created_at", -1)]).limit(200):
        items.append({
            "id": str(d["_id"]),
            "user_id": str(d["user_id"]) if d.get("user_id") else None,
            "recipient_name": d.get("recipient_name"),
            "kundennummer": d.get("kundennummer"),
            "size_bytes": d.get("size_bytes"),
            "created_at": d["created_at"].isoformat() if d.get("created_at") else None,
            "sent_at": d["sent_at"].isoformat() if d.get("sent_at") else None,
            "sent_to": d.get("sent_to"),
        })
    return {"items": items, "count": len(items)}


# ── Customer-side ("Meine Dokumente") ─────────────────────────────────
@router.get("/users/documents")
async def my_documents(user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    uid = user["_id"] if isinstance(user.get("_id"), ObjectId) else _oid(str(user["_id"]))
    items: List[Dict[str, Any]] = []
    async for d in _db.customer_confirmations.find({"user_id": uid}, {"pdf_base64": 0}).sort([("created_at", -1)]):
        items.append({
            "id": str(d["_id"]),
            "type": "bestandskunden_bestaetigung",
            "title": "Bestandskunden-Bestätigung",
            "size_bytes": d.get("size_bytes"),
            "created_at": d["created_at"].isoformat() if d.get("created_at") else None,
        })
    return {"items": items, "count": len(items)}


@router.get("/users/documents/{cid}/download")
async def customer_download(cid: str, user: dict = Depends(get_current_user)) -> Response:
    oid = _oid(cid)
    uid = user["_id"] if isinstance(user.get("_id"), ObjectId) else _oid(str(user["_id"]))
    d = await _db.customer_confirmations.find_one({"_id": oid, "user_id": uid})
    if not d:
        raise HTTPException(404, "Dokument nicht gefunden")
    pdf = base64.b64decode(d["pdf_base64"])
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="Bestandskunden-Bestaetigung.pdf"'})
