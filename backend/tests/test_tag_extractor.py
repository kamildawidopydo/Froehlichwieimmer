"""Session 80.36 — Unit-Tests für `tag_extractor.extract_news_tags`."""
import pytest

from tag_extractor import extract_news_tags


POSITIVE = [
    # (title, summary, category, expected_tags_subset)
    ("EZB senkt Leitzins um 25 Basispunkte", "Notenbank passt an", "zinsen", {"ezb", "leitzins"}),
    ("Tagesgeld-Zinsen sinken auf breiter Front", "Sparer erhalten weniger", "zinsen", {"tagesgeld", "sparzinsen"}),
    ("DAX schließt auf neuem Hoch", "Aktienmarkt legt zu", "maerkte", {"dax", "aktienmarkt"}),
    ("Rentenreform: Bundesregierung plant Anhebung des Rentenniveaus", "Rentenbeitrag steigt", "politik", {"rente", "rentenreform"}),
    ("ETF-Zuflüsse Europa neues Jahreshoch", "Fondszuflüsse steigen", "fonds-etfs", {"etf"}),
    ("Inflation trifft Verbraucher — Reallöhne unter Druck", "Kaufkraft sinkt", "wirtschaft", {"inflation", "kaufkraft"}),
    ("Bauzinsen steigen deutlich", "Immobilienkredite werden teurer", "zinsen", {"bauzinsen"}),
    ("Dividendenankündigung von SAP begeistert Aktionäre", "Ausschüttung erhöht", "unternehmen", {"dividenden"}),
    ("Goldpreis auf Rekordhoch — 4.000 US-Dollar je Feinunze", "Anleger flüchten in Gold", "maerkte", {"gold"}),
]


@pytest.mark.parametrize("title,summary,category,expected", POSITIVE)
def test_positive_tags(title, summary, category, expected):
    tags = set(extract_news_tags(title=title, summary=summary, category=category))
    missing = expected - tags
    assert not missing, f"missing expected tags {missing} — got {tags}"


NEGATIVE_CASES = [
    # Personalie „Rente" — kein rente-Tag
    ("Vorstand Meier geht in Rente", "Nachfolger gesucht", "unternehmen", {"rente"}),
    # Bauzinsen ≠ Leitzins
    ("Bauzinsen erreichen 4-Jahres-Hoch", "Immobilienkäufer betroffen", "zinsen", {"leitzins"}),
    # Gewinnwarnung ≠ Dividende
    ("Gewinnwarnung bei VW — Dividende in Gefahr", "Aktionäre bangen", "unternehmen", {"dividenden"}),
]


@pytest.mark.parametrize("title,summary,category,not_expected", NEGATIVE_CASES)
def test_negative_guards(title, summary, category, not_expected):
    tags = set(extract_news_tags(title=title, summary=summary, category=category))
    bad = tags & not_expected
    assert not bad, f"unexpected tags {bad} — got {tags}"


def test_idempotent():
    a = extract_news_tags(title="DAX steigt", summary="Aktienmarkt", category="maerkte")
    b = extract_news_tags(title="DAX steigt", summary="Aktienmarkt", category="maerkte")
    assert a == b


def test_empty_returns_empty():
    assert extract_news_tags(title="", summary="", category="") == []


def test_weak_category_only_below_threshold():
    # Nur Kategorie-Signal (+1) → unter MIN_CONF (2) → kein Tag
    tags = extract_news_tags(title="Kurzmeldung", summary="Kurzer Text ohne Signale", category="zinsen")
    # `ezb`/`leitzins`/etc dürfen NICHT nur wegen Kategorie „zinsen" gesetzt werden.
    for forbidden in ("ezb", "leitzins", "tagesgeld", "festgeld"):
        assert forbidden not in tags, f"weak category-only match: {forbidden}"
