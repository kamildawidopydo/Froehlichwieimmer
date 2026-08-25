"""Session 79.4 — Regression: Escalation-Rehearsal Mailpfad.

Sichert dauerhaft ab, dass:
- kein Empfänger konfiguriert → sauberes `no_recipients` ohne Crash und ohne Mail
- erfolgreicher Versand → genau eine Mail pro Empfänger, `ok=True`, Audit-Entry
- Send-Fehler → `ok=False`, `action=send_failed`, `error` gesetzt
- `alert_state` wird bei KEINEM Rehearsal verändert (Incident-Metriken sicher)
- Test-Betreff eindeutig als `[TEST]` markiert
"""
from __future__ import annotations

import asyncio
import copy
import os
import sys
import uuid
from datetime import datetime, timezone
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from news_alert import send_escalation_test_mail, STATE_ID  # noqa: E402


class _FakeCol:
    def __init__(self):
        self.docs = {}

    async def find_one(self, q, projection=None, sort=None):
        _id = q.get("_id")
        if _id is not None:
            return copy.deepcopy(self.docs.get(_id))
        return None

    async def update_one(self, q, u, upsert=False):
        _id = q.get("_id")
        doc = self.docs.get(_id, {"_id": _id})
        for k, v in u.get("$set", {}).items():
            doc[k] = v
        self.docs[_id] = doc


class _FakeDB:
    def __init__(self):
        self.job_summaries = _FakeCol()
        self.news_articles = _FakeCol()

    def __getitem__(self, name):
        return getattr(self, name)


class _FakeSender:
    def __init__(self):
        self.sent = []
        self.raise_all = False

    async def __call__(self, to, subject, html, attachments=None):
        if self.raise_all:
            raise RuntimeError("provider down")
        self.sent.append({"to": to, "subject": subject, "html_len": len(html)})
        return f"email_{len(self.sent)}"


def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def _seed_alert_state(db):
    """Setzt einen bekannten alert_state, den wir hinterher gegenprüfen."""
    db.job_summaries.docs[STATE_ID] = {
        "_id": STATE_ID,
        "alert_active": True,
        "consecutive_problem_count": 3,
        "last_status": "error",
        "incident_started_at": datetime(2026, 1, 1, tzinfo=timezone.utc),
        "last_alert_at": datetime(2026, 1, 1, 0, 30, tzinfo=timezone.utc),
        "escalation_sent_at": None,
        "last_escalation_error": None,
    }


def test_no_recipients_returns_clean_no_crash():
    async def _t():
        os.environ.pop("NEWS_ALERT_ESCALATION_TO", None)
        db = _FakeDB(); sender = _FakeSender()
        _seed_alert_state(db)
        r = await send_escalation_test_mail(db, sender, admin_email="admin@example.com")
        assert r["ok"] is False
        assert r["action"] == "no_recipients"
        assert r["delivered"] == 0
        assert len(sender.sent) == 0
        # Audit wurde trotzdem geschrieben
        audit = db.job_summaries.docs.get("news_alert_escalation_rehearsal")
        assert audit is not None
        assert audit["last_admin"] == "admin@example.com"
        # alert_state UNVERÄNDERT
        st = db.job_summaries.docs[STATE_ID]
        assert st["alert_active"] is True
        assert st["escalation_sent_at"] is None

    _run(_t())


def test_successful_send_emits_one_mail_per_recipient():
    async def _t():
        os.environ["NEWS_ALERT_ESCALATION_TO"] = "ops-a@example.com, ops-b@example.com"
        db = _FakeDB(); sender = _FakeSender()
        _seed_alert_state(db)
        pre_state = copy.deepcopy(db.job_summaries.docs[STATE_ID])
        r = await send_escalation_test_mail(db, sender, admin_email="admin@example.com")
        assert r["ok"] is True, r
        assert r["action"] == "sent"
        assert r["delivered"] == 2
        assert r["attempted"] == 2
        assert r["failed"] == 0
        assert len(sender.sent) == 2
        # Betreff ist eindeutig als TEST markiert
        for s in sender.sent:
            assert s["subject"].startswith("[TEST]"), s["subject"]
        # alert_state UNVERÄNDERT (der zentrale Rehearsal-Kontrakt!)
        post_state = db.job_summaries.docs[STATE_ID]
        assert post_state == pre_state, (pre_state, post_state)
        # Rehearsal-Audit-Doc hat separate Kollektion (separate _id)
        audit = db.job_summaries.docs["news_alert_escalation_rehearsal"]
        assert audit["last_summary"]["delivered"] == 2

    _run(_t())


def test_send_failure_returns_error_without_touching_alert_state():
    async def _t():
        os.environ["NEWS_ALERT_ESCALATION_TO"] = "ops@example.com"
        db = _FakeDB(); sender = _FakeSender(); sender.raise_all = True
        _seed_alert_state(db)
        pre_state = copy.deepcopy(db.job_summaries.docs[STATE_ID])
        r = await send_escalation_test_mail(db, sender, admin_email="admin@example.com")
        assert r["ok"] is False
        assert r["action"] == "send_failed"
        assert r["delivered"] == 0
        assert r["failed"] == 1
        assert r["error"] is not None
        # alert_state UNVERÄNDERT
        post_state = db.job_summaries.docs[STATE_ID]
        assert post_state == pre_state

    _run(_t())


def test_rehearsal_never_sets_escalation_sent_at():
    async def _t():
        os.environ["NEWS_ALERT_ESCALATION_TO"] = "ops@example.com"
        db = _FakeDB(); sender = _FakeSender()
        # Kein alert_state seeden — Rehearsal darf trotzdem laufen.
        r = await send_escalation_test_mail(db, sender, admin_email="admin@example.com")
        assert r["ok"] is True
        # alert_state existiert nicht (weil kein echter Incident lief) →
        # Rehearsal darf keinen anlegen.
        assert STATE_ID not in db.job_summaries.docs

    _run(_t())
