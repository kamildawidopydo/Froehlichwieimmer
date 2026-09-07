"""
Bond-Katalog Sync-Service (Session 82.16).

Zieht die offizielle Deutsche-Börse T7 XFRA-BF Referenzdatei
(BOERSE FRANKFURT BONDS Segment, öffentlich, täglich aktualisiert)
und synchronisiert eine **kuratierte** Auswahl in Mongo `bond_catalog`.

Design-Prinzipien (analog IPO-Sync Session 82.05/82.06):
  - Source-URL ist serverseitig konstant, keine Client-URL.
  - `external_key = "isin:<ISIN>"` als Upsert-Schlüssel (Unique sparse).
  - Manual-Override P0: `is_manual_override=true` wird nie überschrieben.
  - Kein Delete: nur `missing_from_source` reporten.
  - Harter Cap `MAX_IMPORT_ROWS=1000` + deterministische Priorisierung.
  - Same-Instance-Concurrency-Guard via asyncio.Lock.

Route-Delegation (Session 82.16):
  POST /api/admin/bonds/catalog/sync ── ruft `sync_bond_catalog(db, trigger="admin")`

NOCH KEIN CRON — Cron-Endpoint wird in einem separaten Schritt aktiviert.
"""

from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime, timezone, date as _date, timedelta
from typing import Optional

import httpx
from pymongo import UpdateOne


logger = logging.getLogger(__name__)


# ─── Konfiguration ──────────────────────────────────────────────────────
_SOURCE_URL = (
    "https://www.cashmarket.deutsche-boerse.com/resource/blob/2289108/"
    "56273336b3d6bf87fa3d1b0cc641e3d9/data/t7-xfra-BF-allTradableInstruments.csv"
)
_SOURCE_ID = "deutsche_boerse_xfra_bf"
_USER_AGENT = "kapitalmitte-bondbot/1.0 (+https://finance-platform-v2.emergent.host)"
_FETCH_TIMEOUT_S = 30.0

MAX_IMPORT_ROWS = 1000

# Basisfilter Phase 5 · ISIN-Prefixes: DE + Eurozone + Baltics + Malta + Cyprus + XS
_EU_PREFIXES = frozenset({
    "DE", "AT", "BE", "FI", "FR", "GR", "IE", "IT", "LU", "NL",
    "PT", "ES", "EE", "LT", "LV", "MT", "CY", "SK", "SI", "XS",
})

# Priorisierung Cap Phase 7 · Deterministisch sortiert
_PRIO_TIER_1 = ("DE", "AT", "FR", "NL", "BE", "LU")
_PRIO_TIER_2 = ("XS",)


def _prio_tier(iso2: str) -> int:
    if iso2 in _PRIO_TIER_1:
        return 0
    if iso2 in _PRIO_TIER_2:
        return 1
    return 2  # übrige EU


# Pflichtspalten für Header-Validierung (Phase 4)
_REQUIRED_COLS = (
    "ISIN", "Instrument", "Instrument Type", "Currency",
    "Coupon Rate", "Maturity Date", "Minimum Tradable Unit",
    "Product Status", "Instrument Status", "Issue Date",
)

# Kuratierung Phase 6
_MIN_REMAINING_DAYS = 90       # 3 Monate
_MAX_REMAINING_DAYS = 365 * 15  # 15 Jahre
_DENOMINATION_CAP = 100_000.0

# ISO date pattern
_ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_ISIN_RE = re.compile(r"^[A-Z]{2}[A-Z0-9]{9}\d$")

# Modul-Level Sync-Lock (Same-Instance-Guard, Phase 19)
_sync_lock = asyncio.Lock()


# ─── Helpers ─────────────────────────────────────────────────────────────
def _valid_isin(isin: str) -> bool:
    """Formale ISIN-Prüfung: 12 Zeichen, [A-Z]{2} + 9 alphanumerisch + 1 Ziffer."""
    if not isin or len(isin) != 12:
        return False
    return bool(_ISIN_RE.match(isin))


