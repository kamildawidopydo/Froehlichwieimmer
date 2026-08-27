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
import asyncio
import re
import time
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any

import bcrypt
import jwt
import hashlib
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
ALPHA_VANTAGE_KEY = (os.environ.get("ALPHA_VANTAGE_API_KEY") or os.environ.get("ALPHA_VANTAGE_KEY") or "").strip()
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

# Auth-Routen wurden in /app/backend/routes/auth.py extrahiert (Session 78.0).
# Registrierung erfolgt am Ende dieser Datei via `app.include_router`.


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


# --- Session 80.37 — Structured Savings Comparison --------------------------

@api.get("/content/comparison/offers")
async def list_structured_offers(product_type: Optional[str] = None,
                                  term_months: Optional[int] = None,
                                  new_customers_only: Optional[bool] = None):
    """Erweiterte Vergleichsdaten mit Aktionszins-Trennung, Einlagensicherung,
    Quellen-Timestamp und Freshness-Label. Filter: product_type/term_months/
    new_customers_only. Rangliste-Sortierung sekundär im Frontend."""
    from savings_data import to_public, compute_freshness, dedupe_key, is_plausible_rate
    q: dict = {}
    if product_type:
        q["product_type"] = product_type
    if term_months is not None:
        q["term_months"] = int(term_months)
    if new_customers_only is not None:
        q["new_customers_only"] = bool(new_customers_only)
    docs = await db.savings_offers.find(q).to_list(500)
    # Deduplizierung + Plausibilitäts-Guard + stale-Filter.
    seen: set = set()
    out: list[dict] = []
    for d in docs:
        if not is_plausible_rate(d.get("interest_rate")):
            continue
        k = dedupe_key(d)
        if k in seen:
            continue
        seen.add(k)
        pub = to_public(d)
        if pub.get("freshness") == "stale":
            continue  # stale Angebote automatisch verstecken
        out.append(pub)
    return {"offers": out, "count": len(out)}


@api.get("/content/comparison/context")
async def comparison_context():
    """Markt-Kontext für die Vergleichsseite: EZB-Referenz + abgeleitete
    Top-Rates aus den aktuellen Angeboten (keine Marktannahmen)."""
    from savings_data import EZB_REFERENCE, to_public, is_plausible_rate
    all_docs = await db.savings_offers.find({}).to_list(500)
    fresh = [to_public(d) for d in all_docs if is_plausible_rate(d.get("interest_rate"))
             and to_public(d).get("freshness") != "stale"]
    # Top Tagesgeld (nach Nominalzins, ohne Aktions/Standard-Gewichtung — der
    # Frontend zeigt beides klar getrennt).
    tagesgeld = [o for o in fresh if o["product_type"] == "tagesgeld"]
    festgeld_12m = [o for o in fresh if o["product_type"] == "festgeld" and o.get("term_months") == 12]
    top_tagesgeld = max(tagesgeld, key=lambda x: x["interest_rate"], default=None)
    top_festgeld_12m = max(festgeld_12m, key=lambda x: x["interest_rate"], default=None)
    return {
        "ecb": EZB_REFERENCE,
        "top_tagesgeld": top_tagesgeld,
        "top_festgeld_12m": top_festgeld_12m,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Session 80.27 — Harte Freshness-Regel für aktuelle News-Feeds.
#
# Alle "aktuellen" News-Endpoints (Home-News, /nachrichten, /news/markte …)
# dürfen NUR Artikel mit `published_at >= NOW - CURRENT_FEED_MAX_AGE` liefern.
# Ältere Artikel bleiben in Archiv-/Detail-/Suche-Pfaden zugänglich, tauchen
# aber niemals als "aktuell" auf. Kein Nachrücken älterer Meldungen als
# Füllmaterial — lieber weniger Karten als veraltete Karten.
#
# Zeit wird strikt in UTC verglichen (published_at wird beim Ingest bereits
# als UTC gespeichert, alle mongodb-Docs sind timezone-aware).
# ---------------------------------------------------------------------------
CURRENT_FEED_MAX_AGE = timedelta(hours=48)


def _current_feed_cutoff() -> datetime:
    """Cutoff-Zeitpunkt für 'aktuelle' Feeds — Artikel jünger als 48h."""
    return datetime.now(timezone.utc) - CURRENT_FEED_MAX_AGE


@api.get("/content/news", response_model=List[NewsOut])
async def list_news(limit: int = 20):
    """
    Session 80.25 — Reader auf `db.news_articles` umgestellt (Session-79.5 Kollektion
    des Synthesizers). Nur veröffentlichte, nicht-archivierte Artikel im Feed.

    Session 80.27 — Harte 48h-Freshness-Regel: `published_at >= NOW-48h`.
    Kein Nachrücken älterer Artikel; falls weniger als `limit` Artikel frisch
    sind, wird die kürzere Liste zurückgegeben — bewusst.
    """
    query = {
        "is_published": True,
        "status": "published",
        "published_at": {"$gte": _current_feed_cutoff()},
    }
    docs = await db.news_articles.find(query).sort("published_at", -1).limit(limit).to_list(limit)
    return [{
        "id": str(d["_id"]),
        "slug": d["slug"],
        "title": d["title"],
        "excerpt": (d.get("summary") or d.get("subtitle") or "")[:280],
        "published_at": d["published_at"].isoformat() if isinstance(d.get("published_at"), datetime) else d.get("published_at", ""),
        "category": d.get("category", "markt"),
        "image_url": d.get("image_url"),
    } for d in docs]


@api.get("/content/news/{slug}")
async def get_news_by_slug(slug: str):
    """
    Session 80.23/80.25 — Detail-Endpoint für News-Artikel.
    Sucht in `db.news_articles` (Synthesizer-Kollektion). Fallback:
    news_retention Live+Archive (Session-79.5). Liefert die vom Frontend
    erwarteten Felder: source, source_url, content, summary, views, is_archived,
    content_origin.
    """
    doc = await db.news_articles.find_one({"slug": slug})
    from_archive = False
    if not doc:
        from news_retention import find_article_by_slug as _find_article
        doc = await _find_article(db, slug, include_archive=True)
        from_archive = bool(doc and doc.get("_from_archive", False))
    if not doc:
        raise HTTPException(status_code=404, detail="not_found")
    published = doc.get("published_at")
    if isinstance(published, datetime):
        published = published.isoformat()
    # Primärquelle für die dezente Quellenangabe (Session 80.24).
    src_names = doc.get("source_names") or []
    src_urls = doc.get("source_urls") or []
    primary_source = src_names[0] if src_names else None
    primary_source_url = src_urls[0] if src_urls else None
    # content_origin — für Transparenz auf der Detailseite (Session 80.25).
    if doc.get("content_type") == "news_synthesis" and src_names:
        content_origin = "ai_summary_from_source"
    elif doc.get("content"):
        content_origin = "provider_summary"
    else:
        content_origin = "short_only"
    summary_val = doc.get("summary") or doc.get("subtitle") or ""
    return {
        "id": str(doc.get("_id", "")),
        "slug": doc.get("slug", slug),
        "title": doc.get("title", ""),
        "excerpt": summary_val[:280],
        "summary": summary_val,
        "content": doc.get("content", ""),
        "category": doc.get("category", "markt"),
        "image_url": doc.get("image_url"),
        "source": primary_source,
        "source_url": primary_source_url,
        "sources": doc.get("sources") or [],
        "content_origin": content_origin,
        "published_at": published or "",
        "read_time_minutes": doc.get("read_time_minutes"),
        "views": int(doc.get("views", 0) or 0),
        "is_archived": from_archive,
    }


@api.post("/content/news/{slug}/view")
async def increment_news_view(slug: str):
    """
    Session 80.24/80.25 — Atomic view-counter auf `db.news_articles`.
    Archive-Fallback für 79.5-Retention. Fehler blockieren die Seite nie.
    """
    try:
        res = await db.news_articles.update_one({"slug": slug}, {"$inc": {"views": 1}})
        if res.matched_count == 0:
            await db["news_articles_archive"].update_one(
                {"slug": slug}, {"$inc": {"views": 1}}
            )
    except Exception:  # noqa: BLE001
        logger.exception("news view counter failed for slug=%s", slug)
        return {"ok": False}
    return {"ok": True}


# ---------------------------------------------------------------------------
# Emergent-managed email (Resend) — used to send the review invitation link
# ---------------------------------------------------------------------------

EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMERGENT_EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY", "").strip()
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "Fröhlich Vermögensberatung").strip()
EMAIL_REPLY_TO = os.environ.get("EMAIL_REPLY_TO", "").strip() or None
# Empfänger für Lead-Notifications (Produktanfragen). Fallback EMAIL_REPLY_TO,
# sonst statische Support-Adresse.
PRODUCT_INQUIRY_TO = (
    os.environ.get("PRODUCT_INQUIRY_TO", "").strip()
    or EMAIL_REPLY_TO
    or "kundenservice@kapital-direkt24.de"
)

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


async def _send_email_via_emergent(
    to: str,
    subject: str,
    html: str,
    *,
    attachments: Optional[List[Dict[str, Any]]] = None,
) -> Optional[str]:
    """Sends transactional email via Emergent's managed proxy.

    Optional `attachments` (Session 75.4): forwarded to Resend's native
    `attachments` field. Each dict must be shaped:
        {"filename": "...", "content": "<base64>", "content_type": "application/pdf"}
    A single message must stay under ~10 MB total base64 payload.
    """
    if not EMERGENT_EMAIL_KEY:
        logger.warning("EMERGENT_EMAIL_KEY missing — email not sent (dry-run).")
        return None
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    if EMAIL_REPLY_TO:
        payload["contact_email"] = EMAIL_REPLY_TO
    if attachments:
        # Whitelist only known-safe keys; drop everything else to avoid leaking
        # accidentally-attached fields (e.g. secrets) into the outbound payload.
        clean: List[Dict[str, Any]] = []
        for att in attachments:
            if not isinstance(att, dict):
                continue
            fn = att.get("filename") or "report.pdf"
            ct = att.get("content_type") or att.get("type") or "application/octet-stream"
            content = att.get("content")
            if not content or not isinstance(content, str):
                continue
            clean.append({"filename": str(fn)[:180], "content": content, "content_type": str(ct)[:80]})
        if clean:
            payload["attachments"] = clean
    try:
        async with httpx.AsyncClient(timeout=30) as client_http:
            r = await client_http.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": EMERGENT_EMAIL_KEY},
                json=payload,
            )
        r.raise_for_status()
        return r.json().get("id")
    except httpx.HTTPStatusError as e:
        body_txt = ""
        try:
            body_txt = e.response.text[:400]
        except Exception:
            pass
        logger.error("Email provider %s: %s | body=%s", e.response.status_code, e, body_txt)
        raise HTTPException(status_code=502, detail=f"E-Mail konnte nicht versendet werden ({e.response.status_code}).")
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

# ---------------------------------------------------------------------------
# Product-Inquiry Notification-Mail — Session 74.8
# Frontend ruft /api/send-product-inquiry-email fire-and-forget nach jedem
# erfolgreichen Supabase-Lead-Insert. Mailfehler dürfen den Lead NICHT
# beeinflussen (frontend behandelt HTTP-Fehler bereits als non-fatal),
# der Endpoint liefert deshalb immer 200 mit ok:true/false.
# ---------------------------------------------------------------------------

VALID_PI_PRODUCTS = {"aktien", "anleihen", "fonds", "tagesgeld", "festgeld", "flexgeld"}

# Persistente Idempotenz-Collection — atomarer Insert mit UNIQUE-Index auf
# lead_id verhindert Doppelversand über Worker/Restart hinweg. Fallback-Key
# (wenn Frontend keine leadId liefert) ist ein deterministischer Hash über
# product|email|first|last|phone, damit ein Doppelklick trotzdem geschluckt
# wird. Eintrag mit status="failed" darf legitim erneut versendet werden.
PI_EMAIL_IDEMPOTENCY = "product_inquiry_email_idempotency"


def _pi_dedupe_key(payload: "ProductInquiryEmailPayload", product: str, email: str) -> str:
    """Fallback-Key wenn kein leadId übergeben wurde — enthält keine PII im Klartext."""
    raw = "|".join([
        product,
        email,
        (payload.first_name or "").strip().lower(),
        (payload.last_name or "").strip().lower(),
        (payload.phone or "").strip(),
    ])
    return "hash:" + hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


class ProductInquiryEmailPayload(BaseModel):
    product: str = Field(default="", max_length=32)
    first_name: str = Field(default="", max_length=80)
    last_name: str = Field(default="", max_length=80)
    email: str = Field(default="", max_length=180)
    phone: str = Field(default="", max_length=48)
    customer_number: Optional[str] = Field(default=None, max_length=48)
    answers: Dict[str, Any] = Field(default_factory=dict)
    consent_marketing: bool = False
    leadId: Optional[str] = Field(default=None, max_length=64)


def _pi_email_html(payload: "ProductInquiryEmailPayload") -> str:
    from html import escape

    def _row(label: str, value: str) -> str:
        return (
            f'<tr><td style="padding:6px 12px;color:#6b7280;font-size:12px;'
            f'letter-spacing:0.08em;text-transform:uppercase;width:35%">{escape(label)}</td>'
            f'<td style="padding:6px 12px;color:#0f1d34;font-size:14px">{escape(value)}</td></tr>'
        )

    answer_rows = ""
    if isinstance(payload.answers, dict):
        for qid, entry in payload.answers.items():
            if not entry:
                continue
            label = entry.get("label") if isinstance(entry, dict) else str(entry)
            if not label:
                continue
            answer_rows += _row(str(qid).replace("_", " "), str(label))

    kicker = escape(payload.product.upper() or "PRODUKTANFRAGE")
    full_name = f"{payload.first_name} {payload.last_name}".strip() or "—"
    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="background:#f5f7fa;padding:32px 0;font-family:Georgia,serif">'
        f'<tr><td align="center"><table role="presentation" width="620" cellpadding="0" '
        f'cellspacing="0" style="background:#ffffff;padding:32px;border:1px solid #e5e7eb">'
        f'<tr><td>'
        f'<p style="margin:0 0 6px;color:#c9a961;font-size:12px;letter-spacing:0.16em;'
        f'text-transform:uppercase">Neue Produktanfrage · {kicker}</p>'
        f'<h1 style="margin:0 0 18px;color:#0f1d34;font-size:22px;line-height:1.3">'
        f'{escape(full_name)}</h1>'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="border:1px solid #eef1f6;border-collapse:collapse">'
        f'{_row("Produkt", payload.product or "—")}'
        f'{_row("E-Mail", payload.email or "—")}'
        f'{_row("Telefon", payload.phone or "—")}'
        f'{_row("Kundennr.", payload.customer_number or "—")}'
        f'{_row("Newsletter", "Ja" if payload.consent_marketing else "Nein")}'
        f'{_row("Lead-ID", payload.leadId or "—")}'
        f'</table>'
        + (
            f'<h2 style="margin:22px 0 10px;color:#0f1d34;font-size:15px">Antworten</h2>'
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            f'style="border:1px solid #eef1f6;border-collapse:collapse">{answer_rows}</table>'
            if answer_rows
            else ""
        )
        + f'<p style="margin:24px 0 0;color:#888;font-size:12px">Bitte innerhalb von 1–2 Werktagen '
        f'reagieren. Diese Nachricht wurde automatisch aus dem Anfrageformular erzeugt.</p>'
        f'</td></tr></table></td></tr></table>'
    )


@api.post("/send-product-inquiry-email")
async def send_product_inquiry_email(payload: ProductInquiryEmailPayload):
    # Session 78.6 — Stub entfernt. Route wird durch include_router auf
    # `routes.product_inquiry.router` überschrieben (siehe unten). Dieser
    # Fallback bleibt nur, falls jemand vor dem include-Router-Aufruf direkt
    # gegen `api` postet; im Regelbetrieb wird er nie erreicht.
    from routes.product_inquiry import send_product_inquiry_email as _handler
    return await _handler(payload)


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


