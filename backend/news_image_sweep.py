"""Periodischer Image-Sweep für publizierte News-/Einordnungs-Artikel.

Externe Bild-Hosts (v.a. Unsplash) können Fotos NACH der Publikation entfernen.
Der News-Synthesizer prüft nur zum Publish-Zeitpunkt via
`_validate_image_url()`. Diese Funktion validiert dieselbe URL periodisch
noch einmal und markiert defekte URLs sauber in Mongo, sodass der Frontend-
`SafeNewsImage`-Fallback (Session 75.2) sofort greifen kann.

Design-Entscheidungen
- Wiederverwendet den bestehenden Validator aus `news_synthesizer.py` —
  keine parallele HTTP-Logik.
- Idempotent: nur Datensätze mit nicht-leerer `image_url` werden geprüft,
  bereits bereinigte Records (`image_url=None`) werden übersprungen.
- Moderate Concurrency (Semaphore=6) — kein aggressives Hämmern gegen einen
  Host, aber schneller als seriell.
- Einzelne Ausnahmen pro Artikel isoliert; ein toter Host darf den Sweep
  nicht abbrechen.
- Kein Reset von `image_broken=True` bei sich später wieder-erholenden URLs
  (bewusst: die URL wurde bereits als unzuverlässig markiert).
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

# Reuse bestehende Validator-Funktion — keine parallele HTTP-Validierung.
from news_synthesizer import _validate_image_url  # noqa: E402

logger = logging.getLogger(__name__)

# Collections mit publiziertem Bild-Content, die geprüft werden sollen.
# `news_articles`   → editorial synthesized articles + aggregated news
# `editorial_posts` → „Unsere Einordnungen" (Redaktion) — optional
_SWEEP_COLLECTIONS = ("news_articles", "editorial_posts")

# HTTP-Concurrency: schnell genug, aber nicht aggressiv gegen einen Host.
_MAX_CONCURRENT = 6
# Timeout pro URL (leicht großzügiger als beim Sync, weil einige Bild-CDNs
# unter Last langsam antworten).
_TIMEOUT_S = 6.0


async def _check_one(
    db: AsyncIOMotorDatabase,
    coll_name: str,
    doc: Dict[str, Any],
    sem: asyncio.Semaphore,
) -> str:
    """Prüfe ein einzelnes Dokument. Rückgabe:
    'valid' | 'broken' | 'error' | 'skip'.
    """
    url = doc.get("image_url")
    slug = doc.get("slug") or str(doc.get("_id"))
    if not url or not isinstance(url, str) or not url.startswith(("http://", "https://")):
        return "skip"
    async with sem:
        try:
            ok = await _validate_image_url(url, timeout=_TIMEOUT_S)
        except Exception as exc:  # noqa: BLE001 — Validator sollte selbst schon fangen
            logger.warning("image_sweep_error coll=%s slug=%s err=%s", coll_name, slug, exc)
            return "error"
    if ok:
        return "valid"
    # Defekt → sanft entschärfen. Original-URL für spätere Diagnose speichern.
    now = datetime.now(timezone.utc)
    update = {
        "$set": {
            "image_url": None,
            "hero_image_url": None,
            "image_broken": True,
            "image_broken_at": now,
            "image_broken_url": url,
        }
    }
    try:
        await db[coll_name].update_one({"_id": doc["_id"]}, update)
    except Exception as exc:  # noqa: BLE001
        logger.error("image_sweep_db_write_failed coll=%s slug=%s err=%s", coll_name, slug, exc)
        return "error"
    logger.info(
        "image_sweep_broken coll=%s slug=%s url=%s",
        coll_name,
        slug,
        url[:120],
    )
    return "broken"


async def validate_published_news_images(
    db: AsyncIOMotorDatabase,
    *,
    limit: Optional[int] = None,
) -> Dict[str, Any]:
    """Prüft alle Dokumente mit nicht-leerer image_url über die konfigurierten
    Collections. Rückgabe: kompaktes Summary-Dict für den Cron-Response und Logs.

    Nur veröffentlichte Artikel (`status=published`) werden geprüft; Drafts
    und `needs_review` bleiben unangetastet.

    `limit` (optional) begrenzt die Anzahl geprüfter Docs pro Collection —
    hilfreich für Testläufe.
    """
    started = datetime.now(timezone.utc)
    sem = asyncio.Semaphore(_MAX_CONCURRENT)
    per_collection: Dict[str, Dict[str, int]] = {}
    total = {"checked": 0, "valid": 0, "broken": 0, "errors": 0, "skipped": 0}

    for coll_name in _SWEEP_COLLECTIONS:
        coll = db.get_collection(coll_name)
        # Existenz einer Collection prüfen (editorial_posts kann fehlen).
        try:
            names = await db.list_collection_names()
            if coll_name not in names:
                per_collection[coll_name] = {"checked": 0, "valid": 0, "broken": 0, "errors": 0, "skipped": 0, "note": "missing"}
                continue
        except Exception:
            pass

        query: Dict[str, Any] = {
            "image_url": {"$type": "string", "$ne": ""},
        }
        # Nur News-Collection hat einen status-Filter; editorial_posts hat kein status-Feld.
        if coll_name == "news_articles":
            query["status"] = "published"

        cursor = coll.find(query, {"_id": 1, "slug": 1, "image_url": 1})
        if limit and isinstance(limit, int) and limit > 0:
            cursor = cursor.limit(limit)
        docs: List[Dict[str, Any]] = [d async for d in cursor]

        stats = {"checked": 0, "valid": 0, "broken": 0, "errors": 0, "skipped": 0}
        # asyncio.gather statt Semaphore-Serial für moderate Parallelität.
        results = await asyncio.gather(
            *[_check_one(db, coll_name, d, sem) for d in docs],
            return_exceptions=False,
        )
        for r in results:
            stats["checked"] += 1
            if r == "valid":
                stats["valid"] += 1
            elif r == "broken":
                stats["broken"] += 1
            elif r == "error":
                stats["errors"] += 1
            elif r == "skip":
                stats["skipped"] += 1
        per_collection[coll_name] = stats
        for k in ("checked", "valid", "broken", "errors", "skipped"):
            total[k] += stats[k]

    finished = datetime.now(timezone.utc)
    duration_s = round((finished - started).total_seconds(), 2)
    summary = {
        "ok": True,
        "started_at": started.isoformat(),
        "finished_at": finished.isoformat(),
        "duration_seconds": duration_s,
        "totals": total,
        "per_collection": per_collection,
    }
    logger.info(
        "image_sweep_done checked=%d valid=%d broken=%d errors=%d skipped=%d duration=%.2fs",
        total["checked"], total["valid"], total["broken"], total["errors"], total["skipped"], duration_s,
    )
    return summary


__all__ = ["validate_published_news_images"]
