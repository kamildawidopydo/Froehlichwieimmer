# Öffentliche Funktionen und Abläufe

Grundlage: Quellcode (Stand Vorschau) und der Crawl der Live-Website ohne Anmeldung.
Es wurden **keine Formulare abgesendet** und keine Transaktionen ausgelöst. Ergebnisse, Fehlermeldungen und Bestätigungen nach dem Absenden sind deshalb aus dem Quellcode beschrieben und nicht live geprüft.
Die tatsächlich aufgerufenen API-Pfade je Seite stehen in `inhalte/DYNAMISCHE_INHALTE.md`, die Eingabefelder jeder Seite automatisch erfasst unten im Anhang.

| Funktion | Aufruf | Eingaben / Auswahl | Ablauf und Ergebnis | Backend / Datenbank / externer Dienst |
|---|---|---|---|---|
| Besucher-/Wohnsitzabfrage | Erstbesuch jeder Seite (Modal) | Besucherrolle, Wohnsitzland (alle Optionen in `seiten/ABFRAGEN_BESUCHER_COOKIE.json`, Screenshots `screenshots/abfragen/`) | Auswahl wird im Browser gespeichert (localStorage `kapitalmitte_visitor_profile`); danach erscheint die Cookie-Abfrage | nur Browser |
| Cookie-Einstellungen | nach der Besucherabfrage, erneut über Footer-Link „Cookie-Einstellungen“ | Notwendig (fest), Präferenzen, Statistik, Marketing; „Alle akzeptieren“, „Auswahl speichern“ | Einwilligung im Browser gespeichert (`kapitalmitte_cookie_consent`); Besucher-Tracking nur mit Einwilligung | Browser; Tracking-Daten an eigenes Backend |
| Angebotsvergleich Tages-/Festgeld | `/sparangebote`, `/comparison`, `/festgeld/:land`, `/tagesgeld/:land` | Filter Produktart, Land, Laufzeit, Anlagebetrag, Sortierung | Liste der Angebote mit Zinssatz, Laufzeit, Bank, Einlagensicherung; Klick führt zur Bank-/Produktseite bzw. Anfrage | `GET /api/public/savings-offers`, `/facets` → MongoDB (Sammlung der Sparangebote, Pflege im Admin) |
| Zinsrechner | `/calculator` und Rechner-Bausteine auf Produktseiten | Anlagebetrag, Laufzeit, Zinssatz | Berechnung von Zinsertrag und Endbetrag direkt im Browser | rein clientseitig |
| Partnerbanken / Bankseiten | `/partner-banks`, `/banken`, `/banken/:slug`, `/banks/...` | Auswahl Bank, Produkt (Festgeld/Flexgeld), Unterseiten Vertrag/Produktinfo/Bedingungen | Anzeige von Bankprofil, Konditionen, Dokumenten-PDFs | `GET /api/public/partner-banks`, `/api/public/banks` → MongoDB; PDFs statisch |
| Kontaktformular | `/contact`, `/kontakt` | Name, E-Mail, Telefon, Betreff, Nachricht, Einwilligung | Absenden → Bestätigungsmeldung bzw. Fehlermeldung bei Pflichtfeldern | `POST /api/contact-message` → MongoDB + E-Mail-Benachrichtigung (Resend) |
| Newsletter | Footer, Startseite (`NewsletterSignup`), `/newsletter` | E-Mail, Einwilligung | Anmeldung mit Bestätigung | Backend-Endpunkt + MongoDB, ggf. E-Mail-Versand |
| Produktanfrage / Rückruf | schwebender Button und Formulare auf Produktseiten | Kontaktdaten, Produktinteresse, Betrag | Anfrage wird gespeichert, Admin erhält Benachrichtigung | Backend + MongoDB + E-Mail |
| Kredit-Angebote | `/kredit` | Betrag, Laufzeit, Zweck | Angebotsliste / Anfrage | `GET /api/public/credit-offers` → MongoDB |
| Registrierung / Login | `/register`, `/login`, `/forgot-password`, `/reset-password` | E-Mail, Passwort, persönliche Daten | Konto anlegen, Login per Cookie-Sitzung, Passwort-Reset per E-Mail | `/api/auth/*` → MongoDB, JWT, E-Mail |
| Onboarding / Antrag | `/apply`, `/formular`, `/dokument-upload` | mehrstufige Antragsdaten, Dokument-Upload | Antrag wird gespeichert und im Admin geprüft | Backend + MongoDB + Dateispeicher |
| Karriere / Bewerbung | `/karriere`, `/recruiting`, Stellenseiten | Stellenauswahl, Bewerbungsformular mit Dateien | Bewerbung gespeichert, Bestätigung | `/api/careers` → MongoDB + verschlüsselter Dateispeicher |
| Kundenbewertungen | `/bewertungen`, `/kundenstimmen` | Sterne-Filter | Anzeige freigegebener Bewertungen und Statistik | `/api/reviews/approved`, `/api/reviews/stats` → MongoDB |
| News / Marktdaten | `/news/...`, `/nachrichten/...`, `/aktien/...` | Kategorien, Suche/Filter, Watchlist, Währungsrechner | Artikel, Kurse, Charts | MongoDB (News werden stündlich per Cron aus RSS geholt und per KI zusammengefasst); Kurse von externen Kursdiensten (u. a. Yahoo Finance, Finnhub, Twelve Data, EZB-Wechselkurse) |
| Wissens- und Themenseiten | `/wissen`, `/themen`, `/finanzwissen/:slug`, `/strategie/...` | Navigation, Tabs | statische bzw. aus Datenbank geladene Inhalte | teils statisch im Code, teils MongoDB |
| Suche | Kopfbereich / News | Suchbegriff | Treffer in Seiten/Artikeln | Backend-Suche bzw. clientseitige Filterung (siehe Anhang je Seite) |

