"""
Bond-Katalog — FastAPI/Mongo-native (Session 82.03).

Kontext: Der Legacy-Supabase-`bond_catalog` liefert Anon-Reads mit 0 Zeilen
(RLS blockt Anon-Bulk-Reads bzw. Tabelle leer). Admin-Writes gehen ohne
Service-Role auch nicht durch. Dieses Modul stellt den Bond-Katalog
vollständig auf Mongo um:
  - Public Read:  GET /api/bonds/catalog  (nur is_available=true)
  - Admin CRUD:   /api/admin/bonds/catalog  (require_admin)

Portfolio-Migration bleibt unberührt — dies sind reine Referenzdaten
(kein user_id, keine Positionen).
"""

from __future__ import annotations

from datetime import datetime, timezone, date as _date
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from server import get_current_user, db, require_admin  # type: ignore[attr-defined]

# Session 82.16/82.17 — Sync-Service + Run-History (Deutsche Börse XFRA-BF → Mongo)
from services.bond_sync import (  # noqa: E402
    sync_bond_catalog,
    get_recent_sync_runs,
    ensure_history_index,
)


public_router = APIRouter(prefix="/api/bonds", tags=["bond-catalog"])
admin_router = APIRouter(prefix="/api/admin/bonds", tags=["admin-bond-catalog"])


# ─── Pydantic-Models ────────────────────────────────────────────────────
class BondCatalogBase(BaseModel):
    isin: Optional[str] = Field(default=None, max_length=20)
    bond_name: Optional[str] = Field(default=None, max_length=200)
    issuer: Optional[str] = Field(default=None, max_length=200)
    kupon_rate: Optional[float] = None
    kaufkurs: Optional[float] = None
    aktueller_kurs: Optional[float] = None
    faelligkeitsdatum: Optional[str] = Field(default=None, description="ISO YYYY-MM-DD")
    min_order_eur: Optional[float] = Field(default=None, ge=0)
    denomination: Optional[float] = Field(default=None, ge=0)
    is_available: bool = True
    # Session 82.16 — Sync-Metadaten (additiv, alle optional)
    currency: Optional[str] = Field(default=None, max_length=8)
    country: Optional[str] = Field(default=None, max_length=8)
    source: Optional[str] = Field(default=None, max_length=50)
    external_key: Optional[str] = Field(default=None, max_length=200)
    is_manual_override: bool = False
    issue_date: Optional[str] = Field(default=None, description="ISO YYYY-MM-DD")

    model_config = {"extra": "forbid"}

    @field_validator("kupon_rate", "kaufkurs", "aktueller_kurs")
    @classmethod
    def _finite_num(cls, v):
        if v is None:
            return None
        if not isinstance(v, (int, float)) or v != v:  # NaN check
            raise ValueError("Wert muss numerisch sein")
        return float(v)

    @field_validator("faelligkeitsdatum")
    @classmethod
    def _iso_date(cls, v):
        if not v:
            return None
        try:
            _date.fromisoformat(v)
        except ValueError as exc:
            raise ValueError("faelligkeitsdatum muss ISO YYYY-MM-DD sein") from exc
        return v

    @field_validator("isin")
    @classmethod
    def _isin_upper(cls, v):
        if not v:
            return None
        v = v.strip().upper()
        if not (10 <= len(v) <= 12) or not v.isalnum():
            raise ValueError("ISIN ungültig (10-12 alphanumerische Zeichen)")
        return v


class BondCatalogCreate(BondCatalogBase):
    pass


class BondCatalogUpdate(BaseModel):
    """Alle Felder optional (PATCH-Semantik)."""

    isin: Optional[str] = Field(default=None, max_length=20)
    bond_name: Optional[str] = Field(default=None, max_length=200)
    issuer: Optional[str] = Field(default=None, max_length=200)
    kupon_rate: Optional[float] = None
    kaufkurs: Optional[float] = None
    aktueller_kurs: Optional[float] = None
    faelligkeitsdatum: Optional[str] = None
    min_order_eur: Optional[float] = Field(default=None, ge=0)
    denomination: Optional[float] = Field(default=None, ge=0)
    is_available: Optional[bool] = None
    # Session 82.16 — Sync-Metadaten (additiv)
    currency: Optional[str] = Field(default=None, max_length=8)
    country: Optional[str] = Field(default=None, max_length=8)
    source: Optional[str] = Field(default=None, max_length=50)
    external_key: Optional[str] = Field(default=None, max_length=200)
    is_manual_override: Optional[bool] = None
    issue_date: Optional[str] = None

    model_config = {"extra": "forbid"}

    @field_validator("kupon_rate", "kaufkurs", "aktueller_kurs")
    @classmethod
    def _finite(cls, v):
        if v is None:
            return None
        if not isinstance(v, (int, float)) or v != v:
            raise ValueError("Wert muss numerisch sein")
        return float(v)

    @field_validator("faelligkeitsdatum")
    @classmethod
    def _iso(cls, v):
        if v in (None, ""):
            return None
        try:
            _date.fromisoformat(v)
        except ValueError as exc:
            raise ValueError("faelligkeitsdatum muss ISO YYYY-MM-DD sein") from exc
        return v

    @field_validator("isin")
    @classmethod
    def _isin_upper(cls, v):
        if not v:
            return None
        v = v.strip().upper()
        if not (10 <= len(v) <= 12) or not v.isalnum():
            raise ValueError("ISIN ungültig (10-12 alphanumerische Zeichen)")
        return v


