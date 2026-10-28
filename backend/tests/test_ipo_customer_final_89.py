# Customer IPO area – final API regression (iteration 89)
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
EMAIL = "tester@mester.de"
PW = "HHHKKK222"
HIDDEN = ["No-Ticker AG", "Preview Test1 AG", "Preview Test2 AG", "Preview Test3 AG"]
UNAVAILABLE = ["Syngenta", "Oura", "OPay", "OpenAI", "Dangote Refinery"]


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    r = sess.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PW})
    if r.status_code != 200:
        pytest.skip(f"login failed {r.status_code} {r.text[:200]}")
    return sess


@pytest.fixture(scope="module")
def catalog(s):
    r = s.get(f"{BASE_URL}/api/ipo/catalog")
    assert r.status_code == 200
    return {i["company_name"]: i for i in r.json()}


# Catalog content
def test_new_entries_present(catalog):
    for n in ["Anthropic", "Aspen Neuroscience", "Bambusa Therapeutics"] + UNAVAILABLE:
        assert n in catalog, n


def test_hidden_entries_absent(catalog):
    for n in HIDDEN:
        assert n not in catalog


def test_anthropic(catalog):
    a = catalog["Anthropic"]
    assert a["status"] == "filed" and a["ticker_proposed"] == "ANT"
    assert a["market"] == "Nasdaq Global Select Market"
    assert a["price_range_low"] is None and a["price_range_high"] is None
    assert a["expected_ipo_window"] == "Termin offiziell noch nicht festgelegt"
    assert a["prospectus_url"].endswith("2130357/000162828026067168/anthropicpbc-sx1.htm")
    assert "333-299633" in a["description"]


@pytest.mark.parametrize("name,tk,reg,url", [
    ("Aspen Neuroscience", "ASPE", "333-299393", "2124080/000119312526431023/na-20261026.htm"),
    ("Bambusa Therapeutics", "BBTX", "333-299405", "2044950/000162828026067119/bambusa-sx1a1.htm"),
])
def test_biotech(catalog, name, tk, reg, url):
    a = catalog[name]
    assert a["status"] == "upcoming" and a["ticker_proposed"] == tk
    assert a["price_range_low"] == 15 and a["price_range_high"] == 17
    assert reg in a["description"] and "9.375.000 Aktien zu 15–17 USD" in a["description"]
    assert a["prospectus_url"].endswith(url)


def test_unavailable_status(catalog):
    for n in UNAVAILABLE:
        assert catalog[n]["status"] == "unavailable"


# Server-side guard: unavailable IPO not requestable
def test_unavailable_request_rejected(s, catalog):
    r = s.post(f"{BASE_URL}/api/ipo/requests", json={"ipo_id": catalog["OpenAI"]["id"], "shares_requested": 1, "notes": "TEST_"})
    assert r.status_code in (400, 409, 422), r.text


def test_extra_fields_forbidden(s, catalog):
    r = s.post(f"{BASE_URL}/api/ipo/requests", json={"ipo_id": catalog["Aspen Neuroscience"]["id"], "status": "approved"})
    assert r.status_code == 422


def test_requests_me(s):
    r = s.get(f"{BASE_URL}/api/ipo/requests/me")
    assert r.status_code == 200 and isinstance(r.json(), list)


def test_unauth_catalog_request_rejected():
    r = requests.post(f"{BASE_URL}/api/ipo/requests", json={"ipo_id": "x"})
    assert r.status_code in (401, 403)
