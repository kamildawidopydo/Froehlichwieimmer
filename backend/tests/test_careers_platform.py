# Careers platform (Essence Invest /karriere): public gating, recruiting admin, apply flow, role isolation
import os
import time
import uuid
from datetime import date, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api/careers"
ADMIN = ("admin@kapitalmitte.com", "admin123")
CUSTOMER = ("tester@mester.de", "HHHKKK222")
PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"
APPLICANT = "delivered@resend.dev"


def login(email, pw):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pw})
    if r.status_code != 200:
        pytest.skip(f"login failed {email}: {r.status_code} {r.text[:200]}")
    tok = s.cookies.get("access_token")
    s.headers["Authorization"] = f"Bearer {tok}"
    return s


LOCAL = "http://localhost:8001/api/careers"  # RL-consuming calls go direct with x-real-ip (Cloudflare blocks spoofed cf-connecting-ip)


def fake_ip():
    return f"10.{uuid.uuid4().int % 250}.{uuid.uuid4().int % 250}.{uuid.uuid4().int % 250}"


def form(job_id="", position="Junior Finanzberater", **over):
    d = {"first_name": "TEST_Max", "last_name": "Muster", "email": APPLICANT, "phone": "+49 170 1234567",
         "position": position, "job_id": job_id, "experience": "1-3 Jahre", "start_date": "sofort",
         "message": "TEST_ Bewerbung", "privacy_consent": "true", "website": "",
         "form_started_at": str(int(time.time() * 1000) - 10000)}
    d.update(over)
    return d


@pytest.fixture(scope="module")
def admin():
    return login(*ADMIN)


@pytest.fixture(scope="module")
def state(admin):
    """Remember original settings; restore & cleanup at end."""
    orig = admin.get(f"{API}/admin/settings").json()
    st = {"orig": orig, "jobs": [], "apps": [], "users": []}
    yield st
    for a in st["apps"]:
        admin.delete(f"{API}/admin/applications/{a}")
    for j in st["jobs"]:
        admin.delete(f"{API}/admin/jobs/{j}")
    for u in st["users"]:
        admin.delete(f"{API}/admin/team/{u}")
    admin.put(f"{API}/admin/settings", json={"site_public": False, "applications_enabled": False,
                                             "retention_days": orig.get("retention_days", 180),
                                             "notify_email": orig.get("notify_email") or None})


# --- Anonymous gating ---
class TestAnonymous:
    def test_status_closed(self):
        r = requests.get(f"{API}/status")
        assert r.status_code == 200
        d = r.json()
        assert d["site_public"] is False and d["applications_enabled"] is False and d["is_staff"] is False

    def test_jobs_empty(self):
        r = requests.get(f"{API}/jobs")
        assert r.status_code == 200 and r.json()["items"] == []

    def test_job_detail_404(self):
        assert requests.get(f"{API}/jobs/junior-finanzberater").status_code == 404
        assert requests.get(f"{API}/jobs/junior-finanzberater?preview=true").status_code == 404

    def test_apply_403(self):
        r = requests.post(f"{API}/applications", data=form())
        assert r.status_code == 403

    def test_admin_endpoints_401(self):
        for p in ["admin/jobs", "admin/applications", "admin/stats", "admin/settings", "admin/files/abc", "admin/team"]:
            assert requests.get(f"{API}/{p}").status_code == 401, p


