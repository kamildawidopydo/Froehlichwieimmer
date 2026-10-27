# Iteration 70: retest of iteration_69 fixes (cash deposit, admin orders list, festgeld end date, bond fields, IBAN mod-97, payout lock, payout flow)
import os
import uuid
import concurrent.futures as cf
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
def bank(admin):
    items = admin.get(f"{BASE_URL}/api/admin/banks/list?limit=500").json()["items"]
    return items[0]


def _cash(cust):
    d = cust.get(f"{BASE_URL}/api/portfolio/cash").json()
    return float(d["cash_balance"]), float(d["cash_available"]), d


def _pay(cust, amount, iban=IBAN):
    return cust.post(f"{BASE_URL}/api/portfolio/payout-requests",
                     json={"amount": amount, "account_holder": "Tester Mester", "iban": iban})


# (1) cash-balances: users list with real ledger balance; deposit with frontend payload
class TestCashBalances:
    def test_users_include_balances(self, admin, cust):
        bal, _, _ = _cash(cust)
        r = admin.get(f"{BASE_URL}/api/admin/users?include_balances=true&limit=500")
        assert r.status_code == 200
        items = r.json()["items"]
        u = next(x for x in items if x["id"] == UID)
        assert abs(u["cash_balance"] - bal) < 0.001

    def test_deposit_extra_fields_rejected(self, admin):
        r = admin.post(f"{BASE_URL}/api/admin/portfolio/cash/deposit", json={
            "user_id": UID, "amount": "1.00", "direction": "credit", "idempotency_key": "x" * 10})
        assert r.status_code == 422

    def test_deposit_then_payout_back(self, admin, cust):
        # deposit 1.00 (frontend payload shape) and pay it back via payout request approve => net 0
        bal0, _, _ = _cash(cust)
        r = admin.post(f"{BASE_URL}/api/admin/portfolio/cash/deposit", json={
            "user_id": UID, "amount": "1.00", "description": "TEST_iter70 Einzahlung",
            "idempotency_key": f"admin-test-{uuid.uuid4().hex}"})
        assert r.status_code in (200, 201), r.text
        bal1, _, _ = _cash(cust)
        assert abs(bal1 - bal0 - 1.0) < 0.001
        p = _pay(cust, 1.0)
        assert p.status_code == 201, p.text
        a = admin.post(f"{BASE_URL}/api/admin/payout-requests/{p.json()['id']}/approve", json={})
        assert a.status_code == 200, a.text
        bal2, av2, _ = _cash(cust)
        assert abs(bal2 - bal0) < 0.001 and abs(av2 - bal0) < 0.001


# (2) admin orders list
class TestAdminOrders:
    def test_list(self, admin):
        r = admin.get(f"{BASE_URL}/api/admin/portfolio/orders?limit=500")
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        if data:
            assert "user_id" in data[0] and "symbol" in data[0] and "status" in data[0]

    def test_status_filter(self, admin):
        r = admin.get(f"{BASE_URL}/api/admin/portfolio/orders?status=pending")
        assert r.status_code == 200
        assert all(o["status"] == "pending" for o in r.json())

    def test_customer_forbidden(self, cust):
        assert cust.get(f"{BASE_URL}/api/admin/portfolio/orders").status_code in (401, 403)


