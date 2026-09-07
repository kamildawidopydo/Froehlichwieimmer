# PRD — Fröhlich Vermögensberatung / Kapital-Direkt24 · FastAPI + MongoDB

Sprache: **Deutsch**. Preview: `finance-platform-v2.preview.emergentagent.com`. Prod: `finance-platform-v2.emergent.host`.

## Session 82.14 (Preview) · IPO-Sync Run-History + Admin-Timeline
- **Neue Collection** `ipo_sync_runs` (Retention 30) mit Index `(created_at desc)`.
- **Service**: `services/ipo_sync.py` erweitert um `_persist_run_history`, `_classify_run_status`, `get_recent_sync_runs`, `ensure_history_index`. Klassifikation: `success` / `partial_success` / `failed` / `already_running`. History-Write ist error-isoliert (Sync-Ergebnis wird nicht zurückgerollt bei Telemetrie-Fehler). `already_running`-Trigger schreibt kompakte Zeile mit duration_ms=0.
- **Route**: `GET /api/admin/ipo/catalog/sync/history?limit=30` (admin-only, 401/403/200 verifiziert).
- **UI**: `AdminIpoCatalog` bekommt Timeline-Karte „Synchronisierungsverlauf" mit letzten 5 Runs + „Alle anzeigen"-Toggle (max 30). Pro Row: Datum, Trigger, Status-Label (dt.), US-Quelle, Counts. Kompakt, kein neues Dashboard.
- **Retention** aktiv (verifiziert: 35 → ≤30 nach nächstem Sync).
- **Keine Secrets/Raw-HTML/Response-Bodies** in History-Docs (Fields verifiziert). Errors kompakt ≤200 Zeichen, max 5 pro Run.

### Constraints
Kein Prod-Deploy · Keine Portfolio-Migration · Kein Service-Role · Kein Dual-Write · IPO-Catalog/Requests/Bond/DashboardDataContext/Cron unverändert · Keine Fake-Daten.

## Frühere Sessions
82.13 (US-Fallback StockAnalysis), 82.06 (Cron), 82.05 (Sync), 82.04 (Bond-Requests), 82.03 (Kataloge), 82.02 (IPO-Requests) — alle LIVE Preview.

## Blocker (Support-Aktion pending)
- P0: `SUPABASE_SERVICE_ROLE_KEY` fehlt (Preview-Backend)
- P0: MongoDB Preview standalone (Atlas M0 empfohlen)
- P0: Deploy Pipeline Idempotency

## Backlog
- Dashboard-Banner Suppression pro Datenbereich
- Portfolio-Migration Dry-Run
- Approve→Depotposition Implementation
- Yahoo Finance als 3. US-Quelle
- Snapshot-Generator Herkunftsklärung
