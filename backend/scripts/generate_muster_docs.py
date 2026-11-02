"""Generates neutral MUSTER contract + product sheets (Festgeld, Flexgeld). No bank branding."""
from pathlib import Path

from weasyprint import HTML

OUT = Path("/app/frontend/public/muster")
FIRMA = "[Firmenname Vermittler]"
ADRESSE = "[Straße Nr., PLZ Ort]"
REG = "[Register-/Erlaubnisnummer]"
BANK = "[Partnerbank]"
BANK_ADR = "[Anschrift der Partnerbank]"

CSS = """
@page { size: A4; margin: 22mm 18mm 20mm 18mm;
  @top-right { content: "MUSTER"; font: 700 9pt sans-serif; color: #b45309; letter-spacing: 2px; }
  @bottom-left { content: "MUSTER – nicht zur Verwendung ohne Freigabe der Partnerbank"; font: 7.5pt sans-serif; color: #b45309; }
  @bottom-right { content: "Seite " counter(page) " von " counter(pages); font: 7.5pt sans-serif; color: #666; } }
body { font-family: "DejaVu Sans", sans-serif; font-size: 9pt; color: #1f2937; line-height: 1.45; }
.wm { position: fixed; top: 38%; left: 4%; transform: rotate(-35deg); font-size: 96pt; font-weight: 700;
  color: rgba(180,83,9,0.10); letter-spacing: 8px; z-index: -1; }
h1 { font-size: 17pt; margin: 0 0 4pt; color: #111827; }
h2 { font-size: 10.5pt; margin: 14pt 0 5pt; padding: 3pt 6pt; background: #f3f4f6; border-left: 3pt solid #374151; }
.sub { color: #4b5563; margin-bottom: 10pt; }
.banner { border: 1.2pt solid #b45309; color: #92400e; background: #fffbeb; padding: 6pt 8pt; margin: 8pt 0 12pt; font-weight: 700; }
table { width: 100%; border-collapse: collapse; margin: 4pt 0; }
td, th { border: 0.6pt solid #d1d5db; padding: 5pt 6pt; vertical-align: top; text-align: left; }
th { background: #f9fafb; width: 34%; font-weight: 600; }
td.f { height: 15pt; }
.two td { width: 50%; }
p { margin: 3pt 0 5pt; }
.para b { display: block; margin-top: 7pt; }
.sig { margin-top: 26pt; display: flex; gap: 14pt; }
.sig div { flex: 1; border-top: 0.8pt solid #111; padding-top: 3pt; font-size: 8pt; color: #374151; }
.box { display: inline-block; width: 8pt; height: 8pt; border: 0.8pt solid #111; margin-right: 5pt; vertical-align: -1pt; }
.small { font-size: 8pt; color: #4b5563; }
"""


def page(title: str, subtitle: str, body: str) -> str:
    return f"""<html><head><meta charset="utf-8"><style>{CSS}</style></head><body>
<div class="wm">MUSTER</div>
<h1>{title}</h1><div class="sub">{subtitle}</div>
<div class="banner">MUSTER – nicht zur Verwendung ohne Freigabe der Partnerbank. Vertragspartner für die Einlage ist
ausschließlich die Partnerbank; deren offizielle Vertragsunterlagen haben Vorrang.</div>
{body}</body></html>"""


def parties() -> str:
    return f"""<table>
<tr><th>Partnerbank (Einlagenkreditinstitut)</th><td>{BANK}<br>{BANK_ADR}</td></tr>
<tr><th>Vermittler</th><td>{FIRMA}<br>{ADRESSE}<br>{REG}</td></tr>
<tr><th>Antragsnummer / Datum</th><td class="f">[Antragsnummer] / [Datum]</td></tr></table>"""


