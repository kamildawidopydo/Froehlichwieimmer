# PRD — Fröhlich Vermögensberatung / Kapital-Direkt24 · FastAPI + MongoDB

Sprache: **Deutsch**. Preview: `finance-platform-v2.preview.emergentagent.com`. Prod: `finance-platform-v2.emergent.host`.

## Session 82.15 (Preview) · IPO-Sync History CSV Export
- **Endpoint** `GET /api/admin/ipo/catalog/sync/history.csv` (admin-only). UTF-8 + BOM + Semikolon-Separator (Excel-DE). Content-Disposition mit Datum im Dateinamen.
- **CSV-Injection-Protection**: `_csv_safe()` prefixt Werte, die mit `=` `+` `-` `@` `\t` `\r` beginnen, mit `'`.
- **Limit-Clamp**: 1 ≤ limit ≤ 30 (default 30). Sort: newest first via bestehendem `get_recent_sync_runs`.
- **Empty-State**: HTTP 200 mit nur Header-Zeile.
- **Frontend**: Sekundärer „CSV exportieren"-Button in Timeline-Card, Blob-Download, Fehler-Toast dezent.
- **Read-only**: keine DB-Writes, keine neue Collection, keine Retention-Änderung, keine Sync-Logik-Änderung.

### Constraints
Kein Prod-Deploy · Keine Portfolio-Migration · Kein Service-Role · Kein Dual-Write · IPO-Catalog/Requests/Bond/DashboardDataContext/Cron unverändert · Keine Fake-Daten.

## Frühere Sessions (LIVE Preview)
82.14 Run-History-Timeline · 82.13 US-Fallback StockAnalysis · 82.06 Cron · 82.05 Sync-Endpoint · 82.04 Bond-Requests · 82.03 Kataloge · 82.02 IPO-Requests

## Blocker (Support-Aktion pending)
- P0: `SUPABASE_SERVICE_ROLE_KEY` fehlt
- P0: MongoDB Preview standalone (Atlas M0 empfohlen)
- P0: Deploy Pipeline Idempotency

## Backlog
- Dashboard-Banner Suppression pro Datenbereich
- Portfolio-Migration Dry-Run
- Approve→Depotposition Implementation
- Yahoo Finance als 3. US-Quelle
- Snapshot-Generator Herkunftsklärung