async def news_markte_feed(category: Optional[str] = None, limit: int = 30):
    # Session 80.27 — Harte 48h-Freshness.
    # Session 80.28 — `news_markte_articles` ist nur eine EINMALIG geseedete
    # Kollektion (server.py:1993, count==0-Guard) ohne Cron-Refresh. Sobald
    # der Seed >48h alt ist, greift die Freshness-Regel und der News-&-Märkte-
    # Tab wäre dauerhaft leer. Fallback auf `news_articles` (synthesizer-
    # gepflegt, stündlich frisch): wenn keine frischen markte-Docs vorhanden
    # sind, ziehen wir die aktuellen synthetisierten Artikel dieser Kategorie
    # aus der Haupt-Kollektion nach — mit identischer 48h-Freshness und
    # `published_at DESC`-Sortierung, kein Nachrücken älterer Artikel.
    cutoff = _current_feed_cutoff()
    q: dict = {"published_at": {"$gte": cutoff}}
    if category and category != "alle":
        q["category"] = category
    docs = await db.news_markte_articles.find(q).sort("published_at", -1).limit(limit).to_list(limit)

    if not docs:
        syn_q: dict = {
            "is_published": True,
            "status": "published",
            "content_type": {"$ne": "demo"},
            "published_at": {"$gte": cutoff},
        }
        if category and category != "alle":
            syn_q["category"] = category
        syn_docs = await db.news_articles.find(syn_q).sort("published_at", -1).limit(limit).to_list(limit)
        # Normalise into the `news_markte_articles`-shape expected by _article_to_out
        for d in syn_docs:
            d.setdefault("featured", False)
            d.setdefault("excerpt", d.get("summary", ""))
            d.setdefault("source", (d.get("source_names") or ["Fröhlich Redaktion"])[0])
        docs = syn_docs

    articles = [_article_to_out(d) for d in docs]
    all_docs = docs if len(q) == 1 else await db.news_markte_articles.find(
        {"published_at": {"$gte": cutoff}}
    ).sort("published_at", -1).to_list(50)
    if not all_docs:
        all_docs = await db.news_articles.find({
            "is_published": True, "status": "published", "content_type": {"$ne": "demo"},
            "published_at": {"$gte": cutoff},
        }).sort("published_at", -1).limit(50).to_list(50)
        for d in all_docs:
            d.setdefault("featured", False)
            d.setdefault("excerpt", d.get("summary", ""))
            d.setdefault("source", (d.get("source_names") or ["Fröhlich Redaktion"])[0])
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


async def news_markte_markets(display_currency: Optional[str] = None):
    """Serves the /news top strip. Uses the Phase 2 Alpha-Vantage market module
    with in-memory + Mongo cache, falling back to deterministic stubs when no
    provider key is configured. `value` is display-currency-normalised where
    applicable; `unit` is 'Punkte' for indices, `<CCY>/<unit>` for commodities,
    `<CCY>` for stocks, empty string for FX pairs.
    """
    target = _normalise_target_currency(display_currency)
    configs = MARKET_INDEX_SYMBOLS + MARKET_COMMODITY_SYMBOLS + MARKET_FX_SYMBOLS
    quotes, _fx = await _fetch_many_display(configs, target=target)
    out: List[dict] = []
    for q in quotes:
        asset_class = q.get("asset_class")
        if asset_class == "index":
            unit = "Punkte"
        elif asset_class == "fx":
            unit = ""
        else:
            unit_base = q.get("unit")  # e.g. Feinunze, Barrel
            ccy = q.get("display_currency") or ""
            unit = f"{ccy}/{unit_base}" if unit_base else ccy
        out.append({
            "symbol": q["symbol"],
            "name": q["name"],
            "value": float(q.get("display_price") if q.get("display_price") is not None else q.get("price") or 0),
            "change_pct": float(q["change_percent"]),
            "unit": unit,
            "updated_at": q.get("last_updated") or _now_utc().isoformat(),
        })
    return out


async def list_editorial():
    docs = await db.editorial_posts.find({"published": True}).sort("published_at", -1).to_list(50)
    return [_editorial_to_out(d) for d in docs]


async def list_editorial_admin(_user: dict = Depends(require_admin)):
    docs = await db.editorial_posts.find({}).sort("published_at", -1).to_list(200)
    return [_editorial_to_out(d) for d in docs]


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


async def delete_editorial(post_id: str, _user: dict = Depends(require_admin)):
    if not ObjectId.is_valid(post_id):
        raise HTTPException(status_code=400, detail="Invalid id")
    r = await db.editorial_posts.delete_one({"_id": ObjectId(post_id)})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"deleted": r.deleted_count}


# --- Anlagetrends / Investment-Radar / Stimmen zum Markt --------------------

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


async def get_preferences(user: dict = Depends(get_current_user)):
    doc = await db.user_preferences.find_one({"user_id": ObjectId(user["id"])})
    return {
        "interests": doc.get("interests", []) if doc else [],
        "watchlist": doc.get("watchlist", []) if doc else [],
    }


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


async def news_for_you(user: dict = Depends(get_current_user), limit: int = 12):
    doc = await db.user_preferences.find_one({"user_id": ObjectId(user["id"])})
    interests = (doc or {}).get("interests", []) if doc else []
    if not interests:
        return {"personalized": False, "items": []}
    # Session 80.27 — Freshness auch für personalisierte Feeds erzwingen.
    q = {
        "category": {"$in": interests},
        "published_at": {"$gte": _current_feed_cutoff()},
    }
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
    docs = await db.reviews.find(query).sort(sort_field).skip(max(offset, 0)).limit(min(max(limit, 1), 200)).to_list(limit)
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
# NB: Texte bewusst uneinheitlich (Kürze, Ton, Zeichensetzung), damit sie sich
# nicht wie generierte Marketing-Sprache lesen. Keine Vorlagen aus fremden
# Bewertungen — inspiriert von Sprachmustern echter Online-Reviews.
_DEMO_FIRST = ["Thomas", "Anna", "Michael", "Sabine", "Daniel", "Petra", "Julia", "Andreas",
               "Christina", "Frank", "Katrin", "Stefan", "Nicole", "Markus", "Silke", "Peter",
               "Sandra", "Wolfgang", "Simone", "Torsten", "Claudia", "Robert", "Susanne",
               "Christian", "Beate", "Martin", "Kerstin", "Uwe", "Angelika", "Jörg", "Birgit",
               "Rainer", "Heike", "Bernd", "Elke", "Detlef", "Ursula", "Ralf", "Monika", "Hans",
               "Iris", "Ingo", "Marlene", "Volker", "Karin", "Rebecca", "Steffen", "Doris",
               "Achim", "Ines", "Norbert", "Helga", "Manuela"]
_DEMO_LAST_INITIALS = list("BCDFGHJKLMNPRSTVWZ")
_DEMO_SINCE = ["unter_1", "1_bis_3", "3_bis_5", "ueber_5"]

# 5★ Pool — Mix aus sehr kurzen, normalen und situativen Kommentaren.
_DEMO_5 = [
    # --- kurze Kommentare ---
    ("Alles bestens, bin zufrieden.", ["persoenliche-betreuung"]),
    ("Sehr freundlich und unkompliziert.", ["service"]),
    ("Bis jetzt alles super.", ["persoenliche-betreuung"]),
    ("Kann ich empfehlen.", ["beratung"]),
    ("Hat alles gut geklappt, danke.", ["service"]),
    ("Sehr nette Beratung.", ["beratung"]),
    ("Mir wurde alles verständlich erklärt. Danke.", ["beratung"]),
    ("Bin echt zufrieden bisher.", ["persoenliche-betreuung"]),
    ("Alles soweit gut 👍", ["service"]),
    ("Passt, danke!", ["service"]),
    ("Sehr zufrieden, mehr gibts nicht zu sagen.", ["persoenliche-betreuung"]),
    ("Klare Absprachen, alles wie besprochen.", ["transparenz"]),
    ("Super Kommunikation.", ["erreichbarkeit"]),
    # --- normale Kommentare ---
    ("Bin jetzt eine Weile dabei und bisher wirklich zufrieden. Wenn ich eine Frage habe bekomme ich meistens schnell eine Antwort und es wird auch so erklärt dass man es versteht.",
     ["erreichbarkeit", "beratung"]),
    ("Hatte am Anfang ehrlich gesagt wenig Ahnung von dem ganzen Thema. Im Gespräch wurde sich Zeit genommen und danach war einiges klarer.",
     ["beratung", "persoenliche-betreuung"]),
    ("Die Beratung war angenehm und überhaupt nicht aufdringlich. Ich wollte erstmal darüber schlafen und das war auch völlig okay.",
     ["beratung", "vertrauen"]),
    ("Ich hatte wegen einer Überweisung noch ein paar Fragen. Kurz angerufen und das Thema war am selben Tag erledigt.",
     ["erreichbarkeit", "service"]),
    ("Auf Mails kommt bei mir in der Regel innerhalb weniger Stunden eine Antwort. Für mich ein wichtiger Punkt.",
     ["erreichbarkeit"]),
    ("Man merkt dass sich jemand wirklich mit meinem Fall beschäftigt hat. Keine Standardantworten, sondern konkret zu meiner Situation.",
     ["persoenliche-betreuung", "beratung"]),
    ("Termin per Videocall lief problemlos. Die Unterlagen die vorher zugeschickt wurden waren gut vorbereitet.",
     ["service"]),
    ("Der Ton am Telefon ist immer freundlich und man wird nicht gehetzt. Angenehm gerade wenn man sich mit dem Thema noch nicht so auskennt.",
     ["persoenliche-betreuung"]),
    ("Habe verschiedene Anbieter verglichen bevor ich mich entschieden habe. Hier hat vor allem gepasst, dass man sich Zeit für ein Erstgespräch nimmt.",
     ["beratung"]),
    ("Ich mag es dass immer der gleiche Ansprechpartner da ist. Man muss die Situation nicht jedes Mal von vorne erklären.",
     ["persoenliche-betreuung", "langfristigkeit"]),
    ("Alles ist transparent, auch was Kosten angeht. Ich weiß immer woran ich bin.",
     ["transparenz"]),
    ("Sehr sachliche Beratung ohne Verkaufsdruck. Ich hatte nicht das Gefühl dass mir irgendwas aufgeschwatzt wird.",
     ["vertrauen", "beratung"]),
    ("Beratung war ausführlich aber nicht überladen. Danach hatte ich einen klaren Plan für die nächsten Schritte.",
     ["beratung"]),
    ("Die Erreichbarkeit ist für mich der Hauptpunkt. Es geht immer jemand ans Telefon oder ruft zeitnah zurück.",
     ["erreichbarkeit"]),
    ("Ich bin skeptisch bei so was, aber der erste Eindruck war gut. Bin jetzt seit über einem Jahr dabei und weiterhin zufrieden.",
     ["vertrauen", "langfristigkeit"]),
    ("Alles läuft ruhig und unaufgeregt. Genau das was ich mir gewünscht habe.",
     ["persoenliche-betreuung"]),
    ("Ich brauche keine kurzatmigen Trends. Der Blick auf einen längeren Zeithorizont passt für mich.",
     ["langfristigkeit"]),
    ("Auch bei komplizierteren Fragen wird sich die Zeit genommen. Danach hab ich meistens ein besseres Bild.",
     ["beratung"]),
    ("Bin über eine Empfehlung gekommen und mittlerweile selbst schon dankbar für den Tipp.",
     ["vertrauen"]),
    ("Die Jahresgespräche sind vernünftig vorbereitet, keine reine Formalität.",
     ["service", "beratung"]),
    ("Mir gefällt dass auch mal ehrlich gesagt wird wenn etwas gerade nicht sinnvoll ist. Ist mir lieber als jedes Produkt verkauft zu bekommen.",
     ["vertrauen", "beratung"]),
    ("Am Anfang war ich unsicher, jetzt läuft es ganz entspannt.",
     ["persoenliche-betreuung"]),
    ("Freundlicher Kontakt, klare Absprachen, keine bösen Überraschungen.",
     ["transparenz"]),
    ("Bekomme meine Übersicht in Ruhe erklärt, das war mir wichtig.",
     ["investmentuebersicht"]),
    ("Wenn es mal Rückfragen von meiner Seite gibt, wird das ernst genommen und nicht abgewimmelt.",
     ["persoenliche-betreuung"]),
    ("Kurze klare Antworten wenn man welche will, ausführliche wenn man welche braucht.",
     ["beratung", "erreichbarkeit"]),
    # --- konkrete Situationen ---
    ("Ich wollte einen größeren Betrag kurzfristig verfügbar haben und war mir nicht sicher wie ich das am besten mache. Hab morgens angerufen und am Nachmittag hatten wir das Thema geklärt.",
     ["erreichbarkeit", "beratung"]),
    ("Bei mir ging es eigentlich nur um Festgeld. Im Gespräch haben wir dann festgestellt dass ein Teil des Geldes verfügbar bleiben sollte. Im Nachhinein war das die bessere Lösung.",
     ["beratung"]),
    ("Ich war vorher bei einer größeren Bank und hatte ständig jemand anderen am Telefon. Hier weiß ich wenigstens wen ich anrufen kann.",
     ["persoenliche-betreuung"]),
    ("Nach dem Verkauf einer Immobilie musste plötzlich viel Geld sinnvoll geparkt werden. Wir haben es in Ruhe aufgeteilt, ohne dass ich das Gefühl hatte etwas übers Knie zu brechen.",
     ["beratung", "vertrauen"]),
    ("Ich war 30 Jahre bei derselben Bank, und der Wechsel hat mir ehrlich gesagt Bauchschmerzen gemacht. Rückblickend war es die richtige Entscheidung — allein wegen des persönlichen Kontakts.",
     ["persoenliche-betreuung", "langfristigkeit"]),
    ("Hatte Probleme beim ersten Login in die Plattform. Kurzer Anruf, danach ging es. Seitdem keine Probleme mehr.",
     ["service"]),
    ("Nach dem Tod meines Mannes musste ich mich um Finanzen kümmern mit denen ich vorher nichts zu tun hatte. Da wurde sehr geduldig und Schritt für Schritt geholfen.",
     ["persoenliche-betreuung", "vertrauen"]),
    ("Ich wollte einen Teil des Geldes für die Kinder anlegen. Es gab ein paar Optionen und die wurden ohne Fachchinesisch erklärt.",
     ["beratung"]),
    ("Beim Thema Auslandsüberweisung war ich mir wegen Gebühren und Dauer unsicher. Das wurde vorher klar durchgerechnet, keine Überraschung hinterher.",
     ["transparenz", "service"]),
    ("Ich war überrascht dass man sich sogar für ein einfaches Tagesgeld-Thema wirklich Zeit nimmt und nicht nur schnell auf ein Formular verweist.",
     ["persoenliche-betreuung"]),
    ("Wir haben mein bestehendes Depot in Ruhe angeschaut und ein paar Dinge umgestellt die aus Kostensicht wenig Sinn hatten. Musste nichts sofort passieren.",
     ["investmentuebersicht", "beratung"]),
    ("Als Selbstständiger habe ich unregelmäßige Einnahmen. Wir haben zusammen überlegt wie viel man ohne schlechtes Gewissen fest anlegen kann und was liquide bleibt.",
     ["beratung"]),
    ("Bei einer größeren Auszahlung war ich zuerst nervös ob alles funktioniert. Hat aber ohne Probleme geklappt und ich wurde vorher genau informiert.",
     ["transparenz", "service"]),
    ("Hatte eine steuerliche Frage die eigentlich nicht direkt dazu gehört. Trotzdem wurde ich in die richtige Richtung gelenkt und musste nicht ewig recherchieren.",
     ["beratung"]),
    ("Ich wollte mich eigentlich nur informieren und noch gar nichts entscheiden. Fand angenehm dass trotzdem kein Druck gemacht wurde.",
     ["vertrauen", "beratung"]),
    ("Bei einer plötzlichen Ausgabe brauchte ich schnell Liquidität. Das lief unkompliziert und ohne Rückfragen die mich unter Druck gesetzt hätten.",
     ["service"]),
    ("Meine Frau und ich hatten zusammen ein Beratungsgespräch, was mir wichtig war. Es wurde auf beide Blickwinkel eingegangen.",
     ["persoenliche-betreuung", "beratung"]),
    ("Nach einem Wechsel des Arbeitgebers hatte ich Themen rund um bAV offen. Wir haben das in einem Termin sortiert.",
     ["beratung"]),
    ("Bin über eine Ausschüttung gestolpert die ich nicht ganz einordnen konnte. Nach fünf Minuten am Telefon war klar was los ist.",
     ["erreichbarkeit", "investmentuebersicht"]),
    ("Ich hatte Sorge dass ich mich um vieles selbst kümmern muss. Ist zum Glück nicht so.",
     ["service", "persoenliche-betreuung"]),
    # --- Fröhlich namentlich (sehr sparsam) ---
    ("Fröhlich betreut mich seit einigen Jahren und ich habe die Entscheidung keinen Tag bereut.",
     ["langfristigkeit", "vertrauen"]),
    ("Wenn ich Fröhlich anrufe, weiß der Berater sofort wovon ich rede. Kein Formular ausfüllen, kein „ich verbinde weiter“.",
     ["persoenliche-betreuung", "erreichbarkeit"]),
]

