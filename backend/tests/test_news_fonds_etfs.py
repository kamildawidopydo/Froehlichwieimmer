"""Session 50: fonds-etfs seeded news article + news listing regression."""
import os

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")

SLUG = "etf-zufluesse-europa-neues-jahreshoch"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Category listing -------------------------------------------------
class TestFondsEtfsCategoryListing:
    def test_category_listing_returns_single_article(self, client):
        r = client.get(f"{BASE_URL}/api/news/nachrichten", params={"category": "fonds-etfs", "limit": 10}, timeout=30)
        assert r.status_code == 200, r.text[:400]
        data = r.json()
        items = data.get("items", data if isinstance(data, list) else [])
        assert len(items) == 1, f"expected 1 fonds-etfs item, got {len(items)}"
        it = items[0]
        assert it["slug"] == SLUG
        assert it["category"] == "fonds-etfs"
        assert it["title"] == "Europäische ETF-Zuflüsse erreichen neues Jahreshoch"
        assert it.get("full_text") and len(it["full_text"]) > 1000
        assert len(it["sources"]) == 2
        assert {s["name"] for s in it["sources"]} == {"Morningstar", "extraETF"}
        assert len(it["source_urls"]) == 2
        assert "_id" not in it


# --- Detail endpoint --------------------------------------------------
class TestFondsEtfsDetail:
    @pytest.fixture(scope="class")
    def detail(self, client):
        r = client.get(f"{BASE_URL}/api/news/nachrichten/{SLUG}", timeout=30)
        assert r.status_code == 200, r.text[:400]
        return r.json()

    def test_core_fields(self, detail):
        d = detail.get("item", detail)
        assert d["slug"] == SLUG
        assert d["category"] == "fonds-etfs"
        assert len(d["full_text"]) > 1000
        assert len(d["sources"]) == 2
        assert d["license_allows_fulltext"] is True
        assert d["subtitle"]
        assert d["hero_image_url"]
        assert d.get("is_demo") is False
        assert "_id" not in d

    def test_investment_topic_slug_is_aktien_or_null(self, detail):
        """Session 80.31 — mit zentralem `topic_mapper.classify_article`
        wird ein ETF-Artikel (Titel enthält „ETF") deterministisch zu
        `aktien` klassifiziert. Vor 80.31 blieb das Feld leer. Beides ist
        akzeptabel (leer, falls Artikel vor Backfill entstand und noch
        nicht klassifiziert wurde), aber KEIN anderer Wert."""
        d = detail.get("item", detail)
        assert d.get("investment_topic_slug") in (None, "", "aktien")

    def test_full_text_structure(self, detail):
        d = detail.get("item", detail)
        ft = d["full_text"]
        assert ft.count("## ") >= 3
        assert "\n- " in ft

    def test_hero_image_reachable(self, detail):
        d = detail.get("item", detail)
        r = requests.get(d["hero_image_url"], timeout=30)
        assert r.status_code == 200

    def test_unknown_slug_returns_404(self, client):
        r = client.get(f"{BASE_URL}/api/news/nachrichten/does-not-exist-xyz", timeout=30)
        assert r.status_code == 404


# --- Listing regression ----------------------------------------------
class TestNewsListingRegression:
    def test_global_listing_still_has_multiple_articles(self, client):
        r = client.get(f"{BASE_URL}/api/news/nachrichten", params={"limit": 50}, timeout=30)
        assert r.status_code == 200
        items = r.json().get("items", [])
        assert len(items) >= 6, f"only {len(items)} articles"
        slugs = [i["slug"] for i in items]
        assert SLUG in slugs
        assert any(s.startswith("dax-beendet-woche") for s in slugs), slugs

    def test_aktien_topic_article_present(self, client):
        r = client.get(f"{BASE_URL}/api/news/nachrichten", params={"limit": 50}, timeout=30)
        items = r.json().get("items", [])
        aktien = [i for i in items if i.get("investment_topic_slug") == "aktien"]
        assert aktien, "no article with investment_topic_slug='aktien'"
