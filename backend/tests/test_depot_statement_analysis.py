# Depotauszug-Analyse: auth guards, validation, real LLM analysis (text) - max 1 LLM call here
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
EP = f"{BASE_URL}/api/admin/depot-statement-analysis"
ADMIN = {"email": "patron@froehlich-vermoegensberatung.de", "password": "500Euro!"}

with open("/tmp/depot.txt", encoding="utf-8") as fh:
    SAMPLE = fh.read()


@pytest.fixture(scope="module")
def admin():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    if r.status_code != 200:
        pytest.skip(f"admin login failed {r.status_code}")
    return s


@pytest.fixture(scope="module")
def normal_user():
    s = requests.Session()
    email = f"test_depot_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{BASE_URL}/api/auth/register", json={"email": email, "password": "TestPass123!x", "name": "TEST_depot"})
    if r.status_code not in (200, 201):
        pytest.skip(f"register failed {r.status_code} {r.text[:200]}")
    s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "TestPass123!x"})
    yield s
    # cleanup directly in mongo
    from pymongo import MongoClient
    from dotenv import dotenv_values
    env = dotenv_values("/app/backend/.env")
    MongoClient(env["MONGO_URL"])[env["DB_NAME"]].users.delete_one({"email": email})


class TestAuthGuards:
    def test_unauthenticated_401(self):
        r = requests.post(EP, json={"text": SAMPLE})
        assert r.status_code == 401

    def test_non_admin_403(self, normal_user):
        r = normal_user.post(EP, json={"text": SAMPLE})
        assert r.status_code == 403


class TestValidation:
    def test_short_text_422(self, admin):
        r = admin.post(EP, json={"text": "zu kurz"})
        assert r.status_code == 422
        assert "Depotauszug" in r.json()["detail"]

    def test_empty_body_422(self, admin):
        r = admin.post(EP, json={})
        assert r.status_code == 422

    def test_file_without_media_type_422(self, admin):
        r = admin.post(EP, json={"file_base64": "aGVsbG8="})
        assert r.status_code == 422

    def test_invalid_base64_422(self, admin):
        r = admin.post(EP, json={"file_base64": "!!!notb64", "media_type": "application/pdf"})
        assert r.status_code == 422

    def test_invalid_media_type_422(self, admin):
        r = admin.post(EP, json={"file_base64": "aGVsbG8=", "media_type": "text/html"})
        assert r.status_code == 422


class TestAnalysisText:
    def test_text_analysis(self, admin):
        r = admin.post(EP, json={"text": SAMPLE}, timeout=120)
        assert r.status_code == 200, r.text[:300]
        a = r.json()["analysis"]
        for k in ["depot_holder", "statement_date", "currency", "total_value", "summary", "positions", "allocation", "observations", "data_quality_notes"]:
            assert k in a
        assert "Mustermann" in (a["depot_holder"] or "")
        assert abs((a["total_value"] or 0) - 27000) < 1
        assert len(a["positions"]) >= 3
        isins = {p.get("isin") for p in a["positions"]}
        assert "IE00B4L5Y983" in isins
        assert len(a["allocation"]) >= 2
        assert 90 <= sum(x["percent"] for x in a["allocation"]) <= 110
        print(a)
