# PRD — Fröhlich Vermögensberatung / Kapital-Direkt24 · FastAPI + MongoDB

Sprache: **Deutsch**.

## Prod
- URL: `https://finance-platform-v2.emergent.host`
- Backend: FastAPI + Mongo, Health `/api/health = ok/db up`
- Preview: `https://finance-platform-v2.preview.emergentagent.com`

## Session 81.09 (Preview) · P0 Prod-Backend-URL Hotfix
### Root Cause
Emergent-Prod-Build injiziert `REACT_APP_BACKEND_URL=https://kapital-direkt24.de`
(Legacy-Domain, nicht die aktuelle Prod-Domain). 15+ Frontend-Services
(marketService, watchlistApi, reviewsApi, apiClient, marketSparklineService,
stockHistoryService, einordnungApi, investmentTopics, …) lesen
`process.env.REACT_APP_BACKEND_URL` direkt bei `axios.create()` und richten
dadurch ALLE ihre Requests an die Legacy-Domain. CORS blockiert diese Aufrufe,
Frontend zeigt keine Kursdaten, Hot News, Reviews, Watchlist, Depot, Auth.

Beweis im Live-Bundle:
- `main.23e28c91.js` enthält 3× die Zeichenkette
  `REACT_APP_BACKEND_URL:"https://kapital-direkt24.de"` im Webpack-Env-Objekt
- 8+ Prod-Chunks enthalten den Legacy-Host in ihren axios.create-baseURL

### Fix (2 Dateien, keine Business-Logik)
1. Neues Modul `/app/frontend/src/lib/apiBaseFix.js`:
   - Patcht `axios.create` global (monkey-patch) und die default-`axios`-Instanz
   - Request-Interceptor rewritet `baseURL` und `url` von Legacy-Host auf
     `window.location.origin` (Same-Origin-Strategie)
   - Same-Origin funktioniert sowohl auf Preview (`…preview.emergentagent.com`)
     als auch Prod (`…emergent.host`) — beide liefern Frontend + `/api/*` unter
     derselben Origin
   - Marker `window.__apiBaseFixInstalled = true` für Verifikation
   - Selbstheilend gegen künftige URL-Injection-Fehler
2. `/app/frontend/src/index.js`:
   - `import "@/lib/apiBaseFix";` als ALLERERSTE Zeile — muss vor allen
     Service-Modulen laufen, damit deren axios.create bereits gepatchten
     Prototyp verwendet

### Preview-Verifikation
- `window.__apiBaseFixInstalled === true` ✓
- Network-Sniffing 3s + Navigation zu `/news`: **0 Calls an kapital-direkt24.de** ✓
- App rendert normal, webpack compile mit nur den bekannten Lint-Warnings
- Prod-Bundle-Vergleich pending bis Prod-Deploy

### Constraints eingehalten
- Keine Business-Logik geändert
- Keine Portfolio-Migration
- Keine Supabase/RLS/Secret-Änderungen
- Keine News-Architektur-Änderungen
- Keine UI-Neugestaltung
- Keine `.env`-Modifikation
- Keine Secrets committed

## Frühere Sessions
- 81.07 (LIVE Prod, Commit `a77622c`) — Dashboard Nav Fix
- 81.08 (LIVE Prod, Commit `d03c60b`) — Hot News Detail Fix

## Blocker
- Portfolio Backend Migration (P0) — `SUPABASE_SERVICE_ROLE_KEY` fehlt

## Backlog
- P1: Session 80.63 Morning/Closing Brief
- P2: stock-research-sync Cronjob, DE-Aktien Research, WebP/AVIF
- P3: Payment/Frequency Provider für Dividenden
- Phase 4: Admin-UI Wealth Consultations, Social Media Automation
- Phase 5: Sentry, Rate Limiting, Deploy Hardening
- **Emergent Prod-Env-Var Cleanup**: Nach diesem Hotfix sollte in der Emergent-UI
  `REACT_APP_BACKEND_URL` für Prod entweder auf `https://finance-platform-v2.emergent.host`
  gesetzt oder komplett geleert werden (dann greift Same-Origin sowieso).
  Der Hotfix macht diese Cleanup aber nicht mehr kritisch — er ist eine
  Sicherheitsschicht für die Zukunft.

## Test Credentials
Siehe `/app/memory/test_credentials.md`.
