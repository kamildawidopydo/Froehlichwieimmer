# Iteration 67: right-most XFF rate limits (forgot-password, verify-document lockout), doc-upload admin email flag, login
import os
import uuid
import random
import pytest
import requests
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN = {"email": "patron@froehlich-vermoegensberatung.de", "password": "500Euro!"}
RAND = uuid.uuid4().hex[:6]
PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"
DB = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]


def _spoof():
    return f"198.51.100.{random.randint(1, 254)}"


@pytest.fixture(scope="module")
def admin():
    s = requests.Session()
    s.headers.update({"Origin": BASE_URL})
    r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    if r.status_code != 200:
        pytest.skip(f"admin login failed {r.status_code}")
    return s


# Login regression + cookie
class TestLogin:
    def test_login_ok(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN, headers={"Origin": BASE_URL})
        assert r.status_code == 200, r.text
        assert "set-cookie" in {k.lower() for k in r.headers}
        assert "httponly" in r.headers.get("set-cookie", "").lower()

    def test_cors_credentials(self):
        r = requests.options(f"{BASE_URL}/api/auth/me", headers={
            "Origin": BASE_URL, "Access-Control-Request-Method": "GET"})
        assert r.headers.get("access-control-allow-origin") == BASE_URL
        assert r.headers.get("access-control-allow-credentials") == "true"


# forgot-password 3/min must 429 despite spoofed first XFF entry
class TestForgotPasswordSpoof:
    def test_spoof_does_not_bypass(self):
        statuses = []
        for i in range(6):
            r = requests.post(f"{BASE_URL}/api/auth/forgot-password",
                              json={"email": f"test_fp67_{RAND}_{i}@example.com"},
                              headers={"X-Forwarded-For": _spoof()})
            statuses.append(r.status_code)
        print("forgot statuses", statuses)
        assert 429 in statuses, statuses
        assert statuses.index(429) <= 3


# verify-document fail lockout keyed per client IP (not ingress IP)
class TestVerifyDocumentLockout:
    def test_lockout_per_ip(self):
        statuses = []
        for _ in range(12):
            r = requests.post(f"{BASE_URL}/api/formular-access/verify-document",
                              json={"code": f"TESTX{random.randint(1000,9999)}"},
                              headers={"X-Forwarded-For": _spoof()})
            statuses.append(r.status_code)
        print("verify statuses", statuses)
        ips = DB.formular_access_fail_log.distinct("ip")
        print("fail-log ips", ips)
        assert 429 in statuses, statuses
        # IPs in fail log should not be spoofed values nor private ingress IPs
        assert not any(ip.startswith("198.51.100.") for ip in ips), ips
        # cleanup my lockout
        recent = DB.formular_access_fail_log.find_one(sort=[("created_at", -1)])
        my_ip = recent["ip"]
        print("my ip recorded as", my_ip)
        DB.formular_access_fail_log.delete_many({"ip": my_ip})
        r = requests.post(f"{BASE_URL}/api/formular-access/verify-document", json={"code": "TESTY0000"})
        assert r.status_code == 401
        DB.formular_access_fail_log.delete_many({"ip": my_ip})


# Doc upload real submit -> admin_email_sent only with real id
class TestDocUploadEmail:
    def test_upload(self, admin):
        r = admin.post(f"{BASE_URL}/api/admin/document-uploads/codes", json={"admin_label": f"TEST_iter67_{RAND}"})
        assert r.status_code == 201, r.text
        code, cid = r.json()["code"], r.json()["id"]
        sub_id = None
        try:
            s = requests.post(f"{BASE_URL}/api/document-uploads/submit",
                              data={"code": code, "used_by_name": f"TEST_Kunde67 {RAND}", "message": "TEST_ iter67"},
                              files=[("files", ("test.pdf", PDF, "application/pdf"))], timeout=60)
            assert s.status_code == 200, s.text
            sub_id = s.json()["submission_id"]
            subs = admin.get(f"{BASE_URL}/api/admin/document-uploads/submissions").json()["items"]
            mine = [x for x in subs if x["id"] == sub_id][0]
            print("admin_email_sent", mine["admin_email_sent"], "err", mine["admin_email_error"])
            assert mine["admin_email_sent"] is True and not mine["admin_email_error"], mine
        finally:
            if sub_id:
                admin.delete(f"{BASE_URL}/api/admin/document-uploads/submissions/{sub_id}")
            admin.delete(f"{BASE_URL}/api/admin/document-uploads/codes/{cid}")