def _parse_iso(s: str) -> Optional[_date]:
    if not s or not _ISO_DATE_RE.match(s):
        return None
    try:
        return _date.fromisoformat(s)
    except ValueError:
        return None


def _parse_float(s: str) -> Optional[float]:
    if not s:
        return None
    try:
        v = float(s.replace(",", "."))
    except (ValueError, AttributeError):
        return None
    if v != v:  # NaN
        return None
    return v


def _resolve_columns(header: list[str]) -> dict[str, int]:
    """Mappt Pflicht-Spaltennamen → Index. Wirft ValueError bei Fehlen."""
    normalized = [h.strip() for h in header]
    idx_map: dict[str, int] = {}
    for name in _REQUIRED_COLS:
        try:
            idx_map[name] = normalized.index(name)
        except ValueError as exc:
            raise ValueError(f"Pflichtspalte '{name}' fehlt im CSV-Header") from exc
    return idx_map


def _detect_header_line(lines: list[str]) -> int:
    """
    Findet die Header-Zeile robust über Spaltennamen (nicht über Zeilennummer).
    Sucht die erste Zeile, die `ISIN` als eigenständigen Wert enthält.
    """
    for i, line in enumerate(lines[:10]):
        parts = [p.strip() for p in line.split(";")]
        if "ISIN" in parts and "Instrument" in parts and "Instrument Type" in parts:
            return i
    raise ValueError("CSV-Header nicht auffindbar (ISIN/Instrument/Instrument Type)")


# ─── Fetch + Parse ───────────────────────────────────────────────────────
async def _fetch_source_csv() -> str:
    """Serverseitiger CSV-Download; Timeout 30 s."""
    async with httpx.AsyncClient(
        timeout=_FETCH_TIMEOUT_S,
        headers={"User-Agent": _USER_AGENT, "Accept": "text/csv"},
        follow_redirects=True,
    ) as c:
        r = await c.get(_SOURCE_URL)
        if r.status_code != 200:
            raise RuntimeError(f"source HTTP {r.status_code}")
        # UTF-8; falls Source BOM/andere Encoding hat, httpx dekodiert nach Content-Type
        return r.text


def _parse_and_filter(csv_text: str, today: _date) -> tuple[list[dict], dict]:
    """
    Parst CSV, wendet Basis- + Kuratierungsfilter an.
    Kein DB-Zugriff; rein Speicher.

    Returns:
      (eligible_rows, stats)
    """
    lines = csv_text.splitlines()
    if len(lines) < 3:
        raise ValueError("CSV zu kurz oder leer")

    header_idx = _detect_header_line(lines)
    header = [h.strip() for h in lines[header_idx].split(";")]
    idx = _resolve_columns(header)

    raw_rows = 0
    eur_bonds = 0
    invalid_isin = 0
    expired = 0
    wrong_prefix = 0
    inactive = 0
    curated_out = 0

    eligible: list[dict] = []

    min_mat_date = today + timedelta(days=_MIN_REMAINING_DAYS)
    max_mat_date = today + timedelta(days=_MAX_REMAINING_DAYS)

    for i, line in enumerate(lines[header_idx + 1:], start=1):
        if not line.strip():
            continue
        cells = line.split(";")
        if len(cells) <= max(idx.values()):
            continue
        raw_rows += 1

        instr_type = cells[idx["Instrument Type"]].strip()
        if instr_type != "BOND":
            continue

        currency = cells[idx["Currency"]].strip()
        if currency != "EUR":
            continue
        eur_bonds += 1

        isin = cells[idx["ISIN"]].strip().upper()
        if not _valid_isin(isin):
            invalid_isin += 1
            continue

        iso2 = isin[:2]
        if iso2 not in _EU_PREFIXES:
            wrong_prefix += 1
            continue

        pstat = cells[idx["Product Status"]].strip()
        istat = cells[idx["Instrument Status"]].strip()
        if pstat != "Active" or istat != "Active":
            inactive += 1
            continue

        maturity = cells[idx["Maturity Date"]].strip()
        mat_date = _parse_iso(maturity)
        if not mat_date:
            expired += 1  # Zählen fehlende Maturity zu "expired" (nicht importierbar)
            continue
        if mat_date < min_mat_date:
            expired += 1
            continue
        if mat_date > max_mat_date:
            curated_out += 1
            continue

        min_unit_raw = cells[idx["Minimum Tradable Unit"]].strip()
        denomination = _parse_float(min_unit_raw)
        # Kuratierungsfilter: Denomination-Cap (nur wenn Wert vorhanden)
        if denomination is not None and denomination > _DENOMINATION_CAP:
            curated_out += 1
            continue

        coupon = _parse_float(cells[idx["Coupon Rate"]].strip())
        issue_date_s = cells[idx["Issue Date"]].strip()
        issue_date = issue_date_s if _parse_iso(issue_date_s) else None

        name = cells[idx["Instrument"]].strip()
        if not name:
            invalid_isin += 1  # incomplete row
            continue

        eligible.append({
            "isin": isin,
            "bond_name": name,
            # Issuer-Strategy (Phase 8): keine aggressive Heuristik → bond_name verwenden
            "issuer": name,
            "kupon_rate": coupon,
            "faelligkeitsdatum": maturity,
            "denomination": denomination,
            "min_order_eur": None,
            "kaufkurs": None,
            "aktueller_kurs": None,
            "currency": "EUR",
            "country": iso2,
            "source": _SOURCE_ID,
            "external_key": f"isin:{isin}",
            "issue_date": issue_date,
            "is_available": True,
            # Sortier-Metadaten (nicht persistiert)
            "_prio_tier": _prio_tier(iso2),
            "_remaining_days": (mat_date - today).days,
        })

    stats = {
        "raw_rows": raw_rows,
        "eur_bonds": eur_bonds,
        "invalid_isin": invalid_isin,
        "wrong_prefix": wrong_prefix,
        "inactive": inactive,
        "expired": expired,
        "curated_out": curated_out,
        "header_columns": len(header),
    }
    return eligible, stats