def investor_tables() -> str:
    rows = ["Anrede / Titel", "Vorname*", "Nachname*", "Straße, Hausnummer*", "PLZ, Ort*", "Land*",
            "Geburtsdatum*", "Geburtsort*", "Staatsangehörigkeit*", "Steuer-ID*", "Telefon / Mobil", "E-Mail*"]
    legit = ["Ausweisart*", "Ausweisnummer*", "Ausstellende Behörde*", "Ausstellungsdatum*", "Gültig bis*"]
    head = "<tr><th></th><th>Anleger I</th><th>Anleger II / Bevollmächtigter</th></tr>"
    body = "".join(f"<tr><th>{r}</th><td class='f'></td><td class='f'></td></tr>" for r in rows)
    lbody = "".join(f"<tr><th>{r}</th><td class='f'></td><td class='f'></td></tr>" for r in legit)
    return f"""<h2>B. Angaben Anleger</h2><table>{head}{body}</table>
<p class="small">* Pflichtangaben</p>
<h2>C. Angaben Legitimation</h2><table>{head}{lbody}</table>
<h2>D. Referenzkonto</h2><table>
<tr><th>Kontoinhaber*</th><td class="f"></td></tr><tr><th>IBAN*</th><td class="f"></td></tr>
<tr><th>Kreditinstitut*</th><td class="f"></td></tr><tr><th>BIC*</th><td class="f"></td></tr></table>
<p class="small">Das Referenzkonto muss auf den Namen des/der Anleger(s) lauten. Auszahlungen erfolgen ausschließlich auf dieses Konto.</p>"""


def common_terms(start: int) -> str:
    n = start
    items = [
        ("Einlagensicherung", f"Einlagen bei {BANK} sind über das gesetzliche Einlagensicherungssystem des Sitzlandes der Partnerbank "
         "nach der EU-Richtlinie 2014/49/EU bis zu 100.000 EUR je Einleger und Kreditinstitut geschützt. Einzelheiten enthält der "
         "„Informationsbogen für den Einleger“ der Partnerbank, der vor Vertragsschluss auszuhändigen ist."),
        ("Steuern", "Zinserträge unterliegen den jeweils geltenden Steuergesetzen. In Deutschland unbeschränkt steuerpflichtige "
         "Anleger haben Zinserträge, soweit kein Steuerabzug erfolgt, in ihrer Steuererklärung anzugeben."),
        ("Widerrufsrecht", "Der Anleger kann seine Vertragserklärung innerhalb von 14 Tagen ohne Angabe von Gründen widerrufen. "
         "Maßgeblich ist die gesonderte Widerrufsbelehrung der Partnerbank."),
        ("Datenschutz", f"Personenbezogene Daten werden von {BANK} und {FIRMA} nur zur Vertragsanbahnung und -durchführung sowie "
         "zur Erfüllung gesetzlicher Pflichten (u. a. Geldwäschegesetz) gemäß DSGVO verarbeitet."),
        ("Kosten", "Für Eröffnung und Führung entstehen keine Kosten, soweit das Preis- und Leistungsverzeichnis der Partnerbank "
         "nichts anderes bestimmt. [Ggf. Vergütung des Vermittlers angeben]"),
        ("Anwendbares Recht / Gerichtsstand", "[Gemäß Vertragsbedingungen der Partnerbank]"),
        ("Rangfolge", "Bei Abweichungen gehen die Allgemeinen Geschäftsbedingungen und Sonderbedingungen der Partnerbank diesem Muster vor."),
    ]
    out = []
    for title, text in items:
        out.append(f"<b>§ {n} {title}</b><p>{text}</p>")
        n += 1
    return "".join(out)


def signatures() -> str:
    return f"""<h2>F. Erklärungen</h2>
<p><span class="box"></span>Ich handle auf eigene Rechnung und im eigenen wirtschaftlichen Interesse.</p>
<p><span class="box"></span>Ich habe Produktinformationsblatt, Informationsbogen für den Einleger, Widerrufsbelehrung,
Datenschutzhinweise sowie die Vertragsbedingungen der Partnerbank erhalten.</p>
<p><span class="box"></span>Ich bin nicht US-Staatsbürger bzw. in den USA steuerpflichtig (FATCA).</p>
<h2>G. Unterschriften</h2>
<p class="small">Ort, Datum: ______________________________</p>
<div class="sig"><div>Unterschrift Anleger I</div><div>Unterschrift Anleger II / Bevollmächtigter</div><div>Vermittler {FIRMA}</div></div>
<p class="small" style="margin-top:12pt">Der Vertrag kommt erst mit Annahme durch die Partnerbank auf deren eigenen Unterlagen zustande.</p>"""


