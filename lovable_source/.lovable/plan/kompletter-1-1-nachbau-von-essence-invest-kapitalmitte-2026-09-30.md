# Kompletter 1:1-Nachbau von Essence Invest / Kapitalmitte

Das Original umfasst 819 Frontend-Dateien, 160 Seitenadressen und 168 Backend-Module (Server, Datenbank, zeitgesteuerte Aufgaben). Das ist zu groß für einen einzelnen Durchgang. Deshalb wird es in Etappen gebaut. Nach jeder Etappe wird automatisch getestet: Jede Seite wird im Browser geöffnet und auf Fehler geprüft.

## Etappe 1 – Alle öffentlichen Seiten (ohne Login)
- Kopfzeile, Fußzeile, Navigation, Cookie-Hinweis und Assistent-Knopf wie im Original
- Banken (/banken, /banken/:slug), Tagesgeld/Festgeld je Land, Produktseiten, Rechner
- Info-Seiten: So funktioniert's, Sicherheit, Compliance, FAQ, Über uns, Philosophie, Leistungen, Kontakt, Rechtliches
- Wissen, Strategie, Themen, Finanzwissen, Bausteine
- Bankseiten wie BBVA Flexgeld, ING, Bunq, Postbank samt Vertrag/Bedingungen
- Daten kommen aus dem echten Datenbank-Export (Banken, Angebote, Länder, Inhalte)

## Etappe 2 – Datenbank & Konten (Lovable Cloud)
- Datenbank-Tabellen für Banken, Angebote, Bewertungen, Anfragen, Kunden, Dokumente
- Übernahme der echten Datensätze aus dem Export (Demo-Daten bleiben als Demo markiert)
- Registrierung, Login, Passwort vergessen/zurücksetzen
- Bewertungen abgeben, Angebotsanfragen, Kontaktformular, Formular/Dokument-Upload

## Etappe 3 – Kundenbereich
- Dashboard, Depot, Konten, Kontoauszüge, Dokumente, Alarme, Watchlist
- Kontobuchungen nach dem Original-Prinzip (nur anhängen, nie überschreiben)

## Etappe 4 – News & Marktdaten
- News-Bereich mit allen Kategorien, Archiv, Währungsrechner, Rohstoffcharts
- Automatische Abläufe: News holen/zusammenfassen, Kursalarme, Anleihen-Katalog, Monatsauszüge
- Benötigt neue Zugangsschlüssel (Kursdaten-Anbieter, E-Mail) – werden über ein sicheres Formular abgefragt, die alten hochgeladenen Schlüssel werden nicht verwendet

## Etappe 5 – Admin-Bereich
- Verwaltung von Banken, Angeboten, Bewertungen, Kunden, Besuchern, Protokollen
- Zugriff nur für Admin-Rolle, serverseitig geprüft

## Was sich technisch ändern muss
- Das Original lief mit Python-Server + MongoDB. Hier läuft alles auf Lovable Cloud; die Rechenlogik (Zinsen, Buchungen, Bewertungen) wird 1:1 übersetzt.
- PDF-Erzeugung (Berichte, Bestätigungen) wird mit einer Web-tauglichen Bibliothek nachgebaut.
- Aussehen, Texte, Farben und Abläufe bleiben identisch.

## Technische Details
- Seiten-Router wird auf TanStack umgestellt (Kompatibilitätsschicht existiert bereits); je Originalpfad eine Routendatei mit eigenen Meta-Tags.
- axios-Aufrufe werden durch Server-Funktionen ersetzt; FastAPI-Endpunkte werden je Etappe portiert.
- Cron-Jobs werden als öffentliche Server-Routen mit Signaturprüfung plus Zeitplan umgesetzt.
- Test je Etappe: Playwright öffnet jede Route, prüft Rendering und Konsolenfehler.
