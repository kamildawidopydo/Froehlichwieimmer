"""One-shot Backfill für bestehende news_articles ohne Volltext.

Verarbeitet **max. 100** publizierte Artikel, deren `content` fehlt oder
offensichtlich nur ein Teaser (<200 Wörter) ist. Nutzt die bereits
gespeicherten `source_names`/`source_urls` und ruft Claude Sonnet 5 einmal
pro Artikel auf, um einen eigenständigen Redaktions-Volltext zu erzeugen.

Idempotent: setzt `content_backfilled_at` auf jeden bearbeiteten Datensatz.
Bereits migrierte Artikel werden übersprungen. Bei einzelnen LLM-Fehlern
wird weitergemacht.

Aufruf:
    cd /app/backend && python -m scripts.backfill_content
"""
from __future__ import annotations

import asyncio
import logging
import os
import sys
from datetime import datetime, timezone

# Ermöglicht `python -m scripts.backfill_content` aus /app/backend.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402
from dotenv import load_dotenv  # noqa: E402

from news_synthesizer import (  # noqa: E402
    _synthesize_article,
    _quality_gate,
    _detect_category,
    _target_length,
    _score_relevance,
)

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("backfill")

MIN_CONTENT_WORDS = 200  # unter diesem Wert gilt der Artikel als Teaser
MAX_TO_PROCESS = 100


async def run() -> dict:
    load_dotenv("/app/backend/.env")
    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    stats = {"total_candidates": 0, "processed": 0, "backfilled": 0,
             "skipped_already_done": 0, "skipped_no_sources": 0,
             "quality_failed": 0, "llm_failed": 0}

    # Kandidaten: publiziert, content fehlt / zu kurz, nicht bereits gebackfilled
    query = {
        "is_published": True,
        "status": "published",
        "content_backfilled_at": {"$exists": False},
    }
    cursor = db.news_articles.find(query).sort([("published_at", -1)]).limit(300)
    docs = await cursor.to_list(300)

    for doc in docs:
        if stats["processed"] >= MAX_TO_PROCESS:
            break
        content = (doc.get("content") or "").strip()
        words = len(content.split())
        # Bereits ausreichender Volltext → nur Marker setzen, damit wir das
        # nächste Mal nicht wieder anfassen.
        if words >= MIN_CONTENT_WORDS:
            await db.news_articles.update_one(
                {"_id": doc["_id"]},
                {"$set": {"content_backfilled_at": datetime.now(timezone.utc),
                          "content_backfill_skipped": "already_full"}},
            )
            stats["skipped_already_done"] += 1
            continue

        sources = doc.get("source_names") or []
        urls = doc.get("source_urls") or []
        if not sources:
            stats["skipped_no_sources"] += 1
            logger.warning("skip_no_sources slug=%s", doc.get("slug"))
            continue

        stats["processed"] += 1
        # Fake-Raw-Item für _synthesize_article bauen (nur ein Item — es liegt
        # keine echte RSS-Roh-Meldung mehr vor, wir nutzen title/summary).
        pseudo_raw = {
            "fingerprint": doc.get("raw_fingerprint") or (doc.get("slug") or "x")[:16],
            "title": doc.get("title", ""),
            "summary": doc.get("summary", "") or doc.get("subtitle", ""),
            "source_names": sources,
            "source_urls": urls,
            "published_at": doc.get("published_at"),
            "primary_source": False,
        }
        category = doc.get("category") or _detect_category(f"{pseudo_raw['title']} {pseudo_raw['summary']}")
        relevance = doc.get("relevance_score") or _score_relevance(pseudo_raw)
        target = _target_length(category, sources, False, relevance)

        logger.info("backfill_start slug=%s target=%s sources=%s",
                    doc.get("slug"), target, sources)
        article = await _synthesize_article([pseudo_raw], target=target)
        if not article:
            stats["llm_failed"] += 1
            logger.error("backfill_llm_failed slug=%s", doc.get("slug"))
            continue

        ok, reason = _quality_gate(article, sources, False)
        if not ok:
            stats["quality_failed"] += 1
            logger.warning("backfill_quality_failed slug=%s reason=%s",
                           doc.get("slug"), reason)
            continue

        now = datetime.now(timezone.utc)
        await db.news_articles.update_one(
            {"_id": doc["_id"]},
            {"$set": {
                "title": article.get("title") or doc.get("title"),
                "subtitle": article.get("subtitle") or doc.get("subtitle"),
                "summary": article.get("summary") or doc.get("summary"),
                "content": article.get("content"),
                "target_length": {"min": target[0], "max": target[1]},
                "content_backfilled_at": now,
                "updated_at": now,
                "last_verified_at": now,
            }},
        )
        stats["backfilled"] += 1
        logger.info("backfill_ok slug=%s words=%d",
                    doc.get("slug"), len(article.get("content", "").split()))

    stats["total_candidates"] = len(docs)
    logger.info("backfill_summary %s", stats)
    return stats


if __name__ == "__main__":
    result = asyncio.run(run())
    print(f"\nBackfill fertig: {result}")
