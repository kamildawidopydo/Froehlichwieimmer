# Iteration 74: retest of iter73 fixes - sanitizer, upload email, client-IP, user-delete cascade
import os
import sys
import uuid
import random
import asyncio
import pytest
import requests
from types import SimpleNamespace

sys.path.insert(0, "/app/backend")
from dotenv import load_dotenv  # noqa: E402
load_dotenv("/app/backend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN = {"email": "petrowski616@outlook.com", "password": "HHHKKK222"}
RAND = uuid.uuid4().hex[:6]
PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"


@pytest.fixture(scope="module")
def admin():
    s = requests.Session()
    s.headers.update({"Origin": BASE_URL})
    r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    if r.status_code != 200:
        pytest.skip(f"admin login failed {r.status_code} {r.text}")
    return s


def _mongo():
    from dotenv import load_dotenv
    load_dotenv("/app/backend/.env")
    from pymongo import MongoClient
    return MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]


# Sanitizer unit tests (_summary_html)
class TestSanitizer:
    def _fn(self):
        from routes.contract_submissions import _summary_html
        return _summary_html

    def test_unclosed_img_escaped(self):
        out = self._fn()(None, "<b>ok</b><img src=x onerror=alert(1)")
        print(out)
        assert "<b>ok</b>" in out
        assert "<img" not in out.lower()
        assert "&lt;img" in out

    @pytest.mark.parametrize("payload", [
        "<b onmouseover=alert(1)>x</b>",
        "<<img>img src=x onerror=alert(1)>",
        "<script>alert(1)</script><p>hi</p>",
        "<scr<script>ipt>alert(1)</script>",
        "<svg/onload=alert(1)>",
        "<a href=javascript:alert(1)>x</a>",
        "<td style=x onclick=alert(1)>y</td>",
        "<p\nonclick=alert(1)>z</p>",
        "<iframe src=//evil",
    ])
    def test_variants(self, payload):
        out = self._fn()(None, payload)
        print(repr(payload), "->", repr(out))
        low = out.lower()
        import re
        # no live tag with attributes / disallowed tag
        assert not re.search(r"<(?!/?(table|thead|tbody|tr|td|th|b|strong|p|br|h3|h4|ul|li)>)[a-z/!]", low), out

    def test_summary_dict_escaped(self):
        out = self._fn()({"<k>": "<img src=x>"}, "")
        assert "<img" not in out and "&lt;img" in out


# Client IP precedence (unit)
class TestClientIp:
    def _req(self, headers):
        return SimpleNamespace(headers={k.lower(): v for k, v in headers.items()},
                               client=SimpleNamespace(host="9.9.9.9"))

    def test_formular_access_precedence(self):
        import server  # noqa: F401 (avoid circular import)
        from routes.formular_access import _client_ip
        assert _client_ip(self._req({"CF-Connecting-IP": "1.1.1.1", "X-Real-IP": "2.2.2.2", "X-Forwarded-For": "3.3.3.3"})) == "1.1.1.1"
        assert _client_ip(self._req({"X-Real-IP": "2.2.2.2", "X-Forwarded-For": "3.3.3.3, 4.4.4.4"})) == "2.2.2.2"
        assert _client_ip(self._req({"X-Forwarded-For": "3.3.3.3, 4.4.4.4"})) == "3.3.3.3"
        assert _client_ip(self._req({})) == "9.9.9.9"


# Live: formular-access fail RL - spoofed XFF with fixed client must still hit 429
class TestLiveIpRateLimit:
    def test_random_xff_does_not_bypass(self):
        statuses = []
        for _ in range(12):
            h = {"X-Forwarded-For": f"198.51.100.{random.randint(1,254)}"}
            r = requests.post(f"{BASE_URL}/api/formular-access/verify",
                              json={"code": "ZZZZ" + uuid.uuid4().hex[:4].upper(), "used_by_name": "TEST Spoof"}, headers=h)
            statuses.append(r.status_code)
        print("random XFF statuses", statuses)
        assert 429 in statuses, statuses

    def test_random_cf_connecting_ip_bypass(self):
        statuses = []
        for _ in range(12):
            h = {"CF-Connecting-IP": f"203.0.113.{random.randint(1,254)}"}
            r = requests.post(f"{BASE_URL}/api/formular-access/verify",
                              json={"code": "ZZZZ" + uuid.uuid4().hex[:4].upper(), "used_by_name": "TEST Spoof"}, headers=h)
            statuses.append(r.status_code)
        print("random CF-Connecting-IP statuses", statuses)
        assert 429 in statuses, f"client-supplied CF-Connecting-IP bypasses RL: {statuses}"


