# Lovable → Emergent Migration · Übersicht

**Live-Quelle**: https://essenceinvest.com (Lovable, Project `lovp_2bbeh1f01g9feazh19gtw89a8y`)
**Ziel**: Emergent-Preview → Emergent-Prod, DNS später auf Emergent umziehen.

## Vollständige Lovable-Sitemap (33 Seiten)

| # | Pfad | Status in Emergent | Priorität |
|---|---|---|---|
| 1 | `/` | ✓ vorhanden | Textangleich prüfen |
| 2 | `/comparison` | ⚠ prüfen | P0 |
| 3 | `/sparangebote` | ✓ vorhanden (als Vergleich) | prüfen |
| 4 | `/banken` | ⚠ prüfen | P1 |
| 5 | `/partner-banks` | ⚠ prüfen | P1 |
| 6 | `/contact` | ✓ vorhanden | Daten angleichen |
| 7 | `/about` | ⚠ prüfen | P0 |
| 8 | `/legal/impressum` | ✓ existiert als `/impressum` | **Daten angleichen** (P0) |
| 9 | `/datenschutz` | ✓ vorhanden | prüfen |
| 10 | `/how-it-works` | ⚠ prüfen | P0 |
| 11 | `/leistungen` | ⚠ prüfen | P0 |
| 12 | `/philosophie` | ⚠ prüfen | P1 |
| 13 | `/calculator` | ⚠ prüfen | P1 |
| 14 | `/kredit` | ✓ vorhanden | prüfen |
| 15 | `/faq` | ✓ vorhanden | Text angleichen |
| 16 | `/sicherheit-regulierung` | ⚠ prüfen | P1 |
| 17 | `/security` | ⚠ prüfen | P2 |
| 18 | `/compliance` | ⚠ prüfen | P1 |
| 19 | `/bewertungen` | ⚠ prüfen | P2 |
| 20 | `/kundenstimmen` | ⚠ prüfen | P1 |
| 21 | `/nachrichten` | ✓ vorhanden | prüfen |
| 22 | `/news` | ✓ vorhanden | prüfen |
| 23 | `/aktien` | ⚠ prüfen | P1 |
| 24 | `/wissen` | ⚠ prüfen | P1 |
| 25 | `/themen` | ⚠ prüfen | P2 |
| 26 | `/strategie` | ✓ vorhanden | prüfen |
| 27 | `/fonds-grundlagen` | ⚠ prüfen | P2 |
| 28 | `/spezial-aif` | ⚠ prüfen | P1 (neu!) |
| 29 | `/groessere-vermoegen` | ⚠ prüfen | P1 (neu!) |
| 30 | `/inflation-und-vermoegensaufbau` | ⚠ prüfen | P2 |
| 31 | `/savings-education` | ⚠ prüfen | P2 |
| 32 | `/so-funktioniert-der-vergleich` | ⚠ prüfen | P1 |
| 33 | `/newsletter` | ⚠ prüfen | P2 |

## Verbindliche Legaldaten (aus `/legal/impressum`)

- **Firmenname**: Fröhlich Vermögensberatung GmbH
- **Anschrift**: Bösgrunder Weg 62, 55543 Bad Kreuznach, Deutschland
- **Zentrale** (Bad Kreuznach): `+49 (0) 671 8 -413 9022`
- **Telefon Frankfurt**: `+49 (0) 6966 -7785 941`
- **Email**: `kundenservice@essenceinvest.com`
- **Website**: `www.essenceinvest.com`
- **Geschäftsführer**: Manfred Franz Fröhlich
- **V.i.S.d.P.**: Dr. Susanne Müller (§ 18 Abs. 2 MStV)
- **Chefredakteur**: Mark Schubert
- **Redaktionsleitung Ratgeber**: Anna Sommer und Ralf Thomas Ada
- **Amtsgericht**: Bad Kreuznach, **HRB** 23436
- **Crefo-Nr.**: 6010244899
- **Branchencode**: 66.19.9
- **CIN**: T2101_HRB23436
- **EUID**: DETT2101V.HRB23436
- **Aufsicht**: Vertraglich gebundener Vermittler gemäß § 3 Abs. 2 WpIG; Darlehensvermittler gemäß § 34c Abs. 1 S. 1 Nr. 2 GewO (IHK)
- **Verbraucherstreitbeilegung**: Keine Teilnahme / nicht verpflichtet
- **Stand**: September 2026
- **Gegründet**: 2020

## Übernahme-Strategie

1. **Phase 1 — Legaldaten überall angleichen** (P0): Impressum, Footer, Kontaktseite, Mail-Templates
2. **Phase 2 — Fehlende Routen anlegen** (P0): `/about`, `/leistungen`, `/how-it-works`, `/comparison`
3. **Phase 3 — Inhaltlich bestehende Seiten angleichen** (P0): Startseite, FAQ, Impressum-Text
4. **Phase 4 — Neue Lovable-Seiten** (P1): Philosophie, Spezial-AIF, Größere Vermögen, Kundenstimmen, Partner-Banks
5. **Phase 5 — Nice-to-haves** (P2): Wissen, Themen, Inflation, Newsletter-Seite, Compliance
6. **Phase 6 — DNS-Umzug**: Nach Prod-Validierung essenceinvest.com → Emergent
