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

import random
import os
import re
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List

import bcrypt
import jwt
import httpx
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
MARKETAUX_KEY = os.environ.get("MARKETAUX_KEY", "").strip()
TWELVE_DATA_KEY = os.environ.get("TWELVE_DATA_KEY", "").strip()
MARKET_CACHE_SECONDS = 300  # 5 min cache to protect free-tier limits

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


# --- News & Märkte -----------------------------------------------------------

class ArticleOut(BaseModel):
    id: str
    slug: str
    title: str
    excerpt: str
    category: str
    source: str
    source_url: Optional[str] = None
    image_url: Optional[str] = None
    published_at: str
    featured: bool = False
    highlight_investor: bool = False


class EditorialOut(BaseModel):
    id: str
    slug: str
    title: str
    dek: str
    body: str
    author: str
    published: bool
    published_at: str
    updated_at: Optional[str] = None


class EditorialInput(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    dek: str = Field(default="", max_length=400)
    body: str = Field(min_length=10)
    published: bool = True


class MarketInsight(BaseModel):
    symbol: str
    name: str
    value: float
    change_pct: float
    unit: str = ""
    updated_at: str


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
# Emergent-managed email (Resend) — used to send the review invitation link
# ---------------------------------------------------------------------------

EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMERGENT_EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY", "").strip()
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "Fröhlich Vermögensberatung").strip()
EMAIL_REPLY_TO = os.environ.get("EMAIL_REPLY_TO", "").strip() or None

_EMAIL_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_EMAIL_CRED_ASK = ("reply with your password", "reply with the code", "send your password",
                   "your full card number", "seed phrase", "recovery phrase")


def _email_link_ok(url: str) -> bool:
    low = url.strip().lower()
    if low.startswith(("mailto:", "tel:", "cid:", "#")):
        return True
    if not low.startswith("https://"):
        return False
    from urllib.parse import urlparse
    p = urlparse(low)
    host = p.hostname or ""
    if not host or "xn--" in host or p.username:
        return False
    import ipaddress
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _EMAIL_SHORTENERS)


def _assert_safe_email(subject: str, html: str) -> None:
    lowered = f"{subject}\n{html}".lower()
    if any(p in lowered for p in _EMAIL_CRED_ASK):
        raise ValueError("Email must not ask recipients for credentials.")
    if re.search(r"<\s*(form|input|textarea|select)\b", html, re.I):
        raise ValueError("Email must not contain forms or input fields.")
    for url in re.findall(r'href\s*=\s*"([^"]+)"', html) + re.findall(r'src\s*=\s*"([^"]+)"', html):
        if not _email_link_ok(url):
            raise ValueError(f"Unsafe email link: {url}")


async def _send_email_via_emergent(to: str, subject: str, html: str) -> Optional[str]:
    if not EMERGENT_EMAIL_KEY:
        logger.warning("EMERGENT_EMAIL_KEY missing — email not sent (dry-run).")
        return None
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    if EMAIL_REPLY_TO:
        payload["contact_email"] = EMAIL_REPLY_TO
    try:
        async with httpx.AsyncClient(timeout=15) as client_http:
            r = await client_http.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": EMERGENT_EMAIL_KEY},
                json=payload,
            )
        r.raise_for_status()
        return r.json().get("id")
    except Exception as e:
        logger.error("Email send failed: %s", e)
        raise HTTPException(status_code=502, detail="E-Mail konnte nicht versendet werden.")


def _invite_email_html(first_name: str, share_url: str, note: str) -> str:
    from html import escape
    greet = f"Hallo {escape(first_name)}," if first_name else "Guten Tag,"
    note_line = f"<p style=\"margin:0 0 16px;color:#333\">{escape(note)}</p>" if note else ""
    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="background:#f5f7fa;padding:32px 0;font-family:Georgia,serif">'
        f'<tr><td align="center"><table role="presentation" width="560" cellpadding="0" '
        f'cellspacing="0" style="background:#ffffff;padding:36px;border:1px solid #e5e7eb">'
        f'<tr><td>'
        f'<p style="margin:0 0 8px;color:#c9a961;font-size:12px;letter-spacing:0.16em;'
        f'text-transform:uppercase">Fröhlich Vermögensberatung</p>'
        f'<h1 style="margin:0 0 20px;color:#0f1d34;font-size:22px;line-height:1.3">'
        f'Ihre persönliche Einladung</h1>'
        f'<p style="margin:0 0 16px;color:#333">{greet}</p>'
        f'{note_line}'
        f'<p style="margin:0 0 24px;color:#333;line-height:1.6">Wir würden uns freuen, wenn Sie '
        f'sich einen kurzen Moment nehmen, um Ihre Erfahrung aus der Zusammenarbeit mit uns zu '
        f'teilen. Ihre Rückmeldung erscheint erst nach interner Prüfung öffentlich.</p>'
        f'<p style="margin:24px 0"><a href="{escape(share_url)}" '
        f'style="display:inline-block;padding:14px 28px;background:#0f1d34;color:#ffffff;'
        f'font-family:Arial,sans-serif;font-size:14px;text-decoration:none;letter-spacing:0.02em">'
        f'Erfahrung teilen</a></p>'
        f'<p style="margin:0;color:#888;font-size:12px">Der Link ist 30 Tage gültig. '
        f'Sie erhalten diese E-Mail als Kunde der Fröhlich Vermögensberatung. Wir bitten '
        f'niemals per E-Mail um Passwörter, Zugangsdaten oder Zahlungsinformationen.</p>'
        f'</td></tr></table></td></tr></table>'
    )


# ---------------------------------------------------------------------------
# News & Märkte — feed, market insights, editorial CRUD
# ---------------------------------------------------------------------------

NEWS_CATEGORIES = {
    "maerkte", "aktien", "wirtschaft", "unternehmen", "zinsen", "international",
    "fonds-etfs", "rohstoffe", "seltene-erden", "waehrungen", "anleihen", "investmenttrends",
}
CATEGORY_LABELS = {
    "maerkte": "Märkte",
    "aktien": "Aktien",
    "wirtschaft": "Wirtschaft",
    "unternehmen": "Unternehmen",
    "zinsen": "Zinsen",
    "international": "International",
    "fonds-etfs": "Fonds & ETFs",
    "rohstoffe": "Rohstoffe",
    "seltene-erden": "Seltene Erden",
    "waehrungen": "Währungen",
    "anleihen": "Anleihen",
    "investmenttrends": "Investmenttrends",
}


def _slugify(text: str) -> str:
    s = text.lower()
    s = re.sub(r"[äöüß]", lambda m: {"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss"}[m.group(0)], s)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:80] or secrets.token_hex(4)


def _article_to_out(d: dict) -> dict:
    published = d.get("published_at")
    return {
        "id": str(d["_id"]),
        "slug": d.get("slug", ""),
        "title": d.get("title", ""),
        "excerpt": d.get("excerpt", ""),
        "category": d.get("category", "maerkte"),
        "source": d.get("source", "Fröhlich Vermögensberatung"),
        "source_url": d.get("source_url"),
        "image_url": d.get("image_url"),
        "published_at": published.isoformat() if isinstance(published, datetime) else str(published or ""),
        "featured": bool(d.get("featured", False)),
        "highlight_investor": bool(d.get("highlight_investor", False)),
    }


def _editorial_to_out(d: dict) -> dict:
    published = d.get("published_at")
    updated = d.get("updated_at")
    return {
        "id": str(d["_id"]),
        "slug": d.get("slug", ""),
        "title": d.get("title", ""),
        "dek": d.get("dek", ""),
        "body": d.get("body", ""),
        "author": d.get("author", "Fröhlich Vermögensberatung"),
        "published": bool(d.get("published", True)),
        "published_at": published.isoformat() if isinstance(published, datetime) else str(published or ""),
        "updated_at": updated.isoformat() if isinstance(updated, datetime) else (str(updated) if updated else None),
    }


_market_cache: dict = {"data": None, "at": None}


