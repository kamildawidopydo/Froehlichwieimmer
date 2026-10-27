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

## 24. Changelog 2026-10-27 (Arbeitgebervorstellung + Mobil-Check)
- Neu `components/careers/EmployerProfile.jsx` („Dein Arbeitgeber: Fröhlich Vermögensberatung GmbH“) auf Karriere-Startseite (kompakt) und Über uns (vollständig). Nur bestätigte Angaben aus dem Impressum (Name, Sitz, GF Manfred Franz Fröhlich, AG Bad Kreuznach HRB 23436, § 3 Abs. 2 WpIG, § 34c GewO). Hero-Zeile nennt beide Namen; Über-uns-Überschrift auf Fröhlich umgestellt.
- Mobil geprüft: Begrüßungsfenster + Hamburg-Popup geschlossen → grüner „Jetzt bewerben“ (308×48 px) → /karriere/stellen.


## 23. Changelog 2026-10-27 (Karriere in Hauptwebsite integriert – Vorschau, nicht veröffentlicht)
- /karriere/* jetzt innerhalb des Haupt-`Layout` (gleiche Navigation, Kopfzeile, Footer). Eigene Karriere-Kopfleiste/Footer entfernt; stattdessen Brotkrumen (Startseite › Karriere › …) und Link-Leiste „Karriere bei Essence Invest“ am Seitenende (alle Unterseiten erreichbar).
- Hauptmenü: neuer Punkt „Startseite“ (Desktop + Mobil) neben „News & Märkte“ und „Karriere“.
- Navigation getestet (Desktop + Mobil, Vorschau): Startseite → Jetzt bewerben → Stellen → Karriere → Startseite. Alle Links relativ (keine Preview-Domain). Wartet auf Freigabe zum Veröffentlichen.


## 22. Changelog 2026-10-27 (Original-Logo auf Karriereseiten)
- CareerLayout + RecruitingLayout nutzen BrandLogo (/assets/logo/frohlich-logo-clear.png, identisch zur Hauptseite) statt Text-Wortmarke. Live auf essenceinvest.com/karriere geprüft (Desktop + Mobil); Startseite-Karrierebalken öffentlich sichtbar.


## 21. Changelog 2026-10-27 (Karriere dauerhaft öffentlich)
- Auf Kundenwunsch: `_settings()` liefert site_public immer True (Einschränkung entfernt), Schalter im Dashboard durch Info „Aktiv“ ersetzt. Entwürfe bleiben unsichtbar, Bewerbungen aus. Deploy angestoßen; Prod-Check (https://essenceinvest.com/api/careers/status) nach ~10 Min noch site_public=false → Deploy noch nicht live.


## 20. Changelog 2026-10-27 (Karriere öffentlich – Vorbereitung)
- Balken-Text „Karriere bei Essence Invest – Wir suchen Verstärkung“; leere Jobbörse zeigt „Unsere Stellenangebote erscheinen in Kürze“.
- Vorschau: site_public=true gesetzt (applications_enabled=false, 10 Entwürfe). Produktion: Schalter muss in der Produktions-DB über essenceinvest.com/recruiting/einstellungen aktiviert werden (Agent hat keinen Schreibzugriff auf Prod-DB). Deploy angestoßen.


## 20. Changelog 2026-10-27 (Karriere: Sie-Ansprache, Arbeitgeber, Leerzustand – nur Vorschau)
- Karriere-Startseite: neue H1/Unterzeile/Einleitung („Unser Anspruch“), EmployerProfile „Fröhlich Vermögensberatung GmbH – Lernen Sie uns kennen“ (nur Impressum-Fakten + Marke Essence Invest), Karrierewege mit „Mehr erfahren“ (#karrierewege).
- `JobsEmptyState`: „Ihre Karriere beginnt mit einer Perspektive.“ ersetzt „0 Stellen gefunden“, wenn keine veröffentlichten Stellen und keine Filter; mit Stellen normale Liste.
- Gesamter Karrierebereich + Home-Karrierebalken auf „Sie“; SEED_VERSION=4 (10 Entwürfe auf Sie, bleiben Entwurf). Platzhalter auf „Über uns“ nur für Staff sichtbar.
- NICHT veröffentlicht – Produktion wartet auf Freigabe. Test: iteration_83 (100%).
- Abschluss-Bereich Karriere-Startseite abhängig von `applications_enabled`: aus → „Entdecken Sie Ihre beruflichen Perspektiven“ + „Mehr über uns erfahren“ (/karriere/ueber-uns); an → „Nicht die passende Stelle dabei?“ + „Initiativ bewerben“.

## 21. Changelog 2026-10-27 (Unternehmensbezeichnung – nur Vorschau)
- Karrierebereich: Arbeitgeber = Fröhlich Vermögensberatung GmbH, www.essenceinvest.com = Internetauftritt; „Essence Invest“ als Name aus allen Karriereseiten, Home-Karrierebalken, Bewerber-Mails (careers.py) und 3 Stellenentwürfen entfernt (SEED_VERSION=5).
- Neue Abschnitte: Hero/Intro nach Kundentext, EmployerProfile „Ihr möglicher zukünftiger Arbeitgeber“, ValuesSection (4 Karten, ersetzt Kultur-Karten mit unbestätigten Leistungen), WebsiteSection, Karrierewege-Texte neutral (keine Zusagen).
- Test iteration_84: 100 %. Nicht veröffentlicht.

## 22. Changelog 2026-10-27 (10 Stellen für Veröffentlichung vorbereitet – nur Vorschau)
- Neues Feld `area` (Tätigkeitsbereich, AREAS in careers.py/careersContent.js) + Filter (API `area`, Sidebar, Suchleiste). Filtergruppen ohne Daten werden ausgeblendet.
- SEED_VERSION=6: Tätigkeitsbereich je Stelle, „Das erwartet Sie bei uns“ nur bestätigte Fakten (Sitz, Beratungsansatz, Regulierung), Karriereweg-Texte (unbestätigte Zusagen) entfernt. Arbeitsort/Beschäftigungsart fehlen bei allen 10 → markiert, Veröffentlichung serverseitig blockiert bis ergänzt.
- Stellenkarten: Titel, Arbeitsort, Beschäftigungsart, Bereich, Button „Stelle ansehen“. Detailseite: Aufgabenbereich / Das bringen Sie mit / Das erwartet Sie / Arbeitsort und Beschäftigungsmodell / Bewerbungsprozess; Bewerben-Buttons bei deaktivierten Bewerbungen „Bewerbung in Kürze möglich“ (inaktiv). Bewerbungs-API liefert 403 solange deaktiviert.
- Test iteration_85: Backend 15/15, Frontend 100 %. Alle 10 Entwurf, Bewerbungen aus, nicht deployt.
- 2026-10-27: SEED_VERSION=8 – Beschäftigungsart nach Kundenfreigabe: Nr. 2+3 „Festanstellung oder selbstständige Tätigkeit“, Nr. 4 „Selbstständige Tätigkeit“, übrige „Festanstellung“; Auswahl im Editor ergänzt. Alle 10 vollständig, weiterhin Entwurf, Bewerbungen aus, nicht deployt.
- 2026-10-27 (nach Deploy): SEED_VERSION=9 – 6 neue Entwürfe (Berater: Hamburg, Berlin, Frankfurt am Main, Bad Kreuznach; Finanzberater: Frankfurt am Main, Bad Kreuznach), Bereich Finanzberatung, Beschäftigungsart leer (unbestätigt → Veröffentlichung blockiert). Level vorläufig: Berater=Quereinsteiger, Finanzberater=Berufserfahrene. Insgesamt 16 Entwürfe; Arbeitsort-Filter: Bad Kreuznach, Berlin, Frankfurt am Main, Hamburg. Nur Vorschau.
- 2026-10-27: SEED_VERSION=10 – Mehrfach-Karrierelevel (`levels`-Liste, API-Filter level matcht level oder levels; Editor mit Checkboxen). 6 neue Stellen: Quereinsteiger + Berufserfahrene, „Festanstellung oder selbstständige Tätigkeit“ mit Hinweis „endgültige Vertragsform wird im Bewerbungsprozess festgelegt“. Texte fachlich geschärft (Partnerbanken, regulatorische Dokumentation, Anforderungen auch für Quereinsteiger passend). 16 Entwürfe, Bewerbungen aus, nicht deployt.
- 2026-10-27: Arbeitsort-Filter-Fix – Ursache: Standorte wurden nur aus veröffentlichten Stellen geladen (alle Entwürfe → leere Liste). Jetzt `locations`/`areas` aus Entwürfen + veröffentlichten Stellen (Stellen selbst bleiben privat). Stellenübersicht hat jetzt ein immer sichtbares Arbeitsort-Dropdown neben der Suche. In Vorschau getestet (PC + Smartphone), nicht veröffentlicht.
- 2026-10-27 ~14:50: Filter-Fix auf essenceinvest.com veröffentlicht (Bundle main.9e5793b6.js). Live geprüft ohne Anmeldung: Dropdown mit Bad Kreuznach, Berlin, Frankfurt am Main, Hamburg auf /karriere/stellen und /karriere, PC + Smartphone. 16 Entwürfe privat, Bewerbungen aus.
- 2026-10-27: Stellenbörse ohne veröffentlichte Stellen → `JobsPerspectives` („Entdecken Sie Ihre beruflichen Perspektiven“, 4 Karten, Standort-Chips „zur Orientierung“, mit Dropdown synchronisiert). API liefert `published_total`; bei 0 erscheint der Bereich auch mit Filtern, sonst reguläre Liste. Nur Vorschau.
- 2026-10-27 ~15:10: Stellenbörse (JobsPerspectives) auf essenceinvest.com veröffentlicht (main.4de9ddc0.js). Live geprüft PC + Smartphone ohne Anmeldung. 16 Entwürfe privat, Bewerbungen aus.
- 2026-10-27: Stellenkarten mit „Stelle ansehen“ + grünem „Jetzt bewerben“ (inaktiv solange applications_enabled=false). Bewerbungsformular: Telefon optional, neues Pflichtfeld „Gewünschter Arbeitsort“ (preferred_location, aus Stelle vorausgewählt), Stelle per ?stelle= vorausgewählt, Berufserfahrung/Eintritt aus Formular entfernt. Backend + Recruiting-Detail zeigen Arbeitsort. Test iteration_86: 100 %. Nur Vorschau.
- 2026-10-27: Mitarbeiter (Staff) dürfen in der Vorschau Testbewerbungen auch für Entwurfsstellen absenden (Bewerbungen müssen trotzdem aktiviert sein). E2E-Test Vorschau: Bewerbungen kurz aktiviert → Testbewerbung (Berater Hamburg, PDF) 201, im Dashboard sichtbar, Stelle/Arbeitsort korrekt, PDF-Download ok (anonym 401), Mails ohne Fehler versendet → wieder deaktiviert, Testbewerbung endgültig gelöscht (0 Bewerbungen, 0 Datei-Chunks), Löschprotokoll-Eintrag.
- 2026-10-27 ~15:35: Stellenbörse + Bewerbungsformular auf essenceinvest.com veröffentlicht (main.3adb90e9.js). Live geprüft PC + Smartphone: 4 Standorte wählbar, keine Stellen öffentlich, Formular gesperrt, API-Bewerbung 403. 16 Entwürfe, Bewerbungen aus.


## 19. Changelog 2026-10-27 (Karriere-Einstieg auf der Hauptseite)
- Startseite: `HomeCareerCta` (oben im BankingHero, über den News) mit „Jetzt bewerben“ → /karriere/stellen. Hauptmenü (Desktop + Mobil): „Karriere“ → /karriere.
- Beides nur sichtbar, wenn Karriereseite öffentlich ist ODER Admin/Recruiting angemeldet ist (`lib/useCareerVisible.js`, /api/careers/status) — Besucher sehen bis zur Freigabe nichts.
- Stellen unverändert (10 Entwürfe); jede Stelle hat bereits „Jetzt bewerben“ → /karriere/bewerben?stelle=slug.


## 18. Changelog 2026-10-27 (Stellen 4–7 nach Kundenvorgabe)
- SEED_VERSION=3: Aufgaben/Anforderungen für Vertriebsmitarbeiter, Kundenbetreuer, Recruiting Manager, Social Media & Marketing Manager wortgetreu übernommen; nur unbearbeitete Seed-Entwürfe werden aktualisiert; weiterhin 10 Stellen, alle Entwurf.


## 17. Changelog 2026-10-27 (Stellentexte überarbeitet)
- careers_seed.py SEED_VERSION=2: Stellen 1–3 wortgetreu nach Kundenvorgabe, 4–10 im gleichen Stil formuliert (Kundennachricht brach bei Stelle 4 ab). Seed aktualisiert Inhalte nur bei unbearbeiteten Seed-Entwürfen (is_seed_draft & status draft); manuelles Bearbeiten setzt is_seed_draft=False. Alle weiterhin Entwurf.


## 16. Changelog 2026-10-27 (Karriere: echte Löschung, Design, Bewerbung)
- Bewerbungsdateien: Fernet-verschlüsselt je Datei (Schlüssel mit CAREER_FILES_KEY in backend/.env umhüllt), GridFS-Bucket `career_files`, Schlüssel in `career_file_keys`; Löschung entfernt Datensatz, Chunks und Schlüssel physisch; Löschprotokoll `career_deletion_log` (ohne Personendaten) wird beim Serverstart erneut angewendet (Backup-Wiederherstellung). Automatische Fristlöschung bei Nutzung (max. alle 6 h) — Cron nicht möglich, da bereits 8 Crons (Limit 5). Dokumentation: /app/memory/LOESCHKONZEPT_BEWERBER.md.
- Portal-Bewerbungen in eigener Collection `career_portal_applications` (alte Popup-Route /api/career/apply nutzt weiter `career_applications`, unverändert).
- Design: Hero mit Schnellzugriff-Chips, Jobbörse mit Filter-Seitenleiste (mobil Bottom-Sheet), Listen-Karten, Detailseite mit Bildkopf, Faktenleiste, Teilen-Knopf.
- Bewerbung: Inline-Fehlermeldungen je Pflichtfeld, Datei-Fehler inline, Scroll zum ersten Fehler.
- Getestet: iteration_82_109 (Backend 29/29 + 5/5 Löschung, UI komplett); danach Suchfeld-Überlagerung und Collection-Kollision behoben.


## 15. Changelog 2026-10-27 (Karriereplattform Essence Invest)
- Auftrag (Kunde): Karriere- & Recruiting-Plattform unter /karriere, Aufbau angelehnt an Sparkassen-Jobbörse, Essence Invest als Hauptmarke, Fröhlich Vermögensberatung in Rechtlichem; Bewerbungsformular fertig aber AUS (Admin-Schalter); Rolle „Recruiting“ ohne Kundendaten; Mails an Bewerber + Admin; 10 Stellen nur als Entwürfe; Veröffentlichung erst nach Freigabe.
- Backend `routes/careers.py` (+ `careers_seed.py`): /api/careers/* (status, jobs, jobs/{slug}, applications multipart mit PDF-CV & Anhängen, Honeypot, Zeitcheck, 3/10min Rate-Limit, Frist-Check); Admin: jobs CRUD/Status, applications Filter/Status/Notizen/Löschen/Download, stats, settings (site_public, applications_enabled, retention_days, notify_email), retention run, team (nur Admin).
- Frontend: `components/careers/*`, `pages/careers/*` (Home, Stellen, Detail, 3 Karrierewege, Über uns, Bewerben, Datenschutz-Entwurf), `pages/recruiting/*` (Übersicht, Stellen, Bewerbungen, Detail, Einstellungen). Admin-Nav „Recruiting & Karriere“.
- Schalter standardmäßig AUS: Besucher sehen „in Vorbereitung“, Staff Vorschau inkl. Entwürfe.
- Getestet: iteration_82_108 (29/29 Backend, UI desktop+mobil). Danach behoben: erzwungener Passwortwechsel für Recruiting, Unicode-Dateinamen beim Download, form_started_at Pflicht, Nav-Aktivzustand.
- Bekannt: Dateispeicher hat kein Lösch-API → Dateien werden beim Löschen gesperrt (soft-delete), nicht physisch entfernt.
- Offen/Platzhalter: Standorte, Beschäftigungsarten, Über-uns-Fakten, Datenschutz-Kontakt & Aufbewahrungsfrist.


## 14. Changelog 2026-10-27 (Flexgeld-Festbindung)
- Flexgeld: Festbindung 3 Monate ab Start (backend `lock_until` = active_from + 3 Monate, auch für Altverträge berechnet; active_until aus Laufzeit).
- Neue Monats-Zeitachse `FlexgeldMonthTimeline` (Monat 1–3 gebunden grau, ab Monat 4 flexibel grün); „Aktuell verfügbar“ = 0 € während Bindung; „Lock-Ende“ → „Festbindung bis“/„Frei ab“.


## 13. Changelog 2026-10-27 (/apply Dokument-Upload)
- /apply lud Dateien über Cloudinary ohne Konfiguration → Fehler. Neu: POST /api/applications/documents (eigener Storage, PDF/JPG/PNG, 10 MB, 5/min/IP); Admin-Download über bestehende Admin-Route.
- /api/applications akzeptiert documents jetzt als Liste (vorher Dict → 422); Antrags-Mails nutzten nicht existierendes `_send_email` → auf `_send_email_via_emergent` umgestellt.
- Getestet: iteration_76 (Upload UI + Backend ok; finaler UI-Submit wegen Kamera-Identifizierung nur per Backend geprüft).


## 12. Changelog 2026-10-27 (Kunden-Mails Stil B)
- services/customer_mails.py (render Stil B „Modern hell“, send_later im Hintergrund mit 429-Retry). Trigger: Registrierung (Willkommen), Dokument-Upload mit E-Mail, Auszahlung beantragt/freigegeben/abgelehnt, Admin legt Dokument/Vertrag an, Order ausgeführt (order_execution_service.execute_order).
- Festgeld-Zusammenfassung vollständig (aus formSummaryHtml geparst), abgelaufene Formular-Sitzung → Weiterleitung /formular?abgelaufen=1, Chat-Knopf mobil im Kundenbereich über der Navigationsleiste.
- iteration_75: 100 %. Test-Mails an Owner: 1. kam an, weitere vom Mail-Dienst als „undeliverable recipient“ blockiert (Outlook-Adresse). Testskript: memory/scripts/send_test_mails.py <adresse>.
- Offen: Zoho-MX-Einträge (essenceinvest.com-Postfächer empfangen nichts).

## 11. Changelog 2026-10-27 (Regression + Mail-Entwürfe)
- Register speichert Vorname/Nachname/Land/Telefon. Dokument-Upload: nur Upload-Codes gültig, neues E-Mail-Feld (validiert, im Admin sichtbar + in Admin-Mail). IBAN-Prüfsumme in allen 12 Vertragsformularen (lib/iban.js).
- Sanitizer Admin-Mail (Whitelist + Escape von Resten), Kunden löschen entfernt alle Kundendaten, Rate-Limit-IP = XFF[-3] (echter Client hinter Cloudflare+Ingress; geprüft: Spoofing → 429 nach 10), Besucher-Gate nicht im /admin.
- Mail-Entwürfe 10–15 (je A Klassisch / B Modern hell / C Premium dunkel): /mail-entwuerfe/*.jpg, Generator memory/scripts/mail_drafts.py. Wartet auf Auswahl des Kunden.
- Offen: Festgeld-Formulare senden unvollständige Zusammenfassung; 401-Weiterleitung in Vertragsformularen; Chat-Button überdeckt mobil Tab „Übersicht“.

- Audit Formular / Dokument hochladen / Konto eröffnen (iteration_71/72). Behoben: Absturz bei kurzem Code, Vertrags-PDF + Unterschriften werden gespeichert (storage_files scope contract_submission, Admin-Download), Vertrags-Endpoints nur mit gültiger Formular-Sitzung (Header X-Formular-Session), HTML-Escaping/Whitelist für Admin-Mail, 429-Retry, Rate-Limit pro Client-IP, Scroll nach oben nach Absenden, Register-Texte korrigiert.
- Offen (bekannt): IBAN-Prüfung in Vertragsformularen, Land/Telefon aus Registrierung nicht gespeichert, Formular-Codes auch für Upload gültig, keine MIME-Prüfung per Dateiinhalt.
- Nächster Schritt mit Kunde: E-Mail-Bereiche festlegen, je Bereich Template-Entwürfe zur Auswahl, dann gemeinsame Testläufe.

- Auszahlungen NUR per Kundenantrag (POST /api/portfolio/payout-requests, IBAN mod-97, Betrag reserviert als pending withdrawal) → Admin-Freigabe /admin/payout-requests (approve settles / reject cancels). Admin-Belastungen gesperrt (403), Kontoguthaben-Seite nur Gutschriften.
- Alle 75 Banken mit echtem Logo (frontend/public/assets/bank-logos, Mapping backend/data/seed_production/bank_logos.json, Prod-Sync im production_seed_loader). Logos in Admin-Angeboten, Kundendetail, Depotverträge, Mein Depot.
- Admin-Angebotslisten zeigen alle ~298 (limit=500).
- Audit (iteration_69/70) behoben: Admin-Orderliste GET /api/admin/portfolio/orders, Anleihe-Felder (kaufkurs/kupon_rate/faelligkeitsdatum), Kontoauszug (Verträge, Vorzeichen, Saldo, deutsche Typen), Aktien-Livekurse im Kundendepot, Festgeld-Enddatum aus Laufzeit, Admin-Verlauf mit Historie.
- Bekannt/offen: Gesamtvermögen-Definition (mit/ohne aufgelaufene Zinsen) unterscheidet sich leicht zwischen Kontoauszug und Übersicht; Prozentangaben teils mit Punkt statt Komma; Payout-Lock nur pro Prozess.

