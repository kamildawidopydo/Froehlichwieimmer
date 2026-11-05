"""
IPO-Katalog — FastAPI/Mongo-native (Session 82.03).

Kontext: Der Legacy-Supabase-`ipo_catalog` liefert Anon-Reads mit 0 Zeilen.
Admin-Writes gehen ohne Service-Role nicht durch. Dieses Modul stellt den
IPO-Katalog vollständig auf Mongo um:
  - Public Read:  GET /api/ipo/catalog  (is_visible=true AND status NOT IN listed,cancelled)
  - Admin CRUD:   /api/admin/ipo/catalog

Nach Cutover referenziert `ipo_requests.ipo_id` die Mongo-`_id` als String.
Der bestehende Legacy-Supabase-Edge-Function-`ipo-sync` wird nicht mehr
verwendet — Admin pflegt manuell (Anforderung: „Admin Manual CRUD reicht").
"""

from __future__ import annotations

from datetime import datetime, timezone, date as _date
from typing import Optional, Literal

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator, model_validator
from pymongo.errors import DuplicateKeyError

from server import get_current_user, db, require_admin  # type: ignore[attr-defined]

# Session 82.06 — Sync-Logik in wiederverwendbare Service-Funktion extrahiert,
# damit Admin-Route und Cron-Endpoint dieselbe Implementierung nutzen.
from services.ipo_sync import (
    sync_ipo_catalog,
    get_last_sync_status,
    get_recent_sync_runs,
    ensure_history_index,
)  # noqa: E402


public_router = APIRouter(prefix="/api/ipo", tags=["ipo-catalog"])
admin_router = APIRouter(prefix="/api/admin/ipo", tags=["admin-ipo-catalog"])


IpoStatus = Literal[
    "upcoming", "open", "priced", "filed", "listed", "postponed", "cancelled", "planned", "unavailable"
]
VISIBLE_STATUSES = ("upcoming", "open", "priced", "filed", "postponed", "planned", "unavailable")
INVESTABLE_STATUSES = ("upcoming", "open", "priced", "filed")


# ─── Pydantic-Models ────────────────────────────────────────────────────
class IpoCatalogBase(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=200)
    ticker_proposed: Optional[str] = Field(default=None, max_length=20)
    isin: Optional[str] = Field(default=None, max_length=20)
    exchange: Optional[str] = Field(default=None, max_length=100)
    market: Optional[str] = Field(default=None, max_length=100)
    sector: Optional[str] = Field(default=None, max_length=100)
    status: IpoStatus = "upcoming"
    ipo_date: Optional[str] = None
    expected_ipo_window: Optional[str] = Field(default=None, max_length=100)
    subscription_start: Optional[str] = None
    subscription_end: Optional[str] = None
    price_range_low: Optional[float] = None
    price_range_high: Optional[float] = None
    price_currency: str = Field(default="EUR", max_length=8)
    valuation_last_private: Optional[float] = None
    min_investment_eur: Optional[float] = Field(default=None, ge=0)
    lot_size: int = Field(default=1, ge=1)
    entry_price_eur: Optional[float] = None
    estimated_value_eur: Optional[float] = None
    value_updated_at: Optional[str] = None
    prospectus_url: Optional[str] = Field(default=None, max_length=1000)
    description: Optional[str] = Field(default=None, max_length=8000)
    is_visible: bool = True
    is_manual_override: bool = True
    display_order: Optional[int] = None
    external_key: Optional[str] = Field(default=None, max_length=200)
    source: Optional[str] = Field(default="manual", max_length=50)

    model_config = {"extra": "forbid"}

    @field_validator(
        "price_range_low",
        "price_range_high",
        "valuation_last_private",
        "min_investment_eur",
        "entry_price_eur",
        "estimated_value_eur",
    )
    @classmethod
    def _finite(cls, v):
        if v is None:
            return None
        if not isinstance(v, (int, float)) or v != v:
            raise ValueError("Wert muss numerisch sein")
        if v < 0:
            raise ValueError("Wert darf nicht negativ sein")
        return float(v)

    @field_validator("ipo_date", "subscription_start", "subscription_end", "value_updated_at")
    @classmethod
    def _iso_date(cls, v):
        if v in (None, ""):
            return None
        try:
            _date.fromisoformat(v)
        except ValueError as exc:
            raise ValueError("Datum muss ISO YYYY-MM-DD sein") from exc
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

    @model_validator(mode="after")
    def _cross_field(self):
        if (
            self.price_range_low is not None
            and self.price_range_high is not None
            and self.price_range_low > self.price_range_high
        ):
            raise ValueError("price_range_low darf nicht größer als price_range_high sein")
        if (
            self.subscription_start
            and self.subscription_end
            and self.subscription_start > self.subscription_end
        ):
            raise ValueError("subscription_start darf nicht nach subscription_end liegen")
        return self


