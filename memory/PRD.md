# PRD — Fröhlich Vermögensberatung / Kapital-Direkt24 · FastAPI + MongoDB

Sprache: **Deutsch**. Preview: `finance-platform-v2.preview.emergentagent.com`. Prod: `finance-platform-v2.emergent.host`.

## Session 82.22 (Preview) · Depot Phase 4A — Mongo-native Stock-Price-Cache + Market Value
- **Selected Source**: bestehende `/api/news-markte/market/quotes` (yfinance + Fallback-Provider, real, delayed).
- **Neuer Service** `backend/services/stock_price_service.py` — Read-through Cache: fresh (≤15 Min) → direkt aus Mongo; stale/missing → Provider → persist → return; Provider-Fail + Cache → `stale`; kein Cache → `unavailable`. Kein Fake-Fallback.
- **Neue Collection** `stock_prices_cache` (Mongo-native) — Felder: `symbol` UNIQUE, `price` (Decimal128), `currency`, `change`, `change_pct`, `as_of`, `source`, `fetched_at`. Index `symbol_unique` + `fetched_desc`.
- **Neuer Endpoint** `GET /api/portfolio/quotes?symbols=SAP,NVDA,ORCL` — batch, auth-required.
- **Position-Enrichment**: `GET /api/portfolio/stock-positions` liefert jetzt zusätzlich `price`, `market_value`, `cost_basis`, `profit_loss`, `profit_loss_pct`, `as_of`, `price_status`, `price_source` — mit `Decimal`-sicherer Berechnung. Bei fehlender Position: 200 [].
- **Summary-Enrichment**: `GET /api/portfolio/summary` — `stocks.market_value` aus realen Quotes, `stocks.valuation_complete` + `stocks.unpriced_symbols`, `profit_loss/pct` aus market vs cost. Bond-Preise weiterhin `valuation_complete=false` (separater Task).
- **QA Preview**: SAP real 232.10 EUR · NVDA real 119.37 EUR · ORCL → `unavailable` (nicht in Provider-Allowlist) — kein Fake-Fallback ✅. Cache-Hit auf 2. Call → `fresh` (kein Provider-Roundtrip). Summary leer bei demo.kunde (0 Positions, 0 Cash, valuation_complete=true). Unauth 401. Alle Regression-Endpoints 200.
- **N+1 vermieden**: 1 Batch-Provider-Call pro Portfolio-Read, egal wie viele Symbole.

### Constraints
Kein Prod-Deploy · Keine Order-Execution · Keine Position-Erzeugung · Keine Market-Order-Freigabe · Provider-Secrets nur serverseitig · Kein SSRF (Symbol-Allowlist via Provider) · Cash-Ledger/Watchlist/Alerts/Orders/IPO/Bond unverändert.

## Session 82.21 (Preview) · Depot Phase 3C — Customer Order UI (Limit-Kauf + Storno)
- **Neuer SDK** `services/portfolioOrderApi.js` — `createOrder/cancelOrder/listOrders/getCash` gegen `/api/portfolio/orders*` (credentials: include, error-typisiert).
- **Neue Komponente** `components/portfolio/OrderCreateModal.jsx` — Limit-Buy-Modal: Instrument, Ordertyp (Market-Option disabled mit Hinweis), Seite=Kaufen, Stückzahl, Limitpreis, live berechneter Reservierungsbetrag, verfügbare Liquidität aus `/api/portfolio/cash`, stabiler `idempotency_key` pro Submit (`crypto.randomUUID`), Doppelklick-Schutz via `submitting`-State.
- **StockDetail-Cutover**: „Kaufen"-Button öffnet OrderCreateModal (statt Scroll zum Legacy-Form). Nach Erfolg: Toast + Dashboard-Refresh.
- **OrdersPage `cancelOrder`**: von `supabase.from('user_stock_orders').update({status:cancelled})` → `portfolioOrderApi.cancelOrder(id)` (bereits FastAPI). Pending-Row zeigt Button „Stornieren", nach Erfolg Refresh von orders + cash.
- **QA Preview (10 Tests grün)**: Deposit 10 000 → Limit-Buy 10×100=1000 reserviert → cash available 9 000 → Doppelklick idempotent (gleiche ID) → Overspend 400 mit klarer Fehlermeldung → Cancel → available 10 000 → Double-Cancel idempotent → Cross-User-Cancel 404 → Reversal Netto 0.
- **Sell/Market**: Sell-CTA in StockDetail unverändert (Legacy-Verkaufsform bleibt); Market-Order-UI ist bewusst nur mit Hinweis „derzeit nicht verfügbar" sichtbar.
- **Customer Supabase Order-Writes**: 0 nach Cutover.

