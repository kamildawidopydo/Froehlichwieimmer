"""Customer Reviews module — backend regression tests.

Covers: POST /api/reviews/submit (validation, honeypot, rate limit),
GET /api/reviews/public, GET /api/reviews/stats, GET /api/reviews/admin,
PUT /api/reviews/{id}, DELETE /api/reviews/{id}
"""
import os
import re
import time
import uuid
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL is missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"


# --- fixtures ---------------------------------------------------------------
@pytest.fixture(scope="session")
def creds():
    p = Path("/app/memory/test_credentials.md")
    content = p.read_text(encoding="utf-8")
    email = re.search(r'(?im)^\s*[-*]?\s*(?:\*\*)?Email(?:\*\*)?\s*:\s*`?([^`\s]+)', content).group(1)
    pwd = re.search(r'(?im)^\s*[-*]?\s*(?:\*\*)?Password(?:\*\*)?\s*:\s*`?([^`\s]+)', content).group(1)
    return {"email": email, "password": pwd}


@pytest.fixture(scope="session")
def admin(creds):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=creds, timeout=30)
    if r.status_code != 200:
        pytest.fail(f"Admin login failed {r.status_code}: {r.text[:300]}")
    return s


@pytest.fixture(scope="session")
def anon():
    return requests.Session()


@pytest.fixture(scope="session")
def created_ids(admin):
    ids = []
    yield ids
    for rid in ids:
        admin.delete(f"{API}/reviews/{rid}", timeout=30)


def _payload(**over):
    p = {
        "first_name": "TESTQA",
        "last_name": "Muster",
        "email": f"testqa_{uuid.uuid4().hex[:8]}@example.com",
        "rating": 5,
        "text": "TEST_REVIEW automatisierter Regressionstest mit ausreichend Text.",
        "consent": True,
        "website": "",
    }
    p.update(over)
    return p


# --- validation / anti-spam (no persistence, run before rate limit) --------
class TestReviewValidation:
    def test_short_text_422(self, anon):
        r = anon.post(f"{API}/reviews/submit", json=_payload(text="kurz"), timeout=30)
        assert r.status_code == 422, r.text[:300]

    def test_consent_false_400(self, anon):
        r = anon.post(f"{API}/reviews/submit", json=_payload(consent=False), timeout=30)
        assert r.status_code == 400, r.text[:300]

    def test_invalid_rating_422(self, anon):
        r = anon.post(f"{API}/reviews/submit", json=_payload(rating=9), timeout=30)
        assert r.status_code == 422, r.text[:300]

    def test_honeypot_accepted_but_not_persisted(self, anon, admin):
        before = admin.get(f"{API}/reviews/admin", timeout=30).json()["total"]
        r = anon.post(f"{API}/reviews/submit", json=_payload(website="http://spam.example"), timeout=30)
        assert r.status_code == 200, r.text[:300]
        body = r.json()
        assert body["ok"] is True and body["status"] == "pending"
        assert "id" not in body
        after = admin.get(f"{API}/reviews/admin", timeout=30).json()["total"]
        assert after == before, "honeypot submission was persisted"


