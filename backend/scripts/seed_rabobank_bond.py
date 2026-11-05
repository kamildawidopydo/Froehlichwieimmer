"""Legt die Rabobank-Anleihe (XS1002121454) idempotent im bond_catalog an.

Daten geprüft gegen den Emissionsprospekt der Rabobank Certificates (27.01.2014).
Aufruf: cd /app/backend && python scripts/seed_rabobank_bond.py
"""
import asyncio
import os
import sys
from datetime import datetime, timezone

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

from services.bond_audit import write_audit, record_price  # noqa: E402

ISIN = "XS1002121454"

RISK_DETAILS = (
    "Nachrangigkeit: Die Rabobank-Zertifikate zählen zum am tiefsten nachrangigen Kapital der Rabobank. "
    "Im Fall einer Insolvenz oder Abwicklung werden Anleger erst nach allen übrigen Gläubigern bedient.\n"
    "Unbefristete Laufzeit: Es gibt keinen Fälligkeitstermin und keinen Anspruch auf Rückzahlung des Kapitals. "
    "Ein Ausstieg ist nur durch Verkauf über die Börse (Euronext Amsterdam) zum dann aktuellen Kurs möglich.\n"
    "Keine garantierten Zinszahlungen: Ausschüttungen liegen im Ermessen der Rabobank und können ganz oder "
    "teilweise ausfallen; ausgefallene Zahlungen werden nicht nachgeholt.\n"
    "Verlustbeteiligung: Die Bedingungen sehen eine Verlustbeteiligung (Herabschreibung) vor. Zudem können "
    "Abwicklungsbehörden Maßnahmen bis zur Herabschreibung oder Umwandlung anordnen.\n"
    "Kurs- und Liquiditätsrisiko: Der Kurs kann deutlich schwanken und unter den Kaufkurs fallen.\n"
    "Ein teilweiser oder vollständiger Verlust des eingesetzten Kapitals ist möglich."
)

DOC = {
    "isin": ISIN,
    "wkn": "A1ZCS8",
    "bond_name": "Coöperatieve Rabobank U.A.-Anleihe",
    "issuer": "Coöperatieve Rabobank U.A.",
    "legal_issuer": "Stichting AK Rabobank Certificaten",
    "security_type": "Rabobank Certificates – unbefristete, tief nachrangige Kapitalinstrumente",
    "kupon_rate": 6.5,
    "currency": "EUR",
    "country": "NL",
    "issue_date": "2014-01-27",
    "faelligkeitsdatum": None,
    "is_perpetual": True,
    "zinsfrequenz": "vierteljährlich",
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
        "Rabobank Certificates mit einer Ausschüttung von 6,5 % p. a. auf den Nennwert von 25 € je Stück, "
        "zahlbar vierteljährlich am 29.03., 29.06., 29.09. und 29.12. Ausgegeben am 27.01.2014, "
        "unbefristet, notiert an der Euronext Amsterdam."
    ),
    "risk_note": "Nachrangig, unbefristet, Zinszahlung nicht garantiert.",
    "risk_details": RISK_DETAILS,
    "is_available": True,
    "requests_enabled": True,
    "source": "manual",
    "is_manual_override": True,
}

SEED_USER = {"email": "system-seed", "id": ""}


async def main():
    db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    if await db.bond_catalog.find_one({"isin": ISIN}):
        print("exists – unchanged")
        return
    now = datetime.now(timezone.utc)
    doc = {**DOC, "created_at": now, "updated_at": now, "price_updated_at": now}
    res = await db.bond_catalog.insert_one(doc)
    await write_audit(db, "bond", res.inserted_id, "create", None, doc, SEED_USER)
    await record_price(db, res.inserted_id, doc, SEED_USER)
    print("inserted", res.inserted_id)


asyncio.run(main())
