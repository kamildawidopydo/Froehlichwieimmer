# Careers job board - 6 published jobs on PREVIEW (iteration 87) - READ-ONLY checks
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API = f"{BASE_URL}/api/careers"
PUBLISHED = {
    "berater-hamburg": "Hamburg",
    "berater-berlin": "Berlin",
    "finanzberater-frankfurt-am-main": "Frankfurt am Main",
    "sekretaer-frankfurt-am-main": "Frankfurt am Main",
    "finanzberater-bad-kreuznach": "Bad Kreuznach",
    "berater-bad-kreuznach": "Bad Kreuznach",
}
DRAFTS = ["berater-frankfurt-am-main", "junior-finanzberater"]
BANNED = ["gehalt", "€", "dienstwagen", "firmenwagen", "provision bis", "fixum", "jahreseinkommen"]


# --- anonymous job list ---
def test_status_disabled():
    d = requests.get(f"{API}/status").json()
    assert d["applications_enabled"] is False and d["is_staff"] is False


def test_jobs_anon_six_published():
    d = requests.get(f"{API}/jobs").json()
    assert d["published_total"] == 6
    got = {j["slug"]: j["location"] for j in d["items"]}
    assert got == PUBLISHED
    for j in d["items"]:
        assert j["status"] == "published" and j["title"] and j["employment_type"] and j["summary"]
        assert "_id" not in j


def test_jobs_anon_preview_param_no_drafts():
    d = requests.get(f"{API}/jobs", params={"preview": 1}).json()
    assert len(d["items"]) == 6


@pytest.mark.parametrize("city,exp", [
    ("Hamburg", {"berater-hamburg"}), ("Berlin", {"berater-berlin"}),
    ("Frankfurt am Main", {"finanzberater-frankfurt-am-main", "sekretaer-frankfurt-am-main"}),
    ("Bad Kreuznach", {"finanzberater-bad-kreuznach", "berater-bad-kreuznach"})])
def test_location_filter(city, exp):
    d = requests.get(f"{API}/jobs", params={"location": city}).json()
    assert {j["slug"] for j in d["items"]} == exp


def test_q_sekret():
    d = requests.get(f"{API}/jobs", params={"q": "Sekret"}).json()
    assert [j["slug"] for j in d["items"]] == ["sekretaer-frankfurt-am-main"]


# --- detail ---
@pytest.mark.parametrize("slug", list(PUBLISHED))
def test_detail_published(slug):
    r = requests.get(f"{API}/jobs/{slug}")
    assert r.status_code == 200
    j = r.json()
    assert j["location"] == PUBLISHED[slug]
    assert len(j["tasks"]) >= 3 and len(j["requirements"]) >= 3 and len(j["offer"]) >= 1
    blob = " ".join(j["tasks"] + j["requirements"] + j["offer"] + [j["summary"]]).lower()
    for b in BANNED:
        assert b not in blob, f"{slug} contains '{b}'"


def test_sekretaer_tasks():
    j = requests.get(f"{API}/jobs/sekretaer-frankfurt-am-main").json()
    t = " ".join(j["tasks"])
    for kw in ["Büroorganisation", "Terminplanung", "Korrespondenz", "Unterstützung der Geschäftsführung"]:
        assert kw in t
    assert j["title"] == "Sekretärin / Sekretär (m/w/d)" and j["employment_type"] == "Festanstellung"


@pytest.mark.parametrize("slug", DRAFTS)
def test_drafts_hidden(slug):
    assert requests.get(f"{API}/jobs/{slug}").status_code == 404


# --- applications disabled ---
def test_application_anon_403():
    r = requests.post(f"{API}/applications", data={
        "first_name": "TEST", "last_name": "X", "email": "test@example.com", "position": "Berater (m/w/d)",
        "preferred_location": "Hamburg", "privacy_consent": "true", "form_started_at": "1"})
    assert r.status_code == 403
    assert "nicht freigeschaltet" in r.json()["detail"]