class IpoCatalogCreate(IpoCatalogBase):
    pass


class IpoCatalogUpdate(BaseModel):
    """PATCH-Semantik: alles optional."""

    company_name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    ticker_proposed: Optional[str] = Field(default=None, max_length=20)
    isin: Optional[str] = Field(default=None, max_length=20)
    exchange: Optional[str] = Field(default=None, max_length=100)
    market: Optional[str] = Field(default=None, max_length=100)
    sector: Optional[str] = Field(default=None, max_length=100)
    status: Optional[IpoStatus] = None
    ipo_date: Optional[str] = None
    expected_ipo_window: Optional[str] = Field(default=None, max_length=100)
    subscription_start: Optional[str] = None
    subscription_end: Optional[str] = None
    price_range_low: Optional[float] = None
    price_range_high: Optional[float] = None
    price_currency: Optional[str] = Field(default=None, max_length=8)
    valuation_last_private: Optional[float] = None
    min_investment_eur: Optional[float] = Field(default=None, ge=0)
    lot_size: Optional[int] = Field(default=None, ge=1)
    entry_price_eur: Optional[float] = None
    estimated_value_eur: Optional[float] = None
    value_updated_at: Optional[str] = None
    prospectus_url: Optional[str] = Field(default=None, max_length=1000)
    description: Optional[str] = Field(default=None, max_length=8000)
    is_visible: Optional[bool] = None
    is_manual_override: Optional[bool] = None
    display_order: Optional[int] = None

    model_config = {"extra": "forbid"}

    @field_validator(
        "price_range_low",
        "price_range_high",
        "valuation_last_private",
        "min_investment_eur",
        "entry_price_eur",
        "estimated_value_eur",
    )
    @classmethod
    def _finite(cls, v):
        if v is None:
            return None
        if not isinstance(v, (int, float)) or v != v:
            raise ValueError("Wert muss numerisch sein")
        if v < 0:
            raise ValueError("Wert darf nicht negativ sein")
        return float(v)

    @field_validator("ipo_date", "subscription_start", "subscription_end", "value_updated_at")
    @classmethod
    def _iso_date(cls, v):
        if v in (None, ""):
            return None
        try:
            _date.fromisoformat(v)
        except ValueError as exc:
            raise ValueError("Datum muss ISO YYYY-MM-DD sein") from exc
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


def _value_change(entry, estimate):
    if entry is None or estimate is None or entry <= 0:
        return None, None
    diff = round(estimate - entry, 2)
    return diff, round(diff / entry * 100, 2)


