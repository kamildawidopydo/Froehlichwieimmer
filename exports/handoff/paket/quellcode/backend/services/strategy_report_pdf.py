"""
Session 80.22 — Strategy-Report-PDF-Service.

Rendert ein 2–4-seitiges Merkblatt zu einem Strategie-Thema. Nutzt WeasyPrint
und ein eigenes HTML-Template (`templates/strategy_report.html`).

Input-Payload wird vom Frontend geliefert (Content stammt aus dem
Premium-Content-Store des Frontends — kein Content-Duplikat im Backend).
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from html import escape
from pathlib import Path
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

TEMPLATE_PATH = Path(__file__).resolve().parent.parent / "templates" / "strategy_report.html"


def _s(value: Any) -> str:
    return escape(str(value or "").strip())


def _list_html(items: List[Any], *, ordered: bool = False, li_class: str = "") -> str:
    if not items:
        return ""
    tag = "ol" if ordered else "ul"
    lis = "".join(
        f'<li class="{li_class}">{_s(item)}</li>' for item in items if _s(item)
    )
    return f"<{tag} class=\"list\">{lis}</{tag}>"


def _facts_html(facts: List[Dict[str, str]]) -> str:
    if not facts:
        return ""
    rows = "".join(
        f'<dt>{_s(f.get("label"))}</dt><dd>{_s(f.get("value"))}</dd>'
        for f in facts
    )
    return f'<dl class="facts">{rows}</dl>'


def _aspects_html(aspects: List[Dict[str, str]]) -> str:
    if not aspects:
        return ""
    cards = "".join(
        f'<div class="aspect"><h4>{_s(a.get("title"))}</h4><p>{_s(a.get("body"))}</p></div>'
        for a in aspects
    )
    return f'<div class="aspects-grid">{cards}</div>'


def _related_html(related: List[str]) -> str:
    if not related:
        return ""
    items = "".join(f"<li>{_s(r)}</li>" for r in related)
    return f'<ul class="related">{items}</ul>'


def render_strategy_report_pdf(payload: Dict[str, Any]) -> bytes:
    """Baut das Merkblatt-PDF aus dem Payload. Returns raw PDF bytes."""
    from weasyprint import HTML  # lazy import

    topic_title = str(payload.get("topic_title", "")).strip() or "Strategie-Thema"
    category_title = str(payload.get("category_title", "")).strip() or "Strategie"
    topic_slug = str(payload.get("topic_slug", "")).strip()
    category_slug = str(payload.get("category_slug", "")).strip()

    intro = str(payload.get("intro", "")).strip()
    summary = str(payload.get("summary", "")).strip()

    key_takeaways = payload.get("key_takeaways") or []
    quick_facts = payload.get("quick_facts") or []
    how_it_works = payload.get("how_it_works") or []
    aspects = payload.get("aspects") or []
    advantages = payload.get("advantages") or []
    considerations = payload.get("considerations") or []
    self_check_options = payload.get("self_check_options") or []
    related = payload.get("related") or []
    conv_questions = payload.get("conversation_questions") or []

    strategy_url = ""
    if category_slug and topic_slug:
        strategy_url = f"https://www.froehlich-vermoegensberatung.de/strategie/{category_slug}/{topic_slug}"

    today = datetime.now(timezone.utc).strftime("%d.%m.%Y")

    context = {
        "topic_title": _s(topic_title),
        "category_title": _s(category_title),
        "intro": _s(intro),
        "summary": _s(summary),
        "key_takeaways_html": _list_html(key_takeaways),
        "quick_facts_html": _facts_html(quick_facts),
        "how_it_works_html": _list_html(how_it_works, ordered=True),
        "aspects_html": _aspects_html(aspects),
        "advantages_html": _list_html(advantages),
        "considerations_html": _list_html(considerations),
        "self_check_html": _list_html(self_check_options),
        "related_html": _related_html(related),
        "conv_questions_html": _list_html(conv_questions, ordered=True),
        "today": _s(today),
        "strategy_url": _s(strategy_url),
    }

    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    for key, value in context.items():
        template = template.replace("{{ " + key + " }}", value)

    html = HTML(string=template, base_url=str(TEMPLATE_PATH.parent))
    return html.write_pdf()


def build_strategy_filename(topic_slug: str) -> str:
    slug = "".join(ch if ch.isalnum() or ch in ("-", "_") else "-" for ch in (topic_slug or "strategie"))
    return f"froehlich-{slug}-kompakt.pdf"
