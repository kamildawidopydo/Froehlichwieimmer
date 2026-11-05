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
from typing import Optional, Literal

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
from services.bond_audit import (  # noqa: E402
    write_audit, list_audit, price_changed, record_price, list_prices,
)
from services.bond_order_service import executable_buy_price  # noqa: E402


def _validate_binding_price(doc: dict) -> None:
    if doc.get("kaufkurs_art") != "verbindlich":
        return
    missing = [label for key, label in (
        ("kaufkurs", "Kaufkurs"), ("kaufkurs_quelle", "Kursquelle"),
        ("kaufkurs_quoted_at", "Zeitpunkt der Kursstellung"), ("kaufkurs_valid_until", "Gültig bis"),
    ) if not doc.get(key)]
    if missing:
        raise HTTPException(
            status_code=422,
            detail="Ein verbindlicher Kaufkurs der Partnerbank benötigt: " + ", ".join(missing) + ".",
        )


public_router = APIRouter(prefix="/api/bonds", tags=["bond-catalog"])
admin_router = APIRouter(prefix="/api/admin/bonds", tags=["admin-bond-catalog"])


# ─── Pydantic-Models ────────────────────────────────────────────────────
class BondExtraFields(BaseModel):
    """Erweiterte Stammdaten, Kurs-Metadaten und Sichtbarkeit (alle optional)."""

    wkn: Optional[str] = Field(default=None, max_length=12)
    legal_issuer: Optional[str] = Field(default=None, max_length=200)
    verkaufskurs: Optional[float] = None
    kurs_datum: Optional[str] = Field(default=None, max_length=40)
    kurs_quelle: Optional[str] = Field(default=None, max_length=200)
    kurs_typ: Optional[Literal["market", "reference"]] = None
    kurs_hinweis: Optional[str] = Field(default=None, max_length=200)
    kursveraenderung_abs: Optional[float] = None
    kursveraenderung_pct: Optional[float] = None
    rendite_manuell: Optional[float] = None
    is_perpetual: Optional[bool] = None
    zinstermine: Optional[str] = Field(default=None, max_length=300)
    zinsfrequenz: Optional[str] = Field(default=None, max_length=50)
    description: Optional[str] = Field(default=None, max_length=4000)
    security_type: Optional[str] = Field(default=None, max_length=200)
    risk_note: Optional[str] = Field(default=None, max_length=300)
    risk_details: Optional[str] = Field(default=None, max_length=6000)
    requests_enabled: Optional[bool] = None
    orders_enabled: Optional[bool] = None
    legal_issuer_status: Optional[Literal["verified", "pending"]] = None
    terms_status: Optional[Literal["verified", "pending"]] = None
    verification_note: Optional[str] = Field(default=None, max_length=3000)
    kaufkurs_art: Optional[Literal["indikativ", "verbindlich"]] = None
    kaufkurs_quelle: Optional[str] = Field(default=None, max_length=200)
    kaufkurs_quoted_at: Optional[str] = Field(default=None, max_length=40)
    kaufkurs_valid_until: Optional[str] = Field(default=None, max_length=40)
    buy_fee_pct: Optional[float] = Field(default=None, ge=0, le=20)
    buy_fee_min_eur: Optional[float] = Field(default=None, ge=0)
    buy_fee_fixed_eur: Optional[float] = Field(default=None, ge=0)
    accrued_interest_pct: Optional[float] = Field(default=None, ge=0, le=100)
    accrued_note: Optional[str] = Field(default=None, max_length=500)

    @field_validator("verkaufskurs", "kursveraenderung_abs", "kursveraenderung_pct", "rendite_manuell")
    @classmethod
    def _finite_extra(cls, v):
        if v is None:
            return None
        if not isinstance(v, (int, float)) or v != v:
            raise ValueError("Wert muss numerisch sein")
        return float(v)


class BondCatalogBase(BondExtraFields):
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


class BondCatalogUpdate(BondExtraFields):
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
        **{k: doc.get(k) for k in BondExtraFields.model_fields},
        "is_perpetual": bool(doc.get("is_perpetual", False)),
        "requests_enabled": doc.get("requests_enabled") is not False,
        "orders_enabled": doc.get("orders_enabled") is not False,
        "buy_executable": executable_buy_price(doc) is not None,
        "price_updated_at": doc["price_updated_at"].isoformat() if isinstance(doc.get("price_updated_at"), datetime) else doc.get("price_updated_at"),
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