def _prioritize_and_cap(rows: list[dict]) -> tuple[list[dict], int]:
    """
    Deterministische Priorisierung + harter Cap MAX_IMPORT_ROWS.
    Sort: prio_tier ASC, remaining_days ASC, isin ASC.
    """
    rows.sort(key=lambda r: (r["_prio_tier"], r["_remaining_days"], r["isin"]))
    skipped = max(0, len(rows) - MAX_IMPORT_ROWS)
    return rows[:MAX_IMPORT_ROWS], skipped


# ─── Upsert-Logik ────────────────────────────────────────────────────────
# Felder, die Sync setzt (bei NEW insert) bzw. patcht (bei UPDATE, sofern
# !is_manual_override). Preis-Felder (kaufkurs/aktueller_kurs) und
# min_order_eur werden bei UPDATE NIE überschrieben — sie sind admin-editable.
_SYNC_UPDATE_FIELDS = (
    "bond_name", "issuer", "kupon_rate", "faelligkeitsdatum",
    "denomination", "currency", "country", "source", "issue_date",
)


async def _load_existing_map(db) -> dict[str, dict]:
    """Lädt alle bestehenden Rows einmalig; Map external_key → doc."""
    cursor = db.bond_catalog.find(
        {},
        projection={
            "_id": 1, "external_key": 1, "isin": 1, "is_manual_override": 1,
            "bond_name": 1, "issuer": 1, "kupon_rate": 1, "faelligkeitsdatum": 1,
            "denomination": 1, "currency": 1, "country": 1, "source": 1,
            "issue_date": 1, "is_available": 1,
        },
    )
    out: dict[str, dict] = {}
    async for doc in cursor:
        key = doc.get("external_key") or (f"isin:{doc['isin']}" if doc.get("isin") else None)
        if key:
            out[key] = doc
    return out


def _has_material_change(existing: dict, incoming: dict) -> bool:
    """Vergleicht nur fachliche Felder (nicht updated_at)."""
    for f in _SYNC_UPDATE_FIELDS:
        if existing.get(f) != incoming.get(f):
            return True
    if existing.get("is_available") is not True:
        return True
    return False


