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

SITE_BASE = os.environ.get("PUBLIC_SITE_URL", "https://essenceinvest.com")


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
        # Session 80.1 — Publisher-Felder additiv (kein Breaking).
        "publish_attempts": int(doc.get("publish_attempts") or 0),
        "last_publish_attempt_at": _iso(doc.get("last_publish_attempt_at")),
        "publish_error": doc.get("publish_error"),
        "published_at": _iso(doc.get("published_at")),
        "external_post_id": doc.get("external_post_id"),
        "external_post_url": doc.get("external_post_url"),
    }


# ---------------------------------------------------------------------------
# Session 80.1 — LinkedIn Publisher-Integration
# ---------------------------------------------------------------------------
# State-Machine: draft → approved → scheduled → publishing → published
# Fehlerfall: publish_failed. At-most-once via atomarem find_one_and_update.

PUBLISH_ELIGIBLE_STATES = {"scheduled"}


def _extract_commentary(doc: dict) -> str:
    """LinkedIn `commentary` = der final erzeugte Draft-Text.

    Wir posten NUR den kuratierten `draft_text` — kein zusätzlicher AI-Wrapper.
    """
    return (doc.get("draft_text") or "").strip()


async def build_dry_run_result(db, doc: dict) -> dict:
    """Sammelt alle Prä-Publish-Checks ohne externen API-Call."""
    from providers.social import linkedin as _li

    issues: list[str] = []
    if doc.get("status") not in PUBLISH_ELIGIBLE_STATES:
        issues.append(f"status_not_publishable:{doc.get('status')}")
    if doc.get("external_post_id"):
        issues.append("already_published")
    if not doc.get("approved_by"):
        issues.append("missing_approved_by")
    sched = doc.get("scheduled_at")
    if not sched:
        issues.append("missing_scheduled_at")
    commentary = _extract_commentary(doc)
    if not commentary or len(commentary) < 20:
        issues.append("commentary_too_short")
    if len(commentary) > 3000:
        issues.append("commentary_too_long")
    if not doc.get("canonical_url"):
        issues.append("missing_canonical_url")
    provider = _li.public_config_summary()
    if not provider["configured"]:
        issues.append("provider_not_configured")

    payload = None
    payload_error = None
    if not issues:
        try:
            payload = _li.build_payload(commentary=commentary)
        except Exception as exc:  # noqa: BLE001
            payload_error = f"{type(exc).__name__}: {exc}"
            issues.append("payload_build_failed")

    return {
        "ok": len(issues) == 0,
        "issues": issues,
        "provider": provider,
        "commentary_chars": len(commentary),
        "scheduled_at": sched.isoformat() if hasattr(sched, "isoformat") else sched,
        "canonical_url": doc.get("canonical_url"),
        # Payload absichtlich OHNE Author-URN im Log (könnte Rückschlüsse zulassen).
        "payload_preview": {"commentary_preview": commentary[:120], "visibility": "PUBLIC"} if payload else None,
        "payload_error": payload_error,
    }


