# Iteration 73 — full regression of new fixes: register profile fields, doc-upload (formular codes rejected,
# email field, single-use race), contract submit E2E + PDF, summary sanitizer, offers list, public endpoints
import base64
import concurrent.futures as cf
import os
import uuid

import pytest
import requests
from pymongo import MongoClient
from bson import ObjectId

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN = {"email": "petrowski616@outlook.com", "password": "HHHKKK222"}
CUST = {"email": "tester@mester.de", "password": "HHHKKK222"}
PDF_BYTES = b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n" + b"0" * 400 + b"\n%%EOF"
PDF_B64 = base64.b64encode(PDF_BYTES).decode()
RUN = uuid.uuid4().hex[:6]
S = {"subs": [], "doc_subs": [], "doc_codes": [], "f_codes": [], "users": []}


def _mongo():
    env = {}
    for line in open("/app/backend/.env"):
        if "=" in line:
            k, v = line.strip().split("=", 1)
            env[k] = v.strip('"')
    return MongoClient(env["MONGO_URL"])[env["DB_NAME"]]


def _hdr(sid=None):
    h = {"X-Forwarded-For": f"198.51.100.{uuid.uuid4().int % 250}"}
    if sid:
        h["X-Formular-Session"] = sid
    return h


@pytest.fixture(scope="module")
def admin():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    if r.status_code != 200:
        pytest.skip(f"admin login failed {r.status_code}")
    return s


def _new_doc_code(admin):
    r = admin.post(f"{BASE_URL}/api/admin/document-uploads/codes", json={"admin_label": f"TEST_audit73_{RUN}"})
    assert r.status_code == 201, r.text
    S["doc_codes"].append(r.json()["id"])
    return r.json()["code"]


def _new_f_code(admin):
    r = admin.post(f"{BASE_URL}/api/admin/formular-access/codes", json={"admin_label": f"TEST_audit73_{RUN}"})
    assert r.status_code == 201, r.text
    S["f_codes"].append(r.json()["id"])
    return r.json()["code"]


def _upload(code, email=None, name="TEST Audit73"):
    data = {"code": code, "used_by_name": name, "message": "it73"}
    if email is not None:
        data["email"] = email
    return requests.post(f"{BASE_URL}/api/document-uploads/submit", headers=_hdr(), data=data,
                         files=[("files", ("a.pdf", PDF_BYTES, "application/pdf"))], timeout=60)


# ── Auth / register ────────────────────────────────────────────────
class TestA_Auth:
    def test_admin_and_customer_login_cookies(self):
        for c in (ADMIN, CUST):
            r = requests.post(f"{BASE_URL}/api/auth/login", json=c)
            assert r.status_code == 200, r.text
            sc = r.headers.get("set-cookie", "")
            assert "httponly" in sc.lower()

    def test_bcrypt_hash(self):
        u = _mongo().users.find_one({"email": CUST["email"]})
        assert u["password_hash"].startswith("$2b$")

    def test_register_saves_profile_fields(self, admin):
        email = f"audit+reg73{RUN}@example.com"
        r = requests.post(f"{BASE_URL}/api/auth/register", headers=_hdr(), json={
            "email": email, "password": "Audit!Pass2026x", "name": "Audit Tester",
            "first_name": "  Audit ", "last_name": "Tester", "country": "Deutschland", "phone": "+49 30 123"})
        assert r.status_code == 200, r.text
        uid = r.json()["id"]
        S["users"].append(uid)
        g = admin.get(f"{BASE_URL}/api/admin/users/{uid}")
        assert g.status_code == 200
        d = g.json()
        assert d["first_name"] == "Audit" and d["last_name"] == "Tester"
        assert d["country"] == "Deutschland" and d["phone"] == "+49 30 123"

    def test_register_duplicate_409(self):
        email = f"audit+reg73{RUN}@example.com"
        r = requests.post(f"{BASE_URL}/api/auth/register", headers=_hdr(),
                          json={"email": email, "password": "Audit!Pass2026x"})
        assert r.status_code == 409

    def test_register_too_long_field_422(self):
        r = requests.post(f"{BASE_URL}/api/auth/register", headers=_hdr(), json={
            "email": f"audit+long{RUN}@example.com", "password": "Audit!Pass2026x", "phone": "1" * 41})
        assert r.status_code == 422


