"""
Reports-Router — PDF-Erzeugung.

Route:
    POST /api/reports/pdf     Investment-Report als PDF-Download

Design:
- Erste Route unter /app/backend/routes/ — Vorbild für zukünftige Modul-
  Extraktion aus server.py. Registrierung in server.py via
  `app.include_router(reports.router)`.
- Input strikt via Pydantic validiert; server-seitige Copy kommt aus dem
  Produkt-Katalog in services/report_pdf.py — Frontend liefert nur Key +
  Antworten, keine freien Text-Bausteine.
- Puppeteer wurde bewusst NICHT gewählt: WeasyPrint ist deterministisch,
  synchron, kennt kein Chromium-Zombie-Risiko und keine Browser-Pool-Kosten.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, Optional
from urllib.parse import quote

from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from services.report_pdf import PRODUCT_CATALOG, build_filename, render_pdf

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reports", tags=["reports"])

# Erlaubte Produkt-Keys — deckungsgleich mit VALID_PI_PRODUCTS in server.py
VALID_PRODUCTS = set(PRODUCT_CATALOG.keys())

# Timeout für den WeasyPrint-Rendering-Thread. Ein Report läuft normal in
# < 500 ms; 20 s ist ein großzügiger Deadman-Switch gegen unerwartete Hänger.
RENDER_TIMEOUT_SECONDS = 20.0


class ReportAnswerEntry(BaseModel):
    label: str = Field(default="", max_length=200)
    value: str = Field(default="", max_length=80)


class ReportRequest(BaseModel):
    """
    Body-Schema für POST /api/reports/pdf.

    Frontend liefert:
    - product: einer der 6 Wizard-Keys (Server validiert)
    - first_name / last_name / email / phone / customer_number: optional
    - answers: {qid: {label, value}} — Labels stammen aus dem
      Frontend-Fragenkatalog (productInquiryQuestions.js). Werte werden im
      Report ausschließlich escaped angezeigt.
    - leadId: optional; wird als Referenz im Report angezeigt, aber NICHT
      benutzt, um weitere Daten von einem Drittsystem nachzuladen.
    """

    product: str = Field(..., min_length=1, max_length=32)
    first_name: str = Field(default="", max_length=80)
    last_name: str = Field(default="", max_length=80)
    email: str = Field(default="", max_length=180)
    phone: str = Field(default="", max_length=48)
    customer_number: Optional[str] = Field(default=None, max_length=48)
    answers: Dict[str, Any] = Field(default_factory=dict)
    leadId: Optional[str] = Field(default=None, max_length=64)


def _content_disposition(filename: str) -> str:
    """RFC 5987-konformer Content-Disposition-Header (Umlaute sicher)."""
    ascii_fallback = filename.encode("ascii", "ignore").decode("ascii") or "report.pdf"
    encoded = quote(filename, safe="")
    return f'attachment; filename="{ascii_fallback}"; filename*=UTF-8\'\'{encoded}'


@router.post("/pdf")
async def create_report_pdf(payload: ReportRequest):
    product_key = payload.product.strip().lower()
    if product_key not in VALID_PRODUCTS:
        return JSONResponse(
            status_code=400,
            content={"ok": False, "error": "invalid_product", "detail": f"Unknown product '{payload.product}'"},
        )

    # Ins Dict wandeln, damit der Service unabhängig von FastAPI bleibt.
    data = payload.model_dump()
    data["product"] = product_key

    try:
        pdf_bytes: bytes = await asyncio.wait_for(
            asyncio.to_thread(render_pdf, data),
            timeout=RENDER_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        logger.warning("report pdf timeout: product=%s lead=%s", product_key, payload.leadId)
        return JSONResponse(
            status_code=504,
            content={"ok": False, "error": "render_timeout"},
        )
    except ValueError as e:
        # invalid_product o. ä. aus dem Service.
        return JSONResponse(
            status_code=400,
            content={"ok": False, "error": str(e) or "invalid_input"},
        )
    except Exception:  # noqa: BLE001 — Blanket-Except, damit kein 500 ohne JSON durchschlägt
        logger.exception("report pdf render crashed")
        return JSONResponse(
            status_code=500,
            content={"ok": False, "error": "render_failed"},
        )

    if not pdf_bytes or not pdf_bytes.startswith(b"%PDF"):
        logger.error("weasyprint returned invalid PDF payload (%d bytes)", len(pdf_bytes) if pdf_bytes else 0)
        return JSONResponse(
            status_code=500,
            content={"ok": False, "error": "invalid_pdf_output"},
        )

    filename = build_filename(product_key)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": _content_disposition(filename),
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("/products")
async def list_report_products():
    """Hilfs-Endpoint für das Frontend / Debug: verfügbare Produkt-Keys."""
    return {
        "products": [
            {"key": k, "title": v["title"], "kicker": v["kicker"]}
            for k, v in PRODUCT_CATALOG.items()
        ]
    }
