"""Supplemental defensive-auth and admin seed regression tests."""

import asyncio
import os
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import bcrypt
import jwt
import requests
from dotenv import dotenv_values
from fastapi.testclient import TestClient


frontend_env = dotenv_values("/app/frontend/.env")
backend_env = dotenv_values("/app/backend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL is missing")
BASE_URL = base_url.rstrip("/")
REQUEST_TIMEOUT = 20


def test_signed_refresh_token_with_invalid_subject_returns_401():
    """Malformed signed refresh-token subjects must not raise a server error."""
    token = jwt.encode(
        {
            "sub": "not-an-object-id",
            "type": "refresh",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        },
        backend_env["JWT_SECRET"],
        algorithm="HS256",
    )
    response = requests.post(
        f"{BASE_URL}/api/auth/refresh",
        cookies={"refresh_token": token},
        timeout=REQUEST_TIMEOUT,
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid token subject"


def test_application_cors_middleware_uses_explicit_frontend_origin(monkeypatch):
    """Direct ASGI request distinguishes app CORS behavior from ingress overrides."""
    monkeypatch.syspath_prepend("/app/backend")
    import server

    response = TestClient(server.app).options(
        "/api/auth/login",
        headers={
            "Origin": backend_env["FRONTEND_URL"].rstrip("/"),
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["Access-Control-Allow-Origin"] == backend_env["FRONTEND_URL"].rstrip("/")
    assert response.headers["Access-Control-Allow-Credentials"].lower() == "true"



def test_seed_admin_updates_existing_hash_when_password_changes(monkeypatch):
    """Admin seeding must synchronize an existing account after password rotation."""
    monkeypatch.syspath_prepend("/app/backend")
    import server

    existing = {
        "_id": "test-admin-id",
        "email": "admin@example.test",
        "password_hash": server.hash_password("OldPassword123!"),
        "role": "admin",
    }

    class FakeUsers:
        def __init__(self):
            self.update = None

        async def find_one(self, query):
            assert query == {"email": "admin@example.test"}
            return existing

        async def update_one(self, query, update):
            self.update = (query, update)

    users = FakeUsers()
    monkeypatch.setattr(server, "db", SimpleNamespace(users=users))
    monkeypatch.setenv("ADMIN_EMAIL", "Admin@Example.Test")
    monkeypatch.setenv("ADMIN_PASSWORD", "NewPassword123!")

    asyncio.run(server.seed_admin())

    assert users.update is not None
    query, update = users.update
    assert query == {"_id": existing["_id"]}
    new_hash = update["$set"]["password_hash"]
    assert new_hash.startswith("$2b$")
    assert bcrypt.checkpw(b"NewPassword123!", new_hash.encode())
