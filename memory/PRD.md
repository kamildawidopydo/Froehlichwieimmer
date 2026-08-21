# Kapitalmitte / Webmain — Migration PRD

## Original Problem Statement
Bestehendes Repo `gregorbraun36/webmain` 1:1 in dieses Projekt übernehmen und auf FastAPI + MongoDB migrieren. Frontend behalten, Backend (Supabase + Cloudflare Workers) neu aufbauen.

## User Choices (Feb 2026)
- **Repo**: Zugriff via GitHub PAT (Token muss revoked werden!)
- **DB**: MongoDB (Stack-Default)
- **Marktdaten-Provider**: Alpha Vantage (default) — API-Key noch nicht gesetzt
- **User-Migration**: Fresh JWT-Auth (keine Supabase-User-Migration)
- **Content-Automation**: Aus Phase 1 raus
- **LLM (später)**: Emergent Universal Key
- **Umfang**: "alles" = a+b+c → Inventar + FastAPI-Migration; Supabase-Creds für b noch offen

## Architecture

### Frontend (übernommen, 1:1)
- React 18 + Craco + Tailwind + shadcn/ui + Radix
- react-router-dom v7 mit 100+ Routen (Marketing, Dashboard, Admin, Banken)
- Zustand: Context (AuthContext, ThemeContext, SocialPreviewContext)
- i18next (Deutsch primär)
- Charts: visx, recharts, lightweight-charts
- Sentry, Cloudinary, Supabase-Client (noch aktiv — legacy)
- Neu: `services/apiClient.js` — axios-Client für FastAPI-Endpoints
- Location: `/app/frontend/`

### Backend (FastAPI Phase 1 — Feb 2026)
- FastAPI + Motor + JWT (bcrypt Passwörter, httpOnly Cookies, tz-aware)
- Endpoints: `/api/health`, `/api/auth/*` (7 endpoints), `/api/content/{banks,offers,news}`
- Admin-Seeding, brute-force lockout (email-based, atomarer $inc), Password-Reset mit Token
- MongoDB Indexes für users.email, expiring reset tokens (TTL), login_attempts, banks.slug, news.slug
- Location: `/app/backend/server.py`

### Legacy Backend Sources
- Location: `/app/legacy_source/` — Supabase Edge Functions, Cloudflare Workers, PDF/Content-Scripts, Design-System
- Referenz für Phase 2+ Migration

## What's Been Implemented (Feb 2026)

### Homepage Cleanup ✅ (Feb 22, 2026)
- `PlatformFlowDiagram` (Sektionen "So funktioniert Ihre Sparplattform", "Von der Anmeldung bis zur Verzinsung", "Ihre Vorteile") komplett aus `Home.js` entfernt und Datei gelöscht
- Import bereinigt, Webpack kompiliert ohne Fehler

### Vertrauen & Sicherheit — Sektion wieder entfernt ✅ (Feb 22, 2026)
- Auf Kundenwunsch komplett aus der Startseite herausgenommen. `HomeTrustSecurity.jsx` gelöscht, Import + Nutzung aus `Home.js` bereinigt. Webpack kompiliert clean.

### Vertrauen & Sicherheit — Seal-Badge-Redesign ✅ (Feb 22, 2026)
- `HomeTrustSecurity` überarbeitet nach visueller Vorlage: goldene Eckakzente, dunkelblaue kreisförmige Siegel-Medaillons mit doppeltem Gold-Ring, zentrierte Serif-Titel, dezente Gold-Trennstriche
- 5 Cards: Geprüfte Datensicherheit, ISO 27001, Qualitätsmanagement, Mitgliedschaften & Branchenstandards, Persönliche & langfristige Beratung
- 4 Zertifizierungs-Cards zeigen explizit „Zertifikat/Logo hinterlegen"-Placeholder-Badge — keine echten TÜV/ISO/BVV-Marken werden verwendet, bis der Kunde die Nachweise liefert; `SealBadge` kann via `logoUrl`-Prop das offizielle Logo laden

