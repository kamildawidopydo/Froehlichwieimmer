"""Session 93 · Phase 5 — Review-Workflow, Audit, Publish, Trust-Levels.

Bietet den Admin-seitigen Review-Prozess für alle Änderungen, die nicht
automatisch als vertrauenswürdig markiert werden.

Kern-Konzepte:
    * `data_sources.trust_level` ∈ {manual, review_required, trusted}
      → Default für Phase 5 ist "review_required".
    * `review_items` — offene Aufgaben mit before/after-Snapshot, Grund, Aktion.
    * `audit_log` — jede Admin-Aktion inkl. Diff & User.
    * Quality-Rules erzeugen automatische Review-Flags (Zinssprung > Schwelle,
      DGS-/Country-/Produkttyp-Wechsel).

Öffentliche API bleibt unverändert (weiter read-only).
"""
from __future__ import annotations
import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from bson import ObjectId
from fastapi import APIRouter, Body, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

from server import require_admin  # type: ignore  # noqa: E402

_db = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)[os.environ["DB_NAME"]]
admin_router = APIRouter(prefix="/api/admin/savings", tags=["admin-savings"])


# ---------------------------------------------------------------------------
# Config: quality thresholds & demo mode
# ---------------------------------------------------------------------------
RATE_DELTA_REVIEW_THRESHOLD_PP = float(os.environ.get("SAVINGS_RATE_DELTA_REVIEW_PP", "0.75"))
MAX_DEPOSIT_DELTA_FACTOR = float(os.environ.get("SAVINGS_MAX_DEPOSIT_DELTA_FACTOR", "3.0"))
DEMO_MODE_ENABLED = os.environ.get("DEMO_MODE_ENABLED", "true").lower() in ("1", "true", "yes")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _now() -> datetime:
    return datetime.now(timezone.utc)


async def audit(entity_type: str, entity_id: str, action: str,
                before: Optional[dict], after: Optional[dict], user: Optional[dict]) -> None:
    """Schreibt einen Audit-Log-Eintrag (keine sensitiven Rohdaten dupliziert)."""
    def _shrink(d):
        if not d:
            return d
        # Nur die konditionsrelevanten Felder loggen.
        keys = {
            "slug", "name", "product_type", "product_name", "term_months",
            "interest_rate", "interest_rate_type", "promo_rate", "promo_duration_months",
            "standard_rate_after_promo", "min_amount", "max_amount", "currency",
            "country", "country_code", "deposit_guarantee_country", "status",
            "is_active", "is_demo", "verified_at", "data_source", "source_id",
        }
        return {k: v for k, v in d.items() if k in keys}

    await _db.audit_log.insert_one({
        "entity_type": entity_type,
        "entity_id": str(entity_id),
        "action": action,
        "before": _shrink(before),
        "after": _shrink(after),
        "changed_at": _now(),
        "changed_by": (user or {}).get("email"),
    })


def _validate_public_url(url: str) -> None:
    if not url:
        raise HTTPException(status_code=422, detail="url required")
    p = urlparse(url)
    if p.scheme not in {"http", "https"}:
        raise HTTPException(status_code=422, detail=f"scheme not allowed: {p.scheme}")
    if not p.netloc:
        raise HTTPException(status_code=422, detail="url must have host")


def _sanitize_csv_cell(value: Any) -> Any:
    """Guard gegen CSV-Injection: Zellen, die mit =, +, -, @ beginnen, escapen."""
    if isinstance(value, str) and value and value[0] in ("=", "+", "-", "@"):
        return "'" + value
    return value


# ---------------------------------------------------------------------------
# Quality-Rule Engine
# ---------------------------------------------------------------------------
def evaluate_change_flags(before: dict, after: dict) -> List[str]:
    """Liefert Liste von Review-Gründen, wenn Änderungen kritische Regeln treffen."""
    reasons: List[str] = []

    # Rate change
    b = before.get("interest_rate")
    a = after.get("interest_rate")
    if isinstance(b, (int, float)) and isinstance(a, (int, float)):
        if abs(a - b) >= RATE_DELTA_REVIEW_THRESHOLD_PP:
            reasons.append(f"rate_change_gt_{RATE_DELTA_REVIEW_THRESHOLD_PP}pp")

    # Max deposit large delta
    mb = before.get("max_amount")
    ma = after.get("max_amount")
    if isinstance(mb, (int, float)) and isinstance(ma, (int, float)) and mb > 0:
        factor = max(ma, mb) / min(ma, mb) if min(ma, mb) > 0 else 0
        if factor >= MAX_DEPOSIT_DELTA_FACTOR:
            reasons.append("max_deposit_large_delta")

    # DGS change
    if before.get("deposit_guarantee_country") and before.get("deposit_guarantee_country") != after.get("deposit_guarantee_country"):
        reasons.append("dgs_country_changed")

    # Country change
    if before.get("country") and before.get("country") != after.get("country"):
        reasons.append("country_changed")

    # Product type change
    if before.get("product_type") and before.get("product_type") != after.get("product_type"):
        reasons.append("product_type_changed")

    return reasons


