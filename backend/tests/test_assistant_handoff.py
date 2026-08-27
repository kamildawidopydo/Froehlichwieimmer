"""Session 80.40 — Assistant Handoff (Lead Management) backend tests.

Covers: POST /api/assistant/handoff (create, PII redaction, honeypot, duplicate,
consent, validation, rate-limit), admin inbox endpoints
(GET list/stats/single, PATCH) and /api/assistant/chat regression.

NOTE: The handoff endpoint has an in-memory rate limit of 5 requests/hour/IP.
All test traffic originates from one IP, so each test class restarts the backend
(resets in-memory counters) via the `reset_rl` fixture and stays within budget.
Run serially: pytest -n 0
"""
import os
import re
import subprocess
import time
import uuid

import pytest
import requests
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

HEX24 = re.compile(r"^[0-9a-f]{24}$")


# --- infra fixtures --------------------------------------------------------
@pytest.fixture(scope="session")
def mongo():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


def _wait_healthy(timeout=90):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            if requests.get(f"{BASE_URL}/api/health", timeout=10).status_code == 200:
                return True
        except Exception:
            pass
        time.sleep(2)
    return False


@pytest.fixture(scope="class")
def reset_rl():
    """Reset the in-memory handoff rate limit by restarting the backend."""
    subprocess.run(["sudo", "supervisorctl", "restart", "backend"], capture_output=True)
    assert _wait_healthy(), "backend did not come back healthy after restart"
    time.sleep(2)
    return True


@pytest.fixture(scope="class")
def admin_client():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    if r.status_code != 200:
        pytest.fail(f"Admin login failed: {r.status_code} {r.text[:300]}")
    return s


@pytest.fixture(scope="module")
def cleanup_ids(mongo):
    ids = []
    yield ids
    from bson import ObjectId
    for i in ids:
        try:
            mongo.assistant_handoffs.delete_one({"_id": ObjectId(i)})
        except Exception:
            pass
    mongo.assistant_handoffs.delete_many({"name": {"$regex": "^TEST_"}})


def _payload(concern="Ich interessiere mich fuer Tagesgeld und moechte Beratung.", **kw):
    p = {
        "name": "TEST_Anna Muster",
        "email": f"TEST_{uuid.uuid4().hex[:8]}@example.com",
        "concern": concern,
        "consent": True,
        "current_route": "/",
        "conversation_history": [
            {"role": "user", "content": "Was ist Tagesgeld?"},
            {"role": "assistant", "content": "Tagesgeld ist eine taeglich verfuegbare Anlage."},
        ],
    }
    p.update(kw)
    return p


# --- chat regression -------------------------------------------------------
class TestChatRegression:
    def test_chat_still_works(self):
        r = requests.post(f"{BASE_URL}/api/assistant/chat",
                          json={"message": "Was ist Tagesgeld?", "current_route": "/"}, timeout=90)
        assert r.status_code == 200, r.text[:400]
        data = r.json()
        assert isinstance(data.get("answer"), str) and len(data["answer"]) > 10
        assert isinstance(data.get("sources"), list)


# --- admin protection (no handoff POSTs) -----------------------------------
class TestAdminProtection:
    def test_list_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/admin/assistant-handoffs", timeout=30)
        assert r.status_code == 401, f"expected 401 got {r.status_code}: {r.text[:200]}"

    def test_stats_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/admin/assistant-handoffs/stats", timeout=30)
        assert r.status_code == 401

    def test_patch_requires_auth(self):
        r = requests.patch(f"{BASE_URL}/api/admin/assistant-handoffs/000000000000000000000000",
                           json={"status": "new"}, timeout=30)
        assert r.status_code == 401

    def test_non_admin_forbidden(self):
        s = requests.Session()
        email = f"TEST_user_{uuid.uuid4().hex[:8]}@example.com"
        reg = s.post(f"{BASE_URL}/api/auth/register",
                     json={"email": email, "password": "Testpass123!", "name": "TEST_User"}, timeout=30)
        assert reg.status_code in (200, 201), reg.text[:300]
        if not s.cookies:
            login = s.post(f"{BASE_URL}/api/auth/login",
                           json={"email": email, "password": "Testpass123!"}, timeout=30)
            assert login.status_code == 200, login.text[:300]
        r = s.get(f"{BASE_URL}/api/admin/assistant-handoffs", timeout=30)
        assert r.status_code == 403, f"expected 403 got {r.status_code}: {r.text[:200]}"