## Hinweise zu Produkt- und Zinsdaten
- Öffentlich angezeigte Angebote: `daten/angebote_*.csv` (strukturiert) und Rohdaten `daten/oeffentliche_api/*.json`, jeweils mit Quelle (API-URL der Live-Website) und Abrufdatum.
- Aktualisierung: Angebote werden im Admin-Bereich gepflegt bzw. importiert (Backend-Routen `savings`, Admin „Sparangebote/Import/Quellen“). Datenfelder siehe CSV-Spalten und `datenbank/schema.json`. Eine automatische Anbindung an einen externen Zinsdatenanbieter ist im Code nicht als Pflichtbestandteil vorhanden.

## Anhang: automatisch erfasste Eingabefelder je Seite

## /aktien/AAPL

**Eingaben außerhalb von Formularen (Filter, Rechner, Suche)**
- input `number` calc-amount-input
- input `text` z. B. Microsoft, MSFT, Allianz …
- input `checkbox` compare-benchmark-toggle

## /apply

**Eingaben außerhalb von Formularen (Filter, Rechner, Suche)**
- input `text` z.B. Max
- input `text` z.B. Mustermann
- input `email` z.B. max@mustermann.de
- select `select-one` Telefonvorwahl · Optionen: 🇩🇪 +49, 🇦🇹 +43, 🇨🇭 +41, 🇫🇷 +33, 🇮🇹 +39, 🇪🇸 +34, 🇳🇱 +31, 🇧🇪 +32, 🇵🇱 +48, 🇸🇪 +46, 🇵🇹 +351, 🇮🇪 +353, 🇬🇷 +30, 🇫🇮 +358, 🇩🇰 +45, 🇱🇺 +352, 🇨🇿 +420, 🇭🇺 +36, 🇷🇴 +40, 🇧🇬 +359, 🇭🇷 +385, 🇸🇰 +421, 🇸🇮 +386, 🇪🇪 +372, 🇱🇻 +371, 🇱🇹 +370, 🇲🇹 +356, 🇨🇾 +357, 🇬🇧 +44, 🇳🇴 +47, 🇮🇸 +354, 🇹🇷 +90, 🇺🇸 +1
- input `tel` 30 123456
- input `text` Musterstraße
- input `text` 12a
- input `text` Etage, c/o, Gebäude …
- input `text` 10115
- input `text` Berlin
- select `select-one`  · Optionen: Staatsangehörigkeit wählen…, Deutsch, Österreichisch, Schweizer, Französisch, Italienisch, Spanisch, Niederländisch, Belgisch, Polnisch, Schwedisch, Portugiesisch, Irisch, Griechisch, Finnisch, Dänisch

