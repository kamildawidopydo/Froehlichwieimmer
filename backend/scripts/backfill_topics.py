"""Session 80.31 — Idempotenter Backfill für `news_articles.investment_topic_slug`.

Usage:
    python3 scripts/backfill_topics.py --dry-run   # Report, keine Writes
    python3 scripts/backfill_topics.py --write     # tatsächlich schreiben

Regeln:
    * Ausschließlich Dokumente ohne oder mit leerem `investment_topic_slug`
      werden angefasst. Bestehende gültige Zuordnungen sind geschützt.
    * Nur High-Confidence-Matches (Score ≥ 5) werden geschrieben.
    * `published_at` bleibt unangetastet — Backfill ändert NUR das Topic-Feld
      und setzt `topic_backfilled_at` als Audit-Marker.
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys
from datetime import datetime, timezone

# Ensure /app/backend is on sys.path so relative imports work when script
# is invoked directly.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

from topic_mapper import classify_document, VALID_SLUGS  # noqa: E402


load_dotenv("/app/backend/.env")


def _needs_backfill(doc: dict) -> bool:
    v = doc.get("investment_topic_slug")
    if v is None:
        return True
    if isinstance(v, str) and not v.strip():
        return True
    # Legacy-Werte, die nicht (mehr) im gültigen Slug-Set stehen, werden auch
    # als „needs backfill" behandelt — allerdings NUR wenn keinerlei
    # Klassifikator-Kollision besteht. Wir zeigen sie im Dry Run.
    if isinstance(v, str) and v.strip() and v.strip() not in VALID_SLUGS:
        return True
    return False


async def run(dry_run: bool) -> None:
    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    total = 0
    already_valid = 0
    proposed = 0
    written = 0
    rejected_low_confidence = 0
    legacy_invalid = 0

    header = f"{'slug':60}  {'old':10}  {'new':10}  {'score':>5}  reasons"
    print(header)
    print("-" * len(header))

    async for d in db.news_articles.find({}, {
        "slug": 1, "title": 1, "summary": 1, "excerpt": 1,
        "category": 1, "tags": 1, "topics": 1, "investment_topic_slug": 1,
    }):
        total += 1
        current = d.get("investment_topic_slug")
        if current in VALID_SLUGS and not _needs_backfill(d):
            already_valid += 1
            continue

        if isinstance(current, str) and current and current not in VALID_SLUGS:
            legacy_invalid += 1

        match = classify_document(d)
        if not match:
            rejected_low_confidence += 1
            continue

        proposed += 1
        slug = d.get("slug") or "(no-slug)"
        # kurze Titel-Anzeige für Report
        title_short = (d.get("title") or "")[:55]
        print(f"{slug[:60]:60}  {str(current or '-'):10}  {match.slug:10}  {match.confidence:>5}  {', '.join(match.reasons[:3])}")

        if not dry_run:
            res = await db.news_articles.update_one(
                {"slug": d["slug"], "$or": [
                    {"investment_topic_slug": None},
                    {"investment_topic_slug": ""},
                    {"investment_topic_slug": {"$exists": False}},
                    {"investment_topic_slug": {"$nin": list(VALID_SLUGS)}},
                ]},
                {"$set": {
                    "investment_topic_slug": match.slug,
                    "topic_backfilled_at": datetime.now(timezone.utc),
                    "topic_backfill_confidence": int(match.confidence),
                }},
            )
            if res.modified_count:
                written += 1

    print()
    print("─" * 60)
    print(f"analysed        : {total}")
    print(f"already valid   : {already_valid}   (protected — not touched)")
    print(f"legacy invalid  : {legacy_invalid}  (proposed re-classification)")
    print(f"proposed        : {proposed}")
    print(f"low confidence  : {rejected_low_confidence}  (no topic set — better none than wrong)")
    if dry_run:
        print("mode            : DRY-RUN — no writes")
    else:
        print(f"written         : {written}")


def _main() -> None:
    p = argparse.ArgumentParser()
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--dry-run", action="store_true")
    g.add_argument("--write", action="store_true")
    args = p.parse_args()
    asyncio.run(run(dry_run=args.dry_run))


if __name__ == "__main__":
    _main()