### Constraints
Kein Prod-Deploy · Keine Order-Execution · Keine Position-Erzeugung · Keine Market-Order-Ausführung · Keine Short-Sells · Cash-Ledger/Watchlist/Alerts/IPO/Bond unverändert.

## Session 82.20 (Preview) · Depot Phase 3B — Frontend UI-Cutover Watchlist/Alerts/Orders
- **Audit-Ergebnis**: Alerts (Customer) waren bereits vollständig Mongo-native via `/api/alerts` (`services/priceAlertService.js`). Watchlist-SDK `services/watchlistApi.js` gegen `/api/watchlist` bereits vorhanden. Nur 4 direkte Supabase-Watchlist-Writes in 2 Pages verblieben (Handeln.js, StockDetail.js).
- **Watchlist-Cutover**: `toggleWatchlist` in beiden Pages von `supabase.from('user_stock_watchlist').insert/delete` → `watchlistApi.add/remove` umgestellt. Imports ergänzt. `.upper()`-Normalisierung serverseitig konsistent.
- **Alerts**: kein Cutover nötig — Frontend nutzt bereits `/api/alerts` via `apiClient` (SDK aus früherer Session).
- **Orders**: `OrdersPage.jsx` hat keine Order-Create-UI (nur Anzeige). Der in Session 82.19 gebaute `POST /api/portfolio/orders` ist einsatzbereit, aber kundenseitig noch nicht angebunden — Order-Create-UI ist eigenständiger nächster Task (P0-Backlog).
- **QA Preview**: `GET /api/watchlist` 200 · `POST /api/watchlist {MSFT}` 201 · `DELETE /api/watchlist/MSFT` 200 · `GET /api/alerts` 200 · Watchlist-Supabase-Customer-Writes AFTER = 0 · Alerts-Customer-Writes = 0 · Orders-Customer-Writes = 0.

### Constraints
Kein Prod-Deploy · Keine neuen Supabase-Writes · Keine Order-Execution · Keine Position-Erzeugung · Alerts/Watchlist-SDKs unverändert.

