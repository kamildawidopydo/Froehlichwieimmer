# Roadmap – Fröhlich Vermögensberatung

## IPO-Kundenbewertung (16.10.)
- [x] Aktuellen Positionskurs und exakten Zeichnungsbetrag aus der Admin-Verwaltung in allen Kundenansichten übernehmen; mit bestehendem Kundenbestand geprüft

## Kundendepot – Positionsdetails (15.10.)
- [x] Aktien und IPO: Kaufpreis und aktueller Stückpreis, Kaufbetrag, Gesamtwert, Gewinn/Verlust und Kaufdatum klar anzeigen
- [x] Kundenansichten mit vorhandenen Beständen prüfen
- [x] Admin: Ausweis und Rechnung als Adressnachweis für den ausgewählten Kunden hochladen und prüfen (Dateien gespeichert und geöffnet, Zugriffsschutz geprüft; Testdateien entfernt)

## Kundendepot – Darstellung (14.10.)
- [x] Beträge aus der Seitenleiste entfernen und Produktnavigation aufräumen
- [x] Kennzahlen und Anlagekarten professioneller und lesbarer gestalten; mit Kundenkonto auf breitem und schmalem Bildschirm geprüft

- [x] Etappe 1: Alle 819 Original-Frontend-Dateien, 160 Routen, Original-Styling übernommen; alle Seiten laden ohne Absturz (automatisch getestet)
- [x] Etappe 2: Lovable Cloud aktivieren, Datenbank-Tabellen + echte Daten (Banken, Angebote, Länder), Login/Registrierung, Bewertungen, Anfragen – nicht portierte /api-Endpunkte antworten derzeit mit 503
- [x] Etappe 3: Kundenbereich (Dashboard, Depot, Konten, Kontoauszüge, Dokumente)
- [x] Etappe 4: News & Marktdaten + Zeitpläne – wartet auf neue Zugangsschlüssel (Kursdaten, E-Mail)
- [x] Etappe 5: Admin-Bereich mit Rollenprüfung
- [ ] Je Seite eigene Titel/Beschreibung (derzeit gemeinsamer Titel für Unterseiten)

## Etappe 2 – Fortschritt
- [x] Datenbank: Banken (75), Angebote (298), Länder (15), Profile, Rollen
- [x] Öffentliche Schnittstellen: Angebote, Filter, Partnerbanken, Bankverzeichnis, Bankdetail, Kennzahlen
- [x] Anmelden/Registrieren/Passwort-Reset/Passwort ändern, Profil & Onboarding speichern
- [x] Bewertungen, Anfragen, Kontaktformular, Upload (gespeichert + E-Mail an info@essenceinvest.com)
- [x] Kundenbereich-Daten (Guthaben, Depot, Aufträge, Snapshots) – Etappe 3

## Startseite
- [x] Fehlende Originalbilder wiederhergestellt
- [x] Öffentliche Nachrichten, Marktübersicht, Aktien, Analysen und Bewertungen mit echtem Referenz-Datenstand verbunden
- [x] Markenbereinigung: aktive Texte, Seitentitel, interne Bezeichnungen, Bilder und Dokumente auf Fröhlich Vermögensberatung geprüft
- [x] Automatische Aktualisierung der Nachrichten (stündlich) und Kurse (live)

- [x] Aktuelle Kurse/Börsendaten live (Märkte, Währungsrechner) statt Stand 30.9.
- [x] News-Archiv zeigt 'keine Meldungen' beheben

## Vollprüfung (6.10.)
- [x] Alle öffentlichen Seiten + verlinkte Unterseiten auf Fehler/Leerzustände prüfen und beheben
- [x] Alle Fußbereich-Links (Produkte, Sparen, Unternehmen, Rechtliches, Sicherheit) einzeln prüfen: richtige Seite und Inhalt

## Admin-Panel (13.10.)
- [x] Dashboard, Kunden, Depots, Produkte, Aufträge, KYC-Prüfung, Preisverwaltung, Audit-Log, Einstellungen
- [x] Kunden: Verifizierung mit Upload, Mein Depot, Aufträge (erst nach Freigabe)
- [x] Ausweisprüfung als Pflichtschritt nach Registrierung
- [x] E-Mails für Formular-Eingänge laufen (Resend, Absender noreply@essenceinvest.com, Eingang an info@essenceinvest.com); Entscheidung zur Ausweisprüfung meldet sich dem Kunden noch nicht per E-Mail (siehe Punkt unten)
- [x] Begründung bei manuellen Depotbuchungen ist jetzt freiwillig (Pflicht bleibt bei Löschen/Sperren/Ablehnen)
- [x] Buchungen Festgeld/Flexgeld: Felder „verfügbar ab" und „Enddatum" (+ nachträglich änderbar)
- [x] Festgeld-Regel hinterlegen: erste 3 Monate fest, danach frei verfügbar

