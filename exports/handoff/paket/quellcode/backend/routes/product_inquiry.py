"""Product-Inquiry E-Mail-Route — extrahiert aus server.py (Session 76.4).

Session 78.6: Router jetzt **direkt** via `app.include_router` in server.py
registriert. Der bisherige Stub in server.py entfällt. Pydantic-Modell
`ProductInquiryEmailPayload` wird top-level aus server importiert — sicher,
weil `from routes import product_inquiry` erst am Ende von server.py läuft
(zu diesem Zeitpunkt ist das Modell definiert; identisches Muster wie in
`routes/auth.py`).
"""
from __future__ import annotations

import asyncio
import base64 as _b64
import hashlib
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException

# Pydantic-Modell aus server.py — Import ist safe (siehe Modul-Docstring).
from server import ProductInquiryEmailPayload

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["product-inquiry"])


@router.post("/send-product-inquiry-email")
async def send_product_inquiry_email(payload: ProductInquiryEmailPayload):
    """Advisor-Mail + PDF-Anhang mit Idempotenz-Schutz.

    Bereits vollständig extrahiert in Session 76.4. Session 78.6 tauscht nur
    den bisherigen server.py-Stub gegen eine direkte Router-Registrierung —
    Verhalten, Payload-Model, Response-Shape und Idempotenz-Semantik bleiben
    exakt gleich.
    """
    from server import (  # lazy import to avoid circular
        db,
        _send_email_via_emergent,
        _pi_email_html,
        _pi_dedupe_key,
        PI_EMAIL_IDEMPOTENCY,
        VALID_PI_PRODUCTS,
        PRODUCT_INQUIRY_TO,
    )
    from services.report_pdf import render_pdf as _render_pi_pdf, build_filename as _pi_pdf_filename

    product = (payload.product or "").strip().lower()
    if product not in VALID_PI_PRODUCTS:
        return {"ok": False, "error": "invalid_product"}
    email = (payload.email or "").strip().lower()
    if not email or "@" not in email:
        return {"ok": False, "error": "invalid_email"}

    lead_id = (payload.leadId or "").strip() or _pi_dedupe_key(payload, product, email)
    now_utc = datetime.now(timezone.utc)

    try:
        await db[PI_EMAIL_IDEMPOTENCY].insert_one({
            "lead_id": lead_id,
            "product": product,
            "email_hash": hashlib.sha256(email.encode("utf-8")).hexdigest()[:32],
            "status": "reserved",
            "created_at": now_utc,
            "sent_at": None,
            "error": None,
        })
    except Exception as e:  # noqa: BLE001
        if "duplicate key" not in str(e).lower():
            logger.exception("idempotency reserve failed: %s", e)
            return {"ok": False, "error": "idempotency_store_failed"}
        upgraded = await db[PI_EMAIL_IDEMPOTENCY].find_one_and_update(
            {"lead_id": lead_id, "status": "failed"},
            {"$set": {"status": "reserved", "reserved_at": now_utc, "error": None}},
        )
        if not upgraded:
            existing = await db[PI_EMAIL_IDEMPOTENCY].find_one({"lead_id": lead_id})
            already_sent = bool(existing and existing.get("status") == "sent")
            return {"ok": True, "already_sent": already_sent, "duplicate": True}

    subject_name = f"{payload.first_name} {payload.last_name}".strip() or email
    subject = f"Neue Produktanfrage · {product.capitalize()} · {subject_name}"

    attachments_payload: Optional[List[Dict[str, Any]]] = None
    pdf_attached = False
    pdf_error: Optional[str] = None
    try:
        pdf_data = {
            "product": product,
            "first_name": payload.first_name,
            "last_name": payload.last_name,
            "email": payload.email,
            "phone": payload.phone,
            "customer_number": payload.customer_number,
            "answers": payload.answers,
            "leadId": payload.leadId,
        }
        pdf_bytes: bytes = await asyncio.to_thread(_render_pi_pdf, pdf_data)
        if pdf_bytes and pdf_bytes.startswith(b"%PDF"):
            attachments_payload = [{
                "filename": _pi_pdf_filename(product),
                "content": _b64.b64encode(pdf_bytes).decode("ascii"),
                "content_type": "application/pdf",
            }]
            pdf_attached = True
        else:
            pdf_error = "invalid_pdf_output"
    except Exception as e:  # noqa: BLE001
        pdf_error = str(e)[:120]
        logger.warning("product-inquiry pdf gen failed: %s", pdf_error)

    try:
        email_id = await _send_email_via_emergent(
            PRODUCT_INQUIRY_TO, subject, _pi_email_html(payload),
            attachments=attachments_payload,
        )
    except HTTPException as e:
        retry_ok = False
        retry_id: Optional[str] = None
        if pdf_attached:
            try:
                logger.warning("product-inquiry email with attachment failed (%s) — retrying without PDF", e.detail)
                retry_id = await _send_email_via_emergent(PRODUCT_INQUIRY_TO, subject, _pi_email_html(payload))
                retry_ok = True
            except Exception as e2:  # noqa: BLE001
                logger.warning("product-inquiry retry (no attachment) also failed: %s", e2)
        if retry_ok:
            email_id = retry_id
            pdf_attached = False
            pdf_error = f"provider_rejected_attachment:{e.detail}"[:200]
        else:
            logger.warning("product-inquiry email failed: %s", e.detail)
            await db[PI_EMAIL_IDEMPOTENCY].update_one(
                {"lead_id": lead_id},
                {"$set": {"status": "failed", "error": str(e.detail)[:200], "failed_at": datetime.now(timezone.utc), "pdf_attached": False}},
            )
            return {"ok": False, "error": "email_provider_failed"}
    except Exception as e:  # noqa: BLE001
        logger.exception("product-inquiry email crashed: %s", e)
        await db[PI_EMAIL_IDEMPOTENCY].update_one(
            {"lead_id": lead_id},
            {"$set": {"status": "failed", "error": str(e)[:200], "failed_at": datetime.now(timezone.utc), "pdf_attached": False}},
        )
        return {"ok": False, "error": "email_crash"}

    await db[PI_EMAIL_IDEMPOTENCY].update_one(
        {"lead_id": lead_id},
        {"$set": {
            "status": "sent",
            "sent_at": datetime.now(timezone.utc),
            "email_id": email_id,
            "pdf_attached": pdf_attached,
            "pdf_error": pdf_error,
        }},
    )
    return {"ok": True, "email_id": email_id, "dry_run": email_id is None, "lead_id": lead_id, "pdf_attached": pdf_attached}
