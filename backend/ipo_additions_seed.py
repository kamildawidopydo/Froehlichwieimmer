import importlib.util
from datetime import datetime, timezone
from pathlib import Path

HIDDEN_TEST_ENTRIES = ["No-Ticker AG", "Preview Test1 AG", "Preview Test2 AG", "Preview Test3 AG"]


def _load_items():
    spec = importlib.util.spec_from_file_location(
        "ipo_items", Path(__file__).parent / "scripts" / "ipo_additions_items.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.BASE, mod.ITEMS


async def seed_ipo_additions(db):
    """Insert-only: existing catalog entries and customer data stay untouched."""
    base, items = _load_items()
    now = datetime.now(timezone.utc)
    inserted = 0
    for it in items:
        key = "manual:" + it["company_name"].lower().replace(" ", "-")
        doc = {**base, **it, "external_key": key, "created_at": now, "updated_at": now}
        r = await db.ipo_catalog.update_one({"external_key": key}, {"$setOnInsert": doc}, upsert=True)
        inserted += 1 if r.upserted_id else 0
    await db.ipo_catalog.update_many(
        {"company_name": {"$in": HIDDEN_TEST_ENTRIES}, "is_visible": True}, {"$set": {"is_visible": False}})
    return inserted
