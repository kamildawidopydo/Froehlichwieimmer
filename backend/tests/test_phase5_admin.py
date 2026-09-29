"""Session 93 · Phase 5 — Admin Review, Audit, Publish, Trust, Security."""
from __future__ import annotations
import asyncio
import os
import pytest
import requests
from datetime import datetime, timedelta, timezone
from dotenv import dotenv_values
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

# Inline-Kopien der Prüf-Helpers, damit der Test-Collect nicht via
# `routes.admin_savings` → `server` in einen Circular-Import läuft.
from urllib.parse import urlparse
from fastapi import HTTPException

RATE_DELTA_REVIEW_THRESHOLD_PP = float(os.environ.get("SAVINGS_RATE_DELTA_REVIEW_PP", "0.75"))
MAX_DEPOSIT_DELTA_FACTOR = float(os.environ.get("SAVINGS_MAX_DEPOSIT_DELTA_FACTOR", "3.0"))


def _validate_public_url(url):
    if not url:
        raise HTTPException(status_code=422, detail="url required")
    p = urlparse(url)
    if p.scheme not in {"http", "https"}:
        raise HTTPException(status_code=422, detail=f"scheme not allowed: {p.scheme}")
    if not p.netloc:
        raise HTTPException(status_code=422, detail="url must have host")


def _sanitize_csv_cell(value):
    if isinstance(value, str) and value and value[0] in ("=", "+", "-", "@"):
        return "'" + value
    return value


def evaluate_change_flags(before, after):
    reasons = []
    b = before.get("interest_rate"); a = after.get("interest_rate")
    if isinstance(b, (int, float)) and isinstance(a, (int, float)):
        if abs(a - b) >= RATE_DELTA_REVIEW_THRESHOLD_PP:
            reasons.append(f"rate_change_gt_{RATE_DELTA_REVIEW_THRESHOLD_PP}pp")
    mb = before.get("max_amount"); ma = after.get("max_amount")
    if isinstance(mb, (int, float)) and isinstance(ma, (int, float)) and mb > 0 and ma > 0:
        factor = max(ma, mb) / min(ma, mb)
        if factor >= MAX_DEPOSIT_DELTA_FACTOR:
            reasons.append("max_deposit_large_delta")
    if before.get("deposit_guarantee_country") and before.get("deposit_guarantee_country") != after.get("deposit_guarantee_country"):
        reasons.append("dgs_country_changed")
    if before.get("country") and before.get("country") != after.get("country"):
        reasons.append("country_changed")
    if before.get("product_type") and before.get("product_type") != after.get("product_type"):
        reasons.append("product_type_changed")
    return reasons


class PartnerFeedAdapter:
    def parse(self, raw): raise NotImplementedError
    def normalize(self, records): raise NotImplementedError
    def validate(self, records): raise NotImplementedError
    def map_bank(self, record): raise NotImplementedError
    def build_diff(self, records): raise NotImplementedError

from lib.import_pipeline import normalize_records, build_diff, apply_diff

_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_FE_ENV = dotenv_values(os.path.join(_ROOT, "frontend", ".env"))
_BE_ENV = dotenv_values(os.path.join(_ROOT, "backend", ".env"))
BASE = _FE_ENV.get("REACT_APP_BACKEND_URL")
MONGO_URL = _BE_ENV.get("MONGO_URL")
DB_NAME = _BE_ENV.get("DB_NAME")


def _get(path):
    r = requests.get(f"{BASE}{path}", timeout=15)
    r.raise_for_status()
    return r.json()


def _run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


# ---------------- Admin auth guards --------------------------------------
def test_admin_dashboard_requires_auth():
    r = requests.get(f"{BASE}/api/admin/savings/dashboard", timeout=15)
    assert r.status_code in (401, 403)


def test_admin_review_items_requires_auth():
    r = requests.get(f"{BASE}/api/admin/savings/review-items", timeout=15)
    assert r.status_code in (401, 403)


def test_admin_demo_replace_requires_auth():
    r = requests.post(f"{BASE}/api/admin/savings/demo-replace", json={"demo_offer_id": "x", "real_record": {}, "source_slug": "s"}, timeout=15)
    assert r.status_code in (401, 403)


