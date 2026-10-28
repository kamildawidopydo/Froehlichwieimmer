# Iteration 93: P1 admin security (weak default disabled, change-password rule, lockout), P2 contact-message, P4 prev_close
import os
import uuid
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
QA_EMAIL = "qa.admin@kapital-direkt24.de"
QA_PW = "Qa-uRg8UPkscCCnq3Vggxjoj6EW"


def _db():
    env = {}
    for line in open("/app/backend/.env"):
        if "=" in line:
            k, v = line.strip().split("=", 1)
            env[k] = v.strip('"')
    return MongoClient(env["MONGO_URL"])[env["DB_NAME"]]


@pytest.fixture(scope="module")
def qa_admin():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": QA_EMAIL, "password": QA_PW})
    if r.status_code != 200:
        pytest.skip(f"QA admin login failed {r.status_code} {r.text}")
    return s


# P1 – default admin password disabled
class TestAdminSecurity:
    def test_default_admin_rejected(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@kapitalmitte.com", "password": "admin123"})
        assert r.status_code == 401
        _db().login_attempts.delete_many({"identifier": "email:admin@kapitalmitte.com"})

    def test_patron_default_rejected(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "patron@froehlich-vermoegensberatung.de", "password": "500Euro!"})
        assert r.status_code == 401
        _db().login_attempts.delete_many({"identifier": "email:patron@froehlich-vermoegensberatung.de"})

    def test_qa_admin_login_and_me(self, qa_admin):
        r = qa_admin.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == QA_EMAIL
        assert r.json()["role"] == "admin"

    def test_qa_admin_cookies_httponly(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": QA_EMAIL, "password": QA_PW})
        sc = r.headers.get("set-cookie", "")
        assert "httponly" in sc.lower()

    def test_admin_endpoint_works(self, qa_admin):
        r = qa_admin.get(f"{BASE_URL}/api/reviews/admin")
        assert r.status_code == 200

    @pytest.mark.parametrize("pw", ["admin1234", "Short1!x", "changeme"])
    def test_change_password_weak_rejected(self, qa_admin, pw):
        r = qa_admin.post(f"{BASE_URL}/api/auth/change-password", json={"current_password": QA_PW, "new_password": pw})
        assert r.status_code in (400, 422), r.text
        if r.status_code == 400:
            assert "12 Zeichen" in r.json()["detail"]

    def test_qa_admin_still_logs_in(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": QA_EMAIL, "password": QA_PW})
        assert r.status_code == 200

    def test_bcrypt_hash(self):
        u = _db().users.find_one({"email": QA_EMAIL})
        assert u["password_hash"].startswith("$2")

    def test_lockout_after_5(self):
        email = f"test_lock_{uuid.uuid4().hex[:8]}@example.com"
        codes = []
        for _ in range(6):
            codes.append(requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "wrongwrong"}).status_code)
        _db().login_attempts.delete_many({"identifier": f"email:{email}"})
        assert codes[:5] == [401] * 5, codes
        assert codes[5] == 429, codes


# P2 – contact-message validation (no real mail here)
class TestContactValidation:
    def test_invalid_email_422(self):
        r = requests.post(f"{BASE_URL}/api/contact-message", json={"name": "TEST_Kontakt", "email": "not-an-email", "subject": "TEST", "message": "Testnachricht bitte ignorieren"})
        assert r.status_code == 422

    def test_missing_fields_422(self):
        r = requests.post(f"{BASE_URL}/api/contact-message", json={"name": "TEST_Kontakt"})
        assert r.status_code == 422


# P4 – Vortag (prev_close) in 1d history
class TestPrevClose:
    @pytest.mark.parametrize("sym", ["DBK", "AAPL"])
    def test_prev_close_5d(self, sym):
        r = requests.get(f"{BASE_URL}/api/stocks/{sym}/history?range=5d", timeout=60)
        assert r.status_code == 200
        d = r.json()
        day = d.get("stats") or {}
        print(sym, day)
        assert day.get("prev_close") is not None
