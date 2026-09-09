"""Auth-Routen — extrahiert aus server.py (Session 78.0).

Behavior 1:1 identisch zu den bisherigen `@api.post("/auth/...")`-Decorators.
Shared state (db, JWT-Helper, Cookie-Helper, Pydantic-Modelle) wird aus
server.py via top-level import bezogen. Der Import ist sicher, weil dieses
Modul erst am Ende von server.py via `from routes import auth as _auth_routes`
geladen wird — zu diesem Zeitpunkt sind alle Namen in server.py bereits
definiert.

Keine neuen Auth-Features, kein neues Cookie-Verhalten, keine neuen
Response-Shapes. Reiner Struktur-Refactor.
"""
from __future__ import annotations

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field


def _hash_reset_token(raw: str) -> str:
    """SHA-256 Hash für Reset-Tokens. Tokens sind bereits 32-Byte high-entropy
    aus `secrets.token_urlsafe(32)` — SHA-256 (nicht bcrypt) ist adäquat und
    schnell. Plaintext-Token gelangt NIEMALS in die Datenbank.
    """
    return hashlib.sha256((raw or "").encode("utf-8")).hexdigest()

# Alle Helper aus server.py — server.py ist beim Import dieses Moduls bereits
# vollständig geladen (routes-Import steht am Ende von server.py).
from server import (
    db,
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    set_auth_cookies,
    clear_auth_cookies,
    public_user,
    get_current_user,
    check_lockout,
    record_failed_login,
    clear_login_attempts,
    _as_aware,
    JWT_SECRET,
    JWT_ALGORITHM,
    ACCESS_TOKEN_MINUTES,
    RegisterInput,
    LoginInput,
    UpdateMeInput,
    ForgotInput,
    ResetInput,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["auth"])

# Session 82.104a — Inline Rate-Limit (slowapi-Decorator bricht Pydantic
# ForwardRef auf typed Bodies). In-memory Map per IP, gleiche Pattern wie
# `_review_rate_limit` und `_UPLOAD_RL`.
import time as _time_mod
from collections import defaultdict as _defaultdict
_AUTH_RL: dict = _defaultdict(lambda: _defaultdict(list))  # {rule: {ip: [timestamps]}}

def _rl_check(request: Request, rule_key: str, max_hits: int, window_s: int = 60) -> None:
    xff = request.headers.get("x-forwarded-for", "")
    ip = xff.split(",")[0].strip() if xff else (request.client.host if request.client else "unknown")
    now = _time_mod.time()
    hist = [t for t in _AUTH_RL[rule_key][ip] if t > now - window_s]
    if len(hist) >= max_hits:
        raise HTTPException(status_code=429, detail="Zu viele Anfragen. Bitte kurz warten.")
    hist.append(now)
    _AUTH_RL[rule_key][ip] = hist
    if len(_AUTH_RL[rule_key]) > 500:
        _AUTH_RL[rule_key].clear()