# 4★ Pool — solide Zufriedenheit mit kleinen Anmerkungen.
_DEMO_4 = [
    # kurze
    ("Gute Beratung und schnelle Rückmeldung.", ["beratung", "erreichbarkeit"]),
    ("Kann mich nicht beschweren.", ["service"]),
    ("Zufrieden soweit.", ["persoenliche-betreuung"]),
    ("Alles in Ordnung bisher.", ["service"]),
    ("Läuft.", ["persoenliche-betreuung"]),
    ("Bin dabei, passt.", ["service"]),
    ("Solide Beratung.", ["beratung"]),
    ("Insgesamt zufrieden, kleiner Punkt für die Zukunft.", ["beratung"]),
    ("Ganz gut, nichts zu meckern.", ["service"]),
    # normale
    ("Bin bisher zufrieden. Vor allem die Erreichbarkeit passt. Bei den Unterlagen dürften manche Punkte kompakter sein.",
     ["erreichbarkeit"]),
    ("Eigentlich sehr zufrieden. Auf meine letzte Mail kam die Antwort allerdings erst zwei Tage später. Danach wurde alles schnell geklärt.",
     ["erreichbarkeit"]),
    ("Die ersten Unterlagen waren für mich ehrlich gesagt etwas viel auf einmal. Beim nächsten Gespräch wurde es dann nochmal einfacher erklärt.",
     ["beratung"]),
    ("Telefonisch klappt es bei mir besser als per Mail. Ansonsten bin ich mit der Betreuung zufrieden.",
     ["erreichbarkeit", "persoenliche-betreuung"]),
    ("Beratung war gründlich. Bei der Umsetzung hat es an einer Stelle etwas länger gedauert, im Endeffekt aber ok.",
     ["beratung", "service"]),
    ("Insgesamt gute Zusammenarbeit. Ich hätte mir bei einem Detail eine schriftliche Zusammenfassung gewünscht.",
     ["transparenz"]),
    ("Die Erreichbarkeit ist gut, die Antworten meistens hilfreich. Manchmal wünsche ich mir aber etwas mehr Initiative von der Beratung selbst.",
     ["erreichbarkeit", "beratung"]),
    ("Termin war pünktlich, Inhalte gut vorbereitet. Ein kleiner Papierkram-Punkt hätte digitaler laufen können.",
     ["service"]),
    ("Alles Wichtige ist geklärt, die Kommunikation läuft. Habe kurz warten müssen, aber das ist ok.",
     ["service"]),
    ("Freundlicher Kontakt, faire Aufklärung. Ich hätte gerne eine etwas modernere App, dafür läuft der Rest rund.",
     ["service", "investmentuebersicht"]),
    ("Bin zufrieden. Nur bei einer Nachfrage musste ich zweimal nachhaken.",
     ["erreichbarkeit"]),
    ("Für mich passt die Zusammenarbeit. Nicht spektakulär, aber verlässlich, und das ist mir wichtig.",
     ["vertrauen", "langfristigkeit"]),
    ("Sachliche Beratung ohne viel Marketing. Wenn ich einen Wunsch frei hätte: klarere schriftliche Übersichten.",
     ["beratung", "transparenz"]),
    ("Vom Ablauf her sauber. Bei einem Formular gab es eine kurze Unklarheit, das wurde per Telefon gelöst.",
     ["service"]),
    ("Ich bekomme meine Antworten, muss aber manchmal freundlich erinnern. Ansonsten passt es.",
     ["erreichbarkeit"]),
    ("Kompetenz sehe ich, Chemie passt auch. Ein Stern Abzug weil die Onlineplattform an manchen Stellen umständlich ist.",
     ["investmentuebersicht", "service"]),
    ("Bin froh dass ich einen festen Ansprechpartner habe. Das Onboarding war etwas zäh, danach ging es flüssig.",
     ["persoenliche-betreuung", "service"]),
    ("Für meinen Anwendungsfall reicht es völlig. Nichts Spektakuläres, aber genau das wollte ich auch nicht.",
     ["service"]),
    # Situationen
    ("Ich wollte einen Bausparvertrag auflösen und die Prozedur war komplizierter als gedacht. Zum Glück hat mir am Telefon jemand genau erklärt was zu tun ist.",
     ["service", "erreichbarkeit"]),
    ("Hatte im letzten Quartal ein bisschen viel Papierkram wegen einer Umstellung. Am Ende hat es funktioniert, ich hätte mir aber weniger Rückfragen gewünscht.",
     ["service"]),
    ("Wir haben mein Depot durchgeschaut und ein paar Sachen behalten die ich sonst vielleicht vorschnell verkauft hätte. Am Ende war das die richtige Entscheidung.",
     ["beratung", "investmentuebersicht"]),
    ("Wollte für ein Auto liquide bleiben. Wurde entsprechend eingerichtet, ohne dass ich meine restliche Anlage anfassen musste.",
     ["beratung"]),
    ("Beim Wechsel von einer anderen Bank hat ein Formular gefehlt. War aber schnell nachgereicht und der Rest lief glatt.",
     ["service"]),
    ("Ich habe eine Ferienwohnung finanzieren wollen. Die Beratung war ehrlich zu den Risiken und ich habe die Entscheidung am Ende bewusst getroffen.",
     ["beratung", "transparenz"]),
    ("Bei mir kam einmal ein Anruf zu einem ungünstigen Zeitpunkt. Wir haben dann per Mail weitergemacht, kein Problem.",
     ["erreichbarkeit"]),
    ("Termin für ein Update wurde einmal verschoben, ich hätte lieber den Originaltermin gehabt. Beim Ersatztermin war dafür genug Zeit.",
     ["service"]),
    ("Hatte bei einer Sparplan-Änderung eine kleine Panne im System. Wurde manuell nachgezogen und ist am nächsten Tag durchgelaufen.",
     ["service"]),
    ("Kleiner Punkt: Der erste PDF-Bericht war für mich schwer zu lesen. Ich habe eine einfachere Version bekommen, seitdem alles fein.",
     ["transparenz", "investmentuebersicht"]),
    ("Habe Fragen zum Thema Nachhaltigkeit gehabt. Antworten waren gut, ich hätte mir aber mehr Auswahl an entsprechenden Fonds gewünscht.",
     ["beratung"]),
    ("Nach einem Umzug musste die Adresse geändert werden, lief unauffällig ab. Habe es erst gemerkt als die Post an die richtige Adresse kam.",
     ["service"]),
    ("Ich habe eine Erbschaft geregelt bekommen, bei der ein Teil sofort verfügbar bleiben musste. Beratung war ok, es hätte an einer Stelle etwas schneller gehen dürfen.",
     ["beratung"]),
    ("War mit einer Verzögerung bei einer Zeichnungsfrist nicht ganz glücklich. Wurde am Ende gelöst, aber der Stress hätte nicht sein müssen.",
     ["service"]),
    ("Alles in allem eine faire Beratung. Ich habe einen anderen Vorschlag als erwartet bekommen, konnte das aber gut nachvollziehen.",
     ["beratung", "vertrauen"]),
    ("Bei mir hat der zweite Termin länger gedauert als geplant. Das lag aber daran dass wirklich alles besprochen wurde was mich interessiert.",
     ["persoenliche-betreuung"]),
    ("Ich musste einmal eine dringende Frage stellen und die Rückmeldung kam erst am nächsten Werktag. Für die Uhrzeit an dem ich geschrieben hatte war das aber verständlich.",
     ["erreichbarkeit"]),
    ("Ein Punkt Abzug für die App, ansonsten alles gut.", ["investmentuebersicht"]),
]

# 3★ Pool — spürbare Kritik, aber grundsätzlich weiter dabei.
_DEMO_3 = [
    ("Beratung war gut, nur die Einrichtung hat bei mir länger gedauert als gedacht. Jetzt läuft aber alles.",
     ["service", "beratung"]),
    ("Ganz zufrieden, aber die Kommunikation läuft mir zu formal. Ist Geschmackssache.",
     ["persoenliche-betreuung"]),
    ("Ich hätte am Anfang klarere Antworten zu Kosten erwartet. Wurde später geklärt, hat aber etwas gedauert.",
     ["transparenz"]),
    ("Die Beratung selbst ist in Ordnung, die Plattform finde ich für ältere Nutzer eher unübersichtlich.",
     ["investmentuebersicht"]),
    ("Bin noch am Kennenlernen, ein paar Sachen laufen gut, andere sind etwas holprig.",
     ["service"]),
    ("Grundsätzlich zufrieden. Auf Rückrufe muss man aber manchmal warten.",
     ["erreichbarkeit"]),
    ("Termine klappen, Antworten kommen. Manchmal wünsche ich mir mehr Struktur in den Unterlagen.",
     ["transparenz"]),
    ("Habe schon Beratungen erlebt die mehr in die Tiefe gegangen sind. Für den Alltag reicht es aber.",
     ["beratung"]),
    ("Bin nicht unzufrieden, aber auch nicht begeistert. Solide 3 Sterne für mich.",
     ["persoenliche-betreuung"]),
    ("Der Berater ist nett, ich hätte mir zu einem konkreten Punkt aber eine klarere Empfehlung gewünscht statt Varianten.",
     ["beratung"]),
    ("Die Unterlagen sind teilweise schwer verständlich. Nachfragen werden aber beantwortet, deshalb noch 3 Sterne.",
     ["transparenz"]),
    ("Wollte eigentlich mehr digitale Prozesse. Vieles läuft noch über Papier oder Mail.",
     ["service"]),
    ("Anfangs sehr enthusiastisch, mittlerweile etwas nüchterner. Die Betreuung ist ok, mehr aber auch nicht.",
     ["persoenliche-betreuung"]),
    ("Bei mir sind zwei kleine Fehler passiert, die korrigiert wurden. Ich hätte mir mehr Sorgfalt beim ersten Anlauf gewünscht.",
     ["service"]),
    ("Die Antwortzeit schwankt bei mir stark. Manchmal sehr schnell, manchmal muss ich zweimal nachfragen.",
     ["erreichbarkeit"]),
    ("Über die App ärgere ich mich immer wieder. Beratung selbst geht in Ordnung.",
     ["investmentuebersicht"]),
    ("Alles läuft, für meinen Geschmack bekomme ich aber wenig eigene Impulse. Muss meistens selbst nachfragen.",
     ["beratung"]),
    ("Der letzte Termin war weniger vorbereitet als der erste. Kann Zufall sein, hoffe dass es besser wird.",
     ["service"]),
    ("Ich vermisse eine übersichtliche Jahresauswertung. Was ich bekomme ist mir zu textlastig.",
     ["investmentuebersicht", "transparenz"]),
    ("Insgesamt in Ordnung. 3 Sterne weil zwischen Anfrage und Termin bei mir aktuell zu viel Zeit lag.",
     ["service"]),
    ("Zwei kleine Punkte: einmal Zeitverzug, einmal ein missverständliches Schreiben. Sonst ok.",
     ["service", "transparenz"]),
    ("Bei komplizierteren Fragen wird sichtbar, dass es länger dauert. Für einfache Sachen läuft es aber.",
     ["beratung"]),
    ("Ich hätte bei einem Thema eine ausführlichere Aufklärung erwartet. Musste selbst nachlesen.",
     ["beratung", "transparenz"]),
    ("Habe schon bessere Berater erlebt, aber auch deutlich schlechtere. 3 Sterne passen ehrlich.",
     ["persoenliche-betreuung"]),
    ("Nicht optimal, nicht schlecht. Ich bleibe erstmal dabei und schau wie es sich entwickelt.",
     ["vertrauen"]),
]

# 2★ Pool — deutliche Kritik, aber ohne Beleidigungen (Demo).
_DEMO_2 = [
    ("Der Ablauf war ok, die Einrichtung meines Zugangs hat aber deutlich länger gedauert als angekündigt.",
     ["service"]),
    ("Bei meiner letzten Anfrage musste ich mehrere Tage auf eine Antwort warten. Für so ein Thema erwarte ich mehr.",
     ["erreichbarkeit"]),
    ("Die Beratung war grundsätzlich freundlich, es gab aber zwei Fehler in meinen Unterlagen die ich selbst gefunden habe.",
     ["transparenz"]),
    ("Termin wurde kurzfristig verschoben, was ich ärgerlich fand. Beim neuen Termin waren die Punkte noch nicht ganz sortiert.",
     ["service"]),
    ("Hatte den Eindruck dass meine Fragen zwischendurch untergegangen sind. Musste zweimal nachhaken.",
     ["erreichbarkeit"]),
    ("Die Plattform hat bei mir Probleme gemacht und der Support war zäh. Erst nach mehreren Anrufen ging es weiter.",
     ["investmentuebersicht", "service"]),
    ("Es hat länger gedauert bis ich einen festen Ansprechpartner hatte. Der ist jetzt zwar da, ich hänge aber noch am Aufholen.",
     ["persoenliche-betreuung"]),
    ("Ehrlich enttäuscht wegen einer verspäteten Rückmeldung zu einer wichtigen Frist. Danach wurde es besser, ich bleibe skeptisch.",
     ["erreichbarkeit"]),
    ("Anfang war gut, dann kam eine Phase in der ich mich zu wenig informiert gefühlt habe.",
     ["transparenz"]),
    ("Zwei Sterne weil bei mir eine Umbuchung nicht wie besprochen ausgeführt wurde. Wurde korrigiert, hat mich aber Nerven gekostet.",
     ["service"]),
    ("Vom Ton her nett, in der Sache aber langsam. Ich hoffe das legt sich.",
     ["persoenliche-betreuung"]),
    ("Bin gerade unschlüssig ob es zu mir passt. Aktuell tendenziell eher unzufrieden.",
     ["vertrauen"]),
]

