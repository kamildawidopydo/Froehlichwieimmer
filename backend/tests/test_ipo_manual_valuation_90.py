# IPO manual valuation (entry price / estimated value) – API tests (iteration 90)
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ASPEN = "6ae1afb57e5d3e0426d721da"


def _login(email, pw):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pw})
    if r.status_code != 200:
        pytest.skip(f"login failed {email} {r.status_code}")
    tok = r.json().get("access_token") or r.json().get("token")
    if tok:
        s.headers["Authorization"] = f"Bearer {tok}"
    return s


@pytest.fixture(scope="module")
def admin():
    s = _login("admin@kapitalmitte.com", "admin123")
    yield s
    # cleanup
    s.patch(f"{BASE_URL}/api/admin/ipo/catalog/{ASPEN}",
            json={"entry_price_eur": None, "estimated_value_eur": None, "value_updated_at": None})


@pytest.fixture(scope="module")
def cust():
    return _login("tester@mester.de", "HHHKKK222")


def _cat(cust):
    r = cust.get(f"{BASE_URL}/api/ipo/catalog")
    assert r.status_code == 200
    return {i["company_name"]: i for i in r.json()}


@pytest.mark.parametrize("entry,est,eur,pct", [
    (500, 580, 80.0, 16.0), (500, 450, -50.0, -10.0), (500, 500, 0.0, 0.0), (3, 1, -2.0, -66.67),
])
def test_patch_and_customer_read(admin, cust, entry, est, eur, pct):
    r = admin.patch(f"{BASE_URL}/api/admin/ipo/catalog/{ASPEN}",
                    json={"entry_price_eur": entry, "estimated_value_eur": est, "value_updated_at": "2026-01-15"})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["value_change_eur"] == eur and d["value_change_pct"] == pct
    a = _cat(cust)["Aspen Neuroscience"]
    assert a["entry_price_eur"] == entry and a["estimated_value_eur"] == est
    assert a["value_updated_at"] == "2026-01-15"
    assert a["value_change_eur"] == eur and a["value_change_pct"] == pct


def test_fields_null_for_bambusa(cust):
    b = _cat(cust)["Bambusa Therapeutics"]
    for k in ["entry_price_eur", "estimated_value_eur", "value_updated_at", "value_change_eur", "value_change_pct"]:
        assert k in b and b[k] is None


def test_customer_patch_forbidden(cust):
    r = cust.patch(f"{BASE_URL}/api/admin/ipo/catalog/{ASPEN}", json={"entry_price_eur": 1})
    assert r.status_code == 403


@pytest.mark.parametrize("body", [
    {"entry_price_eur": -1}, {"estimated_value_eur": -5}, {"value_updated_at": "15.01.2026"},
    {"entry_price_eur": "abc"},
])
def test_invalid_422(admin, body):
    r = admin.patch(f"{BASE_URL}/api/admin/ipo/catalog/{ASPEN}", json=body)
    assert r.status_code == 422


def test_entry_zero_no_change(admin):
    r = admin.patch(f"{BASE_URL}/api/admin/ipo/catalog/{ASPEN}",
                    json={"entry_price_eur": 0, "estimated_value_eur": 10})
    assert r.status_code == 200
    assert r.json()["value_change_pct"] is None


def test_unauth_catalog(cust):
    r = requests.get(f"{BASE_URL}/api/ipo/catalog")
    assert r.status_code == 401
