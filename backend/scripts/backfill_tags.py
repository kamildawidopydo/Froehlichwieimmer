"""Session 80.36 — Idempotenter Backfill für strukturierte Tags + Topic-Reclassification.

Usage:
    python3 scripts/backfill_tags.py --dry-run           # Report only
    python3 scripts/backfill_tags.py --write             # Write tags
    python3 scripts/backfill_tags.py --write --reclassify  # Write tags + re-run topic mapper

Regeln:
    * Bestehende non-leere `tags`-Werte werden NICHT überschrieben (Legacy-Schutz).
    * Nur High-Confidence-Tags (≥ MIN_CONF) werden geschrieben.
    * `published_at` bleibt unangetastet.
    * Reclassification setzt `investment_topic_slug` NUR wenn None/leer/ungültig.
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

from tag_extractor import extract_tags_for_document
from topic_mapper import classify_document, VALID_SLUGS

load_dotenv("/app/backend/.env")


async def run(dry_run: bool, reclassify: bool) -> None:
    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    total = 0
    tags_written = 0
    tags_already = 0
    topics_written = 0
    topics_protected = 0
    topics_still_none = 0
    tag_counter: dict[str, int] = {}
    reclass_samples: list[tuple[str, str, int]] = []

    print(f"{'slug':60}  {'new_tags':40}  {'topic':20}")
    print("-" * 130)

    async for d in db.news_articles.find({}, {
        "slug": 1, "title": 1, "summary": 1, "excerpt": 1,
        "category": 1, "tags": 1, "investment_topic_slug": 1,
    }):
        total += 1
        slug = d.get("slug") or "(no-slug)"
        existing_tags = d.get("tags") or []

        proposed = extract_tags_for_document(d)
        for t in proposed:
            tag_counter[t] = tag_counter.get(t, 0) + 1

        needs_tag_write = (not existing_tags) and proposed
        if not needs_tag_write and existing_tags:
            tags_already += 1

        # Topic-Reklassifikation (nur wenn --reclassify aktiv)
        current_topic = d.get("investment_topic_slug")
        topic_action = "—"
        new_topic_slug = None
        if reclassify:
            has_valid = isinstance(current_topic, str) and current_topic in VALID_SLUGS
            if has_valid:
                topics_protected += 1
                topic_action = f"protected:{current_topic}"
            else:
                # Klassifikator mit den frisch ermittelten Tags neu füttern.
                fake_doc = dict(d)
                fake_doc["tags"] = proposed  # noch nicht in DB → simuliert
                m = classify_document(fake_doc)
                if m:
                    new_topic_slug = m.slug
                    topic_action = f"→ {m.slug} (score {m.confidence})"
                    reclass_samples.append((slug, m.slug, m.confidence))
                else:
                    topics_still_none += 1

        if needs_tag_write or new_topic_slug:
            print(f"{slug[:60]:60}  {','.join(proposed)[:40]:40}  {topic_action[:20]}")

        if not dry_run:
            update: dict = {}
            if needs_tag_write:
                update["tags"] = proposed
                update["tags_backfilled_at"] = datetime.now(timezone.utc)
                tags_written += 1
            if new_topic_slug:
                update["investment_topic_slug"] = new_topic_slug
                update["topic_backfilled_at"] = datetime.now(timezone.utc)
                topics_written += 1
            if update:
                await db.news_articles.update_one({"slug": d["slug"]}, {"$set": update})

    print()
    print("─" * 60)
    print(f"analysed             : {total}")
    print(f"tags already present : {tags_already}")
    if dry_run:
        print(f"tags to be written   : (dry-run, not persisted)")
    else:
        print(f"tags written         : {tags_written}")
    if reclassify:
        print(f"topics protected     : {topics_protected}")
        if not dry_run:
            print(f"topics written       : {topics_written}")
        print(f"topics still empty   : {topics_still_none}")
    print()
    print("Top 10 tags:")
    for t, n in sorted(tag_counter.items(), key=lambda x: -x[1])[:10]:
        print(f"  {t:20}  {n}")


def _main() -> None:
    p = argparse.ArgumentParser()
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--dry-run", action="store_true")
    g.add_argument("--write", action="store_true")
    p.add_argument("--reclassify", action="store_true", help="Also re-run topic mapper against fresh tags")
    args = p.parse_args()
    asyncio.run(run(dry_run=args.dry_run, reclassify=args.reclassify))


if __name__ == "__main__":
    _main()
