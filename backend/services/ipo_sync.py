"""
IPO-Katalog Sync-Service (Session 82.06).

Wiederverwendbare Service-Funktion für:
  - Admin-Route  POST /api/admin/ipo/catalog/sync
  - Cron-Endpoint POST /api/cron/ipo-catalog-sync

Vorher stand diese Logik im Route-Handler (routes/ipo_catalog.py). Sie ist
hierher extrahiert, damit Admin und Cron dieselbe Funktion aufrufen —
keine Parallel-Implementierung.

Design-Prinzipien (unverändert gegenüber Session 82.05):
  - Source-isoliert: Nasdaq-Fail bricht Euronext nicht ab.
  - external_key: `isin:{ISIN}` bevorzugt, sonst `{source}:{TICKER}:{DATE}`.
  - Manual-Override P0: `is_manual_override=true` wird nie überschrieben.
  - Kein Delete: nur Status-Updates.
  - 15s Timeout pro externer Quelle.

Job-Lock: Ein Modul-Level `asyncio.Lock` verhindert Same-Instance-Parallellauf.
Multi-Instance-Locking ist nicht nötig — die Plattform garantiert Single-
Instance-Backend, und der Cron-Dispatcher feuert nicht mehrfach parallel.
"""

from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime, timezone, date as _date, timedelta
from typing import Optional

import httpx
from pymongo.errors import DuplicateKeyError


logger = logging.getLogger(__name__)

_USER_AGENT = "kapitalmitte-ipobot/1.0 (+https://finance-platform-v2.emergent.host)"

# Same-Instance-Concurrency-Guard. Kein Multi-Instance-Lock nötig — Plattform
# fährt Backend als Single-Instance.
_sync_lock = asyncio.Lock()


def _build_external_key(source: str, isin: Optional[str], ticker: Optional[str],
                        ipo_date: Optional[str]) -> str:
    """Identisch zu Legacy-Regel und Session-82.05-Regel."""
    if isin:
        return f"isin:{isin.upper()}"
    t = (ticker or "unknown").upper()
    d = ipo_date or "nodate"
    return f"{source}:{t}:{d}"


def _derive_euronext_status(ipo_date: Optional[str]) -> str:
    if not ipo_date:
        return "upcoming"
    try:
        d = _date.fromisoformat(ipo_date)
    except ValueError:
        return "upcoming"
    cutoff = _date.today() - timedelta(days=30)
    return "listed" if d <= cutoff else "upcoming"