# --- Admin preview + jobs CRUD ---
class TestAdminJobs:
    def test_seeded_drafts(self, admin):
        items = admin.get(f"{API}/admin/jobs").json()["items"]
        seeds = [j for j in items if j["slug"] == "junior-finanzberater" or True]
        assert len(items) >= 10
        assert all(j["status"] == "draft" for j in items), [(j["slug"], j["status"]) for j in items if j["status"] != "draft"]

    def test_preview_lists_drafts(self, admin):
        r = admin.get(f"{API}/jobs?preview=true")
        assert r.status_code == 200 and len(r.json()["items"]) >= 10
        assert admin.get(f"{API}/jobs").json()["items"] == []  # no published
        assert admin.get(f"{API}/jobs/junior-finanzberater?preview=true").status_code == 200
        assert admin.get(f"{API}/jobs?preview=true&level=erfahren").status_code == 200
        lv = admin.get(f"{API}/jobs?preview=true&level=einsteiger").json()["items"]
        assert all(j["level"] == "einsteiger" for j in lv)
        q = admin.get(f"{API}/jobs?preview=true&q=Finanzberater").json()["items"]
        assert len(q) >= 1
        t = [j["title"] for j in admin.get(f"{API}/jobs?preview=true&sort=title").json()["items"]]
        assert t == sorted(t)

    def test_job_lifecycle(self, admin, state):
        r = admin.post(f"{API}/admin/jobs", json={"title": "TEST_ Stelle Berater (m/w/d)", "level": "einsteiger",
                                                  "summary": "s", "tasks": ["a", " "], "requirements": ["b"], "offer": ["c"]})
        assert r.status_code == 201, r.text
        j = r.json()
        state["jobs"].append(j["id"])
        assert j["status"] == "draft" and j["tasks"] == ["a"] and j["slug"].startswith("test-stelle-berater")
        r = admin.post(f"{API}/admin/jobs/{j['id']}/status", json={"status": "published"})
        assert r.status_code == 422 and "Standort" in r.json()["detail"]
        body = {"title": "TEST_ Stelle Berater (m/w/d)", "level": "einsteiger", "location": "Berlin",
                "employment_type": "Vollzeit", "summary": "s2", "tasks": ["a"], "requirements": ["b"], "offer": ["c"],
                "deadline": (date.today() + timedelta(days=30)).isoformat()}
        r = admin.put(f"{API}/admin/jobs/{j['id']}", json=body)
        assert r.status_code == 200 and r.json()["location"] == "Berlin"
        for st in ["published", "inactive", "draft", "published"]:
            r = admin.post(f"{API}/admin/jobs/{j['id']}/status", json={"status": st})
            assert r.status_code == 200 and r.json()["status"] == st
        assert r.json()["published_at"]
        state["slug"] = j["slug"]
        state["job_id"] = j["id"]

    def test_extra_field_and_bad_deadline_rejected(self, admin):
        r = admin.post(f"{API}/admin/jobs", json={"title": "TEST_x", "level": "einsteiger", "status": "published"})
        assert r.status_code == 422
        r = admin.post(f"{API}/admin/jobs", json={"title": "TEST_x", "level": "einsteiger", "deadline": "31.12.2026"})
        assert r.status_code == 422

    def test_delete_job(self, admin):
        j = admin.post(f"{API}/admin/jobs", json={"title": "TEST_ Delete Me", "level": "erfahren"}).json()
        assert admin.delete(f"{API}/admin/jobs/{j['id']}").status_code == 200
        assert admin.delete(f"{API}/admin/jobs/{j['id']}").status_code == 404


