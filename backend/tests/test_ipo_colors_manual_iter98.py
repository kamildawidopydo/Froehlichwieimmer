# Iter98: IPO regression (valuation neutral/neg/pos, price lock, manual create w/o profit%, partial allocation, approve/reject, data integrity)
import os
import pytest
import requests
from decimal import Decimal

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN = ("qa.admin@kapital-direkt24.de", "Qa-ra46CVrWIW3wg6l5EI6IKqbx")
EUR_USER = ("test_eur_qa@example.com", "TestEur-Qa-2026!")
REG_USER = ("tester@mester.de", "HHHKKK222")
STATE = {}


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
def cust():
    return _login(*EUR_USER)


@pytest.fixture(scope="module")
def reg():
    return _login(*REG_USER)


def _reqs(admin):
    r = admin.get(f"{BASE_URL}/api/admin/ipo/requests", timeout=30)
    assert r.status_code == 200
    return r.json()


def _test_eur(admin):
    out = {}
    for d in _reqs(admin):
        if d.get("notes") == "TEST_EUR" and d.get("ticker"):
            out[d["ticker"]] = d
    return out


def _snap(s):
    cash = s.get(f"{BASE_URL}/api/portfolio/cash", timeout=30).json()
    pos = s.get(f"{BASE_URL}/api/portfolio/stock-positions", timeout=30)
    me = s.get(f"{BASE_URL}/api/ipo/requests/me", timeout=30)
    hist = sorted((h["id"], h["amount"], h["status"]) for h in cash.get("history", []))
    return cash.get("cash_balance"), hist, pos.status_code, pos.text, me.text


def _patch(admin, rid, body):
    return admin.patch(f"{BASE_URL}/api/admin/ipo/requests/{rid}/valuation", json=body, timeout=30)


# --- Snapshot regression account before anything else ---
def test_00_snapshot_regression(reg, cust, admin):
    STATE["reg_before"] = _snap(reg)
    STATE["eur_before"] = _snap(cust)
    STATE["non_test_before"] = sorted(
        (d["id"], d["status"], str(d.get("valuation"))) for d in _reqs(admin) if not str(d.get("notes") or "").startswith("TEST_EUR"))
    assert STATE["reg_before"][0] is not None


# --- PRVT3 valuation neutral -> negative -> positive, no cash effect ---
def test_prvt3_neutral_neg_pos(admin, cust):
    t = _test_eur(admin)
    rid = t["PRVT3"]["id"]
    for val, profit, pct in (("40,00", "0.00", "0.00"), ("30", "-100.00", "-25.00"), ("50", "100.00", "25.00")):
        r = _patch(admin, rid, {"listing_price_per_share": val})
        assert r.status_code == 200, r.text
        v = r.json()["valuation"]
        assert v["estimated_profit"] == profit and v["estimated_return_pct"] == pct, (val, v)
        assert v["total_cost"] == "400.00"
    assert _snap(cust)[0] == STATE["eur_before"][0]


def test_allocated_price_lock(admin):
    rid = _test_eur(admin)["PRVT3"]["id"]
    r = _patch(admin, rid, {"subscription_price_per_share": "41"})
    assert r.status_code == 409
    r = _patch(admin, rid, {"subscription_price_per_share": "40.00"})
    assert r.status_code == 200


def test_prvnv_no_value(admin, cust):
    v = _test_eur(admin)["PRVNV"]["valuation"]
    assert v["estimated_profit"] is None and v["estimated_return_pct"] is None and v["estimated_total"] is None
    me = {d["id"]: d for d in cust.get(f"{BASE_URL}/api/ipo/requests/me", timeout=30).json()}
    assert me[_test_eur(admin)["PRVNV"]["id"]]["valuation"]["estimated_profit"] is None


# --- Manual create (no profit %, no cash debit) ---
def _user_id(admin):
    t = _test_eur(admin)
    return t["PRVT3"].get("user_id") or (t["PRVT3"].get("customer") or {}).get("id")


def _visible_ipo(admin):
    r = admin.get(f"{BASE_URL}/api/ipo/catalog", timeout=30)
    assert r.status_code == 200
    items = r.json() if isinstance(r.json(), list) else r.json().get("items", [])
    assert items, "no visible IPO"
    return items[0]["id"]