## /banken

**Eingaben außerhalb von Formularen (Filter, Rechner, Suche)**
- input `text` z. B. ING
- input `radio` 
- input `radio` bank-country-DE
- input `radio` bank-country-FR
- input `radio` bank-country-ES
- input `radio` bank-country-AT
- input `radio` bank-country-NL
- input `radio` bank-country-IT
- input `radio` bank-country-BE
- input `radio` bank-country-IE
- input `radio` bank-country-PT
- input `radio` bank-country-SE
- input `radio` bank-country-EE
- input `radio` bank-country-FI
- input `radio` bank-country-LT
- input `radio` bank-country-LU
- input `radio` bank-country-LV

## /banks

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/bbva/festgeld

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/bbva/festgeld/bedingungen

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/bbva/festgeld/produktinfo

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/bbva/festgeld/vertrag

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/bbva/flexgeld

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/bbva/flexgeld/bedingungen

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/bbva/flexgeld/produktinfo

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/bbva/flexgeld/vertrag

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/bunq-de/festgeld

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/bunq-de/festgeld/bedingungen

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/bunq-de/festgeld/produktinfo

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/bunq-de/festgeld/vertrag

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/bunq-de/flexgeld

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/bunq-de/flexgeld/bedingungen

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/bunq-de/flexgeld/produktinfo

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/bunq-de/flexgeld/vertrag

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/bunq/festgeld

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/bunq/festgeld/bedingungen

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/bunq/festgeld/produktinfo

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/bunq/festgeld/vertrag

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/bunq/flexgeld

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/bunq/flexgeld/bedingungen

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/bunq/flexgeld/produktinfo

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/bunq/flexgeld/vertrag

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/ing/festgeld

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/ing/festgeld/bedingungen

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/ing/festgeld/produktinfo

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/ing/festgeld/vertrag

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/ing/flexgeld

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/ing/flexgeld/bedingungen

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/ing/flexgeld/produktinfo

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/ing/flexgeld/vertrag

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/knab/festgeld

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/knab/festgeld/bedingungen

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/knab/festgeld/produktinfo

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/knab/festgeld/vertrag

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/knab/flexgeld

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/knab/flexgeld/bedingungen

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/knab/flexgeld/produktinfo

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/knab/flexgeld/vertrag

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/postbank/festgeld

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/postbank/festgeld/bedingungen

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/postbank/festgeld/produktinfo

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/postbank/festgeld/vertrag

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/postbank/flexgeld

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/postbank/flexgeld/bedingungen

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/postbank/flexgeld/produktinfo

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /banks/postbank/flexgeld/vertrag

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /bewertungen

**Formular 1** – Buttons: Bewertung absenden
- input `text` VORNAME (Pflicht)
- input `text` NACHNAME (Pflicht)
- input `email` E-MAIL-ADRESSE
Wird ausschließlich intern zur Prüfung verwendet — nie öffentlich sichtbar. (Pflicht)
- textarea `textarea` IHRE ERFAHRUNG
0 / 2000 Zeichen · Nur Text — HTML wird entfernt. (Pflicht)
- input `text` website
- input `checkbox` Ich bestätige, dass ich Kunde von Fröhlich Vermögensberatung bin und stimme der Verarbeitung meiner Angaben zur Prüfung und Veröffentlichung meiner Bewertung gemäß Datenschutzerklärung zu.

**Eingaben außerhalb von Formularen (Filter, Rechner, Suche)**
- select `select-one` reviews-sort · Optionen: Neueste, Beste Bewertung

