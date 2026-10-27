"""Erzeugt Entwurfs-Vorschauen (3 Stile je E-Mail-Bereich) als HTML."""
import json
import os

OUT = "/app/memory/mail_drafts"
os.makedirs(OUT, exist_ok=True)
FIRM = "Fröhlich Vermögensberatung GmbH · Bösgrunder Weg 62 · 55543 Bad Kreuznach"
LEGAL = "Amtsgericht Bad Kreuznach · HRB 23436 · Geschäftsführer: Manfred Franz Fröhlich"

AREAS = {
    "10_willkommen": {
        "label": "10 · Willkommen bei Kontoeröffnung",
        "subject": "Willkommen bei der Fröhlich Vermögensberatung",
        "title": "Herzlich willkommen, Max Mustermann",
        "lead": "Ihr Kundenkonto ist eingerichtet und ab sofort aktiv.",
        "rows": [("E-Mail", "max.mustermann@beispiel.de"), ("Kundennummer", "FV-2026-00418"), ("Eröffnet am", "27.10.2026")],
        "steps": ["Persönliche Angaben vervollständigen", "Sparangebote vergleichen", "Anlage beantragen"],
        "cta": "Zum Kundenbereich",
    },
    "11_dokument": {
        "label": "11 · Eingangsbestätigung Dokument-Upload",
        "subject": "Ihre Unterlagen sind bei uns eingegangen",
        "title": "Vielen Dank, Max Mustermann",
        "lead": "Wir haben Ihre Unterlagen sicher erhalten und prüfen sie in Kürze.",
        "rows": [("Dateien", "Personalausweis.pdf, Meldebescheinigung.jpg"), ("Eingegangen am", "27.10.2026, 14:32 Uhr"), ("Vorgangsnummer", "DU-7F3A21")],
        "steps": ["Prüfung durch unser Team", "Rückmeldung per E-Mail oder Telefon"],
        "cta": "Weitere Unterlagen hochladen",
    },
    "12_auszahlung_beantragt": {
        "label": "12 · Auszahlung beantragt",
        "subject": "Ihr Auszahlungsantrag ist eingegangen",
        "title": "Auszahlungsantrag erhalten",
        "lead": "Ihr Antrag wird geprüft. Der Betrag ist bis zur Freigabe für Sie reserviert.",
        "rows": [("Betrag", "2.500,00 €"), ("Empfängerkonto", "DE89 •••• •••• 3000"), ("Kontoinhaber", "Max Mustermann"), ("Beantragt am", "27.10.2026")],
        "steps": ["Prüfung durch unser Team (in der Regel 1–2 Werktage)", "Überweisung auf Ihr Referenzkonto"],
        "cta": "Antrag ansehen",
    },
    "13_auszahlung_entschieden": {
        "label": "13 · Auszahlung freigegeben / abgelehnt",
        "subject": "Ihre Auszahlung wurde freigegeben",
        "title": "Ihre Auszahlung ist freigegeben",
        "lead": "Wir haben die Überweisung auf Ihr Referenzkonto veranlasst. Der Betrag wurde von Ihrem Guthaben abgebucht.",
        "rows": [("Betrag", "2.500,00 €"), ("Empfängerkonto", "DE89 •••• •••• 3000"), ("Status", "Freigegeben"), ("Gutschrift voraussichtlich", "29.10.2026")],
        "steps": [],
        "cta": "Kontoverlauf ansehen",
    },
    "14_neues_dokument": {
        "label": "14 · Neues Dokument / neuer Vertrag im Depot",
        "subject": "Neues Dokument in Ihrem Kundenbereich",
        "title": "Ein neues Dokument liegt für Sie bereit",
        "lead": "Wir haben ein Dokument in Ihrem Kundenbereich hinterlegt.",
        "rows": [("Dokument", "Festgeldvertrag ING Belgien"), ("Bereitgestellt am", "27.10.2026"), ("Ablage", "Kundenbereich → Dokumente")],
        "steps": [],
        "cta": "Dokument öffnen",
    },
    "15_order": {
        "label": "15 · Kauf- oder Verkaufsauftrag ausgeführt",
        "subject": "Ihr Kaufauftrag wurde ausgeführt",
        "title": "Auftrag ausgeführt: Kauf SAP SE",
        "lead": "Ihr Auftrag wurde erfolgreich ausgeführt und in Ihrem Depot gebucht.",
        "rows": [("Wertpapier", "SAP SE (SAP)"), ("Art", "Kauf"), ("Stückzahl", "10"), ("Ausführungskurs", "212,40 €"), ("Gesamtbetrag", "2.124,00 €"), ("Ausgeführt am", "27.10.2026, 10:14 Uhr")],
        "steps": [],
        "cta": "Zum Depot",
    },
}


def rows_html(rows, label_color, border):
    return "".join(
        f"<tr><td style='padding:9px 0;color:{label_color};font-size:13px;border-bottom:1px solid {border};'>{k}</td>"
        f"<td style='padding:9px 0;text-align:right;font-size:13px;font-weight:600;border-bottom:1px solid {border};'>{v}</td></tr>"
        for k, v in rows
    )


def steps_html(steps, color, text="#0B1F33"):
    if not steps:
        return ""
    items = "".join(
        f"<tr><td style='width:26px;vertical-align:top;'><span style='display:inline-block;width:20px;height:20px;border-radius:50%;background:{color};color:#fff;font-size:11px;line-height:20px;text-align:center;'>{i}</span></td>"
        f"<td style='font-size:13px;padding:0 0 10px;color:{text};'>{s}</td></tr>"
        for i, s in enumerate(steps, 1)
    )
    return f"<p style='font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#6B7C93;margin:22px 0 10px;'>So geht es weiter</p><table>{items}</table>"


