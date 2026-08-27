"""Session 80.41 — Lead-Inbox Productivity backend tests.

Covers POST /api/admin/assistant-handoffs/{id}/reply (success, 2nd reply,
recipient manipulation, validation, HTML injection, 404/401/403,
missing email, provider failure) and PATCH status_history logging + legacy docs.

Seeds handoffs directly via pymongo to bypass the public-endpoint rate limit.
Run serially: pytest -n 0
"""
import os
import time
import uuid
from datetime import datetime, timezone

import pytest
import requests
from bson import ObjectId
from dotenv import dotenv_values
from pymongo import MongoClient

frontend_env = dotenv_values("/app/frontend/.env")
backend_env = dotenv_values("/app/backend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
MONGO_URL = backend_env.get("MONGO_URL")
DB_NAME = backend_env.get("DB_NAME")

ADMIN_EMAIL = "admin@kapitalmitte.com"
ADMIN_PASSWORD = "admin123"
DELIVERABLE = "delivered@resend.dev"


@pytest.fixture(scope="session")
def mongo():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


@pytest.fixture(scope="session")
def admin_client():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    if r.status_code != 200:
        pytest.fail(f"Admin login failed: {r.status_code} {r.text[:300]}")
    return s


@pytest.fixture(scope="session")
def user_client():
    """Normal (non-admin) authenticated session."""
    s = requests.Session()
    email = f"TEST_user_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{BASE_URL}/api/auth/register",
               json={"email": email, "password": "Test12345!", "name": "TEST_User"}, timeout=30)
    if r.status_code not in (200, 201):
        pytest.fail(f"user register failed: {r.status_code} {r.text[:300]}")
    return s


@pytest.fixture(scope="session")
def seeded(mongo):
    """Track seeded handoff ids for cleanup."""
    ids = []
    yield ids
    for i in ids:
        try:
            mongo.assistant_handoffs.delete_one({"_id": ObjectId(i)})
        except Exception:
            pass
    mongo.assistant_handoffs.delete_many({"name": {"$regex": "^TEST_8041"}})


def _seed(mongo, seeded, email=DELIVERABLE, minimal=False, **extra):
    doc = {
        "name": "TEST_8041 Kunde",
        "concern": "Ich moechte Beratung zu Tagesgeld und ETFs.",
        "created_at": datetime.now(timezone.utc),
        "source": "assistant_chat",
    }
    if email is not None:
        doc["email"] = email
    if not minimal:
        doc.update({
            "status": "new",
            "status_history": [],
            "reply_history": [],
            "reply_count": 0,
            "context_summary": "Kunde fragte nach Tagesgeld.",
            "recent_topics": ["tagesgeld"],
        })
    doc.update(extra)
    _id = mongo.assistant_handoffs.insert_one(doc).inserted_id
    seeded.append(str(_id))
    return str(_id)


def _get(admin_client, hid):
    r = admin_client.get(f"{BASE_URL}/api/admin/assistant-handoffs/{hid}", timeout=30)
    assert r.status_code == 200, r.text[:300]
    return r.json()


def _reply(admin_client, hid, **payload):
    return admin_client.post(f"{BASE_URL}/api/admin/assistant-handoffs/{hid}/reply",
                             json=payload, timeout=90)


def _reply_ok(admin_client, hid, attempts=5, wait=25, **payload):
    """Reply expecting success. The Emergent email proxy rate-limits bursts
    (429 -> our 502), so retry with backoff before declaring failure."""
    r = _reply(admin_client, hid, **payload)
    for _ in range(attempts - 1):
        if r.status_code != 502:
            break
        time.sleep(wait)
        r = _reply(admin_client, hid, **payload)
    return r


