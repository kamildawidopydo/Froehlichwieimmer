# Übergabepaket essenceinvest.com → Nachbau für Aqona Capital GmbH

Erstellt am 2026-11-05. Crawl der Live-Website https://essenceinvest.com ohne Anmeldung am 2026-11-05 12:29:01 UTC.
Quellcode: aktueller Stand der Vorschau-Umgebung (kann neuere Änderungen enthalten als die Live-Website).

## Inhalt
| Ordner/Datei | Inhalt |
|---|---|
| `quellcode/frontend` | Vollständiger Frontend-Quellcode (alle Seiten, Komponenten, Styles, `public/` mit Bildern, Logos, Icons, PDFs), Projektkonfiguration (package.json, yarn.lock, tailwind/craco/postcss) |
| `quellcode/backend` | Vollständiger Backend-Quellcode (FastAPI), Skripte, Startdaten ohne Kundendaten |
| `konfiguration/` | `.env`-Beispiele (nur Variablennamen), `crons.yml` |
| `datenbank/schema.json` | Datenbankstruktur: 102 Sammlungen mit Feldern, Datentypen und Indizes (keine Inhalte) |
| `seiten/SEITEN.csv` | 109 feste öffentliche Seiten + 12 Beispielseiten der Vorlagen: URL, Titel, Status, Weiterleitung, Screenshots |
| `seiten/URL_LISTE_dynamische_seiten.csv` | 175 beim Crawl gefundene URLs automatisch erzeugter Seiten, je Vorlage |
| `seiten/WEITERLEITUNGEN.csv`, `EXTERNE_LINKS.txt`, `MENUE_UND_FOOTER_LINKS.csv`, `HAUPTMENUE_ZUSTAENDE.json` | Weiterleitungen, externe Ziele, alle Menü-/Footer-Links, Hauptmenü geöffnet |
| `seiten/ABFRAGEN_BESUCHER_COOKIE.json` | Besucher-/Wohnsitz- und Cookie-Abfrage mit allen Optionen |
| `screenshots/desktop-1440`, `tablet-810`, `mobile-390` | Ganzseiten-Screenshots jeder erfassten Seite |
| `screenshots/zustaende/` | 229 geöffnete Zustände (Tabs, Aufklappbereiche, mobile Navigation) + Hauptmenü |
| `screenshots/abfragen/` | Besucher- und Cookie-Abfrage in allen Zuständen |
| `inhalte/texte/*.md` | Seitentexte je URL, nach Abschnitten gegliedert |
| `inhalte/seiten_rohdaten/*.json` | Rohdaten je Seite: Abschnitte, Links, Bilder, Formulare, Meta-Angaben |
| `inhalte/BILDER.csv`, `PDF_DATEIEN.txt`, `assets/extern/` | 1736 Bildverwendungen mit Alt-Text und Lizenzhinweis, 13 PDFs, heruntergeladene externe Bilder |
| `inhalte/DYNAMISCHE_INHALTE.md` | Welche Seiten Inhalte aus Datenbank/externen Diensten laden |
| `daten/` | Öffentliche Angebote/Konditionen als CSV + JSON mit Quelle und Abrufdatum: angebote_public_banks.csv (75 Zeilen), angebote_public_savings_offers.csv (306 Zeilen), angebote_public_savings_offers_facets.csv (15 Zeilen), angebote_public_credit_offers.csv (5 Zeilen), angebote_public_partner_banks.csv (75 Zeilen), angebote_public_banks_abn_amro.csv (4 Zeilen) |
| `dokumentation/FUNKTIONEN.md` | Alle öffentlichen Funktionen und Abläufe + erfasste Eingabefelder je Seite |
| `firmenanpassung/` | Aqona-Daten, „noch zu ergänzen“-Liste, 2203 Fundstellen im Code, 808 Fundstellen in Titeln/Metadaten |
| `INSTALLATION_UND_WIEDERHERSTELLUNG.md` | Lokaler Start, Server-Wiederherstellung, benötigte Backups |
| `TECHNOLOGIEN.md` | Technologien, Schriftarten, externe Dienste, Abhängigkeiten |

## Vollständig dokumentiert
Seitenliste, Menü-/Footer-Links, Weiterleitungen, Seitentexte, Bilder/PDFs, Ganzseiten-Screenshots in drei Breiten, Besucher-/Cookie-Abfrage, Formularfelder, Datenbankstruktur, Quellcode.

## Fehlt bzw. eingeschränkt
- **Datenbankinhalte und hochgeladene Dateien**: nicht enthalten (Kundendaten, vertraulich). Für eine Sicherung zusätzlich ein Live-Datenbank-Backup beim Hosting anfordern (siehe Installation).
- **Kunden- und Adminbereich**: keine Screenshots. Ihr Auftrag nennt sie als nicht erforderlich und schließt interne Admininformationen und Kundendaten aus; Screenshots dieser Bereiche würden solche Daten zeigen. Der Quellcode beider Bereiche ist enthalten.
- **Ergebnisse nach dem Absenden von Formularen**: nicht live geprüft (keine echten Daten, keine Transaktionen); aus dem Quellcode beschrieben.
- **Interaktive Zustände**: automatisch erfasst wurden Tabs, Aufklappbereiche, Hauptmenü und mobile Navigation. Rechner-Ergebnisse mit eigenen Eingaben und einzelne Filterkombinationen sind nicht für jede Seite als Screenshot vorhanden.
- **Vorlagen ohne Beispiel**: 8 Seitenvorlagen hatten beim Crawl keinen öffentlichen Link (z. B. Vorschauseiten); siehe `URL_LISTE_dynamische_seiten.csv`.
- **Seiten mit Fehlern beim Erfassen**: 0 (Spalte „fehler“ in `SEITEN.csv`).
- **Lizenzangaben**: Die Website führt zu den meisten Bildern keine Quellen-/Lizenzangaben; vorhandene Herkunft (Unsplash/Pexels/eigene Dateien) ist in `BILDER.csv` vermerkt. Partnerbank-Logos und Bankdokumente sind Eigentum der jeweiligen Banken.
- **Schriftdateien**: Schriften werden von Google Fonts geladen, nicht als Dateien mitgeliefert.

## Für einen funktionsfähigen Nachbau zusätzlich anzubinden
Siehe `TECHNOLOGIEN.md` → externe Dienste (E-Mail, Kurs- und Newsdaten, KI, Cron), eigenes Backend + MongoDB für Angebote, Formulare, Bewertungen und News. Framer allein kann diese Funktionen nicht abbilden.

## Sicherheit
Ausgeschlossen: alle `.env`-Dateien, Tests mit Zugangsdaten, Produktions-Startdaten, Exporte/Backups, Bewertungs-Snapshot.
Automatisch geschwärzte Werte (Schlüssel/Passwörter im Code): 0 Dateien.
