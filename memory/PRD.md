# PRD — Fröhlich Vermögensberatung / Kapital-Direkt24 · FastAPI + MongoDB

Sprache: **Deutsch**.

## Prod
- URL: `https://finance-platform-v2.emergent.host`
- Backend: FastAPI + Mongo, Health `/api/health = ok/db up`
- Preview: `https://finance-platform-v2.preview.emergentagent.com`

---

## Session 82.05 (Preview) · IPO-Katalog Backend-Sync

### Was
Neuer Admin-Endpoint `POST /api/admin/ipo/catalog/sync` fetcht Euronext
(HTML-Scrape) + Nasdaq (JSON-API), normalisiert Rows auf das bestehende
Mongo-`ipo_catalog`-Schema (Session 82.03), setzt Status via bewährter
Legacy-Logik (date-based Euronext, bucket-based Nasdaq) und upsertet
idempotent per `external_key`.

### Regeln (identisch zur Legacy-Edge-Function)
- `external_key = isin:{ISIN}` bevorzugt, sonst `{source}:{TICKER}:{DATE}`
- Manual-Override-Rows (`is_manual_override=true`) werden **nie**
  überschrieben (Report-Feld `skipped_manual_override`)
- **Keine Löschung** — nur Status-Updates; `is_visible=false` für
  `listed`/`cancelled`, damit Kunden sie nicht mehr sehen
- Neue Auto-Rows: `is_manual_override=false`, `lot_size=1` default
- Externe Fetches: 15s Timeout pro Source, source-isoliert (eine Quelle
  down bricht die andere nicht)
- Kein Secret/Payload — reine POST-Auth via Admin-Cookie
- Kein Dual-Write nach Supabase; kein Delete

### Files
- `backend/routes/ipo_catalog.py` — Sync-Endpoint + Parser inline
- `frontend/src/pages/AdminIpoCatalog.js` — „Sync jetzt"-Button auf
  neuen Endpoint, kompakter Report-Toast

### Cloudflare-Constraint (dokumentiert)
Externe Fetches können zusammen >100s dauern. Cloudflare-Proxy hat
100s-Grenze → **Preview-Aufrufe von außen können 524/502 liefern**,
obwohl der Backend-Sync intern zu Ende läuft. Empfehlung: Sync lokal
oder als Background-Cron. Für interaktive Admin-Nutzung reicht das
15s-pro-Source-Timeout, um zumindest eine Quelle zu liefern.

### Constraints eingehalten
- Kein Prod-Deploy · Keine Portfolio-Migration · Kein Service-Role
- Keine RLS-Änderung · Keine Fake-Daten
- Kein Dual-Write nach Supabase · Kein destructive delete
- DashboardDataContext, Bond, News, Header, Auth, IPO-Catalog-Frontend
  unverändert

---

## Frühere Sessions
- 82.04 — Bond-Kaufanfragen Supabase → Mongo (LIVE Preview)
- 82.03 — Bond + IPO Katalog Supabase → Mongo (LIVE Preview)
- 82.02 — Mongo-native IPO-Requests + Admin-UI-Merge (LIVE Preview)
- 81.09 — Prod-Backend-URL Hotfix via `apiBaseFix.js`
- 81.08 (LIVE Prod) — Hot News Detail Fix
- 81.07 (LIVE Prod) — Dashboard Nav Fix

## Blocker
- Portfolio Backend Migration (P0) — `SUPABASE_SERVICE_ROLE_KEY` fehlt
- Deploy Pipeline Idempotency Incident (P0) — Support-Ticket offen

## Backlog (P1/P2)
- Sync als scheduled Cron in `.emergent/crons.yml` (weekly/daily)
- Dashboard-Banner-Suppression für Mongo-Native-User
- Portfolio-Migration Extract/Transform/Validate/Reconcile/Cutover
- Sentry, Rate-Limiting, Deploy-Hardening
- Bond-Approve → Depotposition (blockiert durch Portfolio-Migration)
- Approve-IPO → Depotposition analog
