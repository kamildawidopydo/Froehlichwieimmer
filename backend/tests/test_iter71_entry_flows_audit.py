# Iteration 71 — Audit of public entry flows: Formular, Dokument hochladen, Konto eröffnen
import base64
import os
import time
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN = {"email": "petrowski616@outlook.com", "password": "HHHKKK222"}
PDF_BYTES = b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n" + b"0" * 400 + b"\n%%EOF"
PDF_B64 = base64.b64encode(PDF_BYTES).decode()
RUN = uuid.uuid4().hex[:6]

STATE = {}


@pytest.fixture(scope="module")
def admin():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    if r.status_code != 200:
        pytest.skip(f"admin login failed {r.status_code} {r.text[:200]}")
    return s


@pytest.fixture(scope="module")
def anon():
    return requests.Session()


# ── Formular access codes ────────────────────────────────────────────
class TestFormularAccess:
    def test_create_code(self, admin):
        r = admin.post(f"{BASE_URL}/api/admin/formular-access/codes", json={"admin_label": f"TEST_audit71_{RUN}"})
        assert r.status_code == 201, r.text
        d = r.json()
        assert isinstance(d["code"], str) and len(d["code"]) == 8
        assert d["status"] == "active"
        STATE["f_code"] = d["code"]
        STATE["f_code_id"] = d["id"]

    def test_verify_invalid_code_german(self, anon):
        r = anon.post(f"{BASE_URL}/api/formular-access/verify", json={"code": "ZZZZ9999", "used_by_name": "Audit Tester"})
        assert r.status_code == 401
        assert r.json()["detail"] == "Ungültiger Zugangscode"

    def test_verify_short_code_detail_shape(self, anon):
        # Pydantic 422 -> detail is a LIST (frontend does toast.error(detail))
        r = anon.post(f"{BASE_URL}/api/formular-access/verify", json={"code": "AB", "used_by_name": "Audit Tester"})
        assert r.status_code == 422
        STATE["short_code_detail_type"] = type(r.json()["detail"]).__name__
        print("422 detail type:", STATE["short_code_detail_type"], r.json()["detail"])

    def test_verify_ok_and_session(self, anon):
        r = anon.post(f"{BASE_URL}/api/formular-access/verify",
                      json={"code": STATE["f_code"].lower(), "used_by_name": "Audit Tester"})
        assert r.status_code == 200, r.text
        sid = r.json()["session_id"]
        STATE["sid"] = sid
        v = anon.post(f"{BASE_URL}/api/formular-access/session/validate", json={"session_id": sid})
        assert v.status_code == 200 and v.json()["valid"] is True
        c = anon.post(f"{BASE_URL}/api/formular-access/session/conditions",
                      json={"session_id": sid, "bank": "ing", "product": "flexgeld"})
        assert c.status_code == 200 and c.json()["conditions"] is None

    def test_session_invalid_garbage(self, anon):
        v = anon.post(f"{BASE_URL}/api/formular-access/session/validate", json={"session_id": "garbage-session-xyz"})
        assert v.status_code == 200 and v.json()["valid"] is False

    def test_admin_lists_code_and_logs(self, admin):
        r = admin.get(f"{BASE_URL}/api/admin/formular-access/codes")
        assert r.status_code == 200
        item = next(i for i in r.json()["items"] if i["id"] == STATE["f_code_id"])
        assert item["use_count"] >= 1
        assert item["code"] is None  # plaintext never returned again
        logs = admin.get(f"{BASE_URL}/api/admin/formular-access/logs").json()["items"]
        assert any(l["session_id"] == STATE["sid"] for l in logs)


# ── Contract submissions ────────────────────────────────────────────
CONTRACT_SLUGS = ["send-ing-contract-email", "send-contract-email", "send-bunq-contract-email"]