def test_manual_create_with_valuation(admin, cust):
    uid = _user_id(admin)
    assert uid, "user id not resolvable"
    ipo = _visible_ipo(admin)
    r = admin.post(f"{BASE_URL}/api/admin/ipo/requests/create-for-user",
                   json={"user_id": uid, "ipo_id": ipo, "shares_requested": 10, "notes": "TEST_EUR manual98"}, timeout=30)
    if r.status_code == 409:
        pytest.skip(f"duplicate pending: {r.text}")
    assert r.status_code == 201, r.text
    rid = r.json()["id"]
    STATE["manual"] = (rid, ipo, uid)
    assert r.json()["status"] == "pending"
    p = _patch(admin, rid, {"subscription_price_per_share": "40.00", "listing_price_per_share": "50.00"})
    assert p.status_code == 200, p.text
    v = p.json()["valuation"]
    assert v["shares_basis"] == "requested" and v["shares"] == 10
    assert v["estimated_profit"] == "100.00" and v["estimated_return_pct"] == "25.00"
    assert _snap(cust)[0] == STATE["eur_before"][0], "manual create debited cash"
    # profit% field must be rejected (extra=forbid)
    bad = _patch(admin, rid, {"profit_percent": "10"})
    assert bad.status_code == 422


def test_manual_reject_then_approve(admin, cust):
    if "manual" not in STATE:
        pytest.skip("no manual request")
    rid, ipo, uid = STATE["manual"]
    rj = admin.post(f"{BASE_URL}/api/admin/ipo/requests/{rid}/reject", json={"decision_note": "TEST_EUR"}, timeout=30)
    assert rj.status_code == 200 and rj.json()["status"] == "rejected"
    r = admin.post(f"{BASE_URL}/api/admin/ipo/requests/create-for-user",
                   json={"user_id": uid, "ipo_id": ipo, "shares_requested": 3, "notes": "TEST_EUR approve98"}, timeout=30)
    assert r.status_code == 201, r.text
    rid2 = r.json()["id"]
    ap = admin.post(f"{BASE_URL}/api/admin/ipo/requests/{rid2}/approve", json={"decision_note": "TEST_EUR"}, timeout=30)
    assert ap.status_code == 200 and ap.json()["status"] == "approved", ap.text
    assert _snap(cust)[0] == STATE["eur_before"][0], "approve debited cash"


# --- Partial allocation PRVPA 6 of 10 @ 40 -> one 240 debit; re-save no extra debit ---
def test_partial_allocation(admin, cust):
    pa = _test_eur(admin)["PRVPA"]
    if pa["status"] != "approved":
        pytest.skip(f"PRVPA status {pa['status']}")
    before = cust.get(f"{BASE_URL}/api/portfolio/cash", timeout=30).json()
    r = admin.post(f"{BASE_URL}/api/admin/ipo/requests/{pa['id']}/allocate",
                   json={"allocated_shares": 6, "subscription_price_per_share": "40"}, timeout=60)
    assert r.status_code == 200, r.text
    after = cust.get(f"{BASE_URL}/api/portfolio/cash", timeout=30).json()
    assert Decimal(str(before["cash_balance"])) - Decimal(str(after["cash_balance"])) == Decimal("240")
    new = [h for h in after["history"] if h["id"] not in {x["id"] for x in before["history"]}]
    assert len(new) == 1 and Decimal(new[0]["amount"]) == Decimal("240"), new
    for val in ("45", "45,00"):
        p = _patch(admin, pa["id"], {"listing_price_per_share": val})
        assert p.status_code == 200
        v = p.json()["valuation"]
        assert v["shares"] == 6 and v["shares_basis"] == "allocated"
        assert v["total_cost"] == "240.00" and v["estimated_profit"] == "30.00" and v["estimated_return_pct"] == "12.50"
    again = cust.get(f"{BASE_URL}/api/portfolio/cash", timeout=30).json()
    assert again["cash_balance"] == after["cash_balance"]
    dup = admin.post(f"{BASE_URL}/api/admin/ipo/requests/{pa['id']}/allocate",
                     json={"allocated_shares": 6, "subscription_price_per_share": "40"}, timeout=60)
    assert dup.status_code != 500
    final = cust.get(f"{BASE_URL}/api/portfolio/cash", timeout=30).json()
    assert final["cash_balance"] == after["cash_balance"], "second allocate double-debited"


# --- Data integrity ---
def test_zz_regression_unchanged(reg, admin):
    assert _snap(reg) == STATE["reg_before"], "tester@mester.de data changed"
    now = sorted((d["id"], d["status"], str(d.get("valuation"))) for d in _reqs(admin)
                 if not str(d.get("notes") or "").startswith("TEST_EUR"))
    assert now == STATE["non_test_before"], "non-TEST_EUR requests changed"
