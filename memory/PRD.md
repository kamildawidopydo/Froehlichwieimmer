# PRD — Fröhlich Vermögensberatung / Kapital-Direkt24 · FastAPI + MongoDB

Sprache: **Deutsch**.

## Prod
- URL: `https://finance-platform-v2.emergent.host`
- Backend: FastAPI + Mongo, Health `/api/health = ok/db up`
- Preview: `https://finance-platform-v2.preview.emergentagent.com`

---

## Session 82.06 (Preview) · IPO-Sync als Scheduled Cron

### Was
IPO-Katalog wird jetzt automatisch täglich synchronisiert (04:30 UTC ≈
06:30 Europe/Berlin Sommer / 05:30 Winter). Sync-Logik ist in
wiederverwendbaren Service extrahiert; Admin-Button und Cron rufen
dieselbe Funktion — keine Parallel-Implementierung.

### Files
- `backend/services/ipo_sync.py` (NEU) — Service `sync_ipo_catalog(db, trigger)`
  mit Euronext + Nasdaq Fetchern, `asyncio.gather` parallel, Modul-Level
  `asyncio.Lock` gegen Same-Instance-Doppelläufe. `get_last_sync_status(db)`
  liefert Timestamp + kompakten Report.
- `backend/routes/ipo_catalog.py` — Inline-Sync-Logik entfernt, Route
  delegiert an Service. Neuer GET `/api/admin/ipo/catalog/sync/status`.
- `backend/server.py` — Cron-Endpoint `POST /api/cron/ipo-catalog-sync`
  (Bearer, ack 2xx sofort in ~20ms, `asyncio.create_task` für Sync).
- `.emergent/crons.yml` — 4. Job `ipo-catalog-sync` mit `cron: "30 4 * * *"`.
- `frontend/src/pages/AdminIpoCatalog.js` — „Letzte Synchronisierung"-
  Anzeige im Header, geladen via GET /sync/status.

### Preview-Verifikation
- Health 200 nach Restart; alle 4 Crons in YAML gelistet, korrektes 5-Feld-
  Format, alle Namen ≤21 Zeichen.
- Unauth Cron → 401 ✓ · Bad Bearer → 401 ✓ · Correct Bearer → 200 in ~20ms ✓
- Job-Lock: 2. paralleler Admin-Sync gibt `already-running` zurück ✓
- Cron-Log zeigt safe report (fetched/inserted/…), keine Secrets ✓
- Public IPO GET unverändert, kein listed/cancelled leak ✓
- IPO-Request-Flow gegen synced Katalog funktioniert weiter ✓
- Log-Secret-Leakage: 0 ✓

### Cron-Konfig
- **Name**: `ipo-catalog-sync`
- **Schedule**: `30 4 * * *` (UTC — Plattform-Default; dokumentiert für DST)
- **Entrypoint**: `POST /api/cron/ipo-catalog-sync`
- **Auth**: Bearer via `WEBHOOK_CRON_SECRET`
- **Ack-Zeit**: ~20ms (weit unter 5s Dispatcher-Deadline)
- **Retry**: keine (Plattform-Default; Idempotenz macht Retry unnötig)
- **Timeout**: 15s pro externer Quelle (Euronext, Nasdaq getrennt)

### Constraints eingehalten
- Kein Prod-Deploy · Keine Portfolio-Migration · Kein Service-Role
- Keine RLS-Änderung · Keine Fake-Daten · Kein Delete
- Kein Dual-Write nach Supabase · Manual-Override P0 geschützt
- DashboardDataContext, Bond, News, Header, Auth, Same-Origin, IPO Customer
  Request Flow unverändert
- Bestehende 3 Crons nicht verändert; nur 4. Job hinzugefügt

### Prod-Betriebs-Notiz
Deployed Apps discardieren Schedules faster than every 15 minutes. Unser
Job läuft nur 1×/Tag → prod-tauglich. Cron-Sync für Prod ist bereit
sobald Idempotency-Ticket freigegeben.

---

## Frühere Sessions
- 82.05 — IPO-Katalog Backend-Sync-Endpoint (LIVE Preview)
- 82.04 — Bond-Kaufanfragen Supabase → Mongo (LIVE Preview)
- 82.03 — Bond + IPO Katalog Supabase → Mongo (LIVE Preview)
- 82.02 — Mongo-native IPO-Requests + Admin-UI-Merge (LIVE Preview)
- 81.09 — Prod-Backend-URL Hotfix
- 81.08 (LIVE Prod) — Hot News Detail Fix
- 81.07 (LIVE Prod) — Dashboard Nav Fix

## Blocker
- Portfolio Backend Migration (P0) — `SUPABASE_SERVICE_ROLE_KEY` fehlt
- Deploy Pipeline Idempotency Incident (P0) — Support-Ticket offen

## Backlog (P1/P2)
- Dashboard-Banner-Suppression für Mongo-Native-User
- Portfolio-Migration Extract/Transform/Validate/Reconcile/Cutover
- Sentry, Rate-Limiting, Deploy-Hardening
- Bond-Approve → Depotposition (blockiert durch Portfolio-Migration)
- Approve-IPO → Depotposition analog