# --- Settings + apply flow ---
class TestApply:
    def test_enable(self, admin, state):
        r = admin.put(f"{API}/admin/settings", json={"site_public": True, "applications_enabled": True,
                                                     "retention_days": state["orig"].get("retention_days", 180),
                                                     "notify_email": None})
        assert r.status_code == 200 and r.json()["site_public"] is True and r.json()["applications_enabled"] is True
        assert admin.put(f"{API}/admin/settings", json={"site_public": True, "applications_enabled": True,
                                                        "retention_days": 5}).status_code == 422
        # anon now sees published test job
        r = requests.get(f"{API}/jobs")
        assert any(j["id"] == state["job_id"] for j in r.json()["items"])
        assert requests.get(f"{API}/jobs/{state['slug']}").status_code == 200
        assert requests.get(f"{API}/jobs/junior-finanzberater").status_code == 404  # draft hidden

    def test_submit_with_job(self, state):
        files = [("cv", ("lebenslauf.pdf", PDF, "application/pdf")),
                 ("attachments", ("zeugnis.png", b"\x89PNG\r\n", "image/png"))]
        r = requests.post(f"{LOCAL}/applications", data=form(job_id=state["job_id"]), files=files,
                          headers={"x-real-ip": fake_ip()})
        assert r.status_code == 201, r.text
        state["apps"].append(r.json()["id"])
        state["app_id"] = r.json()["id"]

    def test_initiative(self, state):
        r = requests.post(f"{LOCAL}/applications", data=form(position="TEST_ Initiativ Analyst"),
                          files=[("cv", ("cv.pdf", PDF, "application/pdf"))], headers={"x-real-ip": fake_ip()})
        assert r.status_code == 201, r.text
        state["apps"].append(r.json()["id"])
        state["init_id"] = r.json()["id"]

    @pytest.mark.parametrize("over,code", [
        ({"privacy_consent": "false"}, 422),
        ({"website": "http://spam"}, 422),
        ({"form_started_at": "NOW"}, 422),
        ({"phone": "abcdefg"}, 422),
    ])
    def test_validations(self, over, code):
        over = {k: (str(int(time.time() * 1000)) if v == "NOW" else v) for k, v in over.items()}
        r = requests.post(f"{API}/applications", data=form(**over))
        assert r.status_code == code, r.text

    def test_non_pdf_cv(self):
        r = requests.post(f"{LOCAL}/applications", data=form(),
                          files=[("cv", ("cv.pdf", b"NOTPDF", "application/pdf"))], headers={"x-real-ip": fake_ip()})
        assert r.status_code == 415
        r = requests.post(f"{LOCAL}/applications", data=form(),
                          files=[("cv", ("cv.docx", b"xx", "application/msword"))], headers={"x-real-ip": fake_ip()})
        assert r.status_code == 415

    def test_draft_job_404(self, admin):
        seed = [j for j in admin.get(f"{API}/admin/jobs").json()["items"] if j["slug"] == "junior-finanzberater"][0]
        r = requests.post(f"{LOCAL}/applications", data=form(job_id=seed["id"]), headers={"x-real-ip": fake_ip()})
        assert r.status_code == 404

    def test_deadline_passed(self, admin, state):
        j = admin.post(f"{API}/admin/jobs", json={"title": "TEST_ Abgelaufen", "level": "erfahren", "location": "Köln",
                                                  "employment_type": "Teilzeit",
                                                  "deadline": (date.today() - timedelta(days=2)).isoformat()}).json()
        state["jobs"].append(j["id"])
        assert admin.post(f"{API}/admin/jobs/{j['id']}/status", json={"status": "published"}).status_code == 200
        r = requests.post(f"{LOCAL}/applications", data=form(job_id=j["id"]), headers={"x-real-ip": fake_ip()})
        assert r.status_code == 422 and "frist" in r.json()["detail"]

    def test_rate_limit(self):
        ip = fake_ip()
        codes = [requests.post(f"{LOCAL}/applications", data=form(position="TEST_ RL"),
                               headers={"x-real-ip": ip}).status_code for _ in range(4)]
        assert codes[-1] == 429, codes
        # cleanup of the 3 RL apps happens via search below
        pytest.rl_codes = codes