# ---------------------------------------------------------------------------
# Pydantic payloads
# ---------------------------------------------------------------------------
class ReviewAction(BaseModel):
    action: str = Field(..., pattern=r"^(approve|reject|edit_and_approve)$")
    edits: Optional[Dict[str, Any]] = None
    note: Optional[str] = None


class DemoReplacePayload(BaseModel):
    demo_offer_id: str
    real_record: Dict[str, Any]
    source_slug: str
    source_url: Optional[str] = None
    verification_method: str = Field(default="manual_review")


class DataSourceUpsert(BaseModel):
    slug: str
    name: str
    type: str = Field(..., pattern=r"^(official_bank|official_document|partner_feed|manual_verified|api|import|demo_seed)$")
    provider: Optional[str] = None
    source_url: Optional[str] = None
    trust_level: str = Field(default="review_required", pattern=r"^(manual|review_required|trusted)$")
    country_code: Optional[str] = None


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
@admin_router.get("/dashboard")
async def admin_dashboard(_admin: dict = Depends(require_admin)) -> Dict[str, Any]:
    now = _now()
    banks_active = await _db.banks.count_documents({"is_active": {"$ne": False}})
    offers_total = await _db.savings_offers.count_documents({"is_active": {"$ne": False}})
    offers_demo = await _db.savings_offers.count_documents({"is_demo": True})
    offers_real = offers_total - offers_demo
    review_open = await _db.review_items.count_documents({"status": "open"})
    from lib.data_freshness import FRESH_MAX_DAYS, STALE_MAX_DAYS  # noqa
    from datetime import timedelta
    fresh_cutoff = now - timedelta(days=FRESH_MAX_DAYS)
    stale_cutoff = now - timedelta(days=STALE_MAX_DAYS)
    fresh = await _db.savings_offers.count_documents({"is_demo": {"$ne": True}, "verified_at": {"$gte": fresh_cutoff}})
    stale = await _db.savings_offers.count_documents({"is_demo": {"$ne": True}, "verified_at": {"$lt": fresh_cutoff, "$gte": stale_cutoff}})
    expired = await _db.savings_offers.count_documents({"valid_until": {"$lt": now}, "is_active": {"$ne": False}})
    imports_24h = await _db.import_runs.count_documents({"started_at": {"$gte": now - timedelta(days=1)}})
    imports_failed_24h = await _db.import_runs.count_documents({"started_at": {"$gte": now - timedelta(days=1)}, "status": {"$in": ["failed", "partial"]}})
    return {
        "banks_active": banks_active,
        "offers_active": offers_total,
        "offers_demo": offers_demo,
        "offers_real": offers_real,
        "fresh": fresh,
        "stale": stale,
        "expired": expired,
        "needs_review_open": review_open,
        "imports_24h": imports_24h,
        "imports_failed_24h": imports_failed_24h,
        "config": {
            "fresh_max_days": FRESH_MAX_DAYS,
            "stale_max_days": STALE_MAX_DAYS,
            "rate_delta_review_pp": RATE_DELTA_REVIEW_THRESHOLD_PP,
            "demo_mode_enabled": DEMO_MODE_ENABLED,
        },
    }


# ---------------------------------------------------------------------------
# Review Queue
# ---------------------------------------------------------------------------
@admin_router.get("/review-items")
async def list_review_items(status: str = "open", limit: int = 100, _admin: dict = Depends(require_admin)) -> Dict[str, Any]:
    items = []
    async for r in _db.review_items.find({"status": status}).sort("created_at", -1).limit(limit):
        items.append({
            "id": str(r["_id"]),
            "entity_type": r.get("entity_type"),
            "entity_id": r.get("entity_id"),
            "reason": r.get("reason"),
            "reasons": r.get("reasons", []),
            "source_slug": r.get("source_slug"),
            "before": r.get("before"),
            "after": r.get("after"),
            "created_at": r.get("created_at").isoformat() if r.get("created_at") else None,
            "status": r.get("status"),
        })
    return {"items": items, "count": len(items), "status": status}


