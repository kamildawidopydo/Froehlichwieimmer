# Iter97: Admin IPO valuation PATCH + valuation object in admin/customer lists (no cash/position side effects)
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN = ("qa.admin@kapital-direkt24.de", "Qa-ra46CVrWIW3wg6l5EI6IKqbx")
EUR_USER = ("test_eur_qa@example.com", "TestEur-Qa-2026!")
PRVT3 = "6ae33a50c592be77950dc343"
PRVNV = "6ae33a50c592be77950dc344"
PRVPA = "6ae33a50c592be77950dc345"
USER_ID = "6ae33a4fc592be77950dc332"
IPO_ID = "6a9e986f4ceb21981b2e5688"


def _login(email, pw):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pw}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"login failed {email}: {r.status_code} {r.text[:200]}")
    return s


@pytest.fixture(scope="module")
def admin():
    return _login(*ADMIN)


@pytest.fixture(scope="module")
def cust():
    return _login(*EUR_USER)


def _patch(admin, rid, body):
    return admin.patch(f"{BASE_URL}/api/admin/ipo/requests/{rid}/valuation", json=body, timeout=30)


def _snapshot(cust):
    cash = cust.get(f"{BASE_URL}/api/portfolio/cash", timeout=30)
    assert cash.status_code == 200, cash.text
    pos = cust.get(f"{BASE_URL}/api/portfolio/positions", timeout=30)
    return cash.json(), (pos.json() if pos.status_code == 200 else pos.status_code)


# --- Valuation PATCH math on allocated request ---
def test_valuation_patch_math_and_no_side_effects(admin, cust):
    before = _snapshot(cust)
    print("cash before", before[0])
    for val, profit, pct in (("50", "100.00", "25.00"), ("30", "-100.00", "-25.00"),
                             ("40", "0.00", "0.00"), ("50,00", "100.00", "25.00")):
        r = _patch(admin, PRVT3, {"listing_price_per_share": val})
        assert r.status_code == 200, r.text
        v = r.json()["valuation"]
        assert v["shares"] == 10 and v["shares_basis"] == "allocated"
        assert v["purchase_price_per_share"] == "40.00"
        assert v["total_cost"] == "400.00"
        assert v["estimated_profit"] == profit, (val, v)
        assert v["estimated_return_pct"] == pct, (val, v)
    after = _snapshot(cust)
    assert before == after, f"cash/positions changed: {before} -> {after}"


# --- Purchase price locked when allocated ---
def test_allocated_purchase_price_locked(admin):
    r = _patch(admin, PRVT3, {"subscription_price_per_share": "41"})
    assert r.status_code == 409, r.text
    r = _patch(admin, PRVT3, {"subscription_price_per_share": "40", "listing_price_per_share": "50"})
    assert r.status_code == 200, r.text


@pytest.mark.parametrize("val", ["0", "-5", "abc", "NaN", "Infinity", ""])
def test_invalid_values_422(admin, val):
    r = _patch(admin, PRVT3, {"listing_price_per_share": val})
    assert r.status_code == 422, (val, r.status_code, r.text)


def test_empty_body_and_extra_field(admin):
    assert _patch(admin, PRVT3, {}).status_code == 422
    assert _patch(admin, PRVT3, {"status": "allocated"}).status_code == 422
    assert _patch(admin, "nope", {"listing_price_per_share": "1"}).status_code == 400
    assert _patch(admin, "6ae33a50c592be77950d0000", {"listing_price_per_share": "1"}).status_code == 404


def test_requires_admin(cust):
    r = cust.patch(f"{BASE_URL}/api/admin/ipo/requests/{PRVT3}/valuation",
                   json={"listing_price_per_share": "999"}, timeout=30)
    assert r.status_code in (401, 403)


# --- Rejected request -> 409 ---
def test_rejected_409(admin):
    r = admin.post(f"{BASE_URL}/api/admin/ipo/requests/create-for-user",
                   json={"user_id": USER_ID, "ipo_id": IPO_ID, "shares_requested": 2, "notes": "TEST_EUR reject"},
                   timeout=30)
    assert r.status_code == 201, r.text
    rid = r.json()["id"]
    rj = admin.post(f"{BASE_URL}/api/admin/ipo/requests/{rid}/reject", json={"decision_note": "TEST_EUR"}, timeout=30)
    assert rj.status_code == 200, rj.text
    r = _patch(admin, rid, {"listing_price_per_share": "10"})
    assert r.status_code == 409, r.text


# --- Lists contain valuation; missing value -> nulls ---
def test_admin_list_valuation_and_no_duplicates(admin):
    r = admin.get(f"{BASE_URL}/api/admin/ipo/requests", timeout=30)
    assert r.status_code == 200
    data = r.json()
    ids = [d["id"] for d in data]
    assert len(ids) == len(set(ids)), "duplicate ids in admin list"
    m = {d["id"]: d for d in data}
    v = m[PRVT3]["valuation"]
    assert v["estimated_value_per_share"] == "50.00" and v["estimated_total"] == "500.00"
    assert v["estimated_profit"] == "100.00" and v["estimated_return_pct"] == "25.00"
    nv = m[PRVNV]["valuation"]
    assert nv["purchase_price_per_share"] == "20.00" and nv["total_cost"] == "100.00"
    assert nv["estimated_value_per_share"] is None and nv["estimated_total"] is None
    assert nv["estimated_profit"] is None and nv["estimated_return_pct"] is None
    pa = m[PRVPA]["valuation"]
    print("PRVPA", m[PRVPA]["status"], pa)
    assert "_id" not in m[PRVT3]


def test_customer_me_valuation(cust):
    r = cust.get(f"{BASE_URL}/api/ipo/requests/me", timeout=30)
    assert r.status_code == 200
    m = {d["id"]: d for d in r.json()}
    assert m[PRVT3]["valuation"]["estimated_profit"] == "100.00"
    assert m[PRVNV]["valuation"]["estimated_profit"] is None
    for k in ("shares", "shares_basis", "purchase_price_per_share", "estimated_value_per_share",
              "total_cost", "estimated_total", "estimated_profit", "estimated_return_pct"):
        assert k in m[PRVT3]["valuation"]