def _serialize(doc: dict) -> dict:
    ca = doc.get("created_at")
    ua = doc.get("updated_at")
    change_eur, change_pct = _value_change(doc.get("entry_price_eur"), doc.get("estimated_value_eur"))
    return {
        "entry_price_eur": doc.get("entry_price_eur"),
        "estimated_value_eur": doc.get("estimated_value_eur"),
        "value_updated_at": doc.get("value_updated_at"),
        "value_change_eur": change_eur,
        "value_change_pct": change_pct,
        "id": str(doc["_id"]),
        "company_name": doc.get("company_name"),
        "ticker_proposed": doc.get("ticker_proposed"),
        "isin": doc.get("isin"),
        "exchange": doc.get("exchange"),
        "market": doc.get("market"),
        "sector": doc.get("sector"),
        "status": doc.get("status", "upcoming"),
        "ipo_date": doc.get("ipo_date"),
        "expected_ipo_window": doc.get("expected_ipo_window"),
        "subscription_start": doc.get("subscription_start"),
        "subscription_end": doc.get("subscription_end"),
        "price_range_low": doc.get("price_range_low"),
        "price_range_high": doc.get("price_range_high"),
        "price_currency": doc.get("price_currency", "EUR"),
        "valuation_last_private": doc.get("valuation_last_private"),
        "min_investment_eur": doc.get("min_investment_eur"),
        "lot_size": int(doc.get("lot_size", 1)),
        "prospectus_url": doc.get("prospectus_url"),
        "description": doc.get("description"),
        "is_visible": bool(doc.get("is_visible", True)),
        "is_manual_override": bool(doc.get("is_manual_override", True)),
        "display_order": doc.get("display_order"),
        "external_key": doc.get("external_key"),
        "source": doc.get("source", "manual"),
        "created_at": ca.isoformat() if isinstance(ca, datetime) else ca,
        "updated_at": ua.isoformat() if isinstance(ua, datetime) else ua,
    }


def _oid_or_404(ipo_id: str) -> ObjectId:
    if not ObjectId.is_valid(ipo_id):
        raise HTTPException(status_code=404, detail="IPO nicht gefunden")
    return ObjectId(ipo_id)


def _default_external_key(payload: IpoCatalogCreate) -> str:
    if payload.isin:
        return f"isin:{payload.isin}"
    return (
        f"manual:{payload.ticker_proposed or 'x'}:{payload.ipo_date or 'nodate'}"
        f":{payload.company_name[:40]}"
    )


# ─── Public: Customer Read ──────────────────────────────────────────────
@public_router.get("/catalog")
async def list_visible_ipos(user: dict = Depends(get_current_user)):
    """
    is_visible=true AND status NOT IN (listed, cancelled).
    Sort: display_order DESC (nulls last), ipo_date ASC.
    """
    cursor = db.ipo_catalog.find(
        {
            "is_visible": True,
            "status": {"$nin": ["listed", "cancelled"]},
        }
    ).sort([("display_order", -1), ("ipo_date", 1)])
    return [await _with_eur(_serialize(doc)) async for doc in cursor]


async def _with_eur(item: dict) -> dict:
    """Adds EUR equivalents of original IPO price/valuation figures (originals kept)."""
    from services.fx_service import eur_rate, fx_meta
    ccy = item.get("price_currency")
    keys = ("price_range_low", "price_range_high", "valuation_last_private")
    if all(item.get(k) is None for k in keys):
        return item
    info = await eur_rate(ccy) if ccy else None
    for k in keys:
        v = item.get(k)
        item[f"{k}_eur"] = round(float(v) / info["rate"], 2) if info and v is not None else None
    item["fx"] = fx_meta(info, ccy)
    item["fx_status"] = "ok" if info else "fx_unavailable"
    return item