# --- core create / PII / honeypot / duplicate + admin CRUD ----------------
class TestHandoffCore:
    def test_honeypot_silent_no_insert(self, reset_rl, mongo):
        before = mongo.assistant_handoffs.count_documents({})
        r = requests.post(f"{BASE_URL}/api/assistant/handoff",
                          json=_payload(website="https://spam.example"), timeout=30)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert data["success"] is True
        assert data.get("handoff_id") is None
        time.sleep(1)
        assert mongo.assistant_handoffs.count_documents({}) == before

    def test_create_and_duplicate_and_admin_views(self, reset_rl, mongo, admin_client, cleanup_ids):
        payload = _payload()
        before = mongo.assistant_handoffs.count_documents({})
        r = requests.post(f"{BASE_URL}/api/assistant/handoff", json=payload, timeout=60)
        assert r.status_code == 200, r.text[:400]
        data = r.json()
        assert data["success"] is True
        hid = data["handoff_id"]
        assert HEX24.match(hid), f"handoff_id not 24-hex: {hid}"
        cleanup_ids.append(hid)

        # DB doc verification
        from bson import ObjectId
        doc = mongo.assistant_handoffs.find_one({"_id": ObjectId(hid)})
        assert doc is not None
        assert doc["status"] == "new"
        assert doc["email"] == payload["email"].lower()
        assert doc["context_summary"]
        assert "Tagesgeld/Festgeld" in doc["recent_topics"]
        assert doc.get("fingerprint") and doc.get("ip_hash")
        assert mongo.assistant_handoffs.count_documents({}) == before + 1

        # Duplicate detection: same email+concern within 10 min
        r2 = requests.post(f"{BASE_URL}/api/assistant/handoff", json=payload, timeout=60)
        assert r2.status_code == 200, r2.text[:300]
        d2 = r2.json()
        assert d2.get("duplicate") is True, d2
        assert d2["handoff_id"] == hid
        assert mongo.assistant_handoffs.count_documents({}) == before + 1

        # Admin single GET
        g = admin_client.get(f"{BASE_URL}/api/admin/assistant-handoffs/{hid}", timeout=30)
        assert g.status_code == 200, g.text[:300]
        item = g.json()
        assert item["id"] == hid
        assert "_id" not in item
        assert item["status"] == "new"
        assert item["context_summary"]

        # Admin list contains our doc
        l = admin_client.get(f"{BASE_URL}/api/admin/assistant-handoffs?limit=50", timeout=30)
        assert l.status_code == 200
        lst = l.json()
        for key in ("items", "total", "limit", "offset"):
            assert key in lst
        assert any(i["id"] == hid for i in lst["items"])
        assert all("_id" not in i for i in lst["items"])

        # Stats consistency
        st = admin_client.get(f"{BASE_URL}/api/admin/assistant-handoffs/stats", timeout=30)
        assert st.status_code == 200
        s = st.json()
        assert set(s["by_status"].keys()) == {"new", "in_progress", "completed", "archived"}
        assert sum(s["by_status"].values()) == s["total"]
        assert s["last_7d"] >= 1 and s["last_30d"] >= s["last_7d"]

        # Filter by status + search
        f1 = admin_client.get(f"{BASE_URL}/api/admin/assistant-handoffs?status=new&limit=200", timeout=30)
        assert f1.status_code == 200
        assert all(i["status"] == "new" for i in f1.json()["items"])
        f2 = admin_client.get(f"{BASE_URL}/api/admin/assistant-handoffs?q=Tagesgeld&limit=50", timeout=30)
        assert f2.status_code == 200
        assert any(i["id"] == hid for i in f2.json()["items"])
        f3 = admin_client.get(f"{BASE_URL}/api/admin/assistant-handoffs?status=bogus", timeout=30)
        assert f3.status_code == 400

        # PATCH status/notes/assignee, verify persistence
        p = admin_client.patch(f"{BASE_URL}/api/admin/assistant-handoffs/{hid}", json={
            "status": "in_progress", "admin_notes": "Rueckruf geplant",
            "assigned_to": "berater@froehlich.de"}, timeout=30)
        assert p.status_code == 200, p.text[:300]
        pd = p.json()
        assert pd["status"] == "in_progress"
        assert pd["admin_notes"] == "Rueckruf geplant"
        assert pd["assigned_to"] == "berater@froehlich.de"
        g2 = admin_client.get(f"{BASE_URL}/api/admin/assistant-handoffs/{hid}", timeout=30).json()
        assert g2["status"] == "in_progress"
        assert g2["admin_notes"] == "Rueckruf geplant"
        assert g2["assigned_to"] == "berater@froehlich.de"

        # PATCH invalid status
        bad = admin_client.patch(f"{BASE_URL}/api/admin/assistant-handoffs/{hid}",
                                 json={"status": "erledigt"}, timeout=30)
        assert bad.status_code == 400
        assert "Ung" in bad.text

        # PATCH unknown id
        nf = admin_client.patch(f"{BASE_URL}/api/admin/assistant-handoffs/000000000000000000000000",
                                json={"status": "new"}, timeout=30)
        assert nf.status_code == 404

    def test_stats_total_matches_list_total(self, admin_client):
        """stats.total (sum of by_status) must match the unfiltered list total."""
        st = admin_client.get(f"{BASE_URL}/api/admin/assistant-handoffs/stats", timeout=30).json()
        li = admin_client.get(f"{BASE_URL}/api/admin/assistant-handoffs?limit=1", timeout=30).json()
        assert st["total"] == li["total"], (
            f"stats.total={st['total']} but list total={li['total']} — docs with missing/unknown "
            f"status are dropped/overwritten in the stats aggregation")

    def test_pii_redaction(self, reset_rl, admin_client, cleanup_ids):
        concern = ("Meine IBAN DE89370400440532013000 und PIN 1234 - bitte um Rueckruf "
                   "zum Thema Festgeld.")
        r = requests.post(f"{BASE_URL}/api/assistant/handoff", json=_payload(concern=concern), timeout=60)
        assert r.status_code == 200, r.text[:300]
        hid = r.json()["handoff_id"]
        cleanup_ids.append(hid)
        item = admin_client.get(f"{BASE_URL}/api/admin/assistant-handoffs/{hid}", timeout=30).json()
        c = item["concern"]
        # Core protection: raw IBAN must be gone
        assert "DE89370400440532013000" not in c, c
        # Spec (80.40b): marker uses "Kontoverbindung" so the keyword pass cannot
        # re-touch it; PIN digits must be gone via PIN_DIGITS regex.
        assert "[Kontoverbindung entfernt]" in c, (
            f"IBAN marker corrupted/missing: {c}")
        assert "1234" not in c, f"PIN digits still present in stored concern: {c}"
        assert "[entfernt]" in c, c

    def test_pii_redaction_exact_spec_string(self, admin_client, cleanup_ids):
        """Exact expected redaction output from the 80.40b spec."""
        concern = "IBAN DE89370400440532013000 und PIN 1234 sowie mein kennwort ist geheim."
        r = requests.post(f"{BASE_URL}/api/assistant/handoff", json=_payload(concern=concern), timeout=60)
        assert r.status_code == 200, r.text[:300]
        hid = r.json()["handoff_id"]
        cleanup_ids.append(hid)
        item = admin_client.get(f"{BASE_URL}/api/admin/assistant-handoffs/{hid}", timeout=30).json()
        expected = ("[entfernt] [Kontoverbindung entfernt] und [entfernt] sowie mein "
                    "[entfernt] ist geheim.")
        assert item["concern"] == expected, item["concern"]

    def test_consent_missing_field(self, reset_rl, cleanup_ids):
        """Spec: request without consent must be rejected with 400."""
        p = _payload()
        p.pop("consent")
        r = requests.post(f"{BASE_URL}/api/assistant/handoff", json=p, timeout=60)
        if r.status_code == 200 and r.json().get("handoff_id"):
            cleanup_ids.append(r.json()["handoff_id"])
        assert r.status_code == 400, (
            f"consent-less submission accepted (status={r.status_code}) — DSGVO consent not enforced "
            f"when field is omitted")


