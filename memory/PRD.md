# Kapitalmitte / Webmain — Migration PRD

## Original Problem Statement
Bestehendes Repo `gregorbraun36/webmain` 1:1 in dieses Projekt übernehmen und auf FastAPI + MongoDB migrieren. Frontend behalten, Backend (Supabase + Cloudflare Workers) neu aufbauen.

## User Choices (Feb 2026)
- **Repo**: Zugriff via GitHub PAT (Token muss revoked werden!)
- **DB**: MongoDB (Stack-Default)
- **Marktdaten-Provider**: Alpha Vantage (default)
- **User-Migration**: Fresh JWT-Auth (keine Supabase-User-Migration nötig zunächst)
- **Content-Automation**: Aus Phase 1 raus
- **LLM (später)**: Emergent Universal Key

## Architecture

### Frontend (übernommen, 1:1)
- React 18 + Craco + Tailwind + shadcn/ui + Radix
- react-router-dom v7 mit 100+ Routen (Marketing, Dashboard, Admin, Banken)
- Zustand: Context (AuthContext, ThemeContext, SocialPreviewContext)
- i18next (Deutsch primär)
- Charts: visx, recharts, lightweight-charts
- Sentry, Cloudinary, Supabase-Client (noch aktiv)
- Location: `/app/frontend/`
- Env: `REACT_APP_BACKEND_URL`, `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`

### Legacy Backend Sources (Referenz für Migration)
- Location: `/app/legacy_source/`
- Enthält: `server/`, `api/`, `supabase/functions/` (Edge Functions), `worker/` (Cloudflare), `scripts/` (PDF-Gen, Content-Automation), `docs/`, `design-system/`, `templates/`
- `env.example.txt` listet alle originalen Env-Vars auf

### Target Backend (noch zu bauen)
- FastAPI + Uvicorn (Port 8001, `/api` prefix)
- MongoDB via Motor
- JWT Auth (Register/Login/Refresh, bcrypt)
- APScheduler (Weekly Digest, IPO/Stock-Sync)
- Location: `/app/backend/` (aktuell nur Hello-World)

## What's Been Implemented (Feb 2026)

### Phase 0: Import & Baseline ✅
- Repo geklont von `gregorbraun36/webmain` via PAT
- 2508 Dateien, ~600 MB Assets (public/, mediapipe/, models/, bank-logos, bond-logos)
- Frontend vollständig kopiert nach `/app/frontend/`
- Configs übernommen: `craco.config.js`, `tailwind.config.js`, `postcss.config.js`, `jsconfig.json`, `components.json`
- Legacy Backend-Quellen in `/app/legacy_source/` archiviert (server, api, supabase, worker, scripts, plugins, templates, docs)
- `yarn install --ignore-engines` erfolgreich (Node 20 vs Supabase erwartet 22)
- craco devServer host: `127.0.0.1` → `0.0.0.0` für Supervisor-Kompatibilität
- Puppeteer chromium-download deaktiviert (spart ~200 MB)
- Frontend läuft auf Emergent-Preview-URL, Marketing-Landingpage lädt komplett

## Prioritized Backlog

### P0 — Blocker for real functionality
- **Supabase-Credentials** oder **FastAPI-Backend**: Ohne eins von beidem ist alles was auth/data/API braucht tot. Optionen:
  - **Option A (schnell)**: User setzt `REACT_APP_SUPABASE_URL` + `REACT_APP_SUPABASE_ANON_KEY` in `/app/frontend/.env` → alles funktioniert wie im Original
  - **Option B (Roadmap)**: FastAPI-Backend bauen, Frontend `apiClient` umleiten

### P1 — FastAPI Skeleton (falls Option B)
- Auth (Register/Login/JWT/Refresh, bcrypt) laut Playbook
- `/api/auth/*`, `/api/users/*`, `/api/watchlist/*`
- News-Feed Public API (`/api/news`)
- Bank-Produkte statisch (`/api/banks`, `/api/offers`)
- Alle Supabase-Aufrufe im Frontend inventarisieren (grep `supabase.` in `/app/frontend/src/`)

### P2 — Marktdaten
- Alpha Vantage Provider Wrapper
- Endpoints: `/api/stocks`, `/api/stocks/:symbol/history`, `/api/macro-rates`, `/api/ipos`
- APScheduler-Jobs
- MongoDB Collections: `stocks`, `price_history` (time-series), `macro_rates`, `ipos`

### P3 — PDF & Emails
- Node-Microservice extrahieren aus `/app/legacy_source/scripts/` (Puppeteer + pdf-lib)
- FastAPI → Node HTTP-Bridge
- Resend-Integration (Weekly Digest, Contract-Emails)

### P4 — Content Automation (optional)
- Instagram/FB Content-Gen (nur wenn User will)

### P5 — Polish
- Sentry Backend
- Rate Limiting, CORS Origin-Whitelist statt `*`

## Known Issues
- **/api/* Proxy in craco.config.js zeigt auf Port 3001** (dev-api-server aus dem Original) — existiert hier nicht. Alle relativen `/api/*`-Aufrufe im Frontend schlagen fehl bis FastAPI-Backend fertig ist ODER Frontend auf `REACT_APP_BACKEND_URL` umgestellt wird.
- **Node 20 vs Supabase-JS 2.112.3 erwartet Node 22** — mit `--ignore-engines` gelöst, aber ggf. Runtime-Issues.
- **GitHub PAT wurde im Chat geteilt** — muss dringend revoked werden auf https://github.com/settings/tokens.

## Next Tasks (User entscheidet Reihenfolge)
1. GitHub Token revoken (Sicherheit!)
2. Entscheidung Option A (Supabase-Creds) vs Option B (FastAPI-Migration starten)
3. Bei Option B: Priorisierung welche Supabase-Endpoints zuerst migriert werden
