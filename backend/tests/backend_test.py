"""Regression tests for Phase 1 health, JWT auth, public content, CORS, and seed security."""

import os
import re
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

import bcrypt
import jwt
import pytest
import requests
from dotenv import dotenv_values
from pymongo import MongoClient


frontend_env = dotenv_values("/app/frontend/.env")
backend_env = dotenv_values("/app/backend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL is missing")
BASE_URL = base_url.rstrip("/")
FRONTEND_ORIGIN = backend_env["FRONTEND_URL"].rstrip("/")
REQUEST_TIMEOUT = 20


def _credential(name: str) -> str:
    path = Path("/app/memory/test_credentials.md")
    if not path.exists():
        pytest.skip("Missing /app/memory/test_credentials.md")
    content = path.read_text(encoding="utf-8")
    match = re.search(
        rf"(?im)^\s*[-*]\s*{name}\s*:\s*`([^`]+)`", content
    )
    if not match:
        pytest.skip(f"Missing {name} in test credentials")
    return match.group(1)


def _all_set_cookie_headers(response: requests.Response) -> list[str]:
    raw_headers = response.raw.headers
    if hasattr(raw_headers, "getlist"):
        return raw_headers.getlist("Set-Cookie")
    value = response.headers.get("Set-Cookie", "")
    return [value] if value else []


def _assert_auth_cookie_flags(response: requests.Response, cookie_names: tuple[str, ...]) -> None:
    headers = _all_set_cookie_headers(response)
    for cookie_name in cookie_names:
        matching = [header for header in headers if header.lower().startswith(f"{cookie_name.lower()}=")]
        assert matching, f"Missing Set-Cookie for {cookie_name}; got {headers}"
        cookie = matching[0].lower()
        assert "httponly" in cookie
        assert "secure" in cookie
        assert "samesite=none" in cookie
        assert "path=/" in cookie


@pytest.fixture(scope="session")
def admin_credentials():
    return {"email": _credential("Email"), "password": _credential("Password")}


@pytest.fixture(scope="session")
def mongo_db():
    client = MongoClient(backend_env["MONGO_URL"])
    database = client[backend_env["DB_NAME"]]
    yield database
    client.close()


@pytest.fixture(scope="session")
def test_state(mongo_db):
    suffix = uuid.uuid4().hex
    state = {
        "user_email": f"test_phase1_{suffix}@example.com",
        "brute_email": f"test_bruteforce_{suffix}@example.com",
        "recovery_email": f"test_recovery_{suffix}@example.com",
        "password": "StrongPass123!",
    }
    yield state
    emails = [state["user_email"], state["brute_email"], state["recovery_email"]]
    users = list(mongo_db.users.find({"email": {"$in": emails}}, {"_id": 1}))
    user_ids = [user["_id"] for user in users]
    mongo_db.users.delete_many({"email": {"$in": emails}})
    mongo_db.login_attempts.delete_many({"identifier": {"$regex": f"({'|'.join(re.escape(email) for email in emails)})$"}})
    if user_ids:
        mongo_db.password_reset_tokens.delete_many({"user_id": {"$in": user_ids}})


