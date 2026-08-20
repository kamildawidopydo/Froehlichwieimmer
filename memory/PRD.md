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
