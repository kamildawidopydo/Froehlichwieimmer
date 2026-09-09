"""Session 82.94 — Position Adjustment endpoints (stock + bond)."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://finance-platform-v2.preview.emergentagent.com").rstrip("/")

ADMIN_EMAIL = "patron@froehlich-vermoegensberatung.de"
ADMIN_PASS = "500Euro!"
USER_EMAIL = "demo.kunde@kapital-direkt24.de"
USER_PASS = "KundeDemo2026!"
DEMO_USER_ID = "6a9a8ff9b7e467c362ff91c8"


def _login(email, password):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"login {email}: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def admin():
    return _login(ADMIN_EMAIL, ADMIN_PASS)


@pytest.fixture(scope="module")
def user():
    return _login(USER_EMAIL, USER_PASS)


# ── Auth guards ─────────────────────────────────────────────────
def test_stock_list_anonymous_401():
    r = requests.get(f"{BASE_URL}/api/admin/portfolio/stock-positions", timeout=10)
    assert r.status_code == 401


def test_stock_list_customer_403(user):
    r = user.get(f"{BASE_URL}/api/admin/portfolio/stock-positions", timeout=10)
    assert r.status_code == 403


def test_bond_list_anonymous_401():
    r = requests.get(f"{BASE_URL}/api/admin/portfolio/bond-positions", timeout=10)
    assert r.status_code == 401


def test_bond_list_customer_403(user):
    r = user.get(f"{BASE_URL}/api/admin/portfolio/bond-positions", timeout=10)
    assert r.status_code == 403


def test_stock_adjust_anonymous_401():
    r = requests.post(
        f"{BASE_URL}/api/admin/portfolio/stock-position-adjustments",
        json={"target_user_id": DEMO_USER_ID, "symbol": "SAP", "delta_qty": "1",
              "reason": "data_repair", "idempotency_key": str(uuid.uuid4())},
        timeout=10,
    )
    assert r.status_code == 401


def test_stock_adjust_customer_403(user):
    r = user.post(
        f"{BASE_URL}/api/admin/portfolio/stock-position-adjustments",
        json={"target_user_id": DEMO_USER_ID, "symbol": "SAP", "delta_qty": "1",
              "reason": "data_repair", "idempotency_key": str(uuid.uuid4())},
        timeout=10,
    )
    assert r.status_code == 403


# ── Admin lists ─────────────────────────────────────────────────
def test_admin_stock_list(admin):
    r = admin.get(f"{BASE_URL}/api/admin/portfolio/stock-positions", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data and isinstance(data["items"], list)
    assert data["count"] >= 1
    it = data["items"][0]
    for f in ("id", "user_id", "symbol", "quantity", "avg_cost", "currency", "is_active", "updated_at"):
        assert f in it, f"missing {f} in {it}"
    assert it.get("user") is not None
    assert "email" in it["user"]


def test_admin_bond_list(admin):
    r = admin.get(f"{BASE_URL}/api/admin/portfolio/bond-positions", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["count"] >= 1
    it = data["items"][0]
    for f in ("id", "user_id", "isin", "nominal_amount", "denomination"):
        assert f in it


# ── Stock adjustments: applied / idempotent / rollback ─────────
def test_stock_adjust_applied_idempotent_rollback(admin):
    key1 = str(uuid.uuid4())
    body = {"target_user_id": DEMO_USER_ID, "symbol": "SAP", "delta_qty": "2",
            "reason": "data_repair", "idempotency_key": key1, "note": "TEST_8294"}
    r1 = admin.post(f"{BASE_URL}/api/admin/portfolio/stock-position-adjustments", json=body, timeout=15)
    assert r1.status_code == 201, r1.text
    d1 = r1.json()
    assert d1["status"] == "applied"
    assert d1["idempotent"] is False
    before1 = float(d1["before"]); after1 = float(d1["after"])
    assert after1 - before1 == 2

    # Replay same key
    r2 = admin.post(f"{BASE_URL}/api/admin/portfolio/stock-position-adjustments", json=body, timeout=15)
    assert r2.status_code in (200, 201)
    d2 = r2.json()
    assert d2["status"] == "already_applied"
    assert d2["idempotent"] is True

    # Rollback with new key
    key2 = str(uuid.uuid4())
    body2 = {**body, "delta_qty": "-2", "idempotency_key": key2}
    r3 = admin.post(f"{BASE_URL}/api/admin/portfolio/stock-position-adjustments", json=body2, timeout=15)
    assert r3.status_code == 201
    d3 = r3.json()
    assert d3["status"] == "applied"
    assert float(d3["after"]) == before1


def test_stock_invalid_reason_422(admin):
    r = admin.post(f"{BASE_URL}/api/admin/portfolio/stock-position-adjustments",
        json={"target_user_id": DEMO_USER_ID, "symbol": "SAP", "delta_qty": "1",
              "reason": "hax", "idempotency_key": str(uuid.uuid4())}, timeout=15)
    assert r.status_code == 422


def test_stock_negative_guard_409(admin):
    r = admin.post(f"{BASE_URL}/api/admin/portfolio/stock-position-adjustments",
        json={"target_user_id": DEMO_USER_ID, "symbol": "SAP", "delta_qty": "-999999",
              "reason": "data_repair", "idempotency_key": str(uuid.uuid4())}, timeout=15)
    assert r.status_code == 409
    assert "Negative" in r.json().get("detail", "")


# ── Bond adjustments ────────────────────────────────────────────
def test_bond_non_multiple_422(admin):
    r = admin.post(f"{BASE_URL}/api/admin/portfolio/bond-position-adjustments",
        json={"target_user_id": DEMO_USER_ID, "isin": "PT_BOND_03", "delta_nominal": "50",
              "denomination": "100", "reason": "data_repair", "idempotency_key": str(uuid.uuid4())}, timeout=15)
    assert r.status_code == 422
    assert "Vielfaches" in r.json().get("detail", "")


def test_bond_adjust_applied_and_rollback(admin):
    key1 = str(uuid.uuid4())
    body = {"target_user_id": DEMO_USER_ID, "isin": "PT_BOND_03", "delta_nominal": "100",
            "denomination": "100", "reason": "data_repair", "idempotency_key": key1}
    r1 = admin.post(f"{BASE_URL}/api/admin/portfolio/bond-position-adjustments", json=body, timeout=15)
    assert r1.status_code == 201, r1.text
    d1 = r1.json()
    assert d1["status"] == "applied"
    before1 = float(d1["before"]); after1 = float(d1["after"])
    assert after1 - before1 == 100

    # Rollback
    key2 = str(uuid.uuid4())
    r2 = admin.post(f"{BASE_URL}/api/admin/portfolio/bond-position-adjustments",
        json={**body, "delta_nominal": "-100", "idempotency_key": key2}, timeout=15)
    assert r2.status_code == 201
    assert float(r2.json()["after"]) == before1


# ── Audit trail ─────────────────────────────────────────────────
def test_audit_trail_filters(admin):
    r = admin.get(f"{BASE_URL}/api/admin/portfolio/position-adjustments", timeout=15)
    assert r.status_code == 200
    assert "items" in r.json()

    r2 = admin.get(f"{BASE_URL}/api/admin/portfolio/position-adjustments?kind=stock", timeout=15)
    assert r2.status_code == 200
    for it in r2.json()["items"]:
        assert it["kind"] == "stock"

    r3 = admin.get(f"{BASE_URL}/api/admin/portfolio/position-adjustments?kind=bond", timeout=15)
    assert r3.status_code == 200
    for it in r3.json()["items"]:
        assert it["kind"] == "bond"

    r4 = admin.get(f"{BASE_URL}/api/admin/portfolio/position-adjustments?user_id={DEMO_USER_ID}", timeout=15)
    assert r4.status_code == 200
    for it in r4.json()["items"]:
        assert it["target_user_id"] == DEMO_USER_ID
