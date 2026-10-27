# Iteration 75: customer mails (style B), Festgeld summary parsing, formular session 401, flows regression
import os
import sys
import time
import uuid
import base64
import pytest
import requests
from bson import ObjectId
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN = {"email": "petrowski616@outlook.com", "password": "HHHKKK222"}
RAND = uuid.uuid4().hex[:6]
PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"
PDF_B64 = base64.b64encode(PDF * 20).decode()

sys.path.insert(0, "/app/backend")


def _env(key):
    for line in open("/app/backend/.env"):
        if line.startswith(key + "="):
            return line.split("=", 1)[1].strip().strip('"')


mdb = MongoClient(_env("MONGO_URL"))[_env("DB_NAME")]


@pytest.fixture(scope="module")
def admin():
    s = requests.Session()
    s.headers.update({"Origin": BASE_URL})
    r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    if r.status_code != 200:
        pytest.skip(f"admin login failed {r.status_code}")
    return s


@pytest.fixture(scope="module")
def new_user(admin):
    """Register audit user (welcome mail trigger); deleted after module."""
    s = requests.Session()
    s.headers.update({"Origin": BASE_URL})
    email = f"audit+it75{RAND}@example.com"
    r = s.post(f"{BASE_URL}/api/auth/register", json={
        "email": email, "password": "AuditPass123!", "name": f"TEST_It75 {RAND}",
        "first_name": "TEST", "last_name": f"It75{RAND}",
    })
    assert r.status_code in (200, 201), r.text
    u = r.json()
    uid = u.get("id") or u.get("_id")
    yield {"s": s, "id": uid, "email": email}
    d = admin.delete(f"{BASE_URL}/api/admin/users/{uid}")
    print("cleanup user", d.status_code)


# Unit: renderer output
class TestRender:
    def test_render_contains_green_button_and_german(self):
        from services.customer_mails import render, eur, mask_iban
        html = render("Auszahlungsantrag erhalten", "Ihr Antrag wird geprüft.",
                      [("Betrag", eur(1234.5)), ("Empfängerkonto", mask_iban("DE89370400440532013000"))],
                      "Antrag ansehen", "/dashboard/uebersicht", steps=["Prüfung durch unser Team"],
                      note="<script>x</script>")
        assert "background:#36A852" in html
        assert "Antrag ansehen →" in html
        assert "/dashboard/uebersicht" in html
        assert "1.234,50 €" in html
        assert "DE89 •••• •••• 3000" in html
        assert "So geht es weiter" in html
        assert "Mit freundlichen Grüßen" in html
        assert "HRB 23436" in html
        assert "<script>" not in html


# Register -> welcome mail (background), response OK
class TestRegister:
    def test_register_ok_and_me(self, new_user):
        r = new_user["s"].get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == new_user["email"]


# Admin adds contract + document -> notify mail
class TestAdminItems:
    def test_add_contract_and_document(self, admin, new_user):
        banks = admin.get(f"{BASE_URL}/api/admin/banks/list?limit=5").json()["items"]
        r = admin.post(f"{BASE_URL}/api/admin/customers/{new_user['id']}/depot-contracts", json={
            "bank_id": banks[0]["id"], "product_type": "festgeld", "amount_eur": 1000, "zinssatz": 3.0,
            "laufzeit_monate": 12, "active_from": "2026-01-01", "note": "TEST_iter75"})
        assert r.status_code == 201, r.text
        cid = r.json()["id"]
        assert r.json()["active_until"] == "2027-01-01"
        d = admin.post(f"{BASE_URL}/api/admin/customers/{new_user['id']}/documents",
                       data={"title": "TEST_Dok75"}, files={"file": ("t.pdf", PDF, "application/pdf")})
        assert d.status_code == 201, d.text
        did = d.json()["id"]
        assets = admin.get(f"{BASE_URL}/api/admin/customers/{new_user['id']}/assets")
        if assets.status_code == 200:
            a = assets.json()
            assert any(c["id"] == cid for c in a["depot_contracts"])
            assert any(x["id"] == did for x in a["documents"])
        assert admin.delete(f"{BASE_URL}/api/admin/depot-contracts/{cid}").status_code == 200
        assert admin.delete(f"{BASE_URL}/api/admin/customer-documents/{did}").status_code == 200


