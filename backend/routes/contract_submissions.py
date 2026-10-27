"""Session 95.2 — Contract-Submission- und Contact-E-Mail-Endpoints.

Ersetzt die verlorenen Legacy-Routen aus `legacy_source/api/send-*.js`:
 - 12 Vertrags-Submit-Endpoints (BBVA/bunq-NL/bunq-DE/ING/Postbank/Knab × Flex/Fest)
 - 1 generischer Contact-Form-Endpoint `/api/send-email`

Jeder Vertrags-Endpoint:
 1. Validiert `customerEmail` + `pdfBase64`.
 2. Legt einen Eintrag in `contract_form_submissions` an (für AdminContract-
    Submissions UI).
 3. Sendet Admin-Mail an `kundenservice@essenceinvest.com` mit Vertrags-PDF
    plus optionalen Signatur-Bild-Anhängen.
 4. Sendet dem Kunden eine Bestätigungs-Mail inkl. Vertrags-PDF.
 5. Aktualisiert `admin_email_sent` / `customer_email_sent` auf dem Submission.

Fehler beim Mail-Versand lassen den Submission-Datensatz bestehen; `status`
bleibt `new`, der Admin kann aus der UI nachsenden.
"""
from __future__ import annotations

import base64
import html as _html_mod
import asyncio
import logging
import os
import re as _re
import uuid as _uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, Body, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

logger = logging.getLogger("kapitalmitte")

_client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
_db = _client[os.environ["DB_NAME"]]

router = APIRouter(prefix="/api", tags=["contract-submissions"])


# ---------------------------------------------------------------------------
# Konfigurationstabelle: Routing-Pfad → Produkt-Metadaten
# ---------------------------------------------------------------------------
_SAFE_NAME_FALLBACK = "Kunde"


def _safe_filename_name(name: Optional[str]) -> str:
    base = (name or _SAFE_NAME_FALLBACK).strip() or _SAFE_NAME_FALLBACK
    import re as _re_fn
    return _re_fn.sub(r"[^\w\-.]+", "_", "_".join(base.split()))[:80] or _SAFE_NAME_FALLBACK


CONTRACT_CONFIGS: Dict[str, Dict[str, Any]] = {
    # ── Flexgeld (5) ─────────────────────────────────────────────────────
    "send-contract-email":          {"product_key": "bbva_flexgeld",     "bank_name": "BBVA",       "product_label": "Flexgeldantrag",         "filename_prefix": "BBVA_Flexgeldvertrag"},
    "send-bunq-contract-email":     {"product_key": "bunq_flexgeld",     "bank_name": "bunq NL",    "product_label": "Flexgeldantrag (bunq NL)",      "filename_prefix": "bunq_NL_Flexgeldvertrag"},
    "send-bunq-de-contract-email":  {"product_key": "bunq_de_flexgeld",  "bank_name": "bunq DE",    "product_label": "Flexgeldantrag (bunq DE)",      "filename_prefix": "bunq_DE_Flexgeldvertrag"},
    "send-ing-contract-email":      {"product_key": "ing_flexgeld",      "bank_name": "ING",        "product_label": "Flexgeldantrag (ING)",          "filename_prefix": "ING_Flexgeldvertrag"},
    "send-postbank-contract-email": {"product_key": "postbank_flexgeld", "bank_name": "Postbank",   "product_label": "Flexgeldantrag (Postbank)",     "filename_prefix": "Postbank_Flexgeldvertrag"},
    "send-knab-email":              {"product_key": "knab_flexgeld",     "bank_name": "Knab",       "product_label": "Flexgeldantrag (Knab)",         "filename_prefix": "Knab_Flexgeldvertrag"},
    # ── Festgeld (6) ─────────────────────────────────────────────────────
    "send-festgeld-email":          {"product_key": "bbva_festgeld",     "bank_name": "BBVA",       "product_label": "Festgeldantrag",                "filename_prefix": "BBVA_Festgeldvertrag"},
    "send-bunq-festgeld-email":     {"product_key": "bunq_festgeld",     "bank_name": "bunq NL",    "product_label": "Festgeldantrag (bunq NL)",      "filename_prefix": "bunq_NL_Festgeldvertrag"},
    "send-bunq-de-festgeld-email":  {"product_key": "bunq_de_festgeld",  "bank_name": "bunq DE",    "product_label": "Festgeldantrag (bunq DE)",      "filename_prefix": "bunq_DE_Festgeldvertrag"},
    "send-ing-festgeld-email":      {"product_key": "ing_festgeld",      "bank_name": "ING",        "product_label": "Festgeldantrag (ING)",          "filename_prefix": "ING_Festgeldvertrag"},
    "send-postbank-festgeld-email": {"product_key": "postbank_festgeld", "bank_name": "Postbank",   "product_label": "Festgeldantrag (Postbank)",     "filename_prefix": "Postbank_Festgeldvertrag"},
    "send-knab-festgeld-email":     {"product_key": "knab_festgeld",     "bank_name": "Knab",       "product_label": "Festgeldantrag (Knab)",         "filename_prefix": "Knab_Festgeldvertrag"},
}


