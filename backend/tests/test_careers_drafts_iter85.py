# Careers draft jobs (Fröhlich Vermögensberatung GmbH) – READ-ONLY regression tests (no publish/save/apply)
import os
import re
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API = f"{BASE_URL}/api/careers"
SLUGS = ["junior-finanzberater", "quereinsteiger-finanzberatung", "investmentberater",
         "vertriebsmitarbeiter-finanzdienstleistungen", "kundenbetreuer-vermoegensberatung", "recruiting-manager",
         "social-media-marketing-manager", "teamleiter-finanzberatung", "assistenz-der-geschaeftsfuehrung",
         "business-development-manager"]


@pytest.fixture(scope="module")
def admin():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@kapitalmitte.com", "password": "admin123"})
    if r.status_code != 200:
        pytest.skip(f"login failed {r.status_code} {r.text[:200]}")
    tok = r.json().get("token") or r.json().get("access_token")
    if tok:
        s.headers["Authorization"] = f"Bearer {tok}"
    return s


# Anonymous visibility
class TestAnonymous:
    def test_status(self):
        d = requests.get(f"{API}/status").json()
        assert d["applications_enabled"] is False
        assert d["is_staff"] is False

    def test_jobs_empty(self):
        d = requests.get(f"{API}/jobs").json()
        assert d["items"] == [] and d["areas"] == []

    def test_jobs_preview_flag_ignored_for_anon(self):
        d = requests.get(f"{API}/jobs", params={"preview": 1}).json()
        assert d["items"] == []

    def test_detail_404(self):
        assert requests.get(f"{API}/jobs/junior-finanzberater").status_code == 404
        assert requests.get(f"{API}/jobs/junior-finanzberater", params={"preview": 1}).status_code == 404

    def test_application_403(self):
        r = requests.post(f"{API}/applications", data={
            "first_name": "TEST", "last_name": "TEST", "email": "test_x@example.com", "phone": "0123456",
            "position": "TEST Pos", "privacy_consent": "true", "form_started_at": "1"})
        assert r.status_code == 403
        assert r.json()["detail"] == "Online-Bewerbungen sind derzeit noch nicht freigeschaltet."

    def test_admin_jobs_requires_auth(self):
        assert requests.get(f"{API}/admin/jobs").status_code in (401, 403)


# Staff preview
class TestAdminPreview:
    def test_status_staff(self, admin):
        d = admin.get(f"{API}/status").json()
        assert d["is_staff"] is True and d["applications_enabled"] is False

    def test_preview_list(self, admin):
        d = admin.get(f"{API}/jobs", params={"preview": 1}).json()
        slugs = {j["slug"] for j in d["items"]}
        assert slugs == set(SLUGS)
        assert all(j["status"] == "draft" for j in d["items"])
        assert all(j["location"] == "" and j["employment_type"] == "" for j in d["items"])
        assert d["locations"] == [] and d["employment_types"] == []
        assert "Finanzberatung" in d["areas"]

    def test_non_preview_staff_list_empty(self, admin):
        assert admin.get(f"{API}/jobs").json()["items"] == []

    def test_area_filter(self, admin):
        d = admin.get(f"{API}/jobs", params={"preview": 1, "area": "Finanzberatung"}).json()
        assert len(d["items"]) == 4
        assert all(j["area"] == "Finanzberatung" for j in d["items"])

    def test_invalid_area_ignored(self, admin):
        d = admin.get(f"{API}/jobs", params={"preview": 1, "area": "Bogus"}).json()
        assert len(d["items"]) == 10

    def test_detail(self, admin):
        r = admin.get(f"{API}/jobs/junior-finanzberater", params={"preview": 1})
        assert r.status_code == 200
        j = r.json()
        assert j["title"] == "Junior Finanzberater (m/w/d)"
        assert j["area"] == "Finanzberatung" and j["status"] == "draft"
        assert len(j["offer"]) == 3 and j["career_path"] == ""
        txt = " ".join(j["offer"]).lower()
        assert not re.search(r"gehalt|vergütung|homeoffice|home-office|€|urlaub", txt)

    def test_all_details_no_informal_or_brand(self, admin):
        for s in SLUGS:
            j = admin.get(f"{API}/jobs/{s}", params={"preview": 1}).json()
            blob = " ".join([j["title"], j["summary"], *j["tasks"], *j["requirements"], *j["offer"]])
            assert "Essence Invest" not in blob, s
            assert not re.search(r"\b(du|dein|deine|dich|dir)\b", blob, re.I), s
            assert j["area"], s
            assert len(j["tasks"]) > 0 and len(j["requirements"]) > 0, s

    def test_admin_jobs(self, admin):
        r = admin.get(f"{API}/admin/jobs")
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) == 10
        assert all(i["status"] == "draft" for i in items)
        assert all("_id" not in i for i in items)

    def test_admin_settings_read(self, admin):
        r = admin.get(f"{API}/admin/settings")
        assert r.status_code == 200
        assert r.json()["applications_enabled"] is False
