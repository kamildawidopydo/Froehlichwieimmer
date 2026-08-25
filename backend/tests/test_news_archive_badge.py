"""Session 79.5 — Regression: „Aus dem Archiv"-Badge im Public-Response.

Prüft, dass:
- Live-Docs `is_archived=False` liefern (kein Badge)
- Archiv-Docs `is_archived=True` + `archived_at` liefern (Badge sichtbar)
- fehlt `archived_at` im Archiv-Doc → Badge trotzdem True, Datum None
- `_from_archive`-Marker wird von `find_article_by_slug` korrekt gesetzt
- Serializer entfernt `_from_archive` aus dem Public-Response (interner Marker)
"""
from __future__ import annotations

import asyncio
import copy
import os
import sys
import uuid
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from news_retention import (  # noqa: E402
    ARCHIVE_COLLECTION,
    LIVE_COLLECTION,
    find_article_by_slug,
    find_articles_by_slugs,
)


class _FakeCol:
    def __init__(self):
        self.docs = {}

    def _match(self, d, q):
        for k, v in q.items():
            if isinstance(v, dict) and "$in" in v:
                if d.get(k) not in v["$in"]:
                    return False
            elif d.get(k) != v:
                return False
        return True

    async def find_one(self, q, projection=None, sort=None):
        for d in self.docs.values():
            if self._match(d, q):
                return copy.deepcopy(d)
        return None

    def find(self, q=None, projection=None):
        q = q or {}
        matched = [copy.deepcopy(d) for d in self.docs.values() if self._match(d, q)]

        class _Cursor:
            def __init__(self, docs):
                self.docs = docs

            def __aiter__(self):
                self._it = iter(self.docs)
                return self

            async def __anext__(self):
                try:
                    return next(self._it)
                except StopIteration:
                    raise StopAsyncIteration
        return _Cursor(matched)

    def seed(self, d):
        d = copy.deepcopy(d)
        d.setdefault("_id", uuid.uuid4().hex)
        self.docs[d["_id"]] = d


class _FakeDB:
    def __init__(self):
        self._c = {}

    def __getitem__(self, n):
        if n not in self._c:
            self._c[n] = _FakeCol()
        return self._c[n]


def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def test_live_doc_returned_with_from_archive_false():
    async def _t():
        db = _FakeDB()
        db[LIVE_COLLECTION].seed({
            "slug": "hello", "is_published": True, "title": "Hello", "published_at": datetime(2026, 8, 20, tzinfo=timezone.utc),
        })
        d = await find_article_by_slug(db, "hello")
        assert d is not None
        assert d["_from_archive"] is False
        assert d.get("archived_at") is None

    _run(_t())


def test_archive_doc_returned_with_from_archive_true_and_archived_at():
    async def _t():
        db = _FakeDB()
        archived_dt = datetime(2026, 5, 20, 12, 0, tzinfo=timezone.utc)
        db[ARCHIVE_COLLECTION].seed({
            "slug": "old-news", "is_published": True, "title": "Alt", "published_at": datetime(2026, 1, 1, tzinfo=timezone.utc),
            "archived_at": archived_dt, "archive_reason": "retention_90d",
        })
        d = await find_article_by_slug(db, "old-news")
        assert d is not None
        assert d["_from_archive"] is True
        assert d["archived_at"] == archived_dt
        assert d["archive_reason"] == "retention_90d"

    _run(_t())


def test_include_archive_false_skips_archive():
    async def _t():
        db = _FakeDB()
        db[ARCHIVE_COLLECTION].seed({"slug": "only-arch", "is_published": True, "title": "Nope"})
        d = await find_article_by_slug(db, "only-arch", include_archive=False)
        assert d is None

    _run(_t())


def test_batch_marks_archive_docs_only():
    async def _t():
        db = _FakeDB()
        db[LIVE_COLLECTION].seed({"slug": "a", "is_published": True, "title": "A"})
        db[ARCHIVE_COLLECTION].seed({
            "slug": "b", "is_published": True, "title": "B",
            "archived_at": datetime(2026, 5, 1, tzinfo=timezone.utc),
        })
        out = await find_articles_by_slugs(db, ["a", "b", "missing"])
        assert set(out.keys()) == {"a", "b"}
        assert out["a"]["_from_archive"] is False
        assert out["b"]["_from_archive"] is True

    _run(_t())


def test_mongo_news_provider_public_response_carries_badge_fields():
    """Serializer selbst prüfen — auch ohne echte DB."""
    async def _t():
        from news_provider import MongoNewsProvider
        p = MongoNewsProvider()
        # Live-Doc: kein Badge.
        live_doc = {
            "_id": "abc", "slug": "live", "title": "T", "summary": "S",
            "category": "wirtschaft", "content": "…",
            "published_at": datetime(2026, 8, 20, tzinfo=timezone.utc),
            "_from_archive": False,
        }
        r_live = p._to_public(live_doc)
        assert r_live["is_archived"] is False
        assert r_live["archived_at"] is None
        assert "_from_archive" not in r_live  # interner Marker nicht durchreichen

        # Archiv-Doc: Badge + Datum.
        arch_dt = datetime(2026, 5, 10, 9, 0, tzinfo=timezone.utc)
        arch_doc = {
            "_id": "def", "slug": "arch", "title": "T2", "summary": "S2",
            "category": "wirtschaft", "content": "…",
            "published_at": datetime(2026, 1, 1, tzinfo=timezone.utc),
            "_from_archive": True,
            "archived_at": arch_dt,
            "archive_reason": "retention_90d",
        }
        r_arch = p._to_public(arch_doc)
        assert r_arch["is_archived"] is True
        assert r_arch["archived_at"] == arch_dt.isoformat()
        assert r_arch["archive_reason"] == "retention_90d"

        # Archiv-Doc ohne `archived_at` → Badge True, Datum None (kein erfundenes Datum).
        arch_doc_no_date = {**arch_doc}
        arch_doc_no_date.pop("archived_at", None)
        r_arch2 = p._to_public(arch_doc_no_date)
        assert r_arch2["is_archived"] is True
        assert r_arch2["archived_at"] is None

    _run(_t())