# Payout request + approve / reject -> mails
class TestPayouts:
    def test_payout_approve_reject(self, admin, new_user):
        dep = admin.post(f"{BASE_URL}/api/admin/portfolio/cash/deposit", json={
            "user_id": new_user["id"], "amount": "100.00", "idempotency_key": f"it75-dep-{RAND}",
            "description": "TEST_iter75"})
        assert dep.status_code == 200, dep.text
        s = new_user["s"]
        p1 = s.post(f"{BASE_URL}/api/portfolio/payout-requests", json={
            "amount": 10, "account_holder": "TEST It75", "iban": "DE89 3704 0044 0532 0130 00"})
        assert p1.status_code == 201, p1.text
        assert p1.json()["status"] == "pending"
        a = admin.post(f"{BASE_URL}/api/admin/payout-requests/{p1.json()['id']}/approve", json={})
        assert a.status_code == 200, a.text
        assert a.json()["status"] == "approved"
        p2 = s.post(f"{BASE_URL}/api/portfolio/payout-requests", json={
            "amount": 5, "account_holder": "TEST It75", "iban": "DE89370400440532013000"})
        assert p2.status_code == 201, p2.text
        rj = admin.post(f"{BASE_URL}/api/admin/payout-requests/{p2.json()['id']}/reject", json={"reason": "TEST Grund"})
        assert rj.status_code == 200, rj.text
        assert rj.json()["status"] == "rejected"
        mine = s.get(f"{BASE_URL}/api/portfolio/payout-requests").json()
        assert {m["status"] for m in mine} == {"approved", "rejected"}


# Order execution -> order executed mail
class TestOrderExecution:
    def test_limit_buy_execute(self, admin, new_user):
        s = new_user["s"]
        dep = admin.post(f"{BASE_URL}/api/admin/portfolio/cash/deposit", json={
            "user_id": new_user["id"], "amount": "2000.00", "idempotency_key": f"it75-dep2-{RAND}",
            "description": "TEST_iter75 order"})
        assert dep.status_code == 200, dep.text
        r = s.post(f"{BASE_URL}/api/portfolio/orders", json={
            "symbol": "AAPL", "side": "buy", "order_type": "limit", "quantity": "1",
            "limit_price": "1000", "idempotency_key": f"it75-ord-{RAND}"})
        if r.status_code != 201:
            pytest.skip(f"order create not possible: {r.status_code} {r.text[:200]}")
        oid = (r.json().get("order") or r.json()).get("id")
        ex = admin.post(f"{BASE_URL}/api/admin/portfolio/orders/{oid}/execute", json={})
        print("execute:", ex.status_code, ex.text[:300])
        assert ex.status_code == 200, ex.text
        if True:
            assert ex.json()["order"]["status"] == "executed"


# Document upload with email -> confirmation mail
class TestDocUpload:
    def test_upload_with_email(self, admin):
        r = admin.post(f"{BASE_URL}/api/admin/document-uploads/codes", json={"admin_label": f"TEST_it75_{RAND}"})
        assert r.status_code == 201
        code, cid = r.json()["code"], r.json()["id"]
        try:
            up = requests.post(f"{BASE_URL}/api/document-uploads/submit",
                               data={"code": code, "used_by_name": f"TEST_It75 {RAND}", "email": f"audit+it75up{RAND}@example.com"},
                               files=[("files", ("test.pdf", PDF, "application/pdf"))], timeout=60)
            assert up.status_code in (200, 201), up.text
            subs = admin.get(f"{BASE_URL}/api/admin/document-uploads/submissions").json()["items"]
            mine = [x for x in subs if x.get("used_by_name") == f"TEST_It75 {RAND}"]
            assert mine and mine[0]["email"] == f"audit+it75up{RAND}@example.com"
            for m in mine:
                admin.delete(f"{BASE_URL}/api/admin/document-uploads/submissions/{m['id']}")
        finally:
            admin.delete(f"{BASE_URL}/api/admin/document-uploads/codes/{cid}")