def _derive_nasdaq_status(bucket: str, ipo_date: Optional[str]) -> str:
    if bucket == "filed":
        return "filed"
    if bucket == "withdrawn":
        return "cancelled"
    if bucket == "priced":
        return "priced"
    if bucket == "upcoming":
        return _derive_euronext_status(ipo_date)
    return "__skip__"


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
    rows: list[dict] = []
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
            "external_key": _build_external_key("euronext",
                                                isin if len(isin) >= 10 else None,
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


def _parse_nasdaq_price(raw):
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
                        status = _derive_nasdaq_status(bucket, ipo_date)
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


async def _persist_last_run(db, report: dict) -> None:
    """Persistiert Timestamp + kompakten Report für UI-Anzeige."""
    safe_report = {k: v for k, v in report.items()
                   if k in ("fetched", "inserted", "updated", "unchanged",
                            "skipped_manual_override", "skipped_invalid",
                            "sources", "errors", "euronext_status", "nasdaq_status",
                            "duration_ms", "trigger")}
    await db.system_config.update_one(
        {"key": "ipo_sync_last"},
        {"$set": {
            "key": "ipo_sync_last",
            "last_run_at": datetime.now(timezone.utc),
            "report": safe_report,
        }},
        upsert=True,
    )


async def sync_ipo_catalog(db, trigger: str = "manual") -> dict:
    """
    Idempotenter Sync für Euronext + Nasdaq → Mongo `ipo_catalog`.

    Args:
      db:      Motor-Datenbank-Handle
      trigger: 'admin' | 'cron' | 'manual' — nur für Logging/Report

    Returns:
      Report-Dict mit source-Statuses und Zählungen.
    """
    if _sync_lock.locked():
        return {
            "fetched": 0, "inserted": 0, "updated": 0, "unchanged": 0,
            "skipped_manual_override": 0, "skipped_invalid": 0,
            "sources": {"euronext": 0, "nasdaq": 0},
            "euronext_status": "skipped", "nasdaq_status": "skipped",
            "errors": ["already-running: another sync is in progress"],
            "trigger": trigger,
        }

    async with _sync_lock:
        started = datetime.now(timezone.utc)
        report = {
            "fetched": 0, "inserted": 0, "updated": 0, "unchanged": 0,
            "skipped_manual_override": 0, "skipped_invalid": 0,
            "sources": {"euronext": 0, "nasdaq": 0},
            "euronext_status": "pending", "nasdaq_status": "pending",
            "errors": [], "trigger": trigger,
        }

        # Parallele Fetches — Nasdaq-Fail bricht Euronext nicht ab.
        eu_task = asyncio.create_task(_fetch_euronext())
        na_task = asyncio.create_task(_fetch_nasdaq())
        eu_result, na_result = await asyncio.gather(eu_task, na_task,
                                                    return_exceptions=True)

        rows: list[dict] = []
        if isinstance(eu_result, Exception):
            report["euronext_status"] = "error"
            report["errors"].append(f"euronext: {eu_result}")
        else:
            report["euronext_status"] = "ok"
            report["sources"]["euronext"] = len(eu_result)
            rows.extend(eu_result)

        if isinstance(na_result, Exception):
            report["nasdaq_status"] = "error"
            report["errors"].append(f"nasdaq: {na_result}")
        else:
            report["nasdaq_status"] = "ok"
            report["sources"]["nasdaq"] = len(na_result)
            rows.extend(na_result)

        report["fetched"] = len(rows)
        now = datetime.now(timezone.utc)

        for row in rows:
            key = row.get("external_key")
            if not key or not row.get("company_name"):
                report["skipped_invalid"] += 1
                continue

            existing = await db.ipo_catalog.find_one({"external_key": key})
            auto_status = row.pop("auto_status", "upcoming")
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
                changed = any(existing.get(k) != v
                              for k, v in payload.items()
                              if k != "updated_at")
                if changed:
                    await db.ipo_catalog.update_one(
                        {"_id": existing["_id"]}, {"$set": payload})
                    report["updated"] += 1
                else:
                    report["unchanged"] += 1

        duration_ms = int((datetime.now(timezone.utc) - started).total_seconds() * 1000)
        report["duration_ms"] = duration_ms

        try:
            await _persist_last_run(db, report)
        except Exception as exc:  # pragma: no cover — persistence is best-effort
            logger.warning("ipo_sync last-run persistence failed: %s", exc)

        # Safe Logging — keine Secrets, keine Raw Responses
        logger.info(
            "ipo_sync trigger=%s duration=%dms euronext=%s nasdaq=%s "
            "fetched=%d inserted=%d updated=%d unchanged=%d skipped_manual=%d errors=%d",
            trigger, duration_ms,
            report["euronext_status"], report["nasdaq_status"],
            report["fetched"], report["inserted"], report["updated"],
            report["unchanged"], report["skipped_manual_override"],
            len(report["errors"]),
        )

        return report


async def get_last_sync_status(db) -> Optional[dict]:
    """Liest letzten Sync-Report für UI-Anzeige."""
    doc = await db.system_config.find_one({"key": "ipo_sync_last"})
    if not doc:
        return None
    last = doc.get("last_run_at")
    return {
        "last_run_at": last.isoformat() if isinstance(last, datetime) else last,
        "report": doc.get("report") or {},
    }
