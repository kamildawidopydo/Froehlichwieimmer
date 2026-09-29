"""Session 93 · Phase 3 — Rate-Change-Service.

Atomarer Update eines aktuellen Zinssatzes + saubere Historisierung.
- Ohne Änderung wird NIE historisiert.
- Bei Änderung wird der bestehende History-Eintrag geschlossen (`valid_until`)
  und ein neuer Eintrag mit `valid_from = jetzt` angelegt.
- Alte Werte bleiben dauerhaft in `interest_rate_history` erhalten.

Es wird KEIN Multi-Document-Transaction verlangt (Standalone Mongo). Wir
minimieren das Risiko durch klare Reihenfolge:
    1. History-Close (idempotent, nur wenn nötig)
    2. History-Insert
    3. Offer-Update
Bei Fehler in Schritt 3 liefert der Service Flag `partial=True`, sodass der
Aufrufer ggf. per Cleanup nachfassen kann.
"""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Any, Dict, Optional


class RateChangeResult(dict):
    @classmethod
    def unchanged(cls) -> "RateChangeResult":
        return cls(changed=False, partial=False, previous_rate=None, new_rate=None)

    @classmethod
    def applied(cls, previous: Optional[float], new: float, partial: bool = False) -> "RateChangeResult":
        return cls(changed=True, partial=partial, previous_rate=previous, new_rate=new)


async def update_offer_rate(
    *,
    offer_id: str,
    new_rate: float,
    rate_type: str = "standard",
    source_id: Optional[str] = None,
    source_url: Optional[str] = None,
    verification_method: Optional[str] = None,
    verified_at: Optional[datetime] = None,
    valid_from: Optional[datetime] = None,
    is_demo: bool = False,
    offers_collection,
    history_collection,
) -> RateChangeResult:
    """Aktualisiert den aktuellen Zinssatz eines Angebots + Historisierung.

    Returns:
        RateChangeResult mit `changed`, `previous_rate`, `new_rate`, `partial`.
    Raises:
        ValueError bei nicht existierendem Offer.
    """
    from bson import ObjectId  # lokaler Import, um Route-freien Test zu erlauben.

    now = datetime.now(timezone.utc)
    valid_from = valid_from or now

    # Offer laden ---------------------------------------------------------
    query = {"_id": ObjectId(offer_id)} if len(offer_id) == 24 else {"_id": offer_id}
    offer = await offers_collection.find_one(query)
    if offer is None:
        raise ValueError(f"offer {offer_id} not found")

    previous_rate = offer.get("interest_rate")
    if previous_rate is not None and float(previous_rate) == float(new_rate):
        return RateChangeResult.unchanged()

    # History schließen (offener Eintrag = valid_until is None) ------------
    await history_collection.update_many(
        {"offer_id": str(offer["_id"]), "valid_until": None, "rate_type": rate_type},
        {"$set": {"valid_until": valid_from}},
    )

    # Neuen History-Eintrag anlegen ---------------------------------------
    await history_collection.insert_one({
        "offer_id": str(offer["_id"]),
        "offer_key": offer.get("product_key"),
        "rate_type": rate_type,
        "rate": float(new_rate),
        "valid_from": valid_from,
        "valid_until": None,
        "source_id": source_id,
        "source_url": source_url,
        "verified_at": verified_at,
        "verification_method": verification_method,
        "is_demo": bool(is_demo),
        "created_at": now,
    })

    # Offer-Aktuellwert setzen --------------------------------------------
    partial = False
    try:
        upd = {
            "interest_rate": float(new_rate),
            "verified_at": verified_at,
            "source_url": source_url,
            "updated_at": now,
        }
        if source_id is not None:
            upd["source_id"] = source_id
        if not is_demo:
            upd["is_demo"] = False
        await offers_collection.update_one({"_id": offer["_id"]}, {"$set": upd})
    except Exception:
        partial = True

    return RateChangeResult.applied(previous_rate, float(new_rate), partial)
