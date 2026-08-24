# Fröhlich Vermögensberatung — PRD

## Original Problem Statement
FastAPI + MongoDB news/finance portal for Fröhlich Vermögensberatung GmbH.
Light editorial private-banking aesthetic. Migrated from Supabase+React.

## Roadmap
Phase 0-3: DONE. Phase 4-5: BACKLOG.

## Session Log
- 76.5–77.4 — Palette, Footer light, News preview, Deep-link, Auto-refresh, News lock bug fix, Post-deploy guard + `/api/news/admin/status`.
- 77.5 (Feb 28 2026) — **Admin Freshness Tile**:
  - New `frontend/src/components/admin/NewsFreshnessTile.jsx` — kompakte Kachel unter `/admin`, direkt unter dem Hero-Header, über der KPI-Strip.
  - Fetch-Auth: `axios` mit `withCredentials: true` (nutzt bestehende Admin-Cookie-Auth).
  - Refresh: 60s Interval + `visibilitychange`-Handler + manueller Refresh-Button.
  - Status-Mapping: `fresh` → Teal/Mint + CheckCircle "Aktuell" · `stale` → Amber + AlertTriangle "Veraltet" · `error` → Rot + XCircle "Fehler" (Farbe **und** Icon **und** Text).
  - Zeitanzeige: absolut (`24.08.2026, 12:18`) + relativ (`· vor 6 Min.`) — keine externe Date-Lib.
  - 3 Spalten: News-Fetch, Synthese, Inhalte — jede mit `border-l-2 border-bank-primary/30` Editorial-Rail.
  - Details-Toggle (default eingeklappt): Fetch-Start, Trigger, Synthese-Start, Server-Zeit.
  - Fetch-Lock-Status als eigene Zeile mit Lock-Icon (idle/aktiv).
  - Fehlerzustand: kleine Meldung + "Erneut versuchen"-Button, Rest der Admin-Seite bleibt intakt.
  - No secrets rendered (keine Tokens, keine API-Keys, keine Raw-Payloads).
  - AdminDashboard.js: 2-Zeilen-Insert (Import + `<NewsFreshnessTile />`).

## Files of Reference
- `/app/frontend/src/components/admin/NewsFreshnessTile.jsx` (neu)
- `/app/frontend/src/pages/AdminDashboard.js` (Insert)
- `/app/backend/server.py` — `/api/news/admin/status`
- `/app/backend/news_synthesizer.py` — job_summaries persistence

## Blockers
- P1: Supabase `product_inquiry_leads_product_check` (DBA)
- P2: Alpha Vantage + Unsplash API-Keys (User)

## Backlog
- Server.py modularization Wave 2
- Fresh Article Toast on Hero background refresh
- News Retention Archive (>90 Tage)
- Phase 4/5
