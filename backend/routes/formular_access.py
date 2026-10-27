"""Session 82.96 — Formular Access Cutover (FastAPI/Mongo-native).

Ersetzt die Supabase-basierten RPCs
`verify_formular_access_code`, `verify_document_access_code`,
`formular_session_is_valid`, `get_formular_session_conditions`,
`admin_create_formular_access_code`, `admin_revoke_formular_access_code`
+ direkte Writes auf `formular_access_codes` / `formular_access_logs`.

Sicherheitsvertrag:
- Plaintext-Code NIEMALS persistiert. Nur `code_hash = sha256(code)` +
  `code_hint` (letzte 4 Zeichen, nicht sicherheitsrelevant, UI-Debug-Hilfe).
- Verify liefert generischen Fehler → kein User-Enumeration-Leak.
- Session-TTL 24 h; `revoked`-Codes machen ihre Sessions unmittelbar ungültig
  (Server-Join auf `formular_access_codes.status`).
- Contract-Conditions bleiben JSON-Blob wie in Legacy.
- Kein Storage-Zugriff.
"""
from __future__ import annotations

import hashlib
import os
import re
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from pymongo.errors import DuplicateKeyError

from server import require_admin  # type: ignore  # noqa: E402

_client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
_db = _client[os.environ["DB_NAME"]]

public_router = APIRouter(prefix="/api/formular-access", tags=["formular-access"])
admin_router = APIRouter(prefix="/api/admin/formular-access", tags=["admin-formular-access"])

_STATUS_ACTIVE = "active"
_STATUS_REVOKED = "revoked"
_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # ohne 0/O/1/I
_CODE_LEN = 8
_SESSION_TTL_HOURS = 24
_MAX_FAIL_PER_IP = 10
_FAIL_WINDOW_MIN = 15
_NAME_RE = re.compile(r"^[\wÄÖÜäöüß .,'\-()]{2,120}$")