# --- public read endpoints --------------------------------------------------
class TestPublicReads:
    def test_stats_only_approved(self, anon):
        r = anon.get(f"{API}/reviews/stats", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert set(d) == {"total", "average", "distribution"}
        assert len(d["distribution"]) == 5
        assert [x["rating"] for x in d["distribution"]] == [5, 4, 3, 2, 1]
        pub = anon.get(f"{API}/reviews/public?limit=50", timeout=30).json()
        assert d["total"] == pub["total"], "stats total != public total"
        if pub["items"]:
            expected = round(sum(i["rating"] for i in pub["items"]) / len(pub["items"]), 2)
            assert abs(d["average"] - expected) < 0.02

    def test_public_fields_only(self, anon):
        r = anon.get(f"{API}/reviews/public", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert set(d) == {"total", "items", "has_more"}
        for it in d["items"]:
            assert set(it) == {"id", "display_name", "rating", "text", "created_at", "is_verified"}
            assert "@" not in it["display_name"]
            assert re.match(r"^.+ [A-Z]\.$", it["display_name"]) or it["display_name"] == "Anonym"

    def test_public_rating_filter(self, anon):
        r = anon.get(f"{API}/reviews/public?rating=4", timeout=30)
        assert r.status_code == 200
        assert all(i["rating"] == 4 for i in r.json()["items"])

    def test_public_sort_best(self, anon):
        r = anon.get(f"{API}/reviews/public?sort=best", timeout=30)
        assert r.status_code == 200
        ratings = [i["rating"] for i in r.json()["items"]]
        assert ratings == sorted(ratings, reverse=True)

    def test_public_pagination(self, anon):
        r = anon.get(f"{API}/reviews/public?limit=1&offset=0", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert len(d["items"]) <= 1
        if d["total"] > 1:
            assert d["has_more"] is True


# --- admin auth ------------------------------------------------------------
class TestAdminAuth:
    def test_admin_list_requires_auth(self, anon):
        r = anon.get(f"{API}/reviews/admin", timeout=30)
        assert r.status_code in (401, 403), r.status_code

    def test_admin_put_requires_auth(self, anon):
        r = anon.put(f"{API}/reviews/000000000000000000000000", json={"status": "approved"}, timeout=30)
        assert r.status_code in (401, 403)

    def test_admin_delete_requires_auth(self, anon):
        r = anon.delete(f"{API}/reviews/000000000000000000000000", timeout=30)
        assert r.status_code in (401, 403)

    def test_admin_list_ok(self, admin):
        r = admin.get(f"{API}/reviews/admin", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert {"total", "pending_count", "items"} <= set(d)
        for it in d["items"]:
            assert "_id" not in it
            assert "email" in it  # admin view intentionally exposes email

    def test_admin_status_filter(self, admin):
        r = admin.get(f"{API}/reviews/admin?status=approved", timeout=30)
        assert r.status_code == 200
        assert all(i["status"] == "approved" for i in r.json()["items"])


# --- full moderation lifecycle --------------------------------------------
class TestModerationLifecycle:
    def test_submit_moderate_delete(self, anon, admin, created_ids):
        pub_before = anon.get(f"{API}/reviews/public?limit=50", timeout=30).json()
        stats_before = anon.get(f"{API}/reviews/stats", timeout=30).json()

        # SUBMIT (with XSS payload in text)
        p = _payload(first_name="Xaver", last_name="Sanitizer", rating=3,
                     text="<script>alert(1)</script>Hello reviewer here TEST_XSS")
        r = anon.post(f"{API}/reviews/submit", json=p, timeout=30)
        assert r.status_code == 200, r.text[:300]
        body = r.json()
        assert body["ok"] is True and body["status"] == "pending" and body.get("id")
        rid = body["id"]
        created_ids.append(rid)

        # not public yet
        pub_now = anon.get(f"{API}/reviews/public?limit=50", timeout=30).json()
        assert pub_now["total"] == pub_before["total"]
        assert rid not in [i["id"] for i in pub_now["items"]]
        assert anon.get(f"{API}/reviews/stats", timeout=30).json()["total"] == stats_before["total"]

        # visible as pending in admin
        adm = admin.get(f"{API}/reviews/admin?status=pending", timeout=30).json()
        row = next((i for i in adm["items"] if i["id"] == rid), None)
        assert row is not None, "pending review missing in admin list"
        assert row["status"] == "pending"
        assert row["display_name"] == "Xaver S."
        assert row["is_verified"] is False
        assert row["moderated_at"] is None and row["moderated_by"] is None
        assert "<script>" not in row["text"], f"XSS not sanitized: {row['text']}"
        assert "Hello reviewer here" in row["text"]
        original_text = row["text"]

        # APPROVE
        r = admin.put(f"{API}/reviews/{rid}", json={"status": "approved"}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["status"] == "approved" and d["moderated_at"] and d["moderated_by"]

        # now public + sanitized + stats updated
        pub = anon.get(f"{API}/reviews/public?limit=50", timeout=30).json()
        item = next((i for i in pub["items"] if i["id"] == rid), None)
        assert item is not None, "approved review not public"
        assert "<script>" not in item["text"]
        assert pub["total"] == pub_before["total"] + 1
        st = anon.get(f"{API}/reviews/stats", timeout=30).json()
        assert st["total"] == stats_before["total"] + 1
        assert next(x for x in st["distribution"] if x["rating"] == 3)["count"] == \
            next(x for x in stats_before["distribution"] if x["rating"] == 3)["count"] + 1

        # is_verified toggle
        r = admin.put(f"{API}/reviews/{rid}", json={"is_verified": True}, timeout=30)
        assert r.status_code == 200 and r.json()["is_verified"] is True
        assert next(i for i in anon.get(f"{API}/reviews/public?limit=50", timeout=30).json()["items"]
                    if i["id"] == rid)["is_verified"] is True

        # display_name only changes name, text untouched
        r = admin.put(f"{API}/reviews/{rid}", json={"display_name": "Xaver Sanitizer"}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["display_name"] == "Xaver Sanitizer"
        assert d["text"] == original_text

        # REJECT removes from public
        r = admin.put(f"{API}/reviews/{rid}", json={"status": "rejected"}, timeout=30)
        assert r.status_code == 200 and r.json()["status"] == "rejected"
        pub = anon.get(f"{API}/reviews/public?limit=50", timeout=30).json()
        assert rid not in [i["id"] for i in pub["items"]]
        assert pub["total"] == pub_before["total"]

        # invalid status
        assert admin.put(f"{API}/reviews/{rid}", json={"status": "bogus"}, timeout=30).status_code == 400
        # empty payload
        assert admin.put(f"{API}/reviews/{rid}", json={}, timeout=30).status_code == 400
        # invalid id
        assert admin.put(f"{API}/reviews/not-an-oid", json={"status": "approved"}, timeout=30).status_code == 400

        # DELETE
        r = admin.delete(f"{API}/reviews/{rid}", timeout=30)
        assert r.status_code == 200, r.text[:300]
        created_ids.remove(rid)
        adm = admin.get(f"{API}/reviews/admin?limit=200", timeout=30).json()
        assert rid not in [i["id"] for i in adm["items"]]
        # 404 on unknown id
        assert admin.delete(f"{API}/reviews/{rid}", timeout=30).status_code == 404
        assert admin.put(f"{API}/reviews/{rid}", json={"status": "approved"}, timeout=30).status_code == 404

        # final state restored
        assert anon.get(f"{API}/reviews/stats", timeout=30).json()["total"] == stats_before["total"]


# --- rate limit (runs LAST: consumes the per-IP hourly quota) --------------
@pytest.mark.order(-1)
class TestZRateLimit:
    def test_rate_limit_429(self, anon, admin, created_ids):
        codes = []
        for _ in range(5):
            r = anon.post(f"{API}/reviews/submit", json=_payload(), timeout=30)
            codes.append(r.status_code)
            if r.status_code == 200 and r.json().get("id"):
                created_ids.append(r.json()["id"])
            time.sleep(0.2)
        assert 429 in codes, f"no 429 returned, codes={codes}"
        print(f"rate-limit codes: {codes}")
