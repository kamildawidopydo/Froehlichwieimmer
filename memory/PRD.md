# PRD — Fröhlich Vermögensberatung / Kapital-Direkt24 · FastAPI + MongoDB

Sprache: **Deutsch**.

## Prod
- URL: `https://finance-platform-v2.emergent.host`
- Backend: FastAPI + Mongo, Health `/api/health = ok/db up`
- Preview: `https://finance-platform-v2.preview.emergentagent.com`

---

## Session 82.04 (Preview) · Bond-Kaufanfragen Supabase → Mongo

### Root Cause
Kunden-INSERT auf Supabase `bond_purchase_requests` schlug für alle
Mongo-Native User fehl (ObjectId vs. UUID im RLS-Filter `user_id`). Admin-
Approve/Reject nutzt Supabase-RPCs, die ohne Service-Role blockierten.

### Fix (Session 82.04)
**Backend (1 neues Modul + Router-Reg):**
- `backend/routes/bond_requests.py` — Customer POST/GET-me + Admin GET/
  approve/reject; Duplicate-Guard (partial-unique-Index user+bond+pending);
  Bond-Validierung gegen Mongo `bond_catalog` (existiert, is_available,
  nicht abgelaufen, ≥ min_order_eur); Stammdaten (bond_name/isin/
  kupon_rate) **nur** aus Katalog, nie aus Client-Payload; `extra=forbid`
  gegen Mass-Assignment; atomarer `find_one_and_update` mit `status=pending`
  Filter (verhindert Double-Approve).
- `backend/server.py` — Router `router` und `admin_router` registriert,
  `ensure_indexes` idempotent im Startup.

**Frontend (3 Files):**
- `pages/dashboard/AnleihenKaufenPage.jsx:requestPurchase` — Supabase-INSERT
  entfernt, `POST /api/bonds/requests` mit `bond_id` (Mongo-_id),
  klare Fehler-States (409, 401, generisch).
- `context/DashboardDataContext.jsx:fetchBondPurchaseRequests` — Supabase-
  Read entfernt (RLS-blockiert für Mongo-User), FastAPI `/api/bonds/
  requests/me`. **Nur dieser eine Fetch** wurde geändert; alle anderen
  Portfolio-Reads (Cash, Positions, Depot, Watchlist, Orders) bleiben
  unverändert.
- `pages/AdminBondRequests.js` — Merge Mongo + Legacy-Supabase:
  Promise.allSettled → Mongo-Requests via FastAPI-Admin, Legacy-Rows
  best-effort. Approve/Reject nach `backend`-Tag geroutet. Hinweistext:
  „Genehmigen erzeugt derzeit KEINE Depotposition".

### Preview-Verifikation (Backend, alle grün)
- Startup: alle 4 Index-Ensures (ipo_requests, bond_catalog, ipo_catalog,
  bond_purchase_requests) ohne Fehler
- Routen registriert: `/api/bonds/requests` (POST) · `/me` (GET) ·
  `/api/admin/bonds/requests` (GET) · `/approve` · `/reject`
- Unauth → 401 (alle 3); Customer → 403 auf Admin
- Customer POST 201 mit Katalog-abgeleiteten Stammdaten
- Customer GET `/me` liefert eigenen Request; Reload persistent
- Duplicate POST → 409
- Mass-Assignment: `user_id`, `status`, `source` → 422 `extra_forbidden`
- Numeric: `amount_eur <= 0` → 422 `greater_than`
- `bond_id` invalid/unbekannt → 404; `is_available=false` blockiert;
  `min_order_eur` unterschritten → 400
- Admin sieht Request mit `customer_email`, `customer_name`, `backend=mongo`
- Admin Approve → Customer sieht `status=approved`; erneutes Approve → 409
  (idempotenter Übergang)
- User-Isolation: Admin-Login (anderer user_id) sieht **eigene** 0 Requests
  via `/me` — Filter greift auf user_id-Ebene
- Legacy UUID-Refs in `bond_purchase_requests`: 0 nach Cleanup (Test-Daten
  restlos gelöscht)

### Constraints eingehalten
- Kein Prod-Deploy
- Keine Portfolio-Migration (User-scoped Portfolio-Reads unverändert)
- Kein Service-Role verwendet · keine RLS-Deaktivierung
- Keine Fake-Seed-Daten
- Kein Dual-Write (Legacy-INSERT entfernt; Legacy-Realtime-Sub bleibt
  passiv — feuert nie mehr für neue Rows, kein Impact)
- Bestehende historische Supabase-Rows unverändert
- APPROVE erzeugt KEINE Depotposition (Portfolio bleibt blockiert)

### Bekannte Nebenbefunde
- Dashboard-Fehler-Banner „Einige Dashboard-Daten…" bleibt (kommt aus
  anderen `DashboardDataContext`-Reads mit ObjectId-Filter gegen UUID-
  Tabellen; separater Portfolio-Migrations-Blocker).
- `NotificationCenter.js:86` und Realtime-Subscription in
  `DashboardDataContext:600` lauschen weiter auf `bond_purchase_requests`
  in Supabase — dort kommen keine Events mehr, sind aber ungefährlich
  (kein Toast-Spam, kein Fehler).

---

## Frühere Sessions
- 82.03 — Bond + IPO Katalog Supabase → Mongo (LIVE Preview)
- 82.02 — Mongo-native IPO-Requests + Admin-UI-Merge (LIVE Preview)
- 81.09 — Prod-Backend-URL Hotfix via `apiBaseFix.js` (LIVE Preview)
- 81.08 (LIVE Prod, Commit `d03c60b`) — Hot News Detail Fix
- 81.07 (LIVE Prod, Commit `a77622c`) — Dashboard Nav Fix

## Blocker
- Portfolio Backend Migration (P0) — `SUPABASE_SERVICE_ROLE_KEY` fehlt;
  Support-Ticket offen.
- Deploy Pipeline Idempotency Incident (P0) — Support-Ticket offen; keine
  neuen Prod-Deploys.

## Backlog (P1/P2)
- Dashboard-Banner-Suppression für Mongo-Native-User (Sofortmaßnahme).
- Optionaler Backend-Sync IPO-Katalog (Euronext/Nasdaq → Mongo).
- Portfolio-Migration Extract/Transform/Validate/Reconcile/Cutover.
- `stock-research-sync` Cron in `.emergent/crons.yml`.
- Sentry, Rate-Limiting, Deploy-Hardening.
- Bond-Approve → Depotposition (blockiert durch Portfolio-Migration).