## /calculator

**Eingaben außerhalb von Formularen (Filter, Rechner, Suche)**
- input `number` calc-amount-input
- input `number` calc-rate-input

## /comparison

**Eingaben außerhalb von Formularen (Filter, Rechner, Suche)**
- input `number` 25000
- select `select-one` sort-select · Optionen: Sortieren: Erwarteter Ertrag, Sortieren: Zinssatz, Sortieren: Laufzeit (lang → kurz), Sortieren: Laufzeit (kurz → lang), Sortieren: Mindestanlage, Sortieren: Bank A–Z
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `checkbox` 
- input `text` z. B. ING oder Spanien
- input `number` z. B. 25000
- input `checkbox` filter-country-DE
- input `checkbox` filter-country-ES
- input `checkbox` filter-country-FR
- input `checkbox` filter-country-NL
- input `checkbox` filter-country-AT
- input `checkbox` filter-country-IT
- input `checkbox` filter-country-SE
- input `checkbox` filter-country-BE
- input `checkbox` filter-country-PT
- input `checkbox` filter-country-IE
- input `checkbox` filter-country-LU
- input `checkbox` filter-country-EE
- input `checkbox` filter-country-LV
- input `checkbox` filter-country-LT
- input `checkbox` filter-country-FI
- input `checkbox` filter-dgs-DE
- input `checkbox` filter-dgs-ES
- input `checkbox` filter-dgs-FR
- input `checkbox` filter-dgs-NL
- input `checkbox` filter-dgs-AT
- input `checkbox` filter-dgs-IT
- input `checkbox` filter-dgs-SE
- input `checkbox` filter-dgs-BE
- input `checkbox` filter-dgs-PT
- input `checkbox` filter-dgs-IE
- input `checkbox` filter-dgs-LU
- input `checkbox` filter-dgs-EE
- input `checkbox` filter-dgs-LV
- input `checkbox` filter-dgs-LT
- input `checkbox` filter-dgs-FI
- input `checkbox` filter-new-customers

## /contact

**Formular 1** – Buttons: Senden
- input `text` 01
NAME (Pflicht)
- input `email` 02
E-MAIL (Pflicht)
- input `text` 03
BETREFF (Pflicht)
- textarea `textarea` 04
NACHRICHT (Pflicht)

## /dokument-upload

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `email` IHRE E-MAIL (FÜR DIE EINGANGSBESTÄTIGUNG)
- input `password` ZUGANGSCODE

## /faq

**Eingaben außerhalb von Formularen (Filter, Rechner, Suche)**
- input `text` Frage suchen

## /finanzwissen/altersvorsorge

**Formular 1** – Buttons: KOSTENLOS ABONNIEREN
- input `email` E-Mail-Adresse (Pflicht)
- input `checkbox` Ich willige ein, dass meine E-Mail zur Zusendung des wöchentlichen Finanznachrichten-Digests verarbeitet wird. Die Einwilligung ist jederzeit über den Abmelde-Link in jeder E-Mail widerrufbar. Datenschutzerklärung. (Pflicht)

## /forgot-password

**Formular 1** – Buttons: Link senden
- input `email` 01
E-MAIL (Pflicht)

## /formular

**Formular 1** – Buttons: WEITER
- input `text` IHR NAME
- input `password` ZUGANGSCODE

## /groessere-vermoegen

**Formular 1** – Buttons: 100.000 €, 250.000 €, 500.000 €, 1.000.000 €, 2.000.000 €+, unter 3 Jahre, 3 – 5 Jahre, 5 – 10 Jahre, über 10 Jahre, Hoch, Mittel, Gering, Defensiv, Ausgewogen, Chancenorientiert, Kapital erhalten, Laufende Erträge, Vermögen langfristig aufbauen, Liquidität verfügbar halten, Vermögen diversifizieren, ÜBERSICHT ANZEIGEN
- input `text` FREIER BETRAG (OPTIONAL)

