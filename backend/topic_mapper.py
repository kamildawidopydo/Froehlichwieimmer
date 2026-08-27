"""Session 80.31 — Zentrales Investment-Topic-Mapping.

Regelbasiertes Scoring + harte Guards. Wird gleichermaßen vom Backfill-Script
UND von der laufenden News-Synthesis-Pipeline aufgerufen, damit historische
und zukünftige Artikel EINE gemeinsame Klassifikation teilen.

Grundprinzip: „Lieber kein Topic als ein falsches Topic."

Confidence-Modell:
    +3  starker Titel-Match (Regex im Titel)
    +2  zweiter starker Titel-Match
    +3  strukturierter Tag / Topic
    +2  passende Kategorie
    +1  Summary/Excerpt-Signal
    Reject bei Negative-Guard-Match

High-Confidence-Threshold: 5.  Alles darunter → kein Topic.

Aktuell gültige Slugs (aus `investment_topics`-Collection, Stand 80.31):
    aktien, anleihen, dividenden

Themen wie „Zinsen/Sparen", „Rente", „Immobilien", „Inflation", „Nachhaltig"
existieren im Topic-Katalog NICHT — sie werden bewusst NICHT synthetisch
erzeugt. Nur ihre Sparangebote-CTA-Relevanz wird separat im Frontend
(WasBedeutetDasBlock / PassendZumThema) via Keyword-Matching genutzt.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

# ---------------------------------------------------------------------------
# Kanonische Slugs — MÜSSEN mit `investment_topics.slug` übereinstimmen.
# Erweitern nur, wenn ein entsprechendes Topic-Dokument existiert.
# ---------------------------------------------------------------------------
VALID_SLUGS = {"aktien", "anleihen", "dividenden"}

HIGH_CONFIDENCE_THRESHOLD = 5


@dataclass(frozen=True)
class Rule:
    slug: str
    # STRONG-Patterns im Titel — jeder Treffer +3 (erster) / +2 (zweiter)
    title_strong: tuple[re.Pattern, ...]
    # Tag-Werte, die 1:1 zum Slug führen (+3)
    tags: tuple[str, ...]
    # Kategorien, die den Slug unterstützen (+2)
    categories: tuple[str, ...]
    # Summary/Excerpt-Signale (+1 je Match, max 1)
    summary_signals: tuple[re.Pattern, ...]
    # NEGATIVE-Guards — Reject falls einer im Titel/Summary matcht
    negative: tuple[re.Pattern, ...] = ()


# NB: `re.I` verwendet — Regex-Boundaries sind wichtig, damit „Zins" NICHT
# in „Rezension" matcht.
RULES: tuple[Rule, ...] = (
    Rule(
        slug="aktien",
        title_strong=(
            re.compile(r"\baktien?\b", re.I),
            re.compile(r"\baktienmarkt\b", re.I),
            re.compile(r"\bb[oö]rse\b", re.I),
            re.compile(r"\b(?:dax|s&p\s*500|nasdaq|nikkei|ftse|nvidia|tesla|apple)\b", re.I),
            re.compile(r"\bkursziel\b", re.I),
            re.compile(r"\betf\b", re.I),
            re.compile(r"\bdiversifikation\b", re.I),
            re.compile(r"\bverm[oö]gensaufbau\b", re.I),
        ),
        tags=("aktien", "boerse", "etf", "aktienmarkt"),
        categories=("maerkte", "boerse", "aktien", "fonds-etfs"),
        summary_signals=(
            re.compile(r"\baktion[aä]re?\b", re.I),
            re.compile(r"\bindex\b", re.I),
            re.compile(r"\bportfolio\b", re.I),
        ),
        negative=(
            # personelle Kontexte
            re.compile(r"\bwechselt zu\b", re.I),
            re.compile(r"\br[uü]cktritt\b", re.I),
        ),
    ),
    Rule(
        slug="anleihen",
        title_strong=(
            re.compile(r"\banleihe[nr]?\b", re.I),
            re.compile(r"\brendite[nr]?\b", re.I),
            re.compile(r"\bbond[s]?\b", re.I),
            re.compile(r"\bstaatsanleihe[nr]?\b", re.I),
            re.compile(r"\bunternehmensanleihe[nr]?\b", re.I),
            re.compile(r"\bleitzins(?:entscheid|schritt|erh[oö]hung|senkung)?\b", re.I),
            re.compile(r"\bezb\b.*\bzins", re.I),
            re.compile(r"\bfed\b.*\b(?:zins|rate)", re.I),
        ),
        tags=("anleihen", "bonds", "zinsen"),
        categories=("zinsen", "anleihen"),
        summary_signals=(
            re.compile(r"\bbundesbank\b", re.I),
            re.compile(r"\bnotenbank\b", re.I),
            re.compile(r"\bkupon\b", re.I),
            re.compile(r"\blaufzeit\b", re.I),
        ),
        negative=(
            # allgemeine Rezession / Konjunktur ohne Zinsbezug
            re.compile(r"\brezession\b(?!.*(?:zins|anleih|bond))", re.I),
        ),
    ),
    Rule(
        slug="dividenden",
        title_strong=(
            re.compile(r"\bdividende[nr]?\b", re.I),
            re.compile(r"\bausschüttung(?:en|s|squote)?\b", re.I),
            re.compile(r"\bhauptversammlung\b", re.I),
            re.compile(r"\bgewinnaussch", re.I),
        ),
        tags=("dividende", "dividenden", "ausschuettung"),
        categories=(),
        summary_signals=(
            re.compile(r"\baktion[aä]re?\b", re.I),
            re.compile(r"\bquartalsdividende\b", re.I),
        ),
        negative=(
            # Gewinnwarnungen sind KEINE Dividenden-Meldungen
            re.compile(r"\bgewinnwarnung\b", re.I),
        ),
    ),
)


def _score_rule(rule: Rule, title: str, summary: str, category: str, tags: list[str]) -> tuple[int, list[str]]:
    """Rechnet Score + Reason-Liste für EIN Rule-Set gegen einen Artikel."""
    reasons: list[str] = []
    score = 0

    # 1) Titel-Matches (max. zwei zählen)
    title_hits = [rx.pattern for rx in rule.title_strong if rx.search(title)]
    if title_hits:
        score += 3
        reasons.append(f"title:{title_hits[0]} (+3)")
        if len(title_hits) > 1:
            score += 2
            reasons.append(f"title:{title_hits[1]} (+2)")

    # 2) Tag-Match (nur einer zählt)
    if tags:
        norm_tags = {t.lower().strip() for t in tags if isinstance(t, str)}
        tag_hit = norm_tags & set(rule.tags)
        if tag_hit:
            score += 3
            reasons.append(f"tag:{sorted(tag_hit)[0]} (+3)")

    # 3) Kategorie
    if category and category.lower() in rule.categories:
        score += 2
        reasons.append(f"category:{category} (+2)")

    # 4) Summary-Signal (max. eins)
    for rx in rule.summary_signals:
        if rx.search(summary):
            score += 1
            reasons.append(f"summary:{rx.pattern} (+1)")
            break

    # 5) Negative-Guard → Reject
    combined = f"{title} {summary}"
    for rx in rule.negative:
        if rx.search(combined):
            return 0, [f"REJECT negative:{rx.pattern}"]

    return score, reasons


@dataclass(frozen=True)
class TopicMatch:
    slug: str
    confidence: int
    reasons: tuple[str, ...]


def classify_article(
    *,
    title: str = "",
    summary: str = "",
    excerpt: str = "",
    category: str = "",
    tags: Optional[list] = None,
) -> Optional[TopicMatch]:
    """Zentrale Klassifikationsfunktion.

    Rückgabe: `TopicMatch` (slug ∈ VALID_SLUGS) oder `None`, wenn kein
    Regelset den High-Confidence-Threshold erreicht.

    Verhalten bei Mehrdeutigkeit: das Regelset mit dem höchsten Score
    gewinnt. Bei Gleichstand gewinnt die frühere Position in `RULES`
    (aktien > anleihen > dividenden — bewusste Reihenfolge, weil
    „Dividenden" fast immer auch als „Aktien" gilt, umgekehrt nicht).
    """
    text_title = (title or "").strip()
    text_summary = ((summary or "") + " " + (excerpt or "")).strip()
    cat = (category or "").strip().lower()
    tag_list = list(tags or [])

    best: Optional[TopicMatch] = None
    for rule in RULES:
        score, reasons = _score_rule(rule, text_title, text_summary, cat, tag_list)
        if score < HIGH_CONFIDENCE_THRESHOLD:
            continue
        if best is None or score > best.confidence:
            best = TopicMatch(slug=rule.slug, confidence=score, reasons=tuple(reasons))
    return best


def classify_document(doc: dict) -> Optional[TopicMatch]:
    """Convenience-Wrapper für Mongo-Dokumente."""
    return classify_article(
        title=doc.get("title") or "",
        summary=doc.get("summary") or "",
        excerpt=doc.get("excerpt") or "",
        category=doc.get("category") or "",
        tags=doc.get("tags") or doc.get("topics") or [],
    )
