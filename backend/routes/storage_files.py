"""Session 82.99 — Avatar & Document Storage Endpoints (FastAPI/Mongo-nativ).

Ersetzt Supabase-Storage-Nutzung in `AdminUserDetail.js` (Avatar) und
`AdminDocumentUploads.jsx` (Dokumente). Alle Uploads laufen serverseitig
über den Emergent-Object-Storage-Wrapper.

Sicherheit:
- Owner/Admin-Auth für Avatar
- Admin-Auth (require_admin) für Dokument-Listing/Download/Löschen
- MIME-Allowlist + Größenlimits (Avatar 5 MB, Dokument 20 MB)
- Zufällige UUID-Object-Keys → keine Path-Traversal möglich
- Original-Filename nur als Mongo-Metadata (`original_filename`)
- Alte Avatar-Datei wird erst nach erfolgreichem Neu-Upload soft-gelöscht.
"""
from __future__ import annotations

import os
import re
import secrets
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, Path, Query, Request, Response, UploadFile
from motor.motor_asyncio import AsyncIOMotorClient

from server import get_current_user, require_admin  # type: ignore  # noqa: E402

# Session 82.104a — Rate-Limit für Public-Upload (Anti-Abuse zusätzlich zu MIME/Size).
try:
    from server import limiter as _limiter  # type: ignore
except Exception:
    _limiter = None

def _rl(rule: str):
    def decorator(func):
        if _limiter is None:
            return func
        return _limiter.limit(rule)(func)
    return decorator


# Session 82.104a — Simple in-memory rate-limit für public document upload
# (Anti-Abuse zusätzlich zu MIME/Size). 5 Uploads pro Minute pro IP.
import time as _time_mod
from collections import defaultdict as _defaultdict
_UPLOAD_RL: dict = _defaultdict(list)

def _check_public_upload_rl(request: Request) -> None:
    """5 uploads / minute per IP. Raises 429 if exceeded."""
    xff = request.headers.get("x-forwarded-for", "")
    ip = xff.split(",")[-1].strip() if xff else (request.client.host if request.client else "unknown")
    now = _time_mod.time()
    window = 60
    hist = [t for t in _UPLOAD_RL[ip] if t > now - window]
    if len(hist) >= 5:
        raise HTTPException(status_code=429, detail="Zu viele Uploads. Bitte warten.")
    hist.append(now)
    _UPLOAD_RL[ip] = hist
    # cleanup
    if len(_UPLOAD_RL) > 500:
        _UPLOAD_RL.clear()
from services.emergent_storage import APP_PREFIX, get_object, put_object

_client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
_db = _client[os.environ["DB_NAME"]]

router = APIRouter(prefix="/api", tags=["storage-files"])

AVATAR_ALLOWED = {"image/jpeg", "image/png", "image/webp"}
AVATAR_MAX_BYTES = 5 * 1024 * 1024

DOC_ALLOWED = {
    "application/pdf",
    "image/jpeg", "image/png", "image/webp",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
}
DOC_MAX_BYTES = 20 * 1024 * 1024

_SAFE_FILENAME_RE = re.compile(r"[^\w \-.()]+")


def _sanitize_filename(name: str) -> str:
    name = (name or "").strip() or "upload"
    return _SAFE_FILENAME_RE.sub("_", name)[:200]


