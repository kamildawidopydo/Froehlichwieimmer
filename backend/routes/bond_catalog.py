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

# Session 82.16 — Sync-Service (Deutsche Börse XFRA-BF → Mongo)
from services.bond_sync import sync_bond_catalog  # noqa: E402


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
