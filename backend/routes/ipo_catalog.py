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

import re
from datetime import datetime, timezone, date as _date, timedelta
from typing import Optional, Literal

import httpx
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator, model_validator
from pymongo.errors import DuplicateKeyError

from server import get_current_user, db, require_admin  # type: ignore[attr-defined]


public_router = APIRouter(prefix="/api/ipo", tags=["ipo-catalog"])
admin_router = APIRouter(prefix="/api/admin/ipo", tags=["admin-ipo-catalog"])


IpoStatus = Literal[
    "upcoming", "open", "priced", "filed", "listed", "postponed", "cancelled"
]
VISIBLE_STATUSES = ("upcoming", "open", "priced", "filed", "postponed")
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

    @field_validator("ipo_date", "subscription_start", "subscription_end")
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

    @field_validator("ipo_date", "subscription_start", "subscription_end")
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


def _serialize(doc: dict) -> dict:
    ca = doc.get("created_at")
    ua = doc.get("updated_at")
    return {
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
    return [_serialize(doc) async for doc in cursor]


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


# ─── SYNC · Externe Quellen → Mongo (Session 82.05) ─────────────────────
#
# Bewusst kompakter Python-native Port der Legacy-Deno-Edge-Function.
# Nur Euronext + Nasdaq (User-Anforderung Phase 3). Kein Delete, kein
# Overwrite von is_manual_override, kein Dual-Write nach Supabase.
#
_USER_AGENT = "kapitalmitte-ipobot/1.0 (+https://finance-platform-v2.emergent.host)"


def _build_external_key(source: str, isin: Optional[str], ticker: Optional[str],
                        ipo_date: Optional[str]) -> str:
    """Identische Regel wie Legacy: isin:{ISIN} bevorzugt, sonst source:ticker:date."""
    if isin:
        return f"isin:{isin.upper()}"
    t = (ticker or "unknown").upper()
    d = ipo_date or "nodate"
    return f"{source}:{t}:{d}"


def _derive_euronext_status(ipo_date: Optional[str]) -> str:
    """Euronext liefert nur Datum → date-based Ableitung, wie im Legacy-Parser."""
    if not ipo_date:
        return "upcoming"
    try:
        d = _date.fromisoformat(ipo_date)
    except ValueError:
        return "upcoming"
    cutoff = _date.today() - timedelta(days=30)
    return "listed" if d <= cutoff else "upcoming"


def _derive_nasdaq_status(bucket: str, ipo_date: Optional[str]) -> str:
    """Nasdaq bucket → Status. Unbekannte bucket-Werte werden geskippt."""
    if bucket == "filed":
        return "filed"
    if bucket == "withdrawn":
        return "cancelled"
    if bucket == "priced":
        return "priced"
    if bucket == "upcoming":
        return _derive_euronext_status(ipo_date)
    return "__skip__"  # unknown bucket → caller skipt Record


def _parse_euronext_date(raw: str) -> Optional[str]:
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})$", raw.strip())
    if not m:
        return None
    d, mo, y = m.groups()
    return f"{y}-{mo.zfill(2)}-{d.zfill(2)}"


def _strip_html(s: str) -> str:
    return re.sub(r"<[^>]+>", "", s).strip()


async def _fetch_euronext() -> list[dict]:
    url = "https://live.euronext.com/en/ipo-showcase"
    async with httpx.AsyncClient(timeout=15.0, headers={"User-Agent": _USER_AGENT}) as c:
        r = await c.get(url)
        if r.status_code != 200:
            raise RuntimeError(f"euronext HTTP {r.status_code}")
        html = r.text
    rows = []
    for tr in re.findall(r"<tr[^>]*>([\s\S]*?)</tr>", html, re.IGNORECASE):
        cells = [_strip_html(td) for td in re.findall(r"<td[^>]*>([\s\S]*?)</td>", tr, re.IGNORECASE)]
        if len(cells) < 6:
            continue
        date_raw, company, ticker, isin, location, market = cells[:6]
        if not company or company.lower() == "company name":
            continue
        if not re.match(r"^\d{1,2}/\d{1,2}/\d{4}$", date_raw):
            continue
        ipo_date = _parse_euronext_date(date_raw)
        rows.append({
            "external_key": _build_external_key("euronext", isin if len(isin) >= 10 else None,
                                                ticker or None, ipo_date),
            "source": "euronext",
            "company_name": company,
            "ticker_proposed": ticker or None,
            "isin": isin.upper() if len(isin) >= 10 else None,
            "exchange": location or None,
            "market": market or None,
            "ipo_date": ipo_date,
            "price_currency": "EUR",
            "auto_status": _derive_euronext_status(ipo_date),
        })
    return rows


def _parse_nasdaq_price(raw: Optional[str]) -> tuple[Optional[float], Optional[float]]:
    if not raw:
        return None, None
    cleaned = re.sub(r"[$,\s]", " ", str(raw)).strip()
    parts = [p.strip() for p in re.split(r"[-–—]", cleaned) if p.strip()]
    try:
        if len(parts) >= 2:
            return float(parts[0]), float(parts[1])
        single = float(cleaned)
        return single, single
    except ValueError:
        return None, None


def _month_periods_around_now() -> list[str]:
    today = _date.today()
    ps = []
    for delta in (-30, 0, 30, 60):
        d = today + timedelta(days=delta)
        ps.append(f"{d.year}-{str(d.month).zfill(2)}")
    return list(dict.fromkeys(ps))


