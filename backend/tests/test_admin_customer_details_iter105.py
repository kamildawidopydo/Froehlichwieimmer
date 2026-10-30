# Iter105: read-only GET /api/admin/customers/{id}/details + consistency with overview/assets (NO writes)
import os
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
QA_ID = "6ae46a0be3b6155b0a980904"


def _login(email, pw):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pw}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"login failed {email}: {r.status_code}")
    return s


@pytest.fixture(scope="module")
def admin():
    return _login(*ADMIN)


@pytest.fixture(scope="module")
def customer():
    return _login(*CUST)


@pytest.fixture(scope="module")
def details(admin):
    r = admin.get(f"{BASE_URL}/api/admin/customers/{QA_ID}/details", timeout=90)
    assert r.status_code == 200, r.text[:300]
    return r.json()


@pytest.fixture(scope="module")
def assets(admin):
    r = admin.get(f"{BASE_URL}/api/admin/customers/{QA_ID}/assets", timeout=60)
    assert r.status_code == 200, r.text[:300]
    return r.json()


# --- access control
def test_details_unauth():
    r = requests.get(f"{BASE_URL}/api/admin/customers/{QA_ID}/details", timeout=30)
    assert r.status_code in (401, 403)


def test_details_customer_forbidden(customer):
    r = customer.get(f"{BASE_URL}/api/admin/customers/{QA_ID}/details", timeout=30)
    assert r.status_code == 403


def test_details_bad_ids(admin):
    assert admin.get(f"{BASE_URL}/api/admin/customers/notanid/details", timeout=30).status_code == 400
    assert admin.get(f"{BASE_URL}/api/admin/customers/000000000000000000000000/details", timeout=30).status_code == 404


# --- shape / values
def test_details_keys(details):
    for k in ("price_map", "price_source", "orders", "watchlist", "activity", "snapshots"):
        assert k in details
    assert "_id" not in str(details.keys())


def test_price_map_ipo_estimates(details):
    pm, ps = details["price_map"], details["price_source"]
    assert pm.get("TESTIPO") == 25 and ps.get("TESTIPO") == "ipo_estimate"
    assert pm.get("PRVT3") == 50 and ps.get("PRVT3") == "ipo_estimate"
    assert "PRVNV" not in pm  # no estimate -> fallback to cost
    for s in ("AAPL", "VOLV", "DBK"):
        found = [k for k in pm if k.startswith(s)]
        assert found, f"{s} missing in price_map {pm}"
        assert ps[found[0]] == "market" and pm[found[0]] > 0


def test_orders(details):
    o = details["orders"]
    assert len(o) == 4
    for x in o:
        assert isinstance(x["id"], str) and x["symbol"] and x["quantity"] > 0


def test_watchlist(details):
    assert len(details["watchlist"]) == 3
    assert all(w["symbol"] for w in details["watchlist"])


def test_activity(details):
    a = details["activity"]
    assert len(a) >= 4
    assert all(e["event_type"] and e["id"] for e in a)
    dates = [e["created_at"] or "" for e in a]
    assert dates == sorted(dates, reverse=True)


def test_total_consistency_with_overview(admin, details, assets):
    ov = admin.get(f"{BASE_URL}/api/admin/customers/overview", timeout=90).json()
    item = [i for i in ov["items"] if i["id"] == QA_ID][0]
    pm = details["price_map"]
    stocks = sum(float(p.get("quantity") or 0) * pm.get(str(p.get("symbol")).strip().upper(), float(p.get("avg_cost") or 0))
                 for p in assets["stock_positions"])
    bonds = sum(float(b.get("nominal_betrag") or 0) * float(b.get("aktueller_kurs") or 100) / 100
                for b in assets["bond_positions"] if b.get("is_active"))
    contracts = sum(float(c.get("amount_eur") or 0) for c in assets["depot_contracts"] if c.get("is_active"))
    total = float(assets.get("cash_balance") or 0) + stocks + bonds + contracts
    print("detail-calc total", total, "overview", item["total_assets"], "stocks", stocks)
    assert abs(total - item["total_assets"]) / item["total_assets"] < 0.01
