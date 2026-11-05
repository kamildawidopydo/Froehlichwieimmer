"""Stock-Research-Routen (Session 78.3 — Analyst Data Feed).

Modular router with admin CRUD, CSV import (preview + confirm), publish workflow,
and a strict read-only public endpoint. Uses the same DB handle exported by
`server.py` and the `require_admin` dependency defined there.

No auto-computed data other than `upside_pct = ((target - current) / current) * 100`.
No fake analysts, no fake targets, no fake sources.
"""
from __future__ import annotations

import csv
import hashlib
import io
import logging
import re
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple

from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field, validator

from server import db, require_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["stock-research"])

# ---------------------------------------------------------------------------
# Constants & validation
# ---------------------------------------------------------------------------

MAX_UPLOAD_BYTES = 512 * 1024  # 512 KB — CSV should be small
ALLOWED_CURRENCIES = {"EUR", "USD", "GBP", "CHF", "JPY", "CAD", "AUD", "SEK", "NOK", "DKK"}
FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")

# Public read cap
PUBLIC_LIMIT_MAX = 12


def _sanitize_cell(value: Any) -> str:
    """Strip CSV formula injection prefixes and control chars.

    Also enforces a hard length cap to avoid pathological rows.
    """
    if value is None:
        return ""
    s = str(value).strip()
    if not s:
        return ""
    # Neutralise potential spreadsheet formula prefixes
    if s[:1] in FORMULA_PREFIXES:
        s = "'" + s
    # Strip control characters (except common whitespace already trimmed)
    s = "".join(ch for ch in s if ch >= " " or ch == "\t")
    return s[:400]


def _parse_price(value: Any, *, field: str) -> float:
    if value is None or str(value).strip() == "":
        raise ValueError(f"{field} fehlt")
    raw = str(value).strip()
    # Accept German ("1.234,56") and international ("1,234.56") notation.
    if "," in raw and "." in raw:
        # Assume last separator is decimal.
        if raw.rfind(",") > raw.rfind("."):
            raw = raw.replace(".", "").replace(",", ".")
        else:
            raw = raw.replace(",", "")
    elif "," in raw:
        raw = raw.replace(",", ".")
    try:
        num = float(raw)
    except (TypeError, ValueError):
        raise ValueError(f"{field} ist keine gültige Zahl")
    if num <= 0:
        raise ValueError(f"{field} muss größer als 0 sein")
    if num > 1_000_000:
        raise ValueError(f"{field} ist unrealistisch groß")
    return round(num, 4)


_DATE_FORMATS = ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y", "%Y/%m/%d")


def _parse_date(value: Any, *, field: str) -> datetime:
    if value is None or str(value).strip() == "":
        raise ValueError(f"{field} fehlt")
    raw = str(value).strip()[:20]
    # Try ISO first (with optional time)
    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except ValueError:
        pass
    for fmt in _DATE_FORMATS:
        try:
            dt = datetime.strptime(raw, fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    raise ValueError(f"{field} ist kein gültiges Datum (erlaubt: YYYY-MM-DD oder DD.MM.YYYY)")


def _parse_currency(value: Any) -> str:
    raw = _sanitize_cell(value).upper()
    if not raw:
        raise ValueError("Währung fehlt")
    if raw not in ALLOWED_CURRENCIES:
        raise ValueError(f"Währung ist ungültig (erlaubt: {', '.join(sorted(ALLOWED_CURRENCIES))})")
    return raw


_URL_RE = re.compile(r"^https?://[^\s<>\"']{4,300}$", re.IGNORECASE)


def _parse_url(value: Any) -> Optional[str]:
    raw = _sanitize_cell(value)
    if not raw:
        return None
    if not _URL_RE.match(raw):
        raise ValueError("Quellen-URL ist ungültig (nur http/https erlaubt)")
    return raw


def _duplicate_key(doc: Dict[str, Any]) -> str:
    """Stable duplicate fingerprint — see spec §9."""
    parts = [
        (doc.get("ticker") or "").upper(),
        (doc.get("research_house") or "").lower(),
        (doc.get("analyst") or "").lower(),
        _iso_date(doc.get("research_date")),
        f"{float(doc.get('target_price') or 0):.4f}",
    ]
    raw = "|".join(parts)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _iso_date(value: Any) -> str:
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, str):
        return value[:10]
    return ""


