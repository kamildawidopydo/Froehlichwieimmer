# PRD — Fröhlich Vermögensberatung / Kapital-Direkt24 · FastAPI + MongoDB

Sprache: **Deutsch**. Preview: `finance-platform-v2.preview.emergentagent.com`. Prod: `finance-platform-v2.emergent.host`.

## Session 82.17 (Preview) · Bond-Sync Cron + Run-History + CSV
- **Cron**: `.emergent/crons.yml` neu `bond-catalog-sync` @ `35 5 * * *` UTC (nach IPO 04:30 + nach Deutsche-Börse-Refresh). Endpoint `POST /api/cron/bond-catalog-sync`, Bearer `WEBHOOK_CRON_SECRET`, acked 2xx sofort + `asyncio.create_task` — analog IPO-Cron.
- **History-Collection** `bond_sync_runs` mit Index `created_at DESC`, Retention 30 (nur History-Docs).
- **Run-Status**: `success` / `failed` / `already_running`. Single-Source (kein partial_success).
- **History-Failure-Isolation**: Telemetrie-Insert wrapped, wirft Sync nicht.
- **Admin-Endpoints**: `GET /api/admin/bonds/catalog/sync/history?limit=1..30` und `GET /api/admin/bonds/catalog/sync/history.csv` (UTF-8+BOM, Semikolon, CSV-Injection-safe, ISO-8601).
- **Admin-UI**: „Synchronisierungsverlauf"-Card mit letzten 5 Runs, „Alle anzeigen"-Toggle, „CSV exportieren"-Button.
- **Lock**: Bestehender `asyncio.Lock` deckt Admin + Cron ab — verifiziert (Admin manuell + Cron parallel → 1× `already_running`).
- **Missing-from-Source-Policy** (Phase 17): NUR zählen (`missing_from_source`). Kein Delete, kein Deactivate. Empfehlung Future: `SOFT-DEACTIVATE_AFTER_N_MISSES` (z. B. 7).
- **QA Preview**: Cron unauth/bad-bearer → 401; valid → 200 + Background-Sync erfolgreich; Admin+Cron parallel → Lock greift; Admin history/CSV → 200; Unauth 401 · Customer 403 · Admin 200 überall; Regression Bond-Request 201→409, Admin-View ok; 1000 Bonds unverändert; 4 History-Rows nach End-to-End-Sequenz; CSV mit BOM+Excel-DE-Format.

### Constraints
Kein Prod-Deploy · Bond-Filter/Cap unverändert · Portfolio unverändert · IPO-Cron/History/CSV unverändert · Kein Delete · Keine Fake-Daten · Keine Secrets in History · No Raw-CSV persistiert.

## Session 82.16 (Preview) · Bond-Katalog Sync (Deutsche Börse XFRA-BF)
- **Quelle** offiziell / öffentlich / täglich aktualisiert: `https://www.cashmarket.deutsche-boerse.com/resource/blob/2289108/56273336b3d6bf87fa3d1b0cc641e3d9/data/t7-xfra-BF-allTradableInstruments.csv` (Segment „BOERSE FRANKFURT BONDS").
- **Service**: `backend/services/bond_sync.py` — Fetch (30 s Timeout) → Header-Robust-Detection → Filter → Prio-Sort → Cap 1000 → Bulk-Upsert. asyncio.Lock als Same-Instance-Guard.
- **Basisfilter**: `Instrument Type=BOND` · `Currency=EUR` · ISIN-Prefix ∈ {DE,AT,BE,FI,FR,GR,IE,IT,LU,NL,PT,ES,EE,LT,LV,MT,CY,SK,SI,XS} · Product+Instrument Status=Active · Maturity ≥ heute+90 d.
- **Kuratierung**: Restlaufzeit ≤ 15 Jahre · Denomination ≤ 100 000 EUR · Priorität DE/AT/FR/NL/BE/LU → XS → EU-Rest, dann Restlaufzeit ASC, dann ISIN ASC.
- **Schema additiv**: `currency`, `country`, `source`, `external_key`, `is_manual_override`, `issue_date`. Bestehende Felder unverändert. Indizes: `external_key` UNIQUE sparse + `isin` UNIQUE sparse.
- **Manual-Override P0**: fachliche Felder (bond_name, issuer, coupon, maturity, denomination, availability) werden bei `is_manual_override=true` nicht überschrieben. Preis-Felder `kaufkurs`/`aktueller_kurs`/`min_order_eur` werden vom Sync nie geschrieben (Admin-editable).
- **No-Delete**: Rows, die aus der Source verschwinden, werden nicht gelöscht/deaktiviert — nur als `missing_from_source` gezählt.
- **Route**: `POST /api/admin/bonds/catalog/sync` (admin-only). Public `GET /api/bonds/catalog` mit Server-Side-Maturity-Guard (nur ≥ heute).
- **UI**: „Jetzt synchronisieren"-Button in `AdminBondCatalog` + Sync-Summary-Card (geprüft/neu/aktualisiert/unverändert/geschützt/cap).
- **QA Preview**: Sync #1 → 1000 inserted in 880 ms; Sync #2 → 1000 unchanged (idempotent); Parallel → one `already_running`; Manual-Override → geschützt; Customer-Katalog → 1000 sichtbar, 0 abgelaufen; Bond-Request 201 → Duplicate 409 → GET/me → Admin-View → cleanup ok; Unauth 401 · Customer 403 · Admin 200.
- **Datenqualität**: 0 NaN · 0 Duplicate-ISIN · 0 abgelaufene · 100 % ISIN/Maturity/Denomination · 97,5 % Coupon.
- **Cron**: NICHT aktiviert. Empfehlung: `daily` (Source wird täglich aktualisiert).

### Constraints
Kein Prod-Deploy · Keine Portfolio-Migration · Kein Cron aktiviert · Kein Delete · Keine Fake-Daten · IPO-Sync/History/CSV/Requests/DashboardDataContext/Supabase/Auth/Header/News/Cron-Config unverändert.

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