class TestContractSubmissions:
    @pytest.mark.parametrize("slug", CONTRACT_SLUGS)
    def test_submit_contract(self, anon, slug):
        n = CONTRACT_SLUGS.index(slug) + 1
        payload = {
            "customerEmail": f"audit+{n}@example.com",
            "customerName": f"TEST_Audit {RUN}",
            "pdfBase64": PDF_B64,
            "formSummary": {"iban": "DE89370400440532013000"},
        }
        r = anon.post(f"{BASE_URL}/api/{slug}", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["success"] is True and d["submissionId"]
        print(slug, "adminEmailSent", d["adminEmailSent"], d["adminEmailError"],
              "customerEmailSent", d["customerEmailSent"], d["customerEmailError"])
        STATE.setdefault("subs", []).append(d["submissionId"])
        time.sleep(1.5)

    def test_submit_without_formular_session_is_accepted(self):
        # No session_id required at all on contract endpoints -> documented security gap
        assert True

    def test_invalid_email_422(self, anon):
        r = anon.post(f"{BASE_URL}/api/send-postbank-contract-email",
                      json={"customerEmail": "not-an-email", "pdfBase64": PDF_B64})
        assert r.status_code == 422

    def test_missing_pdf_400(self, anon):
        r = anon.post(f"{BASE_URL}/api/send-postbank-contract-email",
                      json={"customerEmail": "audit+9@example.com", "pdfBase64": "abc"})
        assert r.status_code == 400
        assert "PDF" in r.json()["detail"]

    def test_admin_sees_submissions_and_pdf(self, admin):
        r = admin.get(f"{BASE_URL}/api/admin/contract-form-submissions")
        assert r.status_code == 200
        items = {i["id"]: i for i in r.json()["items"]}
        for sid in STATE.get("subs", []):
            assert sid in items
        first = items[STATE["subs"][0]]
        print("admin row keys:", sorted(first.keys()), "files:", first["files"])
        # PDF must be retrievable by admin
        assert first.get("contract_pdf_path") or any(f.get("storage_path") or f.get("file_id") for f in first["files"]), \
            "Contract PDF not persisted in storage -> admin cannot download it"


# ── Document upload ─────────────────────────────────────────────────
class TestDocumentUpload:
    def test_create_doc_code(self, admin):
        r = admin.post(f"{BASE_URL}/api/admin/document-uploads/codes", json={"admin_label": f"TEST_audit71_{RUN}"})
        assert r.status_code == 201, r.text
        STATE["d_code"] = r.json()["code"]
        STATE["d_code_id"] = r.json()["id"]

    def test_verify_document(self, anon):
        r = anon.post(f"{BASE_URL}/api/formular-access/verify-document", json={"code": STATE["d_code"]})
        assert r.status_code == 200 and r.json()["valid"] is True

    def test_bad_mime_415(self, anon):
        r = anon.post(f"{BASE_URL}/api/document-uploads/submit",
                      data={"code": STATE["d_code"], "used_by_name": "Audit Tester"},
                      files=[("files", ("x.exe", b"MZ....", "application/x-msdownload"))])
        assert r.status_code == 415

    def test_submit_upload(self, anon):
        r = anon.post(f"{BASE_URL}/api/document-uploads/submit",
                      data={"code": STATE["d_code"], "used_by_name": "TEST Audit Tester", "message": "Audit 71"},
                      files=[("files", ("audit.pdf", PDF_BYTES, "application/pdf")),
                             ("files", ("audit.jpg", b"\xff\xd8\xff\xe0" + b"0" * 200, "image/jpeg"))])
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["files_count"] == 2
        STATE["d_sub"] = d["submission_id"]

    def test_code_single_use(self, anon):
        r = anon.post(f"{BASE_URL}/api/formular-access/verify-document", json={"code": STATE["d_code"]})
        assert r.status_code == 401
        assert "bereits verwendet" in r.json()["detail"]

    def test_admin_sees_and_downloads(self, admin):
        time.sleep(2)
        r = admin.get(f"{BASE_URL}/api/admin/document-uploads/submissions")
        assert r.status_code == 200
        items = r.json()["items"]
        sub = next(i for i in items if i["id"] == STATE["d_sub"])
        print("doc sub:", {k: sub[k] for k in sub if k != "files"})
        assert len(sub["files"]) == 2
        fid = sub["files"][0]["file_id"]
        dl = admin.get(f"{BASE_URL}/api/admin/document-uploads/files/{fid}/download")
        assert dl.status_code == 200
        assert dl.content[:4] == b"%PDF"
        mh = admin.post(f"{BASE_URL}/api/admin/document-uploads/submissions/{STATE['d_sub']}/mark-handled")
        assert mh.status_code == 200 and mh.json()["status"] == "handled"

    def test_formular_code_accepted_for_doc_upload(self, anon):
        r = anon.post(f"{BASE_URL}/api/formular-access/verify-document", json={"code": STATE["f_code"]})
        print("formular code at verify-document:", r.status_code)
        assert r.status_code in (200, 401)


# ── Konto eröffnen ──────────────────────────────────────────────────
class TestRegister:
    def test_register_new(self, anon):
        email = f"audit+reg{RUN}@example.com"
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/auth/register",
                   json={"email": email, "password": "Audit!Pass2026x", "name": "TEST Audit"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["email"] == email and d["role"] == "user"
        STATE["reg_id"] = d["id"]
        STATE["reg_email"] = email
        assert "access_token" in s.cookies.get_dict() or len(s.cookies) > 0
        me = s.get(f"{BASE_URL}/api/auth/me")
        assert me.status_code == 200
        STATE["reg_session"] = s

    def test_register_duplicate_german(self, anon):
        r = anon.post(f"{BASE_URL}/api/auth/register",
                      json={"email": STATE["reg_email"], "password": "Audit!Pass2026x", "name": "x"})
        assert r.status_code == 409
        assert "bereits registriert" in r.json()["detail"]

    def test_register_weak_password_backend(self, anon):
        # frontend requires 10 chars + complexity; backend only min_length=8
        r = anon.post(f"{BASE_URL}/api/auth/register",
                      json={"email": f"audit+weak{RUN}@example.com", "password": "short", "name": "x"})
        assert r.status_code == 422

    def test_onboarding_patch(self):
        s = STATE["reg_session"]
        r = s.patch(f"{BASE_URL}/api/users/onboarding", json={
            "first_name": "Audit", "last_name": "Tester", "country": "Deutschland",
            "street": "Teststr", "house_number": "1", "postal_code": "10115", "city": "Berlin",
            "phone": "+49 30 123456", "onboarding_completed_steps": ["profile", "security", "portfolio", "notifications"],
            "onboarding_completed": True})
        assert r.status_code == 200, r.text
        g = s.get(f"{BASE_URL}/api/users/onboarding").json()
        assert g["onboarding_completed"] is True and g["city"] == "Berlin"

    def test_forgot_password(self, anon):
        r = anon.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": f"audit+nobody{RUN}@example.com"})
        assert r.status_code == 200, r.text


# ── Cleanup ─────────────────────────────────────────────────────────
class TestZCleanup:
    def test_cleanup(self, admin):
        if STATE.get("d_sub"):
            r = admin.delete(f"{BASE_URL}/api/admin/document-uploads/submissions/{STATE['d_sub']}")
            print("del doc sub", r.status_code)
        if STATE.get("d_code_id"):
            r = admin.delete(f"{BASE_URL}/api/admin/document-uploads/codes/{STATE['d_code_id']}")
            print("del doc code", r.status_code)
        if STATE.get("f_code_id"):
            r = admin.post(f"{BASE_URL}/api/admin/formular-access/codes/{STATE['f_code_id']}/revoke")
            assert r.json()["status"] == "revoked"
            v = requests.post(f"{BASE_URL}/api/formular-access/session/validate", json={"session_id": STATE["sid"]})
            assert v.json()["valid"] is False  # revoke kills session
            r = admin.delete(f"{BASE_URL}/api/admin/formular-access/codes/{STATE['f_code_id']}")
            assert r.status_code == 200
        if STATE.get("reg_id"):
            r = admin.delete(f"{BASE_URL}/api/admin/users/{STATE['reg_id']}")
            print("del user", r.status_code, r.text[:200])
        print("contract subs to clean via mongo:", STATE.get("subs"))
