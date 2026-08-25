"""News Retention Archive (P1).

Verschiebt Artikel aus der Live-Collection `news_articles`, die älter als
`RETENTION_DAYS` (Default 90) sind, in eine separate Archiv-Collection
`news_articles_archive`. Ziel: die Live-Collection performant halten, ohne
redaktionelle Inhalte oder alte URLs zu verlieren.

Design-Prinzipien
─────────────────
- **Kein Datenverlust**: Ablauf pro Kandidat = 1) Archiv-Write (Upsert nach `_id`),
  2) Verifikation, 3) erst dann Delete aus Live. Bei Fehler bleibt der Live-Doc
  unangetastet.
- **Idempotent**: Wiederholte Läufe sind ungefährlich (Replace-Upsert nach `_id`).
- **Datumsfeld**: ausschließlich `published_at` (Feld ist heute in 100 % der Docs
  vorhanden). Docs ohne `published_at` werden übersprungen und geloggt — niemals
  gelöscht.
- **Zeitzone**: UTC durchgängig.
- **Batching**: begrenzte Batchgröße (`batch_size`), damit ein Lauf nicht die
  gesamte Collection auf einmal anfasst.
- **Dry-Run**: `dry_run=True` liefert Statistik ohne DB-Änderungen.
- **Auditfeld**: archivierte Docs erhalten `archived_at` (UTC) und
  `archive_reason` (`"retention_90d"`). Redaktionelle Inhalte bleiben unverändert.

Fallback-Reads
──────────────
Für Slug-/ID-Detail-Lookups siehe `find_article_by_slug()` — dieser Helper
sucht erst Live, dann Archiv. Feed-Listings bleiben strikt Live-only.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Iterable

logger = logging.getLogger(__name__)

LIVE_COLLECTION = "news_articles"
ARCHIVE_COLLECTION = "news_articles_archive"

DEFAULT_RETENTION_DAYS = int(os.environ.get("NEWS_RETENTION_DAYS", "90") or 90)
DEFAULT_BATCH_SIZE = int(os.environ.get("NEWS_RETENTION_BATCH_SIZE", "200") or 200)
ARCHIVE_REASON = "retention_90d"


def _cutoff(retention_days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=max(1, int(retention_days)))


async def ensure_indexes(db) -> dict:
    """Stellt sicher, dass beide Collections die Retention-relevanten Indizes
    besitzen. Idempotent: MongoDB überspringt bestehende Indizes.
    """
    live = db[LIVE_COLLECTION]
    archive = db[ARCHIVE_COLLECTION]

    created: list[str] = []
    # Live: schneller Cutoff-Scan + Sort auf published_at (auch anderswo genutzt).
    created.append(await live.create_index([("published_at", -1)], name="published_at_desc"))
    # Archiv: gleiche Zugriffsmuster + Slug-Lookup (nicht-unique, weil legacy
    # theoretisch Dubletten enthalten könnte).
    created.append(await archive.create_index([("published_at", -1)], name="published_at_desc"))
    created.append(await archive.create_index("slug", name="slug_idx"))
    return {"indexes": created}


async def dry_run_stats(db, retention_days: int = DEFAULT_RETENTION_DAYS) -> dict:
    """Nur zählen und Grenzwerte ermitteln — keine DB-Änderungen."""
    live = db[LIVE_COLLECTION]
    cutoff = _cutoff(retention_days)

    candidates = await live.count_documents({"published_at": {"$lt": cutoff}})
    missing_pub = await live.count_documents({
        "$or": [{"published_at": {"$exists": False}}, {"published_at": None}],
    })

    oldest = await live.find_one(
        {"published_at": {"$lt": cutoff}},
        sort=[("published_at", 1)], projection={"slug": 1, "published_at": 1},
    )
    newest = await live.find_one(
        {"published_at": {"$lt": cutoff}},
        sort=[("published_at", -1)], projection={"slug": 1, "published_at": 1},
    )

    def _iso(v: Any) -> str | None:
        return v.isoformat() if isinstance(v, datetime) else None

    return {
        "dry_run": True,
        "retention_days": retention_days,
        "cutoff_utc": cutoff.isoformat(),
        "candidates": int(candidates),
        "skipped_missing_published_at": int(missing_pub),
        "oldest_candidate": {"slug": oldest.get("slug"), "published_at": _iso(oldest.get("published_at"))} if oldest else None,
        "newest_candidate": {"slug": newest.get("slug"), "published_at": _iso(newest.get("published_at"))} if newest else None,
    }


async def run_retention_archive(
    db,
    retention_days: int = DEFAULT_RETENTION_DAYS,
    batch_size: int = DEFAULT_BATCH_SIZE,
    dry_run: bool = False,
) -> dict:
    """Verschiebt Artikel älter als `retention_days` in das Archiv.

    Rückgabe: strukturierte Statistik (siehe unten). Bei Fehlern werden diese
    pro Dokument geloggt; der Live-Doc bleibt in allen Fehlerpfaden unangetastet.
    """
    started_at = datetime.now(timezone.utc)
    if dry_run:
        stats = await dry_run_stats(db, retention_days=retention_days)
        stats["duration_ms"] = int((datetime.now(timezone.utc) - started_at).total_seconds() * 1000)
        return stats

    live = db[LIVE_COLLECTION]
    archive = db[ARCHIVE_COLLECTION]
    cutoff = _cutoff(retention_days)
    batch_size = max(1, min(int(batch_size or DEFAULT_BATCH_SIZE), 1000))

    result = {
        "dry_run": False,
        "retention_days": retention_days,
        "cutoff_utc": cutoff.isoformat(),
        "batch_size": batch_size,
        "candidates": 0,
        "archived": 0,
        "already_archived": 0,
        "skipped_missing_published_at": 0,
        "errors": 0,
        "deleted_from_live": 0,
        "duration_ms": 0,
    }

    # Kandidaten strikt anhand `published_at < cutoff`. Docs ohne
    # `published_at` werden separat gezählt, aber nie archiviert.
    result["skipped_missing_published_at"] = await live.count_documents({
        "$or": [{"published_at": {"$exists": False}}, {"published_at": None}],
    })

    query = {"published_at": {"$lt": cutoff}}
    result["candidates"] = await live.count_documents(query)

    cursor = live.find(query).sort("published_at", 1).limit(batch_size)
    docs = await cursor.to_list(batch_size)

    for doc in docs:
        doc_id = doc.get("_id")
        slug = doc.get("slug")
        try:
            # Idempotenz-Check: schon im Archiv?
            existing = await archive.find_one({"_id": doc_id}, projection={"_id": 1})
            already_archived = existing is not None

            # Doc für Archiv anreichern (Original-Inhalt unverändert lassen —
            # nur Auditfelder hinzufügen; keine redaktionellen Felder überschreiben).
            archive_doc = dict(doc)
            archive_doc["archived_at"] = datetime.now(timezone.utc)
            archive_doc["archive_reason"] = ARCHIVE_REASON

            # Replace-Upsert nach _id → stabile ID bleibt erhalten, Wiederholungen
            # sind ungefährlich.
            await archive.replace_one({"_id": doc_id}, archive_doc, upsert=True)

            # Verifikation: Archiv-Read muss den Doc jetzt liefern.
            verify = await archive.find_one({"_id": doc_id}, projection={"_id": 1})
            if verify is None:
                # Sicherheitsnetz: Archiv-Write nicht bestätigt → Live NICHT löschen.
                logger.error("news_retention: archive verify failed for _id=%s slug=%s", doc_id, slug)
                result["errors"] += 1
                continue

            # Erst jetzt aus Live entfernen.
            delete_res = await live.delete_one({"_id": doc_id})
            if delete_res.deleted_count == 1:
                result["deleted_from_live"] += 1
                if already_archived:
                    result["already_archived"] += 1
                else:
                    result["archived"] += 1
            else:
                # Live-Delete hat 0 Dokumente entfernt → sehr ungewöhnlich, aber
                # kein Datenverlust (Archiv hat die Kopie). Als Fehler zählen.
                logger.warning("news_retention: live delete count=0 for _id=%s slug=%s", doc_id, slug)
                result["errors"] += 1
        except Exception:  # noqa: BLE001
            logger.exception("news_retention: archive failed for _id=%s slug=%s", doc_id, slug)
            result["errors"] += 1
            # Live-Doc unangetastet lassen — nächster Lauf versucht ihn erneut.
            continue

    # Persistiere Lauf-Summary (analog zu job_summaries für News-Fetcher).
    finished_at = datetime.now(timezone.utc)
    result["duration_ms"] = int((finished_at - started_at).total_seconds() * 1000)
    try:
        await db.job_summaries.update_one(
            {"_id": "news_retention"},
            {"$set": {
                "last_started_at": started_at,
                "last_success_at": finished_at,
                "last_summary": result,
            }},
            upsert=True,
        )
    except Exception:  # noqa: BLE001
        logger.exception("news_retention: failed to persist job_summary")

    return result


async def find_article_by_slug(db, slug: str, *, include_archive: bool = True):
    """Slug-Detail-Lookup mit Archiv-Fallback.

    Reihenfolge:
      1) Live-Collection (`is_published: True`)
      2) Archiv-Collection (falls `include_archive`)

    Rückgabe: das Mongo-Dokument oder `None`. Keine Public-Shape-Umformung —
    das erledigt weiterhin der jeweilige Caller (`MongoNewsProvider._to_public`,
    `news_nachrichten_related`, `/news/by-slugs`).
    """
    if not slug:
        return None
    live_doc = await db[LIVE_COLLECTION].find_one({"slug": slug, "is_published": True})
    if live_doc:
        return live_doc
    if not include_archive:
        return None
    # Archiv: `is_published` wurde beim Verschieben mitkopiert. Wir erlauben
    # nur ehemals veröffentlichte Artikel als Fallback (nie Drafts freigeben).
    return await db[ARCHIVE_COLLECTION].find_one({"slug": slug, "is_published": True})


async def find_articles_by_slugs(db, slugs: Iterable[str], *, include_archive: bool = True) -> dict:
    """Batch-Variante von `find_article_by_slug`. Reihenfolge der Eingabe
    wird nicht garantiert (Callers sortieren selbst).

    Rückgabe: Dict `{slug: doc}` — nur gefundene Slugs sind enthalten.
    """
    slug_list = [s for s in (slugs or []) if s]
    if not slug_list:
        return {}
    out: dict[str, dict] = {}
    live_cursor = db[LIVE_COLLECTION].find({
        "slug": {"$in": slug_list},
        "is_published": True,
    })
    async for d in live_cursor:
        out[d["slug"]] = d
    if include_archive:
        remaining = [s for s in slug_list if s not in out]
        if remaining:
            arch_cursor = db[ARCHIVE_COLLECTION].find({
                "slug": {"$in": remaining},
                "is_published": True,
            })
            async for d in arch_cursor:
                out[d["slug"]] = d
    return out


async def retention_status(db) -> dict:
    """Read-only Health-Report für die Retention-Pipeline (für Admin-UI)."""
    live_count = await db[LIVE_COLLECTION].count_documents({})
    archive_count = await db[ARCHIVE_COLLECTION].count_documents({})
    summary = await db.job_summaries.find_one({"_id": "news_retention"}) or {}

    def _iso(v: Any) -> str | None:
        return v.isoformat() if isinstance(v, datetime) else None

    last = summary.get("last_summary") if summary else None
    return {
        "live_count": int(live_count),
        "archive_count": int(archive_count),
        "retention_days": DEFAULT_RETENTION_DAYS,
        "last_started_at": _iso(summary.get("last_started_at")),
        "last_success_at": _iso(summary.get("last_success_at")),
        "last_summary": last,
    }