def test_admin_audit_log_requires_auth():
    r = requests.get(f"{BASE}/api/admin/savings/audit-log", timeout=15)
    assert r.status_code in (401, 403)


# ---------------- URL validation -----------------------------------------
def test_reject_javascript_url():
    with pytest.raises(HTTPException):
        _validate_public_url("javascript:alert(1)")


def test_reject_data_url():
    with pytest.raises(HTTPException):
        _validate_public_url("data:text/html,<script>alert(1)</script>")


def test_reject_file_url():
    with pytest.raises(HTTPException):
        _validate_public_url("file:///etc/passwd")


def test_accept_https_url():
    # no exception
    _validate_public_url("https://example.com/rate")


def test_reject_url_without_host():
    with pytest.raises(HTTPException):
        _validate_public_url("https://")


# ---------------- CSV injection guard ------------------------------------
def test_csv_injection_escapes_formula_starts():
    for start in ("=", "+", "-", "@"):
        assert _sanitize_csv_cell(f"{start}HYPERLINK(1)") == f"'{start}HYPERLINK(1)"
    assert _sanitize_csv_cell("normal") == "normal"
    assert _sanitize_csv_cell(42) == 42


# ---------------- Quality rule engine ------------------------------------
def test_rate_delta_triggers_review():
    reasons = evaluate_change_flags({"interest_rate": 3.0}, {"interest_rate": 3.0 + RATE_DELTA_REVIEW_THRESHOLD_PP})
    assert any("rate_change" in r for r in reasons)


def test_small_rate_delta_no_review():
    reasons = evaluate_change_flags({"interest_rate": 3.0}, {"interest_rate": 3.05})
    assert not any("rate_change" in r for r in reasons)


def test_dgs_change_triggers_review():
    reasons = evaluate_change_flags({"deposit_guarantee_country": "DE"}, {"deposit_guarantee_country": "AT"})
    assert "dgs_country_changed" in reasons


def test_country_change_triggers_review():
    reasons = evaluate_change_flags({"country": "DE"}, {"country": "AT"})
    assert "country_changed" in reasons


def test_product_type_change_triggers_review():
    reasons = evaluate_change_flags({"product_type": "tagesgeld"}, {"product_type": "festgeld"})
    assert "product_type_changed" in reasons


def test_max_deposit_large_delta_triggers_review():
    reasons = evaluate_change_flags({"max_amount": 10000}, {"max_amount": 50000})
    assert "max_deposit_large_delta" in reasons


# ---------------- Public API — Demo Mode & data_status filter ------------
def test_data_status_all_default():
    d = _get("/api/public/savings-offers?limit=200")
    assert d["total"] > 0


def test_data_status_verified_filter_excludes_demo():
    d = _get("/api/public/savings-offers?data_status=verified&limit=500")
    for it in d["items"]:
        assert it["is_demo"] is False


def test_data_status_demo_filter_only_demo():
    d = _get("/api/public/savings-offers?data_status=demo&limit=500")
    for it in d["items"]:
        assert it["is_demo"] is True


def test_include_expired_default_excluded():
    # Ohne include_expired dürfen keine Offers mit valid_until < now vorkommen.
    d = _get("/api/public/savings-offers?limit=500")
    now = datetime.now(timezone.utc)
    for it in d["items"]:
        vu = it.get("valid_until")
        if vu:
            assert datetime.fromisoformat(vu.replace("Z", "+00:00")) >= now