## Session 82.19 (Preview) · Depot Phase 3 — Watchlist/Alerts/Orders Write-Layer + Cash-Reservation
- **User-ID-Normalisierung** (Phase B): 3 `watchlists` + 6 `stock_alerts` von String → `ObjectId` konvertiert (script-basiert, idempotent, nur valide 24-hex Werte). `$or`-Compat-Filter im Portfolio-Read-Layer bleibt defensiv erhalten für zukünftige Legacy-Rows.
- **Watchlist Write**: `POST /api/portfolio/watchlist` (idempotent bei Duplikat), `DELETE /api/portfolio/watchlist/{symbol}`. Symbol serverseitig uppercase+validate (`[A-Z0-9.\-]{1,12}`). Unique-Index `(user_id, symbol)`.
- **Alerts Write**: `POST /api/portfolio/alerts` (Preis + Direction above/below, `Decimal128`), `DELETE /api/portfolio/alerts/{id}`. Duplicate-Guard über `(user_id, symbol, alert_type, threshold, is_active)`.
- **Orders Write**: neue Collection-Nutzung `stock_orders`, `POST /api/portfolio/orders` + `POST /api/portfolio/orders/{id}/cancel`. Pydantic `extra=forbid` blockt `status`/`reserved_cash`/`executed_price`/`user_id` Injection (HTTP 422).
- **Order-Reservation** (Phase I): Buy-Limit reserviert `qty*limit_price` als `reserved_cash` **im Order-Dokument** — kein Ledger-Event, damit Mongo-Standalone-sicher (Single-Doc-Write).
- **Cash-Service** (Phase J): `get_cash_summary` liest `open_buy_reservations` aus `stock_orders (side=buy, status=pending)` und rechnet in `available = balance - unsettled - open_buy_reservations`.
- **Insufficient-Funds-Guard**: Buy-Order-Reservation > `available` → HTTP 400 vor Insert. Per-User `asyncio.Lock` serialisiert parallele Buy-Orders (Preview-Race-Schutz auf Standalone-Mongo).
- **Sell-Guard**: Sell nur mit vorhandener Position (`quantity <= available_qty`), sonst 400. Keine Short-Sells, keine synthetischen Positionen.
- **Market-Order**: 400 „Market-Orders sind derzeit noch nicht verfügbar." — keine Fake-Preisannahme ohne verlässlichen Preisfeed.
- **Indizes**: `stock_orders (user_id, idempotency_key)` UNIQUE, `(user_id, created_at DESC)`, `(user_id, status)`.
- **QA Preview (18 Tests grün)**: Deposit → Watchlist Add/Reload/Delete → Alert Add/Duplicate/Delete → Buy 1 000 EUR reserviert → available 9 000 → Duplicate-Idem → Insufficient-Funds 400 → Cancel → available 10 000 → Double-Cancel idempotent → Sell-Without-Position 400 → Market 400 → Injection 422 → Cross-User-Cancel 404 → Cross-User-Delete 404 → Unauth 401 → Reversal Netto 0.00.

### Constraints
Kein Prod-Deploy · Keine Order-Execution · Keine Position-Erzeugung · Keine IPO-Zuteilung · Keine Bond-Ausführung · Keine Multi-Collection-Financial-Writes · Keine Fake-Preise · Portfolio-Read-Layer/Cash-Ledger/Bond/IPO unverändert.

## Session 82.18 (Preview) · Depot Phase 2 — Cash-Ledger Mongo-native
- **Neuer Service** `backend/services/cash_service.py` — append-only Ledger, BSON `Decimal128` mit `ROUND_HALF_EVEN`, Präzision auf 2 Dezimalen. Validation-Guard verbietet `float`, negative Beträge, unbekannte Währungen und reservierte Event-Types.
- **Neue Collection** `cash_ledger` — Source of Truth für Cash. Balance-Berechnung: `Σ settled credits − Σ settled debits`. `available = balance − pending_debits − open_buy_reservations` (letzteres in Phase 3, aktuell 0).
- **Indizes**: `(user_id, idempotency_key)` UNIQUE (Idempotenz-Guard) · `(user_id, effective_at DESC)` · `(user_id, created_at DESC)`.
- **Event-Types aktiv**: `deposit`, `withdrawal`, `adjustment`, `reserve`, `release`. **Reserviert** (400 bei Nutzung): `stock_purchase`, `stock_sale`, `ipo_purchase`, `bond_purchase`, `dividend`, `interest`, `fee`, `tax`.
- **Directions**: `credit` (erhöht) / `debit` (mindert). Amount immer > 0 (keine negativen Werte).
- **Statuses**: `pending` (unsettled) / `settled` (wirksam) / `cancelled` (unwirksam).
- **Admin-Endpoints**: `POST /api/admin/portfolio/cash/deposit` · `POST /api/admin/portfolio/cash/adjustment` · `GET /api/admin/portfolio/cash/summary?user_id=…`. `require_admin` auf allen dreien. Kein direkter Balance-Set — nur Ledger-Events.
- **Customer-Endpoint**: `GET /api/portfolio/cash` liest jetzt aus Ledger (nicht mehr `users.cash_balance`). Customer hat **keinen** Deposit/Withdrawal-Write in dieser Phase.
- **`/api/portfolio/summary`** bezieht Cash aus `cash_service.get_cash_summary()` — keine doppelte Berechnung.
- **QA Preview (16 Tests grün)**: Unauth 401 · Customer→Admin 403 · Deposit 10 000 EUR success · Duplicate-Retry mit gleicher `idempotency_key` → `status=duplicate`, keine zweite Buchung · Präzision 10.99 + 0.01 + 0.10 = 10011.10 exakt · Reversal via Adjustment-Debit → balance=0.00, 5 Events append-only erhalten · Admin sieht Customer-Summary · Customer mit `?user_id=<foreign>` sieht eigenen Stand · Negatives Amount 400 · Unknown-Currency 400 · IPO/Bond/Auth-Regression grün.
- **Preview-Testdaten**: 5 Ledger-Events für `demo.kunde` (4× deposit + 1× adjustment), Nettobalance 0.00 EUR — Append-Only-Prinzip gewahrt, kein DB-Delete.