async def _apply_upserts(
    db, kept: list[dict], existing_map: dict[str, dict], now: datetime,
) -> dict:
    inserted = 0
    updated = 0
    unchanged = 0
    skipped_manual = 0

    ops: list[UpdateOne] = []
    for row in kept:
        key = row["external_key"]
        existing = existing_map.get(key)

        # Payload für Insert bzw. Update
        insert_payload = {
            "isin": row["isin"],
            "bond_name": row["bond_name"],
            "issuer": row["issuer"],
            "kupon_rate": row["kupon_rate"],
            "faelligkeitsdatum": row["faelligkeitsdatum"],
            "denomination": row["denomination"],
            "min_order_eur": None,
            "kaufkurs": None,
            "aktueller_kurs": None,
            "currency": row["currency"],
            "country": row["country"],
            "source": row["source"],
            "external_key": row["external_key"],
            "issue_date": row["issue_date"],
            "is_available": True,
            "is_manual_override": False,
            "created_at": now,
            "updated_at": now,
        }

        if not existing:
            ops.append(UpdateOne(
                {"external_key": key},
                {"$setOnInsert": insert_payload},
                upsert=True,
            ))
            inserted += 1
            continue

        # Manual-Override-Schutz: fachliche Felder unangetastet
        if existing.get("is_manual_override"):
            skipped_manual += 1
            continue

        if not _has_material_change(existing, row):
            unchanged += 1
            continue

        update_set = {
            "bond_name": row["bond_name"],
            "issuer": row["issuer"],
            "kupon_rate": row["kupon_rate"],
            "faelligkeitsdatum": row["faelligkeitsdatum"],
            "denomination": row["denomination"],
            "currency": row["currency"],
            "country": row["country"],
            "source": row["source"],
            "issue_date": row["issue_date"],
            "is_available": True,
            "updated_at": now,
        }
        ops.append(UpdateOne({"_id": existing["_id"]}, {"$set": update_set}))
        updated += 1

    if ops:
        try:
            await db.bond_catalog.bulk_write(ops, ordered=False)
        except Exception as exc:  # pragma: no cover
            logger.exception("bond_sync bulk_write failed: %s", exc)
            raise

    return {
        "inserted": inserted,
        "updated": updated,
        "unchanged": unchanged,
        "skipped_manual_override": skipped_manual,
    }


def _detect_missing(kept: list[dict], existing_map: dict[str, dict]) -> int:
    """Rows, die in Source fehlen, aber in Katalog existieren & Source-getagged sind."""
    kept_keys = {r["external_key"] for r in kept}
    missing = 0
    for key, doc in existing_map.items():
        if key in kept_keys:
            continue
        if doc.get("source") == _SOURCE_ID and not doc.get("is_manual_override"):
            missing += 1
    return missing


# ─── History-Telemetrie (Session 82.17) ─────────────────────────────────
_HISTORY_MAX = 30


def _classify_run_status(report: dict) -> str:
    """Klassifiziert einen Sync-Run (Single-Source-Modell: nur success/failed)."""
    if report.get("errors"):
        # Bei fetch/parse-Fehler bereits explicit gesetzt; hier defensiv
        return "failed"
    return "success"


