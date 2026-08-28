"""Session 80.50 P0 regression: sparkline API, unsplash proxy, auth + admin inbox."""
import os
import time

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")

ADMIN = {"email": "patron@froehlich-vermoegensberatung.de", "password": "500Euro!"}
UNSPLASH_OK = "https://images.unsplash.com/photo-1554260570-9140fd3b7614?w=800&q=80"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_client(client):
    r = client.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    if r.status_code != 200:
        pytest.fail(f"admin login failed {r.status_code}: {r.text[:300]}")
    return client


# --- Market sparkline endpoint -------------------------------------------
class TestSparkline:
    @pytest.mark.parametrize("sym", ["DAX", "SPX", "NDX", "DJI"])
    def test_supported_symbols(self, client, sym):
        r = client.get(f"{BASE_URL}/api/news-markte/market/sparkline/{sym}")
        assert r.status_code == 200, r.text[:200]
        d = r.json()
        assert d["symbol"] == sym
        assert isinstance(d["points"], list) and len(d["points"]) >= 10
        assert all(isinstance(p.get("c"), (int, float)) for p in d["points"])
        assert "_id" not in d

    @pytest.mark.parametrize("sym", ["AAPL", "FOOBAR", "TSLA"])
    def test_unsupported_symbols_fast_404(self, client, sym):
        t0 = time.time()
        r = client.get(f"{BASE_URL}/api/news-markte/market/sparkline/{sym}")
        elapsed = time.time() - t0
        assert r.status_code == 404
        assert elapsed < 1.5, f"404 too slow: {elapsed:.2f}s"
        assert "detail" in r.json()

    def test_cache_second_call_fast(self, client):
        client.get(f"{BASE_URL}/api/news-markte/market/sparkline/DAX")
        t0 = time.time()
        r = client.get(f"{BASE_URL}/api/news-markte/market/sparkline/DAX")
        assert r.status_code == 200
        assert (time.time() - t0) < 2.0


# --- Unsplash proxy ------------------------------------------------------
class TestUnsplashProxy:
    def test_allowed_image_returns_binary(self, client):
        r = client.get(f"{BASE_URL}/api/unsplash-proxy", params={"url": UNSPLASH_OK})
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/")
        assert len(r.content) > 1000
        # NOTE: preview ingress rewrites Cache-Control to no-store, so the
        # backend's max-age header is not observable through the public URL.

    def test_disallowed_host_forbidden(self, client):
        r = client.get(f"{BASE_URL}/api/unsplash-proxy", params={"url": "https://evil.com/a.jpg"})
        assert r.status_code == 403

    def test_missing_param_validation(self, client):
        r = client.get(f"{BASE_URL}/api/unsplash-proxy")
        assert r.status_code == 422


# --- Auth + admin inbox regression --------------------------------------
class TestAuthAndInbox:
    def test_me_returns_admin(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == ADMIN["email"]
        assert d["role"] == "admin"

    def test_admin_handoffs_list(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/assistant-handoffs", params={"limit": 5})
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert isinstance(d.get("items"), list)

    def test_handoffs_requires_auth(self, client):
        r = requests.get(f"{BASE_URL}/api/admin/assistant-handoffs")
        assert r.status_code in (401, 403)

    def test_login_wrong_password(self, client):
        r = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN["email"], "password": "definitely-wrong"},
        )
        assert r.status_code in (401, 429)
