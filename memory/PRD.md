## Update 2026-10-26 – Admin-Konto petrowski616@outlook.com
- Auf Kundenwunsch Admin mit eigenem Passwort (aus Secret LOVABLE_ADMIN_PASSWORD, kein Passwort im Code). Vorschau: Login, /admin und Depot geprüft.
- Produktion: lovable_import_loader._set_admin_password setzt beim Start einmalig (Flag admin_password_from_env) das Passwort aus LOVABLE_ADMIN_EMAIL/LOVABLE_ADMIN_PASSWORD (live-Slots vorhanden). Greift erst nach dem nächsten Veröffentlichen.

## Update 2026-10-26 – Startseiten-Fehler auf essenceinvest.com + Kunden-Abläufe geprüft
- Ursache: Produktion ruft API über finance-platform-v2.emergent.host auf (Cross-Origin von essenceinvest.com) -> CORS blockiert alles. Fix: frontend/src/lib/apiBase.js nutzt Same-Origin, wenn Hostname abweicht; 11 Dateien auf getApiBase() umgestellt. Getestet (iteration_64/67). LIVE erst nach Redeploy.
- Sicherheitslücke behoben: /api/auth/forgot-password gab Reset-Token im JSON zurück (Kontoübernahme möglich). Jetzt nur {status:'ok'} + Reset-Mail (vom Kunden selbst ausgelöst, Link 1 h gültig, Hintergrund-Task).
- Dokument-Upload: Codes aus Admin > Dokument-Uploads funktionierten nie (falsche Collection) -> behoben, Einmal-Code wird als „verwendet“ mit Name markiert; Admin-Mail bei Upload; Klartext-Code bleibt nach Aktualisieren sichtbar; Upload-Rate-Limit greift wieder.
- Rate-Limits nutzen rechten X-Forwarded-For-Eintrag (nicht mehr spoofbar); Formular-Code-Sperre pro echter Kunden-IP statt global.
- Karriere-Popup nicht mehr auf /dokument-upload, /apply, /onboarding.
- E-Mail-Vorschauen (8 Vorlagen) gerendert unter /root/mailvorschau (*.png).

## Update 2026-10-24 – Depotauszug-Analyse (aus Lovable nachgebaut)
- Admin-Seite /admin/depot-statement-analysis (Sidebar „Vermögen & Depot“), Upload PDF/Bild ≤10 MB, CSV/TXT oder Text; KI (Gemini gemini-3.1-pro-preview, Emergent LLM Key) liefert Inhaber, Stichtag, Gesamtwert, Positionen, Aufteilung, Zusammenfassung, Hinweise. Nichts wird gespeichert. Nur Admins (401/403).
- Dateien: backend/routes/admin_depot_analysis.py, frontend/src/pages/admin/AdminDepotStatementAnalysis.jsx. Getestet iteration_63: 100 %.
- Noch nicht live (Redeploy nötig).

## Update 2026-10-24 – Lovable-Kunden importiert (Vorschau) + Seitenleiste
- Lovable Cloud (Supabase aspdfftfjtajmyuctaau) per Admin-Login gelesen (nur lesend). Inhalt: 8 Profile (7 E-Mails, Kurt Del Missier doppelt -> zusammengeführt), 1 Newsletter, 1 bunq-Antrag (Testdaten), sonst alle Tabellen leer.
- backend/data/lovable_import/import.json + lovable_import_loader.py (Startup, idempotent): legt Konten (imported_from=lovable, Zufallspasswort, must_change_password), Newsletter, Vertragsantrag an. KEINE E-Mails an Kunden (ausdrücklicher Kundenwunsch 2026-10-24: Kunden nur kontaktieren, wenn er es sagt). petrowski616@outlook.com = admin (wie in Lovable).
- In Vorschau importiert.
- Seitenleiste: doppelter Eintrag „Markt & Handel“ entfernt; /dashboard/markt -> /dashboard/handeln.
- Noch nicht live: Redeploy nötig (verschickt KEINE E-Mails).

## Update 2026-10-23 – Lovable-Abgleich geprüft
- 33 Lovable-Seiten auf Produktion (essenceinvest.com) + Vorschau durchgeklickt: 29 ok, 4 fehlten (landeten auf Startseite): /sparangebote, /datenschutz, /aktien, /inflation-und-vermoegensaufbau -> jetzt Weiterleitungen (comparison, legal/privacy, news/aktien, finanzwissen/was-anleger-ueber-inflation-wissen-sollten). Nur Vorschau, Redeploy nötig.
- Produktion enthält bereits: Vertrags-E-Mail-Endpoints, Depot-Routing-Fixes. Fehlt in Produktion: Karriere-Popup, die 4 Weiterleitungen.
- Bewusst nicht übernommen (siehe lovable_migration/07_AUDIT_REPORT.md): Lovable-DashboardDataContext, Münchner Telefonnummer, lokale JSON-Daten, PageMeta-Stub.
- Lovable-Kundendaten (Supabase) nicht migriert.