# Antworten von Fröhlich — kurz, variiert, nicht schablonenhaft.
_DEMO_RESPONSES_5 = [
    "Vielen Dank!",
    "Danke für die nette Rückmeldung.",
    "Freut uns, danke!",
    "Danke, das freut uns sehr.",
    "Schön zu hören. Vielen Dank!",
    "Danke — schön dass es passt.",
    "Herzlichen Dank für die Rückmeldung.",
]
_DEMO_RESPONSES_4 = [
    "Danke für die Rückmeldung.",
    "Vielen Dank für den Hinweis. Wir schauen es uns an.",
    "Danke für die offene Rückmeldung.",
    "Freut uns dass es soweit passt. Ihre Anmerkung nehmen wir mit.",
    "Danke, das hilft uns weiter.",
    "Vielen Dank, wir bleiben dran.",
]
_DEMO_RESPONSES_3 = [
    "Danke für den Hinweis. Bei der Antwortzeit möchten wir besser sein, das nehmen wir mit.",
    "Danke für Ihr ehrliches Feedback. Wir arbeiten an den genannten Punkten.",
    "Vielen Dank. Wir prüfen intern woran es lag und geben Ihrem Ansprechpartner Bescheid.",
    "Danke für die Offenheit. Melden Sie sich gerne direkt, dann schauen wir gemeinsam drauf.",
    "Danke für die Rückmeldung, wir nehmen die Punkte ernst.",
    "Wir hören das ungern und schauen uns die genannten Themen konkret an. Danke für den Hinweis.",
    "Vielen Dank. An der App arbeiten wir kontinuierlich weiter.",
]
_DEMO_RESPONSES_2 = [
    "Das tut uns leid. Bitte melden Sie sich direkt, wir schauen uns Ihren Fall konkret an.",
    "Danke für Ihre offenen Worte. Wir prüfen den beschriebenen Ablauf intern.",
    "Vielen Dank für die Rückmeldung. Bei einer Frist so lange zu warten war nicht in Ordnung, wir gehen dem nach.",
    "Wir bedauern die Verzögerung. Ihr Hinweis kommt bei uns an und wir melden uns bei Ihnen.",
    "Danke, dass Sie das ansprechen. Was passiert ist darf so nicht laufen, wir klären das.",
]