# Contract form: 401 session handling + Festgeld summary parse
class TestContractForm:
    HTML = ('<table><tr><td style="x">Anleger</td><td style="y">TEST Anna</td></tr>'
            '<tr style="background:#F4F5F7;"><td>Anlagebetrag</td><td>10.000 EUR</td></tr>'
            '<tr><td>Zinssatz p.a.</td><td>3,10 %</td></tr>'
            '<tr><td>Laufzeit</td><td>12 Monate</td></tr>'
            '<tr><td>Zweiter Anleger</td><td>—</td></tr></table>')

    def _body(self):
        return {"customerEmail": "delivered@resend.dev", "customerName": f"TEST_It75 {RAND}",
                "pdfBase64": PDF_B64, "formSummaryHtml": self.HTML,
                "formSummary": {"iban": "DE89370400440532013000", "secondInvestor": None}}

    def test_no_session_401(self):
        r = requests.post(f"{BASE_URL}/api/send-knab-festgeld-email", json=self._body())
        assert r.status_code == 401
        assert "abgelaufen" in r.json()["detail"]

    def test_bogus_session_401(self):
        r = requests.post(f"{BASE_URL}/api/send-knab-festgeld-email", json=self._body(),
                          headers={"X-Formular-Session": "bogus-session-123456"})
        assert r.status_code == 401

    def test_expired_and_valid_session_summary(self, admin):
        r = admin.post(f"{BASE_URL}/api/admin/formular-access/codes", json={"admin_label": f"TEST_it75_{RAND}"})
        assert r.status_code == 201, r.text
        code, cid = r.json()["code"], r.json()["id"]
        sub_id = None
        try:
            v = requests.post(f"{BASE_URL}/api/formular-access/verify", json={"code": code, "used_by_name": "TEST Anna"})
            assert v.status_code == 200, v.text
            sid = v.json().get("session_id") or v.json().get("sessionId")
            assert sid
            r = requests.post(f"{BASE_URL}/api/send-knab-festgeld-email", json=self._body(),
                              headers={"X-Formular-Session": sid}, timeout=90)
            assert r.status_code == 200, r.text
            sub_id = r.json()["submissionId"]
            doc = mdb.contract_form_submissions.find_one({"_id": ObjectId(sub_id)})
            summ = doc["summary"]
            print("summary:", summ)
            assert summ["Anlagebetrag"] == "10.000 EUR"
            assert summ["Zinssatz p.a."] == "3,10 %"
            assert summ["Laufzeit"] == "12 Monate"
            assert summ["Anleger"] == "TEST Anna"
            assert "Zweiter Anleger" not in summ
            lst = admin.get(f"{BASE_URL}/api/admin/contract-form-submissions")
            assert lst.status_code == 200
            body = lst.json()
            items = body if isinstance(body, list) else (body.get("items") or body.get("submissions") or [])
            hit = [x for x in items if x.get("id") == sub_id]
            assert hit and hit[0]["summary"]["Laufzeit"] == "12 Monate"
            # expire session -> 401
            mdb.formular_sessions.update_one({"session_id": sid}, {"$set": {"expires_at": __import__("datetime").datetime(2020, 1, 1)}})
            r2 = requests.post(f"{BASE_URL}/api/send-knab-festgeld-email", json=self._body(), headers={"X-Formular-Session": sid})
            assert r2.status_code == 401
        finally:
            if sub_id:
                d = mdb.contract_form_submissions.find_one({"_id": ObjectId(sub_id)}) or {}
                mdb.storage_files.delete_many({"subject_id": sub_id})
                mdb.contract_form_submissions.delete_one({"_id": ObjectId(sub_id)})
            mdb.formular_sessions.delete_many({"code_id": ObjectId(cid)})
            admin.delete(f"{BASE_URL}/api/admin/formular-access/codes/{cid}")
