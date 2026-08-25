"""Session 80.0 — Regression: Social Content Automation.

Tests:
 - Eligibility gate (demo, missing content, unpublished → not eligible)
 - Draft validation (banned phrases, too short, missing URL)
 - Dedupe: cron re-run keeps existing draft (no duplicate)
 - Approved draft is NEVER silently overwritten
 - LLM failure → no fake draft
 - URL placeholder is replaced with canonical URL
"""
from __future__ import annotations

import asyncio
import copy
import os
import sys
import uuid
from datetime import datetime, timezone
from unittest.mock import patch, AsyncMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from social_content import (  # noqa: E402
    COLLECTION,
    canonical_article_url,
    generate_draft_for_article,
    is_article_eligible,
    _validate_draft,
)


class _FakeCol:
    def __init__(self):
        self.docs = {}

    def _m(self, d, q):
        for k, v in q.items():
            if isinstance(v, dict) and "$ne" in v:
                if d.get(k) == v["$ne"]:
                    return False
            elif isinstance(v, dict) and "$in" in v:
                if d.get(k) not in v["$in"]:
                    return False
            elif d.get(k) != v:
                return False
        return True

    async def find_one(self, q, projection=None, sort=None):
        for d in self.docs.values():
            if self._m(d, q):
                return copy.deepcopy(d)
        return None

    def find(self, q=None):
        q = q or {}
        matched = [copy.deepcopy(d) for d in self.docs.values() if self._m(d, q)]

        class _C:
            def __init__(self, docs): self.docs = docs
            def sort(self, *a, **k): return self
            def limit(self, n): self.docs = self.docs[:n]; return self
            def __aiter__(self): self._it = iter(self.docs); return self
            async def __anext__(self):
                try: return next(self._it)
                except StopIteration: raise StopAsyncIteration
        return _C(matched)

    async def count_documents(self, q): return sum(1 for d in self.docs.values() if self._m(d, q))
    async def insert_one(self, doc):
        d = copy.deepcopy(doc); d.setdefault("_id", uuid.uuid4().hex); self.docs[d["_id"]] = d
    async def update_one(self, filt, upd, upsert=False):
        for d in self.docs.values():
            if self._m(d, filt):
                for k, v in upd.get("$set", {}).items(): d[k] = v
                return
        if upsert:
            new = {**filt}
            for k, v in upd.get("$set", {}).items(): new[k] = v
            new.setdefault("_id", uuid.uuid4().hex); self.docs[new["_id"]] = new
    async def delete_one(self, filt):
        for k, d in list(self.docs.items()):
            if self._m(d, filt): del self.docs[k]; return
    async def create_index(self, *a, **k): return "idx"


class _FakeDB:
    def __init__(self):
        self._c = {}
    def __getitem__(self, n):
        if n not in self._c: self._c[n] = _FakeCol()
        return self._c[n]
    def __getattr__(self, n): return self.__getitem__(n)


def _run(coro): return asyncio.new_event_loop().run_until_complete(coro)


def _article(**over):
    base = {
        "_id": "art-1", "slug": "test-article",
        "title": "Bundesbank meldet aktuelle Bubills-Auktion mit soliden Renditen",
        "subtitle": "Zwei Termine im Bundesschuldenprogramm",
        "category": "wirtschaft", "content_type": "news_synthesis",
        "is_published": True, "status": "published", "is_demo": False,
        "summary": "Die Deutsche Bundesbank hat heute das Ergebnis einer Auktion von Bundesschatzanweisungen veröffentlicht.",
        "content": ("Die Deutsche Bundesbank hat am 24. August das Ergebnis einer Auktion "
                    "von Bundesschatzanweisungen (Bubills) veröffentlicht. " * 20),
        "published_at": datetime(2026, 8, 24, tzinfo=timezone.utc),
        "updated_at": datetime(2026, 8, 24, 12, tzinfo=timezone.utc),
    }
    base.update(over)
    return base


