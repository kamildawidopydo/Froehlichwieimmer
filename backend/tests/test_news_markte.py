"""Tests for the News & Märkte feature: feed, market insights, editorial CRUD (admin-only)."""

import os
import re
import uuid
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL is missing from env and /app/frontend/.env")
BASE_URL = base_url.rstrip("/")
TIMEOUT = 25


def _credential(name: str) -> str:
    path = Path("/app/memory/test_credentials.md")
    if not path.exists():
        pytest.skip("Missing /app/memory/test_credentials.md")
    content = path.read_text(encoding="utf-8")
    match = re.search(rf"(?im)^\s*[-*]\s*{name}\s*:\s*`([^`]+)`", content)
    if not match:
        pytest.skip(f"Missing {name} in test credentials")
    return match.group(1)


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": _credential("Email"), "password": _credential("Password")},
        timeout=TIMEOUT,
    )
    if r.status_code != 200:
        pytest.fail(f"Admin login failed: {r.status_code} {r.text[:300]}")
    assert r.json().get("role") == "admin"
    return s


@pytest.fixture(scope="module")
def user_session():
    s = requests.Session()
    email = f"TEST_nm_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(
        f"{BASE_URL}/api/auth/register",
        json={"email": email, "password": "TestPass123!", "name": "TEST NM User"},
        timeout=TIMEOUT,
    )
    if r.status_code not in (200, 201):
        pytest.fail(f"User registration failed: {r.status_code} {r.text[:300]}")
    return s