# Document upload email validation + visibility
class TestUploadEmail:
    def test_invalid_email_422(self):
        r = requests.post(f"{BASE_URL}/api/document-uploads/submit",
                          data={"code": "ZZZZ9999", "used_by_name": "TEST Kunde", "email": "not-an-email"},
                          files=[("files", ("t.pdf", PDF, "application/pdf"))])
        print(r.status_code, r.text)
        assert r.status_code == 422
        assert "E-Mail" in r.json()["detail"]

    def test_valid_email_stored(self, admin):
        r = admin.post(f"{BASE_URL}/api/admin/document-uploads/codes", json={"admin_label": f"TEST_iter74_{RAND}"})
        assert r.status_code == 201, r.text
        code, cid = r.json()["code"], r.json()["id"]
        email = f"test_iter74_{RAND}@example.com"
        sub_id = None
        try:
            s = requests.post(f"{BASE_URL}/api/document-uploads/submit",
                              data={"code": code, "used_by_name": f"TEST Kunde {RAND}", "email": email.upper(), "message": "TEST_"},
                              files=[("files", ("t.pdf", PDF, "application/pdf"))], timeout=60)
            print(s.status_code, s.text)
            assert s.status_code == 200, s.text
            sub_id = s.json()["submission_id"]
            items = admin.get(f"{BASE_URL}/api/admin/document-uploads/submissions").json()["items"]
            mine = [x for x in items if x["id"] == sub_id][0]
            print(mine)
            assert mine["email"] == email
            assert mine["admin_email_sent"] is True, mine.get("admin_email_error")
        finally:
            if sub_id:
                admin.delete(f"{BASE_URL}/api/admin/document-uploads/submissions/{sub_id}")
            admin.delete(f"{BASE_URL}/api/admin/document-uploads/codes/{cid}")


# User delete cascade
class TestUserDeleteCascade:
    def test_cascade(self, admin):
        email = f"audit+{RAND}@example.com"
        u = requests.Session()
        u.headers.update({"Origin": BASE_URL})
        r = u.post(f"{BASE_URL}/api/auth/register", json={"email": email, "password": "Test12345!", "name": "TEST Audit"})
        print("register", r.status_code, r.text[:300])
        assert r.status_code in (200, 201), r.text
        db = _mongo()
        uid_doc = db.users.find_one({"email": email})
        assert uid_doc
        oid = uid_doc["_id"]
        uid = str(oid)
        if not u.cookies:
            u.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "Test12345!"})
        try:
            r = admin.post(f"{BASE_URL}/api/admin/portfolio/cash/deposit",
                           json={"user_id": uid, "amount": "1000", "idempotency_key": f"TEST_{RAND}_dep"})
            print("deposit", r.status_code, r.text[:200]); assert r.status_code in (200, 201), r.text
            bank = db.banks.find_one({}, {"_id": 1})
            r = admin.post(f"{BASE_URL}/api/admin/customers/{uid}/depot-contracts",
                           json={"bank_id": str(bank["_id"]), "product_type": "tagesgeld", "amount_eur": 500,
                                 "zinssatz": 2.5, "active_from": "2026-01-01"})
            print("contract", r.status_code, r.text[:200]); assert r.status_code == 201, r.text
            r = admin.post(f"{BASE_URL}/api/admin/customers/{uid}/stock-positions",
                           json={"symbol": "AAPL", "quantity": 2, "avg_cost": 150})
            assert r.status_code == 201, r.text
            r = admin.post(f"{BASE_URL}/api/admin/customers/{uid}/bond-positions",
                           json={"isin": "DE0001102580", "bond_name": "TEST Bund", "nominal_betrag": 1000})
            assert r.status_code == 201, r.text
            r = u.post(f"{BASE_URL}/api/watchlist", json={"symbol": "MSFT"})
            print("watchlist", r.status_code, r.text[:200])
            r = u.post(f"{BASE_URL}/api/portfolio/payout-requests",
                       json={"amount": 10, "account_holder": "TEST Audit", "iban": "DE89370400440532013000"})
            print("payout", r.status_code, r.text[:200])

            q = {"user_id": {"$in": [oid, uid]}}
            colls = ["cash_ledger", "depot_contracts", "stock_positions", "bond_positions",
                     "watchlists", "payout_requests", "stock_orders"]
            before = {c: db[c].count_documents(q) for c in colls}
            print("before", before)

            d = admin.delete(f"{BASE_URL}/api/admin/users/{uid}")
            print("delete", d.status_code, d.text)
            assert d.status_code == 200
            after = {c: db[c].count_documents(q) for c in colls}
            print("after", after)
            assert db.users.find_one({"_id": oid}) is None
            leftovers = {k: v for k, v in after.items() if v}
            assert not leftovers, f"orphan data after delete: {leftovers}"
        finally:
            q = {"user_id": {"$in": [oid, uid]}}
            for c in ["cash_ledger", "depot_contracts", "stock_positions", "bond_positions", "watchlists",
                      "payout_requests", "stock_orders", "user_sessions", "order_executions"]:
                db[c].delete_many(q)
            db.users.delete_one({"_id": oid})
