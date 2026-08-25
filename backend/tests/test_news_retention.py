"""Pytest für News Retention Archive (P1).

Deckt die im Auftrag genannten QA-Punkte ab:
- Artikel 89 Tage alt → bleibt live
- Artikel 91 Tage alt → archiviert
- fehlendes published_at → nicht gelöscht
- zweiter Archivlauf → idempotent
- Dry-Run macht keine DB-Änderungen
- Archiv-Write-Fehler → Original bleibt live (Live-Delete erfolgt erst NACH
  erfolgreicher Archiv-Verifikation)
- Slug-Fallback: archivierter Artikel weiterhin per `find_article_by_slug` auffindbar
- `find_articles_by_slugs` liefert Live + Archiv gemischt

Testmuster folgt bestehenden Tests im Repo (`asyncio.run` in sync Testfunktionen),
weil kein pytest-asyncio-Plugin konfiguriert ist. Wir verwenden ein Fake-Mongo-DB-
Objekt (in-memory) — das ist bewusst kein motor-Mock, sondern nur die Methoden,
die die Retention-Logik anfasst.
"""
from __future__ import annotations

import asyncio
import copy
import uuid
from datetime import datetime, timedelta, timezone

from news_retention import (
    ARCHIVE_COLLECTION,
    LIVE_COLLECTION,
    find_article_by_slug,
    find_articles_by_slugs,
    run_retention_archive,
)


# --- Fake-Mongo (async) --------------------------------------------------------

class _Cursor:
    def __init__(self, docs):
        self._docs = list(docs)
        self._skip = 0
        self._limit = None
        self._sort = []

    def sort(self, key, direction=1):
        if isinstance(key, list):
            self._sort = list(key)
        else:
            self._sort = [(key, direction)]
        return self

    def skip(self, n):
        self._skip = int(n)
        return self

    def limit(self, n):
        self._limit = int(n)
        return self

    def _resolved(self):
        docs = self._docs
        for field, direction in reversed(self._sort):
            docs = sorted(
                docs,
                key=lambda d: (d.get(field) is None, d.get(field)),
                reverse=(direction == -1),
            )
        if self._skip:
            docs = docs[self._skip:]
        if self._limit is not None:
            docs = docs[: self._limit]
        return docs

    async def to_list(self, length):
        return self._resolved()[: length or None]

    def __aiter__(self):
        self._iter = iter(self._resolved())
        return self

    async def __anext__(self):
        try:
            return next(self._iter)
        except StopIteration:
            raise StopAsyncIteration


def _match(doc, query):
    for k, v in query.items():
        if k == "$or":
            if not any(_match(doc, sub) for sub in v):
                return False
            continue
        if k == "$and":
            if not all(_match(doc, sub) for sub in v):
                return False
            continue
        if isinstance(v, dict):
            for op, arg in v.items():
                val = doc.get(k)
                if op == "$exists":
                    if arg and k not in doc:
                        return False
                    if not arg and k in doc:
                        return False
                elif op == "$ne":
                    if doc.get(k) == arg:
                        return False
                elif op == "$lt":
                    if val is None or not (val < arg):
                        return False
                elif op == "$gte":
                    if val is None or not (val >= arg):
                        return False
                elif op == "$in":
                    if val not in arg:
                        return False
                else:
                    raise NotImplementedError(f"op {op} not supported in fake mongo")
        else:
            if doc.get(k) != v:
                return False
    return True


class _FakeCollection:
    def __init__(self, name):
        self.name = name
        self._docs = {}
        self.archive_write_should_fail = False

    async def insert_many(self, docs):
        for d in docs:
            d = copy.deepcopy(d)
            d.setdefault("_id", uuid.uuid4().hex)
            self._docs[d["_id"]] = d

    async def find_one(self, query, projection=None, sort=None):
        docs = [d for d in self._docs.values() if _match(d, query)]
        if sort:
            for field, direction in reversed(sort):
                docs = sorted(docs, key=lambda d: (d.get(field) is None, d.get(field)), reverse=(direction == -1))
        return copy.deepcopy(docs[0]) if docs else None

    def find(self, query=None, projection=None):
        query = query or {}
        return _Cursor([copy.deepcopy(d) for d in self._docs.values() if _match(d, query)])

    async def count_documents(self, query):
        return sum(1 for d in self._docs.values() if _match(d, query))

    async def replace_one(self, filt, replacement, upsert=False):
        if self.archive_write_should_fail:
            raise RuntimeError("simulated archive write failure")
        found = [d for d in self._docs.values() if _match(d, filt)]
        if found:
            _id = found[0]["_id"]
            new_doc = copy.deepcopy(replacement)
            new_doc["_id"] = _id
            self._docs[_id] = new_doc
        elif upsert:
            new_doc = copy.deepcopy(replacement)
            new_doc.setdefault("_id", filt.get("_id") or uuid.uuid4().hex)
            self._docs[new_doc["_id"]] = new_doc

    async def delete_one(self, filt):
        found = [d for d in self._docs.values() if _match(d, filt)]
        deleted = 0
        for d in found[:1]:
            del self._docs[d["_id"]]
            deleted = 1

        class _R:
            def __init__(self, n): self.deleted_count = n

        return _R(deleted)

    async def update_one(self, filt, update, upsert=False):
        found = [d for d in self._docs.values() if _match(d, filt)]
        if found:
            d = found[0]
            for op, kv in update.items():
                if op == "$set":
                    d.update(kv)
        elif upsert:
            new_doc = {k: v for k, v in filt.items()}
            for op, kv in update.items():
                if op == "$set":
                    new_doc.update(kv)
            new_doc.setdefault("_id", filt.get("_id") or uuid.uuid4().hex)
            self._docs[new_doc["_id"]] = new_doc

    async def create_index(self, keys, name=None, **kwargs):
        return name or "idx"


