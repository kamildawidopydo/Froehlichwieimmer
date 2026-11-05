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