# --- reply success + audit metadata ---------------------------------------
class TestReplySuccess:
    def test_first_reply_success_and_auto_status(self, mongo, admin_client, seeded):
        hid = _seed(mongo, seeded)
        r = _reply_ok(admin_client, hid, subject="TEST_8041 Betreff",
                      message="Vielen Dank fuer Ihre Anfrage, wir melden uns.")
        assert r.status_code == 200, r.text[:400]
        data = r.json()
        assert data["success"] is True
        assert isinstance(data["email_id"], str) and len(data["email_id"]) > 0
        h = data["handoff"]
        assert h["reply_count"] == 1
        assert h["last_reply_at"]
        assert h["last_reply_by"] == ADMIN_EMAIL
        assert len(h["reply_history"]) == 1
        entry = h["reply_history"][0]
        assert entry["subject"] == "TEST_8041 Betreff"
        assert entry["admin"] == ADMIN_EMAIL
        assert entry["timestamp"]
        # auto NEW -> IN_PROGRESS
        assert h["status"] == "in_progress"
        assert len(h["status_history"]) == 1
        assert h["status_history"][0]["status"] == "in_progress"
        assert h["status_history"][0]["changed_by"] == ADMIN_EMAIL

        # persisted
        fetched = _get(admin_client, hid)
        assert fetched["reply_count"] == 1
        assert fetched["status"] == "in_progress"
        assert len(fetched["status_history"]) == 1

    def test_second_reply_does_not_touch_status(self, mongo, admin_client, seeded):
        hid = _seed(mongo, seeded)
        r1 = _reply_ok(admin_client, hid, subject="TEST_8041 Erste", message="Erste Antwort Text.")
        assert r1.status_code == 200, r1.text[:300]
        r2 = _reply_ok(admin_client, hid, subject="TEST_8041 Zweite", message="Zweite Antwort Text.")
        assert r2.status_code == 200, r2.text[:300]
        h = r2.json()["handoff"]
        assert h["reply_count"] == 2
        assert h["status"] == "in_progress"
        assert len(h["status_history"]) == 1, h["status_history"]
        assert len(h["reply_history"]) == 2

    def test_recipient_manipulation_ignored(self, mongo, admin_client, seeded):
        hid = _seed(mongo, seeded)
        r = _reply_ok(admin_client, hid, subject="TEST_8041 Hijack",
                      message="Payload mit fremdem Empfaenger.",
                      email="attacker@evil.example", to="attacker@evil.example",
                      recipient="attacker@evil.example")
        assert r.status_code == 200, r.text[:400]
        # stored email untouched server-side
        stored = mongo.assistant_handoffs.find_one({"_id": ObjectId(hid)})
        assert stored["email"] == DELIVERABLE
        assert _get(admin_client, hid)["email"] == DELIVERABLE

    def test_html_injection_escaped_and_stored(self, mongo, admin_client, seeded):
        hid = _seed(mongo, seeded)
        r = _reply_ok(admin_client, hid, subject="<script>alert(1)</script>Test",
                      message="<img src=x onerror=alert(1)>Body")
        assert r.status_code == 200, r.text[:400]
        h = r.json()["handoff"]
        assert h["reply_history"][-1]["subject"] == "<script>alert(1)</script>Test"


# --- validation / security -------------------------------------------------
class TestReplySecurity:
    def test_empty_message_422(self, mongo, admin_client, seeded):
        hid = _seed(mongo, seeded)
        assert _reply(admin_client, hid, subject="Betreff", message="").status_code == 422

    def test_short_message_422(self, mongo, admin_client, seeded):
        hid = _seed(mongo, seeded)
        assert _reply(admin_client, hid, subject="Betreff", message="ab").status_code == 422

    def test_empty_subject_422(self, mongo, admin_client, seeded):
        hid = _seed(mongo, seeded)
        assert _reply(admin_client, hid, subject="", message="Gueltige Nachricht.").status_code == 422

    def test_unknown_object_id_404(self, admin_client):
        r = _reply(admin_client, "000000000000000000000000",
                   subject="Betreff", message="Nachricht hier.")
        assert r.status_code == 404
        assert "Nicht gefunden" in r.text

    def test_malformed_id_404(self, admin_client):
        r = _reply(admin_client, "not-an-id", subject="Betreff", message="Nachricht hier.")
        assert r.status_code == 404

    def test_unauthenticated_401(self, mongo, seeded):
        hid = _seed(mongo, seeded)
        r = requests.post(f"{BASE_URL}/api/admin/assistant-handoffs/{hid}/reply",
                          json={"subject": "Betreff", "message": "Nachricht hier."}, timeout=30)
        assert r.status_code == 401, f"{r.status_code} {r.text[:200]}"

    def test_non_admin_403(self, mongo, seeded, user_client):
        hid = _seed(mongo, seeded)
        r = user_client.post(f"{BASE_URL}/api/admin/assistant-handoffs/{hid}/reply",
                             json={"subject": "Betreff", "message": "Nachricht hier."}, timeout=30)
        assert r.status_code == 403, f"{r.status_code} {r.text[:200]}"

    def test_handoff_without_email_422(self, mongo, admin_client, seeded):
        hid = _seed(mongo, seeded, email=None)
        r = _reply(admin_client, hid, subject="Betreff", message="Nachricht hier.")
        assert r.status_code == 422, r.text[:300]
        assert "keine gültige Kunden-E-Mail" in r.text or "Kunden-E-Mail" in r.text
        stored = mongo.assistant_handoffs.find_one({"_id": ObjectId(hid)})
        assert int(stored.get("reply_count") or 0) == 0

    def test_provider_failure_502_no_mutation(self, mongo, admin_client, seeded):
        hid = _seed(mongo, seeded, email="blocked-test-target@example.com")
        r = _reply(admin_client, hid, subject="TEST_8041 Blocked", message="Diese Mail schlaegt fehl.")
        assert r.status_code == 502, f"{r.status_code} {r.text[:300]}"
        # NOTE: the edge (Cloudflare) replaces the origin 502 body with its own
        # HTML error page, so the German detail is NOT asserted here. Verified
        # directly against the origin: {"detail": "Mailversand ist fehlgeschlagen..."}.
        stored = mongo.assistant_handoffs.find_one({"_id": ObjectId(hid)})
        assert int(stored.get("reply_count") or 0) == 0
        assert (stored.get("status") or "new") == "new"
        assert not stored.get("reply_history")
        assert not stored.get("status_history")
        assert stored.get("last_reply_at") is None


