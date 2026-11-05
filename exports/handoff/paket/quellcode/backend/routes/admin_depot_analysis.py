from __future__ import annotations

import base64
import json
import logging
import os
import re
import tempfile
import uuid
from typing import List, Literal, Optional

from dotenv import load_dotenv
from emergentintegrations.llm.chat import FileContentWithMimeType, LlmChat, StreamDone, TextDelta, UserMessage
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, ValidationError

from server import require_admin

load_dotenv()
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["admin-depot-analysis"])

_MAX_BYTES = 10 * 1024 * 1024
_SUFFIX = {"application/pdf": ".pdf", "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}

_INSTRUCTIONS = """Du bist ein sorgfältiger Assistent für Finanzberater in Deutschland.
Du erhältst einen Depotauszug (Text, PDF oder Bild). Extrahiere ausschließlich Daten, die im Dokument stehen – erfinde nichts.
- positions: jede Wertpapier-/Kontoposition. asset_class auf Deutsch, eine von: Aktien, Anleihen, Fonds, ETF, Geldmarkt/Liquidität, Rohstoffe, Immobilien, Derivate, Sonstiges.
- Fehlende Werte als null. Zahlen als reine Zahlen (Punkt als Dezimaltrenner, keine Tausendertrennzeichen).
- allocation: Vermögensaufteilung nach Anlageklasse; percent summiert sich auf ca. 100.
- summary: 3–5 Sätze auf Deutsch, sachlich, für den Berater.
- observations: höchstens 5 kurze Hinweise (z. B. Klumpenrisiken, hohe Liquidität, Währungsrisiken). Keine Anlageempfehlung.
- data_quality_notes: Unklarheiten oder unlesbare Stellen; leer, wenn alles eindeutig ist.
Wenn das Dokument kein Depotauszug ist, gib leere Listen zurück und erkläre das in summary.
Antworte AUSSCHLIESSLICH mit einem JSON-Objekt (ohne Markdown) in genau dieser Form:
{"depot_holder": string|null, "statement_date": string|null, "currency": string, "total_value": number|null,
 "summary": string,
 "positions": [{"name": string, "isin": string|null, "asset_class": string, "quantity": number|null, "market_value": number|null, "weight_percent": number|null}],
 "allocation": [{"category": string, "value": number|null, "percent": number}],
 "observations": [string], "data_quality_notes": [string]}"""


class Position(BaseModel):
    name: str
    isin: Optional[str] = None
    asset_class: str = "Sonstiges"
    quantity: Optional[float] = None
    market_value: Optional[float] = None
    weight_percent: Optional[float] = None


class Allocation(BaseModel):
    category: str
    value: Optional[float] = None
    percent: float = 0


class Analysis(BaseModel):
    depot_holder: Optional[str] = None
    statement_date: Optional[str] = None
    currency: str = "EUR"
    total_value: Optional[float] = None
    summary: str = ""
    positions: List[Position] = []
    allocation: List[Allocation] = []
    observations: List[str] = []
    data_quality_notes: List[str] = []


class AnalysisInput(BaseModel):
    text: Optional[str] = Field(None, max_length=200_000)
    file_base64: Optional[str] = Field(None, max_length=_MAX_BYTES * 4 // 3 + 16)
    media_type: Optional[Literal["application/pdf", "image/png", "image/jpeg", "image/webp"]] = None
    filename: Optional[str] = Field(None, max_length=200)


async def _ask(prompt: str, file_path: Optional[str], mime: Optional[str]) -> str:
    chat = LlmChat(
        api_key=os.environ["EMERGENT_LLM_KEY"],
        session_id=f"depot-analysis-{uuid.uuid4()}",
        system_message=_INSTRUCTIONS,
    ).with_model("gemini", "gemini-3.1-pro-preview")
    files = [FileContentWithMimeType(file_path=file_path, mime_type=mime)] if file_path else None
    out = []
    async for ev in chat.stream_message(UserMessage(text=prompt, file_contents=files)):
        if isinstance(ev, TextDelta):
            out.append(ev.content)
        elif isinstance(ev, StreamDone):
            break
    return "".join(out)


def _parse(raw: str) -> Analysis:
    m = re.search(r"\{.*\}", raw, re.S)
    if not m:
        raise ValueError("no json")
    return Analysis.model_validate(json.loads(m.group(0)))


@router.post("/depot-statement-analysis")
async def analyze(payload: AnalysisInput, _admin: dict = Depends(require_admin)):
    tmp_path = None
    try:
        if payload.file_base64:
            if not payload.media_type:
                raise HTTPException(status_code=422, detail="Bitte PDF oder Bild (PNG/JPG/WebP) verwenden.")
            try:
                data = base64.b64decode(payload.file_base64, validate=True)
            except Exception:
                raise HTTPException(status_code=422, detail="Die Datei konnte nicht gelesen werden.")
            if len(data) > _MAX_BYTES:
                raise HTTPException(status_code=422, detail="Die Datei ist größer als 10 MB.")
            with tempfile.NamedTemporaryFile(delete=False, suffix=_SUFFIX[payload.media_type]) as fh:
                fh.write(data)
                tmp_path = fh.name
            prompt = f"Depotauszug als Datei ({payload.filename or 'Upload'}). Bitte auswerten."
        elif payload.text and len(payload.text.strip()) >= 20:
            prompt = f"Depotauszug:\n\n{payload.text.strip()}"
        else:
            raise HTTPException(status_code=422, detail="Bitte einen Depotauszug hochladen oder mehr Text einfügen.")

        try:
            raw = await _ask(prompt, tmp_path, payload.media_type if tmp_path else None)
        except Exception as exc:
            logger.warning("depot analysis llm failed: %s", exc)
            msg = str(exc).lower()
            if "budget" in msg or "balance" in msg or "402" in msg:
                raise HTTPException(status_code=402, detail="Das KI-Guthaben ist aufgebraucht. Bitte Guthaben aufladen.")
            raise HTTPException(status_code=502, detail="Die Auswertung ist fehlgeschlagen. Bitte später erneut versuchen.")
        try:
            return {"analysis": _parse(raw).model_dump()}
        except (ValueError, ValidationError):
            raise HTTPException(status_code=502, detail="Die KI-Antwort konnte nicht gelesen werden. Bitte erneut versuchen.")
    finally:
        if tmp_path:
            os.unlink(tmp_path)