class TestHealthAndCors:
    """Health endpoint and credentialed CORS behavior."""

    def test_health_reports_database_up(self):
        response = requests.get(f"{BASE_URL}/api/health", timeout=REQUEST_TIMEOUT)
        assert response.status_code == 200
        assert response.json() == {"status": "ok", "db": "up"}

    def test_credentialed_cors_uses_explicit_frontend_origin(self):
        response = requests.options(
            f"{BASE_URL}/api/auth/login",
            headers={
                "Origin": FRONTEND_ORIGIN,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
            timeout=REQUEST_TIMEOUT,
        )
        assert response.status_code in (200, 204)
        assert response.headers.get("Access-Control-Allow-Origin") == FRONTEND_ORIGIN
        assert response.headers.get("Access-Control-Allow-Credentials", "").lower() == "true"


class TestRegistrationAndSession:
    """Registration validation plus cookie-backed user session lifecycle."""

    def test_register_sets_secure_http_only_cookies(self, test_state):
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_state["user_email"],
                "password": test_state["password"],
                "name": "TEST Phase One",
            },
            timeout=REQUEST_TIMEOUT,
        )
        assert response.status_code == 200, response.text
        data = response.json()
        assert isinstance(data["id"], str) and data["id"]
        assert data["email"] == test_state["user_email"]
        assert data["name"] == "TEST Phase One"
        assert data["role"] == "user"
        assert data["avatar_url"] is None
        assert isinstance(data["created_at"], str)
        assert "password" not in data and "password_hash" not in data
        _assert_auth_cookie_flags(response, ("access_token", "refresh_token"))

        me_response = session.get(f"{BASE_URL}/api/auth/me", timeout=REQUEST_TIMEOUT)
        assert me_response.status_code == 200, me_response.text
        assert me_response.json()["id"] == data["id"]

    def test_duplicate_email_returns_409(self, test_state):
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={"email": test_state["user_email"].upper(), "password": test_state["password"]},
            timeout=REQUEST_TIMEOUT,
        )
        assert response.status_code == 409
        assert response.json()["detail"] == "E-Mail ist bereits registriert."

    @pytest.mark.parametrize(
        "payload,expected_field",
        [
            ({"email": "not-an-email", "password": "StrongPass123!"}, "email"),
            ({"email": "valid@example.test", "password": "short"}, "password"),
        ],
    )
    def test_registration_validation_returns_422(self, payload, expected_field):
        response = requests.post(
            f"{BASE_URL}/api/auth/register", json=payload, timeout=REQUEST_TIMEOUT
        )
        assert response.status_code == 422
        detail = response.json()["detail"]
        assert isinstance(detail, list) and detail
        assert any(expected_field in item.get("loc", []) for item in detail)

    def test_me_without_cookie_returns_401(self):
        response = requests.get(f"{BASE_URL}/api/auth/me", timeout=REQUEST_TIMEOUT)
        assert response.status_code == 401
        assert response.json()["detail"] == "Not authenticated"

    def test_login_me_patch_refresh_logout_flow(self, test_state):
        session = requests.Session()
        login = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": test_state["user_email"], "password": test_state["password"]},
            timeout=REQUEST_TIMEOUT,
        )
        assert login.status_code == 200, login.text
        _assert_auth_cookie_flags(login, ("access_token", "refresh_token"))
        assert login.json()["email"] == test_state["user_email"]

        me = session.get(f"{BASE_URL}/api/auth/me", timeout=REQUEST_TIMEOUT)
        assert me.status_code == 200
        me_data = me.json()
        assert me_data["email"] == test_state["user_email"]
        assert "password_hash" not in me_data and "password" not in me_data

        avatar_url = "https://example.test/avatar.png"
        patch = session.patch(
            f"{BASE_URL}/api/auth/me",
            json={"name": "TEST Updated Name", "avatar_url": avatar_url},
            timeout=REQUEST_TIMEOUT,
        )
        assert patch.status_code == 200, patch.text
        assert patch.json()["name"] == "TEST Updated Name"
        assert patch.json()["avatar_url"] == avatar_url
        persisted = session.get(f"{BASE_URL}/api/auth/me", timeout=REQUEST_TIMEOUT)
        assert persisted.status_code == 200
        assert persisted.json()["name"] == "TEST Updated Name"
        assert persisted.json()["avatar_url"] == avatar_url

        session.cookies.pop("access_token")
        refresh = session.post(f"{BASE_URL}/api/auth/refresh", timeout=REQUEST_TIMEOUT)
        assert refresh.status_code == 200, refresh.text
        assert refresh.json() == {"status": "ok"}
        _assert_auth_cookie_flags(refresh, ("access_token",))
        assert session.get(f"{BASE_URL}/api/auth/me", timeout=REQUEST_TIMEOUT).status_code == 200

        logout = session.post(f"{BASE_URL}/api/auth/logout", timeout=REQUEST_TIMEOUT)
        assert logout.status_code == 200
        assert logout.json() == {"status": "ok"}
        logout_cookies = "\n".join(_all_set_cookie_headers(logout)).lower()
        assert "access_token=" in logout_cookies and "refresh_token=" in logout_cookies
        assert "max-age=0" in logout_cookies
        after_logout = session.get(f"{BASE_URL}/api/auth/me", timeout=REQUEST_TIMEOUT)
        assert after_logout.status_code == 401

    def test_refresh_without_cookie_returns_401(self):
        response = requests.post(f"{BASE_URL}/api/auth/refresh", timeout=REQUEST_TIMEOUT)
        assert response.status_code == 401
        assert response.json()["detail"] == "No refresh token"


class TestAdminAndBruteForce:
    """Seeded admin login, password hashing, invalid login, and lockout threshold."""

    def test_seeded_admin_hash_and_role(self, mongo_db, admin_credentials):
        admin = mongo_db.users.find_one({"email": admin_credentials["email"].lower()})
        assert admin is not None
        assert admin["role"] == "admin"
        assert isinstance(admin["password_hash"], str)
        assert admin["password_hash"].startswith("$2b$")
        assert bcrypt.checkpw(
            admin_credentials["password"].encode(), admin["password_hash"].encode()
        )

    def test_admin_login_sets_cookies_and_returns_admin(self, admin_credentials):
        response = requests.post(
            f"{BASE_URL}/api/auth/login", json=admin_credentials, timeout=REQUEST_TIMEOUT
        )
        assert response.status_code == 200, response.text
        data = response.json()
        assert data["email"] == admin_credentials["email"]
        assert data["role"] == "admin"
        assert "password_hash" not in data
        _assert_auth_cookie_flags(response, ("access_token", "refresh_token"))

    def test_wrong_password_returns_401(self, test_state):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": test_state["user_email"], "password": "definitely-wrong"},
            timeout=REQUEST_TIMEOUT,
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Ungültige Anmeldedaten."

    def test_sixth_failed_login_is_locked_out(self, test_state):
        registration = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_state["brute_email"],
                "password": test_state["password"],
                "name": "TEST Brute Force",
            },
            timeout=REQUEST_TIMEOUT,
        )
        assert registration.status_code == 200, registration.text

        statuses = []
        for _ in range(6):
            response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": test_state["brute_email"], "password": "wrong-password"},
                timeout=REQUEST_TIMEOUT,
            )
            statuses.append(response.status_code)
        assert statuses[:5] == [401] * 5
        assert statuses[5] == 429