## Update 2026-10-23 – Karriere-Popup „Finanzberater Hamburg“
- Popup neu gestaltet exakt nach Mockup Modell 1 (weiße Kopfleiste mit X, Hafen-Panorama mit Elbphilharmonie, „Karriere in Hamburg“, „Finanzberater gesucht“, ein Satz, Buttons „Jetzt bewerben“/„Später“). Bild lokal: /assets/career/hamburg-hafen.jpg (Pexels).
- Popup (ursprünglich Entwurf 1: Hamburg-Foto + Navy/Gold) auf allen öffentlichen Seiten, einmal pro Browser-Sitzung; nicht auf /dashboard, /admin, /login. Erscheint erst nach dem Besucher-Willkommensfenster.
- „Jetzt bewerben“ -> Formular (Name, E-Mail, Telefon, Nachricht, Lebenslauf PDF/Word ≤ 8 MB, Einwilligung) -> POST /api/career/apply -> Mongo `career_applications` + E-Mail an Admin-Adresse (mit Anhang) + Bestätigung an Bewerber.
- Dateien: backend/routes/career.py, frontend/src/components/career/*. Getestet (iteration_62): Backend 100 %, Frontend ok; Mobile-Überlauf behoben.
- Noch nicht live auf Produktion (Redeploy nötig).

## Update 2026-10-23 – Domain essenceinvest.com: LIVE (HTTP 200, apex + www, 4 A-Records DNS only nach Support-Vorgabe; Domain in Emergent manuell neu verknüpft)
## Historie Domain-Debugging
- Kunde hat CLOUDFLARE_API_TOKEN (Zone-DNS) hinterlegt; Zone-ID d8c7e9e7b2e2e4ec8de12071906fed78.
- Getestet: A-Records (grau/orange) -> 1034; CNAME -> finance-platform-v2.emergent.host (grau/orange) -> 1014.
- Aktuell eingetragen (seit Folgetest 2026-10-23): CNAME @ und www -> finance-platform-v2.emergent.host, orange (proxied) = Zielkonfiguration nach O2O-Freigabe; ergibt bis dahin 1014. Mail/SPF/DKIM unverändert.
- Deployer-RCA: Emergent muss O2O / Custom-Hostnames 939187fd-727d-41c4-8a5e-120219ab555f und 64c7b588-3804-42a8-b49c-6122bfc3a14d neu validieren. Danach laut Deployer: CNAME @ und www -> finance-platform-v2.emergent.host, orange (proxied).
- Korrigiert: mail./autoconfig./autodiscover. jetzt CNAME -> privateemail.com (grau), SRV _autodiscover._tcp ergänzt; Always-HTTPS an, Min-TLS 1.2. Kein privateemail-DKIM vorhanden (nur resend._domainkey).
- Lovable-Daten (Supabase zvzbszdlnbbcxdemwhze) NICHT migriert: Kunde hat Service-Role-Key übersprungen; Alternative: Export aus Lovable.

## Update 2026-10-21 – ING Belgien PDFs
- Erstellt aus den Kunden-Vorlagen (ING NL Flexgeldvertrag, ING DE Produktinformationsblatt Flexgeld): ING_Belgien_Flexgeldvertrag.pdf und ING_Belgien_Produktinformationsblatt_Flexgeld.pdf.
- Ablage: /app/memory/ing_belgien/ (Quelle + build.py in src/) und öffentlich unter /assets/documents/ing-belgien/.
- Bankdaten (vom Kunden bestätigt): ING Belgien SA/NV, Avenue Marnix 24, 1000 Brüssel, Unternehmensnr. 0403.200.393; belgischer Garantiefonds bis 100.000 EUR. Steuer-Text wie Vorlage (deutsche Abgeltungsteuer). Konditionen unverändert.
- Unverändert aus Vorlage: Ref-Nummern/Barcodes, Datum 11.06.2026.

## Update 2026-10-20 – Dashboard-Routing
- FIXED: Fehlende Routen /dashboard/mein-depot, /dashboard/markt, /dashboard/verifizierung in App.js ergänzt (vorher Redirect auf Übersicht). Mein-Depot-Positionen verlinken im Dashboard auf /dashboard/aktien/:symbol.
- Getestet (Desktop): alle 20 Sidebar-Links, Topbar und Deep-Link-Reload bleiben im Dashboard. Mobile (390px) NICHT getestet, weil die Credits aufgebraucht sind.
- FIXED: Service-Karten -> /dashboard/support; "Neu eröffnen" (Festgeld/Tagesgeld/Flexgeld) und Favoriten-Vergleichsbuttons öffnen den Vergleich in neuem Tab; News "Auf der Website ansehen" in neuem Tab. Geprüft per Screenshot (Desktop + Mobil 390px).
- Bewusst unverändert: Favoriten "Bewerben" -> /apply (Antragsstrecke), Logo -> Startseite.
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

## 8. Changelog 2026-10-26
- Admin-Sidebar: alle Plattform-Links zeigen auf echte Seiten (vorher Startseite).
- Admin legt Kunden an → Willkommens-Mail mit vorläufigem Passwort (must_change_password). Kunden löschen (nicht Admins).
- Onboarding: Land bis 80 Zeichen.
- Test-Kunde tester@mester.de via TEST_CUSTOMER_EMAIL/PASSWORD (Startup-Seed).
- Marktübersicht-Charts unter eigener Domain repariert (marketSparklineService/stockHistoryService).
- NEU routes/admin_customer_assets.py: Admin trägt pro Kunde Festgeld/Tagesgeld (depot_contracts), Aktien, Anleihen, Dokumente ein; Profil-PATCH; Sparangebote CRUD (/api/admin/offers). Kunde: /api/portfolio/depot-contracts, /api/portfolio/documents.
- Frontend: AdminCustomerAssetsPanel auf /admin/users/:id; Kunden-Dokumente-Seite zeigt persönliche Dokumente; Angebot-Modal speichert wirklich.
- Offen: Zoho-MX-Einträge (wartet auf „Ja“ vom Kunden); KI-Guthaben (Universal Key) leer.