# ---------------------------------------------------------------------------
# Serializer
# ---------------------------------------------------------------------------


def _upside(current: float, target: float) -> Optional[float]:
    try:
        c = float(current)
        t = float(target)
        if c <= 0:
            return None
        return round(((t - c) / c) * 100.0, 2)
    except (TypeError, ValueError, ZeroDivisionError):
        return None


def _upside_normalized(doc: Dict[str, Any]) -> tuple[Optional[float], Optional[Dict[str, Any]]]:
    """Session 78.11 — return (upside_pct, fx_meta) or (None, None) if currency
    normalisation is not possible. Reads a **precomputed** fx_rate stored on
    the row by `_sync_analysts` (see routes/stock_research_sync.py). No async
    call at serialize time — avoids event-loop deadlocks.
    """
    cur = doc.get("current_price")
    tgt = doc.get("target_price")
    if not isinstance(cur, (int, float)) or cur <= 0 or not isinstance(tgt, (int, float)) or tgt <= 0:
        return None, None
    price_ccy = (doc.get("current_price_currency") or doc.get("currency") or "").upper()
    target_ccy = (doc.get("target_price_currency") or doc.get("currency") or "").upper()
    if not price_ccy or not target_ccy:
        return None, None
    if price_ccy == target_ccy:
        return round(((tgt - cur) / cur) * 100.0, 2), None
    fx_rate = doc.get("fx_rate")
    if isinstance(fx_rate, (int, float)) and fx_rate > 0:
        tgt_norm = tgt * fx_rate
        return round(((tgt_norm - cur) / cur) * 100.0, 2), {
            "fx_source": doc.get("fx_source") or "yahoo-finance",
            "fx_rate": fx_rate,
            "fx_pair": f"{target_ccy}{price_ccy}",
            "normalized_target": round(tgt_norm, 4),
            "target_ccy": target_ccy,
            "price_ccy": price_ccy,
            "fx_updated_at": _iso(doc.get("fx_updated_at")),
        }
    return None, {"fx_status": "unavailable", "target_ccy": target_ccy, "price_ccy": price_ccy}


def _iso(dt: Any) -> Optional[str]:
    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat()
    if isinstance(dt, str):
        return dt
    return None


def serialize_admin(doc: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(doc.get("_id")),
        "company_name": doc.get("company_name") or "",
        "ticker": doc.get("ticker") or "",
        "current_price": doc.get("current_price"),
        "target_price": doc.get("target_price"),
        "currency": doc.get("currency") or "EUR",
        "upside_pct": _upside(doc.get("current_price"), doc.get("target_price")),
        "analyst": doc.get("analyst") or "",
        "research_house": doc.get("research_house") or "",
        "rating": doc.get("rating") or "",
        "source_name": doc.get("source_name") or "",
        "source_url": doc.get("source_url"),
        "research_date": _iso(doc.get("research_date")),
        "notes": doc.get("notes") or "",
        "published": bool(doc.get("published", False)),
        "created_at": _iso(doc.get("created_at")),
        "updated_at": _iso(doc.get("updated_at")),
        "created_by": doc.get("created_by") or None,
    }


def _is_stale(research_date: Any, days: int = 90) -> bool:
    """Analyst rows older than `days` are surfaced as stale (not deleted)."""
    if not isinstance(research_date, datetime):
        return False
    if research_date.tzinfo is None:
        research_date = research_date.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - research_date) > timedelta(days=days)


