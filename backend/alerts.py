"""Price alerts — Watchlist-scoped Kursalarme mit Resend-Mail.

Datenmodell (Mongo `price_alerts`):
    _id, user_id, symbol, direction, target_price, currency, is_active,
    triggered_at, triggered_price, triggered_count, cooldown_until,
    created_at, updated_at

`direction` ∈ {"above", "below", "change_pct"}.
- "above":       triggered wenn Kurs ≥ target_price
- "below":       triggered wenn Kurs ≤ target_price
- "change_pct":  triggered wenn |Tagesbewegung| ≥ target_price (in Prozent)

Nach Auslösung: is_active bleibt true, aber Alert kommt für `COOLDOWN` in
Cooldown, damit er nicht bei jedem 15-Min-Check erneut mailt. User kann
den Alert per DELETE entfernen oder via PATCH is_active=false pausieren.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Awaitable, Callable, List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger("alerts")

router = APIRouter(prefix="/alerts", tags=["alerts"])

VALID_DIRECTIONS = {"above", "below", "change_pct"}
COOLDOWN = timedelta(hours=6)          # kein Re-Mail innerhalb 6 h pro Alert
MAX_ALERTS_PER_USER = 40


# ---------------------------------------------------------------------------
# Pydantic
# ---------------------------------------------------------------------------
class AlertCreate(BaseModel):
    symbol: str = Field(min_length=1, max_length=20)
    direction: str = Field(default="above")
    target_price: float = Field(gt=0)
    currency: Optional[str] = Field(default=None, max_length=8)
    note: Optional[str] = Field(default=None, max_length=200)


class AlertPatch(BaseModel):
    is_active: Optional[bool] = None
    target_price: Optional[float] = Field(default=None, gt=0)
    direction: Optional[str] = None
    note: Optional[str] = Field(default=None, max_length=200)


def _clean_symbol(raw: str) -> str:
    return re.sub(r"[^A-Za-z0-9.\-_/]", "", str(raw or "")).upper()[:20]


def _out(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "symbol": doc["symbol"],
        "direction": doc.get("direction", "above"),
        "target_price": float(doc.get("target_price", 0)),
        "currency": doc.get("currency"),
        "is_active": bool(doc.get("is_active", True)),
        "note": doc.get("note"),
        "triggered_at": (doc.get("triggered_at").isoformat()
                         if isinstance(doc.get("triggered_at"), datetime) else None),
        "triggered_price": doc.get("triggered_price"),
        "triggered_count": int(doc.get("triggered_count", 0)),
        "cooldown_until": (doc.get("cooldown_until").isoformat()
                           if isinstance(doc.get("cooldown_until"), datetime) else None),
        "created_at": (doc.get("created_at").isoformat()
                       if isinstance(doc.get("created_at"), datetime) else None),
    }


# ---------------------------------------------------------------------------
# Trigger-Evaluation
# ---------------------------------------------------------------------------
def _is_triggered(direction: str, target: float, quote: dict) -> tuple[bool, float]:
    """Return (triggered?, matched_price_or_pct)."""
    if direction == "above":
        p = quote.get("price")
        return (p is not None and float(p) >= target, float(p) if p is not None else 0.0)
    if direction == "below":
        p = quote.get("price")
        return (p is not None and float(p) <= target, float(p) if p is not None else 0.0)
    if direction == "change_pct":
        cp = quote.get("change_percent")
        return (cp is not None and abs(float(cp)) >= target, float(cp) if cp is not None else 0.0)
    return False, 0.0


def _mail_html(user_name: str, alert: dict, matched: float, quote: dict) -> str:
    from html import escape
    sym = escape(alert["symbol"])
    direction = alert.get("direction", "above")
    ccy = escape(alert.get("currency") or quote.get("display_currency") or "EUR")
    tgt = alert.get("target_price")
    if direction == "above":
        cond = f"Kurs ist auf oder über <strong>{tgt:g} {ccy}</strong> gestiegen."
        matched_line = f"Aktueller Kurs: <strong>{matched:g} {ccy}</strong>"
    elif direction == "below":
        cond = f"Kurs ist auf oder unter <strong>{tgt:g} {ccy}</strong> gefallen."
        matched_line = f"Aktueller Kurs: <strong>{matched:g} {ccy}</strong>"
    else:  # change_pct
        cond = f"Tagesbewegung hat <strong>±{tgt:g}\u202f%</strong> erreicht."
        matched_line = f"Aktuelle Bewegung: <strong>{matched:+.2f}\u202f%</strong>"
    greet = f"Hallo {escape(user_name or 'zusammen')},"
    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="background:#f5f7fa;padding:32px 0;font-family:Georgia,serif">'
        f'<tr><td align="center"><table role="presentation" width="560" cellpadding="0" '
        f'cellspacing="0" style="background:#ffffff;padding:36px;border:1px solid #e5e7eb">'
        f'<tr><td>'
        f'<p style="margin:0 0 8px;color:#c9a961;font-size:12px;letter-spacing:0.16em;'
        f'text-transform:uppercase">Fröhlich Vermögensberatung · Kursalarm</p>'
        f'<h1 style="margin:0 0 20px;color:#0f1d34;font-size:22px;line-height:1.3">'
        f'Kursalarm ausgelöst: {sym}</h1>'
        f'<p style="margin:0 0 12px;color:#333">{greet}</p>'
        f'<p style="margin:0 0 12px;color:#333;line-height:1.55">'
        f'Ihr Kursalarm für <strong>{sym}</strong> wurde soeben ausgelöst. {cond}</p>'
        f'<p style="margin:0 0 20px;color:#333;line-height:1.55">{matched_line}</p>'
        f'<p style="margin:0 0 24px;color:#666;font-size:12px;line-height:1.55">'
        f'Sie erhalten diese Nachricht, weil Sie in Ihrem Kundenbereich einen Kursalarm hinterlegt '
        f'haben. Diese Benachrichtigung stellt keine Anlageberatung und keine Empfehlung dar.'
        f'</p>'
        f'<p style="margin:0;color:#0f1d34;font-size:12px;line-height:1.55">'
        f'Fröhlich Vermögensberatung GmbH · Ihre persönliche Beratung: '
        f'<a href="mailto:kundenservice@kapital-direkt24.de" style="color:#0f1d34">'
        f'kundenservice@kapital-direkt24.de</a></p>'
        f'</td></tr></table></td></tr></table>'
    )


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------
def register(
    api: APIRouter,
    db,
    *,
    get_current_user: Callable,
    require_admin: Callable,
    fetch_quote_fn: Callable[[dict], Awaitable[dict]],
    find_cfg_fn: Callable[[str], Optional[dict]],
    send_email_fn: Callable[[str, str, str], Awaitable[Optional[str]]],
) -> None:
    """Bind alert endpoints to the main FastAPI router."""

    @api.get("/alerts")
    async def alerts_list(user: dict = Depends(get_current_user)):
        docs = await db.price_alerts.find({"user_id": str(user["id"])}).sort([
            ("is_active", -1), ("created_at", -1),
        ]).to_list(200)
        return {"items": [_out(d) for d in docs], "cooldown_hours": int(COOLDOWN.total_seconds() // 3600)}

    @api.post("/alerts", status_code=201)
    async def alerts_create(payload: AlertCreate, user: dict = Depends(get_current_user)):
        direction = (payload.direction or "above").lower()
        if direction not in VALID_DIRECTIONS:
            raise HTTPException(400, detail=f"direction muss eines von {sorted(VALID_DIRECTIONS)} sein")
        symbol = _clean_symbol(payload.symbol)
        if not symbol:
            raise HTTPException(400, detail="Ungültiges Symbol.")
        # Symbol-Existenzcheck: entweder in curated universe ODER in eigener Watchlist.
        cfg = find_cfg_fn(symbol)
        currency = payload.currency
        if not cfg:
            wl = await db.watchlists.find_one({"user_id": str(user["id"]), "symbol": symbol})
            if not wl:
                raise HTTPException(404, detail=f"Symbol {symbol} ist unbekannt. Fügen Sie es erst der Watchlist hinzu.")
        else:
            currency = currency or cfg.get("currency") or "EUR"
        # Cap Alerts pro User
        cnt = await db.price_alerts.count_documents({"user_id": str(user["id"])})
        if cnt >= MAX_ALERTS_PER_USER:
            raise HTTPException(400, detail=f"Maximal {MAX_ALERTS_PER_USER} Alarme pro Nutzer.")
        # Dup-Check: identischer aktiver Alarm existiert schon?
        dup = await db.price_alerts.find_one({
            "user_id": str(user["id"]),
            "symbol": symbol,
            "direction": direction,
            "target_price": float(payload.target_price),
            "is_active": True,
        })
        if dup:
            return _out(dup)
        now = datetime.now(timezone.utc)
        doc = {
            "user_id": str(user["id"]),
            "symbol": symbol,
            "direction": direction,
            "target_price": float(payload.target_price),
            "currency": currency,
            "note": payload.note,
            "is_active": True,
            "triggered_at": None,
            "triggered_price": None,
            "triggered_count": 0,
            "cooldown_until": None,
            "created_at": now,
            "updated_at": now,
        }
        result = await db.price_alerts.insert_one(doc)
        doc["_id"] = result.inserted_id
        logger.info("alert_created user=%s symbol=%s direction=%s target=%s",
                    user["id"], symbol, direction, payload.target_price)
        return _out(doc)

    @api.patch("/alerts/{alert_id}")
    async def alerts_patch(alert_id: str, payload: AlertPatch, user: dict = Depends(get_current_user)):
        try:
            oid = ObjectId(alert_id)
        except Exception:
            raise HTTPException(400, detail="Ungültige Alert-ID")
        alert = await db.price_alerts.find_one({"_id": oid, "user_id": str(user["id"])})
        if not alert:
            raise HTTPException(404, detail="Alarm nicht gefunden.")
        updates: dict = {"updated_at": datetime.now(timezone.utc)}
        if payload.is_active is not None:
            updates["is_active"] = bool(payload.is_active)
            # Reaktivierung → Cooldown-Reset, damit ein wieder aktivierter Alarm sofort greifen kann.
            if payload.is_active:
                updates["cooldown_until"] = None
        if payload.target_price is not None:
            updates["target_price"] = float(payload.target_price)
            updates["cooldown_until"] = None
        if payload.direction is not None:
            direction = payload.direction.lower()
            if direction not in VALID_DIRECTIONS:
                raise HTTPException(400, detail=f"direction muss eines von {sorted(VALID_DIRECTIONS)} sein")
            updates["direction"] = direction
        if payload.note is not None:
            updates["note"] = payload.note
        await db.price_alerts.update_one({"_id": oid}, {"$set": updates})
        alert = await db.price_alerts.find_one({"_id": oid})
        return _out(alert)

    @api.delete("/alerts/{alert_id}")
    async def alerts_delete(alert_id: str, user: dict = Depends(get_current_user)):
        try:
            oid = ObjectId(alert_id)
        except Exception:
            raise HTTPException(400, detail="Ungültige Alert-ID")
        res = await db.price_alerts.delete_one({"_id": oid, "user_id": str(user["id"])})
        if res.deleted_count == 0:
            raise HTTPException(404, detail="Alarm nicht gefunden.")
        return {"ok": True, "removed": 1}

    # ------------------------------------------------------------------
    # Trigger check — used by /api/alerts/admin/check (cron) AND
    # /api/alerts/check (user, manuelle Prüfung).
    # ------------------------------------------------------------------
    async def _run_check(user_id: Optional[str] = None) -> dict:
        now = datetime.now(timezone.utc)
        query: dict = {"is_active": True}
        if user_id:
            query["user_id"] = user_id
        stats = {"checked": 0, "triggered": 0, "mails_sent": 0, "mail_errors": 0,
                 "cooldown": 0, "unknown_symbol": 0}
        # Sammle einzigartige Symbole zuerst → 1 Quote-Call pro Symbol.
        symbols: dict[str, dict] = {}
        async for a in db.price_alerts.find(query):
            stats["checked"] += 1
            if a.get("cooldown_until") and a["cooldown_until"] > now:
                stats["cooldown"] += 1
                continue
            sym = a["symbol"]
            if sym not in symbols:
                symbols[sym] = {"cfg": find_cfg_fn(sym), "quote": None}
        # Quotes ziehen
        for sym, info in symbols.items():
            cfg = info["cfg"]
            if not cfg:
                info["quote"] = None
                continue
            try:
                info["quote"] = await fetch_quote_fn(cfg)
            except Exception as exc:  # noqa: BLE001
                logger.warning("alerts: quote fetch failed sym=%s err=%s", sym, exc)
                info["quote"] = None
        # Alerts einzeln evaluieren
        triggered_out: list[dict] = []
        async for a in db.price_alerts.find(query):
            if a.get("cooldown_until") and a["cooldown_until"] > now:
                continue
            sym = a["symbol"]
            info = symbols.get(sym) or {}
            quote = info.get("quote")
            if not quote:
                stats["unknown_symbol"] += 1
                continue
            hit, matched = _is_triggered(a.get("direction", "above"), float(a.get("target_price", 0)), quote)
            if not hit:
                continue
            stats["triggered"] += 1
            # Mongo aktualisieren
            await db.price_alerts.update_one({"_id": a["_id"]}, {"$set": {
                "triggered_at": now,
                "triggered_price": matched,
                "cooldown_until": now + COOLDOWN,
                "updated_at": now,
            }, "$inc": {"triggered_count": 1}})
            triggered_out.append({"symbol": sym, "direction": a.get("direction"),
                                   "target_price": float(a.get("target_price", 0)),
                                   "matched": matched, "id": str(a["_id"])})
            # Mail versenden — Empfänger aus users-Collection (user_id ist String,
            # aber Mongo _id ist ObjectId — deshalb Konvertierung mit Fallback).
            u = None
            uid = a.get("user_id")
            try:
                u = await db.users.find_one({"_id": ObjectId(uid)})
            except Exception:
                u = None
            if not u:
                u = await db.users.find_one({"id": uid}) or await db.users.find_one({"_id": uid})
            recipient = (u or {}).get("email") if u else None
            if not recipient:
                logger.warning("alerts: no user email found for alert=%s user=%s", a["_id"], a["user_id"])
                continue
            name = (u or {}).get("name") or ""
            subject = f"Kursalarm ausgelöst: {sym}"
            html = _mail_html(name, {**a, "target_price": float(a["target_price"])}, matched, quote)
            try:
                mail_id = await send_email_fn(recipient, subject, html)
                if mail_id:
                    stats["mails_sent"] += 1
                    logger.info("alert_mail_sent alert=%s user=%s symbol=%s", a["_id"], a["user_id"], sym)
            except Exception as exc:  # noqa: BLE001
                stats["mail_errors"] += 1
                logger.exception("alert_mail_failed alert=%s: %s", a["_id"], exc)
        logger.info("alerts.check_summary %s", stats)
        return {"triggered": triggered_out, **stats}

    @api.post("/alerts/check")
    async def alerts_user_check(user: dict = Depends(get_current_user)):
        """User-initiated ad-hoc check — nur eigene Alerts prüfen."""
        return await _run_check(user_id=str(user["id"]))

    @api.post("/alerts/admin/check-triggers")
    async def alerts_admin_check(_user: dict = Depends(require_admin)):
        """Cron-Endpoint: prüft ALLE aktiven Alerts."""
        return await _run_check(user_id=None)


async def ensure_indexes(db) -> None:
    await db.price_alerts.create_index([("user_id", 1), ("is_active", -1)])
    await db.price_alerts.create_index([("user_id", 1), ("symbol", 1)])
    await db.price_alerts.create_index("cooldown_until", sparse=True)