# ── Document upload ────────────────────────────────────────────────
class TestB_DocUpload:
    def test_formular_code_rejected(self, admin):
        fcode = _new_f_code(admin)
        v = requests.post(f"{BASE_URL}/api/formular-access/verify-document", headers=_hdr(), json={"code": fcode})
        assert v.status_code == 401
        up = _upload(fcode)
        assert up.status_code == 401, up.text

    def test_doc_code_with_email_stored(self, admin):
        code = _new_doc_code(admin)
        v = requests.post(f"{BASE_URL}/api/formular-access/verify-document", headers=_hdr(), json={"code": code})
        assert v.status_code == 200
        up = _upload(code, email=f"Audit+doc73{RUN}@Example.com")
        assert up.status_code == 200, up.text
        sid = up.json()["submission_id"]
        S["doc_subs"].append(sid)
        rec = _mongo().document_upload_submissions.find_one({"_id": ObjectId(sid)})
        assert rec["email"] == f"audit+doc73{RUN}@example.com"
        lst = admin.get(f"{BASE_URL}/api/admin/document-uploads/submissions").json()["items"]
        item = next(i for i in lst if i["id"] == sid)
        print("admin list item has email:", item.get("email"))
        dl = admin.get(f"{BASE_URL}/api/admin/document-uploads/files/{item['files'][0]['file_id']}/download")
        assert dl.content[:4] == b"%PDF"
        assert _upload(code).status_code == 401  # single use

    def test_invalid_email_rejected(self, admin):
        code = _new_doc_code(admin)
        up = _upload(code, email="not-an-email")
        if up.status_code == 200:
            S["doc_subs"].append(up.json()["submission_id"])
        assert up.status_code == 422, f"invalid email accepted: {up.status_code}"

    def test_single_use_race(self, admin):
        code = _new_doc_code(admin)
        with cf.ThreadPoolExecutor(4) as ex:
            res = list(ex.map(lambda _: _upload(code), range(4)))
        print("race statuses:", [r.status_code for r in res])
        ok = [r for r in res if r.status_code == 200]
        for r in ok:
            S["doc_subs"].append(r.json()["submission_id"])
        assert len(ok) == 1, f"single-use code accepted {len(ok)}x concurrently"


# ── Contract submission E2E ───────────────────────────────────────
class TestC_Contract:
    @pytest.mark.parametrize("slug", ["send-ing-contract-email", "send-knab-festgeld-email"])
    def test_submit_and_pdf(self, admin, slug):
        code = _new_f_code(admin)
        v = requests.post(f"{BASE_URL}/api/formular-access/verify", headers=_hdr(),
                          json={"code": code, "used_by_name": "Audit Tester"})
        assert v.status_code == 200, v.text
        sid = v.json()["session_id"]
        p = {"customerEmail": f"audit+c73{RUN}@example.com", "customerName": f"TEST Audit Dreiundsiebzig",
             "pdfBase64": PDF_B64,
             "formSummary": {"iban": "DE89370400440532013000", "amount": "10000"},
             "formSummaryHtml": "<table><tr><td onclick='x'>A</td></tr></table><script>alert(1)</script>"}
        r = requests.post(f"{BASE_URL}/api/{slug}", headers=_hdr(sid), json=p, timeout=90)
        assert r.status_code == 200, r.text
        j = r.json()
        assert set(j.keys()) <= {"success", "submissionId", "savedToDashboard", "adminEmailSent", "customerEmailSent"}
        S["subs"].append(j["submissionId"])
        rows = admin.get(f"{BASE_URL}/api/admin/contract-form-submissions").json()
        rows = rows.get("items", rows) if isinstance(rows, dict) else rows
        row = next(x for x in rows if str(x.get("id") or x.get("_id")) == j["submissionId"])
        pdf = next(f for f in row["files"] if f.get("file_id"))
        dl = admin.get(f"{BASE_URL}/api/admin/document-uploads/files/{pdf['file_id']}/download")
        assert dl.status_code == 200 and dl.content[:4] == b"%PDF"


