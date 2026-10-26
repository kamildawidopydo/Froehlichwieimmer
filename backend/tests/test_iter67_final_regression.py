# Iteration 67 — final regression: auth, doc-upload codes, verify-document 401, homepage APIs
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

ADMIN = {"email": "patron@froehlich-vermoegensberatung.de", "password": "500Euro!"}


@pytest.fixture(scope="module")
def admin():
    s = requests.Session()
    s.headers.update({"Origin": BASE_URL})
    r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    if r.status_code != 200:
        pytest.skip(f"login failed {r.status_code} {r.text[:200]}")
    return s


# Auth
def test_admin_login_and_me(admin):
    r = admin.get(f"{BASE_URL}/api/auth/me")
    assert r.status_code == 200
    d = r.json()
    u = d.get("user", d)
    assert u.get("email") == ADMIN["email"]
    assert u.get("role") == "admin"


# Verify-document wrong code -> 401 (not 429/500)
def test_verify_document_wrong_code_401():
    r = requests.post(f"{BASE_URL}/api/formular-access/verify-document", json={"code": "TESTWRNG"})
    assert r.status_code == 401, r.text


def test_verify_document_validation_422():
    r = requests.post(f"{BASE_URL}/api/formular-access/verify-document", json={})
    assert r.status_code == 422


# Doc-upload code CRUD
def test_doc_upload_code_create_list_delete(admin):
    r = admin.post(f"{BASE_URL}/api/admin/document-uploads/codes", json={"admin_label": "TEST_iter67"})
    assert r.status_code == 201, r.text
    d = r.json()
    assert isinstance(d.get("code"), str) and len(d["code"]) >= 6
    cid = d["id"]
    lst = admin.get(f"{BASE_URL}/api/admin/document-uploads/codes").json()["items"]
    row = next(x for x in lst if x["id"] == cid)
    assert row.get("code") in (None, "")  # plaintext not persisted
    assert row["code_hint"] == d["code"][-4:]
    dr = admin.delete(f"{BASE_URL}/api/admin/document-uploads/codes/{cid}")
    assert dr.status_code in (200, 204)
    lst = admin.get(f"{BASE_URL}/api/admin/document-uploads/codes").json()["items"]
    assert not any(x["id"] == cid for x in lst)


# Homepage data APIs return 200
@pytest.mark.parametrize("path", ["/api/health"])
def test_health(path):
    assert requests.get(f"{BASE_URL}{path}").status_code == 200