**Eingaben außerhalb von Formularen (Filter, Rechner, Suche)**
- input `text` z. B. 35
- input `text` z. B. 150.000
- input `text` z. B. 50.000
- input `text` z. B. 3
- input `text` 0
- input `text` 0
- input `text` 0
- input `text` 0
- input `text` 0
- input `text` 0
- input `text` Liquidität Prozent (Höhere Liquidität)
- input `text` Verzinsliche Anlagen Prozent (Höhere Liquidität)
- input `text` Wertpapiere Prozent (Höhere Liquidität)
- input `text` Sonstiges Prozent (Höhere Liquidität)
- input `text` Liquidität Prozent (Ausgewogene Struktur)
- input `text` Verzinsliche Anlagen Prozent (Ausgewogene Struktur)
- input `text` Wertpapiere Prozent (Ausgewogene Struktur)
- input `text` Sonstiges Prozent (Ausgewogene Struktur)
- input `text` Liquidität Prozent (Höherer langfristiger Anteil)
- input `text` Verzinsliche Anlagen Prozent (Höherer langfristiger Anteil)
- input `text` Wertpapiere Prozent (Höherer langfristiger Anteil)
- input `text` Sonstiges Prozent (Höherer langfristiger Anteil)

## /handeln

**Eingaben außerhalb von Formularen (Filter, Rechner, Suche)**
- input `text` Börsen-ABC durchsuchen

## /karriere

**Formular 1** – Buttons: Stellenangebote finden
- input `text` JOBTITEL ODER STICHWORT
- select `select-one` ARBEITSORT
Alle Arbeitsorte
Bad Kreuznach
Berlin
Frankfurt am Main
Hamburg · Optionen: Alle Arbeitsorte, Bad Kreuznach, Berlin, Frankfurt am Main, Hamburg
- select `select-one` BESCHÄFTIGUNGSART
Alle
Festanstellung
Festanstellung oder selbstständige Tätigkeit · Optionen: Alle, Festanstellung, Festanstellung oder selbstständige Tätigkeit
- select `select-one` TÄTIGKEITSBEREICH
Alle Bereiche
Finanzberatung
Geschäftsführung & Verwaltung · Optionen: Alle Bereiche, Finanzberatung, Geschäftsführung & Verwaltung

## /kredit

**Formular 1** – Buttons: Kredite vergleichen
- input `number` 
- select `select-one`  · Optionen: 12 Monate, 24 Monate, 36 Monate, 48 Monate, 60 Monate, 72 Monate, 84 Monate, 96 Monate, 120 Monate, 180 Monate, 240 Monate
- select `select-one`  · Optionen: Freie Verwendung, Umschuldung, Auto, Renovierung, Möbel / Einrichtung, Sonstiges

**Eingaben außerhalb von Formularen (Filter, Rechner, Suche)**
- select `select-one`  · Optionen: Niedrigster effektiver Jahreszins zuerst, Niedrigste monatliche Rate zuerst, Beste Bewertung zuerst

## /kundenstimmen

**Formular 1** – Buttons: Persönliche Betreuung, Vertrauen, Beratung, Erreichbarkeit, Langfristige Zusammenarbeit, Transparenz, Service, Investment-Übersicht, Erfahrung teilen
- input `text` VORNAME (Pflicht)
- input `text` NACHNAME (Pflicht)
- input `email` E-MAIL-ADRESSE
Wird ausschließlich intern zur Prüfung verwendet — nie öffentlich sichtbar. (Pflicht)
- select `select-one` SEIT WANN SIND SIE KUNDE? (OPTIONAL)
Keine Angabe
weniger als 1 Jahr
1–3 Jahre
3–5 Jahre
mehr als 5 Jahre · Optionen: Keine Angabe, weniger als 1 Jahr, 1–3 Jahre, 3–5 Jahre, mehr als 5 Jahre
- textarea `textarea` IHRE PERSÖNLICHE ERFAHRUNG
0 / 2000 Zeichen · Nur Text — HTML wird entfernt. (Pflicht)
- input `text` website
- input `checkbox` Ich bestätige, dass ich Kunde von Fröhlich Vermögensberatung bin und stimme der Verarbeitung meiner Angaben zur Prüfung und Veröffentlichung meiner Bewertung gemäß Datenschutzerklärung zu.