# ─── Internal Helper: Katalog-Lookup für ipo_requests-Validation ────────
async def get_investable_ipo_by_id(ipo_id: str) -> dict:
    """
    Wird von routes/ipo_requests.py verwendet, um `ipo_id` beim Kunden-Write
    gegen den Mongo-Katalog zu validieren (statt gegen Supabase REST).
    Wirft HTTP 404 wenn nicht existiert oder nicht sichtbar.
    """
    if not ObjectId.is_valid(ipo_id):
        raise HTTPException(status_code=404, detail="IPO nicht gefunden oder nicht sichtbar")
    doc = await db.ipo_catalog.find_one({"_id": ObjectId(ipo_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="IPO nicht gefunden oder nicht sichtbar")
    if not doc.get("is_visible"):
        raise HTTPException(status_code=404, detail="IPO nicht gefunden oder nicht sichtbar")
    return doc


# ─── Admin CRUD ─────────────────────────────────────────────────────────
@admin_router.get("/catalog")
async def admin_list_ipos(_admin: dict = Depends(require_admin)):
    """Alle Einträge (inkl. listed/cancelled/hidden) für Admin-Übersicht."""
    cursor = db.ipo_catalog.find({}).sort(
        [("ipo_date", 1), ("company_name", 1)]
    )
    return [_serialize(doc) async for doc in cursor]


@admin_router.post("/catalog", status_code=201)
async def admin_create_ipo(
    payload: IpoCatalogCreate,
    _admin: dict = Depends(require_admin),
):
    now = datetime.now(timezone.utc)
    doc = payload.model_dump()
    if not doc.get("external_key"):
        doc["external_key"] = _default_external_key(payload)
    doc.update({"created_at": now, "updated_at": now})
    try:
        result = await db.ipo_catalog.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail="IPO mit diesem external_key existiert bereits",
        )
    doc["_id"] = result.inserted_id
    return _serialize(doc)


@admin_router.patch("/catalog/{ipo_id}")
async def admin_update_ipo(
    ipo_id: str,
    payload: IpoCatalogUpdate,
    _admin: dict = Depends(require_admin),
):
    oid = _oid_or_404(ipo_id)
    changes = payload.model_dump(exclude_unset=True)

    # Cross-Field-Sanity mit ggf. bereits gespeicherten Werten
    if not changes:
        existing = await db.ipo_catalog.find_one({"_id": oid})
        if not existing:
            raise HTTPException(status_code=404, detail="IPO nicht gefunden")
        return _serialize(existing)

    existing = await db.ipo_catalog.find_one({"_id": oid})
    if not existing:
        raise HTTPException(status_code=404, detail="IPO nicht gefunden")

    merged = {**existing, **changes}
    p_low = merged.get("price_range_low")
    p_high = merged.get("price_range_high")
    if p_low is not None and p_high is not None and p_low > p_high:
        raise HTTPException(
            status_code=422,
            detail="price_range_low darf nicht größer als price_range_high sein",
        )
    s_start = merged.get("subscription_start")
    s_end = merged.get("subscription_end")
    if s_start and s_end and s_start > s_end:
        raise HTTPException(
            status_code=422,
            detail="subscription_start darf nicht nach subscription_end liegen",
        )

    changes["updated_at"] = datetime.now(timezone.utc)
    result = await db.ipo_catalog.find_one_and_update(
        {"_id": oid},
        {"$set": changes},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="IPO nicht gefunden")
    return _serialize(result)


@admin_router.delete("/catalog/{ipo_id}", status_code=204)
async def admin_delete_ipo(
    ipo_id: str,
    _admin: dict = Depends(require_admin),
):
    oid = _oid_or_404(ipo_id)
    result = await db.ipo_catalog.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="IPO nicht gefunden")
    return None


# ─── SYNC · Externe Quellen → Mongo (Session 82.05 · refactor 82.06) ─────
#
# Die Fetch-, Parsing-, Upsert- und Manual-Override-Logik lebt jetzt in
# `services/ipo_sync.py`. Diese Route delegiert lediglich — Cron und Admin
# rufen dieselbe Funktion auf. Keine Parallel-Implementierung.
#


@admin_router.post("/catalog/sync")
async def admin_sync_ipo_catalog(_admin: dict = Depends(require_admin)):
    """
    Manueller Admin-Sync (Trigger=admin). Idempotent, source-isoliert,
    Manual-Override wird respektiert. Delegiert an services/ipo_sync.
    """
    return await sync_ipo_catalog(db, trigger="admin")