# ── Offers / public ───────────────────────────────────────────────
class TestD_Public:
    def test_offers_list_count(self, admin):
        d = admin.get(f"{BASE_URL}/api/admin/offers/list?limit=500").json()
        n = len(d["items"])
        print("offers:", n, "total:", d.get("total"))
        assert n >= 250

    @pytest.mark.parametrize("path", ["/", "/sparangebote", "/news", "/festgeld", "/tagesgeld", "/dokument-upload",
                                      "/formular", "/register", "/login", "/passwort-vergessen"])
    def test_public_pages_200(self, path):
        assert requests.get(f"{BASE_URL}{path}").status_code == 200


# ── Auth hardening: lockout, CORS, password reset ─────────────────
class TestE_AuthHardening:
    def test_lockout_after_5_fails(self):
        email = f"audit+lock{RUN}@example.com"
        codes = [requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "wrongpass1"}).status_code
                 for _ in range(6)]
        print("lockout codes:", codes)
        assert codes[:5] == [401] * 5 and codes[5] == 429
        _mongo().login_attempts.delete_many({"identifier": {"$regex": f"lock{RUN}"}})

    def test_cors_credentials(self):
        r = requests.options(f"{BASE_URL}/api/auth/login", headers={
            "Origin": BASE_URL, "Access-Control-Request-Method": "POST"})
        assert r.headers.get("access-control-allow-credentials") == "true"
        assert r.headers.get("access-control-allow-origin") in (BASE_URL, )
        evil = requests.options(f"{BASE_URL}/api/auth/login", headers={
            "Origin": "https://evil.example", "Access-Control-Request-Method": "POST"})
        print("evil origin ACAO:", evil.headers.get("access-control-allow-origin"))
        assert evil.headers.get("access-control-allow-origin") != "https://evil.example"

    def test_forgot_password_generic(self):
        r = requests.post(f"{BASE_URL}/api/auth/forgot-password", headers=_hdr(), json={"email": f"audit+fp{RUN}@example.com"})
        print("forgot:", r.status_code, r.text[:120])
        assert r.status_code == 200

    def test_reset_invalid_token(self):
        r = requests.post(f"{BASE_URL}/api/auth/reset-password", headers=_hdr(),
                          json={"token": "invalid-token-xyz", "password": "Audit!Pass2026x", "new_password": "Audit!Pass2026x"})
        print("reset invalid:", r.status_code, r.text[:120])
        assert r.status_code in (400, 401, 404)


# ── Cleanup ───────────────────────────────────────────────────────
class TestZ_Cleanup:
    def test_cleanup(self, admin):
        for sid in S["doc_subs"]:
            admin.delete(f"{BASE_URL}/api/admin/document-uploads/submissions/{sid}")
        for cid in S["doc_codes"]:
            admin.delete(f"{BASE_URL}/api/admin/document-uploads/codes/{cid}")
        for cid in S["f_codes"]:
            admin.post(f"{BASE_URL}/api/admin/formular-access/codes/{cid}/revoke")
            admin.delete(f"{BASE_URL}/api/admin/formular-access/codes/{cid}")
        for uid in S["users"]:
            admin.delete(f"{BASE_URL}/api/admin/users/{uid}")
        db = _mongo()
        for sid in S["subs"]:
            db.contract_form_submissions.delete_one({"_id": ObjectId(sid)})
            db.storage_files.update_many({"subject_id": sid}, {"$set": {"is_deleted": True}})
        db.users.delete_many({"email": {"$regex": f"^audit\\+.*{RUN}@example.com$"}})