def _sha256(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def _iso(v: Any) -> Optional[str]:
    if isinstance(v, datetime):
        return v.isoformat()
    return v if isinstance(v, str) else None


def _gen_code() -> str:
    return "".join(secrets.choice(_CODE_ALPHABET) for _ in range(_CODE_LEN))


async def _ensure_indexes() -> None:
    await _db.formular_access_codes.create_index(
        [("code_hash", 1)], unique=True, sparse=True, name="code_hash_unique"
    )
    await _db.formular_access_codes.create_index(
        [("created_at", -1)], name="created_desc"
    )
    await _db.formular_access_logs.create_index(
        [("used_at", -1)], name="used_desc"
    )
    await _db.formular_access_logs.create_index(
        [("code_id", 1), ("used_at", -1)], name="code_used_desc"
    )
    await _db.formular_sessions.create_index(
        [("session_id", 1)], unique=True, name="session_id_unique"
    )
    await _db.formular_sessions.create_index(
        [("expires_at", 1)], name="expires_at_asc"
    )


def _client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for", "")
    return (xff.split(",")[0].strip() if xff else (request.client.host if request.client else "")) or "unknown"


async def _rate_limit_check(request: Request) -> None:
    ip = _client_ip(request)
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(minutes=_FAIL_WINDOW_MIN)
    fails = await _db.formular_access_fail_log.count_documents({
        "ip": ip, "created_at": {"$gte": window_start}
    })
    if fails >= _MAX_FAIL_PER_IP:
        raise HTTPException(
            status_code=429,
            detail="Zu viele Fehlversuche. Bitte in wenigen Minuten erneut versuchen.",
        )


async def _log_fail(request: Request) -> None:
    ip = _client_ip(request)
    await _db.formular_access_fail_log.insert_one({
        "ip": ip, "created_at": datetime.now(timezone.utc)
    })


def _serialize_code(doc: dict, *, include_plain: Optional[str] = None) -> Dict[str, Any]:
    return {
        "id": str(doc["_id"]),
        "code": include_plain,           # nur bei Create-Response gesetzt
        "code_hint": doc.get("code_hint"),
        "admin_label": doc.get("admin_label"),
        "status": doc.get("status", _STATUS_ACTIVE),
        "use_count": int(doc.get("use_count") or 0),
        "last_used_at": _iso(doc.get("last_used_at")),
        "created_at": _iso(doc.get("created_at")),
        "created_by": str(doc["created_by"]) if doc.get("created_by") else None,
        "contract_conditions": doc.get("contract_conditions"),
    }


def _serialize_log(doc: dict) -> Dict[str, Any]:
    return {
        "id": str(doc["_id"]),
        "code_id": str(doc.get("code_id")) if doc.get("code_id") else None,
        "used_by_name": doc.get("used_by_name"),
        "used_at": _iso(doc.get("used_at")),
        "user_agent": doc.get("user_agent"),
        "session_id": doc.get("session_id"),
    }


# ─── Public: Verify Code + Create Session ───────────────────────────────
class VerifyIn(BaseModel):
    code: str = Field(..., min_length=4, max_length=64)
    used_by_name: str = Field(..., min_length=2, max_length=120)
    user_agent: Optional[str] = Field(default=None, max_length=500)
    model_config = {"extra": "forbid"}


@public_router.post("/verify")
async def verify_formular_code(
    request: Request,
    body: VerifyIn = Body(...),
) -> Dict[str, Any]:
    """Prüft Zugangscode + eröffnet 24-h-Session. Generisches 401 bei Miss."""
    await _ensure_indexes()
    await _rate_limit_check(request)
    code = body.code.strip().upper()
    name = body.used_by_name.strip()
    if not _NAME_RE.match(name):
        raise HTTPException(status_code=422, detail="Name ungültig")
    code_hash = _sha256(code)
    doc = await _db.formular_access_codes.find_one({"code_hash": code_hash})
    if not doc or doc.get("status") != _STATUS_ACTIVE:
        await _log_fail(request)
        raise HTTPException(status_code=401, detail="Ungültiger Zugangscode")

    now = datetime.now(timezone.utc)
    session_id = secrets.token_urlsafe(24)
    await _db.formular_sessions.insert_one({
        "session_id": session_id,
        "code_id": doc["_id"],
        "used_by_name": name,
        "created_at": now,
        "expires_at": now + timedelta(hours=_SESSION_TTL_HOURS),
    })
    await _db.formular_access_codes.update_one(
        {"_id": doc["_id"]},
        {"$inc": {"use_count": 1}, "$set": {"last_used_at": now, "updated_at": now}},
    )
    await _db.formular_access_logs.insert_one({
        "code_id": doc["_id"],
        "used_by_name": name,
        "used_at": now,
        "user_agent": (body.user_agent or "")[:500] or None,
        "session_id": session_id,
    })
    return {"session_id": session_id}


class VerifyDocumentIn(BaseModel):
    code: str = Field(..., min_length=4, max_length=64)
    model_config = {"extra": "forbid"}


@public_router.post("/verify-document")
async def verify_document_code(
    request: Request,
    body: VerifyDocumentIn = Body(...),
) -> Dict[str, Any]:
    """Boolean-Check für Doc-Upload-Portal (Legacy: `verify_document_access_code`).

    Semantisch identisch zu `verify` — Legacy trennte die RPCs, wir nutzen
    dieselbe Collection. Keine Session-Erstellung, kein Log-Eintrag (Legacy
    machte ebenfalls nur einen boolean-Check).
    """
    await _ensure_indexes()
    await _rate_limit_check(request)
    code = body.code.strip().upper()
    doc = await _db.document_access_codes.find_one({"code_hash": _sha256(code)})
    if not doc:
        doc = await _db.formular_access_codes.find_one({"code_hash": _sha256(code)})
    if not doc or doc.get("status") != _STATUS_ACTIVE:
        await _log_fail(request)
        raise HTTPException(status_code=401, detail="Ungültiger oder bereits verwendeter Zugangscode")
    return {"valid": True}


class SessionValidateIn(BaseModel):
    session_id: str = Field(..., min_length=8, max_length=128)
    model_config = {"extra": "forbid"}


async def _load_valid_session(session_id: str) -> Optional[dict]:
    sess = await _db.formular_sessions.find_one({"session_id": session_id})
    if not sess:
        return None
    exp = sess.get("expires_at")
    if isinstance(exp, datetime):
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < datetime.now(timezone.utc):
            return None
    code = await _db.formular_access_codes.find_one({"_id": sess.get("code_id")})
    if not code or code.get("status") != _STATUS_ACTIVE:
        return None
    sess["_code_doc"] = code
    return sess


@public_router.post("/session/validate")
async def session_validate(body: SessionValidateIn = Body(...)) -> Dict[str, Any]:
    """Session-Gate für `FormularProtectedRoute`. Faithful boolean."""
    sess = await _load_valid_session(body.session_id.strip())
    return {"valid": bool(sess)}


class SessionConditionsIn(BaseModel):
    session_id: str = Field(..., min_length=8, max_length=128)
    bank: str = Field(..., min_length=1, max_length=40)
    product: str = Field(..., min_length=1, max_length=40)
    model_config = {"extra": "forbid"}


@public_router.post("/session/conditions")
async def session_conditions(body: SessionConditionsIn = Body(...)) -> Dict[str, Any]:
    """Liefert die für Bank+Produkt konfigurierten Konditionen (JSON-Blob).

    Empty-State: `null`, wenn Session gültig ist, aber keine passenden
    Konditionen hinterlegt. Ungültige Session → auch `null` (kein Leak).
    """
    sess = await _load_valid_session(body.session_id.strip())
    if not sess:
        return {"conditions": None}
    code = sess["_code_doc"]
    cc = code.get("contract_conditions") or None
    if not cc or not isinstance(cc, dict):
        return {"conditions": None}
    if cc.get("bank") != body.bank or cc.get("product") != body.product:
        return {"conditions": None}
    return {"conditions": cc}


# ─── Admin: List / Create / Revoke / Delete / Conditions ────────────────
class AdminCreateIn(BaseModel):
    admin_label: Optional[str] = Field(default=None, max_length=200)
    model_config = {"extra": "forbid"}


@admin_router.get("/codes")
async def admin_list_codes(_admin: dict = Depends(require_admin)) -> Dict[str, Any]:
    await _ensure_indexes()
    cursor = _db.formular_access_codes.find({}).sort([("created_at", -1)]).limit(1000)
    docs = await cursor.to_list(1000)
    return {"items": [_serialize_code(d) for d in docs], "count": len(docs)}


@admin_router.post("/codes", status_code=201)
async def admin_create_code(
    body: AdminCreateIn = Body(default_factory=AdminCreateIn),
    admin: dict = Depends(require_admin),
) -> Dict[str, Any]:
    """Erzeugt Code und gibt Plaintext GENAU EINMAL zurück — danach nur Hash."""
    await _ensure_indexes()
    now = datetime.now(timezone.utc)
    # sehr geringe Kollisionsgefahr, aber defensiv 5 Versuche
    plain: Optional[str] = None
    for _ in range(5):
        candidate = _gen_code()
        try:
            doc = {
                "code_hash": _sha256(candidate),
                "code_hint": candidate[-4:],
                "admin_label": (body.admin_label or "").strip()[:200] or None,
                "status": _STATUS_ACTIVE,
                "use_count": 0,
                "last_used_at": None,
                "created_by": ObjectId(admin["id"]),
                "created_at": now,
                "updated_at": now,
                "contract_conditions": None,
            }
            res = await _db.formular_access_codes.insert_one(doc)
            doc["_id"] = res.inserted_id
            plain = candidate
            break
        except DuplicateKeyError:
            continue
    if not plain:
        raise HTTPException(status_code=500, detail="Code-Generation fehlgeschlagen")
    return _serialize_code(doc, include_plain=plain)


@admin_router.post("/codes/{code_id}/revoke")
async def admin_revoke_code(
    code_id: str,
    _admin: dict = Depends(require_admin),
) -> Dict[str, Any]:
    if not ObjectId.is_valid(code_id):
        raise HTTPException(status_code=422, detail="Ungültige code_id")
    oid = ObjectId(code_id)
    now = datetime.now(timezone.utc)
    result = await _db.formular_access_codes.find_one_and_update(
        {"_id": oid, "status": _STATUS_ACTIVE},
        {"$set": {"status": _STATUS_REVOKED, "revoked_at": now, "updated_at": now}},
        return_document=True,
    )
    if not result:
        existing = await _db.formular_access_codes.find_one({"_id": oid})
        if not existing:
            raise HTTPException(status_code=404, detail="Code nicht gefunden")
        return _serialize_code(existing)  # idempotent
    return _serialize_code(result)


@admin_router.delete("/codes/{code_id}")
async def admin_delete_code(
    code_id: str,
    _admin: dict = Depends(require_admin),
):
    if not ObjectId.is_valid(code_id):
        raise HTTPException(status_code=422, detail="Ungültige code_id")
    oid = ObjectId(code_id)
    await _db.formular_access_logs.delete_many({"code_id": oid})
    await _db.formular_sessions.delete_many({"code_id": oid})
    res = await _db.formular_access_codes.delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Code nicht gefunden")
    return {"status": "deleted", "id": code_id}


class ConditionsPatchIn(BaseModel):
    contract_conditions: Optional[Dict[str, Any]] = None
    model_config = {"extra": "forbid"}


@admin_router.patch("/codes/{code_id}/conditions")
async def admin_patch_conditions(
    code_id: str,
    body: ConditionsPatchIn = Body(...),
    _admin: dict = Depends(require_admin),
) -> Dict[str, Any]:
    if not ObjectId.is_valid(code_id):
        raise HTTPException(status_code=422, detail="Ungültige code_id")
    oid = ObjectId(code_id)
    now = datetime.now(timezone.utc)
    cc = body.contract_conditions
    # Whitelist (kein mass-assignment auf andere Felder): nur bekannte Keys.
    if cc is not None:
        allowed = {
            "bank", "product", "investmentAmountDisplay", "investmentAmount",
            "interestRate", "term", "welcomeBonus",
        }
        cc = {k: v for k, v in cc.items() if k in allowed}
        for k in ("bank", "product"):
            if cc.get(k) and not isinstance(cc[k], str):
                raise HTTPException(status_code=422, detail=f"{k} muss String sein")
    result = await _db.formular_access_codes.find_one_and_update(
        {"_id": oid},
        {"$set": {"contract_conditions": cc, "updated_at": now}},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Code nicht gefunden")
    return _serialize_code(result)


@admin_router.get("/logs")
async def admin_list_logs(
    limit: int = Query(default=500, ge=1, le=2000),
    _admin: dict = Depends(require_admin),
) -> Dict[str, Any]:
    cursor = _db.formular_access_logs.find({}).sort([("used_at", -1)]).limit(limit)
    docs = await cursor.to_list(limit)
    return {"items": [_serialize_log(d) for d in docs], "count": len(docs)}
