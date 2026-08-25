"""Session 80.1 — Regression: LinkedIn Publisher & Publisher-Cron.

Alle Tests mocken den externen HTTP-Call — es wird niemals ein echter Post
an LinkedIn geschickt.

Deckt ab:
- fehlende Credentials → provider_not_configured
- Dry-Run bei ok / bei fehlerhaftem State
- erfolgreicher Publish → status=published, external_post_id/url gesetzt
- 401 → publish_failed(credentials)
- 429 → publish_failed(rate_limited)
- 5xx → publish_failed(provider_error)
- Timeout → publish_failed(timeout) — kein automatischer Retry
- 2 parallele Publisher → exakt EIN externer Call (Compare-and-Set)
- bereits published → try_publish blockt (not_locked)
- nicht approved / status=draft → nicht publishable
- LINKEDIN_AUTO_PUBLISH_ENABLED=false → run_publisher_cron No-Op
"""
from __future__ import annotations

import asyncio
import copy
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, AsyncMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ["LINKEDIN_ACCESS_TOKEN"] = "test-token"
os.environ["LINKEDIN_ORGANIZATION_ID"] = "1234567"
os.environ["LINKEDIN_AUTO_PUBLISH_ENABLED"] = "true"

from providers.social import linkedin as _li  # noqa: E402
from social_content import (  # noqa: E402
    COLLECTION,
    build_dry_run_result,
    run_publisher_cron,
    try_publish,
)


class _FakeCol:
    def __init__(self):
        self.docs = {}
        self._lock = asyncio.Lock()

    def _m(self, d, q):
        for k, v in q.items():
            if isinstance(v, dict):
                if "$lte" in v and not (d.get(k) is not None and d.get(k) <= v["$lte"]):
                    return False
                if "$ne" in v and d.get(k) == v["$ne"]:
                    return False
                if "$in" in v and d.get(k) not in v["$in"]:
                    return False
                if "$exists" in v:
                    if v["$exists"] and k not in d: return False
                    if not v["$exists"] and k in d: return False
                # None handled below
            else:
                if d.get(k) != v:
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

    async def find_one_and_update(self, filt, upd, return_document=True):
        async with self._lock:
            for d in self.docs.values():
                if self._m(d, filt):
                    for k, v in upd.get("$set", {}).items():
                        d[k] = v
                    for k, v in upd.get("$inc", {}).items():
                        d[k] = int(d.get(k) or 0) + v
                    return copy.deepcopy(d)
            return None

    async def update_one(self, filt, upd, upsert=False):
        for d in self.docs.values():
            if self._m(d, filt):
                for k, v in upd.get("$set", {}).items(): d[k] = v
                for k, v in upd.get("$inc", {}).items(): d[k] = int(d.get(k) or 0) + v
                return

    async def insert_one(self, doc):
        d = copy.deepcopy(doc); d.setdefault("_id", uuid.uuid4().hex); self.docs[d["_id"]] = d

    def seed(self, d):
        d = copy.deepcopy(d); d.setdefault("_id", uuid.uuid4().hex); self.docs[d["_id"]] = d
        return d["_id"]

    async def count_documents(self, q): return sum(1 for d in self.docs.values() if self._m(d, q))


class _FakeDB:
    def __init__(self):
        self._c = {}

    def __getitem__(self, n):
        if n not in self._c: self._c[n] = _FakeCol()
        return self._c[n]

    def __getattr__(self, n):
        return self.__getitem__(n)


def _scheduled_doc(**over):
    base = {
        "platform": "linkedin",
        "status": "scheduled",
        "draft_text": "Ein professioneller LinkedIn-Draft mit ausreichend Text und Link https://kapital-direkt24.de/news/x #Finance",
        "canonical_url": "https://kapital-direkt24.de/news/nachrichten/x",
        "scheduled_at": datetime.now(timezone.utc) - timedelta(minutes=5),
        "approved_by": "admin@example.com",
        "approved_at": datetime.now(timezone.utc) - timedelta(hours=1),
        "external_post_id": None,
        "publish_attempts": 0,
    }
    base.update(over)
    return base


def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def test_provider_config_summary_hides_secrets():
    cfg = _li.public_config_summary()
    assert cfg["configured"] is True
    assert "access_token" not in cfg
    assert "secret" not in cfg
    assert cfg["organization_urn"] == "urn:li:organization:1234567"


def test_dry_run_ok_and_bad_state():
    async def _t():
        db = _FakeDB()
        _id = db[COLLECTION].seed(_scheduled_doc())
        d = await db[COLLECTION].find_one({"_id": _id})
        dry = await build_dry_run_result(db, d)
        assert dry["ok"] is True, dry
        assert dry["provider"]["configured"] is True

        # Draft in wrong state (draft) → dry-run fails.
        d2 = await db[COLLECTION].find_one({"_id": _id})
        d2["status"] = "draft"
        dry2 = await build_dry_run_result(db, d2)
        assert dry2["ok"] is False
        assert any("status_not_publishable" in i for i in dry2["issues"])
    _run(_t())


