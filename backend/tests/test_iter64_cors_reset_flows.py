# Iteration 64: forgot-password token leak fix, registration, newsletter, document-upload codes, admin APIs
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ORIGIN = BASE_URL
ADMIN = {"email": "patron@froehlich-vermoegensberatung.de", "password": "500Euro!"}
RAND = uuid.uuid4().hex[:8]
TEST_EMAIL = f"test_reset_{RAND}@example.com"
NL_EMAIL = f"test_nl_{RAND}@example.com"


@pytest.fixture(scope="module")
def admin():
    s = requests.Session()
    s.headers.update({"Origin": ORIGIN})
    r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    if r.status_code != 200:
        pytest.skip(f"admin login failed {r.status_code} {r.text[:200]}")
    return s


# Forgot password (no token leak)
class TestForgotPassword:
    def test_unknown_email(self):
        r = requests.post(f"{BASE_URL}/api/auth/forgot-password",
                          json={"email": f"nobody_{RAND}@example.com"}, headers={"Origin": ORIGIN})
        assert r.status_code == 200, r.text
        assert r.json() == {"status": "ok"}

    def test_existing_user_no_token(self):
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/auth/register",
                   json={"email": TEST_EMAIL, "password": "TestPass123!", "name": "TEST Reset"},
                   headers={"Origin": ORIGIN})
        assert r.status_code in (200, 201), r.text
        body = r.json()
        assert "password_hash" not in str(body)
        me = s.get(f"{BASE_URL}/api/auth/me")
        assert me.status_code == 200
        assert me.json().get("email") == TEST_EMAIL
        r = requests.post(f"{BASE_URL}/api/auth/forgot-password",
                          json={"email": TEST_EMAIL}, headers={"Origin": ORIGIN})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data == {"status": "ok"}
        assert "token" not in r.text.lower()

    def test_reset_invalid_token(self):
        r = requests.post(f"{BASE_URL}/api/auth/reset-password",
                          json={"token": "invalid-token-xyz-123456", "password": "NewPass123!"})
        assert r.status_code in (400, 422), r.text


# Newsletter
class TestNewsletter:
    def test_subscribe_and_duplicate(self):
        r = requests.post(f"{BASE_URL}/api/newsletter/subscribe",
                          json={"email": NL_EMAIL, "source": "TEST", "consent": True})
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "subscribed"
        r2 = requests.post(f"{BASE_URL}/api/newsletter/subscribe",
                           json={"email": NL_EMAIL, "source": "TEST", "consent": True})
        assert r2.status_code == 200
        assert r2.json()["status"] == "already_subscribed"

    def test_invalid_email(self):
        r = requests.post(f"{BASE_URL}/api/newsletter/subscribe", json={"email": "bad", "consent": True})
        assert r.status_code in (400, 422)


# Document upload access codes
class TestDocumentUpload:
    def test_invalid_code(self):
        r = requests.post(f"{BASE_URL}/api/formular-access/verify-document", json={"code": "ZZZZ9999"})
        assert r.status_code == 401, r.text

    def test_document_uploads_admin_code_works_on_public_page(self, admin):
        r = admin.post(f"{BASE_URL}/api/admin/document-uploads/codes", json={"admin_label": "TEST_iter64"})
        assert r.status_code == 201, r.text
        code, cid = r.json()["code"], r.json()["id"]
        try:
            v = requests.post(f"{BASE_URL}/api/formular-access/verify-document", json={"code": code})
            assert v.status_code == 200, f"Code from /admin/document-uploads rejected by verify-document: {v.status_code} {v.text}"
        finally:
            admin.post(f"{BASE_URL}/api/admin/document-uploads/codes/{cid}/revoke")
            admin.delete(f"{BASE_URL}/api/admin/document-uploads/codes/{cid}")


# Admin pages APIs used by changed files
class TestAdminApis:
    @pytest.mark.parametrize("path", [
        "/api/admin/users",
        "/api/admin/document-uploads/codes",
        "/api/admin/formular-access/codes",
    ])
    def test_admin_get(self, admin, path):
        r = admin.get(f"{BASE_URL}{path}")
        assert r.status_code == 200, f"{path}: {r.status_code} {r.text[:200]}"


def teardown_module(module):
    from pymongo import MongoClient
    from dotenv import dotenv_values
    env = dotenv_values("/app/backend/.env")
    c = MongoClient(env["MONGO_URL"])
    db = c[env["DB_NAME"]]
    u = db.users.find_one({"email": TEST_EMAIL})
    if u:
        db.password_reset_tokens.delete_many({"user_id": u["_id"]})
        db.users.delete_one({"_id": u["_id"]})
    db.newsletter_subscribers.delete_many({"email": NL_EMAIL})
