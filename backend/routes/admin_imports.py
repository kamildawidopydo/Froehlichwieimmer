"""Session 93 · Phase 3 — Admin Import Endpoints (Dry-Run + Apply + Audit).

Öffentliche API bleibt read-only — Schreibwege gehen ausschließlich über
diese admin-guardete Route. Kein automatisches Web-Scraping: der Server
lädt KEINE externen URLs. Import-Payloads werden komplett vom Client
mitgeliefert und validiert.
"""
from __future__ import annotations
import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

from lib.import_pipeline import (  # noqa: E402
    MAX_RECORDS, apply_diff, build_diff, normalize_records, parse_csv,
)

# Reuse admin-guard from server.
from server import require_admin  # type: ignore  # noqa: E402

_db = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)[os.environ["DB_NAME"]]
router = APIRouter(prefix="/api/admin/imports", tags=["admin-imports"])


class ImportRecord(BaseModel):
    class Config:
        extra = "allow"  # tolerantes Modell — Validator prüft harte Regeln.


class ImportPayload(BaseModel):
    source_slug: str = Field(..., min_length=3, max_length=120)
    source_url: Optional[str] = None
    verification_method: str = Field(default="manual_review", max_length=60)
    records: Optional[List[Dict[str, Any]]] = None
    csv_text: Optional[str] = None


async def _ensure_source(source_slug: str, source_url: Optional[str]) -> None:
    doc = await _db.data_sources.find_one({"slug": source_slug})
    now = datetime.now(timezone.utc)
    if doc is None:
        await _db.data_sources.insert_one({
            "slug": source_slug,
            "name": source_slug,
            "type": "manual_verified",
            "source_url": source_url,
            "status": "active",
            "is_public_source_url": bool(source_url),
            "created_at": now,
            "updated_at": now,
        })


def _extract_records(body: ImportPayload) -> List[Dict[str, Any]]:
    if body.records is not None:
        return body.records
    if body.csv_text is not None:
        return parse_csv(body.csv_text)
    raise HTTPException(status_code=422, detail="records or csv_text required")


@router.post("/savings-offers/dry-run")
async def import_dry_run(body: ImportPayload = Body(...), _admin: dict = Depends(require_admin)) -> Dict[str, Any]:
    raw = _extract_records(body)
    if len(raw) > MAX_RECORDS:
        raise HTTPException(status_code=413, detail=f"too many records (max {MAX_RECORDS})")
    normalized = normalize_records(raw)
    diffs, counts = await build_diff(
        normalized,
        banks_collection=_db.banks,
        aliases_collection=_db.bank_aliases,
        offers_collection=_db.savings_offers,
        countries_collection=_db.countries,
        dgs_collection=_db.deposit_guarantee_schemes,
    )
    return {
        "dry_run": True,
        "records_received": len(raw),
        "counts": counts,
        "diffs": diffs,
    }


@router.post("/savings-offers/apply")
async def import_apply(body: ImportPayload = Body(...), admin: dict = Depends(require_admin)) -> Dict[str, Any]:
    raw = _extract_records(body)
    if len(raw) > MAX_RECORDS:
        raise HTTPException(status_code=413, detail=f"too many records (max {MAX_RECORDS})")
    await _ensure_source(body.source_slug, body.source_url)
    normalized = normalize_records(raw)
    started = datetime.now(timezone.utc)

    diffs, counts = await build_diff(
        normalized,
        banks_collection=_db.banks,
        aliases_collection=_db.bank_aliases,
        offers_collection=_db.savings_offers,
        countries_collection=_db.countries,
        dgs_collection=_db.deposit_guarantee_schemes,
    )
    applied = await apply_diff(
        diffs,
        source_slug=body.source_slug,
        source_url=body.source_url,
        verification_method=body.verification_method,
        applied_by=(admin.get("email") if isinstance(admin, dict) else None),
        now=started,
        offers_collection=_db.savings_offers,
        history_collection=_db.interest_rate_history,
    )
    finished = datetime.now(timezone.utc)

    run_doc = {
        "source_slug": body.source_slug,
        "started_at": started,
        "finished_at": finished,
        "status": "success" if counts.get("invalid", 0) == 0 else "partial",
        "records_received": len(raw),
        "records_valid": counts.get("create", 0) + counts.get("update", 0) + counts.get("unchanged", 0),
        "records_invalid": counts.get("invalid", 0),
        "records_changed": applied.get("created", 0) + applied.get("updated", 0),
        "records_unchanged": applied.get("unchanged", 0),
        "records_needs_review": counts.get("needs_review", 0),
        "applied_by": admin.get("email") if isinstance(admin, dict) else None,
        "created_at": datetime.now(timezone.utc),
    }
    ins = await _db.import_runs.insert_one(run_doc)
    return {
        "dry_run": False,
        "import_run_id": str(ins.inserted_id),
        "counts": counts,
        "applied": applied,
        "started_at": started.isoformat(),
        "finished_at": finished.isoformat(),
    }


@router.get("/runs")
async def list_import_runs(limit: int = 50, _admin: dict = Depends(require_admin)) -> Dict[str, Any]:
    items = []
    async for r in _db.import_runs.find({}).sort("started_at", -1).limit(min(limit, 200)):
        items.append({
            "id": str(r["_id"]),
            **{k: r.get(k) for k in (
                "source_slug", "status", "records_received", "records_valid",
                "records_invalid", "records_changed", "records_unchanged",
                "records_needs_review", "applied_by",
            )},
            "started_at": r.get("started_at").isoformat() if r.get("started_at") else None,
            "finished_at": r.get("finished_at").isoformat() if r.get("finished_at") else None,
        })
    return {"items": items, "count": len(items)}