def test_eligibility_gates():
    assert is_article_eligible(None)[0] is False
    a = _article(is_demo=True); assert is_article_eligible(a)[0] is False
    a = _article(content_type="demo"); assert is_article_eligible(a)[0] is False
    a = _article(is_published=False); assert is_article_eligible(a)[0] is False
    a = _article(status="draft"); assert is_article_eligible(a)[0] is False
    a = _article(content="", summary="tiny"); assert is_article_eligible(a)[0] is False
    a = _article(title="klein"); assert is_article_eligible(a)[0] is False
    assert is_article_eligible(_article())[0] is True


def test_validate_draft_banned_phrase():
    ok, reason = _validate_draft("Ein solider Draft mit vielen Zeichen, jetzt kaufen! " + "x" * 100 + " {URL}")
    assert ok is False
    assert "banned_phrase" in reason


def test_validate_draft_missing_url():
    ok, reason = _validate_draft("Ein Draft ohne Link, ausreichend lang " + "x" * 200)
    assert ok is False and reason == "no_link_placeholder"


def test_validate_draft_ok():
    ok, _ = _validate_draft("Solider Draft mit ausreichend Text und Platzhalter — {URL} #Finance " + "y" * 100)
    assert ok is True


def test_dedupe_and_no_double_creation():
    async def _t():
        db = _FakeDB()
        art = _article()
        with patch("social_content._generate_draft_via_llm", new=AsyncMock(return_value="Solider Draft {URL} #Wirtschaft mit einer klaren Aussage aus dem Artikel " + "z" * 80)):
            r1 = await generate_draft_for_article(db, art)
            r2 = await generate_draft_for_article(db, art)
        assert r1["action"] == "created"
        assert r2["action"] == "dedupe_hit", r2
        assert await db[COLLECTION].count_documents({}) == 1
    _run(_t())


def test_approved_draft_never_overwritten():
    async def _t():
        db = _FakeDB()
        art = _article()
        with patch("social_content._generate_draft_via_llm", new=AsyncMock(return_value="Solider Draft {URL} #Wirtschaft " + "z" * 100)):
            await generate_draft_for_article(db, art)
        # simulate admin approval
        doc = await db[COLLECTION].find_one({"article_slug": art["slug"]})
        await db[COLLECTION].update_one({"_id": doc["_id"]}, {"$set": {"status": "approved"}})
        # Article changes → new updated_at → cron would normally regenerate
        art2 = _article(updated_at=datetime(2026, 8, 25, tzinfo=timezone.utc))
        with patch("social_content._generate_draft_via_llm", new=AsyncMock(return_value="NEUER Text {URL} #x " + "z" * 100)):
            r = await generate_draft_for_article(db, art2)
        assert r["action"] == "kept_existing"
        after = await db[COLLECTION].find_one({"article_slug": art["slug"]})
        assert after["status"] == "approved"
        assert "NEUER Text" not in after["draft_text"]
    _run(_t())


def test_llm_failure_creates_no_fake_draft():
    async def _t():
        db = _FakeDB()
        art = _article()
        with patch("social_content._generate_draft_via_llm", new=AsyncMock(return_value=None)):
            r = await generate_draft_for_article(db, art)
        assert r["ok"] is False and r["action"] == "llm_failed"
        assert await db[COLLECTION].count_documents({}) == 0
    _run(_t())


def test_url_placeholder_replaced_with_canonical():
    async def _t():
        db = _FakeDB()
        art = _article()
        with patch("social_content._generate_draft_via_llm", new=AsyncMock(return_value="Kurzer solider Draft — mehr im Artikel: {URL} #Wirtschaft " + "z" * 100)):
            await generate_draft_for_article(db, art)
        doc = await db[COLLECTION].find_one({"article_slug": art["slug"]})
        expected = canonical_article_url(art["slug"])
        assert expected in doc["draft_text"]
        assert "{URL}" not in doc["draft_text"]
    _run(_t())
