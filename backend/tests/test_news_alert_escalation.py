"""Pytest-Regressionstests für Session 79.1 — Alert Escalation Ladder.

Prüft die 6h-Eskalationslogik zusätzlich zur bestehenden Two-Strike-Regel:
- Alarm 5h59 → keine Eskalation
- Alarm ≥ 6h → genau eine Eskalation
- Alarm 7h/12h → keine zweite/dritte Eskalation
- Mail-Provider-Fehler → Retry beim nächsten Check möglich
- Recovery → State zurückgesetzt
- Neuer Incident nach Recovery → wieder eskalierbar
- Fehlender NEWS_ALERT_ESCALATION_TO → kein Crash, escalation_sent_at bleibt null
- Erst-Alarm (frisch versendet) → gleiche Runde eskaliert NICHT (age 0h)
"""
from __future__ import annotations

import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from news_alert import evaluate_and_alert, STATE_ID  # noqa: E402


# --- Fake-Mongo (async) --------------------------------------------------------

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
        return getattr(self, name)


class FakeSender:
    def __init__(self):
        self.sent = []
        self.raise_next_for = None  # subject-substring match, e.g. "ESKALATION"

    async def __call__(self, to, subject, html, attachments=None):
        if self.raise_next_for and self.raise_next_for in subject:
            self.raise_next_for = None
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


async def _set_incident_age(db, *, hours):
    """Hilfsfunktion: schiebe `incident_started_at` in die Vergangenheit."""
    state = await db.job_summaries.find_one({"_id": STATE_ID})
    assert state is not None, "no alert_state yet"
    new_start = datetime.now(timezone.utc) - timedelta(hours=hours)
    await db.job_summaries.update_one(
        {"_id": STATE_ID},
        {"$set": {"incident_started_at": new_start, "last_alert_at": new_start}},
        upsert=True,
    )


def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


# --- Tests --------------------------------------------------------------------

def test_first_alert_does_not_double_escalate_same_run():
    """Fresh alert (age=0h) → WARN sent, but escalation NOT sent in the same run."""
    async def _t():
        os.environ["NEWS_ALERT_TO"] = "ops@example.com"
        os.environ["NEWS_ALERT_ESCALATION_TO"] = "escalate@example.com"
        db = FakeDb(); sender = FakeSender()
        await _seed_fetch(db, minutes_ago=180)  # stale
        await evaluate_and_alert(db, sender)     # strike 1
        r = await evaluate_and_alert(db, sender) # strike 2 → WARN
        assert r["action"] == "alert_sent"
        assert len(sender.sent) == 1
        # Escalation must NOT fire — age is ~0
        assert not r.get("escalation", {}).get("escalation_sent")
        state = await db.job_summaries.find_one({"_id": STATE_ID})
        assert state["escalation_sent_at"] is None
        assert isinstance(state["incident_started_at"], datetime)
    _run(_t())


def test_no_escalation_before_6h():
    async def _t():
        os.environ["NEWS_ALERT_TO"] = "ops@example.com"
        os.environ["NEWS_ALERT_ESCALATION_TO"] = "escalate@example.com"
        db = FakeDb(); sender = FakeSender()
        await _seed_fetch(db, minutes_ago=180)
        await evaluate_and_alert(db, sender)     # strike 1
        await evaluate_and_alert(db, sender)     # strike 2 → WARN + incident_started_at=now
        # Simuliere 5h59 ununterbrochenen Alarm
        await _set_incident_age(db, hours=5 + 59 / 60)
        r = await evaluate_and_alert(db, sender)
        assert not r["escalation"]["escalation_sent"], r
        assert not r["escalation"]["escalation_due"], r
        assert len(sender.sent) == 1  # nur WARN
        state = await db.job_summaries.find_one({"_id": STATE_ID})
        assert state["escalation_sent_at"] is None
    _run(_t())


def test_escalation_fires_exactly_once_after_6h():
    async def _t():
        os.environ["NEWS_ALERT_TO"] = "ops@example.com"
        os.environ["NEWS_ALERT_ESCALATION_TO"] = "escalate@example.com,ops-b@example.com"
        db = FakeDb(); sender = FakeSender()
        await _seed_fetch(db, minutes_ago=180)
        await evaluate_and_alert(db, sender)
        await evaluate_and_alert(db, sender)  # WARN sent
        assert len(sender.sent) == 1
        # 6h Alarm
        await _set_incident_age(db, hours=6.0)
        r = await evaluate_and_alert(db, sender)
        assert r["escalation"]["escalation_sent"], r
        # 2 recipients → 2 mails in dieser Runde, aber EIN incident/EINE Eskalation
        assert len(sender.sent) == 1 + 2
        subjects = [s["subject"] for s in sender.sent[1:]]
        assert all("ESKALATION" in s for s in subjects), subjects
        assert set(s["to"] for s in sender.sent[1:]) == {"escalate@example.com", "ops-b@example.com"}
        state = await db.job_summaries.find_one({"_id": STATE_ID})
        assert isinstance(state["escalation_sent_at"], datetime)

        # 7h Check → keine zweite
        await _set_incident_age(db, hours=7.0)
        # WICHTIG: _set_incident_age hat nur incident_started_at zurückdatiert;
        # escalation_sent_at bleibt gesetzt.
        r2 = await evaluate_and_alert(db, sender)
        assert not r2["escalation"]["escalation_sent"], r2
        assert len(sender.sent) == 3  # unverändert

        # 12h Check → keine dritte
        await _set_incident_age(db, hours=12.0)
        r3 = await evaluate_and_alert(db, sender)
        assert not r3["escalation"]["escalation_sent"], r3
        assert len(sender.sent) == 3
    _run(_t())


