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
        "fresh_max_days": FRESH_MAX_DAYS,
        "stale_max_days": STALE_MAX_DAYS,
    }
