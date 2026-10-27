# Iteration 72 — Retest of iteration 71 fixes: contract session gate, PDF persistence, escaping,
# public response leak removal, XFF rate-limit hop, short-code 422, doc upload + register regression
import base64
import os
import time
import uuid

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN = {"email": "petrowski616@outlook.com", "password": "HHHKKK222"}
PDF_BYTES = b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n" + b"0" * 400 + b"\n%%EOF"
PDF_B64 = base64.b64encode(PDF_BYTES).decode()
PNG_B64 = base64.b64encode(b"\x89PNG\r\n\x1a\n" + b"0" * 200).decode()
RUN = uuid.uuid4().hex[:6]
STATE = {}


def _mongo():
    env = {}
    for line in open("/app/backend/.env"):
        if "=" in line:
            k, v = line.strip().split("=", 1)
            env[k] = v.strip('"')
    return MongoClient(env["MONGO_URL"])[env["DB_NAME"]]


@pytest.fixture(scope="module")
def admin():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    if r.status_code != 200:
        pytest.skip(f"admin login failed {r.status_code}")
    return s


def _hdr(ip=None, sid=None):
    h = {"X-Forwarded-For": ip or f"203.0.113.{uuid.uuid4().int % 250}"}
    if sid is not None:
        h["X-Formular-Session"] = sid
    return h


def _payload(n, name=None, **extra):
    p = {"customerEmail": f"audit+{n}@example.com", "customerName": name or f"TEST_Audit72 {RUN}",
         "pdfBase64": PDF_B64, "formSummary": {"iban": "DE89370400440532013000", "term": "12 Monate"}}
    p.update(extra)
    return p


# ── Formular code / session ────────────────────────────────────────
class TestA_Formular:
    def test_create_code_and_session(self, admin):
        r = admin.post(f"{BASE_URL}/api/admin/formular-access/codes", json={"admin_label": f"TEST_audit72_{RUN}"})
        assert r.status_code == 201, r.text
        STATE["f_code"], STATE["f_code_id"] = r.json()["code"], r.json()["id"]
        v = requests.post(f"{BASE_URL}/api/formular-access/verify", headers=_hdr(),
                          json={"code": STATE["f_code"], "used_by_name": "Audit Tester"})
        assert v.status_code == 200, v.text
        STATE["sid"] = v.json()["session_id"]

    def test_short_code_422(self):
        r = requests.post(f"{BASE_URL}/api/formular-access/verify", headers=_hdr(),
                          json={"code": "AB", "used_by_name": "Audit Tester"})
        assert r.status_code == 422
        print("short code detail:", r.json()["detail"])


# ── Contract session gate ──────────────────────────────────────────
class TestB_ContractGate:
    def test_no_header_401(self):
        r = requests.post(f"{BASE_URL}/api/send-ing-contract-email", headers=_hdr(), json=_payload(1))
        assert r.status_code == 401
        assert "Formular-Sitzung" in r.json()["detail"]

    def test_garbage_session_401(self):
        r = requests.post(f"{BASE_URL}/api/send-knab-festgeld-email", headers=_hdr(sid="garbage-session-xyz"), json=_payload(1))
        assert r.status_code == 401

    @pytest.mark.parametrize("slug", ["send-contract-email", "send-festgeld-email", "send-bunq-contract-email",
                                      "send-bunq-festgeld-email", "send-bunq-de-contract-email", "send-bunq-de-festgeld-email",
                                      "send-ing-contract-email", "send-ing-festgeld-email", "send-postbank-contract-email",
                                      "send-postbank-festgeld-email", "send-knab-email", "send-knab-festgeld-email"])
    def test_all_12_slugs_require_session(self, slug):
        r = requests.post(f"{BASE_URL}/api/{slug}", headers=_hdr(), json=_payload(1))
        assert r.status_code == 401, f"{slug}: {r.status_code}"