### Constraints
Kein Prod-Deploy · Nur append-only Ledger-Inserts · Kein Customer-Write · Keine Multi-Collection-Financial-Writes · Keine Aktienkäufe/IPO-Zuteilungen/Bond-Ausführungen · Kein Service-Role · IPO/Bond-Katalog/Requests/Sync/Cron/Portfolio-Read-Layer unverändert.

## Session 82.17 (Preview) · Depot Phase 1 — Portfolio Read-Layer Mongo-native
- **Neuer Router** `backend/routes/portfolio.py` mit 8 Customer-Endpoints (Read-Only): `summary`, `stock-positions`, `bond-positions`, `orders`, `cash`, `watchlist`, `alerts`, `snapshots`. Alle require `get_current_user`, `user_id` serverseitig aus Mongo-Auth (kein Client-Injection).
- **Empty-State-Vertrag**: 200 + `[]` bzw. mathematischer Zero-State; keine Fake-Daten, keine erfundenen Preise.
- **Legacy-Kompat**: `_user_filter()` matcht sowohl `ObjectId` als auch `str` als `user_id` (bestehende `watchlists`/`stock_alerts` Rows aus Session 80.83 sind als String persistiert).
- **Indizes idempotent** angelegt: `user_id`+Symbol/ISIN unique sparse, created_at DESC-Sortier-Indizes, snapshot_date unique.
- **`DashboardDataContext.jsx` Cutover**: 6 Fetches (`fetchCashBalance`, `fetchCashHistory`, `fetchDepotContracts`, `fetchBondPositions`, `fetchStockData`, `fetchHeroSnapshots`) auf FastAPI umgestellt. Supabase-RPCs `process_cash_settlements` und `get_user_buying_power` sowie `.single()` auf `profiles` entfernt — keine UUID-Cast-Fehler mehr.
- **`Statement.js` Cutover**: 8 direkte Supabase-Portfolio-Reads → FastAPI-Aggregat aus `/api/portfolio/cash|stock-positions|bond-positions|orders`.
- **Banner-Trigger**: 200 + `[]` gilt als Success — der rote „Einige Dashboard-Daten…"-Banner triggert nur noch bei echten HTTP-Fehlern.
- **Security**: unauth → 401 auf allen 8 Endpoints; Cross-User-Read technisch unmöglich (Query-Injection wie `?user_id=…` wird ignoriert); Server-Filter bindet strikt an eingeloggte Session.
- **QA Preview**: alle 8 Endpoints 200 · Summary aggregiert korrekt (0/0/0 im Empty-State) · Cash 0 ohne Crash · Watchlist Legacy-String-Match funktioniert (Admin sieht 2 Rows) · IPO/Bond-Regression bestanden · Supabase-Portfolio-Reads-Zähler in beiden Frontend-Dateien = 0.
- **Nicht in Scope**: Portfolio-Writes, Cash-Ledger, IPO/Bond-Allocation, Depot-Verträge (kommen in Phase 2/3).

### Constraints
Kein Prod-Deploy · Read-Only · Keine Cash-Buchungen · Keine Position-Erzeugung · Keine Migration historischer Supabase-Daten · Kein Service-Role · Kein RLS-Change · IPO/Bond Katalog/Requests/Sync/Cron unverändert.

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
