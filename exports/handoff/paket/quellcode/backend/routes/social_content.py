"""Admin-Routen für Social Content Automation (Session 80.0)."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from server import db, require_admin
from social_content import (
    COLLECTION,
    PLATFORM,
    build_dry_run_result,
    generate_draft_for_article,
    run_generation_cron,
    run_publisher_cron,
    serialize,
    try_publish,
)
from providers.social import linkedin as _linkedin

router = APIRouter(prefix="/api", tags=["social-content"])


class DraftEdit(BaseModel):
    draft_text: str = Field(..., min_length=40, max_length=3000)


class DraftSchedule(BaseModel):
    scheduled_at: datetime


def _oid(item_id: str) -> ObjectId:
    try:
        return ObjectId(item_id)
    except Exception:  # noqa: BLE001
        raise HTTPException(400, detail="invalid_id")


@router.get("/admin/social-content", summary="Admin: Editorial Queue")
async def _list(
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    _u: dict = Depends(require_admin),
):
    q: dict = {"platform": PLATFORM}
    if status:
        q["status"] = status
    total = await db[COLLECTION].count_documents(q)
    cursor = db[COLLECTION].find(q).sort([("created_at", -1)]).skip(skip).limit(limit)
    items = [serialize(d) async for d in cursor]
    return {"items": items, "total": total, "count": len(items)}


@router.get("/admin/social-content/{item_id}", summary="Admin: Detail")
async def _detail(item_id: str, _u: dict = Depends(require_admin)):
    d = await db[COLLECTION].find_one({"_id": _oid(item_id)})
    if not d:
        raise HTTPException(404)
    return serialize(d)


@router.post("/admin/social-content/generate", summary="Admin: Cron-Generation manuell auslösen")
async def _generate(limit: int = Query(5, ge=1, le=20), _u: dict = Depends(require_admin)):
    return await run_generation_cron(db, limit=limit)


@router.post("/admin/social-content/{item_id}/regenerate", summary="Admin: Draft für ein Item regenerieren")
async def _regenerate(item_id: str, _u: dict = Depends(require_admin)):
    d = await db[COLLECTION].find_one({"_id": _oid(item_id)})
    if not d:
        raise HTTPException(404)
    if d.get("status") in ("approved", "scheduled"):
        raise HTTPException(409, detail="already_approved — reject first to regenerate")
    article = await db.news_articles.find_one({"slug": d["article_slug"]})
    if not article:
        raise HTTPException(404, detail="source article not found in live collection")
    # Force by clearing existing entry so generate treats it as fresh.
    await db[COLLECTION].delete_one({"_id": d["_id"]})
    r = await generate_draft_for_article(db, article, trigger="admin_regenerate")
    return r


@router.patch("/admin/social-content/{item_id}", summary="Admin: Draft bearbeiten")
async def _edit(item_id: str, payload: DraftEdit, _u: dict = Depends(require_admin)):
    d = await db[COLLECTION].find_one({"_id": _oid(item_id)})
    if not d:
        raise HTTPException(404)
    now = datetime.now(timezone.utc)
    await db[COLLECTION].update_one(
        {"_id": d["_id"]},
        {"$set": {"draft_text": payload.draft_text, "updated_at": now}},
    )
    return serialize(await db[COLLECTION].find_one({"_id": d["_id"]}))


@router.post("/admin/social-content/{item_id}/approve", summary="Admin: Draft freigeben")
async def _approve(item_id: str, user: dict = Depends(require_admin)):
    d = await db[COLLECTION].find_one({"_id": _oid(item_id)})
    if not d:
        raise HTTPException(404)
    if d.get("status") not in ("draft", "rejected"):
        raise HTTPException(409, detail=f"cannot approve from status={d.get('status')}")
    now = datetime.now(timezone.utc)
    await db[COLLECTION].update_one(
        {"_id": d["_id"]},
        {"$set": {"status": "approved", "approved_at": now,
                  "approved_by": (user or {}).get("email"), "updated_at": now}},
    )
    return serialize(await db[COLLECTION].find_one({"_id": d["_id"]}))


@router.post("/admin/social-content/{item_id}/reject", summary="Admin: Draft ablehnen")
async def _reject(item_id: str, _u: dict = Depends(require_admin)):
    d = await db[COLLECTION].find_one({"_id": _oid(item_id)})
    if not d:
        raise HTTPException(404)
    now = datetime.now(timezone.utc)
    await db[COLLECTION].update_one(
        {"_id": d["_id"]},
        {"$set": {"status": "rejected", "updated_at": now, "scheduled_at": None}},
    )
    return serialize(await db[COLLECTION].find_one({"_id": d["_id"]}))


@router.post("/admin/social-content/{item_id}/schedule", summary="Admin: Termin setzen (approved only)")
async def _schedule(item_id: str, payload: DraftSchedule, _u: dict = Depends(require_admin)):
    d = await db[COLLECTION].find_one({"_id": _oid(item_id)})
    if not d:
        raise HTTPException(404)
    if d.get("status") not in ("approved", "scheduled"):
        raise HTTPException(409, detail=f"cannot schedule from status={d.get('status')}")
    when = payload.scheduled_at
    if when.tzinfo is None:
        when = when.replace(tzinfo=timezone.utc)
    if when <= datetime.now(timezone.utc):
        raise HTTPException(400, detail="scheduled_at must be in the future")
    await db[COLLECTION].update_one(
        {"_id": d["_id"]},
        {"$set": {"status": "scheduled", "scheduled_at": when,
                  "updated_at": datetime.now(timezone.utc)}},
    )
    return serialize(await db[COLLECTION].find_one({"_id": d["_id"]}))


# ---------------------------------------------------------------------------
# Session 80.1 — LinkedIn Publisher
# ---------------------------------------------------------------------------

@router.get("/admin/social-content/provider/status", summary="Admin: LinkedIn Provider-Konfig + Live-Permission-Probe")
async def _provider_status(probe: bool = Query(False, description="Führt eine read-only Permission-Probe gegen LinkedIn durch."),
                            _u: dict = Depends(require_admin)):
    cfg = _linkedin.public_config_summary()
    if not probe:
        return {"config": cfg, "probe": None}
    live = await _linkedin.validate_credentials()
    return {"config": cfg, "probe": live}


@router.post("/admin/social-content/{item_id}/publish", summary="Admin: manueller Publish oder Dry-Run")
async def _publish(item_id: str, dry_run: bool = Query(True, description="Default TRUE — kein externer POST."),
                    _u: dict = Depends(require_admin)):
    d = await db[COLLECTION].find_one({"_id": _oid(item_id)})
    if not d:
        raise HTTPException(404)
    if dry_run:
        return {"dry_run": True, **await build_dry_run_result(db, d)}
    # Realer Publish nur, wenn Dry-Run OK wäre — Guardrail.
    dry = await build_dry_run_result(db, d)
    if not dry["ok"]:
        raise HTTPException(409, detail={"reason": "dry_run_would_fail", "issues": dry["issues"]})
    return await try_publish(db, d["_id"], trigger="admin_manual")


@router.post("/admin/social-content/publisher/run", summary="Admin: Publisher-Cron manuell auslösen")
async def _run_publisher(limit: int = Query(3, ge=1, le=10), _u: dict = Depends(require_admin)):
    return await run_publisher_cron(db, limit=limit)
