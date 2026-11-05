"""Phase 4 „Größere Vermögen" — Vermögensgespräch-Anfragen mit optionaler Report-Freigabe.

Datenminimierung: OHNE ausdrückliche Report-Freigabe werden KEINE Finanzdaten
gespeichert. Mit Freigabe: report_shared=True + consent_timestamp + snapshot.
"""
from __future__ import annotations

import logging
import re
import uuid
from datetime import datetime, timezone
from typing import List, Literal, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field, validator

from server import db, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["wealth-consultation"])

MAX_TEXT = 2000
MAX_TOPICS = 20
CONSENT_VERSION = "wc-consent-v1"

# ── in-memory sliding-window rate limit (best-effort, kein CAPTCHA) ──
_RATE: dict = {}
def _rate_ok(ip: str, limit: int = 5, window_sec: int = 300) -> bool:
    now = datetime.now(timezone.utc).timestamp()
    q = _RATE.setdefault(ip, [])
    q[:] = [t for t in q if now - t < window_sec]
    if len(q) >= limit:
        return False
    q.append(now)
    return True


class WealthConsultationInput(BaseModel):
    topics: List[str] = Field(default_factory=list, max_items=MAX_TOPICS)
    firstname: str = Field(..., min_length=1, max_length=100)
    lastname: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=40)
    contact_preference: Literal["phone", "email", "video"] = "email"
    reachability: Optional[Literal["morning", "afternoon", "evening"]] = None
    message: Optional[str] = Field(None, max_length=MAX_TEXT)
    privacy_accepted: bool = Field(...)
    report_shared: bool = Field(default=False)
    report_snapshot: Optional[dict] = None

    @validator("firstname", "lastname")
    def _no_html(cls, v: str) -> str:
        v = re.sub(r"[<>]", "", (v or "").strip())
        if not v:
            raise ValueError("required")
        return v

    @validator("phone")
    def _phone_sane(cls, v):
        if v is None: return v
        v = re.sub(r"[^\d+()/\s\-]", "", v.strip())[:40]
        return v or None

    @validator("message")
    def _msg_html(cls, v):
        if v is None: return v
        return re.sub(r"[<>]", "", v)[:MAX_TEXT] or None

    @validator("topics", each_item=True)
    def _topic_slug(cls, v: str) -> str:
        v = re.sub(r"[^a-z0-9_\-]", "", (v or "").lower())[:60]
        if not v:
            raise ValueError("invalid topic")
        return v


def _serialize(doc: dict, *, include_snapshot: bool = False) -> dict:
    if not doc:
        return {}
    out = {
        "id": str(doc.get("_id")) if doc.get("_id") else doc.get("request_id"),
        "request_id": doc.get("request_id"),
        "created_at": (doc.get("created_at").isoformat() if isinstance(doc.get("created_at"), datetime) else doc.get("created_at")),
        "firstname": doc.get("firstname"),
        "lastname": doc.get("lastname"),
        "email": doc.get("email"),
        "phone": doc.get("phone"),
        "contact_preference": doc.get("contact_preference"),
        "reachability": doc.get("reachability"),
        "message": doc.get("message"),
        "topics": doc.get("topics", []),
        "status": doc.get("status", "neu"),
        "report_shared": bool(doc.get("report_shared", False)),
        "user_id": doc.get("user_id"),
    }
    if doc.get("report_shared") and doc.get("consent_timestamp"):
        out["consent_timestamp"] = doc["consent_timestamp"].isoformat() if isinstance(doc["consent_timestamp"], datetime) else doc["consent_timestamp"]
        out["consent_version"] = doc.get("consent_version")
    if include_snapshot and doc.get("report_shared") and doc.get("report_snapshot"):
        out["report_snapshot"] = doc["report_snapshot"]
    return out


async def _optional_user(request: Request):
    """Auth-Prefill ohne 401: liefert user-dict oder None."""
    try:
        return await get_current_user(request)
    except Exception:
        return None


@router.post("/wealth-consultation", status_code=201)
async def create_wealth_consultation(payload: WealthConsultationInput, request: Request):
    ip = (request.client.host if request.client else "unknown") + ":" + (request.headers.get("user-agent", "")[:24])
    if not _rate_ok(ip):
        raise HTTPException(status_code=429, detail="Zu viele Anfragen. Bitte in einigen Minuten erneut versuchen.")
    if not payload.privacy_accepted:
        raise HTTPException(status_code=400, detail="Datenschutz-Zustimmung fehlt.")

    # user_id NUR aus Session — niemals aus Request
    user = await _optional_user(request)
    user_id = user.get("id") if user else None

    now = datetime.now(timezone.utc)
    request_id = uuid.uuid4().hex  # nicht sequenziell erratbar

    doc = {
        "request_id": request_id,
        "user_id": user_id,
        "created_at": now,
        "firstname": payload.firstname,
        "lastname": payload.lastname,
        "email": payload.email.lower().strip(),
        "phone": payload.phone,
        "contact_preference": payload.contact_preference,
        "reachability": payload.reachability,
        "message": payload.message,
        "topics": payload.topics,
        "status": "neu",
        "report_shared": False,  # default hart NEIN
    }

    # Datenminimierung: Finanzdaten NUR bei ausdrücklicher Freigabe
    if payload.report_shared and payload.report_snapshot:
        doc["report_shared"] = True
        doc["report_snapshot"] = payload.report_snapshot
        doc["consent_timestamp"] = now
        doc["consent_version"] = CONSENT_VERSION

    result = await db.wealth_consultation_requests.insert_one(doc)
    logger.info(
        "wealth_consultation_submitted request_id=%s shared=%s user_id=%s topics=%d",
        request_id, doc["report_shared"], user_id or "guest", len(payload.topics),
    )
    return {
        "request_id": request_id,
        "created_at": now.isoformat(),
        "report_shared": doc["report_shared"],
    }


@router.get("/admin/wealth-consultations")
async def list_wealth_consultations(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin-Rechte erforderlich.")
    cursor = db.wealth_consultation_requests.find({}).sort("created_at", -1).limit(200)
    items = [_serialize(d) async for d in cursor]
    return {"items": items, "count": len(items)}


@router.get("/admin/wealth-consultations/{request_id}")
async def get_wealth_consultation(request_id: str, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin-Rechte erforderlich.")
    if not re.fullmatch(r"[0-9a-f]{32}", request_id or ""):
        raise HTTPException(status_code=400, detail="Ungültige Anfrage-ID.")
    doc = await db.wealth_consultation_requests.find_one({"request_id": request_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Anfrage nicht gefunden.")
    return _serialize(doc, include_snapshot=True)
