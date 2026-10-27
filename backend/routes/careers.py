"""Karriereplattform Essence Invest: Stellen, Bewerbungen, Recruiting-Rolle."""
from __future__ import annotations

import re
import secrets
import string
import time
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import List, Literal, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, Response, UploadFile
from pydantic import BaseModel, EmailStr, Field

from server import db, get_current_user, hash_password, require_admin
from services.customer_mails import render, send_later
from services import career_files

router = APIRouter(prefix="/api/careers", tags=["careers"])

STAFF_ROLES = {"admin", "recruiting"}
LEVELS = {"einsteiger", "quereinsteiger", "erfahren"}
AREAS = ("Finanzberatung", "Vertrieb", "Kundenbetreuung", "Personal & Recruiting", "Marketing & Kommunikation",
         "Geschäftsführung & Verwaltung", "Unternehmensentwicklung")
JOB_STATUSES = {"draft", "published", "inactive"}
APP_STATUSES = {"neu": "Neu eingegangen", "in_pruefung": "In Prüfung", "interview": "Vorstellungsgespräch",
                "zusage": "Zusage", "absage": "Absage"}
CV_TYPES = {"application/pdf"}
DOC_TYPES = {"application/pdf", "image/jpeg", "image/png"}
MAX_FILE = 10 * 1024 * 1024
MAX_EXTRA = 5
_RL: dict = defaultdict(list)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(v):
    return v.isoformat() if isinstance(v, datetime) else v


def _oid(v: str) -> ObjectId:
    if not ObjectId.is_valid(v):
        raise HTTPException(status_code=404, detail="Nicht gefunden")
    return ObjectId(v)


