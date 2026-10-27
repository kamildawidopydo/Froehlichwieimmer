# Löschkonzept Bewerberdaten – Karriereplattform Essence Invest (Stand 2026-10-27, Entwurf)

## Was gespeichert wird
- Bewerbungsdatensatz (`career_portal_applications`): Name, Kontakt, Position, Angaben, Nachricht, Status, interne Notizen.
- Dateien (Lebenslauf, Anhänge): AES-verschlüsselt (Fernet) mit **eigenem Schlüssel je Datei**, abgelegt in MongoDB GridFS (`career_files.files/.chunks`).
- Datei-Schlüssel (`career_file_keys`): mit Hauptschlüssel `CAREER_FILES_KEY` (Server-Umgebung) verschlüsselt.

## Löschung
- Manuell (Recruiting → Bewerbung → Löschen) oder per Frist.
- Entfernt endgültig: Bewerbungsdatensatz, alle GridFS-Chunks, Datei-Schlüssel. Keine Zugriffssperre, sondern physisches Löschen in der Datenbank.
- Löschprotokoll (`career_deletion_log`): nur interne ID, Zeitpunkt, Grund, Anzahl Dateien, ausführendes Konto – keine Bewerberdaten.

## Fristen
- Aufbewahrungsfrist: einstellbar (Voreinstellung 180 Tage) ab letzter Bearbeitung der Bewerbung. [Platzhalter: rechtlich bestätigte Frist]
- Automatische Prüfung: bei Nutzung der Karriereseite höchstens alle 6 Stunden, zusätzlich Knopf „Jetzt löschen“.

## Sicherungskopien
- Datenbank-Sicherungen des Hosting-Anbieters: [Platzhalter: Aufbewahrungsdauer beim Anbieter bestätigen]. Gelöschte Daten verbleiben bis zum Überschreiben der Sicherung darin.
- Nach jeder Wiederherstellung wird beim Serverstart das Löschprotokoll erneut angewendet (`reapply_deletion_log`) – bereits gelöschte Bewerbungen und Dateien werden sofort wieder entfernt.
- Frühere Testdateien im alten Objektspeicher (nur aus internen Tests, gesperrt) sind nicht betroffen; neue Bewerbungen nutzen ausschließlich den neuen Speicher.
