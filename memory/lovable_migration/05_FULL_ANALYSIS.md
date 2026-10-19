# Lovable → Emergent Komplett-Analyse

**Quelle**: /app/lovable_source (aus creation-core-zone.zip, 1254 Dateien, 47 MB)
**Datum**: Oktober 2026

## 🎉 GUTE NACHRICHT — Code ist zu 90% schon kompatibel

Beide Projekte stammen offensichtlich aus derselben Basis:
- **Lovable**: 877 React-Source-Dateien
- **Emergent**: 816 React-Source-Dateien (nur ~61 weniger)
- **Dashboard-Seiten**: Dateinamen 100% identisch (23/23 Seiten)
- **ContractCard**: 99% identisch — nur kosmetische Styling-Unterschiede
- **Komplett neue Komponenten in Lovable**: nur 2 (SecurityPositionCard.jsx, Steuerübersicht.jsx)

## 📊 Depot/Flexgeld Vergleich (deine konkrete Anfrage)

### Was Lovable anders macht (basierend auf dem Screenshot)

Der Screenshot zeigt die **Flexgeld-Übersicht** mit:
- ✅ Breadcrumb "Mein Vermögen > Flexgeld"
- ✅ Tab-Navigation: Übersicht · Festgeld · Tagesgeld · **Flexgeld** · Anleihen · Aktien · IPO
- ✅ H1 "Flexgeld" mit Sub "Hybride Anlage mit Tageszugriff und attraktiver Verzinsung"
- ✅ Button rechts "+ Flexgeld eröffnen"
- ✅ **4 KPI-Karten**: Gesamtwert · Ø Zinssatz · Tageszins · Aktuell verfügbar
- ✅ Angebot-Karten mit:
  - Bank-Logo links (bunq/Klarna/Openbank/Banca Progetto)
  - Bank-Name + Länderflagge + "Flexgeld" Label
  - Einlagensicherung-Badge (grün umrandet)
  - Zinssatz rechts groß (6,23% p.a.)
  - "Aktiv"-Status-Badge
  - 7 Metrik-Spalten: Anlagebetrag · Zinssatz · Aufgelaufene Zinsen · Verfügbar (nach Lock) · Startdatum · Enddatum · Restlaufzeit
  - Pfeil-Chevron rechts (für Detail-Click)

### Was Emergent AKTUELL schon hat

- ✅ Tab-Navigation `VermoegenSubNav.jsx` (vorhanden)
- ✅ FlexgeldPage.jsx (vorhanden)
- ✅ ContractCard.jsx (vorhanden, aber Styling abweichend)
- ✅ KPI-Berechnungen (flexgeldAggregate etc.)

### Was fehlt oder abweicht

| Was | Status | Aufwand |
|---|---|---|
| Länderflagge auf Karte | ⚠ fehlt | niedrig (bank.country_code → flagcdn.com) |
| Einlagensicherung-Badge auf Karte | ⚠ fehlt | niedrig (bank.deposit_insurance_eur ist schon im Datenmodell) |
| Chevron rechts (Detail-Click) | ⚠ fehlt | sehr niedrig |
| "+ Flexgeld eröffnen" Primary Button | ⚠ existiert evtl. als anderer Text | niedrig |
| Card-Styling: flacher (keine Shadow, rounded-lg statt 2xl) | ⚠ Lovable ist moderner | niedrig |
| "Verfügbar (nach Lock)" statt "Verfügbar ab" | ⚠ Text-Unterschied | sehr niedrig |

## 🎯 Zusätzliche Unterschiede im ganzen Projekt

| Bereich | Lovable | Emergent | Priorität |
|---|---|---|---|
| mein-depot/Steuerübersicht.jsx | ✅ existiert | ❌ fehlt | P2 |
| portfolio/SecurityPositionCard.jsx | ✅ existiert | ❌ fehlt | P2 |
| Marketing-Seiten (/about, /leistungen, /spezial-aif usw.) | ✅ mit Volltext | ⚠ teilweise | P1 |
| Impressum mit vollständigen Daten (Dr. Susanne Müller, EUID, Crefo etc.) | ✅ | ⚠ reduziert | P0 |
| Admin-Bereich | gleiche Dateinamen | gleiche Dateinamen | muss Zeile-für-Zeile verglichen werden |

## 🚀 Vorgeschlagener Ablauf

1. **Phase 1 — Depot-Flexgeld jetzt sofort angleichen** (dein Screenshot-Wunsch, 1-2 Std)
   - ContractCard: Länderflagge + Einlagensicherung-Badge + Chevron hinzufügen
   - Styling: `rounded-lg`, Header-Font-Size, "Verfügbar (nach Lock)"-Text
   - Dasselbe automatisch auch auf Festgeld/Tagesgeld/Anleihen-Seiten
2. **Phase 2 — Admin-Bereich Diff-Scan** (identifiziere was in Admin ergänzt werden muss)
3. **Phase 3 — Komplette Marketing-Seiten übernehmen** (About, Leistungen, Spezial-AIF etc.)
4. **Phase 4 — Impressum/Legal auf Vollversion heben**
5. **Phase 5 — Supabase DB-Dump → MongoDB migrieren** (Kundendaten, Verträge, Admin-Einstellungen)
6. **Phase 6 — DNS: essenceinvest.com von Lovable auf Emergent umziehen**

## Daten-Migration (später, Phase 5)

Lovable nutzt **Supabase (PostgreSQL)** + Drizzle ORM.
Emergent nutzt **MongoDB**.

- Tabellen in `/app/lovable_source/drizzle/schema.ts` und `/app/lovable_source/supabase/migrations/`
- Export: Supabase Dashboard → SQL/CSV-Export oder `pg_dump`
- Mapping: Pro Tabelle 1 Script, das Supabase-Zeilen → MongoDB-Dokumente konvertiert
- Nicht übernehmen: Supabase-Auth → Emergent nutzt eigenes JWT-System (Mapping über E-Mail)