# --- Recruiting applications management ---
class TestApplications:
    def test_list_filters(self, admin, state):
        items = admin.get(f"{API}/admin/applications").json()["items"]
        ids = [a["id"] for a in items]
        assert state["app_id"] in ids and state["init_id"] in ids
        f = admin.get(f"{API}/admin/applications?job_id={state['job_id']}").json()["items"]
        assert [a["id"] for a in f] == [state["app_id"]]
        ini = admin.get(f"{API}/admin/applications?job_id=initiative").json()["items"]
        assert all(a["is_initiative"] for a in ini) and state["init_id"] in [a["id"] for a in ini]
        q = admin.get(f"{API}/admin/applications?q=TEST_ Initiativ").json()["items"]
        assert [a["id"] for a in q] == [state["init_id"]]
        assert all(a["status"] == "neu" for a in admin.get(f"{API}/admin/applications?status=neu").json()["items"])
        # track RL apps for cleanup
        for a in admin.get(f"{API}/admin/applications?q=TEST_ RL").json()["items"]:
            state["apps"].append(a["id"])

    def test_detail_patch_file(self, admin, state):
        d = admin.get(f"{API}/admin/applications/{state['app_id']}").json()
        assert d["job_title"] == "TEST_ Stelle Berater (m/w/d)" and len(d["files"]) == 2 and d["email"] == APPLICANT
        r = admin.patch(f"{API}/admin/applications/{state['app_id']}", json={"status": "interview", "note": "TEST_ note"})
        assert r.status_code == 200
        d = admin.get(f"{API}/admin/applications/{state['app_id']}").json()
        assert d["status"] == "interview" and any(n["text"] == "TEST_ note" for n in d["notes"])
        assert any(n.get("system") for n in d["notes"])
        fid = [f for f in d["files"] if f["kind"] == "cv"][0]["file_id"]
        r = admin.get(f"{API}/admin/files/{fid}")
        assert r.status_code == 200 and r.content.startswith(b"%PDF")
        assert requests.get(f"{API}/admin/files/{fid}").status_code == 401
        state["file_id"] = fid

    def test_stats(self, admin):
        s = admin.get(f"{API}/admin/stats").json()
        assert s["total_applications"] >= 2 and s["active_jobs"] >= 1 and len(s["by_status"]) == 5

    def test_retention_run(self, admin):
        r = admin.post(f"{API}/admin/retention/run")
        assert r.status_code == 200 and "deleted" in r.json()

    def test_delete_app(self, admin, state):
        r = admin.delete(f"{API}/admin/applications/{state['init_id']}")
        assert r.status_code == 200
        assert admin.get(f"{API}/admin/applications/{state['init_id']}").status_code == 404


# --- Role isolation ---
class TestRoles:
    def test_recruiting_user(self, admin, state):
        email = f"test_recruit_{uuid.uuid4().hex[:6]}@example.com"
        r = admin.post(f"{API}/admin/team", json={"email": email, "name": "TEST Recruiter"})
        assert r.status_code == 201 and len(r.json()["temporary_password"]) == 16
        state["users"].append(r.json()["id"])
        assert admin.post(f"{API}/admin/team", json={"email": email, "name": "dup"}).status_code == 409
        assert any(u["email"] == email for u in admin.get(f"{API}/admin/team").json()["items"])
        rs = login(email, r.json()["temporary_password"])
        me = rs.get(f"{BASE_URL}/api/auth/me").json()
        assert me["role"] == "recruiting"
        state["me"] = me
        for p in ["admin/jobs", "admin/applications", "admin/stats", "admin/settings"]:
            assert rs.get(f"{API}/{p}").status_code == 200, p
        assert rs.get(f"{API}/admin/files/{state['file_id']}").status_code == 200
        assert rs.get(f"{API}/admin/team").status_code == 403
        assert rs.post(f"{API}/admin/team", json={"email": "x_test@example.com", "name": "xx"}).status_code == 403
        bad = {}
        for p in ["/api/admin/users", "/api/admin/dashboard/summary", "/api/admin/applications/list",
                  "/api/admin/banks/list", "/api/admin/depot-contracts/list", "/api/admin/activity/list"]:
            c = rs.get(f"{BASE_URL}{p}").status_code
            if c != 403:
                bad[p] = c
        assert not bad, bad
        assert rs.get(f"{API}/status").json()["is_staff"] is True

    def test_customer_forbidden(self, state):
        cs = login(*CUSTOMER)
        bad = {}
        for p in ["admin/jobs", "admin/applications", "admin/stats", "admin/settings", "admin/team",
                  f"admin/files/{state.get('file_id', 'x')}"]:
            c = cs.get(f"{API}/{p}").status_code
            if c != 403:
                bad[p] = c
        assert cs.post(f"{API}/admin/jobs", json={"title": "TEST_ hack", "level": "einsteiger"}).status_code == 403
        assert not bad, bad
        assert cs.get(f"{API}/status").json()["is_staff"] is False

    def test_delete_recruiter(self, admin, state):
        uid = state["users"][-1]
        assert admin.delete(f"{API}/admin/team/{uid}").status_code == 200
        assert admin.delete(f"{API}/admin/team/{uid}").status_code == 404
        state["users"].remove(uid)