# ── Valid submission + persistence + escaping ──────────────────────
class TestC_ContractSubmit:
    def test_submit_valid_with_injection(self):
        p = _payload(2, name="<b>inj</b>",
                     formSummaryHtml="<script>alert(1)</script><img src=x>",
                     signatureAttachments=[{"filename": "sig.png", "content": PNG_B64, "content_type": "image/png"}])
        p["formSummary"]["evil"] = "<img src=x onerror=alert(1)>"
        r = requests.post(f"{BASE_URL}/api/send-ing-contract-email", headers=_hdr(sid=STATE["sid"]), json=p, timeout=90)
        assert r.status_code == 200, r.text
        d = r.json()
        print("public response:", d)
        assert d["success"] is True
        for k in ("adminNotifyEmail", "adminEmailError", "customerEmailError"):
            assert k not in d, f"leak {k}"
        STATE.setdefault("subs", []).append(d["submissionId"])

    def test_admin_row_has_files_and_pdf(self, admin):
        r = admin.get(f"{BASE_URL}/api/admin/contract-form-submissions")
        assert r.status_code == 200
        row = next(i for i in r.json()["items"] if i["id"] == STATE["subs"][0])
        print("row files:", row["files"], "pdf:", row["contract_pdf_path"], "att:", row["attachments"],
              "admin_err:", row["admin_email_error"])
        assert row["contract_pdf_path"]
        kinds = {f["kind"]: f for f in row["files"]}
        assert kinds["contract"].get("file_id")
        assert any(f["kind"] == "signature" and f.get("file_id") for f in row["files"])
        assert len(row["attachments"]) == 1
        STATE["pdf_fid"] = row["contract_pdf_path"]
        STATE["sig_fid"] = row["attachments"][0]["storage_path"]

    def test_download_pdf_bytes(self, admin):
        dl = admin.get(f"{BASE_URL}/api/admin/document-uploads/files/{STATE['pdf_fid']}/download")
        assert dl.status_code == 200
        assert dl.content[:4] == b"%PDF"
        sg = admin.get(f"{BASE_URL}/api/admin/document-uploads/files/{STATE['sig_fid']}/download")
        assert sg.status_code == 200 and sg.content[:4] == b"\x89PNG"

    def test_download_requires_admin(self):
        dl = requests.get(f"{BASE_URL}/api/admin/document-uploads/files/{STATE['pdf_fid']}/download")
        assert dl.status_code in (401, 403)

    def test_summary_escaped_server_side(self):
        import sys
        sys.path.insert(0, "/app/backend")
        os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
        os.environ.setdefault("DB_NAME", "x")
        from routes.contract_submissions import _summary_html, _admin_html, _customer_html
        s = _summary_html({"evil": "<img src=x onerror=alert(1)>"}, "<script>x</script>")
        assert "<img" not in s and "&lt;img" in s
        s2 = _summary_html(None, "<script>alert(1)</script><b>hi</b>")
        assert "<script" not in s2 and "<b>" not in s2
        a = _admin_html("ING", "X", "<b>inj</b>", "a@b.de", "01.01.2026", s, False)
        assert "<b>inj</b>" not in a and "&lt;b&gt;inj" in a
        c = _customer_html("ING", "X", "<b>inj</b>")
        assert "<b>inj</b>" not in c

    def test_db_record_session_bound(self):
        db = _mongo()
        from bson import ObjectId
        doc = db.contract_form_submissions.find_one({"_id": ObjectId(STATE["subs"][0])})
        assert doc["session_id"] == STATE["sid"]
        print("db admin_email_error:", doc.get("admin_email_error"), "customer err:", doc.get("customer_email_error"))


# ── Retry helper ──────────────────────────────────────────────────
class TestD_Retry:
    def test_retry_429_three_attempts(self):
        import asyncio
        from fastapi import HTTPException
        from routes import contract_submissions as cs
        calls = {"n": 0}

        async def flaky(**kw):
            calls["n"] += 1
            raise HTTPException(status_code=502, detail="E-Mail konnte nicht versendet werden (429).")

        orig = cs.asyncio.sleep
        async def nosleep(*a, **k):
            return None
        cs.asyncio.sleep = nosleep
        try:
            with pytest.raises(HTTPException):
                asyncio.run(cs._send_with_retry(flaky, to="x"))
        finally:
            cs.asyncio.sleep = orig
        assert calls["n"] == 3

        calls["n"] = 0
        async def other(**kw):
            calls["n"] += 1
            raise HTTPException(status_code=502, detail="E-Mail konnte nicht versendet werden (422).")
        with pytest.raises(HTTPException):
            asyncio.run(cs._send_with_retry(other, to="x"))
        assert calls["n"] == 1


# ── Rate limit by first XFF hop ───────────────────────────────────
class TestE_RateLimit:
    def test_wrong_code_lockout_per_ip(self):
        bad_ip = f"198.51.100.{uuid.uuid4().int % 250}"
        codes = []
        for i in range(12):
            r = requests.post(f"{BASE_URL}/api/formular-access/verify", headers=_hdr(ip=bad_ip),
                              json={"code": f"ZZZZ{1000+i}", "used_by_name": "Audit Tester"})
            codes.append(r.status_code)
        print("bad ip statuses:", codes)
        assert 429 in codes
        STATE["bad_ip"] = bad_ip
        # different IP not locked out
        r = requests.post(f"{BASE_URL}/api/formular-access/verify", headers=_hdr(),
                          json={"code": "ZZZZ9999", "used_by_name": "Audit Tester"})
        assert r.status_code == 401, r.status_code
        # no XFF from client -> ingress IP; must not be locked either
        r = requests.post(f"{BASE_URL}/api/formular-access/verify",
                          json={"code": "ZZZZ9998", "used_by_name": "Audit Tester"})
        print("no-xff status:", r.status_code)
        assert r.status_code == 401


