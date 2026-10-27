# Iteration 76: public application document upload (/api/applications/documents) + admin download + application submit with documents
import os
import pytest
import requests
from pymongo import MongoClient

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split()[0]).rstrip("/")
PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"
PNG = bytes.fromhex("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4b30000000049454e44ae426082")


@pytest.fixture(scope="module")
def admin():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@kapitalmitte.com", "password": "admin123"})
    if r.status_code != 200:
        pytest.skip(f"admin login failed {r.status_code}")
    return s


@pytest.fixture(scope="module")
def uploaded():
    r = requests.post(f"{BASE_URL}/api/applications/documents", data={"doc_type": "id_document"},
                      files={"file": ("TEST_ausweis.pdf", PDF, "application/pdf")})
    assert r.status_code == 200, r.text
    return r.json()


# Upload: PDF OK
def test_upload_pdf(uploaded):
    assert isinstance(uploaded["file_id"], str) and len(uploaded["file_id"]) == 32
    assert uploaded["name"] == "TEST_ausweis.pdf"
    assert uploaded["url"] == f"/api/admin/document-uploads/files/{uploaded['file_id']}/download"


# Upload: text/plain -> 415 german message
def test_upload_invalid_type():
    r = requests.post(f"{BASE_URL}/api/applications/documents", data={"doc_type": "address_proof"},
                      files={"file": ("x.txt", b"hello", "text/plain")})
    assert r.status_code == 415
    assert "Ungültiger Dateityp" in r.json()["detail"]


# Download: anon 401, admin 200 bytes match
def test_download_auth(uploaded, admin):
    url = f"{BASE_URL}{uploaded['url']}"
    assert requests.get(url).status_code in (401, 403)
    r = admin.get(url)
    assert r.status_code == 200
    assert r.content == PDF
    assert r.headers["content-type"].startswith("application/pdf")


# Submit application with documents dict list -> 201 then GET in admin list
def test_submit_application_with_documents(uploaded, admin):
    payload = {
        "personal_data": {"first_name": "TEST_Upload", "last_name": "Pytest", "birth_date": "1985-05-05",
                          "email": "delivered@resend.dev", "nationality": "Deutsch", "phone": "+491701234567",
                          "address": "Teststr. 1, 10115 Berlin"},
        "investment_data": {"bank_name": "TEST Bank", "investment_amount": 5000, "term_months": 12, "tax_id": "12345678995"},
        "documents": [{"type": "id_document", "file_id": uploaded["file_id"], "url": uploaded["url"], "name": uploaded["name"]}],
        "terms_accepted": True, "privacy_accepted": True,
    }
    r = requests.post(f"{BASE_URL}/api/applications", json=payload, timeout=60)
    assert r.status_code in (200, 201), r.text
    app_id = r.json()["id"]
    env = dict(l.strip().split("=", 1) for l in open("/app/backend/.env") if "=" in l)
    db = MongoClient(env["MONGO_URL"].strip('"'))[env["DB_NAME"].strip('"')]
    from bson import ObjectId
    q = {"_id": ObjectId(app_id)} if ObjectId.is_valid(app_id) else {"id": app_id}
    doc = db.applications.find_one(q) or db.applications.find_one({"id": app_id})
    assert doc is not None
    assert doc["documents"][0]["file_id"] == uploaded["file_id"]