def _serialize(doc: dict) -> dict:
    ca = doc.get("created_at")
    ua = doc.get("updated_at")
    return {
        "id": str(doc["_id"]),
        "isin": doc.get("isin"),
        "bond_name": doc.get("bond_name"),
        "issuer": doc.get("issuer"),
        "kupon_rate": doc.get("kupon_rate"),
        "kaufkurs": doc.get("kaufkurs"),
        "aktueller_kurs": doc.get("aktueller_kurs"),
        "faelligkeitsdatum": doc.get("faelligkeitsdatum"),
        "min_order_eur": doc.get("min_order_eur"),
        "denomination": doc.get("denomination"),
        "is_available": bool(doc.get("is_available", True)),
        # Session 82.16 — Sync-Metadaten
        "currency": doc.get("currency"),
        "country": doc.get("country"),
        "source": doc.get("source"),
        "external_key": doc.get("external_key"),
        "is_manual_override": bool(doc.get("is_manual_override", False)),
        "issue_date": doc.get("issue_date"),
        "created_at": ca.isoformat() if isinstance(ca, datetime) else ca,
        "updated_at": ua.isoformat() if isinstance(ua, datetime) else ua,
    }


def _oid_or_404(bond_id: str) -> ObjectId:
    if not ObjectId.is_valid(bond_id):
        raise HTTPException(status_code=404, detail="Bond nicht gefunden")
    return ObjectId(bond_id)


# ─── Public: Customer Read ──────────────────────────────────────────────
@public_router.get("/catalog")
async def list_available_bonds(user: dict = Depends(get_current_user)):
    """
    Liefert nur is_available=true UND (faelligkeitsdatum >= heute ODER null).
    Session 82.16 · Phase 15 Maturity-Guard serverseitig.
    Sort: kupon_rate DESC (falls vorhanden).
    """
    today = _date.today().isoformat()
    query = {
        "is_available": True,
        "$or": [
            {"faelligkeitsdatum": {"$gte": today}},
            {"faelligkeitsdatum": None},
            {"faelligkeitsdatum": {"$exists": False}},
        ],
    }
    cursor = db.bond_catalog.find(query).sort(
        [("kupon_rate", -1), ("bond_name", 1)]
    )
    return [_serialize(doc) async for doc in cursor]


# ─── Admin CRUD ─────────────────────────────────────────────────────────
@admin_router.get("/catalog")
async def admin_list_bonds(_admin: dict = Depends(require_admin)):
    """Alle Einträge (auch inaktive) für Admin-Übersicht."""
    cursor = db.bond_catalog.find({}).sort(
        [("kupon_rate", -1), ("bond_name", 1)]
    )
    return [_serialize(doc) async for doc in cursor]


@admin_router.post("/catalog", status_code=201)
async def admin_create_bond(
    payload: BondCatalogCreate,
    _admin: dict = Depends(require_admin),
):
    now = datetime.now(timezone.utc)
    doc = payload.model_dump()
    doc.update({"created_at": now, "updated_at": now})
    result = await db.bond_catalog.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)


