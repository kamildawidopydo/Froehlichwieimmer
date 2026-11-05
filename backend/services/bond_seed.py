"""Idempotenter Seed der Rabobank-Zertifikate (XS1002121454) in bond_catalog.

Läuft beim Backend-Start: legt den Datensatz nur an, wenn die ISIN fehlt
($setOnInsert + unique ISIN-Index). Bestehende Daten werden nie überschrieben.
Neu angelegt mit gesperrter Kaufanfrage-Funktion (requests_enabled=False).
"""
from datetime import datetime, timezone

from services.bond_audit import write_audit, record_price

ISIN = "XS1002121454"

RISK_DETAILS = (
    "Nachrangigkeit: Rabobank-Zertifikate sind das am tiefsten nachrangige Kapitalinstrument der Rabobank "
    "(hartes Kernkapital, CET1). Im Fall einer Insolvenz oder Abwicklung werden Anleger erst nach allen übrigen "
    "Gläubigern bedient.\n"
    "Unbefristete Laufzeit: Es gibt keinen Fälligkeitstermin und keinen Anspruch auf Rückzahlung des Kapitals. "
    "Ein Ausstieg ist nur durch Verkauf über die Börse (Euronext Amsterdam) zum dann aktuellen Kurs möglich.\n"
    "Keine garantierten Ausschüttungen: Ob, in welcher Höhe und zu welchem Termin ausgeschüttet wird, entscheidet "
    "der Vorstand der Rabobank nach freiem Ermessen; ausgefallene Zahlungen werden nicht nachgeholt.\n"
    "Verlustbeteiligung: Als Kernkapital tragen die Zertifikate Verluste der Bank mit. Zudem können "
    "Abwicklungsbehörden Maßnahmen bis zur Herabschreibung anordnen.\n"
    "Kurs- und Liquiditätsrisiko: Der Kurs kann deutlich schwanken und unter den Kaufkurs fallen.\n"
    "Ein teilweiser oder vollständiger Verlust des eingesetzten Kapitals ist möglich."
)

VERIFICATION_NOTE = (
    "Herausgeber geprüft (rabobank.com, Prospekt vom 25.06.2025): Seit 26.06.2025 werden die Zertifikate direkt "
    "von der Coöperatieve Rabobank U.A. ausgegeben; die Verwaltung durch die Stichting AK Rabobank Certificaten "
    "wurde beendet (ISIN unverändert). Verifizierung ausstehend: Laut Ausschüttungspolitik vom 26.06.2025 liegen "
    "Höhe und Termine der Ausschüttungen im Ermessen des Vorstands – fester Kupon 6,5 % und Quartalstermine "
    "(Prospekt 2014) bitte gegen die aktuelle Ausschüttungspolitik bestätigen."
)

DOC = {
    "isin": ISIN,
    "wkn": "A1ZCS8",
    "bond_name": "Coöperatieve Rabobank U.A.-Anleihe",
    "issuer": "Coöperatieve Rabobank U.A.",
    "legal_issuer": "Coöperatieve Rabobank U.A. (bis 26.06.2025 über Stichting AK Rabobank Certificaten)",
    "legal_issuer_status": "verified",
    "terms_status": "pending",
    "verification_note": VERIFICATION_NOTE,
    "security_type": "Rabobank Certificates – unbefristetes, tief nachrangiges Kapitalinstrument (CET1)",
    "kupon_rate": 6.5,
    "currency": "EUR",
    "country": "NL",
    "issue_date": "2014-01-27",
    "faelligkeitsdatum": None,
    "is_perpetual": True,
    "zinsfrequenz": "vierteljährlich (laut Prospekt 2014)",
    "zinstermine": "29.03., 29.06., 29.09., 29.12.",
    "denomination": 25.0,
    "min_order_eur": 1000.0,
    "aktueller_kurs": 108.75,
    "kaufkurs": None,
    "verkaufskurs": None,
    "kurs_typ": "reference",
    "kurs_hinweis": "Referenzkurs – Stand der bereitgestellten Abbildung",
    "kurs_quelle": "Bereitgestellte Abbildung (kein bestätigter Marktpreis)",
    "kurs_datum": None,
    "kursveraenderung_abs": 0.37,
    "kursveraenderung_pct": 0.34,
    "description": (
        "Rabobank Certificates mit einem Nennwert von 25 € je Stück, ausgegeben am 27.01.2014 mit einer "
        "Ausschüttung von 6,5 % p. a. Unbefristet, notiert an der Euronext Amsterdam. Seit 26.06.2025 direkt "
        "von der Coöperatieve Rabobank U.A. ausgegeben."
    ),
    "risk_note": "Nachrangig, unbefristet, Zinszahlung nicht garantiert.",
    "risk_details": RISK_DETAILS,
    "is_available": True,
    "requests_enabled": False,
    "source": "manual",
    "is_manual_override": True,
}

SEED_USER = {"email": "system-seed", "id": ""}


async def ensure_rabobank_bond(db) -> bool:
    """True, wenn neu angelegt. Überschreibt nie bestehende Datensätze."""
    now = datetime.now(timezone.utc)
    doc = {**DOC, "created_at": now, "updated_at": now, "price_updated_at": now}
    res = await db.bond_catalog.update_one({"isin": ISIN}, {"$setOnInsert": doc}, upsert=True)
    if not res.upserted_id:
        return False
    await write_audit(db, "bond", res.upserted_id, "create", None, doc, SEED_USER)
    await record_price(db, res.upserted_id, doc, SEED_USER)
    return True