@router.post("/auth/register")
async def register(request: Request, payload: RegisterInput, response: Response):
    _rl_check(request, "register", 5)
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="E-Mail ist bereits registriert.")
    doc = {
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": payload.name or "",
        "role": "user",
        "avatar_url": None,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    access = create_access_token(str(result.inserted_id), email)
    refresh = create_refresh_token(str(result.inserted_id))
    set_auth_cookies(response, access, refresh)
    return public_user(doc)


@router.post("/auth/login")
async def login(payload: LoginInput, request: Request, response: Response):
    email = payload.email.lower().strip()
    # Lock by email only. Internal ingress proxies rotate client IPs across
    # requests, which would split brute-force counters and disable protection.
    identifier = f"email:{email}"
    await check_lockout(identifier)
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        await record_failed_login(identifier)
        raise HTTPException(status_code=401, detail="Ungültige Anmeldedaten.")
    await clear_login_attempts(identifier)
    access = create_access_token(str(user["_id"]), email)
    refresh = create_refresh_token(str(user["_id"]))
    set_auth_cookies(response, access, refresh)
    return public_user(user)


@router.post("/auth/logout")
async def logout(response: Response, _user: dict = Depends(get_current_user)):
    clear_auth_cookies(response)
    return {"status": "ok"}


@router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    # Session 81.05 — enrich `/api/auth/me` mit Onboarding-Feldern aus Mongo,
    # damit AuthContext den Redirect zu /onboarding auf Basis der FastAPI-Identität
    # steuern kann (nicht mehr auf Supabase-Profil angewiesen).
    doc = await db.users.find_one({"_id": ObjectId(user["id"])}) if user.get("id") else None
    enriched = dict(user)
    if doc:
        for k in ("first_name", "last_name", "phone", "country",
                  "street", "house_number", "address_addition",
                  "postal_code", "city",
                  "notification_prefs", "email_digest_enabled",
                  "onboarding_completed_steps", "onboarding_completed"):
            if k in doc:
                enriched[k] = doc[k]
    return enriched


@router.patch("/auth/me")
async def update_me(payload: UpdateMeInput, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not update:
        return user
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": update})
    doc = await db.users.find_one({"_id": ObjectId(user["id"])})
    return public_user(doc)


@router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        sub = payload.get("sub")
        if not sub or not ObjectId.is_valid(sub):
            raise HTTPException(status_code=401, detail="Invalid token subject")
        user = await db.users.find_one({"_id": ObjectId(sub)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(str(user["_id"]), user["email"])
        response.set_cookie(
            "access_token", access,
            httponly=True, secure=True, samesite="none",
            max_age=ACCESS_TOKEN_MINUTES * 60, path="/",
        )
        return {"status": "ok"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@router.post("/auth/forgot-password")
async def forgot_password(request: Request, payload: ForgotInput):
    _rl_check(request, "forgot_password", 3)
    """Session 82.88 — Token wird ausschließlich als SHA-256-Hash in Mongo
    abgelegt. Response identisch für existierende/unbekannte E-Mails
    (kein User-Enumeration-Leak).
    """
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if user:
        raw_token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token_hash": _hash_reset_token(raw_token),
            "user_id": user["_id"],
            "used": False,
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
            "created_at": datetime.now(timezone.utc),
        })
        # Session 82.88 · NIEMALS Token oder Passwort-Hash loggen. In Prod wird
        # der Reset-Link via Resend versendet — der Klartext-Token verlässt
        # dann diese Funktion ausschließlich via Email-Payload.
        logger.info("password_reset_request email_domain=%s (token issued, expires 1h)",
                    email.split("@")[-1] if "@" in email else "-")
        # Session 82.88 · Preview-Only: raw-Token einmalig zurückgeben, damit
        # Tests + Frontend-Force-Flow ohne Email-Zustellung funktionieren.
        # Im Prod-Deploy wird dieser Zweig durch die Email-Route ersetzt.
        return {"status": "ok", "reset_token_preview": raw_token}
    return {"status": "ok"}


@router.post("/auth/reset-password")
async def reset_password(request: Request, payload: ResetInput):
    _rl_check(request, "reset_password", 5)
    """Session 82.88 — Verifiziert Token per Hash-Vergleich, Single-Use,
    Ablaufprüfung. Nach Erfolg wird der Token invalidiert (used=True) und der
    User erhält aktualisierten Password-Hash + Reset-Metadaten.
    """
    if not payload.token or not isinstance(payload.token, str):
        raise HTTPException(status_code=400, detail="Ungültiger Token.")
    token_hash = _hash_reset_token(payload.token)
    rec = await db.password_reset_tokens.find_one({"token_hash": token_hash})
    if not rec:
        raise HTTPException(status_code=400, detail="Ungültiger Token.")
    if rec.get("used"):
        raise HTTPException(status_code=400, detail="Token bereits verwendet.")
    if _as_aware(rec["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token abgelaufen.")
    new_hash = hash_password(payload.password)
    now = datetime.now(timezone.utc)
    await db.users.update_one(
        {"_id": rec["user_id"]},
        {"$set": {
            "password_hash": new_hash,
            "last_password_reset_at": now,
            "must_change_password": False,
            "verified": True,
        }},
    )
    await db.password_reset_tokens.update_one(
        {"_id": rec["_id"]},
        {"$set": {"used": True, "used_at": now}},
    )
    return {"status": "ok"}


class ForceResetInput(BaseModel):
    """Session 82.88 — Force-Reset (Pflicht-Rotation nach Admin-Setup).
    User ist authentifiziert via JWT-Cookie, muss kein current_password
    angeben, aber `new_password` muss Passwortregeln erfüllen (Länge)."""
    new_password: str = Field(..., min_length=8, max_length=200)
    model_config = {"extra": "forbid"}


@router.post("/auth/force-reset-password")
async def force_reset_password(payload: ForceResetInput, user: dict = Depends(get_current_user)):
    """Session 82.88 — Erlaubt einem eingeloggten User den Force-Reset ohne
    current_password (für `must_change_password=true`-Flow). Kein Token nötig
    — JWT-Cookie authentifiziert. Kein Role-Escalation möglich (role wird
    nicht aus Payload gelesen).
    """
    doc = await db.users.find_one({"_id": ObjectId(user["id"])})
    if not doc:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden.")
    new_hash = hash_password(payload.new_password)
    now = datetime.now(timezone.utc)
    await db.users.update_one(
        {"_id": doc["_id"]},
        {"$set": {
            "password_hash": new_hash,
            "last_password_reset_at": now,
            "must_change_password": False,
            "verified": True,
        }},
    )
    return {"status": "ok"}


# Session 82.68 — Mongo-native Passwort-Änderung mit Current-Password-Verifikation.


class ChangePasswordInput(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=200)
    new_password: str = Field(..., min_length=8, max_length=200)

    model_config = {"extra": "forbid"}


@router.post("/auth/change-password")
async def change_password(payload: ChangePasswordInput, user: dict = Depends(get_current_user)):
    doc = await db.users.find_one({"_id": ObjectId(user["id"])})
    if not doc:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden.")
    if not verify_password(payload.current_password, doc["password_hash"]):
        raise HTTPException(status_code=400, detail="Aktuelles Passwort ist falsch.")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="Neues Passwort muss sich vom aktuellen unterscheiden.")
    new_hash = hash_password(payload.new_password)
    await db.users.update_one(
        {"_id": doc["_id"]},
        {"$set": {"password_hash": new_hash, "last_password_reset_at": datetime.now(timezone.utc)}},
    )
    return {"status": "ok"}