**Eingaben außerhalb von Formularen (Filter, Rechner, Suche)**
- input `text` In Kundenstimmen suchen …
- select `select-one` kundenstimmen-sort · Optionen: Neueste zuerst, Älteste zuerst, Beste Bewertungen, Kritische zuerst

## /login

**Formular 1** – Buttons: Anmelden
- input `email` 01
E-MAIL (Pflicht)
- input `password` 02
PASSWORT
VERGESSEN? (Pflicht)

## /meine-alarme

**Formular 1** – Buttons: Anmelden
- input `email` 01
E-MAIL (Pflicht)
- input `password` 02
PASSWORT
VERGESSEN? (Pflicht)

## /nachrichten

**Eingaben außerhalb von Formularen (Filter, Rechner, Suche)**
- select `select-one` news-publisher-select · Optionen: Alle Publisher (17), Deutsche Bundesbank, Deutsche Welle, EU-Kommission, EZB, FAZ Politik, FAZ Wirtschaft, Golem, Handelsblatt, SPIEGEL Politik, SPIEGEL Wirtschaft, Süddeutsche Wirtschaft, Tagesschau Ausland, Tagesschau Inland, Tagesschau Wirtschaft, WirtschaftsWoche, ZEIT Politik, ZEIT Wirtschaft

## /news/archiv

**Eingaben außerhalb von Formularen (Filter, Rechner, Suche)**
- input `search` Nachrichten durchsuchen

## /news/nachrichten

**Eingaben außerhalb von Formularen (Filter, Rechner, Suche)**
- select `select-one` news-publisher-select · Optionen: Alle Publisher (17), Deutsche Bundesbank, Deutsche Welle, EU-Kommission, EZB, FAZ Politik, FAZ Wirtschaft, Golem, Handelsblatt, SPIEGEL Politik, SPIEGEL Wirtschaft, Süddeutsche Wirtschaft, Tagesschau Ausland, Tagesschau Inland, Tagesschau Wirtschaft, WirtschaftsWoche, ZEIT Politik, ZEIT Wirtschaft

## /news/waehrungsrechner

**Eingaben außerhalb von Formularen (Filter, Rechner, Suche)**
- input `text` Betrag Quellwährung
- select `select-one`  · Optionen: Euro, Dollar, Britische Pfund, Schweizer Franken, Japanischer Yen, Kanadischer Dollar, Australischer Dollar
- input `text` Betrag Zielwährung
- select `select-one`  · Optionen: Euro, Dollar, Britische Pfund, Schweizer Franken, Japanischer Yen, Kanadischer Dollar, Australischer Dollar
- input `text` 
- select `select-one`  · Optionen: -2 %, -1 %, +0 %, +1 %, +2 %, +3 %

## /news/watchlist

**Formular 1** – Buttons: Anmelden
- input `email` 01
E-MAIL (Pflicht)
- input `password` 02
PASSWORT
VERGESSEN? (Pflicht)

## /newsletter

**Formular 1** – Buttons: KOSTENLOS ABONNIEREN
- input `email` E-Mail-Adresse (Pflicht)
- input `checkbox` Ich willige ein, dass meine E-Mail zur Zusendung des wöchentlichen Finanznachrichten-Digests verarbeitet wird. Die Einwilligung ist jederzeit über den Abmelde-Link in jeder E-Mail widerrufbar. Datenschutzerklärung. (Pflicht)

## /recruiting

**Formular 1** – Buttons: Anmelden
- input `email` 01
E-MAIL (Pflicht)
- input `password` 02
PASSWORT
VERGESSEN? (Pflicht)

## /register