async def _fetch_market_snapshots() -> List[dict]:
    """Fetch live indices from Twelve Data if key is set; else return fallback."""
    now_iso = datetime.now(timezone.utc).isoformat()
    fallback = [
        {"symbol": "DAX", "name": "DAX", "value": 18750.42, "change_pct": 0.52, "unit": "Punkte", "updated_at": now_iso},
        {"symbol": "DJI", "name": "Dow Jones", "value": 44120.55, "change_pct": -0.18, "unit": "Punkte", "updated_at": now_iso},
        {"symbol": "SPX", "name": "S&P 500", "value": 6120.83, "change_pct": 0.31, "unit": "Punkte", "updated_at": now_iso},
        {"symbol": "NDX", "name": "Nasdaq 100", "value": 22140.19, "change_pct": 0.74, "unit": "Punkte", "updated_at": now_iso},
        {"symbol": "SX5E", "name": "Euro Stoxx 50", "value": 5290.62, "change_pct": 0.23, "unit": "Punkte", "updated_at": now_iso},
        {"symbol": "XAU/USD", "name": "Gold", "value": 2915.40, "change_pct": 0.42, "unit": "USD/oz", "updated_at": now_iso},
        {"symbol": "EUR/USD", "name": "EUR/USD", "value": 1.0862, "change_pct": -0.09, "unit": "", "updated_at": now_iso},
    ]
    if not TWELVE_DATA_KEY:
        return fallback
    symbols_map = [
        ("DAX", "DAX", "Punkte"),
        ("DJI", "Dow Jones", "Punkte"),
        ("SPX", "S&P 500", "Punkte"),
        ("NDX", "Nasdaq 100", "Punkte"),
        ("SX5E", "Euro Stoxx 50", "Punkte"),
        ("XAU/USD", "Gold", "USD/oz"),
        ("EUR/USD", "EUR/USD", ""),
    ]
    result = []
    try:
        async with httpx.AsyncClient(timeout=8.0) as client_http:
            for symbol, name, unit in symbols_map:
                r = await client_http.get(
                    "https://api.twelvedata.com/quote",
                    params={"symbol": symbol, "apikey": TWELVE_DATA_KEY},
                )
                if r.status_code == 200:
                    data = r.json()
                    if "close" in data:
                        result.append({
                            "symbol": symbol,
                            "name": name,
                            "value": float(data.get("close") or 0),
                            "change_pct": float(data.get("percent_change") or 0),
                            "unit": unit,
                            "updated_at": now_iso,
                        })
        if len(result) >= 4:
            return result
    except Exception as e:
        logger.warning("Twelve Data fetch failed, using fallback: %s", e)
    return fallback


@api.get("/news-markte/feed")
async def news_markte_feed(category: Optional[str] = None, limit: int = 30):
    q: dict = {}
    if category and category != "alle":
        q["category"] = category
    docs = await db.news_markte_articles.find(q).sort("published_at", -1).limit(limit).to_list(limit)
    articles = [_article_to_out(d) for d in docs]
    all_docs = docs if q == {} else await db.news_markte_articles.find({}).sort("published_at", -1).to_list(50)
    all_articles = [_article_to_out(d) for d in all_docs]
    top = [a for a in all_articles if a["featured"]][:3]
    if len(top) < 3:
        seen = {a["id"] for a in top}
        for a in all_articles:
            if a["id"] not in seen:
                top.append(a)
                if len(top) >= 3:
                    break
    top_ids = {a["id"] for a in top}
    weitere = [a for a in articles if a["id"] not in top_ids][:9]
    anleger = [a for a in all_articles if a["highlight_investor"]][:6]
    return {
        "top": top,
        "overview": articles[:15],
        "weitere": weitere,
        "anleger": anleger,
        "categories": [{"slug": k, "label": v} for k, v in CATEGORY_LABELS.items()],
    }


@api.get("/news-markte/markets", response_model=List[MarketInsight])
async def news_markte_markets():
    now = datetime.now(timezone.utc)
    cached = _market_cache.get("data")
    at = _market_cache.get("at")
    if cached and at and (now - at).total_seconds() < MARKET_CACHE_SECONDS:
        return cached
    data = await _fetch_market_snapshots()
    _market_cache["data"] = data
    _market_cache["at"] = now
    return data


@api.get("/news-markte/editorial", response_model=List[EditorialOut])
async def list_editorial():
    docs = await db.editorial_posts.find({"published": True}).sort("published_at", -1).to_list(50)
    return [_editorial_to_out(d) for d in docs]


@api.get("/news-markte/editorial/admin", response_model=List[EditorialOut])
async def list_editorial_admin(_user: dict = Depends(require_admin)):
    docs = await db.editorial_posts.find({}).sort("published_at", -1).to_list(200)
    return [_editorial_to_out(d) for d in docs]


@api.post("/news-markte/editorial", response_model=EditorialOut)
async def create_editorial(payload: EditorialInput, _user: dict = Depends(require_admin)):
    now = datetime.now(timezone.utc)
    doc = {
        "slug": _slugify(payload.title) + "-" + secrets.token_hex(3),
        "title": payload.title,
        "dek": payload.dek,
        "body": payload.body,
        "author": "Fröhlich Vermögensberatung",
        "published": payload.published,
        "published_at": now,
        "updated_at": now,
    }
    res = await db.editorial_posts.insert_one(doc)
    doc["_id"] = res.inserted_id
    return _editorial_to_out(doc)


@api.put("/news-markte/editorial/{post_id}", response_model=EditorialOut)
async def update_editorial(post_id: str, payload: EditorialInput, _user: dict = Depends(require_admin)):
    if not ObjectId.is_valid(post_id):
        raise HTTPException(status_code=400, detail="Invalid id")
    now = datetime.now(timezone.utc)
    update = payload.model_dump()
    update["updated_at"] = now
    r = await db.editorial_posts.update_one({"_id": ObjectId(post_id)}, {"$set": update})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    doc = await db.editorial_posts.find_one({"_id": ObjectId(post_id)})
    return _editorial_to_out(doc)


@api.delete("/news-markte/editorial/{post_id}")
async def delete_editorial(post_id: str, _user: dict = Depends(require_admin)):
    if not ObjectId.is_valid(post_id):
        raise HTTPException(status_code=400, detail="Invalid id")
    r = await db.editorial_posts.delete_one({"_id": ObjectId(post_id)})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"deleted": r.deleted_count}


# --- Anlagetrends / Investment-Radar / Stimmen zum Markt --------------------

@api.get("/news-markte/anlagetrends")
async def list_anlagetrends():
    docs = await db.anlagetrends.find({}).sort("order", 1).to_list(50)
    return [{
        "id": str(d["_id"]),
        "slug": d.get("slug"),
        "title": d.get("title"),
        "summary": d.get("summary"),
        "detail": d.get("detail"),
        "tag": d.get("tag"),
        "icon": d.get("icon"),
    } for d in docs]


@api.get("/news-markte/investment-radar")
async def list_investment_radar():
    docs = await db.investment_radar.find({}).sort("order", 1).to_list(50)
    return [{
        "id": str(d["_id"]),
        "theme": d.get("theme"),
        "category": d.get("category"),
        "why": d.get("why"),
        "horizon": d.get("horizon"),
        "tag": d.get("tag"),
        "related_slug": d.get("related_slug"),
    } for d in docs]


@api.get("/news-markte/market-voices")
async def list_market_voices():
    docs = await db.market_voices.find({}).sort("published_at", -1).to_list(50)
    return [{
        "id": str(d["_id"]),
        "source": d.get("source"),
        "source_url": d.get("source_url"),
        "topic": d.get("topic"),
        "excerpt": d.get("excerpt"),
        "published_at": d["published_at"].isoformat() if isinstance(d.get("published_at"), datetime) else str(d.get("published_at", "")),
    } for d in docs]


# --- Personalisierung (Watchlist / Interessen) — scaffold only --------------

class PreferencesInput(BaseModel):
    interests: List[str] = Field(default_factory=list)
    watchlist: List[str] = Field(default_factory=list)


@api.get("/news-markte/preferences")
async def get_preferences(user: dict = Depends(get_current_user)):
    doc = await db.user_preferences.find_one({"user_id": ObjectId(user["id"])})
    return {
        "interests": doc.get("interests", []) if doc else [],
        "watchlist": doc.get("watchlist", []) if doc else [],
    }