async def try_publish(db, item_id, *, trigger: str = "cron") -> dict:
    """Idempotenter Publish-Versuch für **einen** Draft.

    At-most-once-Kontrakt:
      1. Atomarer Übergang `scheduled → publishing` via
         ``find_one_and_update({_id, status:"scheduled", external_post_id: None})``.
         Nur der Gewinner dieses Compare-and-Set führt den externen POST aus.
      2. Auf jeden Erfolgs- ODER Timeout/Ambigu-Pfad wird ``publishing`` NICHT
         still zurückgesetzt — bei Timeout bleibt der Doc als ``publish_failed``
         mit ``publish_error="timeout — manual review required"`` markiert. Ein
         automatischer Retry würde riskieren, dass LinkedIn den ersten Request
         bereits verarbeitet hat.
    """
    from providers.social import linkedin as _li
    from bson import ObjectId
    from bson.errors import InvalidId

    now = datetime.now(timezone.utc)
    # ObjectId nur konvertieren, wenn der String tatsächlich einer ist —
    # sonst könnten Tests mit Fake-IDs (nicht-hex) legitim durchlaufen.
    if isinstance(item_id, str):
        try:
            lookup_id = ObjectId(item_id)
        except InvalidId:
            lookup_id = item_id
    else:
        lookup_id = item_id
    filt = {"_id": lookup_id, "status": "scheduled", "external_post_id": None}
    upd = {"$set": {"status": "publishing", "last_publish_attempt_at": now,
                    "updated_at": now}, "$inc": {"publish_attempts": 1}}
    locked = await db[COLLECTION].find_one_and_update(filt, upd, return_document=True)
    if not locked:
        # Entweder schon verarbeitet, oder nicht in State scheduled.
        current = await db[COLLECTION].find_one({"_id": filt["_id"]})
        return {"ok": False, "action": "not_locked",
                "reason": "already_processed_or_wrong_state",
                "current_status": (current or {}).get("status")}

    commentary = _extract_commentary(locked)
    # Sicherheitscheck: Provider verfügbar?
    if not _li.is_configured():
        await db[COLLECTION].update_one(
            {"_id": locked["_id"]},
            {"$set": {"status": "publish_failed", "publish_error": "provider_not_configured",
                      "updated_at": datetime.now(timezone.utc)}},
        )
        return {"ok": False, "action": "provider_not_configured"}

    try:
        pub = await _li.publish(commentary)
    except _li.LinkedInPublishError as exc:
        # Timeout: bewusst NICHT zurück auf scheduled — manueller Review.
        error_state = "publish_failed"
        await db[COLLECTION].update_one(
            {"_id": locked["_id"]},
            {"$set": {"status": error_state, "publish_error": f"{exc.kind}:{exc.message}",
                      "updated_at": datetime.now(timezone.utc)}},
        )
        return {"ok": False, "action": "publish_failed", "error_kind": exc.kind,
                "error": exc.message, "http_status": exc.http_status}
    except Exception as exc:  # noqa: BLE001
        logger.exception("try_publish: unexpected error")
        await db[COLLECTION].update_one(
            {"_id": locked["_id"]},
            {"$set": {"status": "publish_failed", "publish_error": f"unexpected:{type(exc).__name__}",
                      "updated_at": datetime.now(timezone.utc)}},
        )
        return {"ok": False, "action": "publish_failed", "error_kind": "unexpected"}

    finished = datetime.now(timezone.utc)
    await db[COLLECTION].update_one(
        {"_id": locked["_id"]},
        {"$set": {
            "status": "published",
            "published_at": finished,
            "external_post_id": pub["external_post_id"],
            "external_post_url": pub["external_post_url"],
            "publish_error": None,
            "updated_at": finished,
        }},
    )
    return {"ok": True, "action": "published",
            "external_post_id": pub["external_post_id"],
            "external_post_url": pub["external_post_url"], "trigger": trigger}


async def run_publisher_cron(db, *, limit: int = 3) -> dict:
    """Cron: verarbeitet `status=scheduled AND scheduled_at<=now`.

    ENV-Gate: nur ausführen, wenn `LINKEDIN_AUTO_PUBLISH_ENABLED=true`.
    Kleiner Batch — verhindert Rate-Limit-Bursts bei erstem Rollout.
    """
    enabled = (os.environ.get("LINKEDIN_AUTO_PUBLISH_ENABLED", "false").lower() == "true")
    started = datetime.now(timezone.utc)
    result = {"enabled": enabled, "processed": 0, "published": 0, "failed": 0, "skipped": 0}
    if not enabled:
        result["reason"] = "LINKEDIN_AUTO_PUBLISH_ENABLED=false"
        return result

    cursor = db[COLLECTION].find({
        "status": "scheduled",
        "scheduled_at": {"$lte": started},
        "external_post_id": None,
    }).sort("scheduled_at", 1).limit(limit)
    async for doc in cursor:
        result["processed"] += 1
        r = await try_publish(db, doc["_id"], trigger="cron")
        if r.get("ok"):
            result["published"] += 1
        elif r.get("action") in ("not_locked",):
            result["skipped"] += 1
        else:
            result["failed"] += 1

    result["duration_ms"] = int((datetime.now(timezone.utc) - started).total_seconds() * 1000)
    await db.job_summaries.update_one(
        {"_id": "social_content_publisher"},
        {"$set": {"last_started_at": started, "last_success_at": datetime.now(timezone.utc),
                  "last_summary": result}},
        upsert=True,
    )
    return result
