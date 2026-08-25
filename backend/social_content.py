"""Social Content Automation (Session 80.0) — LinkedIn Editorial Pipeline.

Erzeugt aus geeigneten Fröhlich-News-Artikeln automatisch LinkedIn-Post-Entwürfe
und speichert sie in ``social_content_drafts`` für die menschliche Freigabe.
**Es wird in dieser Session NICHT auf LinkedIn veröffentlicht.**

Design-Prinzipien
- Wiederverwendung: derselbe Emergent-LLM-Key + `LlmChat` wie
  `news_synthesizer.py`. Kein zweiter Integrationsweg.
- Anti-Halluzination: der Post-Text darf nur Aussagen enthalten, die aus dem
  Ausgangs-Artikel ableitbar sind (Titel/Subtitle/Summary/Fulltext). Keine
  neuen Zahlen, Zitate, Personen, Prognosen, Kursziele. Keine Anlage-
  empfehlungen — Compliance-Regel wie im Newsroom.
- Human-in-the-Loop: AI erzeugt ausschließlich `status="draft"`. Approve/
  Reject/Schedule erfordert explizite Admin-Aktion.
- Provider-Ausfall lässt Artikel unangetastet, produziert keinen Fake-Draft.
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any, Optional

from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

COLLECTION = "social_content_drafts"
PLATFORM = "linkedin"
MODEL_PROVIDER = "anthropic"
MODEL_NAME = "claude-sonnet-5"

# Content-Gate
MIN_CONTENT_CHARS = 400
BANNED_PHRASES = (
    "jetzt kaufen", "unbedingt kaufen", "garantierte rendite", "kaufempfehlung",
    "verkaufsempfehlung", "sicherer gewinn", "risikolos", "todsicher",
)

SITE_BASE = os.environ.get("PUBLIC_SITE_URL", "https://kapital-direkt24.de")


def canonical_article_url(slug: str) -> str:
    return f"{SITE_BASE.rstrip('/')}/news/nachrichten/{slug}"


def _dedupe_key(article_id: str, updated_at) -> str:
    ts = updated_at.isoformat() if hasattr(updated_at, "isoformat") else str(updated_at or "")
    return hashlib.sha256(f"{PLATFORM}|{article_id}|{ts}".encode("utf-8")).hexdigest()


async def ensure_indexes(db) -> None:
    await db[COLLECTION].create_index("dedupe_key", unique=True, name="dedupe_key_unique")
    await db[COLLECTION].create_index([("status", 1), ("created_at", -1)], name="status_created")
    await db[COLLECTION].create_index("article_slug", name="article_slug_idx")


# ---------------------------------------------------------------------------
# Eligibility
# ---------------------------------------------------------------------------

def is_article_eligible(article: dict) -> tuple[bool, Optional[str]]:
    if not article:
        return False, "no_article"
    if not article.get("is_published") or article.get("status") != "published":
        return False, "not_published"
    if article.get("content_type") == "demo" or article.get("is_demo"):
        return False, "demo"
    title = (article.get("title") or "").strip()
    if len(title) < 10:
        return False, "title_too_short"
    body = (article.get("content") or "") + " " + (article.get("summary") or "")
    if len(body.strip()) < MIN_CONTENT_CHARS:
        return False, "content_too_short"
    return True, None


# ---------------------------------------------------------------------------
# LLM Draft-Generation
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """Du bist Social-Media-Redakteur bei Fröhlich Vermögensberatung.
Deine Aufgabe ist es, aus einem bestehenden deutschen Redaktions-Artikel einen
LinkedIn-Post-Entwurf auf sachlichem Deutsch zu formulieren.

STRENGE REGELN:
1. Verwende AUSSCHLIESSLICH Fakten, Zahlen, Zitate und Aussagen, die im Artikel
   explizit vorkommen. Erfinde nichts.
2. Keine Anlageempfehlung, keine Kaufempfehlung, keine Verkaufsempfehlung,
   keine Renditeversprechen.
