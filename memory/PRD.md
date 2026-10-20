## Update 2026-10-20 – Dashboard-Routing
- FIXED: Fehlende Routen /dashboard/mein-depot, /dashboard/markt, /dashboard/verifizierung in App.js ergänzt (vorher Redirect auf Übersicht). Mein-Depot-Positionen verlinken im Dashboard auf /dashboard/aktien/:symbol.
- Getestet (Desktop): alle 20 Sidebar-Links, Topbar und Deep-Link-Reload bleiben im Dashboard. Mobile (390px) NICHT getestet, weil die Credits aufgebraucht sind.
- OFFEN (P0): Diese Links in den Seiten führen noch aus dem Dashboard hinaus: Service.jsx (/contact, /contact#rueckruf), Festgeld/Tagesgeld/Flexgeld "Neu eröffnen" (/comparison?product=...), FavoritesPage (/comparison, /apply), NewsDetailPage/NewsVideoPage "Auf der Website ansehen" (öffentliches /news/...).
- OFFEN (P2): "Markt & Handel" und "Markt" in der Sidebar führen auf dieselbe Seite.


# Essence Invest / Fröhlich Vermögensberatung — Product Requirements Document

**Letzte Aktualisierung**: Februar 2026 (Session: Prod-DB-Sync via idempotenten Startup-Seeder + Redeploy)

## 1. Original Problem Statement

User betreibt eine Pan-European Savings/Credit-Comparison-Plattform „essenceinvest.com" (vormals Kapital-Direkt24, operiert durch die **Fröhlich Vermögensberatung GmbH**, Bad Kreuznach). Die Plattform umfasst:

- **Zinsvergleich** (Tages-/Fest-/Flexgeld) für EU-Raum
- **Kredit-Vergleich** für Deutschland
- **Mein-Depot** für Kunden (Verträge, Positionen, Fälligkeiten, Steuer)
- **Admin-Dashboard** (38 Admin-Pages — Banken, Angebote, Leads, KYC, etc.)
- **News & Märkte** mit täglicher Pipeline + Euronews-Videos
- **Dokumente** (Vertragsvorlagen, Produktinfos, Risiken, Kundendokumente)
- Marketing-Seiten (About, Leistungen, Philosophie, Sicherheit, Spezial-AIF, Kundenstimmen)

**Technologie-Stack**: FastAPI + MongoDB (Backend), React 19 + Tailwind + shadcn/ui (Frontend), Emergent-Platform (Hosting).

## 2. Aktuelle Status (Oktober 2026)

- **Preview-URL**: https://finance-platform-v2.preview.emergentagent.com
- **Production-URL**: https://finance-platform-v2.emergent.host (Deployment läuft)
- **Custom-Domain**: `essenceinvest.com` zeigt aktuell noch auf Lovable (DNS-Umzug steht an)

## 3. Was in dieser Session gemacht wurde

### Session (Feb 2026, Part 2): Vertrags-E-Mail-Endpoints wiederhergestellt
Beim Lovable→Emergent Umzug waren **13 Vercel-Edge-Functions nicht mitmigriert worden**
(alle `send-*-email`-Endpoints für BBVA/bunq-NL/bunq-DE/ING/Postbank/Knab × Flex+Fest + Contact).
Konsequenz: Kunde füllt Vertragsformular aus → Erfolgs-Screen zeigt sich, aber **weder
Admin noch Kunde erhielten E-Mail**, und der Vertrag landete **nicht** in `contract_form_submissions`.

Umgesetzt:
1. ✅ Neuer Router `/app/backend/routes/contract_submissions.py`
   - 12 Vertrags-Endpoints + `/api/send-email` (Contact)
   - Pattern: Config-Tabelle + One-Function-Handler + Loop-Registration
   - Persistenz in `contract_form_submissions` (vor Mail-Versand → Idempotenz-sicher)
   - Admin-Mail an `kundenservice@essenceinvest.com` mit Vertrags-PDF + Signatur-Attachments
   - **NEU**: Kunden-Bestätigungsmail mit Vertrag im Anhang (Lovable hatte das nicht)
   - Rate-Limit (5/min/IP), Validierung via Pydantic
2. ✅ `templates/bestandskunden_bestaetigung.html`: „Kapitalmitte"→"Fröhlich" (Header + Signatur)
3. ✅ `routes/customer_confirmations.py`: Betreff + Signatur-Zeile aktualisiert
4. ✅ End-to-End-Test: alle 13 Endpoints HTTP 200, Submissions in DB

### Session (Feb 2026, Part 1): Prod-DB-Sync via Startup-Seeder + Redeploy
1. ✅ Preview-DB-Snapshots exportiert nach `backend/data/seed_production/`:
   - `banks.json` (75), `savings_offers.json` (298), `credit_offers.json` (5)
2. ✅ Idempotenter Startup-Loader `backend/production_seed_loader.py` erstellt:
   - Match-Logik: banks→slug · savings→source_id/composite · credit→source_id/(bank_id+product_name)
   - Keine Overwrites bestehender Datensätze
   - Kill-Switch: ENV `PRODUCTION_SEED_ENABLED=false`
3. ✅ In `backend/server.py` → `on_startup()` nach `seed_reviews_from_snapshot` verdrahtet
4. ✅ Smoke-Test gegen temporäre leere Test-DB bestanden: 75+298+5 inserted; zweiter Lauf 100% skipped_existing
5. ✅ Preview-Logs zeigen bei jedem Boot: `production_seed: done — ... skipped_existing=75/298/5`
6. ✅ Redeploy via `deployer_agent` angestoßen (job_id `4cb1a3eb-...`)

### Vorsession (Okt 2026): Lovable → Emergent Komplett-Migration
1. ✅ Lovable-Code via ZIP-Export analysiert (1254 Dateien, 47 MB)
2. ✅ 90 %-Übereinstimmung mit Emergent-Code festgestellt
3. ✅ Lovable-DB über Public-REST-API ausgelesen (75 Banken + 298 Angebote + 15 Länder)
4. ✅ ContractCard-Upgrade mit Länderflagge + Einlagensicherung-Badge + Chevron
5. ✅ 8 neue Komponenten übernommen (LegacyApp, LegacyShell, SitePrivacyNotice, SecurityPositionCard, Steuerübersicht, sidebar.tsx, chart.tsx, use-mobile.tsx)
6. ✅ 10 Dashboard-Komponenten mit Lovable-Version überschrieben (siehe `/app/memory/lovable_migration/06_SESSION_STATUS.md`)
7. ✅ `legalPages.jsx` auf Lovable-Volltext aktualisiert (Dr. Susanne Müller als V.i.S.d.P., EUID, Crefo-Nr., Redaktion, Zentrale-Telefon)
8. ✅ Backend-Daten-Backfill für Norisbank (country_code=DE, deposit_protection=100.000 €)
9. ✅ Problem „Nur 9 Angebote in API" war Cache-Artefakt — API gibt tatsächlich 297/298 Angebote aus
10. ✅ Alle Phase-A+B PDFs vorher sauber umgebrandet (keine „kapital-direkt24.de"-Reste mehr)

## 4. Daten-Konsolidierung

**Lovable (via Public REST API) → vollständig lokal gespeichert**:
- `/app/memory/lovable_migration/data/banks.json` (75)
- `/app/memory/lovable_migration/data/savings_offers.json` (298)
- `/app/memory/lovable_migration/data/countries.json` (15)
- `/app/memory/lovable_migration/data/credit_offers_fixture.json` (1)

**Emergent Preview-DB** (identisch):
- banks: 75 · savings_offers: 298 · countries: 15 · credit_offers: 5

**Lovable-Tabellen ohne Daten** (also keine User-/Vertragsdaten zu migrieren!):
customers, profiles, portfolios, portfolio_positions, transactions, kyc_documents, kyc_reviews, formular_sessions, audit_logs, user_watchlist, user_roles, products, product_assignments, price_alerts, price_history, discount_codes, formular_access_codes, formular_access_logs, form_submissions, app_settings, staff_permissions.

## 5. Backlog (für Folge-Sessions)

### P0 — Nach Prod-Deployment zu verifizieren
- ✅ Prod-MongoDB wird beim Backend-Boot automatisch mit 75 Banken + 298 Sparangeboten + 5 Kreditangeboten befüllt (via `production_seed_loader`)
- Nach Deployment: Prod-Startup-Logs auf `production_seed: done` prüfen
- ✅ Vertragsformulare schreiben wieder in `contract_form_submissions` und senden Admin+Kunden-Mail (via `contract_submissions`-Router)
- Nach Deployment: 1 Testantrag live absenden → beide Mails und Admin-UI-Eintrag prüfen
- `/legal/impressum` lädt mit vollem Dr. Susanne Müller / EUID / Crefo-Text
- `/dashboard/flexgeld` zeigt Flaggen + Einlagensicherung-Badges auf Verträgen (login erforderlich)
- `/comparison` zeigt alle 297 Angebote inkl. „unverifiziert"-Hinweis

### P1 — DNS-Umzug
- Registrar klären (User: „brauchen wir jetzt noch nicht")
- CNAME/A-Record Instructions bei Emergent anfragen
- Erst nach Prod-Validierung durch User umschalten

### P2 — Weitere Qualitätssprünge
- Angebotsverifizierungs-Workflow im Admin (Button „Als verifiziert markieren")
- „Was ist neu?"-Widget auf Startseite
- Sparalarm per E-Mail bei Zinsänderungen
- Automatisierte Scraping-Pipeline für Konditionen (nach rechtlicher Prüfung)
- Rate-Limit-Mocks für Backend-Tests (429-Flakyness)

## 6. Credentials & Zugänge

Siehe `/app/memory/test_credentials.md`

## 7. Session-Dokumente (Referenz)

- `/app/memory/lovable_migration/01_SITEMAP_AND_PLAN.md`
- `/app/memory/lovable_migration/02_IMPRESSUM.md` (Lovable-Volltext)
- `/app/memory/lovable_migration/03_ABOUT.md`
- `/app/memory/lovable_migration/04_LEISTUNGEN_HOWITWORKS.md`
- `/app/memory/lovable_migration/05_FULL_ANALYSIS.md`
- `/app/memory/lovable_migration/06_SESSION_STATUS.md`
- `/app/memory/lovable_migration/data/*.json` (DB-Snapshots)
- `/app/memory/lovable_migration/overwrite_backup/1792445481/` (Rollback-Punkt)
