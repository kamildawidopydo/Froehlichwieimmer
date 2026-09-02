"""Session 80.74 — Backfill `related_symbols` on `news_articles` for the last
7 days using the single-source alias detector from stock_public.py.

Idempotent: only writes when the array actually differs from what is stored.
Also creates a compound index for the stock-news query. Safe to rerun.
"""

from __future__ import annotations

import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from routes.stock_public import detect_related_symbols  # noqa: E402


async def main() -> None:
    client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
    db = client[os.environ["DB_NAME"]]

    # Compound index for /api/stocks/{symbol}/news lookups.
    try:
        idx_name = await db.news_articles.create_index(
            [("related_symbols", 1), ("status", 1), ("published_at", -1)],
            name="related_symbols_status_publishedAt",
        )
        print(f"  index ok: {idx_name}")
    except Exception as exc:  # noqa: BLE001
        print(f"  index warning: {exc}")

    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    cursor = db.news_articles.find(
        {"status": {"$in": ["published", None]}, "is_archived": {"$ne": True},
         "published_at": {"$gte": cutoff}},
        {"slug": 1, "title": 1, "subtitle": 1, "summary": 1, "related_symbols": 1},
    )
    docs = await cursor.to_list(1000)
    scanned = updated = unchanged = tagged = 0
    dist: dict = {}
    for d in docs:
        scanned += 1
        detected = detect_related_symbols(
            title=d.get("title") or "",
            subtitle=d.get("subtitle") or "",
            summary=d.get("summary") or "",
        )
        current = d.get("related_symbols") or []
        if sorted(detected) == sorted(current):
            unchanged += 1
            if detected:
                tagged += 1
            for s in detected:
                dist[s] = dist.get(s, 0) + 1
            continue
        await db.news_articles.update_one({"_id": d["_id"]}, {"$set": {"related_symbols": detected}})
        updated += 1
        if detected:
            tagged += 1
        for s in detected:
            dist[s] = dist.get(s, 0) + 1
        print(f"  {d.get('slug','?')[:60]:60s} → {detected}")

    print("")
    print(f"  scanned:      {scanned}")
    print(f"  updated:      {updated}")
    print(f"  unchanged:    {unchanged}")
    print(f"  with tags:    {tagged}")
    print(f"  distribution: {dict(sorted(dist.items()))}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