@api.put("/news-markte/preferences")
async def update_preferences(payload: PreferencesInput, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    interests = [i.strip().lower() for i in payload.interests if i and i.strip()][:20]
    watchlist = [w.strip().lower() for w in payload.watchlist if w and w.strip()][:20]
    await db.user_preferences.update_one(
        {"user_id": ObjectId(user["id"])},
        {"$set": {"interests": interests, "watchlist": watchlist, "updated_at": now},
         "$setOnInsert": {"user_id": ObjectId(user["id"]), "created_at": now}},
        upsert=True,
    )
    return {"interests": interests, "watchlist": watchlist}


@api.get("/news-markte/for-you")
async def news_for_you(user: dict = Depends(get_current_user), limit: int = 12):
    doc = await db.user_preferences.find_one({"user_id": ObjectId(user["id"])})
    interests = (doc or {}).get("interests", []) if doc else []
    if not interests:
        return {"personalized": False, "items": []}
    q = {"category": {"$in": interests}}
    docs = await db.news_markte_articles.find(q).sort("published_at", -1).limit(limit).to_list(limit)
    return {"personalized": True, "items": [_article_to_out(d) for d in docs]}


# ---------------------------------------------------------------------------
# Customer Reviews — moderated public reviews
# ---------------------------------------------------------------------------

REVIEW_STATUS_VALUES = {"pending", "approved", "rejected"}
_review_rate_limit: dict = {}  # ip -> [timestamps]

REVIEW_TOPICS = [
    ("persoenliche-betreuung", "Persönliche Betreuung"),
    ("vertrauen", "Vertrauen"),
    ("beratung", "Beratung"),
    ("erreichbarkeit", "Erreichbarkeit"),
    ("langfristigkeit", "Langfristige Zusammenarbeit"),
    ("transparenz", "Transparenz"),
    ("service", "Service"),
    ("investmentuebersicht", "Investment-Übersicht"),
]
REVIEW_TOPIC_SLUGS = {slug for slug, _ in REVIEW_TOPICS}


def _sanitize_text(raw: str, max_len: int = 2000) -> str:
    if not raw:
        return ""
    # Strip any HTML/script tags — plain text only
    cleaned = re.sub(r"<[^>]*>", "", str(raw))
    # Collapse runaway whitespace
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()[:max_len]


def _display_name(first: str, last: str) -> str:
    first = (first or "").strip()
    last = (last or "").strip()
    if not first:
        return "Anonym"
    initial = f" {last[0].upper()}." if last else ""
    return f"{first}{initial}"


def _review_to_public(d: dict) -> dict:
    published = d.get("created_at")
    responded = d.get("responded_at")
    return {
        "id": str(d["_id"]),
        "display_name": d.get("display_name") or _display_name(d.get("first_name"), d.get("last_name")),
        "rating": int(d.get("rating") or 0),
        "text": d.get("text", ""),
        "customer_since": d.get("customer_since") or None,
        "is_featured": bool(d.get("is_featured", False)),
        "is_demo": bool(d.get("is_demo", False)),
        "admin_response": d.get("admin_response") or None,
        "responded_at": responded.isoformat() if isinstance(responded, datetime) else (str(responded) if responded else None),
        "topics": [t for t in (d.get("topics") or []) if t in REVIEW_TOPIC_SLUGS],
        "created_at": published.isoformat() if isinstance(published, datetime) else str(published or ""),
        "is_verified": bool(d.get("is_verified", False)),
    }


def _review_to_admin(d: dict) -> dict:
    published = d.get("created_at")
    moderated = d.get("moderated_at")
    responded = d.get("responded_at")
    return {
        "id": str(d["_id"]),
        "first_name": d.get("first_name", ""),
        "last_name": d.get("last_name", ""),
        "email": d.get("email", ""),
        "rating": int(d.get("rating") or 0),
        "text": d.get("text", ""),
        "display_name": d.get("display_name") or _display_name(d.get("first_name"), d.get("last_name")),
        "customer_since": d.get("customer_since") or None,
        "topics": [t for t in (d.get("topics") or []) if t in REVIEW_TOPIC_SLUGS],
        "is_featured": bool(d.get("is_featured", False)),
        "is_demo": bool(d.get("is_demo", False)),
        "admin_response": d.get("admin_response") or None,
        "responded_at": responded.isoformat() if isinstance(responded, datetime) else (str(responded) if responded else None),
        "responded_by": d.get("responded_by"),
        "status": d.get("status", "pending"),
        "is_verified": bool(d.get("is_verified", False)),
        "invited": bool(d.get("invited", False)),
        "created_at": published.isoformat() if isinstance(published, datetime) else str(published or ""),
        "moderated_at": moderated.isoformat() if isinstance(moderated, datetime) else (str(moderated) if moderated else None),
        "moderated_by": d.get("moderated_by"),
        "admin_note": d.get("admin_note", ""),
    }


class ReviewSubmit(BaseModel):
    first_name: str = Field(min_length=1, max_length=60)
    last_name: str = Field(min_length=1, max_length=60)
    email: EmailStr
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    text: str = Field(min_length=10, max_length=2000)
    customer_since: Optional[str] = Field(default=None, max_length=20)
    topics: Optional[List[str]] = Field(default_factory=list)
    invite_token: Optional[str] = None
    consent: bool
    # Honeypot: must be empty. Bots typically fill all fields.
    website: Optional[str] = ""


class ReviewModerationInput(BaseModel):
    status: Optional[str] = None
    display_name: Optional[str] = Field(default=None, max_length=80)
    is_verified: Optional[bool] = None
    is_featured: Optional[bool] = None
    customer_since: Optional[str] = Field(default=None, max_length=20)
    topics: Optional[List[str]] = None
    admin_note: Optional[str] = Field(default=None, max_length=500)
    admin_response: Optional[str] = Field(default=None, max_length=1000)


class ReviewInviteInput(BaseModel):
    email: EmailStr
    first_name: Optional[str] = Field(default="", max_length=60)
    last_name: Optional[str] = Field(default="", max_length=60)
    note: Optional[str] = Field(default="", max_length=200)


@api.post("/reviews/submit")
async def submit_review(payload: ReviewSubmit, request: Request):
    if payload.website:
        # Honeypot triggered — silently accept (return 202 but do not persist)
        return {"ok": True, "status": "pending"}
    if not payload.consent:
        raise HTTPException(status_code=400, detail="Bitte bestätigen Sie die Datenschutzhinweise.")

    # Rate limit: proxy-aware — honor X-Forwarded-For (left-most) so the k8s
    # ingress IP doesn't throttle the whole site. Max 5 submissions per IP/h.
    xff = (request.headers.get("x-forwarded-for") or "").split(",")[0].strip()
    ip = xff or (request.client.host if request.client else "unknown") or "unknown"
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(hours=1)
    # Prune stale entries so the in-process map doesn't grow unbounded
    for stale_ip in [k for k, v in _review_rate_limit.items() if not any(t > window_start for t in v)]:
        _review_rate_limit.pop(stale_ip, None)
    prev = [t for t in _review_rate_limit.get(ip, []) if t > window_start]
    if len(prev) >= 5:
        raise HTTPException(status_code=429, detail="Zu viele Anfragen. Bitte versuchen Sie es später erneut.")
    prev.append(now)
    _review_rate_limit[ip] = prev

    text = _sanitize_text(payload.text)
    if len(text) < 10:
        raise HTTPException(status_code=400, detail="Bitte geben Sie einen aussagekräftigen Bewertungstext ein.")

    first_name = _sanitize_text(payload.first_name, 60)
    last_name = _sanitize_text(payload.last_name, 60)

    # If the submission comes from a valid invite link, mark it accordingly.
    invited = False
    if payload.invite_token:
        inv = await db.review_invites.find_one({"token": payload.invite_token, "expires_at": {"$gt": now}})
        if inv:
            invited = True
            await db.review_invites.update_one(
                {"_id": inv["_id"]},
                {"$set": {"used_at": now, "used_email": payload.email.lower()}},
            )

    topics = [t for t in (payload.topics or []) if t in REVIEW_TOPIC_SLUGS][:3]

    doc = {
        "first_name": first_name,
        "last_name": last_name,
        "email": payload.email.lower(),
        "rating": int(payload.rating) if payload.rating else None,
        "text": text,
        "customer_since": payload.customer_since if payload.customer_since in {"unter_1", "1_bis_3", "3_bis_5", "ueber_5"} else None,
        "topics": topics,
        "invited": invited,
        "status": "pending",
        "display_name": _display_name(first_name, last_name),
        "is_verified": False,
        "is_featured": False,
        "created_at": now,
        "moderated_at": None,
        "moderated_by": None,
        "admin_note": "",
        "ip_hash": secrets.token_hex(6),  # opaque marker, no PII
    }
    res = await db.reviews.insert_one(doc)
    return {"ok": True, "id": str(res.inserted_id), "status": "pending"}


@api.get("/reviews/public")
async def list_public_reviews(
    rating: Optional[int] = None,
    sort: str = "newest",
    limit: int = 12,
    offset: int = 0,
    featured: bool = False,
    topic: Optional[str] = None,
    include_demo: bool = False,
    response_filter: Optional[str] = None,
    q: Optional[str] = None,
):
    query: dict = {"status": "approved"}
    if not include_demo:
        query["is_demo"] = {"$ne": True}
    if rating and 1 <= rating <= 5:
        query["rating"] = rating
    if featured:
        query["is_featured"] = True
    if topic and topic in REVIEW_TOPIC_SLUGS:
        query["topics"] = topic
    if response_filter == "with":
        query["admin_response"] = {"$exists": True, "$ne": None, "$nin": [""]}
    elif response_filter == "without":
        query["$or"] = [{"admin_response": {"$exists": False}}, {"admin_response": None}, {"admin_response": ""}]
    if q and q.strip():
        needle = re.escape(q.strip()[:80])
        query["$and"] = query.get("$and", []) + [{"$or": [
            {"text": {"$regex": needle, "$options": "i"}},
            {"display_name": {"$regex": needle, "$options": "i"}},
        ]}]

    sort_map = {
        "newest": [("created_at", -1)],
        "oldest": [("created_at", 1)],
        "best": [("rating", -1), ("created_at", -1)],
        "worst": [("rating", 1), ("created_at", -1)],
    }
    sort_field = sort_map.get(sort, sort_map["newest"])
    total = await db.reviews.count_documents(query)
    docs = await db.reviews.find(query).sort(sort_field).skip(max(offset, 0)).limit(min(max(limit, 1), 100)).to_list(limit)
    return {
        "total": total,
        "items": [_review_to_public(d) for d in docs],
        "has_more": (offset + len(docs)) < total,
    }


@api.get("/reviews/topics")
async def list_review_topics(include_demo: bool = False):
    match: dict = {"status": "approved"}
    if not include_demo:
        match["is_demo"] = {"$ne": True}
    pipeline = [
        {"$match": match},
        {"$unwind": "$topics"},
        {"$group": {"_id": "$topics", "count": {"$sum": 1}}},
    ]
    rows = await db.reviews.aggregate(pipeline).to_list(50)
    counts = {r["_id"]: int(r["count"]) for r in rows if r.get("_id")}
    total = await db.reviews.count_documents(match)
    return {
        "topics": [{"slug": slug, "label": label, "count": counts.get(slug, 0)} for slug, label in REVIEW_TOPICS],
        "total_approved": total,
    }


@api.get("/reviews/stats")
async def review_stats(include_demo: bool = False):
    match: dict = {"status": "approved"}
    if not include_demo:
        match["is_demo"] = {"$ne": True}
    pipeline = [
        {"$match": match},
        {"$group": {"_id": "$rating", "count": {"$sum": 1}}},
    ]
    rows = await db.reviews.aggregate(pipeline).to_list(10)
    dist = {i: 0 for i in range(1, 6)}
    total = 0
    weighted = 0
    for r in rows:
        rating = int(r.get("_id") or 0)
        count = int(r.get("count") or 0)
        if 1 <= rating <= 5:
            dist[rating] = count
            total += count
            weighted += rating * count
    average = round(weighted / total, 2) if total > 0 else 0.0
    return {
        "total": total,
        "average": average,
        "distribution": [{"rating": r, "count": dist[r], "pct": round((dist[r] / total * 100), 1) if total else 0.0} for r in range(5, 0, -1)],
    }


@api.get("/reviews/admin")
async def list_admin_reviews(
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    include_demo: bool = False,
    _user: dict = Depends(require_admin),
):
    q: dict = {}
    if not include_demo:
        q["is_demo"] = {"$ne": True}
    if status and status in REVIEW_STATUS_VALUES:
        q["status"] = status
    total = await db.reviews.count_documents(q)
    pending_count = await db.reviews.count_documents({"status": "pending", "is_demo": {"$ne": True}})
    demo_count = await db.reviews.count_documents({"is_demo": True})
    docs = await db.reviews.find(q).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    return {
        "total": total,
        "pending_count": pending_count,
        "demo_count": demo_count,
        "items": [_review_to_admin(d) for d in docs],
    }


@api.put("/reviews/{review_id}", response_model=None)
async def moderate_review(review_id: str, payload: ReviewModerationInput, user: dict = Depends(require_admin)):
    if not ObjectId.is_valid(review_id):
        raise HTTPException(status_code=400, detail="Invalid id")
    update: dict = {}
    if payload.status is not None:
        if payload.status not in REVIEW_STATUS_VALUES:
            raise HTTPException(status_code=400, detail="Ungültiger Status")
        update["status"] = payload.status
        update["moderated_at"] = datetime.now(timezone.utc)
        update["moderated_by"] = user.get("email")
    if payload.display_name is not None:
        # Admin darf ausschließlich den öffentlichen Anzeigenamen anpassen — der Bewertungstext bleibt unverändert.
        update["display_name"] = _sanitize_text(payload.display_name, 80) or None
    if payload.is_verified is not None:
        update["is_verified"] = bool(payload.is_verified)
    if payload.is_featured is not None:
        update["is_featured"] = bool(payload.is_featured)
    if payload.customer_since is not None:
        cs = payload.customer_since.strip() if payload.customer_since else ""
        update["customer_since"] = cs if cs in {"unter_1", "1_bis_3", "3_bis_5", "ueber_5"} else None
    if payload.topics is not None:
        update["topics"] = [t for t in payload.topics if t in REVIEW_TOPIC_SLUGS][:3]
    if payload.admin_note is not None:
        update["admin_note"] = _sanitize_text(payload.admin_note, 500)
    if payload.admin_response is not None:
        cleaned = _sanitize_text(payload.admin_response, 1000)
        update["admin_response"] = cleaned if cleaned else None
        update["responded_at"] = datetime.now(timezone.utc) if cleaned else None
        update["responded_by"] = user.get("email") if cleaned else None
    if not update:
        raise HTTPException(status_code=400, detail="Keine Änderungen übermittelt.")
    r = await db.reviews.update_one({"_id": ObjectId(review_id)}, {"$set": update})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bewertung nicht gefunden.")
    doc = await db.reviews.find_one({"_id": ObjectId(review_id)})
    return _review_to_admin(doc)


@api.delete("/reviews/{review_id}")
async def delete_review(review_id: str, _user: dict = Depends(require_admin)):
    if not ObjectId.is_valid(review_id):
        raise HTTPException(status_code=400, detail="Invalid id")
    r = await db.reviews.delete_one({"_id": ObjectId(review_id)})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bewertung nicht gefunden.")
    return {"deleted": r.deleted_count}


# --- Review invites — tokenized share links for happy customers -------------

# Demo review templates — used ONLY to seed synthetic test data.
_DEMO_FIRST = ["Thomas", "Anna", "Michael", "Sabine", "Daniel", "Petra", "Julia", "Andreas", "Christina",
               "Frank", "Katrin", "Stefan", "Nicole", "Markus", "Silke", "Peter", "Sandra", "Wolfgang",
               "Simone", "Torsten", "Claudia", "Robert", "Susanne", "Christian", "Beate", "Martin",
               "Kerstin", "Uwe", "Angelika", "Jörg"]
_DEMO_LAST_INITIALS = list("BCDFGHJKLMNPRSTVWZ")
_DEMO_TOPICS_POOL = ["persoenliche-betreuung", "vertrauen", "beratung", "erreichbarkeit",
                     "langfristigkeit", "transparenz", "service", "investmentuebersicht"]
_DEMO_SINCE = ["unter_1", "1_bis_3", "3_bis_5", "ueber_5"]

_DEMO_5 = [
    ("Sehr persönliche Betreuung und immer gut erreichbar.", ["persoenliche-betreuung", "erreichbarkeit"]),
    ("Fragen werden verständlich erklärt — ich fühle mich rundum gut betreut.", ["beratung", "persoenliche-betreuung"]),
    ("Wir arbeiten seit mehreren Jahren zusammen und haben stets das Gefühl, gut aufgehoben zu sein.", ["langfristigkeit", "vertrauen"]),
    ("Transparente Kommunikation und eine sehr angenehme Beratung. Gerne wieder.", ["transparenz", "beratung"]),
    ("Die Investmentübersicht ist übersichtlich und ich habe jederzeit den Überblick.", ["investmentuebersicht"]),
    ("Was ich schätze: keine Verkaufsgespräche, sondern echte Beratung mit Blick auf meine Situation.", ["beratung", "vertrauen"]),
    ("Herr Fröhlich nimmt sich immer die Zeit, komplexe Themen sauber zu erklären.", ["beratung", "persoenliche-betreuung"]),
    ("Beim Onboarding wurde ich Schritt für Schritt begleitet — angenehm unaufgeregt.", ["service", "persoenliche-betreuung"]),
    ("Die Plattform funktioniert stabil und der Login ist einfach.", ["investmentuebersicht", "service"]),
    ("Ich fühle mich mit meiner Anlage sehr sicher aufgehoben.", ["vertrauen", "langfristigkeit"]),
    ("Bei internationalen Transaktionen wurde ich professionell unterstützt.", ["service", "beratung"]),
    ("Sicherheit steht bei mir an erster Stelle — hier wird das ernst genommen.", ["vertrauen"]),
    ("Sehr gute Auswahl bei Tages- und Festgeldangeboten.", ["investmentuebersicht"]),
    ("Meine ETF- und Fondsstrategie wurde in Ruhe mit mir aufgebaut.", ["beratung", "langfristigkeit"]),
    ("Fühle mich als Mensch gesehen, nicht als Nummer.", ["persoenliche-betreuung", "vertrauen"]),
    ("Beim Hauskauf im Ausland war die Unterstützung unbezahlbar.", ["beratung", "service"]),
    ("Klare Empfehlungen, aber immer mit Blick auf mein Risikoprofil.", ["beratung", "vertrauen"]),
    ("Sehr schnelle Rückmeldungen — das ist selten geworden.", ["erreichbarkeit", "service"]),
    ("Beim Spezial-AIF Thema wurde ich fundiert beraten.", ["beratung"]),
    ("Ich habe endlich einen festen Ansprechpartner, der mich und meine Ziele kennt.", ["persoenliche-betreuung", "langfristigkeit"]),
    ("Die langfristige Planung überzeugt mich seit Jahren.", ["langfristigkeit"]),
    ("Alle Kosten wurden im Voraus offen dargelegt.", ["transparenz"]),
    ("Bei Marktturbulenzen ruhige, sachliche Einordnung — genau das brauche ich.", ["beratung", "vertrauen"]),
]
_DEMO_4 = [
    ("Solide Beratung, die zu meinen Zielen passt.", ["beratung"]),
    ("Die Zusammenarbeit ist professionell und angenehm.", ["persoenliche-betreuung"]),
    ("Ich habe einen guten Überblick über meine Anlagen bekommen.", ["investmentuebersicht"]),
    ("Onboarding war klar strukturiert.", ["service"]),
    ("Bankauswahl wurde mir mit klaren Argumenten erklärt.", ["beratung", "transparenz"]),
    ("Insgesamt bin ich zufrieden mit der Betreuung.", ["persoenliche-betreuung"]),
    ("Die Plattform ist verständlich aufgebaut.", ["investmentuebersicht"]),
    ("Termine werden zuverlässig eingehalten.", ["service", "erreichbarkeit"]),
    ("Die Aktien- und ETF-Beratung war ausführlich.", ["beratung"]),
    ("Guter Mix aus Sicherheit und Wachstumschancen.", ["beratung", "vertrauen"]),
    ("Zufrieden — hätte mir bei einem Punkt etwas mehr Detail gewünscht.", ["beratung"]),
    ("Alles in allem eine gute Erfahrung.", ["service"]),
    ("Die Erklärungen zu Fonds und ETFs waren hilfreich.", ["beratung"]),
    ("Habe mich zu Liquidität und Anlagehorizont gut beraten gefühlt.", ["beratung"]),
]
_DEMO_3 = [
    ("Grundsätzlich zufrieden, gelegentlich hätte ich mir schnellere Rückmeldungen gewünscht.", ["erreichbarkeit"]),
    ("Die Plattform ist übersichtlich, beim ersten Login musste ich mich kurz zurechtfinden.", ["investmentuebersicht", "service"]),
    ("Die Beratung war ausführlich, teilweise hätte ich mir eine kürzere Zusammenfassung gewünscht.", ["beratung"]),
    ("Alles läuft, für meinen Geschmack manchmal etwas formal.", ["service"]),
    ("Solide, aber ich bin noch am Kennenlernen.", ["persoenliche-betreuung"]),
]
_DEMO_2 = [
    ("Der Ablauf war ok, die Einrichtung meines Zugangs hat aber etwas länger gedauert.", ["service", "investmentuebersicht"]),
    ("Bei meiner letzten Anfrage musste ich mehrere Tage auf eine Antwort warten.", ["erreichbarkeit"]),
]
_DEMO_RESPONSES_5 = [
    "Herzlichen Dank für Ihre offenen Worte — genau diese Nähe möchten wir langfristig bewahren.",
    "Vielen Dank für Ihre Rückmeldung. Es freut uns, dass Sie sich verstanden und gut betreut fühlen.",
    "Wir danken Ihnen sehr für Ihr Vertrauen und die kontinuierliche Zusammenarbeit.",
    "Ihre Rückmeldung ist für unser gesamtes Team ein wichtiger Ansporn — vielen Dank.",
    "Vielen Dank — persönliche Nähe und langfristige Begleitung sind uns besonders wichtig.",
    "Wir freuen uns sehr über Ihre Worte und die Klarheit, mit der Sie unsere Zusammenarbeit beschreiben.",
]
_DEMO_RESPONSES_4 = [
    "Vielen Dank für Ihr positives Feedback und Ihren konkreten Hinweis — wir nehmen ihn gerne auf.",
    "Danke für Ihre offene Rückmeldung. Wir freuen uns über die gute Zusammenarbeit und bleiben aufmerksam.",
    "Ihr Feedback bestärkt uns, den eingeschlagenen Weg konsequent fortzuführen.",
]
_DEMO_RESPONSES_23 = [
    "Vielen Dank für Ihre offene Rückmeldung. Eine zuverlässige Erreichbarkeit gehört zu unserem eigenen Anspruch — Ihren Hinweis nehmen wir ernst und arbeiten daran, unsere Abläufe kontinuierlich zu verbessern.",
    "Danke für Ihre ehrlichen Worte. Wir prüfen den beschriebenen Punkt intern und werden gezielt daran arbeiten.",
    "Herzlichen Dank für Ihr Feedback. Ihr Hinweis hilft uns dabei, unseren Service weiter zu verbessern — melden Sie sich gern direkt bei Ihrem Ansprechpartner.",
]


def _generate_demo_reviews(count: int = 218) -> list:
    rnd = random.Random(42)
    now = datetime.now(timezone.utc)
    combos: list = []
    # Distribution: 45% 5*, 35% 4*, 15% 3*, 5% 2*
    buckets = [(5, int(count * 0.45), _DEMO_5, _DEMO_RESPONSES_5),
               (4, int(count * 0.35), _DEMO_4, _DEMO_RESPONSES_4),
               (3, int(count * 0.15), _DEMO_3, _DEMO_RESPONSES_23),
               (2, count - int(count * 0.45) - int(count * 0.35) - int(count * 0.15), _DEMO_2, _DEMO_RESPONSES_23)]
    for rating, needed, pool, responses in buckets:
        for i in range(needed):
            base_text, topics = pool[i % len(pool)]
            # Add mild variation to avoid exact repeats: pick optional additive clause
            add_clauses = [
                "", " Danke!", " Weiter so.", " Empfehlenswert.",
                " Wir bleiben gerne dabei.", " Auf viele weitere Jahre.",
                " Sehr angenehmer Ton.", "", "", "",
            ]
            addition = add_clauses[(i * 3) % len(add_clauses)] if rating >= 4 else ""
            variants = [
                base_text + addition,
                base_text + " " + ("Besonders bemerkenswert." if rating == 5 else "Aus meiner Sicht sinnvoll." if rating == 4 else "Aus meiner Sicht Luft nach oben." if rating == 3 else "Hier sehe ich Verbesserungspotenzial."),
                ("Aus meiner Sicht: " if i % 3 == 0 else "Meine Erfahrung: " if i % 3 == 1 else "") + base_text,
            ]
            text = variants[i % 3].strip()
            fn = _DEMO_FIRST[i % len(_DEMO_FIRST)]
            ln_init = _DEMO_LAST_INITIALS[(i * 7) % len(_DEMO_LAST_INITIALS)]
            since = _DEMO_SINCE[(i * 5) % len(_DEMO_SINCE)]
            extra_topic = _DEMO_TOPICS_POOL[(i * 11) % len(_DEMO_TOPICS_POOL)]
            all_topics = list(dict.fromkeys((topics or []) + ([extra_topic] if rnd.random() < 0.6 else [])))[:3]
            add_response = rnd.random() < 0.7
            response = responses[i % len(responses)] if add_response else None
            created = now - timedelta(days=rnd.randint(1, 900), hours=rnd.randint(0, 23))
            combos.append({
                "first_name": fn, "last_name": f"Demo{i:03d}",
                "email": f"demo{i:03d}@fvb-demo.local",
                "rating": rating, "text": text,
                "customer_since": since,
                "topics": all_topics,
                "status": "approved",
                "display_name": f"{fn} {ln_init}.",
                "is_verified": False, "is_featured": False, "invited": False,
                "is_demo": True,
                "admin_response": response,
                "created_at": created, "moderated_at": created,
                "moderated_by": "demo-seed", "admin_note": "DEMO — automatisch generiert",
                "ip_hash": "",
            })
    return combos


@api.post("/reviews/admin/demo/seed")
async def seed_demo_reviews(_user: dict = Depends(require_admin), count: int = 218):
    existing = await db.reviews.count_documents({"is_demo": True})
    if existing > 0:
        return {"ok": True, "inserted": 0, "existing": existing, "message": "Demo-Daten sind bereits vorhanden — bitte zuerst löschen."}
    docs = _generate_demo_reviews(max(count, 218))
    await db.reviews.insert_many(docs)
    return {"ok": True, "inserted": len(docs), "existing": 0}


@api.delete("/reviews/admin/demo")
async def delete_demo_reviews(_user: dict = Depends(require_admin)):
    r = await db.reviews.delete_many({"is_demo": True})
    return {"deleted": r.deleted_count}


# --- Review invites — tokenized share links for happy customers -------------

@api.post("/reviews/invite")
async def create_review_invite(payload: ReviewInviteInput, user: dict = Depends(require_admin)):
    token = secrets.token_urlsafe(24)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=30)
    doc = {
        "token": token,
        "email": payload.email.lower(),
        "first_name": _sanitize_text(payload.first_name or "", 60),
        "last_name": _sanitize_text(payload.last_name or "", 60),
        "note": _sanitize_text(payload.note or "", 200),
        "created_at": now,
        "created_by": user.get("email"),
        "expires_at": expires_at,
        "used_at": None,
        "used_email": None,
    }
    await db.review_invites.insert_one(doc)
    frontend = os.environ.get("FRONTEND_URL", "").rstrip("/") or "https://kapital-direkt24.de"
    share_url = f"{frontend}/kundenstimmen?einladung={token}"

    # Send the invitation email via the Emergent-managed provider.
    email_id = None
    email_error = None
    try:
        email_id = await _send_email_via_emergent(
            to=payload.email.lower(),
            subject="Ihre persönliche Einladung — Fröhlich Vermögensberatung",
            html=_invite_email_html(doc["first_name"], share_url, doc["note"]),
        )
        await db.review_invites.update_one(
            {"_id": doc["_id"]},
            {"$set": {"email_sent_at": datetime.now(timezone.utc), "email_id": email_id}},
        )
    except HTTPException as e:
        # Do not fail the whole request — the admin still gets the share_url to copy.
        email_error = e.detail if isinstance(e.detail, str) else "E-Mail-Versand nicht möglich."
    return {
        "token": token,
        "share_url": share_url,
        "expires_at": expires_at.isoformat(),
        "email": payload.email.lower(),
        "email_sent": bool(email_id),
        "email_error": email_error,
    }


