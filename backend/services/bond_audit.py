"""Audit- und Kurshistorie für Anleihen-Katalog und Anleihe-Kaufanfragen."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

PRICE_FIELDS = (
    "kaufkurs", "verkaufskurs", "aktueller_kurs", "kurs_datum", "kurs_quelle",
    "kurs_typ", "kursveraenderung_abs", "kursveraenderung_pct", "rendite_manuell",
    "kaufkurs_art", "kaufkurs_quelle", "kaufkurs_quoted_at", "kaufkurs_valid_until",
)


def _iso(v):
    return v.isoformat() if isinstance(v, datetime) else v


def _clean(d: Optional[dict]) -> Optional[dict]:
    if not d:
        return d
    return {k: _iso(v) for k, v in d.items() if k not in ("_id", "internal_notes")}


async def write_audit(db, entity_type: str, entity_id, action: str,
                      before: Optional[dict], after: Optional[dict], user: Optional[dict]) -> None:
    changed = None
    if before is not None and after is not None:
        changed = sorted(k for k in set(before) | set(after)
                         if k not in ("updated_at", "_id") and before.get(k) != after.get(k))
    await db.audit_log.insert_one({
        "entity_type": entity_type,
        "entity_id": str(entity_id),
        "action": action,
        "changed_fields": changed,
        "before": _clean(before),
        "after": _clean(after),
        "changed_at": datetime.now(timezone.utc),
        "changed_by": (user or {}).get("email"),
        "changed_by_id": str((user or {}).get("id") or ""),
    })


async def list_audit(db, entity_type: str, entity_id: str, limit: int = 200) -> list:
    cur = db.audit_log.find({"entity_type": entity_type, "entity_id": entity_id}).sort("changed_at", -1).limit(limit)
    out = []
    async for r in cur:
        out.append({
            "id": str(r["_id"]), "action": r.get("action"),
            "changed_fields": r.get("changed_fields"),
            "before": r.get("before"), "after": r.get("after"),
            "changed_at": _iso(r.get("changed_at")), "changed_by": r.get("changed_by"),
        })
    return out


def price_changed(before: dict, changes: dict) -> bool:
    return any(k in changes and changes[k] != before.get(k) for k in PRICE_FIELDS)


async def record_price(db, bond_id, doc: dict, user: Optional[dict]) -> None:
    entry = {k: doc.get(k) for k in PRICE_FIELDS}
    entry.update({
        "bond_id": str(bond_id),
        "recorded_at": datetime.now(timezone.utc),
        "recorded_by": (user or {}).get("email"),
    })
    await db.bond_price_history.insert_one(entry)


async def list_prices(db, bond_id: str, limit: int = 200) -> list:
    cur = db.bond_price_history.find({"bond_id": bond_id}).sort("recorded_at", -1).limit(limit)
    out = []
    async for r in cur:
        r["id"] = str(r.pop("_id"))
        r["recorded_at"] = _iso(r.get("recorded_at"))
        out.append(r)
    return out