async def require_recruiting(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Kein Zugriff")
    return user


async def _optional_staff(request: Request) -> bool:
    try:
        user = await get_current_user(request)
    except HTTPException:
        return False
    return user.get("role") in STAFF_ROLES


async def _settings() -> dict:
    s = await db.career_settings.find_one({"_id": "careers"}) or {}
    return {
        "applications_enabled": bool(s.get("applications_enabled", False)),
        "site_public": True,
        "retention_days": int(s.get("retention_days", 180)),
        "notify_email": s.get("notify_email") or "",
    }


def _job_out(d: dict, staff: bool = False) -> dict:
    out = {
        "id": str(d["_id"]), "slug": d["slug"], "title": d["title"], "level": d.get("level"), "area": d.get("area") or "",
        "location": d.get("location") or "", "employment_type": d.get("employment_type") or "",
        "summary": d.get("summary") or "", "tasks": d.get("tasks") or [],
        "requirements": d.get("requirements") or [], "offer": d.get("offer") or [],
        "career_path": d.get("career_path") or "", "deadline": d.get("deadline"),
        "status": d.get("status"), "published_at": _iso(d.get("published_at")),
    }
    if staff:
        out.update(created_at=_iso(d.get("created_at")), updated_at=_iso(d.get("updated_at")))
    return out


def _deadline_passed(job: dict) -> bool:
    dl = job.get("deadline")
    return bool(dl) and dl < _now().date().isoformat()


# ─── Public ─────────────────────────────────────────────────────────────
@router.get("/status")
async def public_status(request: Request):
    s = await _settings()
    try:
        await _maybe_auto_retention()
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("career auto retention failed: %s", exc)
    return {"site_public": s["site_public"], "applications_enabled": s["applications_enabled"],
            "is_staff": await _optional_staff(request)}


@router.get("/jobs")
async def public_jobs(request: Request, q: str = "", location: str = "", employment_type: str = "",
                      level: str = "", area: str = "", sort: Literal["newest", "title"] = "newest", preview: bool = False):
    s = await _settings()
    staff = await _optional_staff(request)
    if not s["site_public"] and not staff:
        return {"items": [], "locations": [], "employment_types": [], "areas": []}
    filt: dict = {"status": "published"}
    if preview and staff:
        filt = {"status": {"$in": ["published", "draft"]}}
    base = dict(filt)
    if q.strip():
        rx = {"$regex": re.escape(q.strip()[:80]), "$options": "i"}
        filt["$or"] = [{"title": rx}, {"summary": rx}, {"tasks": rx}]
    if location:
        filt["location"] = location[:80]
    if employment_type:
        filt["employment_type"] = employment_type[:80]
    if level in LEVELS:
        filt["level"] = level
    if area in AREAS:
        filt["area"] = area
    order = [("title", 1)] if sort == "title" else [("published_at", -1), ("created_at", -1)]
    items = [_job_out(d) async for d in db.career_jobs.find(filt).sort(order).limit(200)]
    locs = sorted({x for x in await db.career_jobs.distinct("location", base) if x})
    types = sorted({x for x in await db.career_jobs.distinct("employment_type", base) if x})
    areas = sorted({x for x in await db.career_jobs.distinct("area", base) if x})
    return {"items": items, "locations": locs, "employment_types": types, "areas": areas}


@router.get("/jobs/{slug}")
async def public_job(slug: str, request: Request, preview: bool = False):
    s = await _settings()
    staff = await _optional_staff(request)
    job = await db.career_jobs.find_one({"slug": slug[:120]})
    visible = job and (job["status"] == "published" and (s["site_public"] or staff)
                       or (preview and staff and job["status"] == "draft"))
    if not visible:
        raise HTTPException(status_code=404, detail="Stelle nicht gefunden")
    return _job_out(job)


def _check_rl(request: Request) -> None:
    from routes.formular_access import _client_ip
    ip = _client_ip(request)
    now = time.time()
    hist = [t for t in _RL[ip] if t > now - 600]
    if len(hist) >= 3:
        raise HTTPException(status_code=429, detail="Zu viele Bewerbungen in kurzer Zeit. Bitte später erneut versuchen.")
    _RL[ip] = hist + [now]
    if len(_RL) > 2000:
        _RL.clear()


async def _read_file(f: UploadFile, allowed: set, label: str) -> dict:
    ct = (f.content_type or "").lower().replace("image/jpg", "image/jpeg")
    if ct not in allowed:
        raise HTTPException(status_code=415, detail=f"{label}: Dateityp nicht erlaubt")
    data = await f.read()
    if not data:
        raise HTTPException(status_code=422, detail=f"{label}: Datei ist leer")
    if len(data) > MAX_FILE:
        raise HTTPException(status_code=413, detail=f"{label}: Datei zu groß (max. 10 MB)")
    if ct == "application/pdf" and not data.startswith(b"%PDF"):
        raise HTTPException(status_code=415, detail=f"{label}: Ungültige PDF-Datei")
    name = re.sub(r"[^\w \-.()]+", "_", (f.filename or "dokument").strip())[:150]
    return {"data": data, "ct": ct, "name": name}


@router.post("/applications", status_code=201)
async def submit_application(
    request: Request,
    first_name: str = Form(..., min_length=1, max_length=80),
    last_name: str = Form(..., min_length=1, max_length=80),
    email: EmailStr = Form(...),
    phone: str = Form(..., min_length=5, max_length=40),
    position: str = Form(..., min_length=2, max_length=160),
    job_id: str = Form(default=""),
    experience: str = Form(default="", max_length=80),
    start_date: str = Form(default="", max_length=40),
    message: str = Form(default="", max_length=4000),
    privacy_consent: bool = Form(...),
    website: str = Form(default=""),
    form_started_at: int = Form(..., gt=0),
    cv: Optional[UploadFile] = File(default=None),
    attachments: List[UploadFile] = File(default=[]),
):
    s = await _settings()
    if not s["applications_enabled"] or not s["site_public"] and not await _optional_staff(request):
        raise HTTPException(status_code=403, detail="Online-Bewerbungen sind derzeit noch nicht freigeschaltet.")
    if website or time.time() * 1000 - form_started_at < 3000:
        raise HTTPException(status_code=422, detail="Bewerbung konnte nicht verarbeitet werden.")
    if not privacy_consent:
        raise HTTPException(status_code=422, detail="Bitte bestätigen Sie die Datenschutzhinweise.")
    if not re.fullmatch(r"[0-9+()/\- ]{5,40}", phone.strip()):
        raise HTTPException(status_code=422, detail="Bitte eine gültige Telefonnummer angeben.")
    _check_rl(request)

    job = None
    if job_id:
        job = await db.career_jobs.find_one({"_id": _oid(job_id), "status": "published"})
        if not job:
            raise HTTPException(status_code=404, detail="Diese Stelle ist nicht mehr verfügbar.")
        if _deadline_passed(job):
            raise HTTPException(status_code=422, detail="Die Bewerbungsfrist für diese Stelle ist abgelaufen.")

    files = []
    if cv is not None and cv.filename:
        files.append({**await _read_file(cv, CV_TYPES, "Lebenslauf"), "kind": "cv"})
    extra = [a for a in attachments if a.filename]
    if len(extra) > MAX_EXTRA:
        raise HTTPException(status_code=422, detail=f"Maximal {MAX_EXTRA} weitere Dokumente erlaubt.")
    for a in extra:
        files.append({**await _read_file(a, DOC_TYPES, a.filename or "Dokument"), "kind": "attachment"})

    app_id = ObjectId()
    stored = []
    try:
        for f in files:
            fid = uuid.uuid4().hex
            await career_files.store(db, fid, str(app_id), f["data"], f["ct"], f["name"])
            stored.append({"file_id": fid, "name": f["name"], "kind": f["kind"], "size": len(f["data"]), "content_type": f["ct"]})
    except Exception:
        await career_files.purge_application(db, str(app_id))
        raise HTTPException(status_code=502, detail="Unterlagen konnten nicht gespeichert werden. Bitte versuche es erneut.")

    doc = {
        "_id": app_id, "first_name": first_name.strip(), "last_name": last_name.strip(),
        "email": str(email).lower(), "phone": phone.strip(), "position": position.strip(),
        "job_id": str(job["_id"]) if job else None, "job_title": job["title"] if job else None,
        "is_initiative": job is None, "experience": experience.strip(), "start_date": start_date.strip(),
        "message": message.strip(), "files": stored, "status": "neu", "notes": [],
        "privacy_consent_at": _now(), "created_at": _now(), "updated_at": _now(),
    }
    await db.career_portal_applications.insert_one(doc)

    pos = doc["job_title"] or f"Initiativbewerbung · {doc['position']}"
    send_later(doc["email"], "Ihre Bewerbung bei der Fröhlich Vermögensberatung GmbH", render(
        "Vielen Dank für Ihre Bewerbung",
        f"Guten Tag {doc['first_name']} {doc['last_name']}, wir haben Ihre Unterlagen erhalten und melden uns schnellstmöglich bei Ihnen.",
        [("Position", pos), ("Eingegangen am", _now().strftime("%d.%m.%Y")), ("Dokumente", str(len(stored)))],
        "Zur Karriereseite", "/karriere",
        steps=["Wir sichten Ihre Unterlagen sorgfältig.", "Bei passender Qualifikation melden wir uns für ein Kennenlernen."],
        brand="Fröhlich Vermögensberatung GmbH · Karriere", salutation="Ihr Recruiting-Team der Fröhlich Vermögensberatung GmbH"))
    from routes.contract_submissions import _admin_target
    send_later(s["notify_email"] or _admin_target(), f"Neue Bewerbung: {pos}", render(
        "Neue Bewerbung eingegangen",
        "Über die Karriereseite ist eine neue Bewerbung eingegangen.",
        [("Position", pos), ("Name", f"{doc['first_name']} {doc['last_name']}"), ("Dokumente", str(len(stored)))],
        "Bewerbung ansehen", f"/recruiting/bewerbungen/{app_id}",
        brand="Fröhlich Vermögensberatung GmbH · Recruiting", salutation="Ihre Karriereplattform"))
    return {"id": str(app_id), "status": "neu"}


# ─── Recruiting: Stellen ───────────────────────────────────────────────
class JobIn(BaseModel):
    title: str = Field(..., min_length=3, max_length=160)
    level: Literal["einsteiger", "quereinsteiger", "erfahren"]
    area: Literal[AREAS + ("",)] = ""
    location: str = Field(default="", max_length=80)
    employment_type: str = Field(default="", max_length=80)
    summary: str = Field(default="", max_length=600)
    tasks: List[str] = Field(default_factory=list, max_length=20)
    requirements: List[str] = Field(default_factory=list, max_length=20)
    offer: List[str] = Field(default_factory=list, max_length=20)
    career_path: str = Field(default="", max_length=2000)
    deadline: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    model_config = {"extra": "forbid"}


def _slugify(t: str) -> str:
    t = t.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        t = t.replace(a, b)
    t = re.sub(r"\(m/w/d\)", "", t)
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")[:90] or "stelle"


def _clean_list(v: List[str]) -> List[str]:
    return [x.strip()[:400] for x in v if x and x.strip()]


@router.get("/admin/jobs")
async def admin_jobs(_u: dict = Depends(require_recruiting)):
    counts = {r["_id"]: r["n"] async for r in db.career_portal_applications.aggregate(
        [{"$group": {"_id": "$job_id", "n": {"$sum": 1}}}])}
    items = []
    async for d in db.career_jobs.find({}).sort("created_at", 1):
        items.append({**_job_out(d, staff=True), "applications": counts.get(str(d["_id"]), 0)})
    return {"items": items}


@router.post("/admin/jobs", status_code=201)
async def admin_create_job(body: JobIn, _u: dict = Depends(require_recruiting)):
    slug = _slugify(body.title)
    if await db.career_jobs.find_one({"slug": slug}):
        slug = f"{slug}-{uuid.uuid4().hex[:5]}"
    doc = {**body.model_dump(), "tasks": _clean_list(body.tasks), "requirements": _clean_list(body.requirements),
           "offer": _clean_list(body.offer), "slug": slug, "status": "draft", "published_at": None,
           "created_at": _now(), "updated_at": _now()}
    res = await db.career_jobs.insert_one(doc)
    doc["_id"] = res.inserted_id
    return _job_out(doc, staff=True)


@router.put("/admin/jobs/{job_id}")
async def admin_update_job(job_id: str, body: JobIn, _u: dict = Depends(require_recruiting)):
    upd = {**body.model_dump(), "tasks": _clean_list(body.tasks), "requirements": _clean_list(body.requirements),
           "offer": _clean_list(body.offer), "updated_at": _now(), "is_seed_draft": False}
    d = await db.career_jobs.find_one_and_update({"_id": _oid(job_id)}, {"$set": upd}, return_document=True)
    if not d:
        raise HTTPException(status_code=404, detail="Stelle nicht gefunden")
    return _job_out(d, staff=True)


class JobStatusIn(BaseModel):
    status: Literal["draft", "published", "inactive"]


@router.post("/admin/jobs/{job_id}/status")
async def admin_job_status(job_id: str, body: JobStatusIn, _u: dict = Depends(require_recruiting)):
    job = await db.career_jobs.find_one({"_id": _oid(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Stelle nicht gefunden")
    upd = {"status": body.status, "updated_at": _now()}
    if body.status == "published":
        if not job.get("location") or not job.get("employment_type"):
            raise HTTPException(status_code=422, detail="Vor dem Veröffentlichen bitte Standort und Beschäftigungsart eintragen.")
        if not job.get("published_at"):
            upd["published_at"] = _now()
    d = await db.career_jobs.find_one_and_update({"_id": job["_id"]}, {"$set": upd}, return_document=True)
    return _job_out(d, staff=True)


@router.delete("/admin/jobs/{job_id}")
async def admin_delete_job(job_id: str, _u: dict = Depends(require_recruiting)):
    res = await db.career_jobs.delete_one({"_id": _oid(job_id)})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Stelle nicht gefunden")
    return {"deleted": True}


# ─── Recruiting: Bewerbungen ───────────────────────────────────────────
def _app_out(d: dict, full: bool = False) -> dict:
    out = {
        "id": str(d["_id"]), "first_name": d["first_name"], "last_name": d["last_name"], "email": d["email"],
        "phone": d.get("phone"), "position": d.get("position"), "job_id": d.get("job_id"),
        "job_title": d.get("job_title"), "is_initiative": d.get("is_initiative", False),
        "status": d.get("status"), "created_at": _iso(d.get("created_at")), "files_count": len(d.get("files") or []),
    }
    if full:
        out.update(experience=d.get("experience"), start_date=d.get("start_date"), message=d.get("message"),
                   files=d.get("files") or [], updated_at=_iso(d.get("updated_at")),
                   notes=[{**n, "at": _iso(n.get("at"))} for n in d.get("notes") or []])
    return out


@router.get("/admin/applications")
async def admin_applications(job_id: str = "", status: str = "", q: str = "",
                             _u: dict = Depends(require_recruiting)):
    filt: dict = {}
    if job_id == "initiative":
        filt["is_initiative"] = True
    elif job_id:
        filt["job_id"] = job_id[:30]
    if status in APP_STATUSES:
        filt["status"] = status
    if q.strip():
        rx = {"$regex": re.escape(q.strip()[:80]), "$options": "i"}
        filt["$or"] = [{"first_name": rx}, {"last_name": rx}, {"email": rx}, {"position": rx}]
    items = [_app_out(d) async for d in db.career_portal_applications.find(filt).sort("created_at", -1).limit(500)]
    return {"items": items}


@router.get("/admin/applications/{app_id}")
async def admin_application(app_id: str, _u: dict = Depends(require_recruiting)):
    d = await db.career_portal_applications.find_one({"_id": _oid(app_id)})
    if not d:
        raise HTTPException(status_code=404, detail="Bewerbung nicht gefunden")
    return _app_out(d, full=True)


class AppPatch(BaseModel):
    status: Optional[Literal["neu", "in_pruefung", "interview", "zusage", "absage"]] = None
    note: Optional[str] = Field(default=None, max_length=2000)
    model_config = {"extra": "forbid"}


@router.patch("/admin/applications/{app_id}")
async def admin_patch_application(app_id: str, body: AppPatch, u: dict = Depends(require_recruiting)):
    d = await db.career_portal_applications.find_one({"_id": _oid(app_id)})
    if not d:
        raise HTTPException(status_code=404, detail="Bewerbung nicht gefunden")
    author = u.get("name") or u.get("email")
    notes = []
    upd: dict = {"updated_at": _now()}
    if body.status and body.status != d.get("status"):
        upd["status"] = body.status
        notes.append({"text": f"Status geändert: {APP_STATUSES[d.get('status', 'neu')]} → {APP_STATUSES[body.status]}",
                      "author": author, "at": _now(), "system": True})
    if body.note and body.note.strip():
        notes.append({"text": body.note.strip(), "author": author, "at": _now(), "system": False})
    ops: dict = {"$set": upd}
    if notes:
        ops["$push"] = {"notes": {"$each": notes}}
    d = await db.career_portal_applications.find_one_and_update({"_id": d["_id"]}, ops, return_document=True)
    return _app_out(d, full=True)


async def _delete_applications(filt: dict, reason: str, by: Optional[str]) -> int:
    ids = [str(d["_id"]) async for d in db.career_portal_applications.find(filt, {"_id": 1})]
    for i in ids:
        n_files = await career_files.purge_application(db, i)
        await db.career_portal_applications.delete_one({"_id": ObjectId(i)})
        await db.career_deletion_log.insert_one(
            {"application_id": i, "deleted_at": _now(), "reason": reason, "by": by, "files_deleted": n_files})
    return len(ids)


async def reapply_deletion_log() -> int:
    """Nach einer Wiederherstellung aus einer Sicherung: bereits gelöschte Bewerbungen erneut entfernen."""
    n = 0
    async for log in db.career_deletion_log.find({}, {"application_id": 1}):
        aid = log["application_id"]
        if await db.career_portal_applications.find_one({"_id": ObjectId(aid)}, {"_id": 1}) or \
                await db.career_file_keys.find_one({"application_id": aid}, {"_id": 1}):
            await career_files.purge_application(db, aid)
            await db.career_portal_applications.delete_one({"_id": ObjectId(aid)})
            n += 1
    return n


def _expired_filter(days: int) -> dict:
    return {"updated_at": {"$lt": _now() - timedelta(days=days)}}


_AUTO_RET = {"at": 0.0}


async def _maybe_auto_retention() -> None:
    if time.time() - _AUTO_RET["at"] < 6 * 3600:
        return
    _AUTO_RET["at"] = time.time()
    s = await _settings()
    await _delete_applications(_expired_filter(s["retention_days"]), "automatische Frist", None)


@router.delete("/admin/applications/{app_id}")
async def admin_delete_application(app_id: str, u: dict = Depends(require_recruiting)):
    n = await _delete_applications({"_id": _oid(app_id)}, "manuell", u.get("email"))
    if not n:
        raise HTTPException(status_code=404, detail="Bewerbung nicht gefunden")
    return {"deleted": True}


@router.get("/admin/files/{file_id}")
async def admin_file(file_id: str, _u: dict = Depends(require_recruiting)):
    app = await db.career_portal_applications.find_one({"files.file_id": file_id[:40]}, {"files": 1})
    meta = next((f for f in (app or {}).get("files", []) if f["file_id"] == file_id), None)
    if not meta:
        raise HTTPException(status_code=404, detail="Datei nicht gefunden")
    try:
        data, ct = await career_files.load(db, file_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Datei nicht gefunden")
    name = meta.get("name") or "dokument"
    from urllib.parse import quote
    ascii_name = name.encode("ascii", "ignore").decode() or "dokument"
    return Response(content=data, media_type=ct,
                    headers={"Content-Disposition": f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{quote(name)}",
                             "Cache-Control": "no-store"})


@router.get("/admin/stats")
async def admin_stats(_u: dict = Depends(require_recruiting)):
    jobs = {r["_id"]: r["n"] async for r in db.career_jobs.aggregate([{"$group": {"_id": "$status", "n": {"$sum": 1}}}])}
    by_status = {r["_id"]: r["n"] async for r in db.career_portal_applications.aggregate(
        [{"$group": {"_id": "$status", "n": {"$sum": 1}}}])}
    per_job = [{"job": r["_id"] or "Initiativbewerbung", "count": r["n"]} async for r in db.career_portal_applications.aggregate(
        [{"$group": {"_id": "$job_title", "n": {"$sum": 1}}}, {"$sort": {"n": -1}}])]
    return {
        "active_jobs": jobs.get("published", 0), "draft_jobs": jobs.get("draft", 0),
        "inactive_jobs": jobs.get("inactive", 0), "total_applications": sum(by_status.values()),
        "by_status": [{"status": k, "label": v, "count": by_status.get(k, 0)} for k, v in APP_STATUSES.items()],
        "per_job": per_job,
    }


# ─── Einstellungen & Aufbewahrung ──────────────────────────────────────
class SettingsIn(BaseModel):
    applications_enabled: bool
    site_public: bool
    retention_days: int = Field(..., ge=30, le=3650)
    notify_email: Optional[EmailStr] = None
    model_config = {"extra": "forbid"}


@router.get("/admin/settings")
async def admin_get_settings(_u: dict = Depends(require_recruiting)):
    s = await _settings()
    s["expired_count"] = await db.career_portal_applications.count_documents(_expired_filter(s["retention_days"]))
    s["deletion_log"] = [{"deleted_at": _iso(d["deleted_at"]), "reason": d["reason"], "by": d.get("by"), "files_deleted": d.get("files_deleted", 0)}
                         async for d in db.career_deletion_log.find({}).sort("deleted_at", -1).limit(20)]
    return s


@router.put("/admin/settings")
async def admin_put_settings(body: SettingsIn, u: dict = Depends(require_recruiting)):
    data = {**body.model_dump(), "notify_email": str(body.notify_email) if body.notify_email else "",
            "updated_at": _now(), "updated_by": u.get("email")}
    await db.career_settings.update_one({"_id": "careers"}, {"$set": data}, upsert=True)
    return await admin_get_settings(u)


@router.post("/admin/retention/run")
async def admin_run_retention(u: dict = Depends(require_recruiting)):
    s = await _settings()
    n = await _delete_applications(_expired_filter(s["retention_days"]), "Frist (manuell ausgelöst)", u.get("email"))
    return {"deleted": n}


# ─── Team (nur Admin) ──────────────────────────────────────────────────
class TeamIn(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)
    model_config = {"extra": "forbid"}


@router.get("/admin/team")
async def admin_team(_a: dict = Depends(require_admin)):
    items = [{"id": str(d["_id"]), "email": d["email"], "name": d.get("name"), "created_at": _iso(d.get("created_at"))}
             async for d in db.users.find({"role": "recruiting"}, {"email": 1, "name": 1, "created_at": 1})]
    return {"items": items}


@router.post("/admin/team", status_code=201)
async def admin_team_create(body: TeamIn, _a: dict = Depends(require_admin)):
    email = str(body.email).lower()
    if await db.users.find_one({"email": email}, {"_id": 1}):
        raise HTTPException(status_code=409, detail="E-Mail bereits vergeben")
    pw = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(16))
    res = await db.users.insert_one({
        "email": email, "name": body.name.strip(), "role": "recruiting", "password_hash": hash_password(pw),
        "must_change_password": True, "onboarding_completed": True, "created_at": _now(), "updated_at": _now()})
    return {"id": str(res.inserted_id), "email": email, "temporary_password": pw}


@router.delete("/admin/team/{user_id}")
async def admin_team_delete(user_id: str, _a: dict = Depends(require_admin)):
    res = await db.users.delete_one({"_id": _oid(user_id), "role": "recruiting"})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Recruiting-Konto nicht gefunden")
    return {"deleted": True}


async def seed_career_jobs() -> None:
    from routes.careers_seed import CONTENT_FIELDS, SEED_JOBS, SEED_VERSION
    await reapply_deletion_log()
    await db.career_jobs.create_index("slug", unique=True)
    await db.career_portal_applications.create_index([("created_at", -1)])
    for j in SEED_JOBS:
        await db.career_jobs.update_one(
            {"slug": j["slug"]},
            {"$setOnInsert": {**j, "status": "draft", "published_at": None, "is_seed_draft": True,
                              "seed_version": SEED_VERSION, "created_at": _now(), "updated_at": _now()}},
            upsert=True)
        await db.career_jobs.update_one(
            {"slug": j["slug"], "is_seed_draft": True, "status": "draft", "seed_version": {"$ne": SEED_VERSION}},
            {"$set": {**{k: j[k] for k in CONTENT_FIELDS}, "seed_version": SEED_VERSION, "updated_at": _now()}})