class _FakeDB:
    def __init__(self):
        self._colls = {}

    def __getitem__(self, name):
        if name not in self._colls:
            self._colls[name] = _FakeCollection(name)
        return self._colls[name]

    def __getattr__(self, name):
        return self.__getitem__(name)


# --- Helpers -----------------------------------------------------------------

def _mk(slug, days_ago, *, is_published=True, status="published", **extra):
    now = datetime.now(timezone.utc)
    d = {
        "_id": uuid.uuid4().hex,
        "slug": slug,
        "title": f"Titel {slug}",
        "summary": f"Summary {slug}",
        "category": "wirtschaft",
        "is_published": is_published,
        "status": status,
        "content_type": "news_synthesis",
    }
    if days_ago is not None:
        d["published_at"] = now - timedelta(days=days_ago)
    d.update(extra)
    return d


def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


# --- Tests --------------------------------------------------------------------

def test_89_days_stays_live():
    async def _t():
        db = _FakeDB()
        await db[LIVE_COLLECTION].insert_many([_mk("keep-89", 89)])
        result = await run_retention_archive(db, retention_days=90)
        assert result["archived"] == 0
        assert result["deleted_from_live"] == 0
        assert await db[LIVE_COLLECTION].count_documents({"slug": "keep-89"}) == 1
        assert await db[ARCHIVE_COLLECTION].count_documents({"slug": "keep-89"}) == 0

    _run(_t())


def test_91_days_gets_archived():
    async def _t():
        db = _FakeDB()
        await db[LIVE_COLLECTION].insert_many([_mk("old-91", 91)])
        result = await run_retention_archive(db, retention_days=90)
        assert result["archived"] == 1
        assert result["deleted_from_live"] == 1
        assert await db[LIVE_COLLECTION].count_documents({"slug": "old-91"}) == 0
        archived = await db[ARCHIVE_COLLECTION].find_one({"slug": "old-91"})
        assert archived is not None
        assert archived["archive_reason"] == "retention_90d"
        assert isinstance(archived["archived_at"], datetime)
        # Redaktionelle Felder unverändert
        assert archived["title"] == "Titel old-91"
        assert archived["category"] == "wirtschaft"

    _run(_t())


def test_missing_published_at_is_not_deleted():
    async def _t():
        db = _FakeDB()
        await db[LIVE_COLLECTION].insert_many([_mk("no-date", None)])
        result = await run_retention_archive(db, retention_days=90)
        assert result["archived"] == 0
        assert result["deleted_from_live"] == 0
        assert result["skipped_missing_published_at"] == 1
        assert await db[LIVE_COLLECTION].count_documents({"slug": "no-date"}) == 1

    _run(_t())


def test_idempotent_second_run():
    async def _t():
        db = _FakeDB()
        await db[LIVE_COLLECTION].insert_many([_mk("old-100", 100)])
        r1 = await run_retention_archive(db, retention_days=90)
        r2 = await run_retention_archive(db, retention_days=90)
        assert r1["archived"] == 1
        assert r2["candidates"] == 0
        assert r2["archived"] == 0
        assert await db[ARCHIVE_COLLECTION].count_documents({}) == 1

    _run(_t())


def test_dry_run_makes_no_changes():
    async def _t():
        db = _FakeDB()
        await db[LIVE_COLLECTION].insert_many([
            _mk("old-100", 100), _mk("old-91", 91), _mk("young", 5),
        ])
        result = await run_retention_archive(db, retention_days=90, dry_run=True)
        assert result["dry_run"] is True
        assert result["candidates"] == 2
        assert await db[LIVE_COLLECTION].count_documents({}) == 3
        assert await db[ARCHIVE_COLLECTION].count_documents({}) == 0

    _run(_t())


def test_archive_write_failure_keeps_live():
    async def _t():
        db = _FakeDB()
        await db[LIVE_COLLECTION].insert_many([_mk("old-100", 100)])
        db[ARCHIVE_COLLECTION].archive_write_should_fail = True
        result = await run_retention_archive(db, retention_days=90)
        assert result["archived"] == 0
        assert result["errors"] == 1
        assert await db[LIVE_COLLECTION].count_documents({"slug": "old-100"}) == 1
        assert await db[ARCHIVE_COLLECTION].count_documents({}) == 0

    _run(_t())


def test_slug_fallback_finds_archived():
    async def _t():
        db = _FakeDB()
        await db[LIVE_COLLECTION].insert_many([_mk("archived-slug", 100)])
        await run_retention_archive(db, retention_days=90)

        doc = await find_article_by_slug(db, "archived-slug", include_archive=True)
        assert doc is not None
        assert doc["slug"] == "archived-slug"

        doc2 = await find_article_by_slug(db, "archived-slug", include_archive=False)
        assert doc2 is None

    _run(_t())


def test_batch_find_mixes_live_and_archive():
    async def _t():
        db = _FakeDB()
        await db[LIVE_COLLECTION].insert_many([
            _mk("live-a", 5),
            _mk("live-b", 5),
            _mk("old-x", 100),
            _mk("old-y", 100),
        ])
        await run_retention_archive(db, retention_days=90)

        found = await find_articles_by_slugs(db, ["live-a", "old-x", "unknown"], include_archive=True)
        assert set(found.keys()) == {"live-a", "old-x"}

    _run(_t())