# --- PATCH status history --------------------------------------------------
class TestPatchStatusHistory:
    def test_status_history_appends_and_noop(self, mongo, admin_client, seeded):
        hid = _seed(mongo, seeded)
        url = f"{BASE_URL}/api/admin/assistant-handoffs/{hid}"
        r = admin_client.patch(url, json={"status": "completed"}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        h = r.json()
        assert h["status"] == "completed"
        assert len(h["status_history"]) == 1
        assert h["status_history"][0]["status"] == "completed"
        assert h["status_history"][0]["changed_by"] == ADMIN_EMAIL

        r2 = admin_client.patch(url, json={"status": "new"}, timeout=30)
        assert r2.status_code == 200
        hist = r2.json()["status_history"]
        assert [e["status"] for e in hist] == ["completed", "new"]

        # no-op: same status again -> no append
        r3 = admin_client.patch(url, json={"status": "new", "admin_notes": "TEST note"}, timeout=30)
        assert r3.status_code == 200, r3.text[:300]
        assert len(r3.json()["status_history"]) == 2
        assert r3.json()["admin_notes"] == "TEST note"


# --- legacy doc tolerance --------------------------------------------------
class TestLegacyDoc:
    def test_legacy_doc_defaults_patch_and_reply(self, mongo, admin_client, seeded):
        hid = _seed(mongo, seeded, minimal=True)
        h = _get(admin_client, hid)
        assert h["status_history"] == []
        assert h["reply_history"] == []
        assert h["reply_count"] == 0
        assert h["status"] == "new"

        r = admin_client.patch(f"{BASE_URL}/api/admin/assistant-handoffs/{hid}",
                               json={"status": "in_progress"}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        assert len(r.json()["status_history"]) == 1

        rr = _reply_ok(admin_client, hid, subject="TEST_8041 Legacy", message="Antwort auf Legacy-Doc.")
        assert rr.status_code == 200, rr.text[:300]
        h2 = rr.json()["handoff"]
        assert h2["reply_count"] == 1
        assert len(h2["reply_history"]) == 1
        assert len(h2["status_history"]) == 1  # no extra transition (already in_progress)


# --- assistant regression --------------------------------------------------
class TestAssistantRegression:
    def test_chat_still_works(self):
        r = requests.post(f"{BASE_URL}/api/assistant/chat",
                          json={"message": "Was ist Tagesgeld?", "current_route": "/"}, timeout=90)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert isinstance(data.get("answer"), str) and len(data["answer"]) > 10

    def test_list_includes_reply_fields(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/assistant-handoffs?limit=5", timeout=30)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert isinstance(data["items"], list)
        for item in data["items"]:
            assert "_id" not in item
            for key in ("reply_count", "reply_history", "status_history", "last_reply_at"):
                assert key in item, key

    def test_search_query_param(self, admin_client, mongo, seeded):
        hid = _seed(mongo, seeded)
        time.sleep(0.3)
        r = admin_client.get(f"{BASE_URL}/api/admin/assistant-handoffs?q=TEST_8041&status=new", timeout=30)
        assert r.status_code == 200, r.text[:300]
        ids = [i["id"] for i in r.json()["items"]]
        assert hid in ids
