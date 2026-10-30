# Iter104: read-only admin customer overview / per-customer IPO list / change-log (NO writes)
import os
import re
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

ADMIN = ("qa.admin@kapital-direkt24.de", "Qa-ra46CVrWIW3wg6l5EI6IKqbx")
CUST = ("test_eur_qa@example.com", "TestEur-Qa-2026!")


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
def customer():
    return _login(*CUST)


@pytest.fixture(scope="module")
def overview(admin):
    r = admin.get(f"{BASE_URL}/api/admin/customers/overview", timeout=90)
    assert r.status_code == 200, r.text[:300]
    return r.json()


@pytest.fixture(scope="module")
def qa_item(overview):
    it = [i for i in overview["items"] if i["email"] == CUST[0]]
    assert len(it) == 1, "seeded customer missing"
    return it[0]


# --- access control
def test_overview_unauth():
    r = requests.get(f"{BASE_URL}/api/admin/customers/overview", timeout=30)
    assert r.status_code in (401, 403)


def test_overview_non_admin(customer):
    r = customer.get(f"{BASE_URL}/api/admin/customers/overview", timeout=30)
    assert r.status_code in (401, 403)


def test_subroutes_non_admin(customer, qa_item):
    for p in ("ipo-requests", "change-log"):
        r = customer.get(f"{BASE_URL}/api/admin/customers/{qa_item['id']}/{p}", timeout=30)
        assert r.status_code in (401, 403), p


# --- structure / customer numbers
def test_overview_structure(overview):
    keys = {"id", "customer_number", "status", "status_label", "login_locked", "total_assets", "cash_balance",
            "cash_available", "positions", "ipo_positions", "contracts", "open_requests", "open_breakdown",
            "last_activity", "has_depot", "role"}
    assert overview["items"]
    for i in overview["items"]:
        assert keys <= set(i), keys - set(i)
        assert "_id" not in i and "password_hash" not in i
        assert i["status"] in ("active", "inactive", "blocked")
        assert i["status_label"] in ("Aktiv", "Inaktiv", "Gesperrt")
    assert "basis" in overview


def test_customer_numbers_unique(overview):
    nums = [i["customer_number"] for i in overview["items"]]
    assert len(nums) == len(set(nums))
    for i in overview["items"]:
        assert re.fullmatch(r"KD-[0-9A-F]{8,24}", i["customer_number"])
        assert i["id"].upper().endswith(i["customer_number"][3:])


def test_qa_customer_number_is_8(qa_item):
    assert qa_item["customer_number"] == "KD-" + qa_item["id"][-8:].upper()
    assert qa_item["status"] == "active" and qa_item["status_label"] == "Aktiv"


# --- seeded totals
def test_qa_counts(qa_item):
    assert qa_item["positions"] == 7, qa_item
    assert qa_item["contracts"] == 3
    assert qa_item["ipo_positions"] == 2  # TESTIPO + PRVT3 have an estimate
    assert qa_item["open_requests"] >= 1
    assert qa_item["open_breakdown"].get("ipo_requests", 0) >= 1
    assert qa_item["has_depot"] is True


def test_qa_total_assets_recomputed(admin, qa_item):
    r = admin.get(f"{BASE_URL}/api/portfolio/quotes", params={"symbols": "AAPL,VOLV-B.ST,DBK,PRVNV"}, timeout=60)
    assert r.status_code == 200
    q = r.json()
    stocks = 0.0
    fallback = 0
    for sym, qty, avg in (("AAPL", 3, 280), ("VOLV-B.ST", 10, 25), ("DBK", 20, 27), ("PRVNV", 5, 20)):
        p = (q.get(sym) or {}).get("price")
        if p is None:
            p = avg
            fallback += 1
        stocks += qty * p
    stocks += 4 * 25 + 10 * 50
    expected = qa_item["cash_balance"] + stocks + 980 + 1800
    print("expected", expected, "got", qa_item["total_assets"], "fallback", fallback, qa_item["fallback_positions"])
    # quotes may move slightly between the two calls (cache)
    assert abs(qa_item["total_assets"] - expected) < max(5.0, expected * 0.003)
    assert qa_item["contracts_value"] == 1800
    assert qa_item["fallback_positions"] == fallback + 1  # bond without aktueller_kurs valued at purchase pct


# --- per customer IPO list
def test_ipo_requests(admin, qa_item):
    r = admin.get(f"{BASE_URL}/api/admin/customers/{qa_item['id']}/ipo-requests", timeout=30)
    assert r.status_code == 200
    by = {x["ticker"]: x for x in r.json()}
    assert {"TESTIPO", "PRVT3", "PRVNV", "PRVPA"} <= set(by)
    assert by["TESTIPO"]["status"] == "allocated" and by["TESTIPO"]["shares"] == 4
    assert by["TESTIPO"]["subscription_price"] == 20 and by["TESTIPO"]["listing_price"] == 25
    assert by["PRVT3"]["shares"] == 10 and by["PRVT3"]["listing_price"] == 50
    assert by["PRVNV"]["listing_price"] is None
    assert by["PRVPA"]["status"] == "approved"


def test_ipo_requests_bad_id(admin):
    assert admin.get(f"{BASE_URL}/api/admin/customers/xyz/ipo-requests", timeout=30).status_code == 400
    assert admin.get(f"{BASE_URL}/api/admin/customers/{'0'*24}/ipo-requests", timeout=30).status_code == 404


# --- change log
def test_change_log(admin, qa_item):
    r = admin.get(f"{BASE_URL}/api/admin/customers/{qa_item['id']}/change-log", timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert isinstance(d["items"], list) and len(d["not_logged"]) >= 3
    for e in d["items"]:
        assert "area" in e and "admin_label" in e and "complete" in e
    areas = {e["area"] for e in d["items"]}
    print("areas", areas, len(d["items"]))
    assert "Vertrag angelegt" in areas


def test_change_log_bad_id(admin):
    assert admin.get(f"{BASE_URL}/api/admin/customers/{'0'*24}/change-log", timeout=30).status_code == 404