# ---------------------------------------------------------------------------
# Pydantic-Payload
# ---------------------------------------------------------------------------
class ContractSubmitPayload(BaseModel):
    customerEmail: EmailStr
    customerName: Optional[str] = ""
    pdfBase64: str
    formSummaryHtml: Optional[str] = ""
    formSummary: Optional[Dict[str, Any]] = None
    signatureAttachments: Optional[List[Dict[str, Any]]] = None
    model_config = {"extra": "ignore"}


class ContactMessagePayload(BaseModel):
    subject: str = Field(..., min_length=1, max_length=200)
    html: str = Field(..., min_length=1, max_length=50_000)
    model_config = {"extra": "ignore"}


# ---------------------------------------------------------------------------
# Rate-Limit (inline, analog zu applications.py)
# ---------------------------------------------------------------------------
import time as _time
from collections import defaultdict as _dd
_SUBMIT_RL: Dict[str, List[float]] = _dd(list)


def _rate_limit(request: Request, bucket: str, limit_per_min: int = 5) -> None:
    xff = request.headers.get("x-forwarded-for", "")
    ip = xff.split(",")[0].strip() if xff else (request.client.host if request.client else "unknown")
    key = f"{bucket}:{ip}"
    now = _time.time()
    hist = [t for t in _SUBMIT_RL[key] if t > now - 60]
    if len(hist) >= limit_per_min:
        raise HTTPException(status_code=429, detail="Zu viele Anfragen. Bitte kurz warten.")
    hist.append(now)
    _SUBMIT_RL[key] = hist
    if len(_SUBMIT_RL) > 1000:
        _SUBMIT_RL.clear()


