# Euronews Commercial Licensing — Anfragepaket
_Bereit zum Versand an `salesoperations@euronews.com` bzw. via https://www.euronews.com/commercial/licensing-services_

## 1) Deutsche Version

**Betreff:** Anfrage kommerzielle Content-Lizenz — Deutschsprachige Artikel + Live-TV-Embed für kapital-direkt24.de

Sehr geehrtes Euronews-Commercial-Team,

wir bereiten aktuell die Einbindung deutschsprachiger Euronews-Nachrichten in einen neuen Nachrichtenbereich unserer kommerziellen Website vor und möchten die dafür erforderlichen Rechte offiziell klären bzw. lizenzieren.

**Unternehmen:** Fröhlich Vermögensberatung GmbH
**Domain:** https://kapital-direkt24.de
**Zielmarkt:** DACH (Deutschland, Österreich, Schweiz)
**Sprache:** Deutsch
**Nutzungsart:** Kommerziell (unabhängige Vermögensberatung; keine Werbevermarktung Dritter innerhalb der Nachrichten-Sektion)

**Benötigte Rechte:**
- Anzeige deutschsprachiger Euronews-Artikel (Überschrift, Teaser/Summary, Vorschaubild, Veröffentlichungszeit)
- Darstellung des vollständigen Artikeltextes auf unserer Domain (keine Pflicht-Weiterleitung pro Artikel)
- Einbettung offizieller Euronews-Video-Embeds (kein Rehosting)
- Optional: Einbettung des offiziellen deutschsprachigen Live-TV-Players
- Verwendung von „Quelle: Euronews" und ggf. Euronews-Logo gemäß Ihrer Markenrichtlinien

**Technisch:** Wir konsumieren Ihre Inhalte über einen offiziellen MRSS- / API-Zugang. Cache serverseitig (5–15 Min), keine automatischen Übersetzungen, keine Modifikation Ihrer Inhalte. Die technische Oberfläche ist bereits vollständig vorbereitet — sobald die Lizenz steht, tauschen wir lediglich den Data-Connector.

**Bitten wir um Auskunft zu:**
1. Verfügbarkeit einer entsprechenden Lizenz
2. Preisstruktur (Monats-/Jahresabo, Bereichsstaffelung)
3. Vertragslaufzeit und Kündigungsfristen
4. Technische Zugangsart (MRSS, REST-API, S2S-Feed)
5. Attribution- und Branding-Anforderungen
6. Reporting-Verpflichtungen (Abrufzahlen o. Ä.)
7. Ansprechpartner für den technischen Onboarding-Prozess

Für Rückfragen stehe ich Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen
[Name / Rolle]
Fröhlich Vermögensberatung GmbH

---

## 2) English Version

**Subject:** Commercial content licence request — German-language articles + live TV embed for kapital-direkt24.de

Dear Euronews Commercial Team,

We are preparing a new news section on our commercial website and would like to officially clarify or license the rights required to embed Euronews German-language content.

**Company:** Fröhlich Vermögensberatung GmbH
**Domain:** https://kapital-direkt24.de
**Target market:** DACH (Germany, Austria, Switzerland)
**Language:** German
**Type of use:** Commercial (independent wealth advisory; no third-party ad monetisation inside the news section)

**Rights requested:**
- Display of German-language Euronews articles (headline, teaser/summary, thumbnail, publication timestamp)
- Full-article display on our domain (no mandatory per-article redirect)
- Embedding of official Euronews video players (no rehosting)
- Optional: embedding of the official German live TV player
- Use of "Source: Euronews" attribution and Euronews logo per your brand guidelines

**Technical:** We consume your content via an official MRSS / API endpoint. Server-side caching (5–15 min), no automated translation, no modification of your content. The interface is fully prepared — once the licence is in place, we simply swap the data connector.

**Please advise on:**
1. Availability of such a licence
2. Pricing structure (monthly / annual, tiering)
3. Term length and termination clauses
4. Technical access format (MRSS, REST API, server-to-server feed)
5. Attribution and branding requirements
6. Reporting obligations (article views etc.)
7. Point of contact for the technical onboarding

Please let me know if you require further information from our side. Happy to schedule a call.

Best regards,
[Name / Role]
Fröhlich Vermögensberatung GmbH

---

## 3) Checkliste — Angaben, die Euronews vermutlich benötigt

| # | Angabe | Vorschlag / Platzhalter |
|---|---|---|
| 1 | Unternehmensname | Fröhlich Vermögensberatung GmbH |
| 2 | Rechtsform + HRB | GmbH + HRB-Nr. eintragen |
| 3 | Domain(s) | kapital-direkt24.de (+ Preview) |
| 4 | Zielmärkte | Deutschland, Österreich, Schweiz |
| 5 | Zielgruppe | Vermögende Privatanleger, HNWI |
| 6 | Geschätzter Traffic | monatliche Sessions (schätzen) |
| 7 | Monatliche Seitenaufrufe | Page Views/Monat |
| 8 | Gewünschte Inhalte | Artikel, Bilder, Video-Embed, optional Live-TV |
| 9 | Sprache | Deutsch (ausschließlich) |
| 10 | Art der Nutzung | Kommerziell, non-monetised innerhalb der News-Sektion |
| 11 | Vertragslaufzeit | 12 Monate bevorzugt |
| 12 | Technische Integration | MRSS / REST-API + serverseitiger Cache |
| 13 | Branding | „Quelle: Euronews" + Logo laut Ihrer Guidelines |
| 14 | Reporting | ggf. monatliche Abrufzahlen pro Kategorie |
| 15 | Datenschutz | DSGVO, kein Tracking innerhalb der News-Cards |
| 16 | Ansprechpartner | Name, E-Mail, Telefon |
| 17 | Budget-Rahmen | intern zu klären (bevor Anfrage rausgeht) |

---

## 4) Nächste Schritte
1. Fehlende Werte (Traffic, HRB, Budget, Ansprechpartner) ergänzen
2. Anfrage an `salesoperations@euronews.com` senden — parallel Kontaktformular unter https://www.euronews.com/commercial/licensing-services ausfüllen
3. Nach Rückmeldung: Vertragsentwurf prüfen (idealerweise mit IP-/Medien-Jurist)
4. Nach Vertragsschluss: `EuronewsLicensedProvider` in `/app/backend/news_provider.py` aktivieren, `active_provider = EuronewsLicensedProvider()` setzen, MRSS/API-Adapter einbauen, DEMO-Content deaktivieren
