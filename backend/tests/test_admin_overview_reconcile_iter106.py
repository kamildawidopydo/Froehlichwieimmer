# Iter106: READ-ONLY. Admin overview perf + exact reconciliation admin vs customer view (test_eur_qa). NO writes.
import os
import time
from datetime import date, datetime
from zoneinfo import ZoneInfo

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
QA_ID = None


def _qa_id(admin):
    global QA_ID
    if QA_ID is None:
        ov = admin.get(f"{BASE_URL}/api/admin/customers/overview", timeout=60).json()
        QA_ID = next(i["id"] for i in ov["items"] if i["email"] == CUST[0])
    return QA_ID


def _login(email, pw):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pw}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"login failed {email}: {r.status_code}")
    return s


@pytest.fixture(scope="module")
def admin():
    s = _login(*ADMIN)
    _qa_id(s)
    return s


@pytest.fixture(scope="module")
def customer():
    return _login(*CUST)


def _list(d, *keys):
    if isinstance(d, list):
        return d
    for k in keys:
        if isinstance(d, dict) and isinstance(d.get(k), list):
            return d[k]
    return []


def _day(v):
    return datetime.strptime(str(v)[:10], "%Y-%m-%d").date() if v else None


def _contract_value(c, today):
    # Mirror of frontend computeContractMetrics.currentValueGross
    amount = max(0.0, float(c.get("amount_eur") or 0))
    rate = float(c.get("zinssatz") or 0)
    months = max(0.0, float(c.get("laufzeit_monate") or 0))
    s, e = _day(c.get("active_from")), _day(c.get("active_until"))
    total = max((e - s).days, 0) if (s and e) else (round(months * 30.4375) if months else 0)
    raw = (today - s).days if s else 0
    passed = max(0, min(raw, total or raw))
    return amount, amount * rate / 100 * passed / 365.25


# --- perf: overview 5x
def test_overview_load_time(admin):
    times = []
    for _ in range(5):
        t = time.perf_counter()
        r = admin.get(f"{BASE_URL}/api/admin/customers/overview", timeout=60)
        times.append(round(time.perf_counter() - t, 3))
        assert r.status_code == 200
    print(f"\nOVERVIEW_TIMES {times}")
    assert sorted(times)[2] < 1.5, times


def test_overview_requires_admin(customer):
    assert requests.get(f"{BASE_URL}/api/admin/customers/overview", timeout=30).status_code in (401, 403)
    assert customer.get(f"{BASE_URL}/api/admin/customers/overview", timeout=30).status_code == 403