async def _persist_run_history(
    db, report: dict, started_at: datetime,
    status_override: Optional[str] = None,
) -> None:
    """Schreibt genau EIN History-Doc pro Run, retention max. 30."""
    finished = datetime.now(timezone.utc)
    status = status_override or _classify_run_status(report)
    errors_summary = [str(e)[:200] for e in (report.get("errors") or [])][:5]
    doc = {
        "trigger": report.get("trigger"),
        "status": status,
        "source": report.get("source") or _SOURCE_ID,
        "started_at": started_at,
        "finished_at": finished,
        "duration_ms": report.get("duration_ms", 0),
        "raw_rows": report.get("raw_rows", 0),
        "eur_bond_rows": report.get("eur_bond_rows", 0),
        "eligible_before_cap": report.get("eligible_before_cap", 0),
        "imported_after_cap": report.get("imported_after_cap", 0),
        "inserted": report.get("inserted", 0),
        "updated": report.get("updated", 0),
        "unchanged": report.get("unchanged", 0),
        "skipped_manual_override": report.get("skipped_manual_override", 0),
        "skipped_due_to_cap": report.get("skipped_due_to_cap", 0),
        "skipped_invalid": report.get("skipped_invalid", 0),
        "skipped_expired": report.get("skipped_expired", 0),
        "skipped_wrong_prefix": report.get("skipped_wrong_prefix", 0),
        "skipped_inactive": report.get("skipped_inactive", 0),
        "skipped_curated_out": report.get("skipped_curated_out", 0),
        "missing_from_source": report.get("missing_from_source", 0),
        "max_import_cap": report.get("max_import_cap", MAX_IMPORT_ROWS),
        "error_count": len(report.get("errors") or []),
        "errors_summary": errors_summary,
        "created_at": finished,
    }
    await db.bond_sync_runs.insert_one(doc)
    # Retention: nur 30 neueste Rows behalten
    total = await db.bond_sync_runs.count_documents({})
    if total > _HISTORY_MAX:
        cursor = db.bond_sync_runs.find({}).sort("created_at", 1).limit(total - _HISTORY_MAX)
        old_ids = [d["_id"] async for d in cursor]
        if old_ids:
            await db.bond_sync_runs.delete_many({"_id": {"$in": old_ids}})


async def get_recent_sync_runs(db, limit: int = 30) -> list[dict]:
    """Letzte N Runs (max 30) für Admin-Timeline. Newest first."""
    limit = max(1, min(int(limit or 30), _HISTORY_MAX))
    cursor = db.bond_sync_runs.find({}).sort("created_at", -1).limit(limit)
    out: list[dict] = []
    async for d in cursor:
        d["id"] = str(d.pop("_id"))
        for k in ("started_at", "finished_at", "created_at"):
            v = d.get(k)
            if isinstance(v, datetime):
                d[k] = v.isoformat()
        out.append(d)
    return out


async def ensure_history_index(db) -> None:
    """Idempotenter Index auf created_at DESC."""
    await db.bond_sync_runs.create_index([("created_at", -1)], name="created_desc")