def _generate_demo_reviews(count: int = 218) -> list:
    """Generate 218 demo reviews with human-sounding language and mixed styles.

    Verteilungen (bei count=218):
    - 5★: 120  · 4★: 65  · 3★: 22  · 2★: 11
    - Antwort-Wahrscheinlichkeit: 5★=20%, 4★=30%, 3★=60%, 2★=90% (~30% gesamt)
    - Texte werden aus Pools zyklisch gezogen (leichte Wiederholung ist realistisch);
      Namen/Datum/Topics differenzieren die Einträge.
    """
    rnd = random.Random(42)
    now = datetime.now(timezone.utc)
    combos: list = []

    # Feste Bucketgrößen — Summe = count (218 default)
    n5 = int(round(count * 0.55))          # 120
    n4 = int(round(count * 0.30))          # 65
    n3 = int(round(count * 0.10))          # 22
    n2 = count - n5 - n4 - n3              # 11

    buckets = [
        (5, n5, _DEMO_5, _DEMO_RESPONSES_5, 0.20),
        (4, n4, _DEMO_4, _DEMO_RESPONSES_4, 0.30),
        (3, n3, _DEMO_3, _DEMO_RESPONSES_3, 0.60),
        (2, n2, _DEMO_2, _DEMO_RESPONSES_2, 0.90),
    ]

    global_idx = 0
    for rating, needed, pool, responses, resp_prob in buckets:
        # Deterministische Permutation pro Bucket → Wiederholungen liegen nicht direkt hintereinander
        order = list(range(len(pool)))
        rnd.shuffle(order)
        for i in range(needed):
            base_text, base_topics = pool[order[i % len(order)]]
            text = base_text
            topics = list(base_topics)

            fn = _DEMO_FIRST[global_idx % len(_DEMO_FIRST)]
            ln_init = _DEMO_LAST_INITIALS[(global_idx * 7) % len(_DEMO_LAST_INITIALS)]
            since = _DEMO_SINCE[(global_idx * 5) % len(_DEMO_SINCE)]

            add_response = rnd.random() < resp_prob
            response = responses[global_idx % len(responses)] if add_response else None

            # Datum quasi-zufällig innerhalb ~2 Jahre — realistischer Timeline-Mix.
            created = now - timedelta(
                days=rnd.randint(1, 730),
                hours=rnd.randint(0, 23),
                minutes=rnd.randint(0, 59),
            )

            combos.append({
                "first_name": fn,
                "last_name": f"Demo{global_idx:03d}",
                "email": f"demo{global_idx:03d}@fvb-demo.local",
                "rating": rating,
                "text": text,
                "customer_since": since,
                "topics": topics[:3],
                "status": "approved",
                "display_name": f"{fn} {ln_init}.",
                "is_verified": False,
                "is_featured": False,
                "invited": False,
                "is_demo": True,
                "admin_response": response,
                "responded_at": created + timedelta(days=rnd.randint(1, 4)) if response else None,
                "responded_by": "demo-seed" if response else None,
                "created_at": created,
                "moderated_at": created,
                "moderated_by": "demo-seed",
                "admin_note": "DEMO — automatisch generiert",
                "ip_hash": "",
            })
            global_idx += 1

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
    offers_v1 = [
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
    # Session 80.37 — Refresh mit strukturiertem Model (Aug 2026).
    from savings_data import STRUCTURED_OFFERS, is_plausible_rate
    offers = [o for o in STRUCTURED_OFFERS if is_plausible_rate(o.get("interest_rate"))]
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
                "image_url": "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1600&q=70",
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
                "image_url": "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=1600&q=70",
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
                "image_url": "https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?auto=format&fit=crop&w=1600&q=70",
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
                "image_url": "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1600&q=70",
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
             "image_url": "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1600&q=70",
             "published_at": now - timedelta(hours=6), "featured": False, "highlight_investor": True},
            {"slug": "unternehmensanleihen-spreads", "title": "Unternehmensanleihen: Spreads bleiben eng",
             "excerpt": "IG-Anleihen mit A/BBB-Rating notieren nahe Vor-Corona-Niveau. Anleger honorieren solide Unternehmensbilanzen.",
             "category": "anleihen", "source": "Bloomberg", "source_url": "https://www.bloomberg.com",
             "image_url": "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=1600&q=70",
             "published_at": now - timedelta(hours=13), "featured": False, "highlight_investor": True},
            {"slug": "euro-dollar-parity-diskussion", "title": "Euro/Dollar: Rückkehr zur Parität debattiert",
             "excerpt": "Zinsdifferenz und Wachstumserwartungen sorgen für Kursdruck auf den Euro. Devisenstrategen diskutieren Szenarien.",
             "category": "waehrungen", "source": "FX Street", "source_url": "https://www.fxstreet.com",
             "image_url": "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1600&q=70",
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


# ---------------------------------------------------------------------------
# Market Data — Alpha Vantage integration with MongoDB TTL cache & fallbacks
# ---------------------------------------------------------------------------
#
# All external network calls are guarded by:
#   1. Cache lookup in `market_quotes_cache` (TTL via `expires_at`).
#   2. Provider call (only if key present + no fresh cache).
#   3. Fallback stub values (deterministic, marked `data_source=fallback`).
#
# The API key is only read from ALPHA_VANTAGE_API_KEY (fallback ALPHA_VANTAGE_KEY).
# It is never returned to the client, never logged.

AV_BASE_URL = "https://www.alphavantage.co/query"
AV_TIMEOUT_S = 6.0

# TTL per data class (seconds)
_TTL_QUOTE = 300      # 5 min for stocks / index ETFs / commodities
_TTL_FX = 600         # 10 min for FX
_TTL_STALE_KEEP = 3600 * 24  # keep last-known-good for 24 h even after TTL

# Internal symbol → provider mapping. Alpha Vantage free plan does not offer
# native DAX / SPX / commodities futures — we use widely-tracked ETF proxies
# and mark those results with a `note`. Stocks with primary listing outside
# NYSE/NASDAQ are looked up via their ADR ticker.
# Session 80.29e — Datenintegrität. Provider-Priorität pro Instrument:
#   1) yfinance direkt (echte Indizes / Futures / FX-Paare, kein API-Key nötig)
#   2) Alpha Vantage (nur wenn Key gesetzt; verwendet ETF-Proxies, wird
#      entsprechend als „Proxy" markiert)
#   3) Cache / stale-Cache
#   4) Für Indices/Commodities/FX gibt es KEINEN hardcoded-Fallback mehr —
#      fehlerhafte Werte werden `None` und vom Endpoint gefiltert (kein Fake).
#      Stocks behalten den bisherigen deterministischen Fallback.
#
# Yahoo-Ticker sind eindeutig:
#   ^GDAXI  → DAX Performance-Index (Punkte)
#   ^GSPC   → S&P 500 (Punkte)
#   ^NDX    → Nasdaq-100 (Punkte)  — echter Index, nicht ETF
#   ^DJI    → Dow Jones Industrial Average (Punkte)
#   GC=F    → COMEX Gold-Future (USD/Feinunze)
#   SI=F    → COMEX Silber-Future (USD/Feinunze)
#   BZ=F    → ICE Brent Crude Future (USD/Barrel)
#   EURUSD=X→ Spot EUR/USD (1 EUR = x USD)
MARKET_INDEX_SYMBOLS = [
    {"symbol": "DAX",  "name": "DAX",         "yf_symbol": "^GDAXI", "av_symbol": "EWG",  "asset_class": "index", "unit": "Punkte", "native_currency": None, "note": "DAX Performance-Index"},
    {"symbol": "SPX",  "name": "S&P 500",     "yf_symbol": "^GSPC",  "av_symbol": "SPY",  "asset_class": "index", "unit": "Punkte", "native_currency": None, "note": "S&P 500 Index"},
    {"symbol": "NDX",  "name": "Nasdaq-100",  "yf_symbol": "^NDX",   "av_symbol": "QQQ",  "asset_class": "index", "unit": "Punkte", "native_currency": None, "note": "Nasdaq-100 Index"},
    {"symbol": "DJI",  "name": "Dow Jones",   "yf_symbol": "^DJI",   "av_symbol": "DIA",  "asset_class": "index", "unit": "Punkte", "native_currency": None, "note": "Dow Jones Industrial Average"},
]

MARKET_COMMODITY_SYMBOLS = [
    {"symbol": "GOLD",   "name": "Gold-Future",   "yf_symbol": "GC=F", "av_symbol": "GLD", "asset_class": "commodity", "unit": "Feinunze", "native_currency": "USD", "note": "COMEX Gold-Future (GC=F)"},
    {"symbol": "SILVER", "name": "Silber-Future", "yf_symbol": "SI=F", "av_symbol": "SLV", "asset_class": "commodity", "unit": "Feinunze", "native_currency": "USD", "note": "COMEX Silber-Future (SI=F)"},
    {"symbol": "OIL",    "name": "Brent Öl",      "yf_symbol": "BZ=F", "av_symbol": "USO", "asset_class": "commodity", "unit": "Barrel",   "native_currency": "USD", "note": "ICE Brent Crude Future (BZ=F)"},
]

MARKET_FX_SYMBOLS = [
    {"symbol": "EURUSD", "name": "EUR/USD", "yf_symbol": "EURUSD=X", "asset_class": "fx", "unit": "", "from_curr": "EUR", "to_curr": "USD", "native_currency": None, "note": "Spot EUR/USD (1 EUR = x USD)"},
]

MARKET_STOCK_SYMBOLS = [
    # German blue chips — native EUR via XETRA (.DE); fallback prices are already in EUR.
    {"symbol": "SAP",   "name": "SAP",           "av_symbol": "SAP.DE", "asset_class": "stock", "native_currency": "EUR"},
    {"symbol": "SIE",   "name": "Siemens",       "av_symbol": "SIE.DE", "asset_class": "stock", "native_currency": "EUR"},
    {"symbol": "ALV",   "name": "Allianz",       "av_symbol": "ALV.DE", "asset_class": "stock", "native_currency": "EUR"},
    {"symbol": "DBK",   "name": "Deutsche Bank", "av_symbol": "DBK.DE", "asset_class": "stock", "native_currency": "EUR"},
    {"symbol": "IFX",   "name": "Infineon",      "av_symbol": "IFX.DE", "asset_class": "stock", "native_currency": "EUR"},
    {"symbol": "RHM",   "name": "Rheinmetall",   "av_symbol": "RHM.DE", "asset_class": "stock", "native_currency": "EUR"},
    # US mega caps — native USD.
    {"symbol": "NVDA",  "name": "NVIDIA",        "av_symbol": "NVDA",  "asset_class": "stock", "native_currency": "USD"},
    {"symbol": "AAPL",  "name": "Apple",         "av_symbol": "AAPL",  "asset_class": "stock", "native_currency": "USD"},
    {"symbol": "MSFT",  "name": "Microsoft",     "av_symbol": "MSFT",  "asset_class": "stock", "native_currency": "USD"},
    {"symbol": "GOOGL", "name": "Alphabet",      "av_symbol": "GOOGL", "asset_class": "stock", "native_currency": "USD"},
    {"symbol": "AMZN",  "name": "Amazon",        "av_symbol": "AMZN",  "asset_class": "stock", "native_currency": "USD"},
]

# Deterministic fallback quotes (realistic reference prices as of early 2026).
# `data_source=fallback` is transparently returned so the FE can badge them.
_FALLBACK_QUOTES = {
    # Indices — ETF proxy prices (in "Punkte" via ETF-USD). Kept as-is; display keeps them
    # unformatted with unit "Punkte" (no currency symbol) because indices are point levels.
    "DAX":    {"price": 47.83, "change": 0.18, "change_percent": 0.38},
    "SPX":    {"price": 512.44, "change": 1.62, "change_percent": 0.32},
    "NDX":    {"price": 438.90, "change": 2.10, "change_percent": 0.48},
    "DJI":    {"price": 405.12, "change": -0.35, "change_percent": -0.09},
    # Commodities — USD per unit (Feinunze / Barrel via ETF proxy)
    "GOLD":   {"price": 218.65, "change": 0.82, "change_percent": 0.38},
    "SILVER": {"price": 27.14, "change": -0.12, "change_percent": -0.44},
    "OIL":    {"price": 78.32, "change": 0.44, "change_percent": 0.57},
    # FX — EUR/USD spot
    "EURUSD": {"price": 1.0862, "change": 0.0012, "change_percent": 0.11},
    # German blue chips — XETRA-realistic EUR prices (already native EUR, no conversion)
    "SAP":    {"price": 232.10, "change": 1.05, "change_percent": 0.45},
    "SIE":    {"price": 178.44, "change": 0.62, "change_percent": 0.35},
    "ALV":    {"price": 342.20, "change": 0.18, "change_percent": 0.05},
    "DBK":    {"price": 18.75,  "change": -0.11, "change_percent": -0.58},
    "IFX":    {"price": 33.05,  "change": 0.35, "change_percent": 1.07},
    "RHM":    {"price": 582.40, "change": 6.20, "change_percent": 1.08},
    # US mega caps — native USD prices (get converted to EUR for display)
    "NVDA":   {"price": 138.85, "change": 2.10, "change_percent": 1.54},
    "AAPL":   {"price": 226.02, "change": 0.88, "change_percent": 0.39},
    "MSFT":   {"price": 434.55, "change": 1.42, "change_percent": 0.33},
    "GOOGL":  {"price": 195.10, "change": 0.55, "change_percent": 0.28},
    "AMZN":   {"price": 214.90, "change": 1.15, "change_percent": 0.54},
}


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _build_quote(cfg: dict, price: float, change: float, change_percent: float, source: str, note: Optional[str] = None) -> dict:
    is_delayed = source != "provider_realtime"
    native_currency = cfg.get("native_currency") or cfg.get("currency")  # None for indices/FX
    asset_class = cfg.get("asset_class", "stock")
    price_r = round(float(price), 4)
    return {
        "symbol": cfg["symbol"],
        "name": cfg["name"],
        "asset_class": asset_class,
        "unit": cfg.get("unit"),
        # legacy fields (backwards compatible) — mirror display_* until conversion applied
        "price": price_r,
        "currency": native_currency,
        "change": round(float(change), 4),
        "change_percent": round(float(change_percent), 3),
        # new normalised currency model
        "original_price": price_r,
        "original_currency": native_currency,
        "display_price": price_r,
        "display_currency": native_currency,
        "fx_rate": None,
        "fx_updated_at": None,
        "conversion_available": True,
        # meta
        "last_updated": _now_utc().isoformat(),
        "market_status": "delayed" if is_delayed else "live",
        "data_source": source,
        "is_delayed": is_delayed,
        "note": note or cfg.get("note"),
        "provider_symbol": cfg.get("av_symbol") or cfg.get("from_curr"),
    }


def _fallback_quote(cfg: dict, reason: str = "no_provider") -> dict:
    fb = _FALLBACK_QUOTES.get(cfg["symbol"]) or {"price": 100.0, "change": 0.0, "change_percent": 0.0}
    q = _build_quote(cfg, fb["price"], fb["change"], fb["change_percent"], source="fallback", note=cfg.get("note"))
    q["fallback_reason"] = reason
    return q


async def _cache_get(symbol: str) -> Optional[dict]:
    doc = await db.market_quotes_cache.find_one({"symbol": symbol})
    if not doc:
        return None
    return doc


async def _cache_put(symbol: str, quote: dict, ttl_s: int) -> None:
    expires_at = _now_utc() + timedelta(seconds=max(ttl_s, 30))
    await db.market_quotes_cache.update_one(
        {"symbol": symbol},
        {"$set": {
            "symbol": symbol,
            "quote": quote,
            "cached_at": _now_utc(),
            "expires_at": expires_at,
        }},
        upsert=True,
    )


# --- yfinance direct fetch (Session 80.29e) ---------------------------------
# Free, no API key. Yahoo publishes the real index levels for ^GDAXI/^GSPC etc.
# We call this BEFORE Alpha Vantage so Märkte-heute-Kacheln zeigen echte Werte,
# nicht ETF-Proxies. Runs the blocking yfinance client in a thread to keep the
# async loop free.

def _yf_fetch_sync(yf_symbol: str) -> Optional[dict]:
    try:
        import yfinance as yf  # type: ignore
    except Exception:  # noqa: BLE001
        return None
    try:
        t = yf.Ticker(yf_symbol)
        fi = t.fast_info
        price = float(fi.last_price) if fi.last_price else None
        prev = float(fi.previous_close) if fi.previous_close else None
        if not price or price <= 0:
            return None
        change = (price - prev) if (prev and prev > 0) else 0.0
        change_pct = (change / prev * 100.0) if (prev and prev > 0) else 0.0
        return {
            "price": round(price, 4),
            "change": round(change, 4),
            "change_percent": round(change_pct, 3),
            "previous_close": round(prev, 4) if prev else None,
        }
    except Exception as exc:  # noqa: BLE001
        logger.info("yfinance %s error: %s", yf_symbol, str(exc)[:120])
        return None


async def _yf_call(yf_symbol: Optional[str]) -> Optional[dict]:
    if not yf_symbol:
        return None
    return await asyncio.to_thread(_yf_fetch_sync, yf_symbol)


async def _av_call(params: dict) -> Optional[dict]:
    """Perform a single Alpha Vantage GET. Returns parsed JSON dict or None on any failure/limit."""
    if not ALPHA_VANTAGE_KEY:
        return None
    params = {**params, "apikey": ALPHA_VANTAGE_KEY}
    try:
        async with httpx.AsyncClient(timeout=AV_TIMEOUT_S) as http:
            r = await http.get(AV_BASE_URL, params=params)
        if r.status_code != 200:
            logger.warning("Alpha Vantage HTTP %s for function=%s", r.status_code, params.get("function"))
            return None
        data = r.json()
        # Alpha Vantage puts rate-limit / error messages in "Note" or "Information".
        note = data.get("Note") or data.get("Information") or data.get("Error Message")
        if note:
            logger.warning("Alpha Vantage limited/blocked: %s", str(note)[:120])
            return None
        return data
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("Alpha Vantage call failed function=%s: %s", params.get("function"), type(exc).__name__)
        return None


def _parse_global_quote(data: dict) -> Optional[dict]:
    node = data.get("Global Quote") or data.get("globalQuote") or {}
    if not node:
        return None
    try:
        price = float(node.get("05. price") or 0.0)
        change = float(node.get("09. change") or 0.0)
        cp_raw = str(node.get("10. change percent") or "0").replace("%", "").strip()
        change_pct = float(cp_raw or 0.0)
    except (TypeError, ValueError):
        return None
    if price <= 0:
        return None
    return {"price": price, "change": change, "change_percent": change_pct}


def _parse_fx(data: dict) -> Optional[dict]:
    node = data.get("Realtime Currency Exchange Rate") or {}
    if not node:
        return None
    try:
        rate = float(node.get("5. Exchange Rate") or 0)
    except (TypeError, ValueError):
        return None
    if rate <= 0:
        return None
    # Alpha Vantage FX endpoint does not include change; keep 0 → change_percent unknown.
    return {"price": rate, "change": 0.0, "change_percent": 0.0}


async def _fetch_quote(cfg: dict) -> Optional[dict]:
    """Return a normalised quote for one config entry.

    Priority: cache → yfinance (real indices/futures/FX) → Alpha Vantage
    (ETF proxies) → stale-cache → deterministic fallback (stocks only).

    For asset_class ∈ {index, commodity, fx} we NEVER return the hardcoded
    fallback: without a real provider we return None so the endpoint can skip
    the instrument. That is the price of data integrity — better fewer tiles
    than fake numbers labelled as an index.
    """
    symbol = cfg["symbol"]
    ttl = _TTL_FX if cfg.get("from_curr") else _TTL_QUOTE

    cached = await _cache_get(symbol)
    if cached and cached.get("expires_at") and cached["expires_at"] > _now_utc():
        q = dict(cached["quote"])
        q["data_source"] = "cache"
        q["last_updated"] = (cached.get("cached_at") or _now_utc()).isoformat() if isinstance(cached.get("cached_at"), datetime) else q.get("last_updated")
        return q

    # (1) yfinance — real values for indices / commodities futures / FX.
    yf_sym = cfg.get("yf_symbol")
    if yf_sym:
        parsed = await _yf_call(yf_sym)
        if parsed:
            quote = _build_quote(cfg, parsed["price"], parsed["change"], parsed["change_percent"],
                                 source="yfinance", note=cfg.get("note"))
            quote["previous_close"] = parsed.get("previous_close")
            quote["provider_symbol"] = yf_sym
            await _cache_put(symbol, quote, ttl)
            return quote

    # (2) Alpha Vantage — only if key present. Still uses ETF proxies, marked as such.
    provider_data = None
    if ALPHA_VANTAGE_KEY:
        if cfg.get("from_curr"):
            provider_data = await _av_call({
                "function": "CURRENCY_EXCHANGE_RATE",
                "from_currency": cfg["from_curr"],
                "to_currency": cfg["to_curr"],
            })
            parsed = _parse_fx(provider_data) if provider_data else None
        else:
            provider_data = await _av_call({
                "function": "GLOBAL_QUOTE",
                "symbol": cfg["av_symbol"],
            })
            parsed = _parse_global_quote(provider_data) if provider_data else None

        if parsed:
            quote = _build_quote(cfg, parsed["price"], parsed["change"], parsed["change_percent"],
                                 source="alpha_vantage", note=cfg.get("note"))
            await _cache_put(symbol, quote, ttl)
            return quote

    # (3) Stale cache — keep last known good within 24 h.
    if cached and cached.get("cached_at"):
        cached_age = (_now_utc() - cached["cached_at"]).total_seconds() if isinstance(cached["cached_at"], datetime) else 0
        if cached_age < _TTL_STALE_KEEP:
            q = dict(cached["quote"])
            q["data_source"] = "stale_cache"
            q["is_delayed"] = True
            return q

    # (4) Data integrity: indices/commodities/fx must NEVER show hardcoded fake
    # prices. Signal skip to the caller by returning None.
    if cfg.get("asset_class") in ("index", "commodity", "fx"):
        return None

    reason = "no_api_key" if not ALPHA_VANTAGE_KEY else "provider_unavailable"
    return _fallback_quote(cfg, reason=reason)


async def _fetch_many(configs: List[dict]) -> List[dict]:
    """Fetch quotes sequentially — Alpha Vantage free plan is 5 calls/min. Cache
    covers repeat hits; we intentionally do NOT parallelise external calls.

    Session 80.29e — None-returning quotes (indices/commodities/fx with no
    real provider) are filtered out. Stocks still fall back to constants.
    """
    results = []
    for cfg in configs:
        try:
            q = await _fetch_quote(cfg)
        except Exception as exc:  # noqa: BLE001
            logger.exception("market fetch error for %s: %s", cfg.get("symbol"), type(exc).__name__)
            q = None if cfg.get("asset_class") in ("index", "commodity", "fx") else _fallback_quote(cfg, reason="internal_error")
        if q is not None:
            results.append(q)
    return results


# ---------------------------------------------------------------------------
# FX + display-currency normalisation
# ---------------------------------------------------------------------------
# Every quote is enriched with `display_price` / `display_currency` before the
# API returns it, so React never has to do FX arithmetic. Central USD→EUR rate
# is derived from the cached EURUSD quote (same TTL + stale fallback logic).

async def _get_usd_to_eur() -> Optional[dict]:
    """Return {'rate': 0.9207, 'updated_at': iso, 'source': ...} or None if unusable.

    Reuses the standard EURUSD quote path so the FX rate benefits from the same
    Mongo TTL cache + provider fallback machinery as the price quotes.
    """
    fx_cfg = MARKET_FX_SYMBOLS[0]
    try:
        q = await _fetch_quote(fx_cfg)
    except Exception:  # noqa: BLE001
        return None
    eurusd = float(q.get("price") or 0) if q else 0
    if eurusd <= 0.1 or eurusd > 10:
        return None
    return {
        "rate": round(1.0 / eurusd, 6),
        "updated_at": q.get("last_updated"),
        "source": q.get("data_source"),
    }


def _apply_display_currency(quote: dict, target: str = "EUR", fx_info: Optional[dict] = None) -> dict:
    """Populate display_price / display_currency / fx_rate / fx_updated_at on `quote`.

    Rules:
    - asset_class in {'index', 'fx'} → no conversion (indices are points, FX pairs are rates).
    - Same currency → display equals original.
    - USD → EUR requires a valid `fx_info` with `rate` = EUR per USD (~0.92).
    - EUR → USD uses the inverse (1/rate) of the same FX cache.
    - Missing/invalid FX → conversion_available=False and display stays on original.
    """
    target = (target or "EUR").upper()
    asset_class = quote.get("asset_class")
    if asset_class in ("index", "fx"):
        quote["display_currency"] = quote.get("original_currency")
        quote["conversion_available"] = True
        return quote

    original_ccy = quote.get("original_currency")
    if not original_ccy or original_ccy == target:
        quote["display_price"] = quote.get("original_price")
        quote["display_currency"] = original_ccy or target
        quote["conversion_available"] = True
        quote["price"] = quote["display_price"]
        quote["currency"] = quote["display_currency"]
        return quote

    if not fx_info:
        quote["conversion_available"] = False
        return quote

    rate = fx_info.get("rate")  # EUR per USD (~0.92)
    if not rate or rate <= 0:
        quote["conversion_available"] = False
        return quote

    original_price = float(quote["original_price"])
    if original_ccy == "USD" and target == "EUR":
        quote["display_price"] = round(original_price * float(rate), 2)
        quote["display_currency"] = "EUR"
        quote["fx_rate"] = rate
    elif original_ccy == "EUR" and target == "USD":
        quote["display_price"] = round(original_price / float(rate), 2)
        quote["display_currency"] = "USD"
        quote["fx_rate"] = round(1.0 / float(rate), 6)  # USD per EUR
    else:
        quote["conversion_available"] = False
        return quote

    quote["fx_updated_at"] = fx_info.get("updated_at")
    quote["conversion_available"] = True
    quote["price"] = quote["display_price"]
    quote["currency"] = quote["display_currency"]
    return quote


async def _fetch_many_display(configs: List[dict], target: str = "EUR") -> tuple[List[dict], Optional[dict]]:
    """Fetch quotes and enrich each with display fields in the target currency.

    Returns (quotes, fx_info). `fx_info` is fetched once per call so all
    conversions share the same FX rate + timestamp.
    """
    target = (target or "EUR").upper()
    quotes = await _fetch_many(configs)
    # FX is needed whenever any quote's native currency differs from the target
    # and it is not an index/fx pair.
    needs_fx = any(
        q.get("original_currency") in ("USD", "EUR")
        and q.get("original_currency") != target
        and q.get("asset_class") not in ("index", "fx")
        for q in quotes
    )
    fx_info = await _get_usd_to_eur() if needs_fx else None
    for q in quotes:
        _apply_display_currency(q, target=target, fx_info=fx_info)
    return quotes, fx_info


def _normalise_target_currency(raw: Optional[str]) -> str:
    """Constrain the query-string display currency to EUR | USD."""
    value = (raw or "EUR").upper()
    return value if value in {"EUR", "USD"} else "EUR"


def _find_cfg(symbol: str) -> Optional[dict]:
    up = symbol.upper()
    for pool in (MARKET_INDEX_SYMBOLS, MARKET_COMMODITY_SYMBOLS, MARKET_FX_SYMBOLS, MARKET_STOCK_SYMBOLS):
        for c in pool:
            if c["symbol"] == up:
                return c
    return None


async def market_overview(display_currency: Optional[str] = None):
    """Overview: DAX, S&P 500, Nasdaq, Dow, Gold, Silver, Oil, EUR/USD.

    `display_currency=EUR|USD` (default EUR) controls the currency for stocks
    and commodities. Indices remain unitless ('Punkte'), FX pairs stay as rates.
    """
    target = _normalise_target_currency(display_currency)
    indices, _ = await _fetch_many_display(MARKET_INDEX_SYMBOLS, target=target)
    commodities, fx_info = await _fetch_many_display(MARKET_COMMODITY_SYMBOLS, target=target)
    fx, _ = await _fetch_many_display(MARKET_FX_SYMBOLS, target=target)
    all_quotes = indices + commodities + fx
    latest = max((q["last_updated"] for q in all_quotes), default=_now_utc().isoformat())
    sources = {q["data_source"] for q in all_quotes}
    return {
        "indices": indices,
        "commodities": commodities,
        "fx": fx,
        "last_updated": latest,
        "is_delayed": True,
        # Session 80.29e: yfinance ist der primäre Provider für Indizes/Futures/FX
        # und benötigt keinen Key. Wir zählen "configured" sobald mindestens ein
        # Quote von einem echten Provider (nicht `fallback`/`unavailable`) kam.
        "provider_configured": bool(ALPHA_VANTAGE_KEY) or any(s in {"yfinance", "alpha_vantage", "cache"} for s in sources),
        "data_source_summary": sorted(sources),
        "display_currency": target,
        "fx_usd_to_eur": fx_info,
    }


async def market_stocks(display_currency: Optional[str] = None):
    target = _normalise_target_currency(display_currency)
    quotes, fx_info = await _fetch_many_display(MARKET_STOCK_SYMBOLS, target=target)
    latest = max((q["last_updated"] for q in quotes), default=_now_utc().isoformat())
    return {
        "items": quotes,
        "last_updated": latest,
        "is_delayed": True,
        "provider_configured": bool(ALPHA_VANTAGE_KEY),
        "display_currency": target,
        "fx_usd_to_eur": fx_info,
    }


async def market_indices(display_currency: Optional[str] = None):
    target = _normalise_target_currency(display_currency)
    quotes, _ = await _fetch_many_display(MARKET_INDEX_SYMBOLS, target=target)
    return {"items": quotes, "last_updated": max((q["last_updated"] for q in quotes), default=_now_utc().isoformat()), "is_delayed": True}


async def market_commodities(display_currency: Optional[str] = None):
    target = _normalise_target_currency(display_currency)
    quotes, fx_info = await _fetch_many_display(MARKET_COMMODITY_SYMBOLS, target=target)
    return {"items": quotes, "last_updated": max((q["last_updated"] for q in quotes), default=_now_utc().isoformat()), "is_delayed": True, "fx_usd_to_eur": fx_info}


async def market_fx(display_currency: Optional[str] = None):
    target = _normalise_target_currency(display_currency)
    quotes, _ = await _fetch_many_display(MARKET_FX_SYMBOLS, target=target)
    return {"items": quotes, "last_updated": max((q["last_updated"] for q in quotes), default=_now_utc().isoformat()), "is_delayed": True}


async def market_quote(symbol: str, display_currency: Optional[str] = None):
    cfg = _find_cfg(symbol)
    if not cfg:
        raise HTTPException(404, detail=f"Unbekanntes Symbol: {symbol}")
    target = _normalise_target_currency(display_currency)
    q = await _fetch_quote(cfg)
    fx_info = None
    original_ccy = q.get("original_currency")
    if (original_ccy in ("USD", "EUR") and original_ccy != target
            and q.get("asset_class") not in ("index", "fx")):
        fx_info = await _get_usd_to_eur()
    _apply_display_currency(q, target=target, fx_info=fx_info)
    return q


async def market_quotes(symbols: str, display_currency: Optional[str] = None):
    """Batch quote fetch. `symbols` is a comma-separated list of internal symbols."""
    wanted = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    configs = [_find_cfg(s) for s in wanted]
    known = [c for c in configs if c]
    target = _normalise_target_currency(display_currency)
    items, fx_info = await _fetch_many_display(known, target=target)
    return {
        "items": items,
        "unknown": [w for w, c in zip(wanted, configs) if not c],
        "last_updated": max((q["last_updated"] for q in items), default=_now_utc().isoformat()),
        "is_delayed": True,
        "display_currency": target,
        "fx_usd_to_eur": fx_info,
    }


# ---------------------------------------------------------------------------
# Watchlist + Symbol Search + Sparklines (Phase 2b)
# ---------------------------------------------------------------------------

# Curated static universe used as (a) symbol-search fallback and (b) source of
# truth for asset_type / display_name when the user adds a symbol we already
# know about. Any provider (Alpha Vantage SYMBOL_SEARCH) response is merged
# with this list — never replaced by it.
_CURATED_UNIVERSE = [
    # --- Indices (via ETF proxy) ---
    {"symbol": "DAX",  "name": "DAX",              "asset_type": "index", "region": "DE"},
    {"symbol": "SPX",  "name": "S&P 500",          "asset_type": "index", "region": "US"},
    {"symbol": "NDX",  "name": "Nasdaq 100",       "asset_type": "index", "region": "US"},
    {"symbol": "DJI",  "name": "Dow Jones",        "asset_type": "index", "region": "US"},
    # --- Commodities / FX ---
    {"symbol": "GOLD",   "name": "Gold",           "asset_type": "commodity", "region": "GL"},
    {"symbol": "SILVER", "name": "Silber",         "asset_type": "commodity", "region": "GL"},
    {"symbol": "OIL",    "name": "Brent Öl",       "asset_type": "commodity", "region": "GL"},
    {"symbol": "EURUSD", "name": "EUR/USD",        "asset_type": "fx",        "region": "GL"},
    # --- German blue chips (kuratiert für Fröhlich) ---
    {"symbol": "SAP",     "name": "SAP",           "asset_type": "stock", "region": "DE"},
    {"symbol": "SIE",     "name": "Siemens",       "asset_type": "stock", "region": "DE"},
    {"symbol": "ALV",     "name": "Allianz",       "asset_type": "stock", "region": "DE"},
    {"symbol": "DBK",     "name": "Deutsche Bank", "asset_type": "stock", "region": "DE"},
    {"symbol": "IFX",     "name": "Infineon",      "asset_type": "stock", "region": "DE"},
    {"symbol": "RHM",     "name": "Rheinmetall",   "asset_type": "stock", "region": "DE"},
    {"symbol": "VOW3.DE", "name": "Volkswagen VZ", "asset_type": "stock", "region": "DE"},
    {"symbol": "BAS.DE",  "name": "BASF",          "asset_type": "stock", "region": "DE"},
    {"symbol": "ADS.DE",  "name": "Adidas",        "asset_type": "stock", "region": "DE"},
    {"symbol": "DTE.DE",  "name": "Deutsche Telekom", "asset_type": "stock", "region": "DE"},
    {"symbol": "MRK.DE",  "name": "Merck KGaA",    "asset_type": "stock", "region": "DE"},
    {"symbol": "BMW.DE",  "name": "BMW",           "asset_type": "stock", "region": "DE"},
    {"symbol": "MBG.DE",  "name": "Mercedes-Benz Group", "asset_type": "stock", "region": "DE"},
    {"symbol": "AIR.DE",  "name": "Airbus",        "asset_type": "stock", "region": "DE"},
    # --- US mega caps ---
    {"symbol": "AAPL",  "name": "Apple",           "asset_type": "stock", "region": "US"},
    {"symbol": "MSFT",  "name": "Microsoft",       "asset_type": "stock", "region": "US"},
    {"symbol": "GOOGL", "name": "Alphabet",        "asset_type": "stock", "region": "US"},
    {"symbol": "AMZN",  "name": "Amazon",          "asset_type": "stock", "region": "US"},
    {"symbol": "NVDA",  "name": "NVIDIA",          "asset_type": "stock", "region": "US"},
    {"symbol": "TSLA",  "name": "Tesla",           "asset_type": "stock", "region": "US"},
    {"symbol": "META",  "name": "Meta Platforms",  "asset_type": "stock", "region": "US"},
    {"symbol": "NFLX",  "name": "Netflix",         "asset_type": "stock", "region": "US"},
    {"symbol": "AMD",   "name": "AMD",             "asset_type": "stock", "region": "US"},
    {"symbol": "INTC",  "name": "Intel",           "asset_type": "stock", "region": "US"},
    {"symbol": "JPM",   "name": "JPMorgan Chase",  "asset_type": "stock", "region": "US"},
    {"symbol": "V",     "name": "Visa",            "asset_type": "stock", "region": "US"},
    {"symbol": "MA",    "name": "Mastercard",      "asset_type": "stock", "region": "US"},
    {"symbol": "KO",    "name": "Coca-Cola",       "asset_type": "stock", "region": "US"},
    {"symbol": "PEP",   "name": "PepsiCo",         "asset_type": "stock", "region": "US"},
    {"symbol": "MCD",   "name": "McDonald's",      "asset_type": "stock", "region": "US"},
    {"symbol": "DIS",   "name": "Disney",          "asset_type": "stock", "region": "US"},
    {"symbol": "PFE",   "name": "Pfizer",          "asset_type": "stock", "region": "US"},
    {"symbol": "JNJ",   "name": "Johnson & Johnson", "asset_type": "stock", "region": "US"},
    {"symbol": "XOM",   "name": "ExxonMobil",      "asset_type": "stock", "region": "US"},
    {"symbol": "BRK.B", "name": "Berkshire Hathaway", "asset_type": "stock", "region": "US"},
    # --- ETFs ---
    {"symbol": "SPY",  "name": "SPDR S&P 500 ETF", "asset_type": "etf", "region": "US"},
    {"symbol": "QQQ",  "name": "Invesco QQQ",     "asset_type": "etf", "region": "US"},
    {"symbol": "IWDA.DE", "name": "iShares Core MSCI World", "asset_type": "etf", "region": "DE"},
    {"symbol": "EUNL.DE", "name": "iShares Core MSCI World UCITS", "asset_type": "etf", "region": "DE"},
    {"symbol": "VWCE.DE", "name": "Vanguard FTSE All-World", "asset_type": "etf", "region": "DE"},
]
_UNIVERSE_BY_SYMBOL = {u["symbol"].upper(): u for u in _CURATED_UNIVERSE}

_ALLOWED_ASSET_TYPES = {"stock", "index", "commodity", "fx", "etf", "fund", "bond", "other"}

# --- models ---------------------------------------------------------------

class WatchlistAddInput(BaseModel):
    symbol: str = Field(min_length=1, max_length=20)
    display_name: Optional[str] = Field(default=None, max_length=80)
    asset_type: Optional[str] = None


class WatchlistReorderInput(BaseModel):
    symbols: List[str] = Field(min_length=0, max_length=200)


def _clean_symbol(raw: str) -> str:
    return re.sub(r"[^A-Za-z0-9.\-_/]", "", str(raw or "")).upper()[:20]


def _watchlist_out(doc: dict, quote: Optional[dict] = None) -> dict:
    return {
        "id": str(doc["_id"]),
        "symbol": doc["symbol"],
        "asset_type": doc.get("asset_type", "stock"),
        "display_name": doc.get("display_name") or doc["symbol"],
        "sort_order": int(doc.get("sort_order", 0)),
        "created_at": doc["created_at"].isoformat() if isinstance(doc.get("created_at"), datetime) else str(doc.get("created_at") or ""),
        "quote": quote,
    }


@api.get("/watchlist")
async def watchlist_list(display_currency: Optional[str] = None, user: dict = Depends(get_current_user)):
    """List the current user's watchlist enriched with live quotes when available.

    Unknown symbols (added via search but not part of the known universe) get a
    `quote=None` payload — the FE renders them as neutral rows.
    """
    target = _normalise_target_currency(display_currency)
    docs = await db.watchlists.find({"user_id": str(user["id"])}).sort([("sort_order", 1), ("created_at", 1)]).to_list(200)
    known = []
    unknown_docs = []
    for d in docs:
        cfg = _find_cfg(d["symbol"]) or _UNIVERSE_BY_SYMBOL.get(d["symbol"])
        if cfg and _find_cfg(d["symbol"]):
            known.append((d, cfg))
        else:
            unknown_docs.append(d)

    quotes_by_symbol = {}
    fx_info = None
    if known:
        cfgs = [c for _, c in known]
        quotes, fx_info = await _fetch_many_display(cfgs, target=target)
        quotes_by_symbol = {q["symbol"]: q for q in quotes}

    items = [_watchlist_out(d, quotes_by_symbol.get(d["symbol"])) for d, _ in known]
    items += [_watchlist_out(d, None) for d in unknown_docs]
    # Preserve stored order after quote enrichment
    items.sort(key=lambda x: (x["sort_order"], x["created_at"]))
    return {
        "items": items,
        "count": len(items),
        "provider_configured": bool(ALPHA_VANTAGE_KEY),
        "display_currency": target,
        "fx_usd_to_eur": fx_info,
    }


@api.post("/watchlist", status_code=201)
async def watchlist_add(payload: WatchlistAddInput, user: dict = Depends(get_current_user)):
    symbol = _clean_symbol(payload.symbol)
    if not symbol:
        raise HTTPException(400, detail="Ungültiges Symbol.")

    curated = _UNIVERSE_BY_SYMBOL.get(symbol)
    asset_type = (payload.asset_type or (curated["asset_type"] if curated else "stock")).lower()
    if asset_type not in _ALLOWED_ASSET_TYPES:
        raise HTTPException(400, detail=f"Unbekannter Asset-Typ: {asset_type}")
    display_name = (payload.display_name or (curated["name"] if curated else symbol))[:80]

    max_order_doc = await db.watchlists.find_one(
        {"user_id": str(user["id"])},
        sort=[("sort_order", -1)],
    )
    next_order = (max_order_doc["sort_order"] + 1) if max_order_doc else 0

    doc = {
        "user_id": str(user["id"]),
        "symbol": symbol,
        "asset_type": asset_type,
        "display_name": display_name,
        "created_at": _now_utc(),
        "sort_order": next_order,
    }
    try:
        result = await db.watchlists.insert_one(doc)
    except Exception:  # noqa: BLE001 — duplicate key etc.
        existing = await db.watchlists.find_one({"user_id": str(user["id"]), "symbol": symbol})
        if existing:
            return _watchlist_out(existing)
        raise
    doc["_id"] = result.inserted_id
    return _watchlist_out(doc)


@api.delete("/watchlist/{symbol}")
async def watchlist_remove(symbol: str, user: dict = Depends(get_current_user)):
    sym = _clean_symbol(symbol)
    res = await db.watchlists.delete_one({"user_id": str(user["id"]), "symbol": sym})
    if res.deleted_count == 0:
        raise HTTPException(404, detail="Symbol nicht in der Watchlist.")
    return {"ok": True, "symbol": sym}


@api.put("/watchlist/order")
async def watchlist_reorder(payload: WatchlistReorderInput, user: dict = Depends(get_current_user)):
    """Reorder the caller's watchlist. Symbols not present are ignored;
    missing symbols keep their existing sort_order after the provided list."""
    ordered = [_clean_symbol(s) for s in payload.symbols if _clean_symbol(s)]
    user_id = str(user["id"])
    for idx, sym in enumerate(ordered):
        await db.watchlists.update_one(
            {"user_id": user_id, "symbol": sym},
            {"$set": {"sort_order": idx}},
        )
    return {"ok": True, "reordered": len(ordered)}


@api.get("/watchlist/search")
async def watchlist_search(q: str = "", limit: int = 12, user: dict = Depends(get_current_user)):
    """Symbol search. Prefers Alpha-Vantage SYMBOL_SEARCH when a key is set,
    always augmented with matches from the curated universe."""
    del user  # auth-only; user identity not needed for the search itself
    query = (q or "").strip()
    if not query:
        return {"items": [], "source": "empty"}

    q_upper = query.upper()
    curated_hits = [
        u for u in _CURATED_UNIVERSE
        if q_upper in u["symbol"].upper() or query.lower() in u["name"].lower()
    ][:limit]

    provider_hits: List[dict] = []
    if ALPHA_VANTAGE_KEY:
        data = await _av_call({"function": "SYMBOL_SEARCH", "keywords": query})
        for m in (data or {}).get("bestMatches", [])[:limit]:
            symbol = _clean_symbol(m.get("1. symbol", ""))
            if not symbol:
                continue
            provider_hits.append({
                "symbol": symbol,
                "name": m.get("2. name") or symbol,
                "asset_type": (m.get("3. type") or "stock").lower(),
                "region": m.get("4. region") or "",
                "source": "alpha_vantage",
            })

    # Merge — curated first, then provider entries whose symbol isn't already there
    seen = {u["symbol"] for u in curated_hits}
    merged = [{**u, "source": "curated"} for u in curated_hits]
    for m in provider_hits:
        if m["symbol"] in seen:
            continue
        seen.add(m["symbol"])
        merged.append(m)

    return {
        "items": merged[:limit],
        "source": "alpha_vantage" if provider_hits else "curated",
        "provider_configured": bool(ALPHA_VANTAGE_KEY),
    }


# --- Sparklines ------------------------------------------------------------

# Only the four flagship indices (per Phase 2b scope). Any other symbol
# returns a deterministic synthetic fallback so charts never break.
_SPARKLINE_SUPPORTED = {"DAX", "SPX", "NDX", "DJI"}
_SPARKLINE_TTL_S = 900   # 15 min per user requirement
_SPARKLINE_POINTS = 24   # ~1 trading day at hourly resolution


def _synthetic_sparkline(cfg: dict, seed_price: float) -> List[dict]:
    """Deterministic synthetic sparkline based on the fallback/current price.
    Used when the provider is unavailable. Marked upstream via data_source."""
    rnd = random.Random(hash(cfg["symbol"]) & 0xFFFFFFFF)
    points: List[dict] = []
    price = seed_price
    base_iso = _now_utc() - timedelta(hours=_SPARKLINE_POINTS)
    for i in range(_SPARKLINE_POINTS):
        drift = (rnd.random() - 0.5) * (seed_price * 0.006)
        price = max(seed_price * 0.985, min(seed_price * 1.015, price + drift))
        points.append({
            "t": (base_iso + timedelta(hours=i)).isoformat(),
            "c": round(price, 4),
        })
    return points


def _parse_intraday(data: dict) -> Optional[List[dict]]:
    ts_key = next((k for k in (data or {}) if k.startswith("Time Series")), None)
    if not ts_key:
        return None
    series = data[ts_key]
    pts: List[dict] = []
    for ts_iso, row in sorted(series.items())[-_SPARKLINE_POINTS:]:
        try:
            pts.append({"t": ts_iso, "c": float(row.get("4. close") or row.get("4. Close") or 0.0)})
        except (TypeError, ValueError):
            continue
    return pts if len(pts) >= 2 else None


async def market_sparkline(symbol: str):
    sym = _clean_symbol(symbol)
    if sym not in _SPARKLINE_SUPPORTED:
        raise HTTPException(404, detail=f"Sparkline nicht verfügbar für {sym}.")
    cfg = _find_cfg(sym)
    if not cfg:
        raise HTTPException(404, detail=f"Symbol {sym} nicht gefunden.")

    # cache lookup
    cached = await db.sparkline_cache.find_one({"symbol": sym})
    if cached and cached.get("expires_at") and cached["expires_at"] > _now_utc():
        return {
            "symbol": sym,
            "name": cfg["name"],
            "interval": "60min",
            "points": cached["points"],
            "prev_close": cached.get("prev_close"),
            "data_source": cached.get("data_source", "cache"),
            "cached_until": cached["expires_at"].isoformat(),
            "provider_configured": bool(ALPHA_VANTAGE_KEY),
        }

    source = "fallback"
    points: Optional[List[dict]] = None
    if ALPHA_VANTAGE_KEY and cfg.get("av_symbol"):
        data = await _av_call({
            "function": "TIME_SERIES_INTRADAY",
            "symbol": cfg["av_symbol"],
            "interval": "60min",
            "outputsize": "compact",
        })
        points = _parse_intraday(data) if data else None
        if points:
            source = "alpha_vantage"

    if not points:
        # deterministic fallback based on current fallback price
        seed = _FALLBACK_QUOTES.get(sym, {}).get("price", 100.0)
        points = _synthetic_sparkline(cfg, seed)

    prev_close = round(points[0]["c"], 4) if points else None
    expires_at = _now_utc() + timedelta(seconds=_SPARKLINE_TTL_S)
    await db.sparkline_cache.update_one(
        {"symbol": sym},
        {"$set": {
            "symbol": sym,
            "points": points,
            "prev_close": prev_close,
            "data_source": source,
            "cached_at": _now_utc(),
            "expires_at": expires_at,
        }},
        upsert=True,
    )
    return {
        "symbol": sym,
        "name": cfg["name"],
        "interval": "60min",
        "points": points,
        "prev_close": prev_close,
        "data_source": source,
        "cached_until": expires_at.isoformat(),
        "provider_configured": bool(ALPHA_VANTAGE_KEY),
    }


# ---------------------------------------------------------------------------
# Symbol-News (Phase 2c) — Alpha Vantage NEWS_SENTIMENT with 30-min cache
# ---------------------------------------------------------------------------
# We prefer AV NEWS_SENTIMENT when a key is present. Without a key the
# endpoint returns an EMPTY items list plus a hint — we deliberately do NOT
# fabricate news so users never see fake headlines as if they were real.

_NEWS_TTL_S = 1800  # 30 min per symbol per user spec
_NEWS_LIMIT = 3     # up to 3 items per symbol
_NEWS_BATCH_MAX = 25

# For non-stock symbols we fall back to AV's `topics` parameter — mapped
# per our internal symbol so the news are thematically on-target.
_NEWS_TOPIC_MAP = {
    "DAX":    "economy_macro",
    "SPX":    "economy_macro",
    "NDX":    "technology",
    "DJI":    "economy_macro",
    "GOLD":   "financial_markets",
    "SILVER": "financial_markets",
    "OIL":    "energy_transportation",
    "EURUSD": "economy_monetary",
}


def _news_item_out(node: dict, category_hint: Optional[str] = None) -> dict:
    """Normalise an Alpha-Vantage NEWS_SENTIMENT `feed` entry."""
    ts_raw = node.get("time_published") or ""
    ts_iso: Optional[str] = None
    if ts_raw and len(ts_raw) >= 8:
        try:
            # Format: 20260821T134500 → ISO
            ts = datetime.strptime(ts_raw[:15], "%Y%m%dT%H%M%S").replace(tzinfo=timezone.utc)
            ts_iso = ts.isoformat()
        except ValueError:
            ts_iso = None
    summary = (node.get("summary") or "").strip()
    if len(summary) > 320:
        summary = summary[:317].rstrip() + "…"
    topics = node.get("topics") or []
    category = category_hint
    if not category and topics:
        category = str(topics[0].get("topic") or "").replace("_", " ").title()
    return {
        "title": (node.get("title") or "").strip()[:220],
        "source": (node.get("source") or "").strip()[:80],
        "published_at": ts_iso,
        "summary": summary,
        "url": (node.get("url") or "").strip(),
        "category": category or "Wirtschaft",
    }


async def _fetch_symbol_news(sym: str) -> dict:
    """Cache-then-provider, returning {items, data_source, ...}. No fabricated
    news — when the provider is unavailable, `items` is an empty list."""
    cached = await db.symbol_news_cache.find_one({"symbol": sym})
    if cached and cached.get("expires_at") and cached["expires_at"] > _now_utc():
        return {
            "symbol": sym,
            "items": cached.get("items", []),
            "data_source": cached.get("data_source", "cache"),
            "cached_until": cached["expires_at"].isoformat(),
        }

    items: List[dict] = []
    data_source = "empty"
    if ALPHA_VANTAGE_KEY:
        cfg = _find_cfg(sym) or _UNIVERSE_BY_SYMBOL.get(sym)
        params: Optional[dict] = None
        if cfg and cfg.get("av_symbol") and cfg.get("asset_type", "stock") not in {"index", "commodity", "fx"}:
            # Stock/ETF → ticker-based
            params = {"function": "NEWS_SENTIMENT", "tickers": cfg["av_symbol"], "limit": str(_NEWS_LIMIT * 3), "sort": "LATEST"}
        else:
            topic = _NEWS_TOPIC_MAP.get(sym, "financial_markets")
            params = {"function": "NEWS_SENTIMENT", "topics": topic, "limit": str(_NEWS_LIMIT * 3), "sort": "LATEST"}
        data = await _av_call(params)
        feed = (data or {}).get("feed") or []
        # De-duplicate by title
        seen_titles: set = set()
        for node in feed:
            title = (node.get("title") or "").strip().lower()
            if not title or title in seen_titles:
                continue
            seen_titles.add(title)
            items.append(_news_item_out(node))
            if len(items) >= _NEWS_LIMIT:
                break
        data_source = "alpha_vantage" if items else "empty"

    expires_at = _now_utc() + timedelta(seconds=_NEWS_TTL_S)
    await db.symbol_news_cache.update_one(
        {"symbol": sym},
        {"$set": {
            "symbol": sym,
            "items": items,
            "data_source": data_source,
            "cached_at": _now_utc(),
            "expires_at": expires_at,
        }},
        upsert=True,
    )
    return {
        "symbol": sym,
        "items": items,
        "data_source": data_source,
        "cached_until": expires_at.isoformat(),
    }


async def symbol_news(symbol: str):
    sym = _clean_symbol(symbol)
    if not sym:
        raise HTTPException(400, detail="Ungültiges Symbol.")
    result = await _fetch_symbol_news(sym)
    result["provider_configured"] = bool(ALPHA_VANTAGE_KEY)
    result["empty_reason"] = None
    if not result["items"]:
        result["empty_reason"] = "no_provider" if not ALPHA_VANTAGE_KEY else "no_matches"
    return result


async def symbol_news_batch(symbols: str):
    """Batch endpoint used by WatchlistPage. Symbols are fetched sequentially
    from cache first; provider calls only fire for cache-misses. This keeps
    Alpha-Vantage traffic bounded regardless of watchlist size."""
    wanted = [_clean_symbol(s) for s in (symbols or "").split(",") if _clean_symbol(s)][:_NEWS_BATCH_MAX]
    out: dict = {}
    for sym in wanted:
        out[sym] = await _fetch_symbol_news(sym)
    return {
        "by_symbol": out,
        "provider_configured": bool(ALPHA_VANTAGE_KEY),
        "requested": wanted,
    }


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index("identifier")
    await db.banks.create_index("slug", unique=True)
    await db.savings_offers.create_index([("bank_slug", 1), ("product_type", 1)])
    await db.news.create_index("slug", unique=True)
    await db.news.create_index([("published_at", -1)])
    # Product-Inquiry-E-Mail-Idempotenz (Session 74.9): atomare Reservierung
    # via UNIQUE-Index auf lead_id + TTL nach 30 Tagen (Auto-Cleanup).
    await db[PI_EMAIL_IDEMPOTENCY].create_index("lead_id", unique=True)
    await db[PI_EMAIL_IDEMPOTENCY].create_index("created_at", expireAfterSeconds=60 * 60 * 24 * 30)
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
    await db.market_quotes_cache.create_index("symbol", unique=True)
    await db.market_quotes_cache.create_index("expires_at", expireAfterSeconds=0)
    await db.watchlists.create_index([("user_id", 1), ("symbol", 1)], unique=True)
    await db.watchlists.create_index([("user_id", 1), ("sort_order", 1)])
    await db.sparkline_cache.create_index("symbol", unique=True)
    await db.sparkline_cache.create_index("expires_at", expireAfterSeconds=0)
    await db.symbol_news_cache.create_index("symbol", unique=True)
    await db.symbol_news_cache.create_index("expires_at", expireAfterSeconds=0)
    await seed_admin()
    await seed_content()
    # Session 80.11: idempotenter Reviews-Snapshot-Import — sorgt dafür, dass
    # frisch deployte Production-DBs die kuratierten Kundenstimmen erhalten.
    try:
        from reviews_seed_loader import seed_reviews_from_snapshot
        await seed_reviews_from_snapshot(db)
    except Exception as exc:
        logger.warning("reviews_seed startup failed: %s", exc)
    logger.info("Startup complete")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# ---------------------------------------------------------------------------
# CORS + mount
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------

# Import the news provider abstraction at the very end so both files can
# coexist without circular imports.
from news_provider import active_provider as _news_provider, CATEGORIES as _NEWS_CATEGORIES, MongoNewsProvider as _MongoNewsProvider  # noqa: E402
from einordnung import register as _register_einordnung, seed_einordnung as _seed_einordnung  # noqa: E402
from news_synthesizer import (
    fetch_feeds as _news_fetch_feeds,
    synthesize_pending as _news_synthesize,
    purge_demo_articles as _news_purge_demo,
    _extract_entities as _news_extract_entities,
    _title_similarity as _news_title_similarity,
)  # noqa: E402
from news_alert import evaluate_and_alert as _news_evaluate_alert  # noqa: E402
from weekly_digest import register as _register_weekly_digest  # noqa: E402
_register_weekly_digest(api, db, _send_email_via_emergent, require_admin)
from alerts import register as _register_alerts, ensure_indexes as _alerts_ensure_indexes  # noqa: E402
from investment_topics import register as _register_investment_topics, seed_investment_topics as _seed_investment_topics  # noqa: E402

# Inject the Mongo handle into the news provider so it can serve articles.
_MongoNewsProvider.set_db(db)


async def _admin_fetch_feeds(trigger: Optional[str] = None, _user: dict = Depends(require_admin)):
    valid = {"15min_cron", "hourly_cron", "post_deploy", "manual"}
    src = trigger if trigger in valid else "manual"
    stats = await _news_fetch_feeds(db, trigger_source=src)
    # Two-Strike-Freshness-Alarm auswerten — DARF Pipeline nicht blockieren.
    try:
        await _news_evaluate_alert(db, _send_email_via_emergent)
    except Exception:  # noqa: BLE001
        logger.exception("news_alert evaluate failed (fetch)")
    return stats


async def _admin_synthesize(_user: dict = Depends(require_admin), max_articles: int = 25):
    stats = await _news_synthesize(db, max_articles=max(1, min(50, max_articles)))
    try:
        await _news_evaluate_alert(db, _send_email_via_emergent)
    except Exception:  # noqa: BLE001
        logger.exception("news_alert evaluate failed (synthesize)")
    return stats


async def _admin_news_list(_user: dict = Depends(require_admin), status: Optional[str] = None, limit: int = 50):
    query = {}
    if status:
        query["status"] = status
    docs = await db.news_articles.find(query).sort([("generated_at", -1)]).limit(min(200, max(1, limit))).to_list(200)
    return {"total": await db.news_articles.count_documents(query),
            "items": [{**{k: v for k, v in d.items() if k != "_id"}, "id": str(d.get("_id"))} for d in docs]}


# Session 75.3 — periodischer Image-Sweep (revalidiert publizierte image_urls,
# markiert defekte Links, damit der SafeNewsImage-Fallback greift).
from news_image_sweep import validate_published_news_images as _news_image_sweep_run  # noqa: E402


async def _admin_news_image_sweep(_user: dict = Depends(require_admin), limit: Optional[int] = None):
    return await _news_image_sweep_run(db, limit=limit)

_register_einordnung(api, db)

# --- Investment-Topic-Funnel (Themen-Teaser + Lead-Aufnahme) --------------
_register_investment_topics(api, db, _send_email_via_emergent, require_admin)


@app.on_event("startup")
async def _investment_topics_startup() -> None:
    try:
        inserted = await _seed_investment_topics(db)
        if inserted:
            logger.info("investment_topics: seeded %d topic(s)", inserted)
    except Exception:  # noqa: BLE001
        logger.exception("investment_topics seed failed")

# --- Price alerts (Watchlist-scoped, 15-min cron, Resend-Mail) ------------
_register_alerts(
    api,
    db,
    get_current_user=get_current_user,
    require_admin=require_admin,
    fetch_quote_fn=_fetch_quote,
    find_cfg_fn=_find_cfg,
    send_email_fn=_send_email_via_emergent,
)


@app.on_event("startup")
async def _alerts_startup() -> None:
    try:
        await _alerts_ensure_indexes(db)
    except Exception:  # noqa: BLE001
        logger.exception("alerts index creation failed")


@app.on_event("startup")
async def _einordnung_startup() -> None:
    try:
        inserted = await _seed_einordnung(db)
        if inserted:
            logger.info("einordnung: seeded %d demo posts", inserted)
    except Exception:  # noqa: BLE001
        logger.exception("einordnung startup seed failed")


@app.on_event("startup")
async def _news_purge_startup() -> None:
    """Sicherstellen, dass keine DEMO-Nachrichten im Live-Bestand verbleiben."""
    try:
        removed = await _news_purge_demo(db)
        if removed:
            logger.info("news_synthesizer: purged %d demo articles on startup", removed)
    except Exception:  # noqa: BLE001
        logger.exception("news demo purge failed")


@app.on_event("startup")
async def _news_post_deploy_fetch() -> None:
    """Post-Deploy: einmalig RSS-Feeds ziehen (30s nach Start), damit nicht bis
    zum nächsten Cron gewartet werden muss. Läuft im Hintergrund, blockiert
    den Server-Startup nicht. Guard: wenn letzter erfolgreicher Fetch <30 Min
    her ist, überspringen — vermeidet doppelte Läufe bei WatchFiles-Reloads."""
    async def _run():
        try:
            await asyncio.sleep(30)  # kurz warten, damit alles initialisiert ist
            # 30-Min-Guard: wenn letzter erfolgreicher Fetch <30 Min zurückliegt,
            # überspringen. Reduziert unnötige Trigger bei häufigen Backend-Reloads.
            summary = await db.job_summaries.find_one({"_id": "fetch_feeds"})
            last_ok = summary.get("last_success_at") if summary else None
            if isinstance(last_ok, datetime):
                age_min = (datetime.now(timezone.utc) - last_ok).total_seconds() / 60.0
                if age_min < 30:
                    logger.info(
                        "startup fetch skipped: recent successful fetch (%.1f min ago)", age_min,
                    )
                    return
            logger.info("news_post_deploy_fetch: starting one-shot fetch")
            stats = await _news_fetch_feeds(db, trigger_source="post_deploy")
            logger.info("news_post_deploy_fetch: done — %s", stats)
        except Exception:  # noqa: BLE001
            logger.exception("news post-deploy fetch failed")
    asyncio.create_task(_run())


async def _admin_purge_demo(_user: dict = Depends(require_admin)):
    removed = await _news_purge_demo(db)
    return {"removed": removed}


async def _admin_news_status(_user: dict = Depends(require_admin)):
    """Read-only Health-Report für die News-Pipeline. Enthält keine Secrets,
    keine Raw-Feed-Payloads und keine internen Tokens."""
    now = datetime.now(timezone.utc)

    fetch_summary = await db.job_summaries.find_one({"_id": "fetch_feeds"}) or {}
    synth_summary = await db.job_summaries.find_one({"_id": "synthesize_pending"}) or {}
    lock_doc = await db.job_locks.find_one({"_id": "fetch_feeds"})
    lock_active = False
    if lock_doc:
        exp = lock_doc.get("expires_at")
        lock_active = isinstance(exp, datetime) and exp > now

    def _iso(v):
        return v.isoformat() if isinstance(v, datetime) else None

    last_success_at = fetch_summary.get("last_success_at") if fetch_summary else None
    fetch_summary_data = fetch_summary.get("last_summary") if fetch_summary else None
    freshness = "error"
    if isinstance(last_success_at, datetime):
        age_min = (now - last_success_at).total_seconds() / 60.0
        errors_count = 0
        if isinstance(fetch_summary_data, dict):
            errors_count = int(fetch_summary_data.get("errors") or 0)
        if errors_count > 0 and age_min > 60:
            freshness = "error"
        elif age_min <= 120:
            freshness = "fresh"
        else:
            freshness = "stale"

    newest = await db.news_articles.find_one(
        {"status": "published"}, sort=[("published_at", -1)],
        projection={"published_at": 1, "_id": 0},
    )
    newest_at = newest.get("published_at") if newest else None
    articles_24h = await db.news_articles.count_documents(
        {"status": "published", "published_at": {"$gte": now - timedelta(days=1)}}
    )
    articles_7d = await db.news_articles.count_documents(
        {"status": "published", "published_at": {"$gte": now - timedelta(days=7)}}
    )

    # Session 79.1 — Incident-/Eskalations-State additiv aufsurfacen.
    from news_alert import STATE_ID as _ALERT_STATE_ID, ESCALATION_AGE_HOURS as _ESC_HOURS  # noqa: E402
    alert_state = await db.job_summaries.find_one({"_id": _ALERT_STATE_ID}) or {}
    incident_started = alert_state.get("incident_started_at")
    incident_age_min = None
    escalation_due = False
    if isinstance(incident_started, datetime):
        incident_age_min = int((now - incident_started).total_seconds() / 60)
        escalation_due = (
            bool(alert_state.get("alert_active"))
            and incident_age_min >= (_ESC_HOURS * 60)
            and alert_state.get("escalation_sent_at") is None
        )

    return {
        "status": "ok",
        "freshness": freshness,
        "fetch": {
            "last_started_at": _iso(fetch_summary.get("last_started_at")),
            "last_success_at": _iso(last_success_at),
            "last_trigger_source": fetch_summary.get("last_trigger_source"),
            "last_summary": fetch_summary_data,
            "lock_active": bool(lock_active),
        },
        "synthesize": {
            "last_started_at": _iso(synth_summary.get("last_started_at")),
            "last_success_at": _iso(synth_summary.get("last_success_at")),
            "last_summary": synth_summary.get("last_summary"),
        },
        "content": {
            "newest_published_at": _iso(newest_at),
            "articles_last_24h": int(articles_24h),
            "articles_last_7d": int(articles_7d),
        },
        "alert": {
            "active": bool(alert_state.get("alert_active", False)),
            "last_status": alert_state.get("last_status"),
            "incident_started_at": _iso(incident_started),
            "incident_age_minutes": incident_age_min,
            "first_alert_sent_at": _iso(alert_state.get("last_alert_at")),
            "escalation_sent_at": _iso(alert_state.get("escalation_sent_at")),
            "escalation_due": escalation_due,
            "escalation_threshold_hours": _ESC_HOURS,
            "last_escalation_error": alert_state.get("last_escalation_error"),
        },
        "server_time": _iso(now),
    }


# --- Newsletter-Digest (wöchentlich, Mongo-persistiert) --------------------

class _NewsletterSubscribeIn(BaseModel):
    email: EmailStr
    source: Optional[str] = None
    consent: bool = True


@api.post("/newsletter/subscribe", summary="Newsletter-Anmeldung (wöchentlicher Digest)")
async def _newsletter_subscribe(payload: _NewsletterSubscribeIn, request: Request):
    if not payload.consent:
        raise HTTPException(400, detail="Consent required.")
    email = payload.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(400, detail="Ungültige E-Mail-Adresse.")
    now = datetime.now(timezone.utc)
    try:
        client_ip = (request.client.host if request and request.client else "") or ""
    except Exception:
        client_ip = ""
    existing = await db.newsletter_subscribers.find_one({"email": email})
    if existing:
        # Idempotent: bereits eingetragen → 200 + Status
        await db.newsletter_subscribers.update_one(
            {"_id": existing["_id"]},
            {"$set": {"last_seen_at": now.isoformat()},
             "$inc": {"resubmit_count": 1}},
        )
        return {"status": "already_subscribed", "email": email}
    doc = {
        "email": email,
        "source": (payload.source or "unknown")[:64],
        "consent": True,
        "consent_at": now.isoformat(),
        "created_at": now.isoformat(),
        "last_seen_at": now.isoformat(),
        "ip": client_ip[:64],
        "user_agent": (request.headers.get("user-agent") or "")[:200] if request else "",
        "resubmit_count": 0,
        "unsubscribed": False,
    }
    try:
        await db.newsletter_subscribers.insert_one(doc)
    except Exception:  # noqa: BLE001
        logger.exception("newsletter_subscribe insert failed for %s", email[:60])
        raise HTTPException(500, detail="Anmeldung konnte gerade nicht gespeichert werden.")
    logger.info("newsletter_subscribed email_hash=%s source=%s", hashlib.sha256(email.encode()).hexdigest()[:10], doc["source"])
    return {"status": "subscribed", "email": email}


@app.on_event("startup")
async def _newsletter_indexes_startup() -> None:
    try:
        await db.newsletter_subscribers.create_index("email", unique=True)
    except Exception:  # noqa: BLE001
        logger.exception("newsletter index creation failed")



async def news_nachrichten_list(category: Optional[str] = None, source: Optional[str] = None,
                                 investment_topic_slug: Optional[str] = None,
                                 limit: int = 24, skip: int = 0):
    """Public news feed. Serves synthesized editorial articles + RSS-aggregator items
    (Publisher-attributed) from a single pipeline. Supports pagination via skip/limit,
    case-insensitive Publisher filter via `source`, and `investment_topic_slug` filter
    (Session 80.35 — Themen-Landingpages)."""
    limit = max(1, min(int(limit or 24), 60))
    skip = max(0, int(skip or 0))
    src = (source or "").strip() or None
    topic = (investment_topic_slug or "").strip() or None
    items = await _news_provider.list_items(
        category=category, limit=limit, skip=skip, source=src,
        investment_topic_slug=topic,
    )
    total = None
    try:
        total = await _news_provider.count_items(category=category, source=src,
                                                  investment_topic_slug=topic)
    except Exception:  # noqa: BLE001
        total = None
    return {
        "items": items,
        "provider": _news_provider.name,
        "is_demo": _news_provider.is_demo,
        "categories": _NEWS_CATEGORIES,
        "total": total,
        "limit": limit,
        "skip": skip,
        "source": src,
        "investment_topic_slug": topic,
        "has_more": (total or 0) > (skip + len(items)),
        "last_updated": items[0]["published_at"] if items else datetime.now(timezone.utc).isoformat(),
    }


async def news_publishers_list():
    """Liefert alle distinct Publisher-Namen für das Frontend-Dropdown."""
    try:
        publishers = await _news_provider.list_publishers()
    except Exception:  # noqa: BLE001
        publishers = []
    return {"publishers": publishers, "count": len(publishers)}


async def news_nachrichten_detail(slug: str):
    item = await _news_provider.get_item(slug)
    if not item:
        raise HTTPException(404, detail="Nachricht nicht gefunden.")
    return item


async def news_nachrichten_related(slug: str, limit: int = 3):
    """Thematisch verwandte Artikel für die Detailseite.

    Ranking (rein DB-basiert, keine LLM-Calls):
      - gleiche Kategorie: +4
      - je gemeinsame Entity (Person/Firma/Ort/Thema): +5, max +25
      - Titel/Summary Jaccard-Similarity: 0..+5 (round(sim*10))
      - veröffentlicht ≤ 7 Tagen: +2, ≤ 30 Tagen: +1
    Fallback: bei < limit Treffern werden neueste Artikel derselben Kategorie
    (dann kategorie-übergreifend) aufgefüllt. Aktueller Artikel wird immer
    ausgeschlossen. Nur veröffentlichte Artikel mit Volltext (>=250 Wörter)
    werden berücksichtigt.
    """
    limit = max(1, min(int(limit or 3), 6))
    # Slug-Lookup mit Archiv-Fallback (P1: News Retention). Der Related-Pool
    # unten bleibt bewusst Live-only — archivierte Artikel tauchen nie in
    # „ähnlichen Artikeln" auf.
    from news_retention import find_article_by_slug as _find_article
    current = await _find_article(db, slug, include_archive=True)
    if not current:
        return {"items": []}

    cur_ents = _news_extract_entities(current.get("title", ""), current.get("summary", ""))
    cur_cat = current.get("category")
    cur_title = current.get("title", "")
    cur_summary = current.get("summary", "")
    now = datetime.now(timezone.utc)

    # Pool: veröffentlichte Artikel der letzten 60 Tage (ohne aktuellen)
    since = now - timedelta(days=60)
    pool_cursor = db.news_articles.find({
        "slug": {"$ne": slug},
        "is_published": True,
        "status": "published",
        "content_type": {"$ne": "demo"},
        "$or": [{"published_at": {"$gte": since}}, {"generated_at": {"$gte": since}}],
    }).sort([("published_at", -1)]).limit(120)
    pool = await pool_cursor.to_list(120)

    scored: list[tuple[int, dict]] = []
    for doc in pool:
        content = (doc.get("content") or "")
        if len(content.split()) < 250:
            continue  # nur Artikel mit echtem Volltext empfehlen
        score = 0
        if cur_cat and doc.get("category") == cur_cat:
            score += 4
        d_ents = _news_extract_entities(doc.get("title", ""), doc.get("summary", ""))
        overlap = len(cur_ents & d_ents)
        if overlap:
            score += min(overlap * 5, 25)
        sim = _news_title_similarity(
            f"{cur_title} {cur_summary}",
            f"{doc.get('title', '')} {doc.get('summary', '')}",
        )
        score += round(sim * 10)
        pub = doc.get("published_at") or doc.get("generated_at")
        if isinstance(pub, datetime):
            age = (now - pub).total_seconds()
            if age <= 7 * 86400:
                score += 2
            elif age <= 30 * 86400:
                score += 1
        if score > 0:
            scored.append((score, doc))

    # Sortieren: Score desc, dann published_at desc
    scored.sort(key=lambda x: (x[0], x[1].get("published_at") or datetime.min.replace(tzinfo=timezone.utc)),
                reverse=True)
    picked = [d for _, d in scored[:limit]]

    # Fallback 1: gleiche Kategorie, neueste
    if len(picked) < limit and cur_cat:
        picked_slugs = {d["slug"] for d in picked}
        cat_fill_cursor = db.news_articles.find({
            "slug": {"$ne": slug, "$nin": list(picked_slugs)},
            "category": cur_cat,
            "is_published": True,
            "status": "published",
            "content_type": {"$ne": "demo"},
        }).sort([("published_at", -1)]).limit(limit - len(picked) + 3)
        async for d in cat_fill_cursor:
            if len((d.get("content") or "").split()) >= 250:
                picked.append(d)
                if len(picked) >= limit:
                    break

    # Fallback 2: neueste kategorie-übergreifend
    if len(picked) < limit:
        picked_slugs = {d["slug"] for d in picked}
        any_cursor = db.news_articles.find({
            "slug": {"$ne": slug, "$nin": list(picked_slugs)},
            "is_published": True,
            "status": "published",
            "content_type": {"$ne": "demo"},
        }).sort([("published_at", -1)]).limit(limit - len(picked) + 3)
        async for d in any_cursor:
            if len((d.get("content") or "").split()) >= 250:
                picked.append(d)
                if len(picked) >= limit:
                    break

    picked = picked[:limit]

    def _mini(d: dict) -> dict:
        pub = d.get("published_at")
        return {
            "id": str(d.get("_id") or d.get("slug")),
            "slug": d["slug"],
            "title": d.get("title", ""),
            "summary": (d.get("summary") or "")[:280],
            "category": d.get("category"),
            "image_url": d.get("image_url"),
            "published_at": pub.isoformat() if isinstance(pub, datetime) else pub,
        }

    return {"items": [_mini(d) for d in picked]}


# Modular routers — neue Features werden hier registriert statt in server.py inline.
from routes import reports as _reports_routes  # noqa: E402
app.include_router(_reports_routes.router)

# Auth-Routen (Session 78.0 — extrahiert aus server.py)
from routes import auth as _auth_routes  # noqa: E402
app.include_router(_auth_routes.router)

# Stock-Research (Session 78.3 — Admin CRUD + CSV import + public endpoint)
from routes import stock_research as _stock_research_routes  # noqa: E402
app.include_router(_stock_research_routes.router)

# News-Routen (Session 78.4 — extrahiert aus server.py; 33 Endpoints via Shim-Pattern)
from routes import news as _news_routes  # noqa: E402
app.include_router(_news_routes.router)

# Product-Inquiry-Router (Session 78.6 — Stub entfernt, direkt registriert)
from routes import product_inquiry as _product_inquiry_routes  # noqa: E402
app.include_router(_product_inquiry_routes.router)

# Stock-Research Sync-Router (Session 78.7 — Provider-Pipeline)
from routes import stock_research_sync as _sr_sync_routes  # noqa: E402
app.include_router(_sr_sync_routes.router)

# News Retention Archive (P1 — 90-Tage-Retention mit Slug-Fallback auf Archiv).
from routes import news_retention as _news_retention_routes  # noqa: E402
app.include_router(_news_retention_routes.router)

from news_retention import ensure_indexes as _news_retention_ensure_indexes  # noqa: E402


@app.on_event("startup")
async def _news_retention_startup() -> None:
    try:
        info = await _news_retention_ensure_indexes(db)
        logger.info("news_retention: indexes ensured — %s", info)
    except Exception:  # noqa: BLE001
        logger.exception("news_retention index creation failed")


# Social Content Automation (Session 80.0 — LinkedIn Editorial Pipeline)
from routes import social_content as _social_content_routes  # noqa: E402
app.include_router(_social_content_routes.router)
from social_content import ensure_indexes as _social_content_ensure_indexes  # noqa: E402


@app.on_event("startup")
async def _social_content_startup() -> None:
    try:
        await _social_content_ensure_indexes(db)
        logger.info("social_content: indexes ensured")
    except Exception:  # noqa: BLE001
        logger.exception("social_content index creation failed")


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