## Marken-Prüfung (13.10.)
- [x] Seite nach „Alexander Wahl Vermögensverwaltung" durchsucht: kein Treffer in Programmtexten, Datenbank, Live-Seiten und Bildern (nur das allgemeine Wort „Vermögensverwaltung" in einem Anfrageformular)

## Impressum (14.10.)
- [x] Europäische Eindeutige Kennung (EUID) DETT2101V.HRB23436 ins Impressum eingetragen (Abschnitt Handelsregister, neben CIN)
- [x] IPO im Kunden-Depot: Zeichnungskurs je Stück, gezeichneter Betrag, Stückzahl, Zeichnungsdatum und aktueller Kurs; Kurse und Mindestbeträge in Produkte und Preisverwaltung bearbeitbar

## Funktionstest (14.10.)
- [x] Alle Werkzeuge und Bereiche einzeln durchtesten und detaillierte Analyse schreiben (Prüfbericht 14.10.2026)


## Demo- & Haftungshinweise entfernen (14.10.)
- [x] Sichtbare „Demo"-Hinweise entfernen (Wie-geht-Seite, Länderseite, Bankdetail, News-Badge, Vergleich, Rechner)
- [x] „Keine Anlageberatung / keine Anlageempfehlung"-Hinweise entfernen (Rechner, Produktseiten, Themenseite, Impressum, News-/Kursbausteine, Bericht-Generator)

## Mein Vermögen detailliert (14.10.)
- [x] Fehler beheben: Aktien-/IPO-Positionen lieferten kein Einstand/Name → jetzt Legacy-Felder (avg_cost, stocks) + Live-Kurs via Yahoo; Kurskarte gefüllt
- [x] Anleihe-Endpunkt liefert echte Anleihe-Positionen aus dem Depot (vorher immer leer); falsche „Anleihen"-Anzeige im Testkonto korrigiert
- [x] Währungsanzeige: Depotbeträge einheitlich in Euro (vorher $ bei IPO-Positionen)
- [x] Übersicht „Mein Vermögen" zeigt alle Produkte mit Beträgen, Zinssätzen, Stück, Ø-Einstand und G/V (Browser-Test mit Testkonto bestätigt)

## Veröffentlichung (14.10.)
- [x] Alle Änderungen vom 14.10. auf essenceinvest.com veröffentlicht; ausgelieferte Startseite geprüft ( richtiger Titel, Markenname „Fröhlich Vermögensberatung", kein „Kapitalmitte")
- [ ] E-Mail an den Kunden, wenn über seine Ausweisprüfung entschieden wurde – noch nicht eingebaut (Formular-Eingänge gehen bereits per E-Mail an info@essenceinvest.com)

## Vertrags-Code-System (15.10.)
- [x] Backend für Formular-Zugangscodes: Erstellen/Widerrufen/Löschen/Konditionen/Protokoll (Admin), Code-Prüfung + 24-h-Sitzung + Konditionen (Kunde)
- [x] End-to-end getestet: Admin erstellt Code mit Konditionen → Kunde löst Code ein → Bankauswahl → Vertragsformular mit Konditionen; falscher Code abgelehnt
- [x] Auf essenceinvest.com veröffentlicht (zusammen mit KYC-Dokumentverwaltung und Xing-Link, 16.10.)
- [ ] E-Mail an den Kunden bei KYC-Entscheidung – weiterhin offen

## Xing-Profil verlinken (16.10.)
- [x] Xing-Profil verlinkt: im Seitenfuß („Xing-Profil", öffnet neues Fenster) und auf der Kontaktseite; beide Links im Browser geprüft
- [x] Xing-Link auf essenceinvest.com veröffentlicht (16.10.)

## Veröffentlichung (16.10.)
- [x] Xing-Link, entfernte Social-Symbole, neue Depotdetails, Dokumentenverwaltung (akzeptieren/ablehnen/löschen/hochladen), Vertrags-Code-System und Zentrale-Nummer 0671 8-413 9022 auf essenceinvest.com veröffentlicht
- [ ] Sicherheitsprüfung stammt noch vom Stand vor dieser Veröffentlichung – vor breiter Bekanntmachung neu laufen lassen
- [ ] Domain-Anmeldung bei Google (TXT-Eintrag beim Domain-Anbieter) wartet auf den Inhaber
- [ ] E-Mail an den Kunden bei KYC-Entscheidung – weiterhin offen
