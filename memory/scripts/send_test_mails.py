"""Sendet alle 6 neuen Kunden-Mails (Stil B) als [TEST] an die Owner-Adresse."""
import asyncio
import sys

sys.path.insert(0, "/app/backend")
from services.customer_mails import render  # noqa: E402
import server  # noqa: E402

TO = sys.argv[1]
MAILS = [
    ("Willkommen bei der Fröhlich Vermögensberatung", render(
        "Herzlich willkommen, Max Mustermann", "Ihr Kundenkonto ist eingerichtet und ab sofort aktiv.",
        [("E-Mail", "max.mustermann@beispiel.de"), ("Eröffnet am", "27.10.2026")], "Zum Kundenbereich", "/login",
        steps=["Persönliche Angaben vervollständigen", "Sparangebote vergleichen", "Anlage beantragen"])),
    ("Ihre Unterlagen sind bei uns eingegangen", render(
        "Vielen Dank, Max Mustermann", "Wir haben Ihre Unterlagen sicher erhalten und prüfen sie in Kürze.",
        [("Dateien", "Personalausweis.pdf"), ("Eingegangen am", "27.10.2026, 14:32 Uhr"), ("Vorgangsnummer", "DU-7F3A21")],
        "Zur Website", "/", steps=["Prüfung durch unser Team", "Rückmeldung per E-Mail oder Telefon"])),
    ("Ihr Auszahlungsantrag ist eingegangen", render(
        "Auszahlungsantrag erhalten", "Ihr Antrag wird geprüft. Der Betrag ist bis zur Freigabe für Sie reserviert.",
        [("Betrag", "2.500,00 €"), ("Empfängerkonto", "DE89 •••• •••• 3000"), ("Kontoinhaber", "Max Mustermann")],
        "Antrag ansehen", "/dashboard/uebersicht", steps=["Prüfung durch unser Team", "Überweisung auf Ihr Referenzkonto"])),
    ("Ihre Auszahlung wurde freigegeben", render(
        "Ihre Auszahlung ist freigegeben", "Wir haben die Überweisung auf Ihr Referenzkonto veranlasst. Der Betrag wurde von Ihrem Guthaben abgebucht.",
        [("Betrag", "2.500,00 €"), ("Empfängerkonto", "DE89 •••• •••• 3000"), ("Status", "Freigegeben")],
        "Kontoverlauf ansehen", "/dashboard/uebersicht")),
    ("Ihr Auszahlungsantrag wurde abgelehnt", render(
        "Ihr Auszahlungsantrag wurde abgelehnt", "Der Betrag steht Ihnen wieder in voller Höhe zur Verfügung.",
        [("Betrag", "2.500,00 €"), ("Status", "Abgelehnt"), ("Grund", "Referenzkonto stimmt nicht mit dem Kontoinhaber überein")],
        "Kontoverlauf ansehen", "/dashboard/uebersicht", note="Bei Fragen erreichen Sie uns unter kundenservice@essenceinvest.com.")),
    ("Neues Dokument in Ihrem Kundenbereich", render(
        "Ein neues Dokument liegt für Sie bereit", "Wir haben ein Dokument in Ihrem Kundenbereich hinterlegt.",
        [("Dokument", "Festgeldvertrag ING Belgien"), ("Bereitgestellt am", "27.10.2026")], "Dokument öffnen", "/dashboard/dokumente")),
    ("Ihr Kaufauftrag wurde ausgeführt", render(
        "Auftrag ausgeführt: Kauf SAP SE", "Ihr Auftrag wurde erfolgreich ausgeführt und in Ihrem Depot gebucht.",
        [("Wertpapier", "SAP SE (SAP)"), ("Art", "Kauf"), ("Stückzahl", "10"), ("Ausführungskurs", "212,40 €"), ("Gesamtbetrag", "2.124,00 €")],
        "Zum Depot", "/dashboard/depot")),
]


async def main():
    for subject, html in MAILS:
        try:
            await server._send_email_via_emergent(to=TO, subject=f"[TEST] {subject}", html=html)
            print("OK", subject)
        except Exception as exc:
            print("FAIL", subject, exc)
        await asyncio.sleep(1.2)

asyncio.run(main())