**Formular 1** – Buttons: Konto erstellen
- input `text` 01
VORNAME (Pflicht)
- input `text` 02
NACHNAME (Pflicht)
- input `email` 03
E-MAIL (Pflicht)
- select `select-one` 04
LAND
Land wählen…
Deutschland
Österreich
Schweiz
Frankreich
Italien
Spanien
Niederlande
Belgien
Polen
Schweden
Portugal
Irland
Griechenland
Finnland
Dänemark
▾ (Pflicht) · Optionen: Land wählen…, Deutschland, Österreich, Schweiz, Frankreich, Italien, Spanien, Niederlande, Belgien, Polen, Schweden, Portugal, Irland, Griechenland, Finnland, Dänemark
- select `select-one` 05
TELEFON(optional)
🇩🇪 +49
🇦🇹 +43
🇨🇭 +41
🇫🇷 +33
🇮🇹 +39
🇪🇸 +34
🇳🇱 +31
🇧🇪 +32
🇵🇱 +48
🇸🇪 +46
🇵🇹 +351
🇮🇪 +353
🇬🇷 +30
🇫🇮 +358
🇩🇰 +45
🇱🇺 +352
🇨🇿 +420
🇭🇺 +36
🇷🇴 +40
🇧🇬 +359
🇭🇷 +385
🇸🇰 +421
🇸🇮 +386
🇪🇪 +372
🇱🇻 +371
🇱🇹 +370
🇲🇹 +356
🇨🇾 +357
🇬🇧 +44
🇳🇴 +47
🇮🇸 +354
🇹🇷 +90
🇺🇸 +1
▾ · Optionen: 🇩🇪 +49, 🇦🇹 +43, 🇨🇭 +41, 🇫🇷 +33, 🇮🇹 +39, 🇪🇸 +34, 🇳🇱 +31, 🇧🇪 +32, 🇵🇱 +48, 🇸🇪 +46, 🇵🇹 +351, 🇮🇪 +353, 🇬🇷 +30, 🇫🇮 +358, 🇩🇰 +45, 🇱🇺 +352, 🇨🇿 +420, 🇭🇺 +36, 🇷🇴 +40, 🇧🇬 +359, 🇭🇷 +385, 🇸🇰 +421, 🇸🇮 +386, 🇪🇪 +372, 🇱🇻 +371, 🇱🇹 +370, 🇲🇹 +356, 🇨🇾 +357, 🇬🇧 +44, 🇳🇴 +47, 🇮🇸 +354, 🇹🇷 +90, 🇺🇸 +1
- input `tel` 170 1234567
- input `password` 06
PASSWORT (Pflicht)
- input `password` 07
BESTÄTIGEN (Pflicht)

## /

**Formular 1** – Buttons: KOSTENLOS ABONNIEREN
- input `email` E-Mail-Adresse (Pflicht)
- input `checkbox` Ich willige ein, dass meine E-Mail zur Zusendung des wöchentlichen Finanznachrichten-Digests verarbeitet wird. Die Einwilligung ist jederzeit über den Abmelde-Link in jeder E-Mail widerrufbar. Datenschutzerklärung. (Pflicht)

## /statement

**Formular 1** – Buttons: Anmelden
- input `email` 01
E-MAIL (Pflicht)
- input `password` 02
PASSWORT
VERGESSEN? (Pflicht)

## /strategie/altersvorsorge/altersvorsorge

**Eingaben außerhalb von Formularen (Filter, Rechner, Suche)**
- input `checkbox` strategie-self-check-option-gesamtbild
- input `checkbox` strategie-self-check-option-luecke
- input `checkbox` strategie-self-check-option-flex
- input `checkbox` strategie-self-check-option-lifelong
- input `checkbox` strategie-self-check-option-entnahme

## /themen/aktien

**Formular 1** – Buttons: Gespräch anfragen
- input `text` VORNAME * (Pflicht)
- input `text` NACHNAME * (Pflicht)
- input `email` E-MAIL * (Pflicht)
- input `tel` TELEFON (OPTIONAL)
- input `checkbox` Ich stimme der Verarbeitung meiner Angaben zur Beantwortung meiner Anfrage gemäß der Datenschutzerklärung zu. * (Pflicht)
