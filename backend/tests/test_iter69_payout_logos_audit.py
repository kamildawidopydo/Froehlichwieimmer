# Iteration 69: payout request flow (customer request -> admin approve/reject), cash overdraft guard, bank logos, admin offers count
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as fh:
        for line in fh:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

UID = "6adf710ec883ed7588dd7e36"
ADMIN = ("petrowski616@outlook.com", "HHHKKK222")
CUST = ("tester@mester.de", "HHHKKK222")
IBAN = "DE89370400440532013000"


def _login(creds):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": creds[0], "password": creds[1]})
    if r.status_code != 200:
        pytest.skip(f"login failed {creds[0]}: {r.status_code}")
    return s


@pytest.fixture(scope="module")
def admin():
    return _login(ADMIN)


@pytest.fixture(scope="module")
def cust():
    return _login(CUST)


@pytest.fixture(scope="module")
def pending_ids(admin):
    ids = []
    yield ids
    for i in ids:  # cleanup: reject any still-pending request
        admin.post(f"{BASE_URL}/api/admin/payout-requests/{i}/reject", json={"reason": "TEST cleanup"})


def _cash(cust):
    r = cust.get(f"{BASE_URL}/api/portfolio/cash")
    assert r.status_code == 200, r.text
    d = r.json()
    return float(d["cash_balance"]), float(d["cash_available"]), d


# Payout: validation
class TestPayoutValidation:
    def test_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/portfolio/payout-requests", json={"amount": 1, "account_holder": "X Y", "iban": IBAN})
        assert r.status_code in (401, 403)

    def test_amount_above_available_rejected(self, cust):
        _, avail, _ = _cash(cust)
        r = cust.post(f"{BASE_URL}/api/portfolio/payout-requests", json={"amount": avail + 1000, "account_holder": "Tester Mester", "iban": IBAN})
        assert r.status_code == 400
        assert "verfügbar" in r.json()["detail"]

    def test_invalid_iban(self, cust):
        r = cust.post(f"{BASE_URL}/api/portfolio/payout-requests", json={"amount": 1, "account_holder": "Tester Mester", "iban": "XX12 abc def ghi jkl"})
        assert r.status_code == 422

    def test_zero_amount(self, cust):
        r = cust.post(f"{BASE_URL}/api/portfolio/payout-requests", json={"amount": 0, "account_holder": "Tester Mester", "iban": IBAN})
        assert r.status_code == 422

    def test_customer_cannot_approve(self, cust):
        r = cust.post(f"{BASE_URL}/api/admin/payout-requests/{'0'*24}/approve", json={})
        assert r.status_code in (401, 403)


