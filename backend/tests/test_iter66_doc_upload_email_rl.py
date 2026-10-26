# Iteration 66: doc-upload admin email flag, used-by fields, XFF-spoof-proof rate limit, forgot-password fast
import os
import time
import uuid
import random
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN = {"email": "patron@froehlich-vermoegensberatung.de", "password": "500Euro!"}
RAND = os.environ.get("ITER66_RAND") or uuid.uuid4().hex[:6]
PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"


@pytest.fixture(scope="module")
def admin():
    s = requests.Session()
    s.headers.update({"Origin": BASE_URL})
    r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    if r.status_code != 200:
        pytest.skip(f"admin login failed {r.status_code}")
    return s


def _submit(code, name, xff=None):
    h = {"X-Forwarded-For": xff} if xff else {}
    return requests.post(
        f"{BASE_URL}/api/document-uploads/submit",
        data={"code": code, "used_by_name": name, "message": "TEST_ iter66"},
        files=[("files", ("test.pdf", PDF, "application/pdf"))],
        headers=h, timeout=60,
    )


# Real upload -> admin email flag set + code used_by fields
class TestDocUploadAdminEmail:
    def test_upload_sets_admin_email_flag(self, admin):
        r = admin.post(f"{BASE_URL}/api/admin/document-uploads/codes", json={"admin_label": f"TEST_iter66_{RAND}"})
        assert r.status_code == 201, r.text
        code, cid = r.json()["code"], r.json()["id"]
        name = f"TEST_Kunde66 {RAND}"
        sub_id = None
        try:
            t = time.time()
            s = _submit(code, name)
            print("submit took", round(time.time() - t, 2), "s", s.status_code, s.text)
            assert s.status_code == 200, s.text
            sub_id = s.json()["submission_id"]
            subs = admin.get(f"{BASE_URL}/api/admin/document-uploads/submissions").json()["items"]
            mine = [x for x in subs if x["id"] == sub_id][0]
            print("admin_email_sent", mine["admin_email_sent"], "err", mine["admin_email_error"])
            assert mine["admin_email_sent"] is True or mine["admin_email_error"], mine
            assert mine["admin_email_sent"] is True, f"email failed: {mine['admin_email_error']}"
            codes = admin.get(f"{BASE_URL}/api/admin/document-uploads/codes").json()["items"]
            c = [x for x in codes if x["id"] == cid][0]
            assert c["status"] == "used" and c["used_by_name"] == name and c["used_at"]
        finally:
            if sub_id:
                admin.delete(f"{BASE_URL}/api/admin/document-uploads/submissions/{sub_id}")
            admin.delete(f"{BASE_URL}/api/admin/document-uploads/codes/{cid}")


# Forgot password: fast + no token
class TestForgotPasswordFast:
    def test_fast_and_no_token(self):
        email = f"test_fp66_{RAND}@example.com"
        t = time.time()
        r = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": email})
        dt = time.time() - t
        assert r.status_code == 200, r.text
        assert r.json() == {"status": "ok"}
        assert dt < 2.0, f"slow: {dt:.2f}s"


# Rate limit: random spoofed first XFF entries must NOT bypass (run last)
class TestSubmitRateLimitSpoof:
    def test_spoofed_xff_does_not_bypass(self):
        statuses = []
        for _ in range(7):
            spoof = f"198.51.100.{random.randint(1, 254)}, 10.{random.randint(0,255)}.{random.randint(0,255)}.1"
            statuses.append(_submit("ZZZZ9999", "TEST_rl", xff=spoof).status_code)
        print("statuses", statuses)
        assert 429 in statuses, statuses