@admin_router.patch("/catalog/{bond_id}")
async def admin_update_bond(
    bond_id: str,
    payload: BondCatalogUpdate,
    _admin: dict = Depends(require_admin),
):
    oid = _oid_or_404(bond_id)
    changes = {k: v for k, v in payload.model_dump(exclude_unset=True).items()}
    if not changes:
        existing = await db.bond_catalog.find_one({"_id": oid})
        if not existing:
            raise HTTPException(status_code=404, detail="Bond nicht gefunden")
        return _serialize(existing)
    changes["updated_at"] = datetime.now(timezone.utc)
    result = await db.bond_catalog.find_one_and_update(
        {"_id": oid},
        {"$set": changes},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Bond nicht gefunden")
    return _serialize(result)


@admin_router.delete("/catalog/{bond_id}", status_code=204)
async def admin_delete_bond(
    bond_id: str,
    _admin: dict = Depends(require_admin),
):
    oid = _oid_or_404(bond_id)
    result = await db.bond_catalog.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bond nicht gefunden")
    return None


# ─── SYNC · Deutsche Börse XFRA-BF → Mongo (Session 82.16) ──────────────
@admin_router.post("/catalog/sync")
async def admin_sync_bond_catalog(_admin: dict = Depends(require_admin)):
    """
    Manueller Admin-Sync (trigger=admin). Zieht die offizielle Deutsche-Börse
    T7 XFRA-BF Referenzdatei, filtert kuratiert und upsertet in `bond_catalog`.

    Idempotent, source-isoliert, Manual-Override wird respektiert.
    """
    return await sync_bond_catalog(db, trigger="admin")


# ─── HISTORY · Run-Timeline + CSV-Export (Session 82.17) ────────────────
@admin_router.get("/catalog/sync/history")
async def admin_bond_sync_history(
    limit: int = 30,
    _admin: dict = Depends(require_admin),
):
    """Letzte N Sync-Runs (max 30) für Admin-Timeline."""
    await ensure_history_index(db)  # idempotent
    return {"runs": await get_recent_sync_runs(db, limit=limit)}


@admin_router.get("/catalog/sync/history.csv")
async def admin_bond_sync_history_csv(
    limit: int = 30,
    _admin: dict = Depends(require_admin),
):
    """CSV-Export der letzten Sync-Runs (analog IPO-CSV). Read-only, injection-safe."""
    import csv
    import io
    from datetime import date as _dt_date
    from fastapi.responses import StreamingResponse

    limit = max(1, min(int(limit or 30), 30))
    runs = await get_recent_sync_runs(db, limit=limit)

    def _csv_safe(value):
        """CSV-Injection-Protection: prefixe Formeln mit Apostroph."""
        if value is None:
            return ""
        s = str(value)
        if s and s[0] in ("=", "+", "-", "@", "\t", "\r"):
            return "'" + s
        return s

    headers = [
        "run_id", "trigger", "status",
        "started_at", "finished_at", "duration_ms",
        "source",
        "raw_rows", "eur_bond_rows",
        "eligible_before_cap", "imported_after_cap",
        "inserted", "updated", "unchanged",
        "skipped_manual_override", "skipped_due_to_cap",
        "skipped_invalid", "skipped_expired",
        "skipped_wrong_prefix", "skipped_inactive",
        "skipped_curated_out", "missing_from_source",
        "error_count", "errors_summary",
    ]
    buf = io.StringIO()
    buf.write("\ufeff")  # BOM für Excel-DE
    writer = csv.writer(buf, delimiter=";", quoting=csv.QUOTE_MINIMAL)
    writer.writerow(headers)
    for r in runs:
        writer.writerow([
            _csv_safe(r.get("id")),
            _csv_safe(r.get("trigger")),
            _csv_safe(r.get("status")),
            _csv_safe(r.get("started_at")),
            _csv_safe(r.get("finished_at")),
            _csv_safe(r.get("duration_ms")),
            _csv_safe(r.get("source")),
            _csv_safe(r.get("raw_rows")),
            _csv_safe(r.get("eur_bond_rows")),
            _csv_safe(r.get("eligible_before_cap")),
            _csv_safe(r.get("imported_after_cap")),
            _csv_safe(r.get("inserted")),
            _csv_safe(r.get("updated")),
            _csv_safe(r.get("unchanged")),
            _csv_safe(r.get("skipped_manual_override")),
            _csv_safe(r.get("skipped_due_to_cap")),
            _csv_safe(r.get("skipped_invalid")),
            _csv_safe(r.get("skipped_expired")),
            _csv_safe(r.get("skipped_wrong_prefix")),
            _csv_safe(r.get("skipped_inactive")),
            _csv_safe(r.get("skipped_curated_out")),
            _csv_safe(r.get("missing_from_source")),
            _csv_safe(r.get("error_count")),
            _csv_safe(" | ".join((r.get("errors_summary") or [])[:5])),
        ])
    filename = f"bond-sync-history-{_dt_date.today().isoformat()}.csv"
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


async def ensure_indexes():
    """
    Idempotente Indizes.
    Session 82.16: `external_key` als UNIQUE sparse für Sync-Upsert,
    `isin` als UNIQUE sparse für Duplicate-Guard.
    """
    await db.bond_catalog.create_index([("is_available", 1), ("kupon_rate", -1)])
    # Duplicate-Guard: ein Bond nie zweimal
    await db.bond_catalog.create_index(
        [("isin", 1)], unique=True, sparse=True, name="isin_unique_sparse",
    )
    await db.bond_catalog.create_index(
        [("external_key", 1)],
        unique=True,
        sparse=True,
        name="external_key_unique_sparse",
    )