# Payout: reserve -> reject releases ; reserve -> approve settles ; double approve 409
class TestPayoutFlow:
    def test_reject_releases(self, cust, admin, pending_ids):
        bal0, av0, _ = _cash(cust)
        r = cust.post(f"{BASE_URL}/api/portfolio/payout-requests", json={"amount": 10, "account_holder": "Tester Mester", "iban": "de89 3704 0044 0532 0130 00"})
        assert r.status_code == 201, r.text
        p = r.json()
        pending_ids.append(p["id"])
        assert p["status"] == "pending" and p["iban"] == IBAN and p["amount"] == 10
        bal1, av1, _ = _cash(cust)
        assert bal1 == bal0 and round(av0 - av1, 2) == 10.0
        lst = admin.get(f"{BASE_URL}/api/admin/payout-requests?status=pending").json()
        assert any(x["id"] == p["id"] and x["customer_email"] == CUST[0] for x in lst)
        mine = cust.get(f"{BASE_URL}/api/portfolio/payout-requests").json()
        assert any(x["id"] == p["id"] for x in mine)
        rj = admin.post(f"{BASE_URL}/api/admin/payout-requests/{p['id']}/reject", json={"reason": "TEST"})
        assert rj.status_code == 200 and rj.json()["status"] == "rejected"
        bal2, av2, _ = _cash(cust)
        assert bal2 == bal0 and av2 == av0
        assert admin.post(f"{BASE_URL}/api/admin/payout-requests/{p['id']}/approve", json={}).status_code == 409

    def test_approve_settles_then_restore(self, cust, admin, pending_ids):
        bal0, av0, _ = _cash(cust)
        r = cust.post(f"{BASE_URL}/api/portfolio/payout-requests", json={"amount": 5.55, "account_holder": "Tester Mester", "iban": IBAN})
        assert r.status_code == 201
        pid = r.json()["id"]
        pending_ids.append(pid)
        ap = admin.post(f"{BASE_URL}/api/admin/payout-requests/{pid}/approve", json={})
        assert ap.status_code == 200 and ap.json()["status"] == "approved"
        bal1, av1, _ = _cash(cust)
        assert round(bal0 - bal1, 2) == 5.55 and round(av0 - av1, 2) == 5.55
        assert admin.post(f"{BASE_URL}/api/admin/payout-requests/{pid}/approve", json={}).status_code == 409
        # restore the balance with an admin credit
        cr = admin.post(f"{BASE_URL}/api/admin/portfolio/cash/adjustment", json={
            "user_id": UID, "direction": "credit", "amount": "5.55", "reason": "TEST restore payout",
            "idempotency_key": f"test-restore-{uuid.uuid4().hex}"})
        assert cr.status_code == 200, cr.text
        bal2, _, _ = _cash(cust)
        assert bal2 == bal0

    def test_404_unknown(self, admin):
        assert admin.post(f"{BASE_URL}/api/admin/payout-requests/{'0'*24}/approve", json={}).status_code == 404


# Admin cash overdraft guard
class TestOverdraftGuard:
    def test_debit_above_available_400(self, admin, cust):
        _, av, _ = _cash(cust)
        r = admin.post(f"{BASE_URL}/api/admin/portfolio/cash/adjustment", json={
            "user_id": UID, "direction": "debit", "amount": f"{av + 100:.2f}", "reason": "TEST overdraft",
            "idempotency_key": f"test-od-{uuid.uuid4().hex}"})
        assert r.status_code == 400
        _, av2, _ = _cash(cust)
        assert av2 == av


# Bank logos + offers count
class TestLogosOffers:
    def test_all_banks_have_logo(self, admin):
        r = admin.get(f"{BASE_URL}/api/admin/banks/list?limit=500")
        assert r.status_code == 200
        items = r.json()["items"]
        missing = [b.get("name") for b in items if not b.get("logo_url")]
        assert not missing, f"{len(missing)} banks without logo: {missing[:10]}"

    def test_logo_files_resolve(self, admin):
        items = admin.get(f"{BASE_URL}/api/admin/banks/list?limit=500").json()["items"]
        urls = sorted({b["logo_url"] for b in items if b.get("logo_url")})
        broken = []
        for u in urls:
            full = u if u.startswith("http") else f"{BASE_URL}{u}"
            resp = requests.get(full, timeout=15)
            if resp.status_code != 200 or not resp.headers.get("content-type", "").startswith("image"):
                broken.append((u, resp.status_code, resp.headers.get("content-type")))
        assert not broken, f"{len(broken)} broken logos: {broken[:10]}"

    def test_offers_list_all_with_logo(self, admin):
        d = admin.get(f"{BASE_URL}/api/admin/offers/list?limit=500").json()
        assert d["count"] >= 250 and len(d["items"]) == d["count"]
        nologo = [o["product_name"] for o in d["items"] if not (o.get("banks") or {}).get("logo_url")]
        assert not nologo, f"{len(nologo)} offers w/o logo: {nologo[:5]}"

    def test_public_savings_offers_logo(self):
        r = requests.get(f"{BASE_URL}/api/public/savings-offers?limit=100")
        assert r.status_code == 200
        d = r.json()
        items = d.get("items", d) if isinstance(d, dict) else d
        assert len(items) > 0
        nologo = [o.get("product_name") for o in items if not ((o.get("banks") or o.get("bank") or {}).get("logo_url") or o.get("bank_logo_url") or o.get("logo_url"))]
        assert not nologo, f"{len(nologo)} public offers w/o logo: {nologo[:5]}"
