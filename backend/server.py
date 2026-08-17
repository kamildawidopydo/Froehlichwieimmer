"""
Kapitalmitte FastAPI backend.

Phase 1 scope:
- JWT auth (register / login / me / refresh / logout / forgot / reset)
- Public content stubs (banks, savings_offers, news)
- Admin seeding, brute-force protection, MongoDB indexes

Everything MongoDB-based. All routes under /api prefix (ingress requirement).
"""

from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field


# ---------------------------------------------------------------------------
# Config & DB
# ---------------------------------------------------------------------------

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("kapitalmitte")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60 * 24  # 1 day (dev-friendly)
REFRESH_TOKEN_DAYS = 30
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

client = AsyncIOMotorClient(MONGO_URL, tz_aware=True)
db = client[DB_NAME]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str) -> None:
    response.set_cookie(
        "access_token", access,
        httponly=True, secure=True, samesite="none",
        max_age=ACCESS_TOKEN_MINUTES * 60, path="/",
    )
    response.set_cookie(
        "refresh_token", refresh,
        httponly=True, secure=True, samesite="none",
        max_age=REFRESH_TOKEN_DAYS * 86400, path="/",
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


def public_user(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "email": doc["email"],
        "name": doc.get("name", ""),
        "role": doc.get("role", "user"),
        "avatar_url": doc.get("avatar_url"),
        "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
    }


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        sub = payload.get("sub")
        if not sub or not ObjectId.is_valid(sub):
            raise HTTPException(status_code=401, detail="Invalid token subject")
        user = await db.users.find_one({"_id": ObjectId(sub)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return public_user(user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


# ---------------------------------------------------------------------------
# Brute-force protection
# ---------------------------------------------------------------------------

MAX_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


def _as_aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


async def check_lockout(identifier: str) -> None:
    rec = await db.login_attempts.find_one({"identifier": identifier})
    if not rec or rec.get("count", 0) < MAX_ATTEMPTS:
        return
    locked_until = _as_aware(rec.get("locked_until"))
    if locked_until and locked_until > datetime.now(timezone.utc):
        raise HTTPException(
            status_code=429,
            detail="Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.",
        )


async def record_failed_login(identifier: str) -> None:
    """Atomic $inc so concurrent failures cannot lose increments."""
    now = datetime.now(timezone.utc)
    updated = await db.login_attempts.find_one_and_update(
        {"identifier": identifier},
        {"$inc": {"count": 1}, "$set": {"last_attempt": now}},
        upsert=True,
        return_document=True,  # After update, works with motor: use projection alt
    )
    # motor's find_one_and_update returns the pre-update doc by default; re-read for the new count.
    if not updated or updated.get("count", 0) + 1 >= MAX_ATTEMPTS:
        current = await db.login_attempts.find_one({"identifier": identifier})
        if current and current.get("count", 0) >= MAX_ATTEMPTS:
            await db.login_attempts.update_one(
                {"identifier": identifier},
                {"$set": {"locked_until": now + timedelta(minutes=LOCKOUT_MINUTES)}},
            )


async def clear_login_attempts(identifier: str) -> None:
    await db.login_attempts.delete_one({"identifier": identifier})


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class RegisterInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: Optional[str] = ""


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class ForgotInput(BaseModel):
    email: EmailStr


class ResetInput(BaseModel):
    token: str
    password: str = Field(min_length=8)


class UpdateMeInput(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None


class BankOut(BaseModel):
    id: str
    slug: str
    name: str
    country: str
    logo_url: Optional[str] = None
    description: Optional[str] = None


class OfferOut(BaseModel):
    id: str
    bank_slug: str
    product_type: str  # tagesgeld | festgeld | flexgeld
    interest_rate: float
    term_months: Optional[int] = None
    min_amount: float
    max_amount: Optional[float] = None
    currency: str = "EUR"


class NewsOut(BaseModel):
    id: str
    slug: str
    title: str
    excerpt: str
    published_at: str
    category: str
    image_url: Optional[str] = None


# ---------------------------------------------------------------------------
# App & Router
# ---------------------------------------------------------------------------

app = FastAPI(title="Kapitalmitte API", version="0.1.0")
api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"service": "kapitalmitte-api", "status": "ok"}


@api.get("/health")
async def health():
    try:
        await db.command("ping")
        return {"status": "ok", "db": "up"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"db_down: {e}")


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------

@api.post("/auth/register")
async def register(payload: RegisterInput, response: Response):
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


@api.post("/auth/login")
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


@api.post("/auth/logout")
async def logout(response: Response, _user: dict = Depends(get_current_user)):
    clear_auth_cookies(response)
    return {"status": "ok"}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api.patch("/auth/me")
async def update_me(payload: UpdateMeInput, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not update:
        return user
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": update})
    doc = await db.users.find_one({"_id": ObjectId(user["id"])})
    return public_user(doc)


@api.post("/auth/refresh")
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


@api.post("/auth/forgot-password")
async def forgot_password(payload: ForgotInput):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    # Always return 200 to prevent user enumeration.
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token": token,
            "user_id": user["_id"],
            "used": False,
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
            "created_at": datetime.now(timezone.utc),
        })
        # Don't log the full token — it is a live credential. In production
        # this is dispatched through the Resend integration instead.
        logger.info("Password reset requested for %s (token issued, expires 1h)", email)
    return {"status": "ok"}


@api.post("/auth/reset-password")
async def reset_password(payload: ResetInput):
    rec = await db.password_reset_tokens.find_one({"token": payload.token})
    if not rec:
        raise HTTPException(status_code=400, detail="Ungültiger Token.")
    if rec.get("used"):
        raise HTTPException(status_code=400, detail="Token bereits verwendet.")
    if _as_aware(rec["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token abgelaufen.")
    new_hash = hash_password(payload.password)
    await db.users.update_one({"_id": rec["user_id"]}, {"$set": {"password_hash": new_hash}})
    await db.password_reset_tokens.update_one({"_id": rec["_id"]}, {"$set": {"used": True}})
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Public content — banks / offers / news (seed data for now)
# ---------------------------------------------------------------------------

@api.get("/content/banks", response_model=List[BankOut])
async def list_banks():
    docs = await db.banks.find({}, {"_id": 1, "slug": 1, "name": 1, "country": 1, "logo_url": 1, "description": 1}).to_list(200)
    return [{"id": str(d["_id"]), **{k: d.get(k) for k in ("slug", "name", "country", "logo_url", "description")}} for d in docs]


@api.get("/content/offers", response_model=List[OfferOut])
async def list_offers(bank_slug: Optional[str] = None, product_type: Optional[str] = None):
    q: dict = {}
    if bank_slug:
        q["bank_slug"] = bank_slug
    if product_type:
        q["product_type"] = product_type
    docs = await db.savings_offers.find(q).to_list(500)
    result = []
    for d in docs:
        result.append({
            "id": str(d["_id"]),
            "bank_slug": d["bank_slug"],
            "product_type": d["product_type"],
            "interest_rate": d["interest_rate"],
            "term_months": d.get("term_months"),
            "min_amount": d["min_amount"],
            "max_amount": d.get("max_amount"),
            "currency": d.get("currency", "EUR"),
        })
    return result


@api.get("/content/news", response_model=List[NewsOut])
async def list_news(limit: int = 20):
    docs = await db.news.find({}).sort("published_at", -1).limit(limit).to_list(limit)
    return [{
        "id": str(d["_id"]),
        "slug": d["slug"],
        "title": d["title"],
        "excerpt": d["excerpt"],
        "published_at": d["published_at"].isoformat() if isinstance(d.get("published_at"), datetime) else d.get("published_at", ""),
        "category": d.get("category", "markt"),
        "image_url": d.get("image_url"),
    } for d in docs]


# ---------------------------------------------------------------------------
# Startup: indexes + seed
# ---------------------------------------------------------------------------

async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@kapitalmitte.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "avatar_url": None,
            "created_at": datetime.now(timezone.utc),
        })
        logger.info("Seeded admin: %s", admin_email)
    else:
        # Keep hash in sync with .env password (idempotent on password rotate)
        if not verify_password(admin_password, existing["password_hash"]):
            await db.users.update_one(
                {"_id": existing["_id"]},
                {"$set": {"password_hash": hash_password(admin_password)}},
            )
            logger.info("Updated admin password hash for %s", admin_email)


async def seed_content():
    # Seed each collection independently so a partial seed can be repaired.
    banks = [
        {"slug": "bbva", "name": "BBVA", "country": "ES", "logo_url": "/assets/bank-logos/bbva.svg",
         "description": "Spanische Großbank mit europäischen Sparangeboten."},
        {"slug": "bunq", "name": "bunq", "country": "NL", "logo_url": "/assets/bank-logos/bunq.svg",
         "description": "Digitale niederländische Bank mit flexiblen Sparprodukten."},
        {"slug": "ing", "name": "ING", "country": "DE", "logo_url": "/assets/bank-logos/ing.svg",
         "description": "Deutsche Direktbank mit Festgeld- und Flexgeld-Konditionen."},
        {"slug": "postbank", "name": "Postbank", "country": "DE", "logo_url": "/assets/bank-logos/postbank.svg",
         "description": "Traditionsbank mit sicheren Einlagen."},
        {"slug": "knab", "name": "Knab", "country": "NL", "logo_url": "/assets/bank-logos/knab.svg",
         "description": "Niederländische Onlinebank für Sparanlagen."},
    ]
    if await db.banks.count_documents({}) == 0:
        await db.banks.insert_many(banks)
    offers = [
        {"bank_slug": "bbva", "product_type": "tagesgeld", "interest_rate": 3.5, "term_months": None, "min_amount": 1000, "max_amount": 250000, "currency": "EUR"},
        {"bank_slug": "bbva", "product_type": "festgeld", "interest_rate": 3.85, "term_months": 12, "min_amount": 5000, "max_amount": 500000, "currency": "EUR"},
        {"bank_slug": "bbva", "product_type": "flexgeld", "interest_rate": 3.25, "term_months": None, "min_amount": 500, "max_amount": 100000, "currency": "EUR"},
        {"bank_slug": "bunq", "product_type": "flexgeld", "interest_rate": 3.36, "term_months": None, "min_amount": 100, "max_amount": 100000, "currency": "EUR"},
        {"bank_slug": "bunq", "product_type": "festgeld", "interest_rate": 3.75, "term_months": 24, "min_amount": 1000, "max_amount": 250000, "currency": "EUR"},
        {"bank_slug": "ing", "product_type": "tagesgeld", "interest_rate": 3.3, "term_months": None, "min_amount": 1, "max_amount": 100000, "currency": "EUR"},
        {"bank_slug": "ing", "product_type": "festgeld", "interest_rate": 3.5, "term_months": 12, "min_amount": 5000, "max_amount": None, "currency": "EUR"},
        {"bank_slug": "postbank", "product_type": "festgeld", "interest_rate": 3.4, "term_months": 6, "min_amount": 2500, "max_amount": None, "currency": "EUR"},
        {"bank_slug": "knab", "product_type": "festgeld", "interest_rate": 3.65, "term_months": 12, "min_amount": 1000, "max_amount": 100000, "currency": "EUR"},
    ]
    if await db.savings_offers.count_documents({}) == 0:
        await db.savings_offers.insert_many(offers)

    news_items = [
        {"slug": "ezb-zinsentscheidung-februar-2026", "title": "EZB hält Leitzins konstant — Sparzinsen bleiben attraktiv",
         "excerpt": "Die Europäische Zentralbank belässt den Hauptrefinanzierungssatz bei 3,50 %. Für Anleger heißt das: Tagesgeld- und Festgeld-Konditionen bleiben vorerst stabil.",
         "published_at": datetime.now(timezone.utc) - timedelta(days=1), "category": "makro", "image_url": None},
        {"slug": "bbva-erhoeht-flexgeld-zins", "title": "BBVA erhöht Flexgeld-Konditionen auf 3,25 %",
         "excerpt": "Die spanische Großbank passt ihre Flexgeld-Verzinsung nach oben an. Für Bestandskunden gilt der neue Zinssatz ab dem 15. Februar.",
         "published_at": datetime.now(timezone.utc) - timedelta(days=3), "category": "produkte", "image_url": None},
        {"slug": "dax-ausblick-q1-2026", "title": "DAX-Ausblick Q1 2026: Zwischen Zinshoffnung und Konjunkturangst",
         "excerpt": "Der deutsche Leitindex hat 2026 mit einem verhaltenen Start begonnen. Analysten sind zwiegespalten — wir zeigen die wichtigsten Treiber.",
         "published_at": datetime.now(timezone.utc) - timedelta(days=5), "category": "aktien", "image_url": None},
    ]
    if await db.news.count_documents({}) == 0:
        await db.news.insert_many(news_items)
    logger.info(
        "Content ready: banks=%d offers=%d news=%d",
        await db.banks.count_documents({}),
        await db.savings_offers.count_documents({}),
        await db.news.count_documents({}),
    )


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index("identifier")
    await db.banks.create_index("slug", unique=True)
    await db.savings_offers.create_index([("bank_slug", 1), ("product_type", 1)])
    await db.news.create_index("slug", unique=True)
    await db.news.create_index([("published_at", -1)])
    await seed_admin()
    await seed_content()
    logger.info("Startup complete")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# ---------------------------------------------------------------------------
# CORS + mount
# ---------------------------------------------------------------------------

app.include_router(api)

allowed = [o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()]
if allowed == ["*"]:
    # SameSite=None cookies require an explicit origin; mirror the frontend URL if user left it as "*"
    allowed = [FRONTEND_URL]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