@public_router.get("/catalog/{bond_id}/prices")
async def list_bond_prices(bond_id: str, user: dict = Depends(get_current_user)):
    """Gespeicherte Kurse (nur echte Einträge, keine Interpolation) für sichtbare Anleihen."""
    oid = _oid_or_404(bond_id)
    bond = await db.bond_catalog.find_one({"_id": oid, "is_available": True}, {"price_updated_at": 1, "kurs_typ": 1})
    if not bond:
        raise HTTPException(status_code=404, detail="Bond nicht gefunden")
    points = [
        {"recorded_at": p["recorded_at"], "kurs": p["aktueller_kurs"],
         "kurs_typ": p.get("kurs_typ"), "kurs_datum": p.get("kurs_datum")}
        for p in reversed(await list_prices(db, str(oid), limit=500))
        if p.get("aktueller_kurs") is not None
    ]
    pu = bond.get("price_updated_at")
    return {
        "points": points,
        "price_updated_at": pu.isoformat() if isinstance(pu, datetime) else pu,
        "kurs_typ": bond.get("kurs_typ"),
    }


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
    if doc.get("isin") and await db.bond_catalog.find_one({"isin": doc["isin"]}):
        raise HTTPException(status_code=409, detail="Eine Anleihe mit dieser ISIN existiert bereits.")
    doc.setdefault("source", None)
    _validate_binding_price(doc)
    doc["source"] = doc["source"] or "manual"
    doc["is_manual_override"] = True
    if doc.get("requests_enabled") is None:
        doc["requests_enabled"] = True
    doc.update({"created_at": now, "updated_at": now})
    if any(doc.get(k) is not None for k in ("kaufkurs", "verkaufskurs", "aktueller_kurs")):
        doc["price_updated_at"] = now
    result = await db.bond_catalog.insert_one(doc)
    doc["_id"] = result.inserted_id
    await write_audit(db, "bond", result.inserted_id, "create", None, doc, _admin)
    if doc.get("price_updated_at"):
        await record_price(db, result.inserted_id, doc, _admin)
    return _serialize(doc)


@admin_router.patch("/catalog/{bond_id}")
async def admin_update_bond(
    bond_id: str,
    payload: BondCatalogUpdate,
    _admin: dict = Depends(require_admin),
):
    oid = _oid_or_404(bond_id)
    existing = await db.bond_catalog.find_one({"_id": oid})
    if not existing:
        raise HTTPException(status_code=404, detail="Bond nicht gefunden")
    changes = {k: v for k, v in payload.model_dump(exclude_unset=True).items()
               if existing.get(k) != v}
    if not changes:
        return _serialize(existing)
    if changes.get("isin") and await db.bond_catalog.find_one({"isin": changes["isin"], "_id": {"$ne": oid}}, {"_id": 1}):
        raise HTTPException(status_code=409, detail="Eine Anleihe mit dieser ISIN existiert bereits.")
    _validate_binding_price({**existing, **changes})
    now = datetime.now(timezone.utc)
    changes["updated_at"] = now
    # Admin-gepflegte Datensätze nie vom Börsen-Sync überschreiben lassen
    changes["is_manual_override"] = True
    prices = price_changed(existing, changes)
    if prices:
        changes["price_updated_at"] = now
    result = await db.bond_catalog.find_one_and_update(
        {"_id": oid},
        {"$set": changes},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Bond nicht gefunden")
    await write_audit(db, "bond", oid, "update", existing, result, _admin)
    if prices:
        await record_price(db, oid, result, _admin)
    return _serialize(result)


@admin_router.delete("/catalog/{bond_id}", status_code=204)
async def admin_delete_bond(
    bond_id: str,
    _admin: dict = Depends(require_admin),
):
    oid = _oid_or_404(bond_id)
    existing = await db.bond_catalog.find_one({"_id": oid})
    if not existing:
        raise HTTPException(status_code=404, detail="Bond nicht gefunden")
    await db.bond_catalog.delete_one({"_id": oid})
    await write_audit(db, "bond", oid, "delete", existing, None, _admin)
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


@admin_router.get("/catalog/{bond_id}/history")
async def admin_bond_history(bond_id: str, _admin: dict = Depends(require_admin)):
    """Kurshistorie + Änderungsprotokoll einer Anleihe."""
    oid = _oid_or_404(bond_id)
    if not await db.bond_catalog.find_one({"_id": oid}, {"_id": 1}):
        raise HTTPException(status_code=404, detail="Bond nicht gefunden")
    return {
        "prices": await list_prices(db, str(oid)),
        "audit": await list_audit(db, "bond", str(oid)),
    }


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
    await db.bond_price_history.create_index([("bond_id", 1), ("recorded_at", -1)])
    await db.audit_log.create_index([("entity_type", 1), ("entity_id", 1), ("changed_at", -1)])
