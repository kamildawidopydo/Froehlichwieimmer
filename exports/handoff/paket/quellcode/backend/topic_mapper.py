"""Session 80.31–80.32 — Zentrales Investment-Topic-Mapping + Registry.

Regelbasiertes Scoring + harte Guards. Wird gleichermaßen vom Backfill-Script
UND von der laufenden News-Synthesis-Pipeline aufgerufen, damit historische
und zukünftige Artikel EINE gemeinsame Klassifikation teilen.

Grundprinzip:
    „Lieber kein Topic als ein falsches Topic."
    Ein Topic beschreibt ein DAUERHAFTES Finanzthema — nicht eine
    News-Kategorie. Topics werden nur angelegt, wenn mindestens zwei
    Ebenen (News/Wissen/Strategie/Einordnung/Produkt) sinnvoll verbunden
    werden können.

Confidence-Modell (Session 80.31):
    +3  starker Titel-Match (Regex im Titel)
    +2  zweiter starker Titel-Match
    +3  strukturierter Tag / Topic
    +2  passende Kategorie
    +1  Summary/Excerpt-Signal
    Reject bei Negative-Guard-Match

High-Confidence-Threshold: 5.  Alles darunter → kein Topic.
Threshold in Session 80.32 unverändert — Coverage ist kein Erfolgsziel an
sich.

Gültige Slugs (Stand 80.32, MÜSSEN mit `investment_topics.slug` matchen):
    aktien           — Aktien & Kapitalmärkte (bestehend seit 80.x)
    anleihen         — Anleihen & Zinsen        (bestehend seit 80.x)
    dividenden       — Dividenden & Ausschüttungen (bestehend seit 80.x)
    zinsen-sparen    — Sparen, Tagesgeld, Festgeld, EZB-Sparbezug (NEU 80.32)
    ruhestand-vorsorge — Altersvorsorge, Rente, Ruhestandsplanung (NEU 80.32)

Bewusst NICHT angelegt in 80.32 (Topic-Inflation vermeiden):
    immobilien-finanzierung — nur News-Layer, keine Strategie/Wissen
    inflation-kaufkraft     — nur WasBedeutetDasBlock-CTA, keine dauerhafte
                              Content-Ebene; Money-Impact-Regel bleibt aktiv
    etf-investieren         — deckungsgleich mit `aktien` (ETF-Signal ist
                              bereits STRONG-Keyword im `aktien`-Rule-Set)
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional

# ---------------------------------------------------------------------------
# Kanonische Slugs — MÜSSEN mit `investment_topics.slug` übereinstimmen.
# ---------------------------------------------------------------------------
VALID_SLUGS = {"aktien", "anleihen", "dividenden", "zinsen-sparen", "ruhestand-vorsorge"}

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


# NB: Reihenfolge ist Priorität bei Score-Gleichstand.
# spezifischere Topics zuerst → damit „ETF-Sparplan" nicht in `aktien`
# hängen bleibt, wenn `zinsen-sparen` gleichzeitig matcht.
RULES: tuple[Rule, ...] = (
    # -----------------------------------------------------------------------
    # zinsen-sparen — Session 80.32
    # Ziel: EZB-Sparbezug, Tages-/Festgeld, Einlagenzins. Nicht Anleihe-Zins.
    # -----------------------------------------------------------------------
    Rule(
        slug="zinsen-sparen",
        title_strong=(
            re.compile(r"\btagesgeld\b", re.I),
            re.compile(r"\bfestgeld\b", re.I),
            re.compile(r"\bsparzins", re.I),
            re.compile(r"\beinlagenzins", re.I),
            re.compile(r"\bsparangebote?\b", re.I),
            re.compile(r"\bsparerpauschbetrag\b", re.I),
            # EZB-Zinsentscheid mit Bezug im Titel — nur wenn zusätzlich
            # Sparbezug im Summary matcht (siehe summary_signals + score-Regel).
            re.compile(r"\b(?:ezb|leitzins)\b.*\b(?:sparer|einlage)", re.I),
        ),
        tags=("tagesgeld", "festgeld", "sparzinsen", "einlagen"),
        categories=("zinsen", "sparen"),
        summary_signals=(
            re.compile(r"\bsparer(?:n|innen)?\b", re.I),
            re.compile(r"\beinlage[nr]?\b", re.I),
            re.compile(r"\btages-?\s*und\s*festgeld", re.I),
        ),
        negative=(
            # Unternehmens- oder Kreditzinsen ohne Sparbezug
            re.compile(r"\bunternehmensanleihe", re.I),
            re.compile(r"\bkreditzins", re.I),
            re.compile(r"\bbauzins", re.I),
            re.compile(r"\bhypothek", re.I),
        ),
    ),
    # -----------------------------------------------------------------------
    # ruhestand-vorsorge — Session 80.32
    # Ziel: Alters-/Rentenpolitik, private Vorsorge. Nicht Personalie.
    # -----------------------------------------------------------------------
    Rule(
        slug="ruhestand-vorsorge",
        title_strong=(
            re.compile(r"\bgesetzliche\s+rente\b", re.I),
            re.compile(r"\brentenreform\w*\b", re.I),
            re.compile(r"\brenteneintritt\w*\b", re.I),
            re.compile(r"\brentenniveau\w*\b", re.I),
            re.compile(r"\brentenpaket\w*\b", re.I),
            re.compile(r"\baltersvorsorge\b", re.I),
            re.compile(r"\bprivate\s+rente\b", re.I),
            re.compile(r"\bbetriebsrente\w*\b", re.I),
            re.compile(r"\brürup", re.I),
            re.compile(r"\briester", re.I),
            re.compile(r"\bruhestand", re.I),
            # „Rente mit 63/67" — starkes Signal
            re.compile(r"\brente\s+mit\s+\d{2}\b", re.I),
        ),
        tags=("rente", "altersvorsorge", "vorsorge", "ruhestand"),
        categories=("vorsorge", "altersvorsorge", "rente"),
        summary_signals=(
            re.compile(r"\brentenbeitrag\b", re.I),
            re.compile(r"\brentenbeziehende?\b", re.I),
            re.compile(r"\brentenkasse\b", re.I),
            re.compile(r"\bpension(?:en|är)", re.I),
        ),
        negative=(
            # Personalie: „geht in Rente", „geht mit 65 in den Ruhestand"
            re.compile(r"\bvorstand[a-zäöüß]*\s+geht\s+in\s+rente", re.I),
            re.compile(r"\bceo[a-zäöüß]*\s+geht\s+in\s+(?:rente|ruhestand)", re.I),
            re.compile(r"\bgeschäftsführer[a-zäöüß]*\s+geht\s+in\s+rente", re.I),
        ),
    ),
    # -----------------------------------------------------------------------
    # aktien — Session 80.31 (unverändert bis auf zwei Guard-Erweiterungen)
    # -----------------------------------------------------------------------
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
            re.compile(r"\bwechselt zu\b", re.I),
            re.compile(r"\br[uü]cktritt\b", re.I),
        ),
    ),
    # -----------------------------------------------------------------------
    # anleihen — Session 80.31 (unverändert)
    # -----------------------------------------------------------------------
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
            re.compile(r"\brezession\b(?!.*(?:zins|anleih|bond))", re.I),
        ),
    ),
    # -----------------------------------------------------------------------
    # dividenden — Session 80.31 (unverändert)
    # -----------------------------------------------------------------------
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
            re.compile(r"\bgewinnwarnung\b", re.I),
        ),
    ),
)


# ---------------------------------------------------------------------------
# TOPIC REGISTRY — Single Source of Truth für UI-Metadaten & Cross-Mappings.
# Die eigentliche Klassifikationslogik lebt in `RULES` oben; die Registry
# beschreibt VERKNÜPFUNGEN (Knowledge/Strategy/Product/Einordnung) und wird
# bewusst schmal gehalten, damit Frontend und Backend dieselben kanonischen
# Bezeichner nutzen können.
# ---------------------------------------------------------------------------
TOPIC_REGISTRY: dict[str, dict] = {
    "aktien": {
        "label": "Aktien & Kapitalmärkte",
        "accent": "primary",   # bestehend
        "knowledge_slugs": ["fonds-grundlagen"],
        "strategy_categories": ["anlagestile"],
        "sparangebote": False,
        "einordnung_categories": ["aktienmaerkte", "maerkte"],
    },
    "anleihen": {
        "label": "Anleihen & Zinsen",
        "accent": "petrol",
        "knowledge_slugs": [],
        "strategy_categories": ["schutz-steuerung"],
        "sparangebote": False,
        "einordnung_categories": ["zinsen"],
    },
    "dividenden": {
        "label": "Dividenden & Ausschüttungen",
        "accent": "amber",
        "knowledge_slugs": [],
        "strategy_categories": ["anlagestile"],
        "sparangebote": False,
        "einordnung_categories": [],
    },
    "zinsen-sparen": {
        "label": "Zinsen & Sparen",
        "accent": "petrol",
        "knowledge_slugs": [],
        "strategy_categories": ["schutz-steuerung"],
        "sparangebote": True,   # → /sparangebote CTA erlaubt
        "einordnung_categories": ["zinsen"],
    },
    "ruhestand-vorsorge": {
        "label": "Ruhestand & Vorsorge",
        "accent": "amber",
        "knowledge_slugs": [],
        "strategy_categories": ["altersvorsorge"],
        "sparangebote": False,
        "einordnung_categories": [],
    },
}


def get_topic_metadata(slug: str) -> Optional[dict]:
    """Liefert Cross-Mapping-Metadaten für einen kanonischen Slug."""
    return TOPIC_REGISTRY.get(slug)


def _score_rule(rule: Rule, title: str, summary: str, category: str, tags: list[str]) -> tuple[int, list[str]]:
    """Rechnet Score + Reason-Liste für EIN Rule-Set gegen einen Artikel."""
    reasons: list[str] = []
    score = 0

    title_hits = [rx.pattern for rx in rule.title_strong if rx.search(title)]
    if title_hits:
        score += 3
        reasons.append(f"title:{title_hits[0]} (+3)")
        if len(title_hits) > 1:
            score += 2
            reasons.append(f"title:{title_hits[1]} (+2)")

    if tags:
        norm_tags = {t.lower().strip() for t in tags if isinstance(t, str)}
        tag_hit = norm_tags & set(rule.tags)
        if tag_hit:
            score += 3
            reasons.append(f"tag:{sorted(tag_hit)[0]} (+3)")

    if category and category.lower() in rule.categories:
        score += 2
        reasons.append(f"category:{category} (+2)")

    for rx in rule.summary_signals:
        if rx.search(summary):
            score += 1
            reasons.append(f"summary:{rx.pattern} (+1)")
            break

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
    (spezifischere Topics vor allgemeineren).
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
