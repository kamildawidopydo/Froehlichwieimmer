# Iteration 65: doc-upload code collection fix, submit rate limit (429), forgot-password background email
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN = {"email": "patron@froehlich-vermoegensberatung.de", "password": "500Euro!"}
RAND = os.environ.get("ITER65_RAND") or uuid.uuid4().hex[:6]
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
        data={"code": code, "used_by_name": name, "message": "TEST_ iter65"},
        files=[("files", ("test.pdf", PDF, "application/pdf"))],
        headers=h, timeout=60,
    )


def _cleanup_subs(admin, name_prefix="TEST_"):
    subs = admin.get(f"{BASE_URL}/api/admin/document-uploads/submissions").json()["items"]
    for s in subs:
        if (s.get("used_by_name") or "").startswith(name_prefix):
            admin.delete(f"{BASE_URL}/api/admin/document-uploads/submissions/{s['id']}")


# Document-upload admin code -> public flow (critical fix)
class TestDocUploadCodeFlow:
    def test_admin_doc_code_full_flow(self, admin):
        r = admin.post(f"{BASE_URL}/api/admin/document-uploads/codes", json={"admin_label": f"TEST_iter65_{RAND}"})
        assert r.status_code == 201, r.text
        code, cid = r.json()["code"], r.json()["id"]
        name = f"TEST_Kunde65 {RAND}"
        try:
            v = requests.post(f"{BASE_URL}/api/formular-access/verify-document", json={"code": code})
            assert v.status_code == 200 and v.json().get("valid") is True, v.text
            s = _submit(code, name)
            assert s.status_code == 200, s.text
            sub_id = s.json()["submission_id"]
            assert s.json()["files_count"] == 1
            subs = admin.get(f"{BASE_URL}/api/admin/document-uploads/submissions").json()["items"]
            mine = [x for x in subs if x["id"] == sub_id]
            assert mine and mine[0]["used_by_name"] == name and len(mine[0]["files"]) == 1
            # file download works
            fid = mine[0]["files"][0]["file_id"]
            d = admin.get(f"{BASE_URL}/api/admin/document-uploads/files/{fid}/download")
            assert d.status_code == 200 and d.content.startswith(b"%PDF")
            # reuse rejected
            v2 = requests.post(f"{BASE_URL}/api/formular-access/verify-document", json={"code": code})
            assert v2.status_code == 401, v2.text
            s2 = _submit(code, name)
            assert s2.status_code == 401, s2.text
            codes = admin.get(f"{BASE_URL}/api/admin/document-uploads/codes").json()["items"]
            c = [x for x in codes if x["id"] == cid][0]
            assert c["status"] == "used" and c["used_by_name"] == name and c["used_at"]
        finally:
            admin.delete(f"{BASE_URL}/api/admin/document-uploads/codes/{cid}")

    def test_formular_access_code_still_works(self, admin):
        r = admin.post(f"{BASE_URL}/api/admin/formular-access/codes", json={"admin_label": f"TEST_iter65f_{RAND}"})
        assert r.status_code == 201, r.text
        j = r.json()
        code = j.get("code") or j.get("plain_code") or j.get("code_plain")
        cid = j["id"]
        assert code, j
        try:
            v = requests.post(f"{BASE_URL}/api/formular-access/verify-document", json={"code": code})
            assert v.status_code == 200, v.text
            s = _submit(code, f"TEST_Kunde65f {RAND}")
            assert s.status_code == 200, s.text
            # multi-use formular code: still active after upload
            v2 = requests.post(f"{BASE_URL}/api/formular-access/verify-document", json={"code": code})
            assert v2.status_code == 200, v2.text
        finally:
            admin.delete(f"{BASE_URL}/api/admin/formular-access/codes/{cid}")
            _cleanup_subs(admin)


# Forgot password: fast + no token
class TestForgotPasswordFast:
    @pytest.mark.parametrize("kind", ["unknown", "existing"])
    def test_fast_and_no_token(self, kind):
        email = f"test_fp65_{kind}_{RAND}@example.com"
        if kind == "existing":
            rr = requests.post(f"{BASE_URL}/api/auth/register",
                               json={"email": email, "password": "TestPass123!", "name": "TEST FP65"},
                               headers={"Origin": BASE_URL})
            assert rr.status_code in (200, 201), rr.text
        t = time.time()
        r = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": email})
        dt = time.time() - t
        assert r.status_code == 200, r.text
        assert r.json() == {"status": "ok"}
        print(kind, f"{dt:.2f}s")
        assert dt < 2.0, f"slow: {dt:.2f}s"


# Rate limit on submit (run last; uses its own XFF bucket)
class TestSubmitRateLimit:
    def test_429_after_5(self):
        ip = f"203.0.113.{int(RAND, 16) % 250 + 1}"
        codes = [_submit("ZZZZ9999", "TEST_rl", xff=ip).status_code for _ in range(7)]
        print("statuses", codes)
        assert codes[:5] == [401] * 5, codes
        assert 429 in codes[5:], codes