@api.get("/reviews/invite/{token}")
async def get_review_invite(token: str):
    now = datetime.now(timezone.utc)
    inv = await db.review_invites.find_one({"token": token, "expires_at": {"$gt": now}})
    if not inv:
        raise HTTPException(status_code=404, detail="Einladung ungültig oder abgelaufen.")
    return {
        "email": inv.get("email", ""),
        "first_name": inv.get("first_name", ""),
        "last_name": inv.get("last_name", ""),
        "note": inv.get("note", ""),
        "used": bool(inv.get("used_at")),
        "expires_at": inv["expires_at"].isoformat() if isinstance(inv.get("expires_at"), datetime) else "",
    }


@api.get("/reviews/invites")
async def list_review_invites(_user: dict = Depends(require_admin), limit: int = 50):
    docs = await db.review_invites.find({}).sort("created_at", -1).limit(limit).to_list(limit)
    return [{
        "id": str(d["_id"]),
        "email": d.get("email"),
        "first_name": d.get("first_name", ""),
        "last_name": d.get("last_name", ""),
        "note": d.get("note", ""),
        "created_at": d["created_at"].isoformat() if isinstance(d.get("created_at"), datetime) else str(d.get("created_at", "")),
        "expires_at": d["expires_at"].isoformat() if isinstance(d.get("expires_at"), datetime) else str(d.get("expires_at", "")),
        "used_at": d["used_at"].isoformat() if isinstance(d.get("used_at"), datetime) else None,
        "used_email": d.get("used_email"),
        "created_by": d.get("created_by"),
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

    # Seed news_markte_articles (extended news items with images / featured flags)
    if await db.news_markte_articles.count_documents({}) == 0:
        now = datetime.now(timezone.utc)
        markte_seed = [
            {
                "slug": "ezb-zinsentscheidung-februar-2026",
                "title": "EZB hält Leitzins konstant — Sparzinsen bleiben attraktiv",
                "excerpt": "Die Europäische Zentralbank belässt den Hauptrefinanzierungssatz bei 3,50 %. Für Anleger heißt das: Tagesgeld- und Festgeld-Konditionen bleiben vorerst stabil.",
                "category": "zinsen",
                "source": "EZB Pressemitteilung",
                "source_url": "https://www.ecb.europa.eu/press/pr/date/2026/",
                "image_url": "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1600&q=70",
                "published_at": now - timedelta(hours=2),
                "featured": True,
                "highlight_investor": True,
            },
            {
                "slug": "dax-startet-freundlich",
                "title": "DAX startet freundlich in den Handel",
                "excerpt": "Der deutsche Leitindex eröffnet mit einem Plus von 0,4 % über der 18.700er-Marke. Technologiewerte führen die Kursliste an.",
                "category": "maerkte",
                "source": "Deutsche Börse",
                "source_url": "https://www.deutsche-boerse.com",
                "image_url": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1600&q=70",
                "published_at": now - timedelta(minutes=45),
                "featured": True,
                "highlight_investor": False,
            },
            {
                "slug": "us-maerkte-vor-handelsstart",
                "title": "US-Märkte vor Handelsstart im Fokus",
                "excerpt": "Wall Street erwartet ein wichtiges Fed-Protokoll. Anleger positionieren sich vorsichtig, S&P-Futures notieren nahezu unverändert.",
                "category": "international",
                "source": "Bloomberg",
                "source_url": "https://www.bloomberg.com",
                "image_url": "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1600&q=70",
                "published_at": now - timedelta(minutes=90),
                "featured": True,
                "highlight_investor": False,
            },
            {
                "slug": "sap-quartalszahlen-uebertreffen",
                "title": "SAP übertrifft Erwartungen — Cloud-Umsatz treibt Ergebnis",
                "excerpt": "Der Walldorfer Softwarekonzern meldet 12 % Cloud-Wachstum im vierten Quartal. Die Aktie legt vorbörslich rund 3 % zu.",
                "category": "unternehmen",
                "source": "SAP Investor Relations",
                "source_url": "https://www.sap.com/investors",
                "image_url": "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?auto=format&fit=crop&w=1600&q=70",
                "published_at": now - timedelta(hours=5),
                "featured": False,
                "highlight_investor": True,
            },
            {
                "slug": "gold-nahe-allzeithoch",
                "title": "Gold notiert nahe Allzeithoch — sicherer Hafen gefragt",
                "excerpt": "Die Feinunze steigt auf über 2.900 USD. Zentralbanken kaufen weiter, geopolitische Unsicherheiten stützen den Preis.",
                "category": "maerkte",
                "source": "World Gold Council",
                "source_url": "https://www.gold.org",
                "image_url": "https://images.unsplash.com/photo-1610375461369-d613b564f4c4?auto=format&fit=crop&w=1600&q=70",
                "published_at": now - timedelta(hours=6),
                "featured": False,
                "highlight_investor": True,
            },
            {
                "slug": "bundesanleihen-rendite-stabil",
                "title": "Bundesanleihen: 10-jährige Rendite stabil bei 2,4 %",
                "excerpt": "Anleiheinvestoren richten den Blick auf die kommenden Inflationsdaten. Bunds werden weiter als Ankerposition genutzt.",
                "category": "zinsen",
                "source": "Bundesbank",
                "source_url": "https://www.bundesbank.de",
                "image_url": "https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=1600&q=70",
                "published_at": now - timedelta(hours=8),
                "featured": False,
                "highlight_investor": True,
            },
            {
                "slug": "ifo-index-februar",
                "title": "Ifo-Geschäftsklima steigt zum dritten Mal in Folge",
                "excerpt": "Deutsche Unternehmen bewerten ihre Lage optimistischer. Der Ifo-Index klettert auf 87,3 Punkte — der höchste Stand seit Q2 2025.",
                "category": "wirtschaft",
                "source": "Ifo Institut",
                "source_url": "https://www.ifo.de",
                "image_url": "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&w=1600&q=70",
                "published_at": now - timedelta(hours=12),
                "featured": False,
                "highlight_investor": False,
            },
            {
                "slug": "ezb-lagarde-inflation",
                "title": "Lagarde: Inflation nähert sich Zielkorridor",
                "excerpt": "EZB-Präsidentin Christine Lagarde signalisiert vorsichtigen Optimismus. Zinssenkungsschritte bleiben datenabhängig.",
                "category": "zinsen",
                "source": "EZB",
                "source_url": "https://www.ecb.europa.eu",
                "image_url": "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=1600&q=70",
                "published_at": now - timedelta(hours=16),
                "featured": False,
                "highlight_investor": True,
            },
            {
                "slug": "immobilienmarkt-erholung",
                "title": "Immobilienmarkt: Erste Anzeichen einer Bodenbildung",
                "excerpt": "Die Bautätigkeit stabilisiert sich, Kaufpreise ziehen in Ballungsräumen leicht an. Marktakteure erwarten eine allmähliche Erholung.",
                "category": "wirtschaft",
                "source": "vdp Immobilienpreisindex",
                "source_url": "https://www.pfandbrief.de",
                "image_url": "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=70",
                "published_at": now - timedelta(hours=20),
                "featured": False,
                "highlight_investor": True,
            },
            {
                "slug": "asien-boersen-schliessen-uneinheitlich",
                "title": "Asiens Börsen schließen uneinheitlich",
                "excerpt": "Der Nikkei gewinnt 0,6 %, während der Hang Seng leicht nachgibt. Anleger warten auf US-Konjunkturdaten am Nachmittag.",
                "category": "international",
                "source": "Reuters",
                "source_url": "https://www.reuters.com",
                "image_url": "https://images.unsplash.com/photo-1517840901100-8179e982acb7?auto=format&fit=crop&w=1600&q=70",
                "published_at": now - timedelta(days=1),
                "featured": False,
                "highlight_investor": False,
            },
            {
                "slug": "siemens-hebt-prognose-an",
                "title": "Siemens hebt Jahresprognose an",
                "excerpt": "Starkes Digital-Industrie-Geschäft veranlasst Siemens zu einer Aufwärtsrevision der Umsatzerwartungen für das laufende Geschäftsjahr.",
                "category": "unternehmen",
                "source": "Siemens AG",
                "source_url": "https://www.siemens.com",
                "image_url": "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1600&q=70",
                "published_at": now - timedelta(days=1, hours=4),
                "featured": False,
                "highlight_investor": False,
            },
            {
                "slug": "eu-etf-nachfrage-rekord",
                "title": "Europäische ETF-Nachfrage erreicht Rekordniveau",
                "excerpt": "Zuflüsse in europäische ETFs übersteigen im Januar 30 Mrd. Euro. Aktien- und Anleihe-ETFs profitieren gleichermaßen.",
                "category": "fonds-etfs",
                "source": "Morningstar",
                "source_url": "https://www.morningstar.de",
                "image_url": "https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?auto=format&fit=crop&w=1600&q=70",
                "published_at": now - timedelta(days=1, hours=8),
                "featured": False,
                "highlight_investor": True,
            },
        ]
        await db.news_markte_articles.insert_many(markte_seed)

    # Additional articles for extended categories (Fonds/ETF, Rohstoffe, Seltene Erden, Anleihen, Währungen, Investmenttrends)
    extra_slugs = ["msci-world-etf-zufluesse", "geldmarktfonds-attraktiv", "dividenden-etf-ausschuettungen",
                   "gold-etc-nachfrage", "kupferpreis-nachfrage-china", "silber-industrieller-bedarf",
                   "seltene-erden-versorgung", "lithium-preis-erholt", "bundesanleihe-neuemission",
                   "unternehmensanleihen-spreads", "euro-dollar-parity-diskussion", "ki-halbleiter-boom",
                   "infrastruktur-fonds-europa"]
    existing_extra = await db.news_markte_articles.count_documents({"slug": {"$in": extra_slugs}})
    if existing_extra < len(extra_slugs):
        now = datetime.now(timezone.utc)
        extra_seed = [
            {"slug": "msci-world-etf-zufluesse", "title": "MSCI-World-ETFs verzeichnen erneut hohe Zuflüsse",
             "excerpt": "Globale Aktien-ETFs bleiben das Kern-Investment europäischer Anleger. Der MSCI World steht im Fokus.",
             "category": "fonds-etfs", "source": "extraETF", "source_url": "https://extraetf.com",
             "image_url": "https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?auto=format&fit=crop&w=1600&q=70",
             "published_at": now - timedelta(hours=3), "featured": True, "highlight_investor": True},
            {"slug": "geldmarktfonds-attraktiv", "title": "Geldmarktfonds bleiben attraktive Parkposition",
             "excerpt": "Bei Renditen nahe des Leitzinses nutzen Anleger Geldmarktfonds als Liquiditätsspeicher zwischen Anlageentscheidungen.",
             "category": "fonds-etfs", "source": "Fondsprofessionell", "source_url": "https://www.fondsprofessionell.de",
             "image_url": "https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&w=1600&q=70",
             "published_at": now - timedelta(hours=7), "featured": True, "highlight_investor": True},
            {"slug": "dividenden-etf-ausschuettungen", "title": "Dividenden-ETFs mit soliden Ausschüttungen",
             "excerpt": "Europäische Dividenden-Strategien liefern trotz Zinswende weiter attraktive Netto-Renditen für langfristige Anleger.",
             "category": "fonds-etfs", "source": "Justetf", "source_url": "https://www.justetf.com",
             "image_url": "https://images.unsplash.com/photo-1591696205602-2f950c417cb9?auto=format&fit=crop&w=1600&q=70",
             "published_at": now - timedelta(hours=11), "featured": True, "highlight_investor": False},
            {"slug": "gold-etc-nachfrage", "title": "Gold-ETCs: Nachfrage von Privatanlegern zieht an",
             "excerpt": "Physisch besicherte Gold-ETCs verzeichnen deutliche Zuflüsse — Sicherheitsbedürfnis überwiegt.",
             "category": "rohstoffe", "source": "World Gold Council", "source_url": "https://www.gold.org",
             "image_url": "https://images.unsplash.com/photo-1610375461369-d613b564f4c4?auto=format&fit=crop&w=1600&q=70",
             "published_at": now - timedelta(hours=9), "featured": False, "highlight_investor": True},
            {"slug": "kupferpreis-nachfrage-china", "title": "Kupferpreis zieht an: Chinas Nachfrage steigt",
             "excerpt": "Elektrifizierung und Netzausbau treiben die weltweite Kupfernachfrage; Analysten sehen strukturellen Rückenwind.",
             "category": "rohstoffe", "source": "Reuters", "source_url": "https://www.reuters.com",
             "image_url": "https://images.unsplash.com/photo-1518544801976-3e159e50e5bb?auto=format&fit=crop&w=1600&q=70",
             "published_at": now - timedelta(hours=14), "featured": False, "highlight_investor": False},
            {"slug": "silber-industrieller-bedarf", "title": "Silber profitiert von industriellem Bedarf",
             "excerpt": "Photovoltaik und Elektronik erhöhen den globalen Silberverbrauch. Der Spotpreis notiert nahe Jahreshoch.",
             "category": "rohstoffe", "source": "Silver Institute", "source_url": "https://www.silverinstitute.org",
             "image_url": "https://images.unsplash.com/photo-1621786030484-4c855eed6974?auto=format&fit=crop&w=1600&q=70",
             "published_at": now - timedelta(hours=19), "featured": False, "highlight_investor": False},
            {"slug": "seltene-erden-versorgung", "title": "Seltene Erden: Europa sucht Alternativen zu China",
             "excerpt": "EU-Kommission fördert Aufbau strategischer Kapazitäten. Für Investoren rücken europäische Zulieferer in den Blick.",
             "category": "seltene-erden", "source": "Handelsblatt", "source_url": "https://www.handelsblatt.com",
             "image_url": "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?auto=format&fit=crop&w=1600&q=70",
             "published_at": now - timedelta(hours=10), "featured": False, "highlight_investor": True},
            {"slug": "lithium-preis-erholt", "title": "Lithium-Preis stabilisiert sich",
             "excerpt": "Nach dem Einbruch des Vorjahres findet der Lithium-Markt eine Basis; strukturelle Nachfrage aus E-Mobilität bleibt bestehen.",
             "category": "seltene-erden", "source": "S&P Global", "source_url": "https://www.spglobal.com",
             "image_url": "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1600&q=70",
             "published_at": now - timedelta(hours=22), "featured": False, "highlight_investor": False},
            {"slug": "bundesanleihe-neuemission", "title": "Neue 10-jährige Bundesanleihe erfolgreich platziert",
             "excerpt": "Die Finanzagentur meldet solide Nachfrage. Institutionelle Anleger bleiben klare Käufer im Kernland-Segment.",
             "category": "anleihen", "source": "Finanzagentur", "source_url": "https://www.deutsche-finanzagentur.de",
             "image_url": "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1600&q=70",
             "published_at": now - timedelta(hours=6), "featured": False, "highlight_investor": True},
            {"slug": "unternehmensanleihen-spreads", "title": "Unternehmensanleihen: Spreads bleiben eng",
             "excerpt": "IG-Anleihen mit A/BBB-Rating notieren nahe Vor-Corona-Niveau. Anleger honorieren solide Unternehmensbilanzen.",
             "category": "anleihen", "source": "Bloomberg", "source_url": "https://www.bloomberg.com",
             "image_url": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1600&q=70",
             "published_at": now - timedelta(hours=13), "featured": False, "highlight_investor": True},
            {"slug": "euro-dollar-parity-diskussion", "title": "Euro/Dollar: Rückkehr zur Parität debattiert",
             "excerpt": "Zinsdifferenz und Wachstumserwartungen sorgen für Kursdruck auf den Euro. Devisenstrategen diskutieren Szenarien.",
             "category": "waehrungen", "source": "FX Street", "source_url": "https://www.fxstreet.com",
             "image_url": "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=1600&q=70",
             "published_at": now - timedelta(hours=17), "featured": False, "highlight_investor": False},
            {"slug": "ki-halbleiter-boom", "title": "KI treibt Investitionen in Halbleiter-Kapazitäten",
             "excerpt": "Chip-Auftragsfertiger melden Kapazitätsengpässe. Investoren richten den Blick auf gesamte Wertschöpfungskette.",
             "category": "investmenttrends", "source": "Bloomberg", "source_url": "https://www.bloomberg.com",
             "image_url": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=70",
             "published_at": now - timedelta(hours=8), "featured": False, "highlight_investor": True},
            {"slug": "infrastruktur-fonds-europa", "title": "Europa: Infrastruktur-Fonds gewinnen an Bedeutung",
             "excerpt": "Energie- und Verkehrsnetze benötigen milliardenschwere Investitionen. Institutionelle Fonds nehmen zunehmend Positionen ein.",
             "category": "investmenttrends", "source": "Handelsblatt", "source_url": "https://www.handelsblatt.com",
             "image_url": "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=1600&q=70",
             "published_at": now - timedelta(hours=15), "featured": False, "highlight_investor": True},
        ]
        # Only insert missing slugs (idempotent)
        existing_slugs = {d["slug"] for d in await db.news_markte_articles.find(
            {"slug": {"$in": extra_slugs}}, {"slug": 1}).to_list(len(extra_slugs))}
        to_insert = [d for d in extra_seed if d["slug"] not in existing_slugs]
        if to_insert:
            await db.news_markte_articles.insert_many(to_insert)

    # Migrate/refresh irrelevant seed images on existing docs (idempotent)
    await db.news_markte_articles.update_one(
        {"slug": "kupferpreis-nachfrage-china"},
        {"$set": {"image_url": "https://images.unsplash.com/photo-1518544801976-3e159e50e5bb?auto=format&fit=crop&w=1600&q=70"}},
    )
    await db.news_markte_articles.update_one(
        {"slug": "silber-industrieller-bedarf"},
        {"$set": {"image_url": "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1600&q=70"}},
    )

    # Seed anlagetrends topic cards
    if await db.anlagetrends.count_documents({}) == 0:
        trends_seed = [
            {"slug": "ki-halbleiter", "title": "Künstliche Intelligenz & Halbleiter",
             "summary": "KI, Rechenzentren, Chips und digitale Infrastruktur.",
             "detail": "Investitionen in Rechenzentren, Trainings-Infrastruktur und Halbleiterfertigung bleiben strukturell hoch.",
             "tag": "Langfristiger Trend", "icon": "cpu", "order": 1},
            {"slug": "infrastruktur", "title": "Infrastruktur",
             "summary": "Energieversorgung, Stromnetze, Verkehr und Digitalisierung.",
             "detail": "Milliardenschwere Modernisierungsprogramme in Europa und den USA sichern langfristige Auftragsvolumen.",
             "tag": "Langfristiger Trend", "icon": "network", "order": 2},
            {"slug": "verteidigung-sicherheit", "title": "Verteidigung & Sicherheit",
             "summary": "Unternehmen und Entwicklungen rund um Sicherheit und Verteidigung.",
             "detail": "Erhöhte Verteidigungsbudgets in der NATO sorgen für strukturell steigende Auftragslage.",
             "tag": "Erhöhte Marktaktivität", "icon": "shield", "order": 3},
            {"slug": "energie-energiewende", "title": "Energie & Energiewende",
             "summary": "Erneuerbare Energien, Stromnetze, Speicher und klassische Energieversorgung.",
             "detail": "Netzausbau, Speicher und Wasserstoff-Infrastruktur bleiben im Fokus institutioneller Investoren.",
             "tag": "Langfristiger Trend", "icon": "zap", "order": 4},
            {"slug": "rohstoffe", "title": "Rohstoffe",
             "summary": "Gold, Silber, Kupfer und andere Industriemetalle.",
             "detail": "Elektrifizierung und Sicherheitsbedürfnis stützen die Nachfrage nach strategischen Metallen.",
             "tag": "Unter Beobachtung", "icon": "gem", "order": 5},
            {"slug": "seltene-erden", "title": "Seltene Erden",
             "summary": "Strategische Rohstoffe für Hochtechnologie und Industrie.",
             "detail": "Diversifizierung der Lieferketten außerhalb Chinas eröffnet neue Investitionsfelder.",
             "tag": "Neue Entwicklung", "icon": "layers", "order": 6},
            {"slug": "gesundheit-demografie", "title": "Gesundheit & Demografie",
             "summary": "Pharma, Medizintechnik, Pflege und langfristige demografische Veränderungen.",
             "detail": "Alternde Gesellschaften und medizinische Innovation prägen das Wachstum der kommenden Dekade.",
             "tag": "Defensives Thema", "icon": "heart-pulse", "order": 7},
            {"slug": "wasser", "title": "Wasser",
             "summary": "Wasserversorgung, Infrastruktur und Aufbereitung.",
             "detail": "Wasser bleibt eine der zentralen langfristigen Ressourcen — Infrastruktur- und Technologieanbieter im Fokus.",
             "tag": "Defensives Thema", "icon": "droplets", "order": 8},
            {"slug": "digitalisierung", "title": "Digitalisierung",
             "summary": "Cloud, Cybersecurity, Software und digitale Infrastruktur.",
             "detail": "Digitalisierung öffentlicher Verwaltungen und Unternehmen sorgt für stabile Auftragslage bei Software-Anbietern.",
             "tag": "Langfristiger Trend", "icon": "cloud", "order": 9},
        ]
        await db.anlagetrends.insert_many(trends_seed)

    # Seed investment_radar entries
    if await db.investment_radar.count_documents({}) == 0:
        radar_seed = [
            {"theme": "Halbleiter-Wertschöpfungskette", "category": "Aktien / Technologie",
             "why": "Strukturelle Nachfrage durch KI-Investitionen und Onshoring-Programme.",
             "horizon": "Langfristig (5+ Jahre)", "tag": "Langfristiger Trend",
             "related_slug": "ki-halbleiter-boom", "order": 1},
            {"theme": "Europäische Verteidigungswerte", "category": "Aktien / Industrie",
             "why": "Erhöhte NATO-Budgets und langfristige Rüstungsprogramme.",
             "horizon": "Mittelfristig (2–5 Jahre)", "tag": "Erhöhte Marktaktivität",
             "related_slug": "sap-quartalszahlen-uebertreffen", "order": 2},
            {"theme": "Netzinfrastruktur & Grids", "category": "Aktien / Versorger",
             "why": "Milliardenschwere Netzmodernisierungen in Europa und den USA.",
             "horizon": "Langfristig (5+ Jahre)", "tag": "Langfristiger Trend",
             "related_slug": "infrastruktur-fonds-europa", "order": 3},
            {"theme": "Goldbestände als Absicherung", "category": "Rohstoffe",
             "why": "Zentralbank-Käufe und geopolitische Unsicherheit stützen den Preis.",
             "horizon": "Strategisch", "tag": "Defensives Thema",
             "related_slug": "gold-nahe-allzeithoch", "order": 4},
            {"theme": "Strategische Metalle", "category": "Rohstoffe / Seltene Erden",
             "why": "Diversifizierung der Lieferketten außerhalb Chinas gewinnt an Bedeutung.",
             "horizon": "Langfristig (5+ Jahre)", "tag": "Neue Entwicklung",
             "related_slug": "seltene-erden-versorgung", "order": 5},
            {"theme": "Hochwertige Unternehmensanleihen", "category": "Anleihen / IG",
             "why": "Attraktive Realrenditen bei solider Bilanzqualität.",
             "horizon": "Mittelfristig (2–5 Jahre)", "tag": "Unter Beobachtung",
             "related_slug": "unternehmensanleihen-spreads", "order": 6},
        ]
        await db.investment_radar.insert_many(radar_seed)

    # Seed market voices (Stimmen zum Markt — external analyst / research voices)
    if await db.market_voices.count_documents({}) == 0:
        now = datetime.now(timezone.utc)
        voices_seed = [
            {"source": "Deutsche Bank Research", "source_url": "https://www.dbresearch.de",
             "topic": "Aktienmärkte", "excerpt": "Analysten sehen ein moderates Ertragspotenzial für europäische Aktien im ersten Halbjahr.",
             "published_at": now - timedelta(days=1), "order": 1},
            {"source": "Allianz Global Investors", "source_url": "https://de.allianzgi.com",
             "topic": "Zinsen & Inflation", "excerpt": "Zinsen dürften erst im späteren Jahresverlauf spürbar sinken — Sparer sollten Konditionen jetzt sichern.",
             "published_at": now - timedelta(days=2), "order": 2},
            {"source": "BlackRock Investment Institute", "source_url": "https://www.blackrock.com",
             "topic": "Langfristige Trends", "excerpt": "KI und Energiewende sind die beiden Investitionsthemen mit der höchsten strukturellen Sichtbarkeit.",
             "published_at": now - timedelta(days=3), "order": 3},
            {"source": "Union Investment", "source_url": "https://institutional.union-investment.de",
             "topic": "Anleihen", "excerpt": "Investment-Grade-Anleihen bieten Anlegern derzeit ein attraktives Chance-Risiko-Profil.",
             "published_at": now - timedelta(days=4), "order": 4},
            {"source": "DZ Bank Research", "source_url": "https://www.dzbank.de",
             "topic": "Gold & Rohstoffe", "excerpt": "Gold bleibt strategisch relevant — Zentralbanken bauen ihre Bestände weiter aus.",
             "published_at": now - timedelta(days=5), "order": 5},
            {"source": "Commerzbank Research", "source_url": "https://www.commerzbank.de",
             "topic": "Währungen", "excerpt": "Euro/Dollar bleibt seitwärts orientiert — kein struktureller Aufwertungsdruck sichtbar.",
             "published_at": now - timedelta(days=6), "order": 6},
        ]
        await db.market_voices.insert_many(voices_seed)
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
    await db.news_markte_articles.create_index("slug", unique=True)
    await db.news_markte_articles.create_index([("published_at", -1)])
    await db.news_markte_articles.create_index([("category", 1), ("published_at", -1)])
    await db.editorial_posts.create_index([("published", 1), ("published_at", -1)])
    await db.anlagetrends.create_index("order")
    await db.investment_radar.create_index("order")
    await db.market_voices.create_index([("published_at", -1)])
    await db.user_preferences.create_index("user_id", unique=True)
    await db.reviews.create_index([("status", 1), ("created_at", -1)])
    await db.reviews.create_index([("rating", -1), ("created_at", -1)])
    await db.reviews.create_index("is_demo")
    await db.reviews.create_index([("status", 1), ("is_demo", 1), ("created_at", -1)])
    await db.review_invites.create_index("token", unique=True)
    await db.review_invites.create_index([("email", 1), ("created_at", -1)])
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