def contract(kind: str) -> str:
    if kind == "festgeld":
        cond = """<tr><th>Anlagebetrag (EUR)*</th><td class="f">[Betrag]</td></tr>
<tr><th>Zinssatz p. a. (fest)*</th><td class="f">[Zinssatz] %</td></tr>
<tr><th>Laufzeit (Monate)*</th><td class="f">[Laufzeit]</td></tr>
<tr><th>Zinszahlung</th><td class="f">[bei Fälligkeit / jährlich]</td></tr>"""
        terms = f"""<b>§ 1 Vertragsgegenstand</b><p>Eröffnung eines Festgeldkontos bei {BANK} zur Anlage eines festen Betrags für eine
feste Laufzeit zu einem bei Vertragsschluss vereinbarten, unveränderlichen Zinssatz. Das Konto dient nicht dem Zahlungsverkehr.</p>
<b>§ 2 Vertragsschluss</b><p>Der Vertrag kommt mit Annahme durch die Partnerbank und Eingang des Anlagebetrags zustande.</p>
<b>§ 3 Legitimation</b><p>Die Identität aller Anleger ist vor Kontoeröffnung nach Geldwäschegesetz zu prüfen.</p>
<b>§ 4 Verzinsung</b><p>Die Verzinsung beginnt mit Eingang des Anlagebetrags und endet mit Ablauf der Laufzeit.</p>
<b>§ 5 Fälligkeit</b><p>Bei Fälligkeit werden Anlagebetrag und Zinsen auf das Referenzkonto ausgezahlt. Eine automatische
Verlängerung erfolgt nicht.</p>
<b>§ 6 Vorzeitige Verfügung</b><p>Eine vorzeitige Verfügung ist grundsätzlich ausgeschlossen. [Ausnahmen gemäß Partnerbank]</p>"""
        return page("Antrag Festgeldkonto", "Mustervorlage – Vermittlung an eine Partnerbank",
                    parties() + f"<h2>A. Festgeldkonditionen</h2><table>{cond}</table>" + investor_tables()
                    + "<h2>E. Vertragsbedingungen (Auszug)</h2><div class='para'>" + terms + common_terms(7) + "</div>" + signatures())
    cond = """<tr><th>Anlagebetrag (EUR)*</th><td class="f">[Betrag]</td></tr>
<tr><th>Zinssatz p. a. (variabel, aktuell)*</th><td class="f">[Zinssatz] %</td></tr>
<tr><th>Zinsgutschrift</th><td class="f">[monatlich / quartalsweise / jährlich]</td></tr>
<tr><th>Verfügbarkeit</th><td class="f">[täglich / Kündigungsfrist ___ Tage]</td></tr>"""
    terms = f"""<b>§ 1 Vertragsgegenstand</b><p>Eröffnung eines Flexgeldkontos (Tagesgeld-/Einlagenkonto ohne feste Laufzeit) bei {BANK}.
Das Konto dient nicht dem allgemeinen Zahlungsverkehr.</p>
<b>§ 2 Vertragsschluss</b><p>Der Vertrag kommt mit Annahme durch die Partnerbank und Eingang der ersten Einzahlung zustande.</p>
<b>§ 3 Legitimation</b><p>Die Identität aller Anleger ist vor Kontoeröffnung nach Geldwäschegesetz zu prüfen.</p>
<b>§ 4 Verzinsung</b><p>Das Guthaben wird variabel verzinst. Die Partnerbank kann den Zinssatz entsprechend ihren Bedingungen
anpassen und informiert den Anleger vorab. Zinsen werden [Gutschriftrhythmus] gutgeschrieben.</p>
<b>§ 5 Ein- und Auszahlungen</b><p>Weitere Einzahlungen sind bis zum Höchstbetrag möglich. Auszahlungen erfolgen ausschließlich
auf das Referenzkonto, [täglich / unter Einhaltung der Kündigungsfrist].</p>
<b>§ 6 Kündigung</b><p>Der Vertrag läuft auf unbestimmte Zeit und kann vom Anleger jederzeit, von der Partnerbank nach ihren
Bedingungen gekündigt werden. Das Guthaben samt Zinsen wird auf das Referenzkonto ausgezahlt.</p>"""
    return page("Antrag Flexgeldkonto", "Mustervorlage – Vermittlung an eine Partnerbank",
                parties() + f"<h2>A. Flexgeldkonditionen</h2><table>{cond}</table>" + investor_tables()
                + "<h2>E. Vertragsbedingungen (Auszug)</h2><div class='para'>" + terms + common_terms(7) + "</div>" + signatures())


