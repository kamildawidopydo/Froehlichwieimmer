# PRD — Fröhlich Vermögensberatung / Kapital-Direkt24 · FastAPI + MongoDB

Sprache: **Deutsch** (Antworten an den User immer auf Deutsch).

## Original problem statement
Migration eines bestehenden Supabase + React Repositories zu FastAPI + MongoDB auf Emergent, mit
Rebranding auf **Fröhlich Vermögensberatung GmbH** und einem editorialen Private-Banking-Design.

Phasen:
- Phase 0: 1:1 Import
- Phase 1: FastAPI-Skeleton + Auth + Public Content APIs
- Phase 2: Market Data & Watchlist APIs
- Phase 3: PDF Generation & Emails
- Phase 4: Content Automation
- Phase 5: Sentry, Rate Limiting, Deploy Hardening

## Aktueller Stand (Feb 2026)
Highly polished FastAPI + React Application mit „Graphite"-Dark-Mode und editorialem Private-Banking-Look.
`/mein-depot` Dashboard ist in Schritten 1–7 vollständig professionalisiert.

## Session 81.07 · Feb 4 2026 · Depot Bugfix — tote Links „Nachrichten"/„Einstellungen"

### Root Cause (bewiesen via Runtime-Test mit Playwright, `demo.kunde@kapital-direkt24.de`)
- Auf `/mein-depot` gibt es **KEINE** Links „Nachrichten" oder „Einstellungen"
  (DOM-Enum aller 25 Test-IDs bestätigt).
- Die Beschwerde bezog sich auf den **Dashboard-Kontext** (`/dashboard/uebersicht`), erreicht via
  Sidebar oder Topnav-Buttons.
- Auf `/dashboard/uebersicht` rendert `UebersichtPage.jsx` das `DashboardOnboarding`-Willkommens-Modal
  als Vollbild-Overlay (`fixed inset-0 z-modal`). Das Modal:
  - fängt Sidebar-Klicks ab (Klick auf „Nachrichten" schließt den Modal-Backdrop, feuert aber den
    Link nicht) — für User erscheint der Link „tot".
  - ignorierte bisher komplett den Backend-Flag `user.onboarding_completed` und triggerte
    ausschließlich per localStorage-Flag `dashboard_onboarding_v1_completed`.
    → Selbst voll onboardete User sahen dieses Marketing-Modal in jedem frischen Browser-Kontext.

### Fix (minimal, ohne neue Seiten oder Regressionen)
Datei: `/app/frontend/src/pages/dashboard/UebersichtPage.jsx`
- `useAuth` importiert
- `markOnboardingCompleted` zusätzlich importiert
- useEffect-Hook so umgestellt, dass das Modal **nicht** öffnet, wenn `user.onboarding_completed === true`.
  Zusätzlich wird der localStorage-Flag idempotent gesetzt, damit das Modal in dieser Session sicher
  nicht wiederkehrt.

### Verifikation (Playwright, alle PASS)
- Desktop 1920: MODAL_HIDDEN_FOR_ONBOARDED_USER · NACHRICHTEN_CLICK · EINSTELLUNGEN_CLICK
  (Topbar-Popover „Profil & Einstellungen") · SIDEBAR_PROFIL · MEIN_DEPOT_SUPPORT (Regressions-
  smoke auf `/mein-depot` Service-Karten) · LOGOUT
- Mobile 390: MOBILE_MODAL_HIDDEN · MOBILE_NACHRICHTEN · MOBILE_ESC_CLOSES_MENU
- Keine Console-Errors, keine unerwarteten Network-Errors
- **Nicht-onboardete User** sehen das Modal weiterhin (Regressionsschutz)

### Betroffene Routen (bestehend, unverändert)
- Sidebar „Nachrichten" → `/dashboard/news` (App.js Zeile 794) ✓
- Topbar-Popover „Profil & Einstellungen" → `/dashboard/profil` (App.js Zeile 797) ✓
- Sidebar „Profil" → `/dashboard/profil` ✓

### Nicht geändert (Regressionsschutz)
- Depot-Berechnungen, DashboardDataContext, Supabase/FastAPI-Schnittstellen, Auth-Architektur,
  Onboarding-Wizard, Portfolio-Migration, Watchlist-Logik, News-Datenlogik, Dokumentenlogik.

## Blocker
- **Portfolio Backend Migration (P0)** — blockiert, `SUPABASE_SERVICE_ROLE_KEY` fehlt in Preview-Container.
  User hat Emergent-Support-Ticket offen. Nichts anfassen bis User grünes Licht gibt.

## Backlog / Roadmap
- P1: Session 80.63 Morning/Closing Brief
- P2: `stock-research-sync` Cronjob in `.emergent/crons.yml`
- P2: Research-Daten für 15 DE-Aktien
- P2: WebP/AVIF Refactoring
- P3: Payment/Frequency Provider für Dividenden
- Phase 4: Admin-Frontend UI für Wealth Consultations
- Phase 4: Social Media Automation (blocked auf LinkedIn-Keys)
- Phase 5: Sentry, Rate Limiting, Deploy Hardening

## Test Credentials (Preview)
Siehe `/app/memory/test_credentials.md` — unverändert.

## Environment
- Frontend: `REACT_APP_BACKEND_URL` (aktuell `https://finance-platform-v2.preview.emergentagent.com`)
- Backend: `MONGO_URL`, `DB_NAME` — via .env
- Sprache: **immer Deutsch antworten**