# --- Feed -------------------------------------------------------------------
class TestFeed:
    def test_feed_structure_and_counts(self):
        r = requests.get(f"{BASE_URL}/api/news-markte/feed", timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        d = r.json()
        for key in ("top", "overview", "weitere", "anleger", "categories"):
            assert key in d, f"missing key {key}"
        assert len(d["top"]) == 3, f"top={len(d['top'])}"
        assert 1 <= len(d["overview"]) <= 15
        assert len(d["weitere"]) <= 9 and len(d["weitere"]) >= 1
        assert 1 <= len(d["anleger"]) <= 6
        assert len(d["categories"]) == 6
        assert {c["slug"] for c in d["categories"]} == {
            "maerkte", "aktien", "wirtschaft", "unternehmen", "zinsen", "international"
        }
        art = d["top"][0]
        for f in ("id", "slug", "title", "excerpt", "category", "source",
                  "image_url", "published_at", "featured", "highlight_investor"):
            assert f in art, f"article missing {f}"
        assert "_id" not in art
        assert isinstance(art["id"], str) and art["title"]
        # top items must not repeat in weitere
        assert not ({a["id"] for a in d["top"]} & {a["id"] for a in d["weitere"]})

    def test_feed_overview_returns_at_least_12(self):
        r = requests.get(f"{BASE_URL}/api/news-markte/feed", timeout=TIMEOUT)
        assert len(r.json()["overview"]) >= 12

    def test_feed_category_filter_zinsen(self):
        r = requests.get(f"{BASE_URL}/api/news-markte/feed?category=zinsen", timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        d = r.json()
        assert len(d["overview"]) >= 1
        assert all(a["category"] == "zinsen" for a in d["overview"]), \
            [a["category"] for a in d["overview"]]

    def test_feed_unknown_category_returns_empty_overview(self):
        r = requests.get(f"{BASE_URL}/api/news-markte/feed?category=doesnotexist", timeout=TIMEOUT)
        assert r.status_code == 200
        assert r.json()["overview"] == []

    def test_feed_alle_equals_unfiltered(self):
        a = requests.get(f"{BASE_URL}/api/news-markte/feed?category=alle", timeout=TIMEOUT).json()
        b = requests.get(f"{BASE_URL}/api/news-markte/feed", timeout=TIMEOUT).json()
        assert [x["id"] for x in a["overview"]] == [x["id"] for x in b["overview"]]

    def test_feed_published_at_sorted_desc(self):
        d = requests.get(f"{BASE_URL}/api/news-markte/feed", timeout=TIMEOUT).json()
        dates = [a["published_at"] for a in d["overview"]]
        assert dates == sorted(dates, reverse=True)


# --- Market insights --------------------------------------------------------
class TestMarkets:
    def test_markets_returns_seven_insights(self):
        r = requests.get(f"{BASE_URL}/api/news-markte/markets", timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list) and len(data) == 7, len(data)
        names = [m["name"] for m in data]
        for expected in ["DAX", "Dow Jones", "S&P 500", "Nasdaq 100",
                         "Euro Stoxx 50", "Gold", "EUR/USD"]:
            assert expected in names, f"{expected} missing from {names}"
        for m in data:
            assert set(("symbol", "name", "value", "change_pct", "unit", "updated_at")) <= set(m)
            assert isinstance(m["value"], (int, float)) and m["value"] > 0
            assert isinstance(m["change_pct"], (int, float))
            assert m["updated_at"]


# --- Editorial (public) -----------------------------------------------------
class TestEditorialPublic:
    def test_public_editorial_only_published(self):
        r = requests.get(f"{BASE_URL}/api/news-markte/editorial", timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        for p in data:
            assert p["published"] is True
            assert "_id" not in p
            for f in ("id", "slug", "title", "dek", "body", "author", "published_at"):
                assert f in p


# --- Editorial (auth) -------------------------------------------------------
class TestEditorialAuth:
    def test_admin_list_without_auth_returns_401(self):
        r = requests.get(f"{BASE_URL}/api/news-markte/editorial/admin", timeout=TIMEOUT)
        assert r.status_code == 401, r.status_code

    def test_create_without_auth_returns_401(self):
        r = requests.post(
            f"{BASE_URL}/api/news-markte/editorial",
            json={"title": "TEST_unauth", "dek": "d", "body": "b", "published": True},
            timeout=TIMEOUT,
        )
        assert r.status_code == 401, r.status_code

    def test_create_as_non_admin_returns_403(self, user_session):
        r = user_session.post(
            f"{BASE_URL}/api/news-markte/editorial",
            json={"title": "TEST_nonadmin", "dek": "d", "body": "b", "published": True},
            timeout=TIMEOUT,
        )
        assert r.status_code == 403, f"{r.status_code} {r.text[:200]}"

    def test_admin_list_as_non_admin_returns_403(self, user_session):
        r = user_session.get(f"{BASE_URL}/api/news-markte/editorial/admin", timeout=TIMEOUT)
        assert r.status_code == 403, r.status_code

    def test_update_without_auth_returns_401(self):
        r = requests.put(
            f"{BASE_URL}/api/news-markte/editorial/507f1f77bcf86cd799439011",
            json={"title": "x", "dek": "d", "body": "b", "published": True},
            timeout=TIMEOUT,
        )
        assert r.status_code == 401

    def test_delete_without_auth_returns_401(self):
        r = requests.delete(
            f"{BASE_URL}/api/news-markte/editorial/507f1f77bcf86cd799439011", timeout=TIMEOUT
        )
        assert r.status_code == 401


# --- Editorial CRUD as admin ------------------------------------------------
class TestEditorialAdminCrud:
    created_ids: list = []

    @pytest.fixture(scope="class", autouse=True)
    def cleanup(self, admin_session):
        yield
        for pid in TestEditorialAdminCrud.created_ids:
            admin_session.delete(f"{BASE_URL}/api/news-markte/editorial/{pid}", timeout=TIMEOUT)

    def test_full_crud_lifecycle(self, admin_session):
        payload = {
            "title": "TEST_Unsere Einschätzung Q3",
            "dek": "TEST dek text",
            "body": "TEST body paragraph about markets.",
            "published": True,
        }
        c = admin_session.post(
            f"{BASE_URL}/api/news-markte/editorial", json=payload, timeout=TIMEOUT
        )
        assert c.status_code in (200, 201), c.text
        post = c.json()
        pid = post["id"]
        TestEditorialAdminCrud.created_ids.append(pid)
        assert post["title"] == payload["title"]
        assert post["body"] == payload["body"]
        assert post["published"] is True
        assert post["slug"] and post["author"]

        # GET public -> persisted & visible
        pub = requests.get(f"{BASE_URL}/api/news-markte/editorial", timeout=TIMEOUT).json()
        assert pid in [p["id"] for p in pub], "created published post not in public list"

        # UPDATE -> unpublish + change title
        upd = admin_session.put(
            f"{BASE_URL}/api/news-markte/editorial/{pid}",
            json={"title": "TEST_Updated Titel", "dek": "TEST dek 2",
                  "body": "TEST updated body.", "published": False},
            timeout=TIMEOUT,
        )
        assert upd.status_code == 200, upd.text
        assert upd.json()["title"] == "TEST_Updated Titel"
        assert upd.json()["published"] is False

        # public list must no longer contain it; admin list must
        pub2 = requests.get(f"{BASE_URL}/api/news-markte/editorial", timeout=TIMEOUT).json()
        assert pid not in [p["id"] for p in pub2], "unpublished post still public"
        adm = admin_session.get(
            f"{BASE_URL}/api/news-markte/editorial/admin", timeout=TIMEOUT
        )
        assert adm.status_code == 200, adm.text
        match = [p for p in adm.json() if p["id"] == pid]
        assert match and match[0]["title"] == "TEST_Updated Titel"

        # DELETE
        d = admin_session.delete(
            f"{BASE_URL}/api/news-markte/editorial/{pid}", timeout=TIMEOUT
        )
        assert d.status_code in (200, 204), d.text
        adm2 = admin_session.get(
            f"{BASE_URL}/api/news-markte/editorial/admin", timeout=TIMEOUT
        ).json()
        assert pid not in [p["id"] for p in adm2], "deleted post still present"
        TestEditorialAdminCrud.created_ids.remove(pid)

    def test_update_nonexistent_returns_404(self, admin_session):
        r = admin_session.put(
            f"{BASE_URL}/api/news-markte/editorial/507f1f77bcf86cd799439011",
            json={"title": "TEST_missing", "dek": "d", "body": "body long enough", "published": True},
            timeout=TIMEOUT,
        )
        assert r.status_code == 404, r.status_code

    def test_update_invalid_id_returns_400(self, admin_session):
        r = admin_session.put(
            f"{BASE_URL}/api/news-markte/editorial/not-an-id",
            json={"title": "TEST_badid", "dek": "d", "body": "body long enough", "published": True},
            timeout=TIMEOUT,
        )
        assert r.status_code == 400, r.status_code

    def test_delete_nonexistent_returns_404_or_zero(self, admin_session):
        r = admin_session.delete(
            f"{BASE_URL}/api/news-markte/editorial/507f1f77bcf86cd799439011", timeout=TIMEOUT
        )
        assert r.status_code in (200, 404)
        if r.status_code == 200:
            assert r.json().get("deleted") == 0

    def test_create_missing_title_returns_422(self, admin_session):
        r = admin_session.post(
            f"{BASE_URL}/api/news-markte/editorial",
            json={"dek": "d", "body": "b"},
            timeout=TIMEOUT,
        )
        assert r.status_code == 422, f"{r.status_code} {r.text[:200]}"
