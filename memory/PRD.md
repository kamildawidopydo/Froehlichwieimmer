# PRD — Fröhlich Vermögensberatung / Kapital-Direkt24 · FastAPI + MongoDB

Sprache: **Deutsch**.

## Original problem statement
Migration eines bestehenden Supabase + React Repositories zu FastAPI + MongoDB auf
Emergent, mit Rebranding auf **Fröhlich Vermögensberatung GmbH** und einem
editorialen Private-Banking-Design.

## Aktueller Stand (Feb 2026)
- Prod-URL: `https://finance-platform-v2.emergent.host` — LIVE.
- Preview-URL: `https://finance-platform-v2.preview.emergentagent.com`.
- Portfolio-Migration bleibt eingefroren (SUPABASE_SERVICE_ROLE_KEY fehlt).

## Sessions
### Session 81.07 (deployed) · Dashboard Navigation Bugfix
- Root Cause: `DashboardOnboarding`-Modal ignoriert Backend-Flag → fängt Sidebar-Klicks ab.
- Fix in `/app/frontend/src/pages/dashboard/UebersichtPage.jsx`: `useAuth`-Guard.
- Verifiziert Preview (19 Sidebar-Anker PASS) und Prod (Bundle-Signatur in
  `9517.b3891b20.chunk.js`).
- Status: LIVE auf Prod, Commit `a77622c`.

### Session 81.08 (Preview) · Hot-News Detailseite leer
- Root Cause: `HotNewsCarousel` linkt Slugs aus Supabase-Feed auf interne
  Detail-Endpunkte (FastAPI/Mongo), die diese aggregierten Slugs nicht kennen
  → HTTP 404 → „Meldung nicht verfügbar".
- Fix in `/app/frontend/src/components/dashboard/HotNewsCarousel.jsx`:
  Wenn `source_url` vorhanden → externe Originalquelle in neuem Tab. Sonst
  Fröhlich-eigen → interne kanonische Route `/news/nachrichten/:slug`. Sonst
  kein Link.
- Regel identisch zur bestehenden `linkPropsFor`-Konvention in
  `NachrichtenPage.jsx` / `HomeNewsPreview.jsx` / `HomeFinanceNews.jsx`.
- Kein Fake-Content, keine erfundenen Inhalte, keine neuen Detail-Seiten.
- Status: NUR PREVIEW. Freigabe für Prod ausstehend.

## Blocker
- **Portfolio Backend Migration (P0)** — blockiert, `SUPABASE_SERVICE_ROLE_KEY`
  fehlt weiterhin.

## Backlog
- P1: Session 80.63 Morning/Closing Brief
- P2: `stock-research-sync` Cronjob
- P2: Research-Daten für 15 DE-Aktien
- P2: WebP/AVIF Refactoring
- P3: Payment/Frequency Provider für Dividenden
- Phase 4: Admin-Frontend für Wealth Consultations
- Phase 4: Social Media Automation (LinkedIn-Keys)
- Phase 5: Sentry, Rate Limiting, Deploy Hardening

## Test Credentials
Siehe `/app/memory/test_credentials.md`.

## Environment
- Frontend: `REACT_APP_BACKEND_URL=https://finance-platform-v2.preview.emergentagent.com`
- Backend: `MONGO_URL`, `DB_NAME` via `.env`