# --- validation ------------------------------------------------------------
class TestHandoffValidation:
    def test_consent_false(self, reset_rl):
        r = requests.post(f"{BASE_URL}/api/assistant/handoff",
                          json=_payload(consent=False), timeout=30)
        assert r.status_code == 400
        assert "Datenschutzhinweis" in r.text

    def test_invalid_email(self, reset_rl):
        r = requests.post(f"{BASE_URL}/api/assistant/handoff",
                          json=_payload(email="not-an-email"), timeout=30)
        assert r.status_code == 400
        assert "E-Mail" in r.text

    def test_concern_too_short(self, reset_rl):
        r = requests.post(f"{BASE_URL}/api/assistant/handoff", json=_payload(concern="Hi"), timeout=30)
        assert r.status_code == 400

    def test_concern_too_long(self, reset_rl):
        r = requests.post(f"{BASE_URL}/api/assistant/handoff",
                          json=_payload(concern="a" * 2001), timeout=30)
        assert r.status_code == 400

    def test_name_empty(self, reset_rl):
        r = requests.post(f"{BASE_URL}/api/assistant/handoff", json=_payload(name=""), timeout=30)
        assert r.status_code == 400


# --- 80.40b fixes: consent null, XFF rate-limit buckets, legacy status ----
class TestHandoffFixes8040b:
    def test_consent_null(self, reset_rl):
        r = requests.post(f"{BASE_URL}/api/assistant/handoff",
                          json=_payload(consent=None), timeout=30)
        assert r.status_code == 400, r.text[:300]
        assert "Datenschutzhinweis" in r.text

    def test_xff_separate_buckets(self, cleanup_ids):
        """6 requests from 6 different X-Forwarded-For IPs must all succeed."""
        codes = []
        for i in range(1, 7):
            r = requests.post(f"{BASE_URL}/api/assistant/handoff",
                              json=_payload(concern=f"XFF Anliegen {i} zu Festgeld bitte."),
                              headers={"X-Forwarded-For": f"203.0.113.{i}"}, timeout=60)
            codes.append(r.status_code)
            if r.status_code == 200 and r.json().get("handoff_id"):
                cleanup_ids.append(r.json()["handoff_id"])
        assert codes == [200] * 6, codes

    def test_xff_same_ip_rate_limited(self, cleanup_ids):
        """6 requests from the SAME X-Forwarded-For IP → 6th must be 429."""
        codes = []
        for i in range(6):
            r = requests.post(f"{BASE_URL}/api/assistant/handoff",
                              json=_payload(concern=f"Selbe IP Anliegen {i} zu Festgeld."),
                              headers={"X-Forwarded-For": "203.0.113.99"}, timeout=60)
            codes.append(r.status_code)
            if r.status_code == 200 and r.json().get("handoff_id"):
                cleanup_ids.append(r.json()["handoff_id"])
        assert codes[:5] == [200] * 5, codes
        assert codes[5] == 429, codes

    def test_status_new_includes_legacy_docs(self, mongo, admin_client):
        """Docs without a `status` field must appear under ?status=new and stats.new."""
        from bson import ObjectId
        legacy_id = mongo.assistant_handoffs.insert_one({
            "name": "TEST_Legacy Doc",
            "email": "TEST_legacy@example.com",
            "concern": "Legacy Anliegen ohne Status-Feld.",
            "created_at": datetime_now(),
        }).inserted_id
        try:
            lst = admin_client.get(
                f"{BASE_URL}/api/admin/assistant-handoffs?status=new&limit=200", timeout=30).json()
            ids = [i["id"] for i in lst["items"]]
            assert str(legacy_id) in ids, "legacy doc (no status field) missing from ?status=new"
            assert all(i["status"] == "new" for i in lst["items"])
            assert lst["total"] == len(ids) or lst["total"] >= len(ids)
            st = admin_client.get(f"{BASE_URL}/api/admin/assistant-handoffs/stats", timeout=30).json()
            assert st["by_status"]["new"] == lst["total"], (st["by_status"], lst["total"])
            full = admin_client.get(f"{BASE_URL}/api/admin/assistant-handoffs?limit=1", timeout=30).json()
            assert st["total"] == full["total"], (st["total"], full["total"])
        finally:
            mongo.assistant_handoffs.delete_one({"_id": ObjectId(str(legacy_id))})


def datetime_now():
    from datetime import datetime, timezone
    return datetime.now(timezone.utc)


# --- rate limit (runs last; consumes full budget) -------------------------
class TestHandoffRateLimit:
    def test_rate_limit_kicks_in(self, reset_rl, cleanup_ids):
        """5/h/IP. The preview ingress fronts the backend with 2 source IPs, so a
        429 appears after ~5-10 requests. Assert that it appears within 12."""
        codes = []
        for i in range(12):
            r = requests.post(f"{BASE_URL}/api/assistant/handoff",
                              json=_payload(concern=f"Anliegen Nummer {i} zu Festgeld bitte."),
                              timeout=60)
            codes.append(r.status_code)
            if r.status_code == 200 and r.json().get("handoff_id"):
                cleanup_ids.append(r.json()["handoff_id"])
            if r.status_code == 429:
                break
        assert codes[0] == 200, codes
        assert 429 in codes, f"rate limit never triggered within 12 requests: {codes}"