### Vertrauen & Sicherheit — 5-Card-Section (initial) ✅ (Feb 22, 2026)
- Neue Home-Sektion `HomeTrustSecurity` mit 5 Cards nebeneinander (Desktop) / 2-3 (Tablet) / 1 (Mobile): Geprüfte Datensicherheit, Informationssicherheit, Qualitätsmanagement, Mitgliedschaften & Standards, Persönliche Beratung
- Gold-Ring-Icons, jede Card mit CTA-Link, „Logo folgt"-Badge auf den 4 Zertifizierungs-Cards als expliziter Platzhalter — **keine erfundenen TÜV/ISO-Logos**. Sobald der Kunde ein echtes Zertifikat liefert, kann das Original-Logo statt dem Placeholder-Icon eingesetzt werden
- Darunter dezente Icon-Leiste mit 5 Werten (Sicherheit & Diskretion, Persönliche Betreuung, Langfristige Partnerschaft, Transparenz & Klarheit, Vertrauen & Verlässlichkeit) plus Closing-Line „Vertrauen entsteht durch Transparenz."
- Platzierung: direkt zwischen `HomePostHero` (Produktüberblick) und `SpecialAifOverview` in `/app/frontend/src/pages/Home.js`. Datei: `/app/frontend/src/components/home/HomeTrustSecurity.jsx`
- **Hinweis**: Der Bereich der „alten 3 Symbole" wurde nicht explizit gefunden — falls Sie mir die genaue Position zeigen (Screenshot mit Kringel), entferne ich diesen Bestandsblock in einer Folge-Iteration sauber

### Follow-ups iteration 13 ✅ (Feb 22, 2026)
- **Themen-Highlights auf `/kundenstimmen`**: `/api/reviews/topics` liefert jetzt eine `count` pro Thema (aus MongoDB-Aggregation der freigegebenen Bewertungen) plus `total_approved`. Frontend-Filterchips zeigen die Zahl in einem kleinen Kreis („Alle Themen 2", „Persönliche Betreuung 1", …). Die zwei Seed-Bewertungen wurden mit Beispielthemen versehen, damit die Zähler sofort greifen.
- **Resend-E-Mail-Versand**: Emergent-managed Resend Playbook integriert. `POST /api/reviews/invite` versendet jetzt automatisch eine Einladungs-Mail über den Emergent-Proxy an die Kunden-Adresse. Verifiziert mit `delivered@resend.dev` — Antwort HTTP 202. HTML-Template mit Fröhlich-Branding, dezenter Gold-Eyebrow, sicherem Absende-Link zur `/kundenstimmen?einladung=<token>`-URL, Anti-Phishing-Fußzeile ("Wir bitten niemals per E-Mail um Passwörter"). Guardrail-Gate (`_assert_safe_email`) prüft vor jedem Versand: keine `<form>`, keine nicht-https-Links, keine Shortener/IP-Hosts, keine Credential-Ask-Phrasen. Admin-UI zeigt jetzt „Einladung wurde per E-Mail versendet" bzw. Fallback bei Versandfehler.
- **Auth-Migration**: Weiter deferred. Backend-APIs für Admin funktionieren einwandfrei über die FastAPI-Cookie-Session, aber die React-Routen unter `/admin/*` hängen noch am Supabase-Guard.

### Follow-ups iteration 12 ✅ (Feb 22, 2026)
- **Themen-Tags**: `reviews` bekommen jetzt bis zu 3 Themen (`persoenliche-betreuung`, `vertrauen`, `beratung`, `erreichbarkeit`, `langfristigkeit`, `transparenz`, `service`, `investmentuebersicht`). Endpoint `/api/reviews/topics`, Filter `?topic=...`, Submit-UI-Chips, Kundenstimmen-Filterleiste, Anzeige als kleine Chips auf `TestimonialCard`
- **Erfahrungs-Einladung**: Admin öffnet Modal „Erfahrung einladen" → Backend erzeugt Token in `review_invites` (30 Tage gültig, `POST /api/reviews/invite`) + gibt persönliche Share-URL `/kundenstimmen?einladung=<token>` zurück. Beim Öffnen prefillt das Submit-Formular Name/E-Mail, zeigt ein Banner „Ihre persönliche Einladung ist gültig" und die Bewertung wird mit `invited=true` gespeichert. E-Mail-Versand über Resend ist strukturell vorbereitet — der Admin kopiert den Link aktuell manuell
- **Home-Trust-Zeile**: Neue schmale Leiste `HomeTrustLine` direkt unter dem Hero mit 5 goldenen Sternen + Linksatz „Von unseren Kunden über Jahre begleitet — persönliche Erfahrungen lesen" → `/kundenstimmen`
- Datei-Ausschnitt: `/app/backend/server.py` (Reviews-Block + `REVIEW_TOPICS` + Invite-Endpoints), `/app/frontend/src/data/reviewTopics.js`, `/app/frontend/src/components/reviews/ReviewSubmitForm.jsx`, `/app/frontend/src/components/home/HomeTrustLine.jsx`, `/app/frontend/src/pages/Kundenstimmen.jsx` (Topic-Filter), `/app/frontend/src/pages/AdminReviews.jsx` (InviteModal + Einladen-Button)

