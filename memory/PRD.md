# PRD — Fröhlich Vermögensberatung / Kapital-Direkt24 · FastAPI + MongoDB

Sprache: **Deutsch**.

## Prod
- URL: `https://finance-platform-v2.emergent.host`
- Backend: FastAPI + Mongo, Health `/api/health = ok/db up`
- Preview: `https://finance-platform-v2.preview.emergentagent.com`

---

## Session 82.03 (Preview) · Bond + IPO Katalog-Migration Supabase → Mongo

### Root Cause
Legacy-Supabase-Tabellen `bond_catalog` und `ipo_catalog` liefern Anon-Reads
mit **0 Zeilen** (Content-Range `*/0`). Ohne `SUPABASE_SERVICE_ROLE_KEY`
kann der Admin-Editor ebenfalls nicht schreiben. Kunden sehen daher weder
Anleihen noch bevorstehende IPOs.

### Fix — Fix A + Fix B (Katalog-only, ohne Portfolio-Migration)
Neue Mongo-Native-Endpunkte + Frontend-Umstellung:

**Backend (2 neue Module, 1 Registrierung, 1 Refactor):**
- `backend/routes/bond_catalog.py` — public read + admin CRUD, Pydantic
  `extra=forbid`, ISIN-Validation, Datums-/Finite-Checks, sparse ISIN-Index.
- `backend/routes/ipo_catalog.py` — public read (`is_visible=true AND status
  NOT IN listed,cancelled`) + admin CRUD, cross-field-Sanity (price_range,
  subscription_window), `external_key`-Unique-Sparse.
- `backend/server.py` — Router registriert, `ensure_indexes` idempotent an
  `startup`-Event angebunden.
- `backend/routes/ipo_requests.py` — Katalog-Lookup jetzt via Mongo
  (`get_investable_ipo_by_id`) statt Supabase-REST-Anon-Call. `httpx` +
  Supabase-URL/Anon-Key aus dem Modul entfernt.

**Frontend (4 Files):**
- `pages/dashboard/AnleihenKaufenPage.jsx` — `supabase.from('bond_catalog')`
  entfernt, `fetch('/api/bonds/catalog', {credentials:'include'})`.
  Empty/Error/SearchEmpty klar getrennt, Retry-CTA im Error-State.
- `pages/dashboard/IpoPage.jsx` — Supabase-Katalog-Read entfernt,
  Mongo-native Fetch. IPO-Request-Submit (Session 82.02) unverändert; sendet
  jetzt Mongo-`_id`-String als `ipo_id` (validiert serverseitig gegen Mongo).
- `pages/AdminBondCatalog.js` — komplett auf FastAPI-CRUD; Template-Vorlagen
  entfernt (waren Supabase-basiert), Toggle-Switch, Modal-Layout beibehalten.
- `pages/AdminIpoCatalog.js` — komplett auf FastAPI-CRUD; Legacy-Sync-Button
  entfernt (rief Supabase-Edge-Function auf).

### Preview-Verifikation (Backend, alle grün)
- `/api/health` → 200; keine Startup-Fehler; Indizes für `bond_catalog`
  (`is_available+kupon`, `isin_sparse`) und `ipo_catalog`
  (`external_key_unique_sparse`, `visible_status_order`) ensured.
- Unauth: `/api/bonds/catalog` `/api/ipo/catalog` `/api/admin/*` → 401 ✓
- Customer: `/api/admin/*` → 403 ✓
- Admin CRUD: Bond CREATE 201, PATCH toggle 200, DELETE 204;
  IPO CREATE 201, Toggle 200, external_key-Duplicate 409 ✓
- Cross-Field-Sanity: price_low > price_high → 422; sub_start > sub_end →
  422 ✓
- Mass-Assignment-Protection: `user_id`, `role`, `created_at` im Payload →
  422 `extra_forbidden` ✓
- End-to-End: Admin legt IPO an → Customer sieht IPO → POST
  `/api/ipo/requests` mit Mongo-`_id` → 201; Duplicate 409; Admin sieht
  Request via `/api/admin/ipo/requests` ✓
- Visibility-Kette: `is_available=false` bzw. `is_visible=false` →
  Customer-Public-List `[]` ✓
- 404-Handling: ungültige/nichtvorhandene ObjectId → 404 ✓

### Phase-10-Audit: Referenz-Konsistenz
- Alte Supabase-UUIDs in `ipo_requests.ipo_id`: **0** (Preview-DB sauber)
- Neue Mongo-ObjectId-Referenzen: 1 (Test), danach Cleanup → 0
- Kein stilles ID-Rewrite; keine historischen Requests verändert.

### Constraints eingehalten
- Kein Prod-Deploy
- Keine Portfolio-Migration (User-scoped Reads unangetastet)
- Kein Service-Role verwendet
- Keine RLS-Deaktivierung
- Keine Fake-Seed-Daten (Preview-Test-Einträge nach QA restlos gelöscht)
- `DashboardDataContext` NICHT geändert (bleibt separater
  Portfolio-Migrations-Blocker)
- Kein Service-Role im Frontend

### Bekannte Nebenbefunde (außerhalb Scope)
- `AnleihenKaufenPage.requestPurchase` schreibt weiter nach Supabase
  `bond_purchase_requests` (RLS-blockiert für Mongo-User). Bond-Request-Flow
  ist eigener Migrationsschritt.
- Dashboard-Fehler-Banner „Einige Dashboard-Daten konnten nicht geladen
  werden" bleibt bestehen — verursacht durch die ~10 User-scoped
  Supabase-Reads in `DashboardDataContext` (ObjectId↔UUID-Mismatch). Behebung
  benötigt Portfolio-Migration → blockiert durch fehlenden Service-Role.

---

## Frühere Sessions
- 82.02 — Mongo-native IPO-Requests + Admin-UI-Merge (Legacy-Supabase-
  Requests unangetastet). LIVE Preview.
- 81.09 (Preview) · P0 Prod-Backend-URL Hotfix — `apiBaseFix.js` patcht
  axios global gegen Legacy-Domain-Injection.
- 81.08 (LIVE Prod, Commit `d03c60b`) — Hot News Detail Fix
- 81.07 (LIVE Prod, Commit `a77622c`) — Dashboard Nav Fix

## Blocker
- Portfolio Backend Migration (P0) — `SUPABASE_SERVICE_ROLE_KEY` fehlt;
  Support-Ticket offen.
- Deploy Pipeline Idempotency Incident (P0) — Support-Ticket offen; keine
  neuen Prod-Deploys.

## Backlog (P1/P2)
- Bond-Purchase-Request-Flow auf FastAPI/Mongo (analog IPO-Requests).
- Dashboard-Banner-Suppression für Mongo-Native-User (Sofortlösung, ohne
  Full-Migration) — offen zur Freigabe.
- Optionaler Backend-Sync für IPO-Katalog (Euronext/Nasdaq → Mongo).
- Portfolio-Migration Extract/Transform/Validate/Reconcile/Cutover.
- `stock-research-sync` Cron in `.emergent/crons.yml`.
- Sentry, Rate-Limiting, Deploy-Hardening.