async def _fetch_nasdaq() -> list[dict]:
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; kapitalmitte-ipobot/1.0)",
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://www.nasdaq.com/market-activity/ipos",
        "Origin": "https://www.nasdaq.com",
    }
    seen: dict[str, dict] = {}
    period_errors: list[str] = []
    async with httpx.AsyncClient(timeout=15.0, headers=headers) as c:
        for period in _month_periods_around_now():
            try:
                r = await c.get(f"https://api.nasdaq.com/api/ipo/calendar?date={period}")
                if r.status_code != 200:
                    period_errors.append(f"{period}:HTTP{r.status_code}")
                    continue
                data = (r.json() or {}).get("data") or {}
                for bucket in ("priced", "upcoming", "filed", "withdrawn"):
                    payload = data.get(bucket) or {}
                    rows = payload.get("rows") if isinstance(payload, dict) else payload
                    if not isinstance(rows, list):
                        continue
                    for row in rows:
                        status = _derive_nasdaq_status(bucket, None)
                        company = str(row.get("companyName") or row.get("company_name") or "").strip()
                        if not company:
                            continue
                        ticker = str(row.get("proposedTickerSymbol") or row.get("symbol") or "").strip() or None
                        raw_date = row.get("pricedDate") or row.get("expectedPriceDate") or row.get("ipoDate")
                        ipo_date = None
                        if raw_date:
                            s = str(raw_date).strip()
                            m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})$", s)
                            if m:
                                mo, d, y = m.groups()
                                ipo_date = f"{y}-{mo.zfill(2)}-{d.zfill(2)}"
                            else:
                                iso = re.match(r"^(\d{4})-(\d{2})-(\d{2})", s)
                                if iso:
                                    ipo_date = f"{iso.group(1)}-{iso.group(2)}-{iso.group(3)}"
                        if bucket == "upcoming":
                            status = _derive_euronext_status(ipo_date)
                        if status == "__skip__":
                            continue
                        low, high = _parse_nasdaq_price(row.get("proposedSharePrice") or row.get("sharePrice"))
                        key = _build_external_key("nasdaq", None, ticker, ipo_date)
                        seen.setdefault(key, {
                            "external_key": key,
                            "source": "nasdaq",
                            "company_name": company,
                            "ticker_proposed": ticker,
                            "isin": None,
                            "exchange": str(row.get("proposedExchange") or row.get("exchange") or "US").strip() or "US",
                            "market": None,
                            "ipo_date": ipo_date,
                            "price_range_low": low,
                            "price_range_high": high,
                            "price_currency": "USD",
                            "auto_status": status,
                        })
            except Exception as exc:  # pragma: no cover — per-period isolation
                period_errors.append(f"{period}:{exc}")
    if not seen and period_errors:
        raise RuntimeError("; ".join(period_errors))
    return list(seen.values())


@admin_router.post("/catalog/sync")
async def admin_sync_ipo_catalog(_admin: dict = Depends(require_admin)):
    """
    Fetcht Euronext + Nasdaq und upsertet in Mongo `ipo_catalog`.

    Idempotent via external_key. Rows mit is_manual_override=true werden
    NIE überschrieben. Kein Delete. Kein Payload — Konfiguration server-side.
    """
    report = {
        "fetched": 0, "inserted": 0, "updated": 0, "unchanged": 0,
        "skipped_manual_override": 0, "skipped_invalid": 0, "errors": [],
        "sources": {"euronext": 0, "nasdaq": 0},
    }

    rows: list[dict] = []
    for name, fetcher in (("euronext", _fetch_euronext), ("nasdaq", _fetch_nasdaq)):
        try:
            r = await fetcher()
            report["sources"][name] = len(r)
            rows.extend(r)
        except Exception as exc:
            report["errors"].append(f"{name}: {exc}")

    report["fetched"] = len(rows)
    now = datetime.now(timezone.utc)

    for row in rows:
        key = row.get("external_key")
        if not key or not row.get("company_name"):
            report["skipped_invalid"] += 1
            continue

        existing = await db.ipo_catalog.find_one({"external_key": key})
        auto_status = row.pop("auto_status", "upcoming")
        # Nicht pauschal sichtbar schalten: nur wenn Status nicht listed/cancelled.
        is_visible = auto_status not in ("listed", "cancelled")

        if existing and existing.get("is_manual_override"):
            report["skipped_manual_override"] += 1
            continue

        payload = {k: v for k, v in row.items() if v is not None}
        payload["status"] = auto_status
        payload["is_visible"] = is_visible
        payload["updated_at"] = now

        if not existing:
            payload["created_at"] = now
            payload["is_manual_override"] = False
            payload.setdefault("lot_size", 1)
            try:
                await db.ipo_catalog.insert_one(payload)
                report["inserted"] += 1
            except DuplicateKeyError:
                report["skipped_invalid"] += 1
        else:
            # Delete-Policy: kein Löschen. Nur Status/Fields aktualisieren.
            # Wenn Werte identisch: unchanged.
            changed = any(existing.get(k) != v for k, v in payload.items() if k != "updated_at")
            if changed:
                await db.ipo_catalog.update_one({"_id": existing["_id"]}, {"$set": payload})
                report["updated"] += 1
            else:
                report["unchanged"] += 1

    return report


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
