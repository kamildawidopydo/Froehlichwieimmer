# PRD — Fröhlich Vermögensberatung / Kapital-Direkt24 · FastAPI + MongoDB

Sprache: **Deutsch**.

## Prod / Preview
- Preview: `https://finance-platform-v2.preview.emergentagent.com`
- Prod:    `https://finance-platform-v2.emergent.host`
- Stack: React + FastAPI + MongoDB (7.0.42 standalone in Preview)

---

## Session 82.13 (Preview) · IPO-Sync US-Fallback (StockAnalysis)

### Was
Der Mongo-native IPO-Sync bekommt eine 2. US-Quelle. Wenn Nasdaq fehlschlägt (Rate-Limit, HTTP-Fehler, leerer Body), fallbackt der Sync automatisch auf StockAnalysis (`stockanalysis.com/ipos/calendar/`). Cross-Source-Dedup via `(ticker_proposed, ipo_date)` verhindert Doppel-Rows.

### Files
- `backend/services/ipo_sync.py` — Fallback-Fetcher `_fetch_stockanalysis()`, integriert in `sync_ipo_catalog()` als sequentieller Fallback (nur wenn `nasdaq_status != ok` oder Nasdaq leer). Report um `stockanalysis_status`, `us_source_used`, `skipped_duplicate` erweitert.
- `frontend/src/pages/AdminIpoCatalog.js` — Report-Toast zeigt „US-Quelle: Nasdaq" oder „US-Quelle: StockAnalysis (Fallback)".

### Preview-Verifikation
- Sync #1: fetched=21, inserted=1 (StockAnalysis-Row), unchanged=20 (Euronext), nasdaq=error, stockanalysis=ok, us_source_used=stockanalysis
- Sync #2 (Idempotenz): fetched=21, inserted=0, unchanged=21
- Cross-Source-Duplicates: 0 (aggregation-check)
- Customer visible: 7 (6 Euronext + 1 StockAnalysis), keine listed/cancelled leak
- IPO-Request gegen US-IPO (Siyata PTT): 201 ✓
- Unauth 401, Customer 403, Admin 200
- Manual-Override P0-Schutz unverändert

### Constraints eingehalten
- Kein Prod-Deploy · Keine Portfolio-Migration · Kein Service-Role · Keine RLS-Änderung · Keine Fake-Daten · Kein Dual-Write · Keine Cron-Änderung · Bond/DashboardDataContext unverändert

---

## Frühere Sessions
- 82.12/82.11/82.10/82.09 — Infrastructure Blocker recheck (State unchanged, Support-Aktion offen)
- 82.08 — Portfolio Migration Cutover-Plan (Design)
- 82.07 — Approve→Depotposition Design
- 82.06 — IPO-Sync Scheduled Cron (LIVE Preview)
- 82.05 — IPO-Sync Endpoint (LIVE Preview)
- 82.04 — Bond-Kaufanfragen Mongo (LIVE Preview)
- 82.03 — Bond+IPO Katalog Mongo (LIVE Preview)
- 82.02 — IPO-Requests Mongo (LIVE Preview)
- 81.08 (LIVE Prod) — Hot News Detail Fix

## Blocker
- P0: `SUPABASE_SERVICE_ROLE_KEY` fehlt (Preview-Backend-Env) — Support-Ticket
- P0: Preview-MongoDB standalone (keine Multi-Doc-Tx) — Atlas M0 empfohlen
- P0: Deploy Pipeline Idempotency Incident — Support-Ticket

## Backlog
- Dashboard-Banner-Suppression für Mongo-Native-User (pro Datenbereich)
- Portfolio-Migration Dry-Run (blockiert durch Service-Role + Atomic-Strategy)
- Approve→Depotposition Implementation (blockiert durch Portfolio-Migration)
- Snapshot-Generator Herkunftsklärung (blockiert extern)