3. Kein Clickbait, keine Ausrufezeichenketten, kein Sensationston.
4. Struktur: starker sachlicher Einstieg (1 Satz), 2-4 kurze Absätze mit den
   wichtigsten Erkenntnissen aus dem Artikel, dezenter CTA zum vollständigen
   Artikel, 3-5 thematisch passende Hashtags.
5. Maximal 1300 Zeichen (LinkedIn optimum).
6. Sprache: professionelles, unaufgeregtes Deutsch.

Antworte AUSSCHLIESSLICH als JSON in dieser Form:
{"draft_text": "<vollständiger Post-Text inkl. Hashtags und Link-Placeholder {URL}>"}
Der Platzhalter {URL} wird nach der Generierung durch die kanonische Artikel-URL ersetzt.
"""


async def _generate_draft_via_llm(article: dict) -> Optional[str]:
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        logger.error("social_content: EMERGENT_LLM_KEY missing — generation skipped")
        return None
    session = f"social-{article.get('slug', 'x')[:32]}"
    chat = LlmChat(api_key=api_key, session_id=session, system_message=SYSTEM_PROMPT) \
        .with_model(MODEL_PROVIDER, MODEL_NAME)
    facts = (
        f"Titel: {article.get('title', '')}\n"
        f"Untertitel: {article.get('subtitle') or ''}\n"
        f"Kategorie: {article.get('category', '')}\n"
        f"Kurzfassung: {article.get('summary', '')}\n"
        f"Volltext:\n{(article.get('content') or '')[:6000]}"
    )
    msg = UserMessage(text="Erzeuge den LinkedIn-Post-Entwurf aus diesem Artikel:\n\n" + facts)
    try:
        response = await chat.send_message(msg)
        raw = getattr(response, "text", None) or str(response)
    except Exception as exc:  # noqa: BLE001
        logger.exception("social_content: llm call failed: %s", exc)
        return None
    m = re.search(r"\{.*\}", raw, re.DOTALL)
    try:
        data = json.loads(m.group(0)) if m else json.loads(raw)
    except Exception:  # noqa: BLE001
        logger.warning("social_content: llm returned non-JSON: %r", raw[:200])
        return None
    text = (data.get("draft_text") or "").strip()
    return text or None


def _validate_draft(text: str) -> tuple[bool, Optional[str]]:
    if not text or len(text) < 80:
        return False, "too_short"
    if len(text) > 3000:
        return False, "too_long"
    low = text.lower()
    for bad in BANNED_PHRASES:
        if bad in low:
            return False, f"banned_phrase:{bad}"
    if "{url}" not in low and "http" not in low:
        return False, "no_link_placeholder"
    return True, None


async def generate_draft_for_article(db, article: dict, *, trigger: str = "cron") -> dict:
    """Erzeugt einen Draft für einen bereits gefundenen Artikel. Idempotent per
    ``dedupe_key`` (article_id + updated_at)."""
    eligible, reason = is_article_eligible(article)
    if not eligible:
        return {"ok": False, "action": "skipped", "reason": reason, "slug": article.get("slug")}

    article_id = str(article.get("_id") or article.get("slug"))
    slug = article.get("slug")
    updated_at = article.get("updated_at") or article.get("published_at")
    dk = _dedupe_key(article_id, updated_at)

    # Approved Drafts NIE still überschreiben.
    existing = await db[COLLECTION].find_one({"article_id": article_id, "platform": PLATFORM})
    if existing:
        if existing.get("status") in ("approved", "scheduled", "rejected"):
            return {"ok": True, "action": "kept_existing", "status": existing.get("status"),
                    "slug": slug, "dedupe_key": existing.get("dedupe_key")}
        if existing.get("dedupe_key") == dk and trigger == "cron":
            return {"ok": True, "action": "dedupe_hit", "slug": slug, "dedupe_key": dk}

    draft_text = await _generate_draft_via_llm(article)
    if not draft_text:
        return {"ok": False, "action": "llm_failed", "slug": slug}
    ok, reason = _validate_draft(draft_text)
    if not ok:
        return {"ok": False, "action": "validation_failed", "reason": reason, "slug": slug}

    now = datetime.now(timezone.utc)
    canonical = canonical_article_url(slug)
    final_text = draft_text.replace("{URL}", canonical).replace("{url}", canonical)

    doc = {
        "article_id": article_id,
        "article_slug": slug,
        "article_title": article.get("title"),
        "article_category": article.get("category"),
        "platform": PLATFORM,
        "status": "draft",
        "draft_text": final_text,
        "canonical_url": canonical,
        "created_at": existing.get("created_at") if existing else now,
        "updated_at": now,
        "generated_at": now,
        "scheduled_at": None,
        "approved_at": None,
        "approved_by": None,
        "generation_source": trigger,
        "generation_model": f"{MODEL_PROVIDER}:{MODEL_NAME}",
        "source_article_updated_at": updated_at,
        "dedupe_key": dk,
    }
    if existing:
        await db[COLLECTION].update_one({"_id": existing["_id"]}, {"$set": doc})
        action = "regenerated"
    else:
        await db[COLLECTION].insert_one(doc)
        action = "created"
    return {"ok": True, "action": action, "slug": slug, "dedupe_key": dk,
            "chars": len(final_text)}


async def run_generation_cron(db, *, limit: int = 5) -> dict:
    """Sucht bis zu ``limit`` neue geeignete Artikel und erzeugt fehlende Drafts."""
    started = datetime.now(timezone.utc)
    result = {"scanned": 0, "created": 0, "kept_existing": 0, "skipped": 0,
              "llm_failed": 0, "validation_failed": 0}
    # Kandidaten: publizierte Live-Artikel, für die noch kein Draft existiert.
    # Sortiert nach neuestem published_at, damit aktuelle Themen zuerst laufen.
    cursor = db.news_articles.find({
        "is_published": True, "status": "published",
        "content_type": {"$ne": "demo"},
    }).sort("published_at", -1).limit(limit * 3)
    async for article in cursor:
        result["scanned"] += 1
        try:
            r = await generate_draft_for_article(db, article, trigger="cron")
        except Exception:  # noqa: BLE001
            logger.exception("social_content: unexpected error on slug=%s", article.get("slug"))
            result["llm_failed"] += 1
            continue
        act = r.get("action")
        if act == "created" or act == "regenerated":
            result["created"] += 1
        elif act in ("kept_existing", "dedupe_hit"):
            result["kept_existing"] += 1
        elif act == "llm_failed":
            result["llm_failed"] += 1
        elif act == "validation_failed":
            result["validation_failed"] += 1
        else:
            result["skipped"] += 1
        if result["created"] >= limit:
            break
    result["duration_ms"] = int((datetime.now(timezone.utc) - started).total_seconds() * 1000)
    await db.job_summaries.update_one(
        {"_id": "social_content_generation"},
        {"$set": {"last_started_at": started, "last_success_at": datetime.now(timezone.utc),
                  "last_summary": result}},
        upsert=True,
    )
    return result


def serialize(doc: dict) -> dict:
    def _iso(v):
        return v.isoformat() if hasattr(v, "isoformat") else v
    return {
        "id": str(doc.get("_id")),
        "article_id": doc.get("article_id"),
        "article_slug": doc.get("article_slug"),
        "article_title": doc.get("article_title"),
        "article_category": doc.get("article_category"),
        "platform": doc.get("platform"),
        "status": doc.get("status"),
        "draft_text": doc.get("draft_text"),
        "canonical_url": doc.get("canonical_url"),
        "created_at": _iso(doc.get("created_at")),
        "updated_at": _iso(doc.get("updated_at")),
        "generated_at": _iso(doc.get("generated_at")),
        "scheduled_at": _iso(doc.get("scheduled_at")),
        "approved_at": _iso(doc.get("approved_at")),
        "approved_by": doc.get("approved_by"),
        "generation_source": doc.get("generation_source"),
        "generation_model": doc.get("generation_model"),
        "source_article_updated_at": _iso(doc.get("source_article_updated_at")),
    }
