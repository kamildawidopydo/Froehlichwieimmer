"""Pytest-Regressionstests für news_alert Two-Strike-Logik.

Prüft: Fresh, Stale x1, Stale x2 (mail), Stale x3 (no mail), Recovery.
Verwendet in-memory Fake-Db + Fake-Sender, kein echter Netzwerkaufruf.
"""
from __future__ import annotations

import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from news_alert import evaluate_and_alert, STATE_ID  # noqa: E402


class FakeCol:
    def __init__(self):
        self.docs = {}

    async def find_one(self, q, projection=None, sort=None):
        _id = q.get("_id")
        if _id is not None:
            return self.docs.get(_id)
        if not self.docs:
            return None
        return list(self.docs.values())[0]

    async def update_one(self, q, u, upsert=False):
        _id = q.get("_id")
        doc = self.docs.get(_id, {"_id": _id})
        for k, v in u.get("$set", {}).items():
            doc[k] = v
        self.docs[_id] = doc


class FakeDb:
    def __init__(self):
        self.job_summaries = FakeCol()
        self.news_articles = FakeCol()

    def __getitem__(self, name):
        # Not used but keep compat
        return getattr(self, name)


class FakeSender:
    def __init__(self):
        self.sent = []
        self.raise_next = False

    async def __call__(self, to, subject, html, attachments=None):
        if self.raise_next:
            self.raise_next = False
            raise RuntimeError("provider down")
        self.sent.append({"to": to, "subject": subject, "html_len": len(html)})
        return f"email_{len(self.sent)}"


async def _seed_fetch(db, *, minutes_ago, errors=0):
    ts = datetime.now(timezone.utc) - timedelta(minutes=minutes_ago)
    await db.job_summaries.update_one(
        {"_id": "fetch_feeds"},
        {"$set": {
            "last_success_at": ts,
            "last_started_at": ts,
            "last_summary": {"fetched": 100, "relevant": 50, "new": 5, "errors": errors, "duration_s": 3.0},
            "last_trigger_source": "test",
        }},
        upsert=True,
    )


async def _run_all():
    os.environ["NEWS_ALERT_TO"] = "ops@example.com"

    # ── Case A: fresh → no alert ─────────────────────────────────────────────
    db = FakeDb(); sender = FakeSender()
    await _seed_fetch(db, minutes_ago=10)
    r = await evaluate_and_alert(db, sender)
    assert r["freshness"] == "fresh", r
    assert len(sender.sent) == 0
    state = await db.job_summaries.find_one({"_id": STATE_ID})
    assert state["consecutive_problem_count"] == 0
    assert state.get("alert_active") in (False, None)
    print("A fresh → noop OK")

    # ── Case B: stale ×1 → no mail ───────────────────────────────────────────
    db = FakeDb(); sender = FakeSender()
    await _seed_fetch(db, minutes_ago=180)  # >120 min → stale
    r = await evaluate_and_alert(db, sender)
    assert r["freshness"] == "stale", r
    assert len(sender.sent) == 0, sender.sent
    state = await db.job_summaries.find_one({"_id": STATE_ID})
    assert state["consecutive_problem_count"] == 1
    assert not state.get("alert_active")
    print("B stale ×1 → counter=1, no mail OK")

    # ── Case C: stale ×2 → exactly one mail ──────────────────────────────────
    r2 = await evaluate_and_alert(db, sender)
    assert r2["action"] == "alert_sent", r2
    assert len(sender.sent) == 1, sender.sent
    assert "gestört" in sender.sent[0]["subject"]
    state = await db.job_summaries.find_one({"_id": STATE_ID})
    assert state["consecutive_problem_count"] == 2
    assert state["alert_active"] is True
    assert isinstance(state["last_alert_at"], datetime)
    print("C stale ×2 → 1 mail, alert_active=True OK")

    # ── Case D: stale ×3 → no more mail (anti-spam) ──────────────────────────
    r3 = await evaluate_and_alert(db, sender)
    assert r3["action"] == "noop", r3
    assert len(sender.sent) == 1  # unchanged
    state = await db.job_summaries.find_one({"_id": STATE_ID})
    assert state["consecutive_problem_count"] == 3
    assert state["alert_active"] is True
    print("D stale ×3 → still 1 mail (anti-spam) OK")

    # ── Case E: pipeline recovers → recovery mail once, state reset ──────────
    await _seed_fetch(db, minutes_ago=5)
    r4 = await evaluate_and_alert(db, sender)
    assert r4["freshness"] == "fresh", r4
    assert r4["action"] == "recovery_sent", r4
    assert len(sender.sent) == 2, sender.sent
    assert "wieder aktuell" in sender.sent[1]["subject"]
    state = await db.job_summaries.find_one({"_id": STATE_ID})
    assert state["consecutive_problem_count"] == 0
    assert state["alert_active"] is False
    assert isinstance(state["last_recovery_at"], datetime)
    print("E recovery → 1 mail, state reset OK")

    # ── Case F: error ×2 (errors>0 & >60min) → exactly one mail ─────────────
    db = FakeDb(); sender = FakeSender()
    await _seed_fetch(db, minutes_ago=90, errors=3)
    await evaluate_and_alert(db, sender)  # strike 1
    r = await evaluate_and_alert(db, sender)  # strike 2 → mail
    assert r["freshness"] == "error", r
    assert r["action"] == "alert_sent", r
    assert len(sender.sent) == 1
    assert "(error)" in sender.sent[0]["subject"]
    print("F error ×2 → 1 warn mail OK")

    # ── Case G: mail provider raises → pipeline continues, no state break ───
    db = FakeDb(); sender = FakeSender()
    await _seed_fetch(db, minutes_ago=180)
    await evaluate_and_alert(db, sender)  # strike 1
    sender.raise_next = True
    r = await evaluate_and_alert(db, sender)  # strike 2 would send but provider raises
    # evaluate_and_alert MUST NOT re-raise — it caught it internally
    assert r["action"] == "alert_send_failed", r
    state = await db.job_summaries.find_one({"_id": STATE_ID})
    # counter still bumped, alert NOT marked active because mail failed
    assert state["consecutive_problem_count"] == 2
    assert not state.get("alert_active")
    print("G provider error → no crash, counter=2, alert_active=False OK")

    print("\n=== ALL TESTS PASSED ===")


if __name__ == "__main__":
    asyncio.run(_run_all())