# ---------------------------------------------------------------------------
# Shared handler
# ---------------------------------------------------------------------------
def _clean_attachments(raw: Optional[List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
    clean: List[Dict[str, Any]] = []
    for att in raw or []:
        if not isinstance(att, dict):
            continue
        fn = (att.get("filename") or "signature.png")[:180]
        ct = (att.get("content_type") or att.get("contentType") or att.get("type") or "image/png")[:80]
        content = att.get("content")
        if not content or not isinstance(content, str):
            continue
        clean.append({"filename": str(fn), "content": content, "content_type": str(ct)})
    return clean


def _admin_target() -> str:
    return (
        os.environ.get("CONTRACT_SUBMISSIONS_TO", "").strip()
        or os.environ.get("EMAIL_REPLY_TO", "").strip()
        or "kundenservice@essenceinvest.com"
    )


def _admin_html(bank_name: str, product_label: str, customer_name: str, customer_email: str,
                today_de: str, form_summary_html: str, signatures_included: bool) -> str:
    sig_line = (
        "Die Kundenunterschrift(en) sind zusätzlich als Bilddatei(en) angehängt."
        if signatures_included
        else "Die Kundenunterschrift(en) sind im Vertrags-PDF enthalten."
    )
    extra = (
        f"<div style='margin-top:16px;padding:16px;background:#F7FAFE;border:1px solid #DCE3EC;'>{form_summary_html}</div>"
        if form_summary_html else ""
    )
    return f"""
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;color:#0B1F33;">
      <div style="background:#0A2540;padding:24px;">
        <h1 style="color:#fff;font-size:18px;margin:0;">Neuer {product_label} eingegangen</h1>
      </div>
      <div style="padding:24px;background:#fff;">
        <p style="font-size:14px;"><strong>Kunde:</strong> {_html_mod.escape(customer_name) or '—'}</p>
        <p style="font-size:14px;"><strong>E-Mail:</strong> {_html_mod.escape(customer_email)}</p>
        <p style="font-size:14px;"><strong>Produkt:</strong> {bank_name} — {product_label}</p>
        <p style="font-size:14px;"><strong>Datum:</strong> {today_de}</p>
        {extra}
        <p style="font-size:13px;color:#6B7C93;margin-top:24px;">
          Der ausgefüllte Vertrag ist als PDF angehängt. {sig_line}
          Alle Dokumente finden Sie zusätzlich im Admin-Bereich unter „Vertrags-Einreichungen".
        </p>
      </div>
    </div>
    """


def _customer_html(bank_name: str, product_label: str, customer_name: str) -> str:
    greet = f"Guten Tag {_html_mod.escape(customer_name)}," if customer_name else "Guten Tag,"
    return f"""
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;color:#0B1F33;">
      <div style="background:#0A2540;padding:24px;">
        <h1 style="color:#fff;font-size:18px;margin:0;">Ihre Antragsbestätigung</h1>
      </div>
      <div style="padding:24px;background:#fff;">
        <p style="font-size:14px;">{greet}</p>
        <p style="font-size:14px;">vielen Dank für Ihren {product_label} bei <strong>{bank_name}</strong>, vermittelt durch die Fröhlich Vermögensberatung GmbH.</p>
        <p style="font-size:14px;">Ihre Unterlagen sind bei uns eingegangen. Im Anhang finden Sie Ihren ausgefüllten Vertrag zur eigenen Dokumentation.</p>
        <p style="font-size:14px;">Unser Team prüft Ihre Angaben und meldet sich in Kürze bei Ihnen.</p>
        <p style="font-size:13px;color:#6B7C93;margin-top:24px;">
          Bei Rückfragen erreichen Sie uns unter
          <a href="mailto:kundenservice@essenceinvest.com" style="color:#0A2540;">kundenservice@essenceinvest.com</a>
          oder telefonisch unter 06966 7785 941 (Mo–Fr 09:00–18:00).
        </p>
        <p style="font-size:12px;color:#8894a6;margin-top:28px;line-height:1.5;">
          Fröhlich Vermögensberatung GmbH · Bösgrunder Weg 62 · 55543 Bad Kreuznach<br>
          Amtsgericht Bad Kreuznach · HRB 23436 · Geschäftsführer: Manfred Franz Fröhlich
        </p>
      </div>
    </div>
    """


def _summary_html(summary: Optional[Dict[str, Any]], raw_html: str) -> str:
    parts = []
    if isinstance(summary, dict) and summary:
        rows = "".join(
            f"<tr><td style='padding:3px 12px 3px 0;color:#6B7C93;'>{_html_mod.escape(str(k))}</td>"
            f"<td style='padding:3px 0;'>{_html_mod.escape(str(v))}</td></tr>"
            for k, v in summary.items() if v not in (None, "") and not isinstance(v, (dict, list))
        )
        parts.append(f"<table style='font-size:13px;border-collapse:collapse;'>{rows}</table>")
    if raw_html:
        allowed = r"(?:table|thead|tbody|tr|td|th|b|strong|p|br|h3|h4|ul|li)"
        safe = _re.sub(r"<(script|style)[^>]*>.*?</\1>", "", raw_html, flags=_re.S | _re.I)
        safe = _re.sub(rf"<(?!/?{allowed}\b)[^>]*>", "", safe, flags=_re.I)
        safe = _re.sub(rf"<(/?{allowed})\b[^>]*>", r"<\1>", safe, flags=_re.I)
        parts.append(safe)
    return "".join(parts)


async def _send_with_retry(send, **kwargs) -> None:
    for attempt in range(3):
        try:
            await send(**kwargs)
            return
        except Exception as exc:
            if attempt == 2 or "429" not in str(exc):
                raise
            await asyncio.sleep(1.5 * (attempt + 1))


def _store_file(path_prefix: str, filename: str, b64: str, content_type: str, submission_id: str) -> Optional[str]:
    from services.emergent_storage import APP_PREFIX, put_object
    data = base64.b64decode(b64.split(",", 1)[-1])
    ext = filename.rsplit(".", 1)[-1][:5] if "." in filename else "bin"
    result = put_object(f"{APP_PREFIX}/{path_prefix}/{submission_id}/{_uuid.uuid4().hex}.{ext}", data, content_type)
    return result["path"], len(data)


async def _persist_files(submission_id: str, contract_filename: str, pdf_b64: str, signatures: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    files = []
    items = [(contract_filename, pdf_b64, "application/pdf", "contract")] + [
        (s["filename"], s["content"], s["content_type"], "signature") for s in signatures
    ]
    for fn, b64, ct, kind in items:
        try:
            path, size = await asyncio.to_thread(_store_file, "contract-submissions", fn, b64, ct, submission_id)
            fid = _uuid.uuid4().hex
            await _db.storage_files.insert_one({
                "_id": fid, "scope": "contract_submission", "subject_id": submission_id,
                "storage_path": path, "content_type": ct, "size": size, "original_filename": fn,
                "is_deleted": False, "created_at": datetime.now(timezone.utc),
            })
            files.append({"filename": fn, "kind": kind, "file_id": fid, "storage_path": path})
        except Exception as exc:
            logger.error("contract-submission file store failed (%s): %s", fn, exc)
            files.append({"filename": fn, "kind": kind, "store_error": str(exc)[:200]})
    return files


async def _handle_contract_submission(request: Request, slug: str, body: ContractSubmitPayload) -> Dict[str, Any]:
    _rate_limit(request, bucket=slug, limit_per_min=5)
    from routes.formular_access import _load_valid_session
    session_id = (request.headers.get("x-formular-session") or "").strip()
    if len(session_id) < 8 or not await _load_valid_session(session_id):
        raise HTTPException(status_code=401, detail="Ihre Formular-Sitzung ist abgelaufen. Bitte geben Sie Ihren Zugangscode erneut ein.")

    config = CONTRACT_CONFIGS[slug]
    product_key = config["product_key"]
    bank_name = config["bank_name"]
    product_label = config["product_label"]
    filename_prefix = config["filename_prefix"]

    # Basis-Payload validieren
    if not body.pdfBase64 or len(body.pdfBase64) < 100:
        raise HTTPException(status_code=400, detail="Vertrags-PDF fehlt oder ist ungültig.")

    now = datetime.now(timezone.utc)
    today_de = now.strftime("%d.%m.%Y")
    customer_name = (body.customerName or "").strip()
    customer_email = str(body.customerEmail).strip()
    contract_filename = f"{filename_prefix}_{_safe_filename_name(customer_name)}.pdf"
    signature_attachments = _clean_attachments(body.signatureAttachments)

    # 1) Submission persistieren (bevor E-Mail-Versand startet)
    submission_doc = {
        "product_key": product_key,
        "bank_name": bank_name,
        "customer_name": customer_name or None,
        "customer_email": customer_email,
        "summary": body.formSummary if isinstance(body.formSummary, dict) else {},
        "files": [{"filename": contract_filename, "kind": "contract"}],
        "status": "new",
        "admin_email_sent": False,
        "admin_email_error": None,
        "customer_email_sent": False,
        "customer_email_error": None,
        "signatures_included": bool(signature_attachments),
        "created_at": now,
        "updated_at": now,
    }
    try:
        res = await _db.contract_form_submissions.insert_one(submission_doc)
        submission_id = str(res.inserted_id)
    except Exception as exc:
        logger.exception("contract-submission persist failed")
        raise HTTPException(status_code=500, detail=f"Persistenz fehlgeschlagen: {exc}")

    stored_files = await _persist_files(submission_id, contract_filename, body.pdfBase64, signature_attachments)
    contract_fid = next((f.get("file_id") for f in stored_files if f["kind"] == "contract"), None)
    await _db.contract_form_submissions.update_one({"_id": res.inserted_id}, {"$set": {
        "files": stored_files, "session_id": session_id, "contract_pdf_path": contract_fid,
        "attachments": [{"filename": f["filename"], "storage_path": f.get("file_id")} for f in stored_files if f["kind"] == "signature" and f.get("file_id")],
    }})

    # 2) Admin-Mail (fire-and-forget-ish — Fehler kein Rollback)
    admin_email_sent = False
    admin_email_error: Optional[str] = None
    customer_email_sent = False
    customer_email_error: Optional[str] = None

    try:
        from server import _send_email_via_emergent  # type: ignore
    except Exception as exc:
        logger.error("contract-submission: cannot import email sender: %s", exc)
        _send_email_via_emergent = None  # type: ignore

    pdf_attachment = {
        "filename": contract_filename,
        "content": body.pdfBase64,
        "content_type": "application/pdf",
    }

    if _send_email_via_emergent is not None:
        # Admin
        try:
            admin_subject = f"Neuer {product_label}: {customer_name or '—'} — {today_de}"
            admin_html = _admin_html(
                bank_name, product_label, customer_name, customer_email,
                today_de, _summary_html(body.formSummary, body.formSummaryHtml or ""), bool(signature_attachments),
            )
            admin_attachments = [pdf_attachment] + signature_attachments
            await _send_with_retry(
                _send_email_via_emergent,
                to=_admin_target(),
                subject=admin_subject,
                html=admin_html,
                attachments=admin_attachments,
            )
            admin_email_sent = True
        except Exception as exc:
            admin_email_error = str(exc)[:400]
            logger.warning("contract-submission admin-mail failed: %s", exc)

        # Kunde (Bestätigung mit Vertrag im Anhang)
        try:
            customer_subject = f"Ihre Antragsbestätigung — {bank_name} {product_label}"
            customer_html = _customer_html(bank_name, product_label, customer_name)
            await _send_with_retry(
                _send_email_via_emergent,
                to=customer_email,
                subject=customer_subject,
                html=customer_html,
                attachments=[pdf_attachment],
            )
            customer_email_sent = True
        except Exception as exc:
            customer_email_error = str(exc)[:400]
            logger.warning("contract-submission customer-mail failed: %s", exc)
    else:
        admin_email_error = "Email sender not available"

    # 3) Update Submission-Status
    try:
        await _db.contract_form_submissions.update_one(
            {"_id": ObjectId(submission_id)},
            {"$set": {
                "admin_email_sent": admin_email_sent,
                "admin_email_error": admin_email_error,
                "customer_email_sent": customer_email_sent,
                "customer_email_error": customer_email_error,
                "updated_at": datetime.now(timezone.utc),
            }},
        )
    except Exception as exc:
        logger.warning("contract-submission status-update failed: %s", exc)

    return {
        "success": True,
        "submissionId": submission_id,
        "savedToDashboard": True,
        "adminEmailSent": admin_email_sent,
        "customerEmailSent": customer_email_sent,
    }


# ---------------------------------------------------------------------------
# 12 Vertrags-Endpoints (dünne Wrapper um `_handle_contract_submission`)
# ---------------------------------------------------------------------------
def _register_contract_route(path_slug: str) -> None:
    """Registriert eine POST-Route zur gegebenen slug (ohne führendes /)."""
    @router.post(f"/{path_slug}")
    async def _endpoint(request: Request, body: ContractSubmitPayload = Body(...), _slug: str = path_slug) -> Dict[str, Any]:  # noqa: ARG001
        return await _handle_contract_submission(request, _slug, body)

    _endpoint.__name__ = f"submit_{path_slug.replace('-', '_')}"


for _slug in CONTRACT_CONFIGS.keys():
    _register_contract_route(_slug)


# ---------------------------------------------------------------------------
# Contact-Form Endpoint
# ---------------------------------------------------------------------------
@router.post("/send-email")
async def send_contact_email(request: Request, body: ContactMessagePayload = Body(...)) -> Dict[str, Any]:
    _rate_limit(request, bucket="contact", limit_per_min=5)
    try:
        from server import _send_email_via_emergent  # type: ignore
    except Exception as exc:
        logger.error("contact-email: cannot import sender: %s", exc)
        raise HTTPException(status_code=500, detail="Email service not available")

    try:
        await _send_email_via_emergent(
            to=_admin_target(),
            subject=body.subject,
            html=body.html,
        )
        return {"success": True}
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("contact-email failed: %s", exc)
        raise HTTPException(status_code=502, detail="E-Mail konnte nicht versendet werden.")
