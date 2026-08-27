"""Session 80.31 — Unit-Tests für `topic_mapper.classify_article`.

Prüft: Confidence-Threshold, Negative Guards, Rückgabe-Slugs, Idempotenz.
"""
import pytest

from topic_mapper import classify_article, VALID_SLUGS, HIGH_CONFIDENCE_THRESHOLD


# ---------------------------------------------------------------------------
# Fälle, die IMMER matchen sollen (High-Confidence)
# ---------------------------------------------------------------------------
POSITIVE_CASES = [
    # (title, summary, category, tags, expected_slug)
    ("DAX beendet Woche mit Tagesgewinn", "Der Aktienindex...", "maerkte", [], "aktien"),
    ("ETF-Zuflüsse Europa neues Jahreshoch", "Fondszuflüsse steigen", "fonds-etfs", [], "aktien"),
    ("Deutsche Bank Aktie klettert auf 15-Jahres-Hoch", "Aktionäre freuen sich", "maerkte", [], "aktien"),
    ("EZB senkt Leitzins um 25 Basispunkte", "Die Notenbank passt an", "zinsen", [], "anleihen"),
    ("Nvidia-Zahlen treiben S&P 500 an", "Der Index legt zu", "maerkte", [], "aktien"),
]


@pytest.mark.parametrize("title,summary,category,tags,expected", POSITIVE_CASES)
def test_positive_high_confidence_match(title, summary, category, tags, expected):
    m = classify_article(title=title, summary=summary, category=category, tags=tags)
    assert m is not None, f"expected {expected}, got None"
    assert m.slug == expected
    assert m.slug in VALID_SLUGS
    assert m.confidence >= HIGH_CONFIDENCE_THRESHOLD


# ---------------------------------------------------------------------------
# Fälle, die BEWUSST kein Topic bekommen (Low-Confidence oder Negative-Guard)
# ---------------------------------------------------------------------------
NEGATIVE_CASES = [
    # Personalie mit „Aktie" im Titel → Negative Guard
    ("Neuer CEO wechselt zu SAP", "Vorstandswechsel bei SAP", "unternehmen", []),
    # Politik ohne Anlagerbezug
    ("Kanzler kündigt Steuerreform an", "Neue Regeln geplant", "politik", []),
    # Klima ohne Investmentbezug
    ("Klimapolitik unter Druck", "Umweltschutz-Debatte", "politik", []),
    # Inflation ohne Zins-/Sparbezug — bewusst NICHT klassifiziert (kein passender Slug)
    ("Reallöhne steigen — Kaufkraft nimmt zu", "Preisniveau...", "wirtschaft", []),
    # Rente-Thema — bewusst NICHT klassifiziert (kein passender Slug)
    ("Merz will Rente mit 63 abschaffen", "Rentenreform geplant", "politik", []),
    # Immobilie ohne Finanzierungssignal
    ("Wohnungsmarkt zeigt regionale Unterschiede", "Marktbericht", "wirtschaft", []),
]


@pytest.mark.parametrize("title,summary,category,tags", NEGATIVE_CASES)
def test_negative_no_match(title, summary, category, tags):
    m = classify_article(title=title, summary=summary, category=category, tags=tags)
    assert m is None, f"expected None, got {m.slug} (score={m.confidence}): {m.reasons}"


def test_reject_via_negative_guard():
    """„Rezession" im Titel darf `anleihen` nicht triggern (Guard)."""
    m = classify_article(
        title="Rezession trifft Bundesbank-Prognose",
        summary="Konjunktur schwächelt",
        category="wirtschaft",
    )
    assert m is None or m.slug != "anleihen"


def test_gewinnwarnung_not_dividenden():
    """Gewinnwarnung ist keine Dividenden-Meldung."""
    m = classify_article(
        title="Gewinnwarnung bei Volkswagen — Dividende in Gefahr",
        summary="Aktionäre bangen",
        category="unternehmen",
    )
    # Negative Guard von 'dividenden' rejected — 'aktien' darf matchen
    # (weil starker Titel- + Summary-Signal), aber NIEMALS 'dividenden'.
    assert m is None or m.slug != "dividenden"


def test_all_returned_slugs_are_valid():
    """Sicherheitsnetz: jede Rückgabe muss im VALID_SLUGS-Set liegen."""
    for cfg in POSITIVE_CASES:
        m = classify_article(title=cfg[0], summary=cfg[1], category=cfg[2], tags=cfg[3])
        if m:
            assert m.slug in VALID_SLUGS


def test_idempotent_result():
    """Zwei aufeinanderfolgende Klassifikationen desselben Artikels müssen
    identisches Ergebnis liefern (kein Random, keine State-Leaks)."""
    a = classify_article(title="DAX bleibt über 26.000 Punkten", summary="Aktienmarkt", category="maerkte")
    b = classify_article(title="DAX bleibt über 26.000 Punkten", summary="Aktienmarkt", category="maerkte")
    assert a is not None and b is not None
    assert a.slug == b.slug and a.confidence == b.confidence