def style_a(a):
    """A · Klassisch: dunkelblauer Kopf, Tabelle, gr\u00fcner Button."""
    return f"""<div style="font-family:Georgia,'Times New Roman',serif;max-width:560px;background:#fff;color:#0B1F33;border:1px solid #E3E8EF;">
<div style="background:#0A2540;padding:22px 28px;"><p style="margin:0;color:#C9A227;font-size:11px;letter-spacing:.2em;text-transform:uppercase;font-family:Arial;">Fr\u00f6hlich Verm\u00f6gensberatung</p>
<h1 style="margin:8px 0 0;color:#fff;font-size:21px;font-weight:normal;">{a['title']}</h1></div>
<div style="padding:26px 28px;font-family:Arial,sans-serif;"><p style="font-size:14px;line-height:1.6;margin:0 0 18px;">{a['lead']}</p>
<table style="width:100%;border-collapse:collapse;">{rows_html(a['rows'], '#6B7C93', '#EEF1F5')}</table>{steps_html(a['steps'], '#0A2540')}
<p style="margin:26px 0 6px;"><a style="background:#1F4D3A;color:#fff;padding:12px 26px;text-decoration:none;font-size:14px;border-radius:2px;">{a['cta']}</a></p>
<p style="font-size:13px;margin-top:22px;">Mit freundlichen Gr\u00fc\u00dfen<br>Ihr Team der Fr\u00f6hlich Verm\u00f6gensberatung</p></div>
<div style="background:#F4F6F9;padding:16px 28px;font-family:Arial;font-size:10.5px;color:#8894a6;line-height:1.6;">{FIRM}<br>{LEGAL}</div></div>"""


def style_b(a):
    """B · Modern hell: viel Wei\u00dfraum, gr\u00fcne Akzentlinie, Karte."""
    return f"""<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;background:#F7F5F0;padding:26px;color:#252722;">
<div style="border-top:4px solid #36A852;background:#fff;padding:30px;border-radius:14px;">
<p style="margin:0;font-size:12px;font-weight:700;color:#36A852;">Fr\u00f6hlich Verm\u00f6gensberatung</p>
<h1 style="margin:14px 0 8px;font-size:24px;line-height:1.25;">{a['title']}</h1><p style="font-size:14.5px;line-height:1.6;color:#555;margin:0 0 20px;">{a['lead']}</p>
<div style="background:#F7F5F0;border-radius:10px;padding:6px 16px;"><table style="width:100%;border-collapse:collapse;">{rows_html(a['rows'], '#686A64', '#E8E4DA')}</table></div>{steps_html(a['steps'], '#36A852')}
<p style="margin:26px 0 0;"><a style="background:#36A852;color:#fff;padding:13px 28px;text-decoration:none;font-size:14px;font-weight:600;border-radius:999px;">{a['cta']} \u2192</a></p></div>
<p style="font-size:10.5px;color:#9B9A93;text-align:center;line-height:1.6;margin:18px 0 0;">{FIRM}<br>{LEGAL}</p></div>"""


def style_c(a):
    """C · Premium dunkel: Navy-Fl\u00e4che, Gold-Akzent, gro\u00dfe Kennzahl."""
    first_val = a['rows'][0][1]
    return f"""<div style="font-family:Arial,sans-serif;max-width:560px;background:#0B1B2E;color:#E9EEF5;padding:30px;">
<p style="margin:0;font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:#C9A227;">Fr\u00f6hlich \u00b7 Verm\u00f6gensberatung</p>
<h1 style="margin:16px 0 6px;font-size:23px;font-weight:300;color:#fff;">{a['title']}</h1><p style="font-size:14px;line-height:1.6;color:#AFC0D4;margin:0 0 22px;">{a['lead']}</p>
<div style="border:1px solid #23405F;padding:18px 20px;"><p style="margin:0 0 4px;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#7F95AE;">{a['rows'][0][0]}</p>
<p style="margin:0 0 12px;font-size:24px;color:#C9A227;font-weight:600;">{first_val}</p>
<table style="width:100%;border-collapse:collapse;color:#E9EEF5;">{rows_html(a['rows'][1:], '#7F95AE', '#1D3653')}</table></div>{steps_html(a['steps'], '#C9A227', '#E9EEF5').replace('#6B7C93', '#7F95AE')}
<p style="margin:26px 0 0;"><a style="border:1px solid #C9A227;color:#C9A227;padding:12px 26px;text-decoration:none;font-size:13px;letter-spacing:.08em;text-transform:uppercase;">{a['cta']}</a></p>
<p style="font-size:10.5px;color:#5E7590;line-height:1.6;margin:28px 0 0;border-top:1px solid #1D3653;padding-top:14px;">{FIRM}<br>{LEGAL}</p></div>"""


index = []
for key, a in AREAS.items():
    cols = "".join(
        f"<div style='flex:1;min-width:0;'><p style='font:700 15px Arial;margin:0 0 10px;color:#111;'>Entwurf {n}</p>{fn(a)}</div>"
        for n, fn in (("A \u00b7 Klassisch", style_a), ("B \u00b7 Modern hell", style_b), ("C \u00b7 Premium dunkel", style_c))
    )
    page = (f"<html><body style='margin:0;padding:24px;background:#E9ECEF;'>"
            f"<p style='font:700 20px Arial;margin:0 0 4px;'>{a['label']}</p><p style='font:13px Arial;color:#555;margin:0 0 18px;'>Betreff: {a['subject']}</p>"
            f"<div style='display:flex;gap:22px;align-items:flex-start;'>{cols}</div></body></html>")
    path = f"{OUT}/{key}.html"
    open(path, "w", encoding="utf-8").write(page)
    index.append(path)
print(json.dumps(index))
