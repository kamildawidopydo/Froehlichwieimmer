"""Session 93 · Phase 3 — Zentrale Data-Freshness-Regeln.

Eine einzige Quelle der Wahrheit für "wie frisch ist ein Datensatz?".
Wird von Backend UND (via API-Antwort) vom Frontend konsumiert — keine
verteilte Business-Logik.
"""
from __future__ import annotations
import os
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

# ---------------------------------------------------------------------------
# Konfigurierbare Fristen (Environment kann sie überschreiben).
# ---------------------------------------------------------------------------
FRESH_MAX_DAYS = int(os.environ.get("SAVINGS_FRESH_MAX_DAYS", "7"))
STALE_MAX_DAYS = int(os.environ.get("SAVINGS_STALE_MAX_DAYS", "30"))

FreshnessLabel = Literal["fresh", "stale", "expired", "demo", "unknown"]

# ---------------------------------------------------------------------------
# Phase 6A.1 — Verified-Semantik.
# Ein Angebot gilt nur dann als voll verifiziert, wenn *alle* Provenance-Felder
# gesetzt sind UND is_demo=False. Diese Liste ist die *einzige* Quelle der
# Wahrheit für "verified" — sie muss vom Public-API-Filter, vom Serializer und
# von der UI konsistent verwendet werden.
# ---------------------------------------------------------------------------
VERIFIED_REQUIRED_FIELDS = (
    "source_id",
    "verified_at",
    "verification_method",
    "source_retrieved_at",
)


def _to_utc(v):
    if isinstance(v, str):
        try:
            v = datetime.fromisoformat(v.replace("Z", "+00:00"))
        except ValueError:
            return None
    if isinstance(v, datetime):
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v
    return None


def is_fully_verified(offer: dict) -> bool:
    """Streng: Demo → False. Sonst alle Provenance-Pflichtfelder + status active."""
    if bool(offer.get("is_demo")):
        return False
    if bool(offer.get("is_active", True)) is False:
        return False
    status = (offer.get("status") or "active").lower()
    if status != "active":
        return False
    for f in VERIFIED_REQUIRED_FIELDS:
        v = offer.get(f)
        if v is None:
            return False
        if isinstance(v, str) and not v.strip():
            return False
    return True


def data_status(offer: dict) -> Literal["verified", "unverified", "demo"]:
    """Klassifiziert die Provenance-Herkunft eines Angebots.

    - `demo`   — is_demo=True
    - `verified` — vollständige Provenance + aktiv
    - `unverified` — real (is_demo=False), aber Provenance unvollständig
    """
    if bool(offer.get("is_demo")):
        return "demo"
    return "verified" if is_fully_verified(offer) else "unverified"


def compute_freshness(
    verified_at: Optional[datetime],
    valid_until: Optional[datetime] = None,
    is_demo: bool = False,
    now: Optional[datetime] = None,
) -> FreshnessLabel:
    """Ermittelt ein UI-Label für die Datenqualität.

    - `demo`: Demo-Dokument — nie „verified".
    - `expired`: valid_until in der Vergangenheit.
    - `unknown`: kein `verified_at` gesetzt (nicht-Demo).
    - `fresh` / `stale`: nach FRESH_MAX_DAYS / STALE_MAX_DAYS.

    Hinweis · Phase 6A.1: Provenance-Vollständigkeit wird über das separate
    Feld `data_status` transportiert; die UI darf „Zuletzt geprüft"-Aussagen
    ausschließlich bei `data_status == 'verified'` treffen.
    """
    now = now or datetime.now(timezone.utc)
    if is_demo:
        return "demo"
    vu = _to_utc(valid_until)
    if vu and vu < now:
        return "expired"
    va = _to_utc(verified_at)
    if va is None:
        return "unknown"
    age = now - va
    if age <= timedelta(days=FRESH_MAX_DAYS):
        return "fresh"
    if age <= timedelta(days=STALE_MAX_DAYS):
        return "stale"
    return "stale"


def freshness_summary(offer: dict, now: Optional[datetime] = None) -> dict:
    """Anzeigefertige Freshness-Info für ein Offer-Dokument."""
    label = compute_freshness(
        verified_at=offer.get("verified_at"),
        valid_until=offer.get("valid_until"),
        is_demo=bool(offer.get("is_demo")),
        now=now,
    )
    return {
        "label": label,
        "verified_at": offer.get("verified_at"),
        "valid_until": offer.get("valid_until"),
        "provenance_complete": is_fully_verified(offer),
        "fresh_max_days": FRESH_MAX_DAYS,
        "stale_max_days": STALE_MAX_DAYS,
    }