def _ext_from_content_type(ct: str) -> str:
    return {
        "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
        "application/pdf": "pdf", "text/plain": "txt",
        "application/msword": "doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    }.get(ct, "bin")


# ─── AVATAR ─────────────────────────────────────────────────────────────
@router.post("/users/{user_id}/avatar")
async def upload_avatar(
    user_id: str,
    file: UploadFile = File(...),
    current: dict = Depends(get_current_user),
):
    """Owner (self) oder Admin. Ersetzt aktuellen Avatar; alter Datensatz
    wird soft-deleted (Storage hat kein Delete-API, siehe Playbook)."""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=422, detail="Ungültige user_id")
    is_admin = current.get("role") == "admin"
    is_owner = str(current.get("id")) == user_id
    if not (is_admin or is_owner):
        raise HTTPException(status_code=403, detail="Kein Zugriff")

    ct = (file.content_type or "").lower()
    if ct not in AVATAR_ALLOWED:
        raise HTTPException(status_code=415, detail="MIME nicht erlaubt (nur JPG/PNG/WEBP)")

    data = await file.read()
    if len(data) > AVATAR_MAX_BYTES:
        raise HTTPException(status_code=413, detail="Datei zu groß (max. 5 MB)")
    if len(data) == 0:
        raise HTTPException(status_code=422, detail="Leere Datei")

    ext = _ext_from_content_type(ct)
    path = f"{APP_PREFIX}/avatars/{user_id}/{uuid.uuid4().hex}.{ext}"
    try:
        result = put_object(path, data, ct)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Storage-Upload fehlgeschlagen: {e}")

    now = datetime.now(timezone.utc)
    # Soft-delete alte Avatare desselben Users
    await _db.storage_files.update_many(
        {"scope": "avatar", "subject_id": user_id, "is_deleted": False},
        {"$set": {"is_deleted": True, "deleted_at": now}},
    )
    file_id = uuid.uuid4().hex
    await _db.storage_files.insert_one({
        "_id": file_id,
        "scope": "avatar",
        "subject_id": user_id,
        "storage_path": result["path"],
        "content_type": ct,
        "size": int(result.get("size") or len(data)),
        "original_filename": _sanitize_filename(file.filename or ""),
        "is_deleted": False,
        "uploaded_by": str(current.get("id")),
        "created_at": now,
    })
    # DB-Feld `avatar_url` auf Backend-Proxy-URL setzen
    proxy_url = f"/api/users/{user_id}/avatar?v={int(now.timestamp())}"
    await _db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"avatar_url": proxy_url, "updated_at": now}})
    return {"file_id": file_id, "storage_path": result["path"], "url": proxy_url, "size": result.get("size")}


