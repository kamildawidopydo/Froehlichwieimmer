"""Idempotenter Startup-Seed-Loader für Reviews.

Zweck: Bei jedem Backend-Start (insbesondere frisch deployte Production-DB)
werden alle Reviews aus `backend/data/reviews_snapshot.json` in die aktuelle
`reviews`-Collection idempotent per E-Mail eingespielt.

- Existiert ein Review mit gleicher E-Mail bereits → **kein Overwrite**, wir
  respektieren manuelle Änderungen (Admin-Response, Featured-Flag etc.).
- Fehlt der Review → `insert_one` mit den Snapshot-Feldern.
- Läuft nur einmal pro Prozess-Startup, non-blocking im Async-Startup.
- Logging über den Standard-Kapitalmitte-Logger.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger("kapitalmitte")

_SNAPSHOT_PATH = Path(__file__).resolve().parent / "data" / "reviews_snapshot.json"


def _coerce_datetime(value: Any) -> Any:
    """ISO-Strings zurück in datetime konvertieren, sonst unverändert lassen."""
    if isinstance(value, str) and len(value) >= 10:
        try:
            # Motor akzeptiert timezone-aware datetimes
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return value
    return value


def _normalize_doc(doc: dict) -> dict:
    """Snapshot-Doc für Insert normalisieren."""
    out = dict(doc)
    for field in ("created_at", "moderated_at", "responded_at"):
        if field in out and out[field]:
            out[field] = _coerce_datetime(out[field])
    return out


async def seed_reviews_from_snapshot(db) -> dict:
    """Lädt Reviews idempotent aus dem Snapshot.

    Returns: dict mit `loaded`, `inserted`, `skipped_existing`, `errors`.
    """
    result = {"loaded": 0, "inserted": 0, "skipped_existing": 0, "errors": 0, "snapshot_present": False}

    if not _SNAPSHOT_PATH.exists():
        logger.info("reviews_seed: snapshot not found at %s — skip", _SNAPSHOT_PATH)
        return result

    result["snapshot_present"] = True
    try:
        raw = _SNAPSHOT_PATH.read_text(encoding="utf-8")
        docs = json.loads(raw)
    except Exception as exc:  # pragma: no cover — defensive
        logger.warning("reviews_seed: cannot read snapshot: %s", exc)
        return result

    if not isinstance(docs, list):
        logger.warning("reviews_seed: snapshot is not a list")
        return result

    result["loaded"] = len(docs)

    # Kill-switch via ENV, damit man den Auto-Seed jederzeit deaktivieren kann.
    if os.environ.get("REVIEWS_SEED_ENABLED", "true").lower() in {"false", "0", "no"}:
        logger.info("reviews_seed: disabled via REVIEWS_SEED_ENABLED=false")
        return result

    for doc in docs:
        email = (doc.get("email") or "").strip().lower()
        if not email:
            result["errors"] += 1
            continue
        try:
            existing = await db.reviews.find_one({"email": email}, {"_id": 1, "display_name": 1, "first_name": 1, "last_name": 1})
            if existing:
                # Idempotent: bestehenden Datensatz nicht überschreiben, aber
                # Namensfelder aus dem Snapshot synchronisieren, falls sie sich
                # geändert haben (z. B. Kollisions-Umbenennung Thomas R.→Rainer T.).
                snap_display = doc.get("display_name")
                snap_first = doc.get("first_name")
                snap_last = doc.get("last_name")
                name_update: dict = {}
                if snap_display and snap_display != existing.get("display_name"):
                    name_update["display_name"] = snap_display
                if snap_first and snap_first != existing.get("first_name"):
                    name_update["first_name"] = snap_first
                if snap_last and snap_last != existing.get("last_name"):
                    name_update["last_name"] = snap_last
                if name_update:
                    await db.reviews.update_one({"_id": existing["_id"]}, {"$set": name_update})
                    result["renamed"] = result.get("renamed", 0) + 1
                else:
                    result["skipped_existing"] += 1
                continue
            normalized = _normalize_doc(doc)
            normalized["email"] = email
            # Snapshot-Datum in seed-Feld, damit man später sehen kann, woher der Datensatz kam.
            normalized.setdefault("seed_source", "startup_snapshot")
            normalized.setdefault("seeded_at", datetime.now(timezone.utc))
            await db.reviews.insert_one(normalized)
            result["inserted"] += 1
        except Exception as exc:  # pragma: no cover — defensive
            result["errors"] += 1
            logger.warning("reviews_seed: insert failed for %s: %s", email, exc)

    logger.info(
        "reviews_seed: done — loaded=%d inserted=%d skipped_existing=%d renamed=%d errors=%d",
        result["loaded"], result["inserted"], result["skipped_existing"], result.get("renamed", 0), result["errors"],
    )
    return result