def serialize_public(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Public shape — no internal fields.

    Session 78.7 adds additive fields only (`price_updated_at`,
    `research_updated_at`, `price_is_delayed`, `is_stale`, `ingestion_source`)
    without altering existing keys — response is backward-compatible.
    Session 78.11: `upside_pct` wird nur zurückgegeben, wenn `current_price`
    und `target_price` in derselben Währung sind ODER ein FX-Kurs verfügbar
    ist. Sonst `null` + `currency_normalization_pending=true`.
    """
    upside, fx = _upside_normalized(doc)
    return {
        "id": str(doc.get("_id")),
        "company_name": doc.get("company_name") or "",
        "ticker": doc.get("ticker") or "",
        "current_price": doc.get("current_price"),
        "current_price_currency": doc.get("current_price_currency") or doc.get("currency") or "",
        "target_price": doc.get("target_price"),
        "target_price_currency": doc.get("target_price_currency") or doc.get("currency") or "",
        "currency": doc.get("currency") or "EUR",  # legacy alias
        "upside_pct": upside,
        "currency_normalization_pending": upside is None and isinstance(doc.get("current_price"), (int, float)) and isinstance(doc.get("target_price"), (int, float)),
        "fx": fx,
        "analyst": doc.get("analyst") or "",
        "research_house": doc.get("research_house") or "",
        "rating": doc.get("rating") or "",
        "source_name": doc.get("source_name") or "",
        "source_url": doc.get("source_url"),
        "research_date": _iso(doc.get("research_date")),
        # Additive (Session 78.7) — safe to add, all consumers ignore unknown keys.
        "price_updated_at": _iso(doc.get("price_updated_at")),
        "research_updated_at": _iso(doc.get("updated_at")),
        "price_is_delayed": bool(doc.get("price_is_delayed", False)),
        "is_stale": _is_stale(doc.get("research_date")),
        "ingestion_source": doc.get("ingestion_source") or "manual",
        # Session 78.8 — distinguish provider-consensus rows from named-analyst rows.
        "record_type": doc.get("record_type") or "analyst_research",
    }


# ---------------------------------------------------------------------------
# Pydantic input models (manual admin form)
# ---------------------------------------------------------------------------


class StockResearchInput(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=200)
    ticker: str = Field(..., min_length=1, max_length=20)
    current_price: float = Field(..., gt=0, le=1_000_000)
    target_price: float = Field(..., gt=0, le=1_000_000)
    currency: str = Field(default="EUR", min_length=3, max_length=3)
    analyst: Optional[str] = Field(default=None, max_length=200)
    research_house: Optional[str] = Field(default=None, max_length=200)
    rating: Optional[str] = Field(default=None, max_length=60)
    source_name: str = Field(..., min_length=1, max_length=200)
    source_url: Optional[str] = Field(default=None, max_length=400)
    research_date: str = Field(..., min_length=8, max_length=25)
    notes: Optional[str] = Field(default=None, max_length=1000)
    published: bool = False

    @validator("company_name", "ticker", "analyst", "research_house", "rating", "source_name", "notes", pre=True)
    def _sanitize(cls, v):
        return _sanitize_cell(v)

    @validator("ticker")
    def _upper_ticker(cls, v):
        return (v or "").upper()

    @validator("currency")
    def _valid_currency(cls, v):
        v = (v or "").upper()
        if v not in ALLOWED_CURRENCIES:
            raise ValueError(f"Währung ist ungültig (erlaubt: {', '.join(sorted(ALLOWED_CURRENCIES))})")
        return v

    @validator("source_url")
    def _valid_url(cls, v):
        if v is None or str(v).strip() == "":
            return None
        return _parse_url(v)

    @validator("research_date")
    def _valid_research_date(cls, v):
        _parse_date(v, field="Research-Datum")
        return v


class BulkAction(BaseModel):
    ids: List[str] = Field(..., min_items=1, max_items=200)
    action: str  # "publish" | "unpublish" | "delete"


class ImportConfirm(BaseModel):
    rows: List[Dict[str, Any]]  # already-validated rows returned from /preview


# ---------------------------------------------------------------------------
# Core doc helpers
# ---------------------------------------------------------------------------


def _payload_to_doc(payload: StockResearchInput, *, existing: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    research_dt = _parse_date(payload.research_date, field="Research-Datum")
    doc: Dict[str, Any] = {
        "company_name": payload.company_name,
        "ticker": payload.ticker,
        "current_price": float(payload.current_price),
        "target_price": float(payload.target_price),
        "currency": payload.currency,
        "analyst": payload.analyst or None,
        "research_house": payload.research_house or None,
        "rating": payload.rating or None,
        "source_name": payload.source_name,
        "source_url": payload.source_url,
        "research_date": research_dt,
        "notes": payload.notes or None,
        "published": bool(payload.published),
        "updated_at": now,
    }
    if existing is None:
        doc["created_at"] = now
    doc["dedupe_key"] = _duplicate_key(doc)
    return doc


def _publish_guard(doc: Dict[str, Any]) -> None:
    """Enforce spec §5 — no publish without source & date."""
    if not (doc.get("source_name") or "").strip():
        raise HTTPException(
            status_code=400,
            detail="Für die Veröffentlichung ist eine nachvollziehbare Research-Quelle erforderlich.",
        )
    if not doc.get("research_date"):
        raise HTTPException(
            status_code=400,
            detail="Für die Veröffentlichung ist ein Research-Datum erforderlich.",
        )
    if not doc.get("current_price") or not doc.get("target_price"):
        raise HTTPException(
            status_code=400,
            detail="Aktueller Kurs und Kursziel müssen valide sein.",
        )


async def _ensure_indexes_once() -> None:
    if getattr(_ensure_indexes_once, "_done", False):
        return
    try:
        await db.stock_research.create_index("dedupe_key", unique=False, sparse=True)
        await db.stock_research.create_index([("published", 1), ("research_date", -1)])
        await db.stock_research.create_index([("ticker", 1)])
    except Exception as exc:  # noqa: BLE001 — indexing is best-effort
        logger.warning("stock_research index setup failed: %s", exc)
    _ensure_indexes_once._done = True  # type: ignore[attr-defined]


# ---------------------------------------------------------------------------
# Public endpoint
# ---------------------------------------------------------------------------


@router.get("/stock-research")
async def public_stock_research(limit: int = Query(default=8, ge=1, le=PUBLIC_LIMIT_MAX)):
    await _ensure_indexes_once()
    # Schritt 13 — Sicherheitsnetz: pro Ticker darf höchstens EINE
    # provider_consensus-Row nach außen sichtbar sein. Falls durch einen
    # Fehler mehrere published provider_consensus-Rows desselben Tickers in
    # der DB liegen, zeigt das öffentliche API nur die jüngste (nach
    # research_date, tiebreak fetched_at) an. Manuell gepflegte Rows
    # (record_type != "provider_consensus") bleiben unverändert und können
    # weiterhin mehrfach pro Ticker erscheinen.
    #
    # Wir holen bewusst mehr als `limit` Rows, dedupieren dann in Python und
    # kürzen anschließend zurück auf `limit`. Der Overfetch-Faktor ist klein
    # (limit ≤ 12, worst case × 3 Duplikate) und vermeidet einen komplexen
    # aggregation pipeline.
    overfetch = max(limit * 3, limit + 10)
    cursor = (
        db.stock_research
        .find({"published": True})
        .sort([("research_date", -1), ("fetched_at", -1), ("_id", -1)])
        .limit(overfetch)
    )
    seen_consensus_tickers: set[str] = set()
    items: List[Dict[str, Any]] = []
    latest_updated: Optional[datetime] = None
    async for doc in cursor:
        if len(items) >= limit:
            break
        if doc.get("record_type") == "provider_consensus":
            tk = (doc.get("ticker") or "").upper()
            if tk in seen_consensus_tickers:
                continue
            seen_consensus_tickers.add(tk)
        items.append(serialize_public(doc))
        upd = doc.get("updated_at") or doc.get("created_at")
        if isinstance(upd, datetime) and (latest_updated is None or upd > latest_updated):
            latest_updated = upd
    return {
        "items": items,
        "count": len(items),
        "as_of": _iso(latest_updated),
    }


@router.get("/stock-research/consensus", summary="Analyst-Consensus je Ticker (≥3 validierte Rows)")
async def public_consensus():
    """Aggregiert publizierte Analystenrows zu Median-Kurszielen.

    Wird nur zurückgegeben, wenn pro Ticker mindestens 3 valide, aktuelle
    (nicht stale) Analystenrows vorhanden sind. Median statt Mittelwert, damit
    einzelne Ausreißer den Wert nicht verzerren.

    Session 78.8: Provider-Consensus-Rows (Finnhub etc.) werden aus der
    internen Median-Berechnung ausgeschlossen, um Doppelzählung zu
    vermeiden — diese Rows tragen bereits einen aggregierten Wert.
    """
    await _ensure_indexes_once()
    cutoff = datetime.now(timezone.utc) - timedelta(days=90)
    pipeline = [
        {"$match": {
            "published": True,
            "research_date": {"$gte": cutoff},
            # Exclude provider-consensus rows to prevent double-counting.
            "$or": [
                {"record_type": {"$exists": False}},
                {"record_type": {"$ne": "provider_consensus"}},
            ],
        }},
        {"$group": {
            "_id": "$ticker",
            "company_name": {"$last": "$company_name"},
            "currency": {"$last": "$currency"},
            "current_price": {"$last": "$current_price"},
            "price_updated_at": {"$last": "$price_updated_at"},
            "targets": {"$push": "$target_price"},
            "analyst_count": {"$sum": 1},
            "as_of": {"$max": "$updated_at"},
        }},
        {"$match": {"analyst_count": {"$gte": 3}}},
        {"$sort": {"analyst_count": -1, "_id": 1}},
    ]
    items: List[Dict[str, Any]] = []
    async for g in db.stock_research.aggregate(pipeline):
        targets = sorted(t for t in (g.get("targets") or []) if isinstance(t, (int, float)) and t > 0)
        if len(targets) < 3:
            continue
        n = len(targets)
        median = targets[n // 2] if n % 2 else round((targets[n // 2 - 1] + targets[n // 2]) / 2, 4)
        current = g.get("current_price")
        upside_median = None
        if isinstance(current, (int, float)) and current > 0:
            upside_median = round(((median - current) / current) * 100.0, 2)
        items.append({
            "ticker": g.get("_id"),
            "company_name": g.get("company_name") or "",
            "currency": g.get("currency") or "EUR",
            "current_price": current,
            "price_updated_at": _iso(g.get("price_updated_at")),
            "analyst_count": g.get("analyst_count"),
            "median_target": median,
            "target_min": targets[0],
            "target_max": targets[-1],
            "spread": round(targets[-1] - targets[0], 4),
            "upside_percent": upside_median,
            "as_of": _iso(g.get("as_of")),
        })
    return {"items": items, "count": len(items)}


# ---------------------------------------------------------------------------
# Admin endpoints — list / create / update / delete
# ---------------------------------------------------------------------------


@router.get("/admin/stock-research")
async def admin_list(_user: dict = Depends(require_admin)):
    await _ensure_indexes_once()
    items: List[Dict[str, Any]] = []
    async for doc in db.stock_research.find({}).sort([("updated_at", -1)]).limit(500):
        items.append(serialize_admin(doc))
    return {"items": items, "count": len(items)}


@router.post("/admin/stock-research")
async def admin_create(payload: StockResearchInput, user: dict = Depends(require_admin)):
    await _ensure_indexes_once()
    doc = _payload_to_doc(payload)
    if doc["published"]:
        _publish_guard(doc)
    doc["created_by"] = user.get("email") or user.get("id")
    # Duplicate check
    dup = await db.stock_research.find_one({"dedupe_key": doc["dedupe_key"]})
    if dup is not None:
        raise HTTPException(status_code=409, detail="Datensatz existiert bereits (identischer Ticker, Analyst, Datum, Kursziel).")
    res = await db.stock_research.insert_one(doc)
    saved = await db.stock_research.find_one({"_id": res.inserted_id})
    return serialize_admin(saved)


@router.patch("/admin/stock-research/{item_id}")
async def admin_update(item_id: str, payload: StockResearchInput, _user: dict = Depends(require_admin)):
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Ungültige ID")
    existing = await db.stock_research.find_one({"_id": ObjectId(item_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Datensatz nicht gefunden")
    doc = _payload_to_doc(payload, existing=existing)
    if doc["published"]:
        _publish_guard(doc)
    # Duplicate check excluding self
    dup = await db.stock_research.find_one({
        "dedupe_key": doc["dedupe_key"],
        "_id": {"$ne": ObjectId(item_id)},
    })
    if dup is not None:
        raise HTTPException(status_code=409, detail="Ein anderer Datensatz mit identischen Feldern existiert bereits.")
    await db.stock_research.update_one({"_id": ObjectId(item_id)}, {"$set": doc})
    saved = await db.stock_research.find_one({"_id": ObjectId(item_id)})
    return serialize_admin(saved)


@router.delete("/admin/stock-research/{item_id}")
async def admin_delete(item_id: str, _user: dict = Depends(require_admin)):
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Ungültige ID")
    res = await db.stock_research.delete_one({"_id": ObjectId(item_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Datensatz nicht gefunden")
    return {"ok": True, "deleted": item_id}


@router.post("/admin/stock-research/{item_id}/publish")
async def admin_publish(item_id: str, _user: dict = Depends(require_admin)):
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Ungültige ID")
    existing = await db.stock_research.find_one({"_id": ObjectId(item_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Datensatz nicht gefunden")
    _publish_guard(existing)
    now = datetime.now(timezone.utc)
    await db.stock_research.update_one(
        {"_id": ObjectId(item_id)}, {"$set": {"published": True, "updated_at": now}},
    )
    saved = await db.stock_research.find_one({"_id": ObjectId(item_id)})
    return serialize_admin(saved)


@router.post("/admin/stock-research/{item_id}/unpublish")
async def admin_unpublish(item_id: str, _user: dict = Depends(require_admin)):
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Ungültige ID")
    existing = await db.stock_research.find_one({"_id": ObjectId(item_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Datensatz nicht gefunden")
    now = datetime.now(timezone.utc)
    await db.stock_research.update_one(
        {"_id": ObjectId(item_id)}, {"$set": {"published": False, "updated_at": now}},
    )
    saved = await db.stock_research.find_one({"_id": ObjectId(item_id)})
    return serialize_admin(saved)


# ---------------------------------------------------------------------------
# Bulk actions
# ---------------------------------------------------------------------------


@router.post("/admin/stock-research/bulk")
async def admin_bulk(payload: BulkAction, _user: dict = Depends(require_admin)):
    action = (payload.action or "").lower()
    if action not in {"publish", "unpublish", "delete"}:
        raise HTTPException(status_code=400, detail="Unbekannte Aktion")
    valid_ids = [ObjectId(x) for x in payload.ids if ObjectId.is_valid(x)]
    if not valid_ids:
        raise HTTPException(status_code=400, detail="Keine gültigen IDs")

    if action == "delete":
        res = await db.stock_research.delete_many({"_id": {"$in": valid_ids}})
        return {"ok": True, "affected": res.deleted_count}

    if action == "publish":
        # Validate all first (spec §11 — bulk publish revalidation)
        failed: List[Dict[str, str]] = []
        async for doc in db.stock_research.find({"_id": {"$in": valid_ids}}):
            try:
                _publish_guard(doc)
            except HTTPException as exc:
                failed.append({"id": str(doc["_id"]), "reason": exc.detail})
        if failed:
            raise HTTPException(status_code=400, detail={"message": "Bulk-Publish fehlgeschlagen", "failed": failed})
        now = datetime.now(timezone.utc)
        res = await db.stock_research.update_many(
            {"_id": {"$in": valid_ids}}, {"$set": {"published": True, "updated_at": now}},
        )
        return {"ok": True, "affected": res.modified_count}

    # unpublish
    now = datetime.now(timezone.utc)
    res = await db.stock_research.update_many(
        {"_id": {"$in": valid_ids}}, {"$set": {"published": False, "updated_at": now}},
    )
    return {"ok": True, "affected": res.modified_count}


# ---------------------------------------------------------------------------
# CSV import — preview + confirm
# ---------------------------------------------------------------------------


CSV_REQUIRED_COLUMNS = ["company_name", "ticker", "current_price", "target_price", "currency", "source_name", "research_date"]
CSV_OPTIONAL_COLUMNS = ["analyst", "research_house", "rating", "source_url", "notes", "published"]
CSV_ALL_COLUMNS = CSV_REQUIRED_COLUMNS + CSV_OPTIONAL_COLUMNS


def _sniff_reader(text: str) -> csv.DictReader:
    sample = text[:2048]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
    except csv.Error:
        dialect = csv.excel
        dialect.delimiter = ","
    return csv.DictReader(io.StringIO(text), dialect=dialect)


def _validate_csv_row(idx: int, row: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], List[str], List[str]]:
    """Return (parsed_doc | None, errors, warnings)."""
    errors: List[str] = []
    warnings: List[str] = []
    out: Dict[str, Any] = {}

    # Required strings
    company = _sanitize_cell(row.get("company_name"))
    if not company:
        errors.append("Unternehmen fehlt")
    else:
        out["company_name"] = company

    ticker = _sanitize_cell(row.get("ticker")).upper()
    if not ticker:
        errors.append("Ticker fehlt")
    else:
        out["ticker"] = ticker

    source = _sanitize_cell(row.get("source_name"))
    if not source:
        errors.append("Quelle fehlt")
    else:
        out["source_name"] = source

    # Numeric prices
    try:
        out["current_price"] = _parse_price(row.get("current_price"), field="Aktueller Kurs")
    except ValueError as exc:
        errors.append(str(exc))
    try:
        out["target_price"] = _parse_price(row.get("target_price"), field="Kursziel")
    except ValueError as exc:
        errors.append(str(exc))

    # Currency
    try:
        out["currency"] = _parse_currency(row.get("currency"))
    except ValueError as exc:
        errors.append(str(exc))

    # Date
    try:
        dt = _parse_date(row.get("research_date"), field="Research-Datum")
        out["research_date"] = dt.date().isoformat()
    except ValueError as exc:
        errors.append(str(exc))

    # Optional fields
    for k in ("analyst", "research_house", "rating", "notes"):
        val = _sanitize_cell(row.get(k))
        out[k] = val or None

    # Optional URL
    try:
        out["source_url"] = _parse_url(row.get("source_url"))
    except ValueError as exc:
        warnings.append(str(exc))
        out["source_url"] = None

    # Published flag from CSV — spec §10 always imports as draft
    pub_raw = _sanitize_cell(row.get("published")).lower()
    if pub_raw in {"true", "1", "yes", "y", "ja"}:
        warnings.append("CSV-Feld published=true wird ignoriert (Draft-First-Regel)")
    out["published"] = False

    if errors:
        return None, errors, warnings
    return out, errors, warnings


@router.post("/admin/stock-research/import/preview")
async def import_preview(
    file: UploadFile = File(...),
    _user: dict = Depends(require_admin),
):
    # Size guard — read up to MAX_UPLOAD_BYTES + 1 to detect over-limit
    raw = await file.read(MAX_UPLOAD_BYTES + 1)
    if not raw:
        raise HTTPException(status_code=400, detail="CSV-Datei ist leer.")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"CSV-Datei überschreitet {MAX_UPLOAD_BYTES // 1024} KB.")

    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            text = raw.decode("latin-1")
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="CSV ist nicht in UTF-8 oder Latin-1 kodiert.")

    reader = _sniff_reader(text)
    columns = [c.strip() for c in (reader.fieldnames or [])]
    if not columns:
        raise HTTPException(status_code=400, detail="CSV enthält keine Kopfzeile.")
    missing = [c for c in CSV_REQUIRED_COLUMNS if c not in columns]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Pflichtspalten fehlen: {', '.join(missing)}",
        )
    unknown = [c for c in columns if c not in CSV_ALL_COLUMNS]

    await _ensure_indexes_once()
    valid_rows: List[Dict[str, Any]] = []
    all_rows: List[Dict[str, Any]] = []
    for idx, row in enumerate(reader, start=2):  # header is line 1
        parsed, errors, warnings = _validate_csv_row(idx, row)
        entry: Dict[str, Any] = {"line": idx, "errors": errors, "warnings": warnings}
        if parsed is not None:
            # Duplicate detection vs DB
            probe = {
                **parsed,
                "research_date": datetime.fromisoformat(parsed["research_date"]).replace(tzinfo=timezone.utc),
            }
            key = _duplicate_key(probe)
            dup = await db.stock_research.find_one({"dedupe_key": key})
            if dup is not None:
                entry["errors"] = ["Datensatz existiert bereits"]
                entry["preview"] = parsed
            else:
                entry["preview"] = parsed
                entry["dedupe_key"] = key
                valid_rows.append({**parsed, "dedupe_key": key})
        all_rows.append(entry)
        if len(all_rows) > 500:
            raise HTTPException(status_code=413, detail="CSV hat mehr als 500 Zeilen.")

    summary = {
        "total": len(all_rows),
        "valid": len(valid_rows),
        "errors": sum(1 for r in all_rows if r["errors"]),
        "warnings": sum(1 for r in all_rows if r["warnings"] and not r["errors"]),
        "unknown_columns": unknown,
    }
    return {
        "summary": summary,
        "rows": all_rows,  # includes errors & warnings for admin UI
        "importable": valid_rows,  # rows the admin can confirm
    }


@router.post("/admin/stock-research/import/confirm")
async def import_confirm(payload: ImportConfirm, user: dict = Depends(require_admin)):
    await _ensure_indexes_once()
    inserted = 0
    skipped = 0
    now = datetime.now(timezone.utc)
    for row in payload.rows[:500]:
        try:
            model = StockResearchInput(
                company_name=row.get("company_name"),
                ticker=row.get("ticker"),
                current_price=row.get("current_price"),
                target_price=row.get("target_price"),
                currency=row.get("currency"),
                analyst=row.get("analyst"),
                research_house=row.get("research_house"),
                rating=row.get("rating"),
                source_name=row.get("source_name"),
                source_url=row.get("source_url"),
                research_date=row.get("research_date"),
                notes=row.get("notes"),
                published=False,  # spec §10 — always as draft
            )
        except Exception as exc:  # noqa: BLE001
            skipped += 1
            logger.info("csv confirm skip: %s", exc)
            continue
        doc = _payload_to_doc(model)
        doc["created_by"] = user.get("email") or user.get("id")
        # Duplicate check
        dup = await db.stock_research.find_one({"dedupe_key": doc["dedupe_key"]})
        if dup is not None:
            skipped += 1
            continue
        await db.stock_research.insert_one(doc)
        inserted += 1
    return {"ok": True, "inserted": inserted, "skipped": skipped}
