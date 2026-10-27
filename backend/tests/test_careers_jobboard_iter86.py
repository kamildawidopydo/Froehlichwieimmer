# Careers job board + application form (iteration 86) - READ-ONLY checks on PREVIEW
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API = f"{BASE_URL}/api/careers"
CITIES = ["Bad Kreuznach", "Berlin", "Frankfurt am Main", "Hamburg"]


@pytest.fixture(scope="module")
def admin():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@kapitalmitte.com", "password": "admin123"})
    if r.status_code != 200:
        pytest.skip(f"admin login failed {r.status_code}")
    tok = r.json().get("access_token") or r.json().get("token")
    if tok:
        s.headers["Authorization"] = f"Bearer {tok}"
    return s


# --- anonymous ---
def test_status_anon():
    d = requests.get(f"{API}/status").json()
    assert d["applications_enabled"] is False
    assert d["is_staff"] is False


def test_jobs_anon_empty_with_locations():
    d = requests.get(f"{API}/jobs").json()
    assert d["items"] == []
    assert d["published_total"] == 0
    assert d["locations"] == CITIES


def test_jobs_anon_preview_still_empty():
    d = requests.get(f"{API}/jobs", params={"preview": 1}).json()
    assert d["items"] == []


def test_application_anon_403():
    r = requests.post(f"{API}/applications", data={
        "first_name": "TEST", "last_name": "X", "email": "test@example.com", "position": "Berater",
        "preferred_location": "Hamburg", "privacy_consent": "true", "form_started_at": "1"})
    assert r.status_code == 403
    assert "nicht freigeschaltet" in r.json()["detail"]


def test_application_anon_no_phone_still_403():
    r = requests.post(f"{API}/applications", data={
        "first_name": "TEST", "last_name": "X", "email": "test@example.com", "position": "Berater",
        "privacy_consent": "true", "form_started_at": "1"})
    assert r.status_code == 403


# --- admin preview ---
def test_admin_status(admin):
    d = admin.get(f"{API}/status").json()
    assert d["is_staff"] is True and d["applications_enabled"] is False


def test_admin_preview_16_drafts(admin):
    d = admin.get(f"{API}/jobs", params={"preview": 1}).json()
    assert len(d["items"]) == 16
    assert all(j["status"] == "draft" for j in d["items"])
    assert d["published_total"] == 0
    assert d["locations"] == CITIES
    for j in d["items"]:
        assert j["title"] and j["location"] in CITIES and j["employment_type"] and j["summary"]
        assert "_id" not in j


@pytest.mark.parametrize("city", CITIES)
def test_admin_location_filter(admin, city):
    all_items = admin.get(f"{API}/jobs", params={"preview": 1}).json()["items"]
    exp = sorted(j["slug"] for j in all_items if j["location"] == city)
    d = admin.get(f"{API}/jobs", params={"preview": 1, "location": city}).json()
    got = sorted(j["slug"] for j in d["items"])
    assert got == exp and len(got) > 0
    print(city, got)


def test_admin_q_filter(admin):
    d = admin.get(f"{API}/jobs", params={"preview": 1, "q": "Finanzberater"}).json()
    assert 0 < len(d["items"]) < 16
    print("q Finanzberater ->", [j["slug"] for j in d["items"]])


def test_admin_berater_hamburg_exists(admin):
    d = admin.get(f"{API}/jobs/berater-hamburg", params={"preview": 1})
    assert d.status_code == 200
    j = d.json()
    assert j["location"] == "Hamburg" and j["status"] == "draft"
    assert j["title"] == "Berater (m/w/d)"


def test_admin_application_still_403(admin):
    r = admin.post(f"{API}/applications", data={
        "first_name": "TEST", "last_name": "X", "email": "test@example.com", "position": "Berater",
        "preferred_location": "Hamburg", "privacy_consent": "true", "form_started_at": "1"})
    assert r.status_code == 403


def test_admin_jobs_list_16_drafts(admin):
    r = admin.get(f"{API}/admin/jobs")
    assert r.status_code == 200
    d = r.json()
    items = d["items"] if isinstance(d, dict) else d
    assert len(items) == 16
    assert all(j["status"] == "draft" for j in items)


def test_admin_jobs_requires_auth():
    assert requests.get(f"{API}/admin/jobs").status_code in (401, 403)