def sheet(kind: str) -> str:
    fest = kind == "festgeld"
    name = "Festgeld" if fest else "Flexgeld"
    rows = [
        ("Produktbezeichnung", name),
        ("Produktart", "Termineinlage mit fester Laufzeit und festem Zins" if fest else "Einlage ohne feste Laufzeit mit variablem Zins"),
        ("Anbieter (Einlagenkreditinstitut)", f"{BANK}, {BANK_ADR}"),
        ("Vermittler", f"{FIRMA}, {ADRESSE}"),
        ("Zinssatz", "[Zinssatz] % p. a., fest für die gesamte Laufzeit" if fest else "[Zinssatz] % p. a., variabel (Stand: [Datum])"),
        ("Laufzeiten" if fest else "Verfügbarkeit", "[z. B. 6 / 12 / 24 Monate]" if fest else "[täglich / Kündigungsfrist ___ Tage]"),
        ("Mindest- / Höchstanlage", "[Mindestbetrag] EUR / [Höchstbetrag] EUR"),
        ("Einlagensicherung", "bis 100.000 EUR je Einleger und Bank (EU-Richtlinie 2014/49/EU), [Sicherungssystem der Partnerbank]"),
        ("Vorzeitige Verfügung" if fest else "Zinsänderung", "grundsätzlich nicht möglich" if fest else "durch die Partnerbank möglich, Vorabinformation an den Anleger"),
        ("Verlängerung" if fest else "Kündigung", "keine automatische Verlängerung" if fest else "jederzeit durch den Anleger"),
        ("Kosten", "[keine / laut Preisverzeichnis der Partnerbank]"),
    ]
    table = "".join(f"<tr><th>{k}</th><td>{v}</td></tr>" for k, v in rows)
    desc = ("Festgeld ist eine Geldanlage, bei der ein fester Betrag für eine vorab vereinbarte Laufzeit zu einem festen Zinssatz "
            "angelegt wird. Ertrag und Rückzahlungstermin stehen bei Vertragsschluss fest; während der Laufzeit ist das Geld gebunden."
            if fest else
            "Flexgeld ist eine Einlage ohne feste Laufzeit. Das Guthaben bleibt [täglich] verfügbar und wird variabel verzinst; "
            "der Zinssatz kann sich während der Anlagedauer ändern.")
    risks = ("Zinsänderungen nach Vertragsschluss wirken sich nicht aus (Chance und Risiko). Bei steigenden Marktzinsen kann "
             "nicht in besser verzinste Anlagen gewechselt werden. Inflation kann die reale Rendite mindern."
             if fest else
             "Der Zinssatz kann sinken. Inflation kann die reale Rendite mindern.")
    body = f"""<h2>A. Produktübersicht</h2><table>{table}</table>
<div class="para">
<b>I. Produktbeschreibung</b><p>{desc}</p>
<b>II. Währung</b><p>Euro (EUR).</p>
<b>III. Einlagensicherung</b><p>Geschützt bis 100.000 EUR je Einleger und Kreditinstitut inklusive Zinsen über das gesetzliche
Sicherungssystem des Sitzlandes der Partnerbank. Maßgeblich ist der „Informationsbogen für den Einleger“ der Partnerbank.</p>
<b>IV. Chancen und Risiken</b><p>{risks} Es besteht ein Ausfallrisiko der Partnerbank, soweit die Einlage den gesicherten Betrag übersteigt.</p>
<b>V. Steuern</b><p>Zinserträge sind steuerpflichtig. Bei in Deutschland unbeschränkt Steuerpflichtigen gilt in der Regel die
Abgeltungsteuer von 25 % zzgl. Solidaritätszuschlag und ggf. Kirchensteuer; der Sparer-Pauschbetrag beträgt 1.000 EUR
(2.000 EUR bei Zusammenveranlagung). Ob die Partnerbank Steuern einbehält, richtet sich nach ihrem Sitzland; ggf. sind die
Erträge in der Steuererklärung anzugeben.</p>
<b>VI. Hinweise</b><p>Kontoeröffnung nur mit unterschriebenem Antrag und gültigem Ausweisdokument. Dieses Informationsblatt
ersetzt keine Anlageberatung und nicht die Vertragsunterlagen der Partnerbank.</p></div>
<p class="small">Stand: [Datum]</p>"""
    return page(f"Produktinformationsblatt {name}", "Mustervorlage – Vermittlung an eine Partnerbank", body)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for kind in ("festgeld", "flexgeld"):
        HTML(string=contract(kind)).write_pdf(OUT / f"Muster_Antrag_{kind.capitalize()}.pdf")
        HTML(string=sheet(kind)).write_pdf(OUT / f"Muster_Produktinformationsblatt_{kind.capitalize()}.pdf")
    print(sorted(p.name for p in OUT.iterdir()))
