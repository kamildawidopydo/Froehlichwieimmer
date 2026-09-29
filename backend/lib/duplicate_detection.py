"""Session 93 · Phase 3 — Bank-Duplicate-Detection & Canonical Resolution.

Ordnet einen freien Bankname/Alias einem bekannten `banks.slug` zu. Legt
NIEMALS automatisch neue Banken an — bei unsicheren Matches wird
`needs_review` gesetzt und die Entscheidung an den Admin delegiert.
"""
from __future__ import annotations
import re
from typing import Any, Awaitable, Callable, Dict, List, Optional


_WS = re.compile(r"\s+")
_NON_ALNUM = re.compile(r"[^a-z0-9]+")


def normalize_name(s: Optional[str]) -> str:
    if not s:
        return ""
    s = s.lower().strip()
    # Deutsche Umlaute
    s = s.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    s = _NON_ALNUM.sub(" ", s)
    tokens = [t for t in s.split() if t]
    # Rechtsform-/Filial-Stopwords (bewusst schmal → wir wollen den Kern des
    # Bank-Namens behalten, damit "Deutsche Bank" nicht komplett verschwindet).
    stopwords = {
        "ag", "gmbh", "sa", "nv", "bv", "spa", "plc", "srl",
        "group", "holding", "international",
    }
    tokens = [t for t in tokens if t not in stopwords]
    # 1-Zeichen-Tokens sind Artefakte von "S.A."/"N.V." nach Non-Alnum-Split
    # und selten sinnvoll → entfernen.
    tokens = [t for t in tokens if len(t) > 1]
    return " ".join(tokens)


def similarity(a: str, b: str) -> float:
    """Sehr einfaches Ähnlichkeitsmaß (Jaccard über Wort-Bigramme)."""
    if not a or not b:
        return 0.0
    ta = _wordset(a); tb = _wordset(b)
    if not ta or not tb:
        return 0.0
    inter = len(ta & tb)
    union = len(ta | tb)
    return inter / union if union else 0.0


def _wordset(s: str) -> set:
    words = s.split()
    grams = set(words)
    for i in range(len(words) - 1):
        grams.add(words[i] + "_" + words[i + 1])
    return grams


class ResolvedBank(dict):
    @classmethod
    def match(cls, slug: str, confidence: str) -> "ResolvedBank":
        return cls(slug=slug, confidence=confidence, needs_review=False)

    @classmethod
    def ambiguous(cls, candidates: List[Dict[str, Any]]) -> "ResolvedBank":
        return cls(slug=None, confidence="low", needs_review=True, candidates=candidates)

    @classmethod
    def unknown(cls) -> "ResolvedBank":
        return cls(slug=None, confidence="none", needs_review=True, candidates=[])


async def resolve_bank(
    hint: Dict[str, Any],
    banks_collection,
    aliases_collection,
) -> ResolvedBank:
    """Löst einen Import-Hint zu einer kanonischen Bank auf.

    Reihenfolge:
        1. `bank_slug` in `banks`.
        2. Alias-Tabelle (exact-normalized).
        3. Fuzzy-Match über Bank-Namen (nur wenn Similarity ≥ 0.9).
    Sonst → needs_review.
    """
    slug = (hint.get("bank_slug") or "").strip().lower()
    if slug:
        b = await banks_collection.find_one({"slug": slug})
        if b:
            return ResolvedBank.match(slug, "exact")

    name = hint.get("bank_name") or hint.get("name")
    if not name:
        return ResolvedBank.unknown()
    norm = normalize_name(name)

    alias = await aliases_collection.find_one({"normalized": norm})
    if alias:
        return ResolvedBank.match(alias["canonical_slug"], "alias")

    # Fuzzy fallback (nie automatisch anlegen).
    candidates: List[Dict[str, Any]] = []
    async for b in banks_collection.find({}, {"slug": 1, "name": 1, "legal_name": 1}):
        for candidate_name in filter(None, [b.get("name"), b.get("legal_name")]):
            sim = similarity(norm, normalize_name(candidate_name))
            if sim >= 0.75:
                candidates.append({"slug": b["slug"], "name": b.get("name"), "similarity": round(sim, 2)})
                break
    candidates.sort(key=lambda x: -x["similarity"])
    if candidates and candidates[0]["similarity"] >= 0.9:
        return ResolvedBank.match(candidates[0]["slug"], "high")
    if candidates:
        return ResolvedBank.ambiguous(candidates[:5])
    return ResolvedBank.unknown()
