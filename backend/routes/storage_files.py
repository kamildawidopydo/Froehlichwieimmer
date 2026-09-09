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
from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, Path, Query, Response, UploadFile
from motor.motor_asyncio import AsyncIOMotorClient

from server import get_current_user, require_admin  # type: ignore  # noqa: E402
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