def test_escalation_mail_failure_allows_retry():
    async def _t():
        os.environ["NEWS_ALERT_TO"] = "ops@example.com"
        os.environ["NEWS_ALERT_ESCALATION_TO"] = "escalate@example.com"
        db = FakeDb(); sender = FakeSender()
        await _seed_fetch(db, minutes_ago=180)
        await evaluate_and_alert(db, sender)
        await evaluate_and_alert(db, sender)  # WARN
        await _set_incident_age(db, hours=6.5)

        # Provider raises on the escalation mail
        sender.raise_next_for = "ESKALATION"
        r = await evaluate_and_alert(db, sender)
        assert not r["escalation"]["escalation_sent"], r
        assert r["escalation"]["escalation_due"], r
        assert r["escalation"]["mail_error"] is not None
        state = await db.job_summaries.find_one({"_id": STATE_ID})
        assert state["escalation_sent_at"] is None  # NICHT gesetzt → Retry-fähig
        assert state["last_escalation_error"] is not None

        # Retry succeeds
        r2 = await evaluate_and_alert(db, sender)
        assert r2["escalation"]["escalation_sent"], r2
        state = await db.job_summaries.find_one({"_id": STATE_ID})
        assert isinstance(state["escalation_sent_at"], datetime)
        assert state["last_escalation_error"] is None
    _run(_t())


def test_missing_escalation_env_does_not_crash():
    async def _t():
        os.environ["NEWS_ALERT_TO"] = "ops@example.com"
        os.environ.pop("NEWS_ALERT_ESCALATION_TO", None)
        db = FakeDb(); sender = FakeSender()
        await _seed_fetch(db, minutes_ago=180)
        await evaluate_and_alert(db, sender)
        await evaluate_and_alert(db, sender)  # WARN
        await _set_incident_age(db, hours=8.0)

        r = await evaluate_and_alert(db, sender)
        assert not r["escalation"]["escalation_sent"], r
        assert r["escalation"]["escalation_due"], r
        assert r["escalation"]["reason"] == "no_recipients"
        state = await db.job_summaries.find_one({"_id": STATE_ID})
        assert state["escalation_sent_at"] is None
        # WARN wurde einmal versendet; sonst nichts.
        assert len(sender.sent) == 1
    _run(_t())


def test_recovery_resets_incident_and_new_incident_can_escalate():
    async def _t():
        os.environ["NEWS_ALERT_TO"] = "ops@example.com"
        os.environ["NEWS_ALERT_ESCALATION_TO"] = "escalate@example.com"
        db = FakeDb(); sender = FakeSender()
        # 1. Incident + Escalation
        await _seed_fetch(db, minutes_ago=180)
        await evaluate_and_alert(db, sender)
        await evaluate_and_alert(db, sender)  # WARN
        await _set_incident_age(db, hours=6.5)
        await evaluate_and_alert(db, sender)  # ESCALATION
        state = await db.job_summaries.find_one({"_id": STATE_ID})
        assert isinstance(state["escalation_sent_at"], datetime)

        # 2. Recovery
        await _seed_fetch(db, minutes_ago=5)
        r_rec = await evaluate_and_alert(db, sender)
        assert r_rec["action"] == "recovery_sent"
        state = await db.job_summaries.find_one({"_id": STATE_ID})
        assert state["alert_active"] is False
        assert state["incident_started_at"] is None
        assert state["escalation_sent_at"] is None
        assert state["last_escalation_error"] is None

        # 3. Neuer Incident → wieder eskalierbar
        await _seed_fetch(db, minutes_ago=180)
        await evaluate_and_alert(db, sender)
        await evaluate_and_alert(db, sender)  # WARN #2
        await _set_incident_age(db, hours=6.0)
        r_esc2 = await evaluate_and_alert(db, sender)
        assert r_esc2["escalation"]["escalation_sent"], r_esc2
        state = await db.job_summaries.find_one({"_id": STATE_ID})
        assert isinstance(state["escalation_sent_at"], datetime)
    _run(_t())


def test_fresh_state_never_escalates():
    """Kein Alarm → kein Incident → keine Eskalation, keine Fehler."""
    async def _t():
        os.environ["NEWS_ALERT_TO"] = "ops@example.com"
        os.environ["NEWS_ALERT_ESCALATION_TO"] = "escalate@example.com"
        db = FakeDb(); sender = FakeSender()
        await _seed_fetch(db, minutes_ago=10)
        r = await evaluate_and_alert(db, sender)
        assert r["freshness"] == "fresh"
        assert len(sender.sent) == 0
        state = await db.job_summaries.find_one({"_id": STATE_ID}) or {}
        assert state.get("incident_started_at") in (None, )
        assert state.get("escalation_sent_at") in (None, )
    _run(_t())