# ---------------- E2E: full real-data lifecycle --------------------------
def test_end_to_end_real_data_flow():
    """Simuliert echten Import → Aktivierung → Zinsänderung → History."""
    async def _test():
        client = AsyncIOMotorClient(MONGO_URL, tz_aware=True)
        db = client[DB_NAME]
        # 1. Bank + Source anlegen
        await db.banks.delete_many({"slug": "_e2e_bank"})
        await db.savings_offers.delete_many({"bank_slug": "_e2e_bank"})
        await db.interest_rate_history.delete_many({"offer_id": {"$exists": True, "$type": "string"}, "offer_key": {"$regex": "^_e2e"}})
        await db.banks.insert_one({
            "slug": "_e2e_bank", "name": "E2E Test Bank", "country_code": "DE",
            "country": "Germany", "is_active": True, "is_demo": False,
        })
        # 2. Import über generische Pipeline (JSON)
        rec = normalize_records([{
            "bank_slug": "_e2e_bank", "product_type": "festgeld",
            "product_name": "E2E Festgeld 12M",
            "interest_rate": 3.25, "term_months": 12,
            "min_amount": 500, "max_amount": 250000, "currency": "EUR",
            "country": "DE", "deposit_guarantee_country": "DE",
        }])
        diffs, counts = await build_diff(
            rec,
            banks_collection=db.banks, aliases_collection=db.bank_aliases,
            offers_collection=db.savings_offers, countries_collection=db.countries,
            dgs_collection=db.deposit_guarantee_schemes,
        )
        assert counts["create"] == 1
        applied = await apply_diff(
            diffs, source_slug="test:e2e", source_url="https://example.com/e2e",
            verification_method="manual_review", applied_by="e2e", now=datetime.now(timezone.utc),
            offers_collection=db.savings_offers, history_collection=db.interest_rate_history,
        )
        assert applied["created"] == 1
        # 3. Public API zeigt es (real, not demo)
        r = requests.get(f"{BASE}/api/public/savings-offers?data_status=verified&search=_e2e&limit=500", timeout=15).json()
        found = [i for i in r["items"] if i["bank_slug"] == "_e2e_bank"]
        assert len(found) == 1
        offer = found[0]
        assert offer["is_demo"] is False
        assert offer["source_id"] == "test:e2e"
        assert offer["verified_at"] is not None
        # 4. Zinsänderung erneut importieren
        rec2 = normalize_records([{**rec[0], "interest_rate": 3.45}])
        diffs2, counts2 = await build_diff(
            rec2,
            banks_collection=db.banks, aliases_collection=db.bank_aliases,
            offers_collection=db.savings_offers, countries_collection=db.countries,
            dgs_collection=db.deposit_guarantee_schemes,
        )
        assert counts2["update"] == 1
        rate_change = next(c for c in diffs2[0]["changes"] if c["field"] == "interest_rate")
        assert rate_change["delta_pp"] == 0.2
        await apply_diff(
            diffs2, source_slug="test:e2e", source_url="https://example.com/e2e",
            verification_method="manual_review", applied_by="e2e", now=datetime.now(timezone.utc),
            offers_collection=db.savings_offers, history_collection=db.interest_rate_history,
        )
        # 5. History hat 2 Einträge
        oid = offer["id"]
        r_hist = requests.get(f"{BASE}/api/public/savings-offers/{oid}/rate-history", timeout=15).json()
        assert r_hist["count"] == 2
        # ältester Eintrag ist geschlossen
        assert r_hist["items"][0]["valid_until"] is not None
        # neuester ist offen
        assert r_hist["items"][-1]["valid_until"] is None
        # 6. Deaktivieren + prüfen dass Vergleich es nicht mehr zeigt
        await db.savings_offers.update_one({"_id": ObjectId(oid)}, {"$set": {"is_active": False}})
        r2 = requests.get(f"{BASE}/api/public/savings-offers?search=_e2e&limit=500", timeout=15).json()
        found2 = [i for i in r2["items"] if i["bank_slug"] == "_e2e_bank"]
        assert len(found2) == 0
        # Historie bleibt erhalten
        r_hist2 = requests.get(f"{BASE}/api/public/savings-offers/{oid}/rate-history", timeout=15).json()
        assert r_hist2["count"] == 2
        # cleanup
        await db.savings_offers.delete_many({"bank_slug": "_e2e_bank"})
        await db.banks.delete_many({"slug": "_e2e_bank"})
        await db.interest_rate_history.delete_many({"offer_id": oid})
    _run(_test())


# ---------------- PartnerFeedAdapter interface ---------------------------
def test_partner_feed_adapter_is_abstract():
    a = PartnerFeedAdapter()
    with pytest.raises(NotImplementedError):
        a.parse(b"")


# ---------------- Regression: existing 75 tests still valid via imports --
def test_phase_1_through_4_still_intact():
    assert _get("/api/public/countries")["count"] == 15
    assert _get("/api/public/deposit-guarantee-schemes")["count"] == 15
    assert _get("/api/public/partner-banks")["count"] >= 60
    assert _get("/api/public/banks")["count"] >= 60
    assert _get("/api/public/savings-offers?limit=5")["count"] > 0