# --- exact reconciliation customer API (frontend rules) vs admin overview
def test_reconcile_customer_vs_admin(admin, customer):
    today = datetime.now(ZoneInfo("Europe/Berlin")).date()
    cash = customer.get(f"{BASE_URL}/api/portfolio/cash", timeout=30).json()
    contracts = _list(customer.get(f"{BASE_URL}/api/portfolio/depot-contracts", timeout=30).json(), "contracts", "items", "data")
    bonds = _list(customer.get(f"{BASE_URL}/api/portfolio/bond-positions", timeout=30).json(), "positions", "items", "data")
    stocks = _list(customer.get(f"{BASE_URL}/api/portfolio/stock-positions", timeout=30).json(), "positions", "items", "data")
    ipo = _list(customer.get(f"{BASE_URL}/api/ipo/requests/me", timeout=30).json(), "requests", "items", "data")
    syms = sorted({p["symbol"] for p in stocks})
    q_cust = customer.get(f"{BASE_URL}/api/portfolio/quotes", params={"symbols": ",".join(syms)}, timeout=60).json()
    det = admin.get(f"{BASE_URL}/api/admin/customers/{QA_ID}/details", timeout=60).json()
    ov = admin.get(f"{BASE_URL}/api/admin/customers/overview", timeout=60).json()
    item = next(i for i in ov["items"] if i["id"] == QA_ID)

    c_cash = float(cash.get("cash_balance") or 0)
    act = [c for c in contracts if c.get("is_active")]
    princ = sum(_contract_value(c, today)[0] for c in act)
    accr = sum(_contract_value(c, today)[1] for c in act)
    c_bonds = sum(float(b.get("nominal_betrag") or 0) * float(b.get("aktueller_kurs") or 0) / 100 for b in bonds if b.get("is_active"))
    qmap = q_cust if isinstance(q_cust, dict) and "quotes" not in q_cust else q_cust.get("quotes", {})
    print(f"\nQUOTES_CUSTOMER keys={list(qmap.keys()) if isinstance(qmap, dict) else qmap}")
    print(f"IPO_REQS {[(r.get('ticker'), r.get('position_symbol'), r.get('status'), r.get('listing_price_per_share'), r.get('use_admin_valuation')) for r in ipo]}")
    ipo_val = {}
    for r in sorted(ipo, key=lambda x: str(x.get("valuation_set_at") or x.get("approved_at") or x.get("created_at") or "")):
        if r.get("status") in ("approved", "allocated") and r.get("use_admin_valuation") is not False and float(r.get("listing_price_per_share") or 0) > 0:
            t = str(r.get("ticker") or "").upper()
            for s in {t, str(r.get("position_symbol") or "").upper() or (t if t.startswith("IPO-") else f"IPO-{t}")}:
                ipo_val[s] = float(r["listing_price_per_share"])
    c_stocks, a_stocks = 0.0, 0.0
    for p in stocks:
        sym, qty = p["symbol"], float(p.get("quantity") or 0)
        mp = (qmap.get(sym) or {}).get("price") if isinstance(qmap, dict) else None
        cp = ipo_val.get(sym, mp if mp is not None else float(p.get("avg_cost") or 0))
        ap = det["price_map"].get(sym, float(p.get("avg_cost") or 0))
        c_stocks += qty * cp
        a_stocks += qty * ap
        print(f"SYM {sym} qty={qty} cust_px={cp} admin_px={ap} src={det['price_source'].get(sym, 'cost')} diff={round(qty*(cp-ap), 4)}")
    print(f"CASH cust={c_cash} admin={item['cash_balance']}")
    print(f"BONDS cust={c_bonds} admin={item['bonds_value']}")
    print(f"CONTRACTS principal cust={princ} admin={item['contracts_principal']} accrued cust={accr} admin={item['contracts_accrued_interest']} value admin={item['contracts_value']}")
    print(f"STOCKS cust={c_stocks} details={a_stocks} overview={item['stocks_value']}")
    c_total = c_cash + c_stocks + c_bonds + princ + accr
    print(f"TOTAL cust={round(c_total, 2)} admin={item['total_assets']}")
    assert round(c_cash, 2) == item["cash_balance"]
    assert round(c_bonds, 2) == item["bonds_value"]
    assert round(princ, 2) == item["contracts_principal"]
    assert round(accr, 2) == item["contracts_accrued_interest"]
    assert round(princ + accr, 2) == item["contracts_value"]
    assert item["contracts"] == len(act)


def test_ipo_price_sources(admin):
    det = admin.get(f"{BASE_URL}/api/admin/customers/{QA_ID}/details", timeout=60).json()
    src = det["price_source"]
    assert src.get("TESTIPO") == "ipo_estimate"
    assert src.get("PRVT3") == "ipo_estimate"
    assert "PRVNV" not in det["price_map"]
    for s in ("AAPL", "DBK", "VOLV-B.ST"):
        assert src.get(s) == "market", (s, src)
    ov = admin.get(f"{BASE_URL}/api/admin/customers/overview", timeout=60).json()
    item = next(i for i in ov["items"] if i["id"] == QA_ID)
    print(f"\nFALLBACK {item['fallback_positions']} IPO_POS {item['ipo_positions']} POS {item['positions']}")
    assert item["fallback_positions"] >= 1
    assert item["ipo_positions"] == 2