class TestPasswordRecoveryAndDefensiveAuth:
    """Password-recovery anti-enumeration and malformed-token handling."""

    @pytest.mark.parametrize("known_user", [True, False])
    def test_forgot_password_always_returns_200(
        self, known_user, test_state
    ):
        if known_user:
            registration = requests.post(
                f"{BASE_URL}/api/auth/register",
                json={
                    "email": test_state["recovery_email"],
                    "password": test_state["password"],
                    "name": "TEST Recovery User",
                },
                timeout=REQUEST_TIMEOUT,
            )
            assert registration.status_code == 200, registration.text
            email = test_state["recovery_email"]
        else:
            email = f"missing_{uuid.uuid4().hex}@example.com"
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": email},
            timeout=REQUEST_TIMEOUT,
        )
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    def test_reset_password_invalid_token_returns_400(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={"token": "invalid-test-token", "password": "NewStrongPass123!"},
            timeout=REQUEST_TIMEOUT,
        )
        assert response.status_code == 400
        assert response.json()["detail"] == "Ungültiger Token."

    def test_signed_access_token_with_invalid_subject_returns_401(self):
        token = jwt.encode(
            {
                "sub": "not-an-object-id",
                "email": "invalid@example.test",
                "type": "access",
                "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
            },
            backend_env["JWT_SECRET"],
            algorithm="HS256",
        )
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            cookies={"access_token": token},
            timeout=REQUEST_TIMEOUT,
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid token subject"


class TestPublicContent:
    """Seeded bank, savings-offer, filters, and sorted news APIs."""

    def test_banks_returns_exact_seed(self):
        response = requests.get(f"{BASE_URL}/api/content/banks", timeout=REQUEST_TIMEOUT)
        assert response.status_code == 200
        banks = response.json()
        assert isinstance(banks, list) and len(banks) == 5
        assert {bank["name"] for bank in banks} == {"BBVA", "bunq", "ING", "Postbank", "Knab"}
        for bank in banks:
            assert isinstance(bank["id"], str) and bank["id"]
            assert isinstance(bank["slug"], str) and bank["slug"]
            assert isinstance(bank["country"], str) and len(bank["country"]) == 2
            assert isinstance(bank["logo_url"], str) and bank["logo_url"]
            assert "_id" not in bank

    def test_offers_returns_exact_seed_and_schema(self):
        response = requests.get(f"{BASE_URL}/api/content/offers", timeout=REQUEST_TIMEOUT)
        assert response.status_code == 200
        offers = response.json()
        assert isinstance(offers, list) and len(offers) == 9
        allowed_types = {"tagesgeld", "festgeld", "flexgeld"}
        for offer in offers:
            assert isinstance(offer["id"], str) and offer["id"]
            assert isinstance(offer["bank_slug"], str) and offer["bank_slug"]
            assert offer["product_type"] in allowed_types
            assert isinstance(offer["interest_rate"], (int, float))
            assert isinstance(offer["min_amount"], (int, float))
            assert offer["min_amount"] >= 0
            assert "_id" not in offer

    def test_bank_filter_returns_three_bbva_offers(self):
        response = requests.get(
            f"{BASE_URL}/api/content/offers",
            params={"bank_slug": "bbva"},
            timeout=REQUEST_TIMEOUT,
        )
        assert response.status_code == 200
        offers = response.json()
        assert len(offers) == 3
        assert all(offer["bank_slug"] == "bbva" for offer in offers)

    def test_product_type_filter_returns_only_festgeld(self):
        response = requests.get(
            f"{BASE_URL}/api/content/offers",
            params={"product_type": "festgeld"},
            timeout=REQUEST_TIMEOUT,
        )
        assert response.status_code == 200
        offers = response.json()
        assert len(offers) > 0
        assert all(offer["product_type"] == "festgeld" for offer in offers)

    def test_news_limit_two_is_latest_first(self):
        response = requests.get(
            f"{BASE_URL}/api/content/news", params={"limit": 2}, timeout=REQUEST_TIMEOUT
        )
        assert response.status_code == 200
        news = response.json()
        assert isinstance(news, list) and len(news) == 2
        published = [datetime.fromisoformat(item["published_at"].replace("Z", "+00:00")) for item in news]
        assert published == sorted(published, reverse=True)
        for item in news:
            assert isinstance(item["id"], str) and item["id"]
            assert item["slug"] and item["title"] and item["excerpt"] and item["category"]
            assert "_id" not in item