# ── Document upload regression ────────────────────────────────────
class TestF_DocUpload:
    def test_doc_flow_single_use(self, admin):
        r = admin.post(f"{BASE_URL}/api/admin/document-uploads/codes", json={"admin_label": f"TEST_audit72_{RUN}"})
        assert r.status_code == 201, r.text
        code, STATE["d_code_id"] = r.json()["code"], r.json()["id"]
        short = requests.post(f"{BASE_URL}/api/formular-access/verify-document", headers=_hdr(), json={"code": "AB"})
        print("doc short:", short.status_code, short.json())
        v = requests.post(f"{BASE_URL}/api/formular-access/verify-document", headers=_hdr(), json={"code": code})
        assert v.status_code == 200
        up = requests.post(f"{BASE_URL}/api/document-uploads/submit", headers=_hdr(),
                           data={"code": code, "used_by_name": "TEST Audit72", "message": "it72"},
                           files=[("files", ("a.pdf", PDF_BYTES, "application/pdf"))])
        assert up.status_code == 200, up.text
        STATE["d_sub"] = up.json()["submission_id"]
        again = requests.post(f"{BASE_URL}/api/formular-access/verify-document", headers=_hdr(), json={"code": code})
        assert again.status_code == 401 and "bereits verwendet" in again.json()["detail"]
        lst = admin.get(f"{BASE_URL}/api/admin/document-uploads/submissions").json()["items"]
        sub = next(i for i in lst if i["id"] == STATE["d_sub"])
        dl = admin.get(f"{BASE_URL}/api/admin/document-uploads/files/{sub['files'][0]['file_id']}/download")
        assert dl.content[:4] == b"%PDF"


# ── Register + onboarding regression ──────────────────────────────
class TestG_Register:
    def test_register_onboarding(self):
        s = requests.Session()
        email = f"audit+reg72{RUN}@example.com"
        r = s.post(f"{BASE_URL}/api/auth/register", headers=_hdr(),
                   json={"email": email, "password": "Audit!Pass2026x", "name": "TEST Audit72"})
        assert r.status_code == 200, r.text
        STATE["reg_id"] = r.json()["id"]
        assert s.get(f"{BASE_URL}/api/auth/me").status_code == 200
        p = s.patch(f"{BASE_URL}/api/users/onboarding", json={
            "first_name": "Audit", "last_name": "T", "country": "Deutschland", "street": "S", "house_number": "1",
            "postal_code": "10115", "city": "Berlin", "phone": "+49 30 1",
            "onboarding_completed_steps": ["profile", "security", "portfolio", "notifications"], "onboarding_completed": True})
        assert p.status_code == 200
        assert s.get(f"{BASE_URL}/api/users/onboarding").json()["onboarding_completed"] is True


# ── Cleanup ───────────────────────────────────────────────────────
class TestZ_Cleanup:
    def test_cleanup(self, admin):
        if STATE.get("d_sub"):
            admin.delete(f"{BASE_URL}/api/admin/document-uploads/submissions/{STATE['d_sub']}")
        if STATE.get("d_code_id"):
            admin.delete(f"{BASE_URL}/api/admin/document-uploads/codes/{STATE['d_code_id']}")
        if STATE.get("f_code_id"):
            admin.post(f"{BASE_URL}/api/admin/formular-access/codes/{STATE['f_code_id']}/revoke")
            admin.delete(f"{BASE_URL}/api/admin/formular-access/codes/{STATE['f_code_id']}")
        if STATE.get("reg_id"):
            admin.delete(f"{BASE_URL}/api/admin/users/{STATE['reg_id']}")
        db = _mongo()
        from bson import ObjectId
        for sid in STATE.get("subs", []):
            db.contract_form_submissions.delete_one({"_id": ObjectId(sid)})
            db.storage_files.update_many({"subject_id": sid}, {"$set": {"is_deleted": True}})
        if STATE.get("bad_ip"):
            db.formular_access_fail_log.delete_many({"ip": STATE["bad_ip"]})