@admin_router.post("/review-items/{review_id}")
async def action_review_item(
    review_id: str,
    body: ReviewAction = Body(...),
    admin: dict = Depends(require_admin),
) -> Dict[str, Any]:
    r = await _db.review_items.find_one({"_id": ObjectId(review_id) if len(review_id) == 24 else review_id})
    if not r:
        raise HTTPException(status_code=404, detail="review item not found")
    now = _now()
    if body.action == "reject":
        await _db.review_items.update_one({"_id": r["_id"]}, {"$set": {"status": "rejected", "resolved_at": now}})
        await audit(r.get("entity_type"), r.get("entity_id"), "reject", r.get("after"), None, admin)
        return {"ok": True, "action": "reject"}
    # approve or edit_and_approve
    final_after = dict(r.get("after") or {})
    if body.action == "edit_and_approve" and body.edits:
        final_after.update(body.edits)
    if r.get("entity_type") == "savings_offer":
        offer_id = r.get("entity_id")
        upd = {**final_after, "status": "active", "is_active": True, "is_demo": False, "verified_at": now}
        await _db.savings_offers.update_one(
            {"_id": ObjectId(offer_id) if len(offer_id) == 24 else offer_id},
            {"$set": upd},
        )
    await _db.review_items.update_one({"_id": r["_id"]}, {"$set": {"status": "approved", "resolved_at": now, "final_after": final_after}})
    await audit(r.get("entity_type"), r.get("entity_id"), body.action, r.get("before"), final_after, admin)
    return {"ok": True, "action": body.action}


# ---------------------------------------------------------------------------
# Demo → Real Replacement
# ---------------------------------------------------------------------------
@admin_router.post("/demo-replace")
async def demo_replace(body: DemoReplacePayload = Body(...), admin: dict = Depends(require_admin)) -> Dict[str, Any]:
    from lib.import_pipeline import normalize_records, build_diff, apply_diff  # noqa
    demo = await _db.savings_offers.find_one({"_id": ObjectId(body.demo_offer_id) if len(body.demo_offer_id) == 24 else body.demo_offer_id})
    if not demo:
        raise HTTPException(status_code=404, detail="demo offer not found")
    if not demo.get("is_demo"):
        raise HTTPException(status_code=409, detail="target offer is not marked as demo")

    # Validate provenance requirements up-front.
    rec = body.real_record
    for k in ("bank_slug", "product_type", "interest_rate"):
        if not rec.get(k):
            raise HTTPException(status_code=422, detail=f"missing required field: {k}")
    if not (body.source_url or body.source_slug):
        raise HTTPException(status_code=422, detail="source_slug or source_url required")
    if body.source_url:
        _validate_public_url(body.source_url)

    now = _now()
    # Deactivate demo (keep for audit / history).
    await _db.savings_offers.update_one({"_id": demo["_id"]}, {"$set": {"is_active": False, "status": "disabled", "updated_at": now}})
    await audit("savings_offer", str(demo["_id"]), "deactivate", demo, None, admin)

    # Insert real offer via import pipeline (Diff/Validate).
    normalized = normalize_records([rec])
    diffs, counts = await build_diff(
        normalized,
        banks_collection=_db.banks,
        aliases_collection=_db.bank_aliases,
        offers_collection=_db.savings_offers,
        countries_collection=_db.countries,
        dgs_collection=_db.deposit_guarantee_schemes,
    )
    if counts.get("invalid"):
        # rollback deactivation
        await _db.savings_offers.update_one({"_id": demo["_id"]}, {"$set": {"is_active": True, "status": "active"}})
        raise HTTPException(status_code=422, detail={"errors": diffs[0].get("errors")})
    applied = await apply_diff(
        diffs, source_slug=body.source_slug, source_url=body.source_url,
        verification_method=body.verification_method, applied_by=admin.get("email"),
        now=now, offers_collection=_db.savings_offers, history_collection=_db.interest_rate_history,
    )
    return {"ok": True, "counts": counts, "applied": applied, "deactivated_demo_id": str(demo["_id"])}


