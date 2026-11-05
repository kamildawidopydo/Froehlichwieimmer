"""Session 80.36 — Zentrale strukturierte Tag-Extraktion für News-Artikel.

Regelbasiert, deterministisch, phrase-first. Kein LLM-Call.

Ausgabe:
    List[str] — kanonische Tags aus einer kleinen kontrollierten Taxonomie.
    Nur Tags mit Confidence ≥ MIN_CONF werden zurückgegeben.

Confidence-Regeln:
    exact phrase in title           → high   (3)
    canonical keyword in title      → high   (3)
    two+ reinforcing signals        → high   (3)
    summary/excerpt only            → medium (2)
    category only                   → low    (1)

MIN_CONF = 2 (medium)  → schwache Category-only-Signale werden verworfen.

Negative Guards verhindern False Positives (Personalie-„Rente", Bau-Zins ≠
Spar-Zins, Unternehmens-Anleihe ≠ Sparzins, „Bank" ≠ Anlage-Aktien usw.).
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List, Optional

MIN_CONF = 2


@dataclass(frozen=True)
class TagRule:
    tag: str
    # Titel-Regex — jeder Treffer im Titel gibt +3
    title_patterns: tuple[re.Pattern, ...]
    # Summary/Excerpt-Regex — Treffer gibt +2
    summary_patterns: tuple[re.Pattern, ...] = ()
    # Kategorien, die schwaches Signal geben (+1)
    categories: tuple[str, ...] = ()
    # Negative Guards — Reject falls einer im Titel/Summary matcht
    negative: tuple[re.Pattern, ...] = ()


# ---------------------------------------------------------------------------
# Kanonische Tag-Taxonomie (Session 80.36) — kleine, kontrollierte Menge.
# Erweiterung nur wenn nachgelagerte Nutzung (Topic/Related/Search) profitiert.
# ---------------------------------------------------------------------------
RULES: tuple[TagRule, ...] = (
    # --- Zinsen / Sparen ---------------------------------------------------
    TagRule("ezb",
            (re.compile(r"\bezb\b", re.I), re.compile(r"\beurop[aä]ische\s+zentralbank\b", re.I)),
            (re.compile(r"\bezb\b", re.I),),
            ("zinsen",)),
    TagRule("leitzins",
            (re.compile(r"\bleitzins(?:entscheid|schritt|erh[oö]hung|senkung|es)?\b", re.I),),
            (re.compile(r"\bleitzins", re.I),),
            ("zinsen",),
            negative=(re.compile(r"\bbauzins", re.I),)),
    TagRule("tagesgeld",
            (re.compile(r"\btagesgeld", re.I),),
            (re.compile(r"\btagesgeld", re.I),)),
    TagRule("festgeld",
            (re.compile(r"\bfestgeld", re.I),),
            (re.compile(r"\bfestgeld", re.I),)),
    TagRule("sparzinsen",
            (re.compile(r"\bsparzins", re.I), re.compile(r"\beinlagenzins", re.I)),
            (re.compile(r"\bsparer\b", re.I), re.compile(r"\bsparzins", re.I))),
    # --- Vorsorge / Rente --------------------------------------------------
    TagRule("rente",
            (re.compile(r"\bgesetzliche\s+rente\b", re.I),
             re.compile(r"\brente\s+mit\s+\d{2}\b", re.I),
             re.compile(r"\brentenniveau\w*\b", re.I),
             re.compile(r"\brentenpaket\w*\b", re.I),
             re.compile(r"\brentenbeitrag\w*\b", re.I)),
            (re.compile(r"\bgesetzliche\s+rente\b", re.I),),
            ("politik", "vorsorge"),
            negative=(
                re.compile(r"\b(?:vorstand|ceo|manager|geschäftsführer)[a-zäöüß]*\s+geht\s+in\s+rente", re.I),
            )),
    TagRule("altersvorsorge",
            (re.compile(r"\baltersvorsorge\b", re.I),
             re.compile(r"\bprivate\s+rente\b", re.I),
             re.compile(r"\bbetriebsrente\w*\b", re.I),
             re.compile(r"\br[üu]rup", re.I),
             re.compile(r"\briester", re.I)),
            (re.compile(r"\baltersvorsorge\b", re.I),)),
    TagRule("rentenreform",
            (re.compile(r"\brentenreform\w*\b", re.I),),
            (re.compile(r"\brentenreform", re.I),)),
    # --- Märkte ------------------------------------------------------------
    TagRule("dax",
            (re.compile(r"\bdax\b", re.I),),
            (re.compile(r"\bdax\b", re.I),),
            ("maerkte", "boerse")),
    TagRule("sp500",
            (re.compile(r"\bs&p\s*500\b", re.I), re.compile(r"\bs\s*&\s*p\s*500\b", re.I)),
            (re.compile(r"\bs&p\s*500\b", re.I),)),
    TagRule("nasdaq",
            (re.compile(r"\bnasdaq(?:\s*100)?\b", re.I),),
            (re.compile(r"\bnasdaq\b", re.I),)),
    TagRule("aktienmarkt",
            (re.compile(r"\baktienmarkt\w*\b", re.I),
             re.compile(r"\bb[oö]rse(?!ndienst|ntag)", re.I)),
            (re.compile(r"\baktienmarkt", re.I),),
            ("maerkte", "boerse")),
    TagRule("etf",
            (re.compile(r"\betf\b", re.I),
             re.compile(r"\betf[- ]?sparplan\w*\b", re.I),
             re.compile(r"\bindexfonds\b", re.I)),
            (re.compile(r"\betf\b", re.I),),
            negative=(re.compile(r"\bpetf\b", re.I),)),
    # --- Inflation / Makro --------------------------------------------------
    TagRule("inflation",
            (re.compile(r"\binflation\w*\b", re.I),
             re.compile(r"\bteuerung\w*\b", re.I),
             re.compile(r"\bverbraucherpreis\w*\b", re.I)),
            (re.compile(r"\binflation", re.I),)),
    TagRule("kaufkraft",
            (re.compile(r"\bkaufkraft\b", re.I), re.compile(r"\breall[oö]hn\w*\b", re.I)),
            (re.compile(r"\bkaufkraft\b", re.I),)),
    # --- Immobilien / Finanzierung -----------------------------------------
    TagRule("bauzinsen",
            (re.compile(r"\bbauzins", re.I), re.compile(r"\bhypothekenzins", re.I)),
            (re.compile(r"\bbauzins", re.I),)),
    TagRule("baufinanzierung",
            (re.compile(r"\bbaufinanzierung\w*\b", re.I),
             re.compile(r"\bimmobilienfinanzierung\w*\b", re.I)),
            (re.compile(r"\bbaufinanzierung", re.I),)),
    # --- Anlageklassen ------------------------------------------------------
    TagRule("aktien",
            (re.compile(r"\baktien?\b", re.I),),
            (re.compile(r"\baktion[aä]re?\b", re.I), re.compile(r"\baktienkurs", re.I)),
            ("maerkte", "boerse")),
    TagRule("anleihen",
            (re.compile(r"\banleihe[nr]?\b", re.I), re.compile(r"\bstaatsanleihe[nr]?\b", re.I),
             re.compile(r"\brendite[nr]?\b", re.I)),
            (re.compile(r"\bbondmarkt|\bkupon\b", re.I),)),
    TagRule("dividenden",
            (re.compile(r"\bdividenden?\w*\b", re.I), re.compile(r"\bausschüttung\w*\b", re.I)),
            (re.compile(r"\bdividende", re.I),),
            negative=(re.compile(r"\bgewinnwarnung\b", re.I),)),
    TagRule("gold",
            (re.compile(r"\bgold(?:preis|markt)?\b", re.I), re.compile(r"\bfeinunze\b", re.I)),
            (re.compile(r"\bgold\b", re.I),)),
)


def _score_rule(rule: TagRule, title: str, summary: str, category: str) -> int:
    """Rückgabe: höchste erreichte Confidence-Stufe (0..3) für dieses Tag."""
    combined = f"{title} {summary}"
    # Guards zuerst — Reject.
    for rx in rule.negative:
        if rx.search(combined):
            return 0

    conf = 0
    title_hits = sum(1 for rx in rule.title_patterns if rx.search(title))
    if title_hits >= 1:
        conf = max(conf, 3)
    if title_hits >= 2:
        conf = 3  # bereits max; expliziter Marker für „reinforcing"

    for rx in rule.summary_patterns:
        if rx.search(summary):
            conf = max(conf, 2)
            break

    if category and category.lower() in rule.categories:
        conf = max(conf, 1)

    return conf


def extract_news_tags(
    *,
    title: str = "",
    summary: str = "",
    excerpt: str = "",
    category: str = "",
) -> List[str]:
    """Zentrale Tag-Extraktion. Rückgabe: kanonische Tags mit Confidence ≥ MIN_CONF.

    Idempotent + deterministisch: gleiche Eingabe → gleiche Ausgabe.
    """
    t = (title or "").strip()
    s = f"{(summary or '').strip()} {(excerpt or '').strip()}".strip()
    c = (category or "").strip().lower()

    out: list[tuple[str, int]] = []
    for rule in RULES:
        conf = _score_rule(rule, t, s, c)
        if conf >= MIN_CONF:
            out.append((rule.tag, conf))
    # Stabil sortiert: höhere Confidence zuerst, dann alphabetisch.
    out.sort(key=lambda x: (-x[1], x[0]))
    return [tag for tag, _ in out]


def extract_tags_for_document(doc: dict) -> List[str]:
    return extract_news_tags(
        title=doc.get("title") or "",
        summary=doc.get("summary") or "",
        excerpt=doc.get("excerpt") or "",
        category=doc.get("category") or "",
    )