# (6) festgeld derived end date ; (4) bond fields
class TestAssetsDerived:
    def test_festgeld_end_date_derived(self, admin, cust, bank):
        r = admin.post(f"{BASE_URL}/api/admin/customers/{UID}/depot-contracts", json={
            "bank_id": bank["id"], "product_type": "festgeld", "amount_eur": 1000, "zinssatz": 3.0,
            "laufzeit_monate": 1, "active_from": "2026-01-31", "note": "TEST_iter70"})
        assert r.status_code == 201, r.text
        cid = r.json()["id"]
        try:
            lst = cust.get(f"{BASE_URL}/api/portfolio/depot-contracts").json()
            c = next(x for x in lst if x["id"] == cid)
            assert str(c.get("active_until", ""))[:10] == "2026-02-28", c
            assert str(c.get("lock_until", ""))[:10] == "2026-02-28", c
            assert (c.get("banks") or {}).get("logo_url"), c
        finally:
            admin.delete(f"{BASE_URL}/api/admin/depot-contracts/{cid}")

    def test_bond_fields(self, admin, cust):
        r = admin.post(f"{BASE_URL}/api/admin/customers/{UID}/bond-positions", json={
            "isin": "DE0001102580", "bond_name": "TEST Bund 2032", "issuer": "Bund", "nominal_betrag": 2000,
            "kurs": 98.5, "coupon_rate": 2.1, "maturity_date": "2032-02-15"})
        assert r.status_code == 201, r.text
        bid = r.json()["id"]
        try:
            bl = cust.get(f"{BASE_URL}/api/portfolio/bond-positions").json()
            bl = bl if isinstance(bl, list) else bl.get("items", [])
            b = next(x for x in bl if x["id"] == bid)
            assert float(b["kaufkurs"]) == 98.5, b
            assert float(b["kupon_rate"]) == 2.1, b
            assert str(b["faelligkeitsdatum"])[:10] == "2032-02-15", b
            assert b["kaufdatum"], b
        finally:
            assert admin.delete(f"{BASE_URL}/api/admin/bond-positions/{bid}").status_code == 200


# (8) IBAN mod-97, German amount format, per-user lock
class TestPayoutHardening:
    def test_bad_checksum_iban(self, cust):
        assert _pay(cust, 1, "DE89370400440532013001").status_code == 422

    def test_garbage_iban(self, cust):
        assert _pay(cust, 1, "XX12 abc def ghi jkl").status_code == 422

    def test_german_amount_format(self, cust):
        _, av, _ = _cash(cust)
        r = _pay(cust, av + 1000)
        assert r.status_code == 400
        assert "300,00 €" in r.json()["detail"] or "," in r.json()["detail"].split("(")[-1], r.json()

    def test_parallel_requests_no_overdraw(self, cust, admin):
        _, av, _ = _cash(cust)
        amt = round(av * 0.6, 2)
        with cf.ThreadPoolExecutor(4) as ex:
            res = list(ex.map(lambda _: _pay(cust, amt), range(4)))
        codes = sorted(r.status_code for r in res)
        try:
            assert codes.count(201) == 1, codes
        finally:
            for r in res:
                if r.status_code == 201:
                    admin.post(f"{BASE_URL}/api/admin/payout-requests/{r.json()['id']}/reject", json={"reason": "TEST cleanup"})
        _, av2, _ = _cash(cust)
        assert abs(av2 - av) < 0.001

    def test_reject_flow(self, cust, admin):
        _, av, _ = _cash(cust)
        p = _pay(cust, 2.5)
        assert p.status_code == 201
        _, av1, _ = _cash(cust)
        assert abs(av - av1 - 2.5) < 0.001
        r = admin.post(f"{BASE_URL}/api/admin/payout-requests/{p.json()['id']}/reject", json={"reason": "TEST"})
        assert r.status_code == 200
        _, av2, _ = _cash(cust)
        assert abs(av2 - av) < 0.001
        again = admin.post(f"{BASE_URL}/api/admin/payout-requests/{p.json()['id']}/approve", json={})
        assert again.status_code == 409


# (10)/(3) admin offers list ~300 with bank logos
class TestOffers:
    def test_offers_count_and_logos(self, admin):
        r = admin.get(f"{BASE_URL}/api/admin/offers/list?limit=500")
        if r.status_code == 404:
            pytest.skip("offers list path differs")
        assert r.status_code == 200
        d = r.json()
        items = d if isinstance(d, list) else d.get("items", [])
        assert len(items) >= 290
        missing = [o.get("bank_slug") for o in items if not (o.get("banks") or {}).get("logo_url")]
        assert not missing, missing[:10]