# ---------------------------------------------------------------------------
# DataSource management
# ---------------------------------------------------------------------------
@admin_router.get("/data-sources")
async def list_all_sources(_admin: dict = Depends(require_admin)) -> Dict[str, Any]:
    items = []
    async for s in _db.data_sources.find({}).sort("slug", 1):
        items.append({
            "slug": s.get("slug"), "name": s.get("name"), "type": s.get("type"),
            "provider": s.get("provider"), "source_url": s.get("source_url"),
            "trust_level": s.get("trust_level", "review_required"),
            "status": s.get("status", "active"),
            "last_success_at": s["last_success_at"].isoformat() if isinstance(s.get("last_success_at"), datetime) else None,
            "last_failure_at": s["last_failure_at"].isoformat() if isinstance(s.get("last_failure_at"), datetime) else None,
        })
    return {"items": items, "count": len(items)}


@admin_router.post("/data-sources")
async def upsert_source(body: DataSourceUpsert = Body(...), admin: dict = Depends(require_admin)) -> Dict[str, Any]:
    if body.source_url:
        _validate_public_url(body.source_url)
    now = _now()
    existing = await _db.data_sources.find_one({"slug": body.slug})
    doc = body.model_dump()
    doc["updated_at"] = now
    if existing:
        await _db.data_sources.update_one({"_id": existing["_id"]}, {"$set": doc})
        await audit("data_source", body.slug, "update", existing, doc, admin)
    else:
        doc["created_at"] = now
        doc["status"] = "active"
        doc["is_public_source_url"] = bool(body.source_url)
        await _db.data_sources.insert_one(doc)
        await audit("data_source", body.slug, "create", None, doc, admin)
    return {"ok": True, "slug": body.slug}


# ---------------------------------------------------------------------------
# Source Monitoring
# ---------------------------------------------------------------------------
@admin_router.get("/source-monitoring")
async def source_monitoring(_admin: dict = Depends(require_admin)) -> Dict[str, Any]:
    items = []
    async for s in _db.data_sources.find({}):
        offer_count = await _db.savings_offers.count_documents({"source_id": s.get("slug")})
        review_count = await _db.review_items.count_documents({"source_slug": s.get("slug"), "status": "open"})
        items.append({
            "slug": s.get("slug"), "type": s.get("type"),
            "trust_level": s.get("trust_level", "review_required"),
            "status": s.get("status", "active"),
            "offer_count": offer_count, "review_count": review_count,
            "last_success_at": s["last_success_at"].isoformat() if isinstance(s.get("last_success_at"), datetime) else None,
            "last_failure_at": s["last_failure_at"].isoformat() if isinstance(s.get("last_failure_at"), datetime) else None,
        })
    return {"items": items, "count": len(items)}


# ---------------------------------------------------------------------------
# Audit-Log lookup
# ---------------------------------------------------------------------------
@admin_router.get("/audit-log")
async def audit_log(entity_type: Optional[str] = None, entity_id: Optional[str] = None,
                    limit: int = 100, _admin: dict = Depends(require_admin)) -> Dict[str, Any]:
    q = {}
    if entity_type:
        q["entity_type"] = entity_type
    if entity_id:
        q["entity_id"] = entity_id
    items = []
    async for r in _db.audit_log.find(q).sort("changed_at", -1).limit(min(limit, 500)):
        items.append({
            "id": str(r["_id"]),
            "entity_type": r.get("entity_type"), "entity_id": r.get("entity_id"),
            "action": r.get("action"),
            "changed_at": r["changed_at"].isoformat() if isinstance(r.get("changed_at"), datetime) else None,
            "changed_by": r.get("changed_by"),
            "before": r.get("before"), "after": r.get("after"),
        })
    return {"items": items, "count": len(items)}


# ---------------------------------------------------------------------------
# PartnerFeedAdapter Interface (nur Signaturen, keine Implementierung).
# ---------------------------------------------------------------------------
class PartnerFeedAdapter:
    """Zukunfts-Interface für Partner-Feeds. In Phase 5 nur Signatur/Docs.

    Konkrete Implementierungen dürfen erst existieren, wenn eine autorisierte
    Feed-Spezifikation vorliegt (z. B. Raisin/WeltSparen). Der Kern-Import ist
    bereits durch `lib/import_pipeline.py` (JSON/CSV) abgedeckt.
    """
    def parse(self, raw: bytes | str) -> list[dict]:  # pragma: no cover
        raise NotImplementedError

    def normalize(self, records: list[dict]) -> list[dict]:  # pragma: no cover
        raise NotImplementedError

    def validate(self, records: list[dict]) -> list[dict]:  # pragma: no cover
        raise NotImplementedError

    def map_bank(self, record: dict) -> Optional[str]:  # pragma: no cover
        raise NotImplementedError

    def build_diff(self, records: list[dict]) -> list[dict]:  # pragma: no cover
        raise NotImplementedError