@admin_router.get("/catalog/sync/status")
async def admin_ipo_sync_status(_admin: dict = Depends(require_admin)):
    """Timestamp + kompakter Report des letzten Sync-Laufs."""
    result = await get_last_sync_status(db)
    return result or {"last_run_at": None, "report": None}


@admin_router.get("/catalog/sync/history")
async def admin_ipo_sync_history(
    limit: int = 30,
    _admin: dict = Depends(require_admin),
):
    """Letzte N Sync-Runs (max 30) für Admin-Timeline. Session 82.14."""
    await ensure_history_index(db)  # idempotent
    return {"runs": await get_recent_sync_runs(db, limit=limit)}


@admin_router.get("/catalog/sync/history.csv")
async def admin_ipo_sync_history_csv(
    limit: int = 30,
    _admin: dict = Depends(require_admin),
):
    """CSV-Export der letzten Sync-Runs (Session 82.15). Read-only."""
    import csv
    import io
    from datetime import date as _dt_date
    from fastapi.responses import StreamingResponse

    limit = max(1, min(int(limit or 30), 30))
    runs = await get_recent_sync_runs(db, limit=limit)

    def _csv_safe(value):
        """CSV-Injection-Protection: prefix Formeln mit Apostroph."""
        if value is None:
            return ""
        s = str(value)
        if s and s[0] in ("=", "+", "-", "@", "\t", "\r"):
            return "'" + s
        return s

    headers = [
        "run_id", "started_at", "finished_at", "duration_ms", "trigger",
        "status", "euronext_status", "nasdaq_status", "stockanalysis_status",
        "us_source_used", "fetched", "inserted", "updated", "unchanged",
        "skipped_manual_override", "skipped_duplicate", "skipped_conflict",
        "skipped_invalid", "error_count", "errors_summary",
    ]
    buf = io.StringIO()
    # BOM für Excel-DE + Semikolon-Separator
    buf.write("\ufeff")
    writer = csv.writer(buf, delimiter=";", quoting=csv.QUOTE_MINIMAL)
    writer.writerow(headers)
    for r in runs:
        writer.writerow([
            _csv_safe(r.get("id")),
            _csv_safe(r.get("started_at")),
            _csv_safe(r.get("finished_at")),
            _csv_safe(r.get("duration_ms")),
            _csv_safe(r.get("trigger")),
            _csv_safe(r.get("status")),
            _csv_safe(r.get("euronext_status")),
            _csv_safe(r.get("nasdaq_status")),
            _csv_safe(r.get("stockanalysis_status")),
            _csv_safe(r.get("us_source_used")),
            _csv_safe(r.get("fetched")),
            _csv_safe(r.get("inserted")),
            _csv_safe(r.get("updated")),
            _csv_safe(r.get("unchanged")),
            _csv_safe(r.get("skipped_manual_override")),
            _csv_safe(r.get("skipped_duplicate")),
            _csv_safe(r.get("skipped_conflict") or 0),
            _csv_safe(r.get("skipped_invalid")),
            _csv_safe(r.get("error_count")),
            _csv_safe(" | ".join((r.get("errors_summary") or [])[:5])),
        ])
    filename = f"ipo-sync-history-{_dt_date.today().isoformat()}.csv"
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


async def ensure_indexes():
    """
    Idempotente Indizes:
      - external_key unique sparse (Duplicate-Guard, Legacy-kompatibel)
      - is_visible + status für Customer-Read
      - ipo_date für Sort
    """
    await db.ipo_catalog.create_index(
        [("external_key", 1)],
        unique=True,
        sparse=True,
        name="external_key_unique_sparse",
    )
    await db.ipo_catalog.create_index(
        [("is_visible", 1), ("status", 1), ("display_order", -1), ("ipo_date", 1)],
        name="visible_status_order",
    )