### Kundenstimmen — Testimonial-Fokus ✅ (Feb 22, 2026)
- Neues Home-Modul `HomeTestimonials` löst `HomeCustomerReviews` ab: fokussiert auf persönliche Erfahrungen mit großem Serif-Zitat, dezenten goldenen Anführungszeichen und weichem weißen Hintergrund; Karten aus `TestimonialCard.jsx`, keine Stats-Dominanz mehr
- Neue öffentliche Seite `/kundenstimmen` mit Hero auf Dunkelblau, „Ausgewählte Stimmen" (nur featured), Grid für weitere Rückmeldungen, „Weitere anzeigen"-Pagination und eigenem Erfahrung-teilen-Formular
- Backend erweitert: `reviews` besitzt jetzt `customer_since` (unter_1/1_bis_3/3_bis_5/ueber_5) und `is_featured`; `/api/reviews/public` unterstützt `?featured=true`; Moderation-Input akzeptiert Beides
- Submit-Formular hat Variante `testimonial`: Sterne optional, „Seit wann Kunde?"-Dropdown optional, Text-Placeholder fragt nach Betreuung/Erreichbarkeit/Beratung, Button „Erfahrung teilen", Success-Text „Vielen Dank für Ihre Rückmeldung"
- Admin-Seite: neues Tab-Label „Neu" (statt „Ausstehend"), Edit-Modal kann jetzt `is_featured` togglen, `customer_since` setzen, Anzeigename beliebig (z. B. „Michael – Kunde seit 2019") anpassen; Badge „Auf Startseite" (goldene Sterne) neben „Verifiziert"
- Home-Modal für schnelles Teilen der Erfahrung öffnet das Submit-Formular direkt aus der Home-Sektion

### Kundenbewertungen — Testfeedback iteration_11 behoben ✅ (Feb 22, 2026)
- **HIGH — Gold-Kontrast**: `--bank-gold` Token in `/app/frontend/src/index.css` von blau-primary auf echtes Warm-Gold umgestellt: Light-Theme `#C9A961` (rgb 201 169 97), Dark-Theme `#D4B880` (rgb 212 184 128) inkl. Dashboard-Themes. Damit sind Sterne, Eyebrow „Kundenerfahrungen" und die goldenen CTAs jetzt gut lesbar auf Dunkelblau
- **MEDIUM — Fehlerbehandlung**: `Bewertungen.jsx` fängt jetzt Netzwerkfehler beim Laden ab und zeigt `reviews-load-error` statt fälschlicher Empty-State-Anzeige
- **MINOR — Rate-Limit hinter K8s-Ingress**: `POST /api/reviews/submit` liest jetzt `X-Forwarded-For` (linkeste IP) und prunet stale Einträge in `_review_rate_limit`. Quota auf 5/h/IP angehoben, damit reale Besucher hinter Proxy nicht global gedrosselt werden
- **LOW — Kupferpreis-Bild**: Migration setzt jetzt beim Startup ein passenderes Rohstoff-Bild

### Kundenbewertungen mit Moderation ✅ (Feb 22, 2026)
- Neue MongoDB-Kollektion `reviews` mit Feldern first_name/last_name/email/rating/text/status/display_name/is_verified/moderated_by
- Endpoints: `POST /api/reviews/submit` (public, Honeypot + Rate-Limit 3/h/IP + Textsanitizer + Consent-Pflicht), `GET /api/reviews/public` (nur approved, Filter/Sort/Pagination), `GET /api/reviews/stats` (Durchschnitt + Verteilung dynamisch aus DB), `GET /api/reviews/admin`, `PUT /api/reviews/{id}` (Status / Anzeigename / Verifiziert / Admin-Notiz), `DELETE /api/reviews/{id}`
- Neue Public-Seite `/bewertungen` (Hero mit Stats auf Dunkelblau · Filter 5/4/3/2/1 Stern · Sortierung Neueste/Beste · „Weitere laden" · Submit-Formular unten)
- Home-Sektion `HomeCustomerReviews` (Dunkelblau, goldene Sterne, Stats links + neueste 3 Bewertungen rechts, Empty-State wenn 0 freigegeben, 2 CTAs)
- Admin-Moderation `/admin/reviews` mit Tabs Ausstehend/Freigegeben/Abgelehnt/Alle, „Neue Bewertung — Freigabe erforderlich"-Badge, Aktionen Freigeben/Ablehnen/Bearbeiten (nur Anzeigename & Verifizierung, Text bleibt unberührt) / Löschen mit Sicherheitsabfrage
- **Zentraler Moderations-Contract**: Keine neue Bewertung wird ohne Admin-Freigabe öffentlich; Honeypot- und Bot-Versuche werden ohne Rückmeldung verworfen; verifizierter Status niemals automatisch gesetzt
- Datei-Ausschnitt: `/app/backend/server.py` (Reviews-Block), `/app/frontend/src/services/reviewsApi.js`, `/app/frontend/src/components/reviews/*`, `/app/frontend/src/pages/Bewertungen.jsx`, `/app/frontend/src/pages/AdminReviews.jsx`, `/app/frontend/src/components/home/HomeCustomerReviews.jsx`

### Investment FAQ Ausbau ✅ (Feb 21, 2026)
- 4 neue Kategorien in `faqCopy.categories`: Aktien, Anleihen, IPO, Krypto
- 22 neue Q&A-Items in `siteCopyPhase5.js` (Was ist eine Aktie, ETF-Unterschied, Dividenden, Marktorder/Limitorder, Anleihenarten, Zinsänderungsrisiko, Rating, Anleihen vs. Festgeld, IPO-Teilnahme, Lock-up, IPO-Risiken, Krypto-Verwahrung, Krypto-Steuern, Anlage vs. Spekulation, Depot-Kosten, Diversifikation)
- Home-Preview umgestellt: die 6 Fragen unter „Die wichtigsten Antworten — kompakt & klar" sind jetzt Investment-Themen statt Sparkonten
- Subtitle in `HomeSavingsFaqSection.jsx` angepasst: „Wichtige Fragen zu Aktien, Anleihen, IPO und Krypto — kompakt beantwortet."

### News & Märkte Backend-Erweiterung ✅ (Feb 21, 2026)
- Neue MongoDB-Kollektionen: `anlagetrends` (9 Themen), `investment_radar` (6 Radar-Themen), `market_voices` (6 externe Stimmen), `user_preferences` (Scaffold)
- Neue Endpoints: `/api/news-markte/anlagetrends`, `/investment-radar`, `/market-voices`, `/preferences` (GET/PUT auth), `/for-you` (auth, personalisiert)
- `NEWS_CATEGORIES` erweitert um: fonds-etfs, rohstoffe, seltene-erden, waehrungen, anleihen, investmenttrends
- Article-Seed um 13 zusätzliche Artikel erweitert (fund/etf, Rohstoffe, Seltene Erden, Anleihen, Währungen, Investmenttrends)
- Test-Feedback umgesetzt: kaputte Unsplash-URL ersetzt, DELETE liefert 404 bei nicht-existenter ID, `de-DE`-Locale für Change-%, "Alle aktuellen News" verlinkt jetzt auf `/news/archiv`, Marktdaten-Fußnote entschärft

### About-Page Overhaul ✅ (Feb 20, 2026)
- `/app/frontend/src/pages/About.js` komplett neu geschrieben nach User-Vorgabe
- Neue Struktur: Hero → Wer wir sind → Mehr als klassische Anlageberatung → Konservativ denken → Kompetenz (3 Karten) → Langfristige Zusammenarbeit (Highlight-Block mit 6 Werten) → Weiterempfehlung → Philosophie (4 Karten) → CTA
- Kein Partner-Content mehr (Vermogens Advies aus Hero + Body entfernt, kein Amsterdam-Bezug), keine Renditeversprechen, alle Zitate & Werte 1:1 aus Briefing
- Rechtlicher Hinweis am Ende: klärt, dass Branchenangaben nicht als aufsichtsrechtliche Erlaubnisse zu verstehen sind
- Rendert sauber, 20/20 Content-Assertions grün via Playwright

### Legal / Impressum Overhaul ✅ (Feb 20, 2026)
- `siteContact.js`: HQ-Adresse global auf **Bösgrunder Weg 62, 55543 Bad Kreuznach** umgestellt
- `legalPages.jsx` Impressum: neue Firmendaten (HRB 23436, Amtsgericht Bad Kreuznach, GF Manfred Franz Fröhlich)
- Kooperationspartner-Block (Vermogens Advies Administratie B.V., AFM) **komplett aus Impressum entfernt**
- USt-IdNr., BaFin- und IHK-Angaben als TODO markiert (nicht erfunden — auf Zulassungsbescheide warten)
- Neue Impressum-Sektionen "Zuständige Aufsichtsbehörde" & "Berufsrechtliche Angaben" mit klaren Platzhaltern
- AGB § 8 Gerichtsstand: Frankfurt am Main → Bad Kreuznach
- Konsistenz-Fixes in `SicherheitRegulierung.js`, `About.js`, `PasswordPage.js`, `spezialAifContent.js`, `siteCopyPhase5.js` (Fröhlich-Standort)

### Phase 0: Import & Baseline ✅
- Repo geklont via PAT, 2508 Dateien, ~600 MB Assets nach `/app/frontend/`
- Legacy Backend nach `/app/legacy_source/` archiviert
- Craco/Tailwind/PostCSS/JSConfig/Components-Konfig aus Repo übernommen
- `yarn install --ignore-engines` (Supabase erwartet Node 22, wir haben 20)
- Puppeteer-Chromium-Download deaktiviert (-200 MB)
- devServer host: 127.0.0.1 → 0.0.0.0 (Supervisor)
- oxlint/eslint ignorieren `public/mediapipe/`, `public/models/`
- Frontend läuft, Kapitalmitte-Seite rendert

### Phase 1a: FastAPI Auth ✅ (getestet 21/22)
- Auth komplett: Register/Login/Me/Update/Refresh/Logout/Forgot/Reset
- Cookies: httpOnly, secure, SameSite=None; 1 Tag Access, 30 Tage Refresh
- Brute-force Lockout: email-basiert (nicht IP — rotierende Ingress-Proxies), 5 Fehlversuche → 15 min Lock
- ObjectId-Guard in JWT-Sub-Validierung (401 statt 500 bei forged token)
- tz-aware Motor-Client für konsistente Datetime-Vergleiche
- Idempotentes Seeding pro Collection

### Phase 1b: Public Content ✅
- `/api/content/banks` — 5 Banken (BBVA, bunq, ING, Postbank, Knab) mit Slug, Land, Logo
- `/api/content/offers` — 9 Sparangebote mit Zins, Laufzeit, Min/Max; Filter by bank_slug & product_type
- `/api/content/news` — 3 Beispiel-Artikel mit ISO-Timestamps

### Phase 1c: Supabase-Inventar ✅
- Dokumentiert in `/app/memory/supabase_migration_backlog.md`
- 70 Frontend-Dateien nutzen Supabase, 29 Tables, 15 Edge Functions, 8 Auth-Methoden

### Known Non-App Issues
- **CORS Ingress Override**: Kubernetes Ingress liefert `Access-Control-Allow-Origin: *` statt der FRONTEND_URL. FastAPI-Middleware ist korrekt konfiguriert (direkter ASGI-Test bestätigt); Fix erfordert Ingress-Konfiguration.

## Prioritized Backlog

### P0 — Frontend an FastAPI verkabeln
- `AuthContext` umbauen: Nutze `authApi` aus `services/apiClient.js` statt `supabase.auth.*`
- Login/Register/ForgotPassword/ResetPassword Seiten anpassen
- ProtectedRoute → nutzt neuen Context
- Marketing-Pages (Home, PartnerBanks, SavingsComparison) an `contentApi` verkabeln

### P1 — Marktdaten (Alpha Vantage)
- User braucht API-Key (25 req/day free tier)
- Endpoints: `/api/market/stocks`, `/api/market/history/:symbol`, `/api/market/sparklines`
- MongoDB cache-Layer für price-Snapshots (statt Redis)
- APScheduler für tägliche Sync-Jobs

### P2 — User Portfolio
- Collections: `user_stock_watchlist`, `user_stock_positions`, `user_stock_orders`, `user_bond_positions`, `user_depot_contracts`, `user_price_alerts`
- CRUD-Endpoints mit `get_current_user`-Dependency

### P3 — Forms & Leads (Admin)
- `applications`, `contact_messages`, `support_messages`, `credit_leads`, `product_inquiry_leads` etc.
- Admin-Endpoints mit `require_admin`-Guard

### P4 — Emails (Resend) + PDF (Node-Microservice)
- Resend-Integration für Application-Emails, Weekly-Digest, Stock-Alerts
- Node-Microservice aus `/app/legacy_source/scripts/` extrahieren
- FastAPI ruft Node via HTTP für Vertrags-/Produktinfo-PDFs

### P5 — Deploy Prep
- Sentry Backend
- Ingress-CORS Fix
- Rate Limiting

## Test Coverage
- `/app/backend/tests/backend_test.py` — 22 pytest cases (21 passed, 1 known infra issue)
- `/app/backend/tests/test_auth_supplemental.py` — direct ASGI CORS check + admin password rotation
- Admin bcrypt hash validated ($2b$ prefix, cookies httpOnly+Secure+SameSite=None)
