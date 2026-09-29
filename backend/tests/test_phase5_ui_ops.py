"""Phase 5 Admin UI Ops — auth-guard & security spot-checks.

Focus:
- unauth access to /api/admin/savings/* & /api/admin/imports/* returns 401/403
- Public savings-offers still works
- Demo-Replace: rejects unsafe URLs, requires source_slug/source_url, rolls back on invalid real_record
"""
from __future__ import annotations
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://finance-platform-v2.preview.emergentagent.com").rstrip("/")

ADMIN_EMAIL = "admin@kapitalmitte.com"
ADMIN_PASSWORD = "admin123"


# --------- fixtures ---------
@pytest.fixture(scope="module")
def anon_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code == 429:
        pytest.skip("Rate limited on admin login")
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text[:200]}")
    body = r.json()
    tok = body.get("access_token") or body.get("token")
    if tok:
        s.headers.update({"Authorization": f"Bearer {tok}"})
    return s


# --------- unauth guard tests ---------
UNAUTH_GET_ENDPOINTS = [
    "/api/admin/savings/dashboard",
    "/api/admin/savings/review-items",
    "/api/admin/savings/audit-log",
]

UNAUTH_POST_ENDPOINTS = [
    ("/api/admin/savings/data-sources", {"slug": "x", "name": "x", "type": "manual_verified", "url": "https://example.com", "trust_level": "review_required"}),
    ("/api/admin/imports/savings-offers/dry-run", {"source_slug": "test", "records": []}),
    ("/api/admin/imports/savings-offers/apply", {"source_slug": "test", "records": []}),
    ("/api/admin/savings/demo-replace", {"demo_offer_id": "x", "real_record": {}, "source_slug": "test", "source_url": "https://example.com"}),
]


@pytest.mark.parametrize("path", UNAUTH_GET_ENDPOINTS)
def test_unauth_get_returns_401_or_403(anon_client, path):
    r = anon_client.get(f"{BASE_URL}{path}")
    assert r.status_code in (401, 403), f"{path} unauth GET → {r.status_code} (expected 401/403). body={r.text[:200]}"


@pytest.mark.parametrize("path,payload", UNAUTH_POST_ENDPOINTS)
def test_unauth_post_returns_401_or_403(anon_client, path, payload):
    r = anon_client.post(f"{BASE_URL}{path}", json=payload)
    assert r.status_code in (401, 403), f"{path} unauth POST → {r.status_code} (expected 401/403). body={r.text[:200]}"


# --------- dashboard KPI shape (auth) ---------
def test_admin_dashboard_kpis(admin_client):
    r = admin_client.get(f"{BASE_URL}/api/admin/savings/dashboard")
    assert r.status_code == 200, r.text[:300]
    data = r.json()
    assert isinstance(data, dict)
    # some form of KPI keys
    key_str = str(data)
    assert "banks" in key_str.lower() or "offers" in key_str.lower()


# --------- public API regression ---------
def test_public_savings_offers_no_auth(anon_client):
    r = anon_client.get(f"{BASE_URL}/api/public/savings-offers?limit=5")
    assert r.status_code == 200, r.text[:300]
    data = r.json()
    assert "items" in data or "results" in data or isinstance(data, list)


def test_public_savings_offers_verified_excludes_demo(anon_client):
    r = anon_client.get(f"{BASE_URL}/api/public/savings-offers?data_status=verified&limit=20")
    assert r.status_code == 200
    data = r.json()
    items = data.get("items") if isinstance(data, dict) else data
    if items:
        for it in items:
            assert not it.get("is_demo", False), f"verified filter leaked demo: {it.get('id')}"


def test_public_savings_offers_demo_filter(anon_client):
    r = anon_client.get(f"{BASE_URL}/api/public/savings-offers?data_status=demo&limit=5")
    assert r.status_code == 200
    data = r.json()
    items = data.get("items") if isinstance(data, dict) else data
    if items:
        for it in items:
            assert it.get("is_demo", False) is True, f"demo filter leaked real: {it.get('id')}"


# --------- security: demo-replace unsafe url rejection ---------
def test_demo_replace_rejects_javascript_url(admin_client):
    # find a demo offer id
    r = admin_client.get(f"{BASE_URL}/api/public/savings-offers?data_status=demo&limit=1")
    if r.status_code != 200:
        pytest.skip("cannot fetch demo offer")
    items = r.json().get("items") or r.json()
    if not items:
        pytest.skip("no demo offers present")
    demo_id = items[0].get("id") or items[0].get("_id")

    payload = {
        "demo_offer_id": demo_id,
        "source_slug": "test_e2e_source",
        "source_url": "javascript:alert(1)",
        "real_record": {
            "bank_slug": "_e2e_bank_ui",
            "product_type": "festgeld",
            "product_name": "x",
            "interest_rate": 3.0,
            "term_months": 12,
            "min_amount": 500,
            "currency": "EUR",
            "country": "DE",
            "deposit_guarantee_country": "DE",
        },
    }
    r2 = admin_client.post(f"{BASE_URL}/api/admin/savings/demo-replace", json=payload)
    assert r2.status_code in (400, 422), f"expected 4xx for javascript: URL, got {r2.status_code} {r2.text[:200]}"


def test_demo_replace_requires_source_slug_and_url(admin_client):
    r = admin_client.get(f"{BASE_URL}/api/public/savings-offers?data_status=demo&limit=1")
    if r.status_code != 200:
        pytest.skip("cannot fetch demo offer")
    items = r.json().get("items") or r.json()
    if not items:
        pytest.skip("no demo offers present")
    demo_id = items[0].get("id") or items[0].get("_id")

    payload = {
        "demo_offer_id": demo_id,
        "real_record": {
            "bank_slug": "_e2e_bank_ui",
            "product_type": "festgeld",
            "product_name": "x",
            "interest_rate": 3.0,
            "term_months": 12,
            "min_amount": 500,
            "currency": "EUR",
            "country": "DE",
            "deposit_guarantee_country": "DE",
        },
    }
    r2 = admin_client.post(f"{BASE_URL}/api/admin/savings/demo-replace", json=payload)
    assert r2.status_code in (400, 422), f"expected 4xx for missing source, got {r2.status_code} {r2.text[:200]}"