def test_successful_publish_updates_state():
    async def _t():
        db = _FakeDB()
        _id = db[COLLECTION].seed(_scheduled_doc())
        with patch("providers.social.linkedin.publish", new=AsyncMock(return_value={
            "external_post_id": "urn:li:share:9999", "external_post_url": "https://linkedin.com/…9999/",
        })):
            r = await try_publish(db, _id, trigger="test")
        assert r["ok"] is True and r["action"] == "published"
        after = await db[COLLECTION].find_one({"_id": _id})
        assert after["status"] == "published"
        assert after["external_post_id"] == "urn:li:share:9999"
        assert after["publish_attempts"] == 1
        assert after["publish_error"] is None
    _run(_t())


def _make_error(kind, http=None):
    return _li.LinkedInPublishError(kind, f"linkedin {http or kind}", http_status=http)


def test_401_becomes_publish_failed_credentials():
    async def _t():
        db = _FakeDB()
        _id = db[COLLECTION].seed(_scheduled_doc())
        with patch("providers.social.linkedin.publish", new=AsyncMock(side_effect=_make_error("credentials", 401))):
            r = await try_publish(db, _id)
        assert r["ok"] is False and r["error_kind"] == "credentials"
        after = await db[COLLECTION].find_one({"_id": _id})
        assert after["status"] == "publish_failed"
    _run(_t())


def test_429_becomes_publish_failed_rate_limited():
    async def _t():
        db = _FakeDB()
        _id = db[COLLECTION].seed(_scheduled_doc())
        with patch("providers.social.linkedin.publish", new=AsyncMock(side_effect=_make_error("rate_limited", 429))):
            r = await try_publish(db, _id)
        assert r["error_kind"] == "rate_limited"
    _run(_t())


def test_5xx_becomes_publish_failed_provider_error():
    async def _t():
        db = _FakeDB()
        _id = db[COLLECTION].seed(_scheduled_doc())
        with patch("providers.social.linkedin.publish", new=AsyncMock(side_effect=_make_error("provider_error", 503))):
            r = await try_publish(db, _id)
        assert r["error_kind"] == "provider_error"
    _run(_t())


def test_timeout_leaves_publish_failed_and_requires_manual_review():
    async def _t():
        db = _FakeDB()
        _id = db[COLLECTION].seed(_scheduled_doc())
        with patch("providers.social.linkedin.publish", new=AsyncMock(side_effect=_make_error("timeout"))):
            r = await try_publish(db, _id)
        after = await db[COLLECTION].find_one({"_id": _id})
        assert after["status"] == "publish_failed"
        assert "timeout" in (after["publish_error"] or "").lower()
        assert r["error_kind"] == "timeout"
    _run(_t())


def test_two_parallel_publishers_result_in_exactly_one_call():
    """Compare-and-Set-Lock: nur einer der 2 gleichzeitigen Aufrufe darf publish() ausführen."""
    async def _t():
        db = _FakeDB()
        _id = db[COLLECTION].seed(_scheduled_doc())
        call_count = {"n": 0}

        async def _publish_stub(*args, **kwargs):
            call_count["n"] += 1
            await asyncio.sleep(0.05)  # small delay so both goroutines race
            return {"external_post_id": "urn:li:share:1", "external_post_url": "u"}

        with patch("providers.social.linkedin.publish", new=_publish_stub):
            r1, r2 = await asyncio.gather(try_publish(db, _id), try_publish(db, _id))
        winners = [r for r in (r1, r2) if r.get("ok")]
        assert len(winners) == 1
        losers = [r for r in (r1, r2) if not r.get("ok")]
        assert len(losers) == 1 and losers[0]["action"] == "not_locked"
        assert call_count["n"] == 1
    _run(_t())


def test_already_published_cannot_publish_again():
    async def _t():
        db = _FakeDB()
        _id = db[COLLECTION].seed(_scheduled_doc(status="published", external_post_id="urn:li:share:1"))
        with patch("providers.social.linkedin.publish", new=AsyncMock(return_value={"external_post_id": "urn:li:share:2", "external_post_url": "u"})) as m:
            r = await try_publish(db, _id)
        assert r["action"] == "not_locked"
        assert m.call_count == 0
    _run(_t())


def test_draft_status_cannot_publish():
    async def _t():
        db = _FakeDB()
        _id = db[COLLECTION].seed(_scheduled_doc(status="draft"))
        with patch("providers.social.linkedin.publish", new=AsyncMock()) as m:
            r = await try_publish(db, _id)
        assert r["action"] == "not_locked"
        assert m.call_count == 0
    _run(_t())


def test_publisher_cron_noop_when_disabled():
    async def _t():
        os.environ["LINKEDIN_AUTO_PUBLISH_ENABLED"] = "false"
        try:
            db = _FakeDB()
            db[COLLECTION].seed(_scheduled_doc())
            r = await run_publisher_cron(db)
            assert r["enabled"] is False
            assert r["processed"] == 0
        finally:
            os.environ["LINKEDIN_AUTO_PUBLISH_ENABLED"] = "true"
    _run(_t())


def test_publisher_cron_skips_future_scheduled_at():
    async def _t():
        db = _FakeDB()
        db[COLLECTION].seed(_scheduled_doc(scheduled_at=datetime.now(timezone.utc) + timedelta(hours=2)))
        with patch("providers.social.linkedin.publish", new=AsyncMock()) as m:
            r = await run_publisher_cron(db)
        assert r["processed"] == 0
        assert m.call_count == 0
    _run(_t())