# ─── Public: Sync-Orchestrator ───────────────────────────────────────────
async def sync_bond_catalog(db, trigger: str = "manual") -> dict:
    """
    Idempotenter Bond-Sync (Deutsche Börse XFRA-BF → Mongo `bond_catalog`).

    Args:
      db:      Motor-Datenbank-Handle
      trigger: 'admin' | 'cron' | 'manual' — nur für Report/Logging

    Returns:
      Strukturierter Report-Dict (Session 82.16 Phase 20).
    """
    started = datetime.now(timezone.utc)
    base_report = {
        "source": _SOURCE_ID,
        "source_url": _SOURCE_URL,
        "trigger": trigger,
        "started_at": started.isoformat(),
        "finished_at": None,
        "duration_ms": 0,
        "status": "pending",
        "fetched": 0,
        "raw_rows": 0,
        "eur_bond_rows": 0,
        "eligible_before_cap": 0,
        "imported_after_cap": 0,
        "inserted": 0,
        "updated": 0,
        "unchanged": 0,
        "skipped_manual_override": 0,
        "skipped_due_to_cap": 0,
        "skipped_invalid": 0,
        "skipped_expired": 0,
        "skipped_wrong_prefix": 0,
        "skipped_inactive": 0,
        "skipped_curated_out": 0,
        "missing_from_source": 0,
        "max_import_cap": MAX_IMPORT_ROWS,
        "errors": [],
    }

    # Parallel-Run-Schutz (Phase 19)
    if _sync_lock.locked():
        base_report["status"] = "already_running"
        base_report["errors"].append("already-running: another sync in progress")
        base_report["finished_at"] = datetime.now(timezone.utc).isoformat()
        # History-Failure-Isolation: Sync-Ack darf durch History nicht kippen
        try:
            await _persist_run_history(db, base_report, started, "already_running")
        except Exception as exc:  # noqa: BLE001
            logger.warning("bond_sync history (already_running) persist failed: %s", exc)
        return base_report

    async with _sync_lock:
        try:
            csv_text = await _fetch_source_csv()
        except Exception as exc:
            base_report["status"] = "failed"
            base_report["errors"].append(f"fetch: {exc}")
            base_report["finished_at"] = datetime.now(timezone.utc).isoformat()
            base_report["duration_ms"] = int(
                (datetime.now(timezone.utc) - started).total_seconds() * 1000
            )
            try:
                await _persist_run_history(db, base_report, started, "failed")
            except Exception as h_exc:  # noqa: BLE001
                logger.warning("bond_sync history (fetch-fail) persist failed: %s", h_exc)
            return base_report

        base_report["fetched"] = len(csv_text)

        today = _date.today()
        try:
            eligible, stats = _parse_and_filter(csv_text, today)
        except Exception as exc:
            base_report["status"] = "failed"
            base_report["errors"].append(f"parse: {exc}")
            base_report["finished_at"] = datetime.now(timezone.utc).isoformat()
            base_report["duration_ms"] = int(
                (datetime.now(timezone.utc) - started).total_seconds() * 1000
            )
            try:
                await _persist_run_history(db, base_report, started, "failed")
            except Exception as h_exc:  # noqa: BLE001
                logger.warning("bond_sync history (parse-fail) persist failed: %s", h_exc)
            return base_report

        base_report.update({
            "raw_rows": stats["raw_rows"],
            "eur_bond_rows": stats["eur_bonds"],
            "skipped_invalid": stats["invalid_isin"],
            "skipped_wrong_prefix": stats["wrong_prefix"],
            "skipped_inactive": stats["inactive"],
            "skipped_expired": stats["expired"],
            "skipped_curated_out": stats["curated_out"],
            "eligible_before_cap": len(eligible),
        })

        kept, cap_skipped = _prioritize_and_cap(eligible)
        base_report["imported_after_cap"] = len(kept)
        base_report["skipped_due_to_cap"] = cap_skipped

        existing_map = await _load_existing_map(db)
        base_report["missing_from_source"] = _detect_missing(kept, existing_map)

        now = datetime.now(timezone.utc)
        try:
            upsert_stats = await _apply_upserts(db, kept, existing_map, now)
        except Exception as exc:
            base_report["status"] = "failed"
            base_report["errors"].append(f"upsert: {exc}")
            base_report["finished_at"] = datetime.now(timezone.utc).isoformat()
            base_report["duration_ms"] = int(
                (datetime.now(timezone.utc) - started).total_seconds() * 1000
            )
            try:
                await _persist_run_history(db, base_report, started, "failed")
            except Exception as h_exc:  # noqa: BLE001
                logger.warning("bond_sync history (upsert-fail) persist failed: %s", h_exc)
            return base_report

        base_report.update(upsert_stats)
        finished = datetime.now(timezone.utc)
        base_report["finished_at"] = finished.isoformat()
        base_report["duration_ms"] = int((finished - started).total_seconds() * 1000)
        base_report["status"] = "success"

        # History-Persistenz — Failure-isoliert (Phase 7).
        try:
            await _persist_run_history(db, base_report, started, "success")
        except Exception as h_exc:  # noqa: BLE001
            logger.warning("bond_sync history persist failed: %s", h_exc)

        logger.info(
            "bond_sync trigger=%s duration=%dms raw=%d eur=%d eligible=%d "
            "imported=%d inserted=%d updated=%d unchanged=%d skipped_manual=%d "
            "skipped_cap=%d expired=%d",
            trigger, base_report["duration_ms"],
            base_report["raw_rows"], base_report["eur_bond_rows"],
            base_report["eligible_before_cap"], base_report["imported_after_cap"],
            base_report["inserted"], base_report["updated"], base_report["unchanged"],
            base_report["skipped_manual_override"], base_report["skipped_due_to_cap"],
            base_report["skipped_expired"],
        )
        return base_report
