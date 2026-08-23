"""Weekly newsletter digest for Fröhlich Vermögensberatung.

Zusammenstellung + Versand jeden Freitag über die vorhandene Cron-Infrastruktur.
Datenquelle: `news_articles` (synthetisierte Fröhlich-Redaktions-Artikel der
vergangenen 7 Tage). Empfänger: `newsletter_subscribers` mit consent=True und
unsubscribed=False. Deduplizierung pro ISO-Woche via Collection
`newsletter_digests`.

Ohne EMERGENT_EMAIL_KEY läuft die Erzeugung durch, der Versand ist ein Dry-Run.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import logging
import os
from datetime import datetime, timedelta, timezone
from html import escape
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

logger = logging.getLogger("weekly_digest")

FROEHLICH_SITE_URL = os.environ.get("FRONTEND_URL", "https://finance-platform-v2.preview.emergentagent.com").rstrip("/")


def _unsubscribe_secret() -> str:
    """Lazy resolve — server.py ruft load_dotenv() vor dem Import. Trotzdem lazy,
    damit spätere Rotation / dynamische ENV-Änderungen ohne Neu-Import greifen."""
    return (
        os.environ.get("NEWSLETTER_UNSUBSCRIBE_SECRET")
        or os.environ.get("JWT_SECRET")
        or "froehlich-dev-secret"
    )

CATEGORY_LABEL = {
    "wirtschaft": "Wirtschaft", "unternehmen": "Unternehmen", "maerkte": "Märkte",
    "zinsen": "Zinsen", "fonds-etfs": "Fonds & ETFs", "europa": "Europa",
    "welt": "Welt", "politik": "Politik", "rohstoffe": "Rohstoffe",
    "energie": "Energie", "technologie": "Technologie", "industrie": "Industrie",
    "waehrungen": "Währungen", "klima": "Klima", "mobilitaet": "Mobilität",
    "gesundheit": "Gesundheit", "sicherheit": "Sicherheit", "wissen": "Wissen",
}


# ---------------------------------------------------------------------------
# Unsubscribe-Token
# ---------------------------------------------------------------------------

def _make_unsub_token(email: str) -> str:
    mac = hmac.new(_unsubscribe_secret().encode(), email.lower().encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(mac).decode().rstrip("=")


def verify_unsub_token(email: str, token: str) -> bool:
    if not email or not token:
        return False
    expected = _make_unsub_token(email)
    return hmac.compare_digest(expected, token)


def _unsub_url(email: str) -> str:
    token = _make_unsub_token(email)
    return f"{FROEHLICH_SITE_URL}/api/newsletter/unsubscribe?email={email}&token={token}"


# ---------------------------------------------------------------------------
# HTML-Rendering
# ---------------------------------------------------------------------------

def _pick_articles(docs: list[dict], limit: int = 6) -> list[dict]:
    """Ranking: relevance/is_top_news > published_at. Nur eigene Fröhlich-Artikel."""
    def score(d: dict) -> tuple:
        return (
            1 if d.get("is_top_news") else 0,
            d.get("relevance") or 0,
            d.get("published_at") or datetime.min.replace(tzinfo=timezone.utc),
        )
    ordered = sorted(docs, key=score, reverse=True)
    return ordered[:limit]


def _snippet(text: str, limit: int = 220) -> str:
    if not text:
        return ""
    clean = " ".join(text.split())
    if len(clean) <= limit:
        return clean
    cut = clean[:limit]
    idx = max(cut.rfind(". "), cut.rfind("! "), cut.rfind("? "))
    return (cut[: idx + 1] if idx > 80 else cut) + " …"


def build_digest_html(articles: list[dict], recipient_email: str, week_label: str) -> str:
    unsub = _unsub_url(recipient_email)
    cards_html = []
    for a in articles:
        slug = a.get("slug") or ""
        title = escape(a.get("title") or "")
        cat = escape(CATEGORY_LABEL.get(a.get("category") or "", (a.get("category") or "").title()))
        snip = escape(_snippet(a.get("summary") or a.get("content") or ""))
        article_url = f"{FROEHLICH_SITE_URL}/nachrichten/{slug}"
        cards_html.append(
            f'<tr><td style="padding:16px 0;border-top:1px solid #e5e7eb">'
            f'<p style="margin:0 0 6px;color:#c9a961;font-size:11px;letter-spacing:0.18em;'
            f'text-transform:uppercase">{cat}</p>'
            f'<h2 style="margin:0 0 10px;color:#0f1d34;font-size:18px;line-height:1.35;'
            f'font-family:Georgia,serif;font-weight:400">'
            f'<a href="{escape(article_url)}" style="color:#0f1d34;text-decoration:none">{title}</a></h2>'
            f'<p style="margin:0 0 12px;color:#3f4a5f;font-size:14px;line-height:1.6">{snip}</p>'
            f'<p style="margin:0"><a href="{escape(article_url)}" '
            f'style="color:#0f1d34;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;'
            f'text-decoration:none;border-bottom:1px solid #c9a961;padding-bottom:2px">'
            f'Weiterlesen →</a></p></td></tr>'
        )
    body = "".join(cards_html) or (
        '<tr><td style="padding:32px 0;color:#3f4a5f;font-size:14px">'
        'In dieser Woche gab es keine neuen Meldungen.</td></tr>'
    )
    all_news = f"{FROEHLICH_SITE_URL}/nachrichten"
    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="background:#f5f7fa;padding:32px 0;font-family:Georgia,serif">'
        f'<tr><td align="center"><table role="presentation" width="580" cellpadding="0" '
        f'cellspacing="0" style="background:#ffffff;padding:36px;border:1px solid #e5e7eb">'
        f'<tr><td>'
        f'<p style="margin:0 0 6px;color:#c9a961;font-size:11px;letter-spacing:0.22em;'
        f'text-transform:uppercase">Fröhlich Vermögensberatung · Digest {escape(week_label)}</p>'
        f'<h1 style="margin:0 0 18px;color:#0f1d34;font-size:22px;line-height:1.3;font-weight:400">'
        f'Finanznachrichten der Woche</h1>'
        f'<p style="margin:0 0 20px;color:#3f4a5f;font-size:14px;line-height:1.6">'
        f'Ausgewählte Meldungen zu Kapitalmärkten, Zinsen, Fonds und Konjunktur — '
        f'redaktionell aufbereitet, produkt-neutral.</p>'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0">{body}</table>'
        f'<p style="margin:28px 0 0;padding-top:18px;border-top:1px solid #e5e7eb">'
        f'<a href="{escape(all_news)}" style="display:inline-block;padding:12px 22px;'
        f'background:#0f1d34;color:#ffffff;font-family:Arial,sans-serif;font-size:13px;'
        f'letter-spacing:0.16em;text-transform:uppercase;text-decoration:none">'
        f'Alle Nachrichten öffnen</a></p>'
        f'<p style="margin:22px 0 0;color:#888;font-size:11.5px;line-height:1.6">'
        f'Sie erhalten diesen wöchentlichen Digest, weil Sie sich auf froehlich-vermoegensberatung.de '
        f'dafür eingetragen haben. Um sich abzumelden, klicken Sie hier: '
        f'<a href="{escape(unsub)}" style="color:#0f1d34">Newsletter abbestellen</a>. '
        f'Wir bitten niemals per E-Mail um Zugangsdaten oder Zahlungsinformationen.</p>'
        f'</td></tr></table></td></tr></table>'
    )


# ---------------------------------------------------------------------------
# Versand
# ---------------------------------------------------------------------------

async def send_weekly_digest(db, send_email_fn, *, force: bool = False, limit_articles: int = 6) -> dict:
    """Erzeugt den Digest und verschickt ihn an alle aktiven Abonnenten.

    Rückgabe-Stats: {digest_id, week_label, articles, recipients_total, sent, skipped, failed, dry_run, already_sent}
    Ein defekter Empfänger stoppt den Versand nicht.
    """
    now = datetime.now(timezone.utc)
    iso_year, iso_week, _ = now.isocalendar()
    week_label = f"{iso_year}-W{iso_week:02d}"
    stats = {
        "digest_id": week_label, "week_label": week_label, "started_at": now.isoformat(),
        "articles": 0, "recipients_total": 0, "sent": 0, "skipped": 0, "failed": 0,
        "dry_run": not bool(os.environ.get("EMERGENT_EMAIL_KEY", "").strip()),
        "already_sent": False,
    }

    # Dedup — pro ISO-Woche nur ein Digest, außer force=True
    existing = await db.newsletter_digests.find_one({"digest_id": week_label})
    if existing and not force:
        stats["already_sent"] = True
        stats["sent"] = existing.get("sent", 0)
        stats["recipients_total"] = existing.get("recipients_total", 0)
        logger.info("weekly_digest.skipped digest_id=%s reason=already_sent", week_label)
        return stats

    since = now - timedelta(days=7)
    cursor = db.news_articles.find(
        {"status": "published", "is_published": True, "published_at": {"$gte": since}}
    ).sort("published_at", -1).limit(80)
    docs = await cursor.to_list(80)
    articles = _pick_articles(docs, limit=limit_articles)
    stats["articles"] = len(articles)
    if not articles:
        logger.info("weekly_digest.no_articles digest_id=%s", week_label)

    # Empfänger — aktive, eingewilligte Abonnenten
    rec_cursor = db.newsletter_subscribers.find({"consent": True, "unsubscribed": {"$ne": True}})
    recipients = [d.get("email") for d in await rec_cursor.to_list(5000) if d.get("email")]
    stats["recipients_total"] = len(recipients)
    if not recipients:
        logger.info("weekly_digest.no_recipients digest_id=%s", week_label)

    subject = f"Fröhlich Digest · Finanznachrichten KW{iso_week:02d}"
    sent, failed = 0, 0

    # Digest-Record vorab anlegen (Idempotenz-Guard gegen parallele Cron-Läufe)
    lock_doc = {
        "digest_id": week_label, "started_at": now.isoformat(),
        "articles": stats["articles"], "article_slugs": [a.get("slug") for a in articles],
        "recipients_total": len(recipients), "sent": 0, "failed": 0,
        "dry_run": stats["dry_run"], "force": force,
    }
    try:
        if existing and force:
            await db.newsletter_digests.update_one({"_id": existing["_id"]}, {"$set": lock_doc})
        else:
            await db.newsletter_digests.insert_one(lock_doc)
    except Exception:  # noqa: BLE001
        logger.exception("weekly_digest.lock_insert_failed digest_id=%s", week_label)

    for email in recipients:
        try:
            html = build_digest_html(articles, email, week_label)
            if stats["dry_run"]:
                stats["skipped"] += 1
                continue
            await send_email_fn(email, subject, html)
            sent += 1
        except Exception as exc:  # noqa: BLE001
            failed += 1
            logger.warning("weekly_digest.send_failed email_hash=%s err=%s",
                            hashlib.sha256(email.encode()).hexdigest()[:10], exc)
    stats["sent"] = sent
    stats["failed"] = failed
    stats["finished_at"] = datetime.now(timezone.utc).isoformat()
    try:
        await db.newsletter_digests.update_one(
            {"digest_id": week_label},
            {"$set": {"sent": sent, "failed": failed, "finished_at": stats["finished_at"]}},
        )
    except Exception:  # noqa: BLE001
        logger.exception("weekly_digest.stats_update_failed digest_id=%s", week_label)
    logger.info("weekly_digest.done digest_id=%s articles=%d recipients=%d sent=%d failed=%d dry_run=%s",
                week_label, stats["articles"], stats["recipients_total"], sent, failed, stats["dry_run"])
    return stats


# ---------------------------------------------------------------------------
# Artikel-Auswahl + Metadaten (gemeinsame Basis für Versand, Preview, History)
# ---------------------------------------------------------------------------

def _iso_week_label(now: datetime | None = None) -> str:
    now = now or datetime.now(timezone.utc)
    y, w, _ = now.isocalendar()
    return f"{y}-W{w:02d}"


def _iso_week_subject(now: datetime | None = None) -> str:
    now = now or datetime.now(timezone.utc)
    _, w, _ = now.isocalendar()
    return f"Fröhlich Digest · Finanznachrichten KW{w:02d}"


async def _load_recent_articles(db, *, limit: int = 6, days: int = 7) -> list[dict]:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    cursor = db.news_articles.find(
        {"status": "published", "is_published": True, "published_at": {"$gte": since}}
    ).sort("published_at", -1).limit(80)
    docs = await cursor.to_list(80)
    return _pick_articles(docs, limit=limit)


# ---------------------------------------------------------------------------
# Routen-Registrierung
# ---------------------------------------------------------------------------

def register(api: APIRouter, db, send_email_fn, require_admin):
    from fastapi.responses import HTMLResponse

    @api.post("/newsletter/admin/send-weekly-digest",
              summary="Admin/Cron: wöchentlichen Digest zusammenstellen und versenden")
    async def _admin_send_weekly_digest(force: bool = False, limit: int = 6,
                                          _user: dict = Depends(require_admin)):
        return await send_weekly_digest(db, send_email_fn, force=force, limit_articles=max(1, min(12, limit)))

    @api.get("/newsletter/admin/preview-weekly-digest",
             summary="Admin: HTML-Vorschau des Wochen-Digests (kein Versand, kein Dedup-Eintrag)")
    async def _admin_preview_weekly_digest(limit: int = 6,
                                            _user: dict = Depends(require_admin)):
        # Nutzt bewusst dieselbe Selektions- + Render-Funktion wie der Versand.
        # KEIN Update in newsletter_digests, KEIN send_email_fn-Aufruf.
        articles = await _load_recent_articles(db, limit=max(1, min(12, limit)))
        preview_email = "preview@froehlich-vermoegensberatung.de"
        week_label = _iso_week_label()
        if not articles:
            body = (
                '<div style="max-width:520px;margin:32px auto;padding:24px;'
                'font-family:Georgia,serif;background:#fff;border:1px solid #e5e7eb">'
                '<p style="color:#c9a961;font-size:11px;letter-spacing:0.2em;'
                'text-transform:uppercase;margin:0 0 10px">Preview · '
                f'{escape(week_label)}</p>'
                '<h1 style="font-weight:400;font-size:20px;color:#0f1d34;margin:0 0 8px">'
                'Kein Digest verfügbar</h1>'
                '<p style="color:#3f4a5f;font-size:14px;line-height:1.6">In den vergangenen '
                '7 Tagen liegen keine veröffentlichten Meldungen im News-Store. Der '
                'Freitag-Cron würde in dieser Woche keinen Digest verschicken.</p></div>'
            )
            return HTMLResponse(content=body, status_code=200)
        html = build_digest_html(articles, preview_email, week_label)
        return HTMLResponse(content=html, status_code=200)

    @api.get("/newsletter/digests",
             summary="Öffentliche Digest-Historie (keine PII, keine Empfänger, keine Tokens)")
    async def _public_digest_history(limit: int = 12):
        limit = max(1, min(24, limit))
        cursor = db.newsletter_digests.find(
            {"articles": {"$gt": 0}}
        ).sort("started_at", -1).limit(limit)
        raw = await cursor.to_list(limit)
        out = []
        for d in raw:
            slugs = d.get("article_slugs") or []
            slugs = [s for s in slugs if s]
            # Titel + Kategorie für die Slugs beziehen (Snapshot des News-Store)
            article_docs = []
            if slugs:
                acur = db.news_articles.find(
                    {"slug": {"$in": slugs}},
                    {"_id": 0, "slug": 1, "title": 1, "category": 1, "published_at": 1},
                )
                by_slug = {a.get("slug"): a for a in await acur.to_list(len(slugs))}
                for s in slugs:
                    a = by_slug.get(s)
                    if a:
                        article_docs.append({
                            "slug": s, "title": a.get("title") or "",
                            "category": a.get("category") or "",
                        })
                    else:
                        # Artikel wurde entfernt → nur den Slug als Hinweis
                        article_docs.append({"slug": s, "title": "(nicht mehr verfügbar)", "category": ""})
            # ISO-Woche → Datumsbereich (Mo–So) für Anzeige
            week_label = d.get("digest_id") or d.get("week_label") or ""
            out.append({
                "week_label": week_label,
                "subject": _iso_week_subject(),
                "articles": article_docs,
                "article_count": d.get("articles", len(article_docs)),
                "started_at": d.get("started_at"),
                "finished_at": d.get("finished_at"),
            })
        return {"items": out, "total": len(out)}

    @api.get("/newsletter/unsubscribe", summary="Abmelde-Link aus Digest-Mail")
    async def _newsletter_unsubscribe(
        email: str = Query(...),
        token: str = Query(...),
    ):
        norm = (email or "").strip().lower()
        if not verify_unsub_token(norm, token):
            raise HTTPException(400, detail="Ungültiger oder abgelaufener Abmelde-Link.")
        now_iso = datetime.now(timezone.utc).isoformat()
        result = await db.newsletter_subscribers.update_one(
            {"email": norm},
            {"$set": {"unsubscribed": True, "unsubscribed_at": now_iso}},
        )
        if result.matched_count == 0:
            logger.info("newsletter_unsubscribe.miss email_hash=%s",
                          hashlib.sha256(norm.encode()).hexdigest()[:10])
        html = (
            '<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Abgemeldet</title>'
            '<style>body{font-family:Georgia,serif;background:#f5f7fa;margin:0;padding:48px 16px;'
            'color:#0f1d34}main{max-width:520px;margin:0 auto;background:#fff;padding:32px;'
            'border:1px solid #e5e7eb}h1{font-weight:400;font-size:22px;margin:0 0 12px}'
            'p{color:#3f4a5f;line-height:1.6;font-size:14px}a{color:#0f1d34}</style></head><body>'
            '<main><p style="color:#c9a961;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;'
            'margin:0 0 12px">Fröhlich Vermögensberatung</p>'
            '<h1>Sie sind abgemeldet.</h1>'
            '<p>Sie erhalten ab sofort keinen wöchentlichen Digest mehr. Sie können sich jederzeit '
            'wieder anmelden, wenn Sie wieder Interesse haben. Danke für Ihr bisheriges Interesse.</p>'
            f'<p><a href="{escape(FROEHLICH_SITE_URL)}">Zurück zur Startseite</a></p>'
            '</main></body></html>'
        )
        return HTMLResponse(content=html, status_code=200)