@router.get("/users/{user_id}/avatar")
async def get_avatar(user_id: str):
    """Öffentlich lesbar (Avatare sind non-sensitive Bilder)."""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=422, detail="Ungültige user_id")
    doc = await _db.storage_files.find_one(
        {"scope": "avatar", "subject_id": user_id, "is_deleted": False},
        sort=[("created_at", -1)],
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Kein Avatar")
    data, ct = get_object(doc["storage_path"])
    if not data:
        raise HTTPException(status_code=404, detail="Datei nicht im Storage")
    return Response(content=data, media_type=doc.get("content_type") or ct or "image/jpeg")


# ─── ADMIN DOCUMENT UPLOADS ─────────────────────────────────────────────
@router.get("/admin/document-uploads/codes")
async def admin_list_doc_codes(_admin: dict = Depends(require_admin)) -> Dict[str, Any]:
    cursor = _db.document_access_codes.find({}).sort([("created_at", -1)]).limit(1000)
    docs = await cursor.to_list(1000)
    items = [{
        "id": str(d["_id"]),
        "code": None,
        "code_hint": d.get("code_hint"),
        "admin_label": d.get("admin_label"),
        "status": d.get("status", "active"),
        "used_at": d["used_at"].isoformat() if isinstance(d.get("used_at"), datetime) else None,
        "used_by_name": d.get("used_by_name"),
        "user_agent": d.get("user_agent"),
        "created_at": d["created_at"].isoformat() if isinstance(d.get("created_at"), datetime) else None,
    } for d in docs]
    return {"items": items, "count": len(items)}


@router.post("/admin/document-uploads/codes", status_code=201)
async def admin_create_doc_code(
    body: Dict[str, Any] = Body(default_factory=dict),
    admin: dict = Depends(require_admin),
) -> Dict[str, Any]:
    import hashlib
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    now = datetime.now(timezone.utc)
    code = "".join(secrets.choice(alphabet) for _ in range(8))
    doc = {
        "_id": ObjectId(),
        "code_hash": hashlib.sha256(code.encode()).hexdigest(),
        "code_hint": code[-4:],
        "admin_label": (body.get("admin_label") or "").strip()[:200] or None,
        "status": "active",
        "used_at": None,
        "used_by_name": None,
        "user_agent": None,
        "ip": None,
        "created_at": now,
        "created_by": ObjectId(admin["id"]),
    }
    await _db.document_access_codes.insert_one(doc)
    return {"id": str(doc["_id"]), "code": code, "code_hint": code[-4:], "status": "active"}


@router.post("/admin/document-uploads/codes/{code_id}/revoke")
async def admin_revoke_doc_code(code_id: str, _admin: dict = Depends(require_admin)):
    if not ObjectId.is_valid(code_id):
        raise HTTPException(status_code=422, detail="Ungültige code_id")
    res = await _db.document_access_codes.update_one(
        {"_id": ObjectId(code_id), "status": "active"},
        {"$set": {"status": "revoked", "revoked_at": datetime.now(timezone.utc)}},
    )
    return {"status": "revoked", "modified": res.modified_count}


@router.delete("/admin/document-uploads/codes/{code_id}")
async def admin_delete_doc_code(code_id: str, _admin: dict = Depends(require_admin)):
    if not ObjectId.is_valid(code_id):
        raise HTTPException(status_code=422, detail="Ungültige code_id")
    await _db.document_access_codes.delete_one({"_id": ObjectId(code_id)})
    return {"status": "deleted", "id": code_id}


@router.get("/admin/document-uploads/submissions")
async def admin_list_doc_submissions(
    limit: int = Query(default=200, ge=1, le=1000),
    _admin: dict = Depends(require_admin),
) -> Dict[str, Any]:
    cursor = _db.document_upload_submissions.find({}).sort([("created_at", -1)]).limit(limit)
    docs = await cursor.to_list(limit)
    items = []
    for d in docs:
        items.append({
            "id": str(d["_id"]),
            "code_id": str(d.get("code_id")) if d.get("code_id") else None,
            "used_by_name": d.get("used_by_name"),
            "message": d.get("message"),
            "files": d.get("files") or [],
            "user_agent": d.get("user_agent"),
            "ip": d.get("ip"),
            "status": d.get("status", "new"),
            "admin_email_sent": bool(d.get("admin_email_sent")),
            "admin_email_error": d.get("admin_email_error"),
            "created_at": d["created_at"].isoformat() if isinstance(d.get("created_at"), datetime) else None,
        })
    return {"items": items, "count": len(items)}


@router.post("/admin/document-uploads/submissions/{sub_id}/mark-handled")
async def admin_mark_handled(sub_id: str, _admin: dict = Depends(require_admin)):
    if not ObjectId.is_valid(sub_id):
        raise HTTPException(status_code=422, detail="Ungültige sub_id")
    await _db.document_upload_submissions.update_one(
        {"_id": ObjectId(sub_id)}, {"$set": {"status": "handled", "updated_at": datetime.now(timezone.utc)}},
    )
    return {"status": "handled"}


@router.delete("/admin/document-uploads/submissions/{sub_id}")
async def admin_delete_submission(sub_id: str, _admin: dict = Depends(require_admin)):
    if not ObjectId.is_valid(sub_id):
        raise HTTPException(status_code=422, detail="Ungültige sub_id")
    sub = await _db.document_upload_submissions.find_one({"_id": ObjectId(sub_id)})
    if not sub:
        raise HTTPException(status_code=404, detail="Nicht gefunden")
    # Storage-Objekte soft-löschen (Emergent Storage hat kein Delete-API)
    now = datetime.now(timezone.utc)
    paths = [f.get("path") for f in (sub.get("files") or []) if f.get("path")]
    if paths:
        await _db.storage_files.update_many(
            {"storage_path": {"$in": paths}},
            {"$set": {"is_deleted": True, "deleted_at": now}},
        )
    await _db.document_upload_submissions.delete_one({"_id": ObjectId(sub_id)})
    return {"status": "deleted", "id": sub_id}


@router.get("/admin/document-uploads/files/{file_id}/download")
async def admin_download_doc(file_id: str, _admin: dict = Depends(require_admin)):
    doc = await _db.storage_files.find_one({"_id": file_id, "is_deleted": False})
    if not doc:
        raise HTTPException(status_code=404, detail="Datei nicht gefunden")
    data, ct = get_object(doc["storage_path"])
    if not data:
        raise HTTPException(status_code=404, detail="Datei nicht im Storage")
    filename = doc.get("original_filename") or "download"
    return Response(
        content=data,
        media_type=doc.get("content_type") or ct or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ─── PUBLIC DOCUMENT SUBMIT (Session 82.101b) ────────────────────────────
import hashlib as _hashlib

DOC_PUBLIC_MAX_FILES = 10
DOC_PUBLIC_MAX_FILE_BYTES = 10 * 1024 * 1024   # 10 MB/Datei
DOC_PUBLIC_MAX_TOTAL_BYTES = 20 * 1024 * 1024  # 20 MB gesamt
DOC_PUBLIC_ALLOWED_CT = {
    "application/pdf",
    "image/jpeg", "image/png", "image/webp",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
}


@router.post("/document-uploads/submit", response_model=None)
async def public_submit_document_upload(
    request: Request,
    code: str = Form(...),
    used_by_name: str = Form(...),
    message: Optional[str] = Form(default=None),
    user_agent: Optional[str] = Form(default=None),
    files: List[UploadFile] = File(...),
):
    # Session 82.104a — inline Rate-Limit (slowapi-Decorator konfliktet mit
    # FastAPI's UploadFile-Signature-Analyse). Manuelle Check-Route über
    # limiter.limit()."check() gibt keine Exception zurück, wenn OK.
    _check_public_upload_rl(request)
    """Öffentlicher, Access-Code-geschützter Multipart-Upload.

    Vertrag:
    - Access-Gate: Code muss existieren und `status=active` sein (siehe 82.96).
    - Serverseitige MIME/Size-Validation, UUID-Object-Keys, Original-Filename
      nur als Metadata, keine Path-Traversal möglich.
    - Reihenfolge: Access → Validate → Storage-Put → Verify → Mongo-Insert.
      Bei Storage-Put-Success + Mongo-Fail werden Storage-Objekte soft-deleted.
    - Client darf weder user_id/Admin-Status/Storage-Key autoritativ setzen.
    """
    await _ensure_public_indexes()

    # 1) Access-Check (Code + Status)
    code_val = (code or "").strip().upper()
    name = (used_by_name or "").strip()
    if not name or len(name) < 2 or len(name) > 120:
        raise HTTPException(status_code=422, detail="Name ungültig")
    if not (4 <= len(code_val) <= 32):
        raise HTTPException(status_code=422, detail="Code ungültig")
    code_hash = _hashlib.sha256(code_val.encode()).hexdigest()
    code_coll = _db.document_access_codes
    is_doc_code = True
    code_doc = await code_coll.find_one({"code_hash": code_hash})
    if not code_doc:
        is_doc_code = False
        code_coll = _db.formular_access_codes
        code_doc = await code_coll.find_one({"code_hash": code_hash})
    if not code_doc or code_doc.get("status") != "active":
        raise HTTPException(status_code=401, detail="Ungültiger oder bereits verwendeter Zugangscode")

    # 2) Validation
    if not files or len(files) == 0:
        raise HTTPException(status_code=422, detail="Keine Datei übermittelt")
    if len(files) > DOC_PUBLIC_MAX_FILES:
        raise HTTPException(status_code=422, detail=f"Maximal {DOC_PUBLIC_MAX_FILES} Dateien erlaubt")

    payloads: List[Dict[str, Any]] = []
    total_bytes = 0
    for f in files:
        ct = (f.content_type or "").lower()
        if ct not in DOC_PUBLIC_ALLOWED_CT:
            raise HTTPException(status_code=415, detail=f"MIME nicht erlaubt: {ct or 'unknown'}")
        data = await f.read()
        if len(data) == 0:
            raise HTTPException(status_code=422, detail=f"Leere Datei: {f.filename}")
        if len(data) > DOC_PUBLIC_MAX_FILE_BYTES:
            raise HTTPException(status_code=413, detail=f"Datei zu groß ({f.filename}, max 10 MB)")
        total_bytes += len(data)
        if total_bytes > DOC_PUBLIC_MAX_TOTAL_BYTES:
            raise HTTPException(status_code=413, detail="Gesamtgröße überschreitet 20 MB")
        payloads.append({"data": data, "ct": ct, "orig_name": _sanitize_filename(f.filename or "upload")})

    # 3) Storage-Puts (server-authoritative Keys)
    now = datetime.now(timezone.utc)
    stored: List[Dict[str, Any]] = []
    try:
        for p in payloads:
            ext = _ext_from_content_type(p["ct"])
            path = f"{APP_PREFIX}/document-uploads/{str(code_doc['_id'])}/{uuid.uuid4().hex}.{ext}"
            result = put_object(path, p["data"], p["ct"])
            file_id = uuid.uuid4().hex
            await _db.storage_files.insert_one({
                "_id": file_id,
                "scope": "document_upload",
                "subject_id": str(code_doc["_id"]),
                "storage_path": result["path"],
                "content_type": p["ct"],
                "size": int(result.get("size") or len(p["data"])),
                "original_filename": p["orig_name"],
                "is_deleted": False,
                "uploaded_by": None,
                "created_at": now,
            })
            stored.append({
                "file_id": file_id,
                "path": result["path"],
                "original_filename": p["orig_name"],
                "size": int(result.get("size") or len(p["data"])),
                "content_type": p["ct"],
            })
    except HTTPException:
        raise
    except Exception as e:
        # Orphan-Cleanup: alle bereits gespeicherten Storage-Objekte soft-löschen
        if stored:
            await _db.storage_files.update_many(
                {"_id": {"$in": [s["file_id"] for s in stored]}},
                {"$set": {"is_deleted": True, "deleted_at": datetime.now(timezone.utc)}},
            )
        raise HTTPException(status_code=502, detail=f"Storage-Upload fehlgeschlagen: {e}")

    # 4) Submission-Doc anlegen
    try:
        sub_id = ObjectId()
        await _db.document_upload_submissions.insert_one({
            "_id": sub_id,
            "code_id": code_doc["_id"],
            "used_by_name": name,
            "message": (message or "").strip()[:2000] or None,
            "files": stored,
            "user_agent": (user_agent or "")[:500] or None,
            "status": "new",
            "admin_email_sent": False,
            "admin_email_error": None,
            "created_at": now,
        })
    except Exception as e:
        # Mongo-Fail → orphaned storage rollback
        await _db.storage_files.update_many(
            {"_id": {"$in": [s["file_id"] for s in stored]}},
            {"$set": {"is_deleted": True, "deleted_at": datetime.now(timezone.utc)}},
        )
        raise HTTPException(status_code=500, detail=f"Persistenz fehlgeschlagen: {e}")

    # 5) Code-Nutzung tracken (Legacy: Doc-Upload = einmalig verwendet)
    if is_doc_code:
        await code_coll.update_one(
            {"_id": code_doc["_id"]},
            {"$set": {"status": "used", "used_at": now, "used_by_name": name,
                      "user_agent": (user_agent or request.headers.get("user-agent") or "")[:200],
                      "ip": (request.client.host if request.client else None)}},
        )
    else:
        await code_coll.update_one(
            {"_id": code_doc["_id"]},
            {"$set": {"last_used_at": now, "updated_at": now}, "$inc": {"use_count": 1}},
        )
    await _db.formular_access_logs.insert_one({
        "code_id": code_doc["_id"],
        "used_by_name": name,
        "used_at": now,
        "user_agent": (user_agent or "")[:500] or None,
        "session_id": f"doc-upload-{sub_id}",
    })

    try:
        from server import _send_email_via_emergent
        from routes.contract_submissions import _admin_target
        import html as _html
        names = "".join(f"<li>{_html.escape(s.get('original_filename') or s.get('orig_name') or 'Datei')}</li>" for s in stored)
        await _send_email_via_emergent(
            to=_admin_target(),
            subject=f"Neuer Dokument-Upload: {name}",
            html=(f"<p>Neue Dokumente wurden über das Upload-Portal eingereicht.</p>"
                  f"<p><b>Name:</b> {_html.escape(name)}<br><b>Nachricht:</b> {_html.escape((message or '').strip() or '–')}</p>"
                  f"<p><b>Dateien ({len(stored)}):</b></p><ul>{names}</ul>"
                  f"<p>Die Dateien finden Sie im Adminbereich unter „Dokument-Uploads“.</p>"),
        )
        await _db.document_upload_submissions.update_one({"_id": sub_id}, {"$set": {"admin_email_sent": True}})
    except Exception as e:
        await _db.document_upload_submissions.update_one({"_id": sub_id}, {"$set": {"admin_email_error": str(e)[:300]}})

    return {"submission_id": str(sub_id), "files_count": len(stored)}


async def _ensure_public_indexes() -> None:
    try:
        await _db.document_upload_submissions.create_index([("created_at", -1)], name="created_desc")
        await _db.document_upload_submissions.create_index([("status", 1), ("created_at", -1)], name="status_created")
        await _db.storage_files.create_index([("scope", 1), ("created_at", -1)], name="scope_created")
    except Exception:
        pass
