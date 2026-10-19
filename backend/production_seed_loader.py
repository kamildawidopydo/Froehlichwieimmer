"""Idempotenter Startup-Seed-Loader für Produktions-Kerndaten.

Spielt Banken, Spar-Angebote und Kredit-Angebote aus JSON-Snapshots
(`backend/data/seed_production/*.json`) in die Live-DB. Idempotent:

- `banks`              → Match über `slug`.
- `savings_offers`     → Match über `source_id`, Fallback composite
                         (bank_slug, product_type, term_months, product_name).
- `credit_offers`      → Match über `source_id`, Fallback (bank_id, product_name).

Bestehende Datensätze werden NICHT überschrieben (Admin-Edits bleiben erhalten).
Deaktivierbar via ENV `PRODUCTION_SEED_ENABLED=false`.

Snapshots werden mit `scripts/export_production_seed.py` (bzw. One-liner im
Repo-Root) aus der Preview-DB exportiert.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

logger = logging.getLogger("kapitalmitte")

_SEED_DIR = Path(__file__).resolve().parent / "data" / "seed_production"


_DT_FIELDS = {
    "created_at", "updated_at", "valid_until", "source_timestamp",
    "source_retrieved_at", "verified_at",
}


def _coerce_dt(value: Any) -> Any:
    if isinstance(value, str) and len(value) >= 10:
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return value
    return value


def _normalize(doc: dict) -> dict:
    out = {k: v for k, v in doc.items() if k != "_id"}
    for k in list(out.keys()):
        if k in _DT_FIELDS:
            out[k] = _coerce_dt(out[k])
    return out


def _load_json(path: Path) -> list[dict]:
    if not path.exists():
        return []
    try:
        docs = json.loads(path.read_text(encoding="utf-8"))
        return docs if isinstance(docs, list) else []
    except Exception as exc:
        logger.warning("production_seed: cannot read %s: %s", path.name, exc)
        return []


async def _seed_collection(
    db,
    collection_name: str,
    docs: Iterable[dict],
    match_builders: list,
) -> dict:
    """Insert docs that don't match any lookup predicate.

    `match_builders` is a list of callables `doc -> filter|None`. The first
    non-None filter that matches a document in Mongo makes us skip inserting.
    """
    stats = {"loaded": 0, "inserted": 0, "skipped_existing": 0, "errors": 0}
    coll = db[collection_name]
    for doc in docs:
        stats["loaded"] += 1
        try:
            existing = None
            for build in match_builders:
                flt = build(doc)
                if not flt:
                    continue
                existing = await coll.find_one(flt, {"_id": 1})
                if existing:
                    break
            if existing:
                stats["skipped_existing"] += 1
                continue
            normalized = _normalize(doc)
            normalized.setdefault("seed_source", "production_snapshot")
            normalized.setdefault("seeded_at", datetime.now(timezone.utc))
            await coll.insert_one(normalized)
            stats["inserted"] += 1
        except Exception as exc:
            stats["errors"] += 1
            logger.warning(
                "production_seed[%s]: insert failed: %s", collection_name, exc,
            )
    return stats


async def seed_production_core(db) -> dict:
    """Entry point — Seed Banken + Spar- + Kredit-Angebote."""
    result: dict = {"enabled": True, "snapshots": {}}

    if os.environ.get("PRODUCTION_SEED_ENABLED", "true").lower() in {"false", "0", "no"}:
        logger.info("production_seed: disabled via PRODUCTION_SEED_ENABLED=false")
        result["enabled"] = False
        return result

    # --- Banks ---
    banks_docs = _load_json(_SEED_DIR / "banks.json")
    if banks_docs:
        result["snapshots"]["banks"] = await _seed_collection(
            db, "banks", banks_docs,
            match_builders=[
                lambda d: {"slug": d["slug"]} if d.get("slug") else None,
            ],
        )

    # --- Savings offers ---
    savings_docs = _load_json(_SEED_DIR / "savings_offers.json")
    if savings_docs:
        def _by_source(d):
            sid = d.get("source_id")
            return {"source_id": sid} if sid else None

        def _by_composite(d):
            if not d.get("bank_slug"):
                return None
            flt = {
                "bank_slug": d["bank_slug"],
                "product_type": d.get("product_type"),
                "term_months": d.get("term_months"),
                "product_name": d.get("product_name"),
            }
            # Drop None keys so Mongo matches explicit nulls when needed.
            return {k: v for k, v in flt.items() if v is not None}

        result["snapshots"]["savings_offers"] = await _seed_collection(
            db, "savings_offers", savings_docs,
            match_builders=[_by_source, _by_composite],
        )

    # --- Credit offers ---
    credit_docs = _load_json(_SEED_DIR / "credit_offers.json")
    if credit_docs:
        def _c_by_source(d):
            sid = d.get("source_id")
            return {"source_id": sid} if sid else None

        def _c_by_composite(d):
            if not d.get("product_name"):
                return None
            return {
                "product_name": d["product_name"],
                "bank_id": d.get("bank_id"),
            }

        result["snapshots"]["credit_offers"] = await _seed_collection(
            db, "credit_offers", credit_docs,
            match_builders=[_c_by_source, _c_by_composite],
        )

    logger.info("production_seed: done — %s", result["snapshots"])
    return result
