"""Session 93 · Phase 3 — Import Pipeline.

Adapter → Normalizer → Validator → Diff → (Dry-Run|Apply) → Audit

Nicht enthalten (bewusst später):
- Automatisches Web-Scraping.
- Externe HTTP-Fetches beliebiger URLs (SSRF-Schutz durch Nicht-Implementierung).

Import-Payload-Format (JSON):
    {
      "source_slug": "manual:example",
      "records": [
        {
          "bank_slug": "example",
          "bank_name": "Example Bank",              # optional, für Duplicate-Detection
          "product_type": "festgeld",
          "product_name": "Example Festgeld 12M",
          "interest_rate": 3.20,
          "term_months": 12,
          "min_amount": 1000,
          "max_amount": 100000,
          "currency": "EUR",
          "country": "DE",
          "deposit_guarantee_country": "DE",
          "new_customers_only": false,
          "source_url": "https://example.com/festgeld"
        }
      ]
    }

CSV-Format wird durch denselben Normalizer verarbeitet (siehe `normalize`).
"""
from __future__ import annotations
import csv
import hashlib
import io
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from lib.validation_engine import validate_offer_record
from lib.duplicate_detection import resolve_bank


MAX_RECORDS = 5000  # Import-Size-Limit gegen Missbrauch


def normalize_records(payload_records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Normalisiert Roheinträge: strippt Strings, coerct Numerik."""
    out = []
    for r in payload_records:
        rec = {}
        for k, v in r.items():
            if isinstance(v, str):
                v = v.strip()
                if v == "":
                    v = None
            rec[k] = v
        # Kleine Coerce-Regeln
        for numk in ("interest_rate", "promo_rate", "standard_rate_after_promo",
                     "min_amount", "max_amount", "deposit_guarantee_limit"):
            if rec.get(numk) is not None:
                try:
                    rec[numk] = float(rec[numk])
                except (TypeError, ValueError):
                    pass
        for intk in ("term_months", "promo_duration_months"):
            if rec.get(intk) is not None:
                try:
                    rec[intk] = int(float(rec[intk]))
                except (TypeError, ValueError):
                    pass
        out.append(rec)
    return out


def parse_csv(csv_text: str) -> List[Dict[str, Any]]:
    reader = csv.DictReader(io.StringIO(csv_text))
    return [dict(r) for r in reader]


def _snapshot_hash(rec: Dict[str, Any]) -> str:
    keys = sorted(rec.keys())
    payload = "|".join(f"{k}={rec.get(k)}" for k in keys)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


async def build_diff(
    normalized: List[Dict[str, Any]],
    banks_collection,
    aliases_collection,
    offers_collection,
    countries_collection,
    dgs_collection,
) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
    """Berechnet pro Datensatz Diff/Action ohne DB-Änderungen.

    Actions:
        - `create` — neuer Offer.
        - `update` — bestehender Offer, Zins/Bedingung ändert sich.
        - `unchanged` — bestehender Offer, alle Werte identisch.
        - `needs_review` — Bank nicht eindeutig auflösbar oder Validation.
        - `invalid` — harte Validation-Fehler.
    """
    # Referenzen einmalig laden
    country_codes = set()
    async for c in countries_collection.find({}, {"code": 1}):
        country_codes.add(c.get("code"))
    dgs_codes = set()
    async for d in dgs_collection.find({}, {"country_code": 1}):
        dgs_codes.add(d.get("country_code"))

    diffs: List[Dict[str, Any]] = []
    counts = {"create": 0, "update": 0, "unchanged": 0, "needs_review": 0, "invalid": 0}

    for rec in normalized:
        result = validate_offer_record(rec, country_codes, dgs_codes)
        if not result["valid"]:
            counts["invalid"] += 1
            diffs.append({"action": "invalid", "record": rec, "errors": result["errors"]})
            continue

        resolved = await resolve_bank(rec, banks_collection, aliases_collection)
        if resolved.get("needs_review"):
            counts["needs_review"] += 1
            diffs.append({
                "action": "needs_review",
                "record": rec,
                "reason": "bank_resolution_ambiguous",
                "candidates": resolved.get("candidates", []),
            })
            continue

        bank_slug = resolved["slug"]
        existing = await offers_collection.find_one({
            "bank_slug": bank_slug,
            "product_type": rec.get("product_type"),
            "term_months": rec.get("term_months"),
        })
        if existing is None:
            counts["create"] += 1
            diffs.append({
                "action": "create",
                "record": {**rec, "bank_slug": bank_slug},
                "change_hash": _snapshot_hash(rec),
                "warnings": result.get("warnings", []),
            })
            continue

        changes = _compute_field_diff(existing, rec)
        if not changes:
            counts["unchanged"] += 1
            diffs.append({"action": "unchanged", "offer_id": str(existing["_id"]), "record": rec})
        else:
            counts["update"] += 1
            diffs.append({
                "action": "update",
                "offer_id": str(existing["_id"]),
                "bank_slug": bank_slug,
                "changes": changes,
                "warnings": result.get("warnings", []),
            })
    return diffs, counts


def _compute_field_diff(existing: Dict[str, Any], incoming: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Feldweise Diff der wichtigen Konditionsfelder."""
    fields = [
        ("interest_rate", "rate_changed"),
        ("min_amount", "minimum_changed"),
        ("max_amount", "maximum_changed"),
        ("promo_rate", "promo_changed"),
        ("promo_duration_months", "promo_changed"),
        ("standard_rate_after_promo", "promo_changed"),
        ("term_months", "term_changed"),
        ("conditions", "conditions_changed"),
    ]
    out = []
    for key, kind in fields:
        if key not in incoming:
            continue
        new = incoming.get(key)
        old = existing.get(key)
        if new is None and old is None:
            continue
        if new != old:
            entry = {"field": key, "type": kind, "old": old, "new": new}
            if key == "interest_rate" and isinstance(new, (int, float)) and isinstance(old, (int, float)):
                entry["delta_pp"] = round(float(new) - float(old), 4)
            out.append(entry)
    return out


async def apply_diff(
    diffs: List[Dict[str, Any]],
    *,
    source_slug: str,
    source_url: Optional[str],
    verification_method: str,
    applied_by: Optional[str],
    now,
    offers_collection,
    history_collection,
) -> Dict[str, int]:
    """Wendet einen berechneten Diff an. Setzt Provenance-Felder auf jedem Datensatz."""
    from bson import ObjectId
    from lib.rate_change_service import update_offer_rate

    counts = {"created": 0, "updated": 0, "unchanged": 0, "skipped": 0}
    for d in diffs:
        act = d.get("action")
        if act == "unchanged":
            counts["unchanged"] += 1
            continue
        if act in ("invalid", "needs_review"):
            counts["skipped"] += 1
            continue
        if act == "create":
            rec = d["record"]
            doc = {
                **rec,
                "product_key": f'{rec.get("bank_slug")}__{rec.get("product_type")}',
                "status": "active",
                "is_active": True,
                "is_demo": False,
                "data_source": source_slug,
                "source_id": source_slug,
                "source_url": source_url or rec.get("source_url"),
                "source_retrieved_at": now,
                "verified_at": now,
                "verification_method": verification_method,
                "created_at": now,
                "updated_at": now,
            }
            res = await offers_collection.insert_one(doc)
            # initial history entry
            await history_collection.insert_one({
                "offer_id": str(res.inserted_id),
                "offer_key": doc["product_key"],
                "rate_type": "standard",
                "rate": float(rec.get("interest_rate")),
                "valid_from": now,
                "valid_until": None,
                "source_id": source_slug,
                "source_url": source_url or rec.get("source_url"),
                "verified_at": now,
                "verification_method": verification_method,
                "is_demo": False,
                "created_at": now,
            })
            counts["created"] += 1
        elif act == "update":
            offer_id = d["offer_id"]
            rate_change = next((c for c in d["changes"] if c["field"] == "interest_rate"), None)
            if rate_change is not None:
                await update_offer_rate(
                    offer_id=offer_id,
                    new_rate=float(rate_change["new"]),
                    rate_type="standard",
                    source_id=source_slug,
                    source_url=source_url,
                    verification_method=verification_method,
                    verified_at=now,
                    is_demo=False,
                    offers_collection=offers_collection,
                    history_collection=history_collection,
                )
            # Non-rate changes anwenden
            non_rate = {c["field"]: c["new"] for c in d["changes"] if c["field"] != "interest_rate"}
            if non_rate:
                non_rate["updated_at"] = now
                non_rate["source_id"] = source_slug
                if source_url:
                    non_rate["source_url"] = source_url
                non_rate["verified_at"] = now
                non_rate["verification_method"] = verification_method
                non_rate["is_demo"] = False
                await offers_collection.update_one(
                    {"_id": ObjectId(offer_id) if len(offer_id) == 24 else offer_id},
                    {"$set": non_rate},
                )
            counts["updated"] += 1
    return counts
