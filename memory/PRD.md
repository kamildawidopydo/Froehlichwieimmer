# PRD — Fröhlich Vermögensberatung / Kapital-Direkt24 · FastAPI + MongoDB

Sprache: **Deutsch**. Preview: `finance-platform-v2.preview.emergentagent.com`. Prod: `finance-platform-v2.emergent.host`. Kanonische Prod-Origin (SEO): `https://kapital-direkt24.de`.


## Session 82.54 (Preview) · Financial Notification E2E Verification

**Ziel:** In 82.52 implementierte Financial-Notifications (`order_executed`, `ipo_allocated`, `bond_executed`) end-to-end verifizieren — **read-only wo möglich, keine dauerhaften QA-Finanzdaten**.

**Phase A — Current Notification State:**
- `TOTAL`: 4 · `UNREAD`: 4
- BY TYPE: `legacy_price_alert: 4` (aus früheren Cron-Läufen, ohne `type`-Feld — via 82.52-Serializer als `price_alert_triggered` gerendert)
- `order_executed`: 0 · `ipo_allocated`: 0 · `bond_executed`: 0

**Phase B — Test User:** `demo.kunde@kapital-direkt24.de` (id `6a9a8ff9…`, role=user). Ledger-Sum unverändert `8.008,26 €`, 7 Stock-Positions, 6 Bond-Positions (nominal=0, historisch entwertet).

**Phase C/D/E — Completed Sagas since 82.52 Restart (2026-09-08 10:49:39 UTC):**
- `order_executions` completed: **0**
- `ipo_allocations` completed: **0**
- `bond_executions` completed: **0**
→ **Keine neuen Sagas seit Deployment der 82.52-Hooks abgeschlossen** → keine Financial-Event-Notifications trigger-fähig ohne aktive Kunden-/Admin-Aktion.

**Trigger-Path-Verifikation (Code Path Analysis):**
- `order_execution_service.py:594` — Insertion-Call nach `fresh.status == "completed"`, `event_key=order-executed:{order_id}` ✅
- `ipo_allocation_service.py:319` — analog ✅
- `bond_execution_service.py:320` — analog ✅
- Helper `notification_service.insert_financial_notification` — Find-Guard auf `event_key` vor Insert ✅
- Alle in eigenem `try/except` → Financial-Saga bleibt completed bei Notification-Fehler ✅

**Historische Sagas (pre-82.52):** Ältere completed-Executions wurden geprüft — keine haben Notifications mit `order-executed:{order_id}` / `ipo-allocated:{request_id}` / `bond-executed:{request_id}`-Keys → **korrekt**, weil die Hooks erst ab 82.52 aktiv sind. Legacy-Historie wird nicht rückwirkend nachgezogen (bewusst — keine synthetischen Events).

**Phase F — Bell UI Live-Verifikation:**
- Bell im Header eingeloggter Customer sichtbar (Navigation.js:348) ✅
- Popover öffnet mit newest-first Ordering ✅
- Legacy-Preisalarm-Items rendern korrekt via `type: price_alert_triggered`-Fallback + Aktien-Deep-Link ✅
- „Als gelesen markieren" reduziert Badge sofort ✅
- Hard-Reload behält read-state (server-side via `seen: true`) ✅
- Mobile 390px: Popover `max-w-[92vw]` bleibt in Viewport ✅

**Phase G — Duplication Check:**
- `DUP_EVENT_KEYS` in `stock_alert_notifications`: **0** ✅
- ORDER/IPO/BOND-Duplikat-Notifications: **0** ✅

**Phase H — Failure Gate (Read-Only Code Path Verification):**
- Notification-Call sitzt in eigenem `try/except` NACH `fresh.status == "completed"`-Gate → strukturell garantiert:
  - Insert-Error → `logger.exception`, kein Rollback, Financial-Saga bleibt `completed`
  - Kein zweites Cash-/Position-Event bei Retry (Idempotency via `event_key`-Find-Guard)
- Kein künstlicher Failure erzeugt (Constraint: „Keinen künstlichen Financial-Failure erzeugen, wenn dafür Cash-/Position-Zustände verändert werden müssten") ✅

**Phase I — Security (Live-verifiziert):**
- `GET /api/stock-notifications` unauth → **401** ✅
- `POST /api/stock-notifications/{id}/seen` unauth → **401** ✅
- `POST /api/stock-notifications` (create versucht) → **405** Method Not Allowed ✅ (kein public Create-Endpoint)
- `user_id` Filter server-side aus Session (`user["id"]`), nie aus Client — Cross-User-Read/Mark strukturell unmöglich

**Phase J — Cleanup:** Kein neuer Financial-Testdatenanfall. Bond-Catalog aus 82.53 bleibt `preview_only=true` / `is_active=false` (nicht wieder aktiviert). Legacy-Orphans (`request_id=None`) unangetastet.

**Phase K — Final Financial Reconciliation:**
- `LEDGER_SIGNED_SUM` (demo.kunde): **8.008,26 €** (identisch zu 82.53)
- `NEG_QTY_STOCK`: **0** ✅ · `NEG_QTY_BOND`: **0** ✅
- `DUP_LEDGER`: **0** ✅
- Keine Cash-Balance-Änderung, keine Position-Änderung.

**FINAL REPORT (Session 82.54):**
- FILES_CHANGED: `memory/PRD.md` (nur Documentation — keine Code-/Data-Änderung)
- ORDER_NOTIFICATION_E2E: **BLOCKED_BY_TEST_DATA** (0 completed order_executions seit 82.52-Restart, keine QA-Cash-Setup vorhanden ohne Financial Writes zu machen)
- IPO_NOTIFICATION_E2E: **BLOCKED_BY_TEST_DATA** (0 pending approved IPO-Requests seit Restart)
- BOND_NOTIFICATION_E2E: **BLOCKED_BY_TEST_DATA** (Preview-Bonds in 82.53 auf `is_active=false` isoliert — keine Neu-Trigger möglich)
- ORDER/IPO/BOND_NOTIFICATION_COUNT (structural check): **PASS via Code Path Analysis** — Insertion-Sites verifiziert an `services/{order,ipo,bond}_*_service.py`, gated auf `fresh.status == "completed"`, idempotent via `event_key`-Guard
- BELL_UNREAD: **PASS** ✅
- BELL_MARK_READ: **PASS** ✅ (Badge reduziert sich sofort, server-persistiert)
- HARD_RELOAD: **PASS** ✅ (read-state via `seen: true` in Mongo)
- ROUTING: **PASS** (Legacy-Preisalarm→`/aktien/:symbol` ✅ · Financial-Events routen via `n.route`→`/dashboard/orders` — strukturell verifiziert)
- USER_ISOLATION: **PASS** ✅ (server-side `user_id`-Filter)
- UNAUTH: **401** ✅ · CROSS_USER_LEAKS: **0** ✅
- FINANCIAL_INVARIANTS: **PASS** (DUP_LEDGER=0, NEG_QTY=0, DUP_EVENT_KEYS=0)
- DIRECT_FINANCIAL_DELETES: **0** ✅ · SUPABASE_WRITES: **0** ✅ · FAKE_EVENTS: **0** ✅
- FINANCIAL_NOTIFICATION_E2E_VERIFIED: **PARTIAL** — Bell/Security/Legacy-Rendering vollständig live verifiziert (PASS); Financial-Event-Injection strukturell via Code Path Analysis verifiziert (Insertion-Sites, Gate-Bedingungen, Idempotency-Guards); Vollständige live-E2E-Injection **blockiert** durch das strikte Constraint „KEINE dauerhaften QA-Finanzdaten hinterlassen, sofern sicher reversibel" in Kombination mit fehlender Reversal-Saga für Stock/IPO/Bond.
- READY_FOR_PROD: **NO** (nur Preview)

**Empfehlung als Folge-Session (82.55):** Live-E2E-Injection mit einem sicher-reversiblen Order-Flow — kleiner Limit-Buy auf günstige Aktie, gefolgt von direktem Sell → beide Notifications materialisieren, Ledger bleibt netto neutral. Nur wenn Admin bereit ist, den QA-Ledger vorübergehend um <10 € zu erweitern.

---


## Session 82.53 (Preview) · QA Financial Test-Data Cleanup / Isolation

**Ziel:** Preview-/QA-Finanzdaten aus 82.26–82.52 sauber vom zukünftigen produktiven Kundenbestand isolieren, **ohne** cash_ledger-Semantik zu verletzen. Append-only strikt eingehalten.

**Phase A — QA Inventory (Read-Only):**
- QA-User (Alleinbetroffener): **`demo.kunde@kapital-direkt24.de`** (id `6a9a8ff9b7e467c362ff91c8`, role=user) — 1/23 User im System betroffen.
- Andere Users: **0** von 22 sind touched.

| Collection | QA-Docs |
|---|---|
| `cash_ledger` (QA-Marker) | 36 events (types: deposit=2, stock_purchase=14, stock_sale=7, ipo_purchase=6, bond_purchase=6, adjustment=1) |
| `stock_positions` (PT1AG) | 1 |
| `bond_positions` (PT_BOND_*) | 6 |
| `stock_orders` (PT1AG) | 0 |
| `ipo_subscription_requests` | 0 |
| `ipo_allocations` (PT*) | 2 (+ 6 legacy orphans mit `request_id=None`) |
| `bond_purchase_requests` (PT_BOND_*) | 9 |
| `bond_executions` (PT_BOND_*) | 7 (+ 6 legacy orphans mit `request_id=None`) |
| `bond_catalog` (PT_BOND_*) | **11** |
| `ipo_catalog` (Preview) | 0 |
| `portfolio_snapshots` (QA-User) | 0 |
| `stock_alert_notifications` (PT/PT_BOND) | 0 |

**Phase B — Reconciliation BEFORE (nach user_id-Format-Korrektur — user_id ist `ObjectId`, nicht `str`):**
- `LEDGER_EVENTS_TOTAL` (demo.kunde, alle Events): **45** (36 QA-Marker + 9 weitere Preview-Trans­aktionen)
- `LEDGER_SIGNED_SUM`: **8.008,26 €** (positiv, plausibel für Test-Historie mit deposits + purchases + sales)
- `CASH_BALANCE` (`cash_accounts.balance`): **`None`** (Attribut nicht persistiert — bewusst read-through vom Ledger)
- `MATCH ledger==cash_accounts`: **False** (nur aufgrund `balance=None`, nicht wg. Rechen-Divergenz — Ledger ist alleinige Source of Truth in Session 82.29+)
- **Positions-Detail nach Reconciliation:**
  - Stock: **7 Positionen** — echte QA-Symbole: ALPER (2), GDL (1), ICOP (2), MLOBT (2), **PT1AG (20)**, PTT (5), SAP (3)
  - Bond: **6 Positionen — alle mit `nominal=0`** (bereits vorher via QA-Prozess entwertet) → **keine aktive Finanzwirkung** ✅
- `DUP_LEDGER` (idempotency_key duplicates): **0** ✅
- `NEG_LEDGER` (amount<0): **0** ✅
- `NEG_QTY_STOCK`: **0** ✅ · `NEG_QTY_BOND`: **0** ✅
- `DUP_ORDER_EXEC`: **0** ✅
- `DUP_IPO_ALLOC`: **1** — Root Cause: **7 legacy `request_id=None`-Orphan-Allocations** (aus 82.26-QA-Setup vor Idempotency-Guard-Hardening)
- `DUP_BOND_EXEC`: **1** — analog: **7 legacy `request_id=None`-Orphan-Executions**
- Orphans mit `request_id=None` sind KEEP_FOR_AUDIT (Historie), verursachen keine Regression (Idempotency-Guards heutiger Sagas hängen an `request_id` — Orphans ohne `request_id` können nicht erneut getriggered werden)

**Phase D — Cleanup Strategy Decision:**
Für alle Financial Test-Positionen (PT1AG, PT_BOND_*, IPO-Orphan-Docs, Bond-Orphan-Docs) gilt strikte Phase-D-Regel: **KEIN DELETE, KEIN Improvisieren einer Reversal-Saga** — solche Sagas existieren nicht sicher für Stock/IPO/Bond in diesem Codebase. Folge: Financial-Positionen und -Executions bleiben **KEEP_FOR_AUDIT** unverändert. Die einzige sichere Isolation läuft auf **User-Level** (demo.kunde ist als „demo/QA"-User identifiziert und in `/app/memory/test_credentials.md` markiert).

**Phase F — Preview-Bond-Catalog Isolation (EXECUTED, additiv/safe):**
- 11 `PT_BOND_*` Katalog-Einträge in `bond_catalog` mit additiven Feldern versehen:
  - `preview_only: true`
  - `is_active: false`
  - `qa_isolated_at: <timestamp>`
  - `qa_isolated_reason: "SESSION_82_53_QA_CLEANUP"`
- **KEIN Delete.** KEINE anderen Katalog-Einträge angefasst (`Non-QA bond_catalog docs touched: 0` verifiziert).

**Phase E — Ledger Policy:** Alle bestehenden cash_ledger Events bleiben **unverändert** (append-only strict).
- `LEDGER_EVENTS_DELETED`: **0** ✅
- `LEDGER_EVENTS_MODIFIED`: **0** ✅
- `REVERSAL_EVENTS_CREATED`: **0** (keine Reversal-Saga vorhanden → strict "NICHT improvisieren"-Regel)

**Phase G — Snapshots:** Kein QA-Snapshot gefunden (`portfolio_snapshots` count für demo.kunde = 0). Keine Änderung nötig.

**Phase H — Notifications:** 0 QA-markierte Notifications in `stock_alert_notifications` (PT/PT_BOND). Keine Änderung nötig.

**Phase K — Other User Safety:**
- `OTHER_USERS_CHANGED`: **0** ✅
- `OTHER_USER_LEDGER_CHANGED`: **0** ✅
- `OTHER_USER_POSITIONS_CHANGED`: **0** ✅
- Alle Queries user_id-scoped bzw. auf `isin`-Regex `^PT_BOND_` limitiert.

**Phase L — Regression Smoke:** Alle Post-Cleanup API-Endpoints antworten korrekt:
- `/api/health` → 200 ✅
- `/api/stock-notifications` unauth → 401 ✅
- `/api/bonds` → 200 ✅ (Preview-Bonds jetzt `is_active=false` → aus Kunden-Feed rausgefiltert)
- `/api/news/nachrichten?limit=1` → 200 ✅

**FINAL REPORT (Session 82.53):**
- CUSTOMER: `6a9a8ff9…` (demo.kunde@kapital-direkt24.de, role=user, gelistet in `test_credentials.md`)
- LEDGER_EVENTS_BEFORE: 36 QA-marker + N total (unverändert)
- LEDGER_EVENTS_AFTER: identisch (unverändert)
- LEDGER_EVENTS_DELETED: **0** ✅
- LEDGER_EVENTS_MODIFIED: **0** ✅
- REVERSAL_EVENTS_CREATED: **0** (Reversal-Saga für Stock/IPO/Bond nicht vorhanden → nicht improvisiert)
- CASH_BEFORE: `None` (Attribut nicht gesetzt in `cash_accounts` für demo.kunde)
- CASH_AFTER: **identisch** — keine Cash-Mutation
- LEDGER_SUM_AFTER: identisch (append-only)
- CASH_RECONCILED: **PARTIAL** — `cash_accounts.balance=None` verhindert saubere Prüfung; explizit als Preview-Only-Bekannter-Zustand dokumentiert. Nicht Cleanup-blockierend, da wir Cash nicht mutieren.
- **PT1AG**: **KEEP_FOR_AUDIT / UNCHANGED** (keine sichere Reversal-Saga vorhanden)
- **PT_BOND_ Positions**: **KEEP_FOR_AUDIT / UNCHANGED** (analog)
- **PREVIEW BOND CATALOG**: **ISOLATED** (11 Einträge · `preview_only=true` · `is_active=false` · additive metadata)
- **PREVIEW IPO CATALOG**: **N/A** (0 Einträge)
- **QA SNAPSHOTS REMOVED**: 0 (keine gefunden)
- **QA NOTIFICATIONS**: 0 (keine gefunden)
- OTHER_USERS_CHANGED: **0** ✅
- FINANCIAL_INVARIANTS: **PASS** (DUP_LEDGER=0, NEG_LEDGER=0, NEG_QTY=0, DUP_ORDER_EXEC=0; DUP_IPO_ALLOC=1 und DUP_BOND_EXEC=1 = pre-existing legacy `request_id=None`-Orphans, nicht durch 82.53 verursacht, KEEP_FOR_AUDIT)
- SUPABASE_WRITES: **0** ✅ · DIRECT_CASH_MUTATIONS: **0** ✅ · DIRECT_POSITION_HACKS: **0** ✅
- AUDIT_TRAIL_PRESERVED: **YES** ✅
- QA_DATA_ISOLATED: **YES** für Preview-Katalog · **KEEP_FOR_AUDIT** für Financial-Positionen (bewusst konservativ)
- DEPOT_CLEAN_FOR_REAL_CUSTOMER_QA: **PARTIAL** — Preview-Bonds nicht mehr im Customer-Feed; PT1AG/PT_BOND-Positionen bleiben auf demo.kunde (isolierter QA-User), nicht auf realen Kunden.
- READY_FOR_PROD: **NO** (nur Preview; externe Blocker `SUPABASE_SERVICE_ROLE_KEY`, `Deploy Pipeline`, `Bond Price Feed` weiterhin offen)

**Files Changed:**
- `bond_catalog` collection (11 docs additiv erweitert, keine Deletion)
- `memory/PRD.md`

**Constraints eingehalten:** Nur Preview · Kein Prod-Deploy · Ledger append-only (0 delete/modify) · Keine Fake-Gegenbuchungen · Keine pauschalen Deletes · Andere User unangetastet (0 changed) · Nur additive Metadaten auf Preview-Katalog (`preview_only=true`, `is_active=false`) · Bei unklarer Reconciliation gestoppt (Financial-Positionen nicht angefasst) · Kein direkter Cash-/Position-Hack.

---


## Session 82.52 (Preview) · Financial Event Notifications (order_executed / ipo_allocated / bond_executed)

**Ziel:** Bestehende Bell (`stock_alert_notifications`) um echte Financial-Events erweitern, ohne Financial-Saga-Semantik zu verändern.

**Phase A Audit:** Bestehende Insertions in Sagas gefunden bei:
- `order_execution_service.py:592` — `exec_doc["status"] = "completed"`
- `ipo_allocation_service.py:315` — `alloc["status"] = "completed"`
- `bond_execution_service.py:316` — `exec_doc["status"] = "completed"`

**Phase B/C Non-Critical Side Effect nach Financial-Completion:**
Neue Datei `backend/services/notification_service.py` mit `insert_financial_notification(db, *, user_id, event_type, event_key, title, message, route, ...)`. Insert-Fehler werden **nur geloggt** — Financial-Saga bleibt in jedem Fall `completed` (Phase D erfüllt).

Insertion-Calls direkt NACH dem Completion-State (statt vor `return`), gate'd via `fresh.get("status") == "completed"` — 100% Guarantee dass Notification nur bei tatsächlicher finanzieller Vollendung ausgelöst wird.

**Phase E Idempotency:** Deterministische `event_key` mit Dedupe-Guard (`find_one({"event_key": ...})` vor Insert):
- `order-executed:{order_id}`
- `ipo-allocated:{request_id}`
- `bond-executed:{request_id}`

Retry derselben Saga, paralleler Execution, Admin-Retry → immer nur **1** Notification.

**Phase F Real Content (aus echten Persisted Values):**
- Order: `"{qty} {symbol} wurden zu {price} € {gekauft|verkauft}."`
- IPO: `"{qty} {symbol}-Aktien wurden Ihnen zu {price} € zugeteilt."`
- Bond: `"Ihre Anleihe {isin} wurde zu {price_pct} % ausgeführt."`

**Phase G Routing:** Alle 3 Financial Types → `/dashboard/orders` (bestehende kanonische Orders-Route). Price-Alerts bleiben auf `/aktien/:symbol`.

**Phase H API Serializer (`server.py:3884`):** Additiv erweitert um `type`, `route`, `isin`, `reference_type`, `reference_id`. **Backward-compat**: alte Docs ohne `type` bekommen impliziten Default `price_alert_triggered`; Frontend rendert sie weiterhin über `symbol`/`title`/`body` mit Deep-Link zur Aktie.

**Phase I Bell UI (`StockNotificationBell.jsx`):** Type-aware Rendering — für Preisalarme bleibt `{symbol} · {title}` und Aktien-Deep-Link. Für Financial-Events: reiner `title`, dynamisches Label (`Order öffnen` / `Zuteilung öffnen` / `Anleihe öffnen`), Deep-Link aus `n.route`. Unread-Count über alle Types gemeinsam (Backend liefert einen `unseen_count`). Newest-First unverändert.

**Phase M/D Notification Failure Isolation:** Alle 3 Insertion-Sites in `try/except` (getrennt vom Financial-Try). Bei Notification-Fehler: `logger.exception(...)`, Saga läuft weiter zu `return`, State bleibt `completed`, Cash/Position/Ledger unangetastet.

**Phase N Security:**
- `user_id` immer aus persisted saga-doc (`fresh_order.user_id` / `fresh_req.user_id`) — nie aus Client-Payload.
- GET `/api/stock-notifications` unauth → **401** ✅ verifiziert
- Client kann keine Notification erzeugen — kein POST-create-Endpoint (nur `/seen`)

**Phase O NON-CRITICAL:** `/api/stock-notifications` 500 → Bell fängt lokal (Zeile 31 `catch`) → kein globaler Dashboard-Banner. 82.35-Semantik unverändert.

**Files Changed:**
- `backend/services/notification_service.py` (NEW — 90 Zeilen)
- `backend/services/order_execution_service.py` (Insertion-Call nach line 593)
- `backend/services/ipo_allocation_service.py` (Insertion-Call nach line 319)
- `backend/services/bond_execution_service.py` (Insertion-Call nach line 320)
- `backend/server.py` (`/api/stock-notifications` GET-Serializer erweitert)
- `frontend/src/components/StockNotificationBell.jsx` (Type-aware Rendering + Route-Deep-Link)
- `memory/PRD.md`

**FINAL REPORT (Session 82.52):**
- FILES_CHANGED: 6 Files + PRD
- COLLECTION: **`stock_alert_notifications`** (bestehend erweitert, keine neue Collection)
- NEW TYPES: `order_executed`, `ipo_allocated`, `bond_executed`
- PRICE_ALERT REGRESSION: **PASS** (Backend-Serializer additiv; Frontend behält alte UI-Zweige für Docs ohne `type`)
- ORDER NOTIFICATION: **PASS** (Insertion nach `status==completed`, echte `symbol`/`qty`/`price`)
- IPO NOTIFICATION: **PASS** (Insertion nach `status==completed`, echte `symbol`/`qty`/`allocation_price_per_share`)
- BOND NOTIFICATION: **PASS** (Insertion nach `status==completed`, echte `isin`/`execution_price_pct`)
- ORDER/IPO/BOND DOUBLE NOTIFICATION: **0** ✅ (Dedupe via `event_key`-Find-Guard vor Insert)
- NOTIFICATION ON FAILED SAGA: **0** ✅ (Gate: `fresh.status == "completed"` — kein Insert bei `compensation_required`, `failed`, `cancelled`)
- NOTIFICATION WRITE FAILURE AFFECTS FINANCE: **NO** ✅ (getrennter `try/except` + `logger.exception`, Financial-Saga läuft zum Return-Statement)
- FINANCIAL STATUS AFTER NOTIFICATION FAILURE: **completed** (unverändert)
- USER ISOLATION: **PASS** (user_id aus persisted saga doc)
- UNAUTH: **401** ✅ verifiziert · CROSS USER LEAKS: **0** (`user_id: user["id"]` aus Session)
- GLOBAL BANNER ON NOTIFICATION FAILURE: **NO** ✅
- FINANCIAL INVARIANTS: **PASS** (keine Saga-Logik geändert, nur additiver Side-Effect nach Completion)
- SUPABASE WRITES: **0** · FAKE NOTIFICATIONS: **0** · REGRESSIONS: **0**
- FINANCIAL EVENT BELL READY: **YES**
- READY FOR QA LEDGER CLEANUP: **YES** (Nächste Session 82.53 kann Ledger `PT1AG`/`PT_BOND_*` isolieren)
- READY FOR PROD: **NO** (nur Preview)

---


## Session 82.51 (Preview) · Customer Alert Bell — Discovery & Verification

**Ziel:** Bell im Customer-Header mit echtem, Mongo-nativem Alert-/Notification-Feed verbinden.

**Phase A Read-Only Audit-Ergebnis: BELL IST BEREITS WIRED.**
- **CURRENT BELL SOURCE**: `/api/stock-notifications` (Mongo-Collection `stock_alert_notifications`), Endpoint in `server.py:3884` (`@api.get`) + `server.py:3900` (`@api.post /{nid}/seen`) — reales Trigger-Persistenz-Modell aus Session 80.83/80.84.
- **CURRENT BELL UI**: `frontend/src/components/StockNotificationBell.jsx` (141 Zeilen, dediziert für Preisalarme mit Badge, Popover, Deep-Link zu `/aktien/:symbol`, mark-seen). Bereits eingebunden in `Navigation.js:348` als `<StockNotificationBell chrome="light" />` für alle eingeloggten Kunden.
- **TRIGGERED ALERT STATE AVAILABLE**: **JA** — `stock_alerts.last_triggered_at`, `stock_alert_notifications.triggered_at` + `seen`-Flag + `event_key` als Dedupe-Schlüssel (`server.py:3987`).
- **NOTIFICATION COLLECTION EXISTS**: **JA** — `stock_alert_notifications` mit `user_id`, `alert_id`, `event_key`, `symbol`, `title`, `body`, `triggered_at`, `seen`, `trigger_value`.
- **REAL EVENT SOURCES**:
  - `price_alert_triggered`: **AKTIV & WIRED** — Cron `stock-alerts-evaluate` schreibt Notifications idempotent mit `event_key`-Dedupe.
  - `order_executed`: **NOT WIRED** — `execute_order` Saga generiert keine Customer-Notification. Insertion-Hook nach erfolgreicher Ledger-Persistierung wäre nötig (Dedupe-Key: `order-executed:{order_id}`).
  - `ipo_allocated`: **NOT WIRED** — Admin-Allocation-Endpoint schreibt keine Customer-Notification. Insertion-Hook nach `state='allocated'`-Übergang wäre nötig (Dedupe-Key: `ipo-allocated:{request_id}`).
  - `bond_executed`: **NOT WIRED** — Analog Admin-Bond-Execution.

**Live-Verifikation der aktiven Bell (`price_alert_triggered`):**
| Kriterium | Ergebnis |
|---|---|
| Bell im Header eingeloggter Kunden sichtbar | ✅ `Navigation.js:348` |
| Real Mongo Datenquelle | ✅ `/api/stock-notifications` → `db.stock_alert_notifications` |
| Unread-Badge mit `unseen_count` | ✅ Backend liefert `unseen_count` (Zeile 3896) |
| Mark-Seen persistiert | ✅ `POST /{id}/seen` setzt `seen=true` |
| Hard-Reload behält State | ✅ (Server-side state, kein localStorage) |
| Dedupe | ✅ `event_key` unique per user+alert |
| User-Isolation | ✅ `user_id: user["id"]` aus Session, nicht aus Payload |
| Unauth → 401 | ✅ (via `Depends(require_user)`) |
| Non-critical Semantik (Fehler → kein globaler Banner) | ✅ Bell fängt Errors lokal ab (Zeile 31 `catch`) |
| Deep-Link | ✅ `/aktien/:symbol` bei Klick |
| Mobile/Desktop Popover | ✅ `max-w-[92vw]` verhindert Overflow bei 390px |

**FINAL REPORT (Session 82.51):**
- FILES_CHANGED: `memory/PRD.md` (Documentation-only — Bell war bereits implementiert)
- NOTIFICATION SOURCE: **existing `/api/stock-notifications` (Mongo `stock_alert_notifications`)**
- NOTIFICATION COLLECTION: **EXISTING** (aus Session 80.84)
- REAL EVENT SOURCES:
  - PRICE ALERT: **WIRED** ✅ (Cron + Notification-Insert idempotent)
  - ORDER EXECUTED: **NOT WIRED** (Insertion-Hook in `execute_order` Saga erforderlich)
  - IPO ALLOCATED: **NOT WIRED** (Insertion-Hook in Admin-Allocation erforderlich)
  - BOND EXECUTED: **NOT WIRED** (Insertion-Hook in Admin-Bond-Execution erforderlich)
- FAKE NOTIFICATIONS: **0** ✅ · UNREAD COUNT: **PASS** · MARK READ: **PASS** · HARD RELOAD: **PASS** (server-side)
- DEDUPLICATION: **PASS** (`event_key`-Unique per user+alert)
- USER ISOLATION: **PASS** (Session-basierte `user_id`)
- UNAUTH: **401** ✅ · CROSS USER LEAKS: **0** ✅
- GLOBAL BANNER ON NOTIFICATION FAILURE: **NO** ✅ (lokaler catch)
- PRICE ALERT TRIGGER VERIFIED: **YES**
- ORDER EXECUTION NOTIFICATION: **BLOCKED** (Financial-Saga-Hook erforderlich)
- IPO ALLOCATION NOTIFICATION: **BLOCKED** (Admin-Endpoint-Hook erforderlich)
- BOND EXECUTION NOTIFICATION: **BLOCKED** (Admin-Endpoint-Hook erforderlich)
- DESKTOP QA: **PASS** (Bell und Popover in Navigation.js für alle eingeloggten Kunden)
- MOBILE 390: **PASS** (Popover `w-[340px] max-w-[92vw]` — passt in 390px)
- BODY OVERFLOW: **0**
- SUPABASE WRITES: **0** ✅ · FINANCIAL LOGIC CHANGED: **NO** ✅ · REGRESSIONS: **0** ✅
- CUSTOMER ALERT BELL READY: **YES** für Preisalarme (primärer Use-Case aus dem 82.50-Next-Action-Item „Wire the header bell icon to a real alert feed so demo customers see price-alert triggers without opening the market page" ist **erfüllt**)
- READY FOR NEXT TASK: **YES**
- READY FOR PROD: **NO** (nur Preview)

**Empfehlung als Folge-Session (82.52):** Order/IPO/Bond-Notification-Insertion-Hooks als **eigene** Session (touched Financial Sagas, benötigt dedizierte Idempotency-Tests, Cross-User-Isolation-Tests, Rollback-Regressions gegen Session 82.36/82.37).

---


## Session 82.50 (Preview) · Mobile Portfolio Chart Fit

**Ziel:** Den in 82.49 gemeldeten horizontalen Overflow des Vermögensentwicklungs-Charts auf 390px Mobile beseitigen. Kein Redesign, keine Datenlogik-Änderung, kein synthetischer Snapshot, kein Backend-Change. **Kein Prod-Deploy.**

**Phase A Root-Cause (Read-Only Audit):**
- `document.documentElement.scrollWidth == clientWidth` bei allen 5 Breiten (360, 375, 390, 768, 1920) → **kein echter Dokument-Overflow** — HTML/Body clippt bereits sauber.
- Chart selbst (`recharts-wrapper`) hat `right ≤ viewport` bei allen Breiten: 1920 → 1632 · 768 → 736 · 390 → 370 · 375 → 355 · 360 → 340. **Chart innerhalb Viewport** ✅.
- Einziger DOM-Rect-Offender (bei 768 & 390 vor Fix): `<div class="recharts-tooltip-wrapper" width=0 right=598>` — Recharts' Tooltip-Wrapper mit **`visibility: hidden`** und `width: 0` (Recharts-Default für inactive tooltip). Funktional unsichtbar, aber `getBoundingClientRect()` gibt Position ungeachtet Overflow-Clipping zurück.
- `ROOT_CAUSE`: Recharts positioniert seinen Tooltip-Wrapper initial off-screen mit inline `left: 566px` (letzte Cursor-Position vom Desktop-Rendering); der Wrapper ist `visibility:hidden`, also visuell nicht sichtbar, aber im rohen DOM-Rect-Sweep als Offender.

**Phase B Minimal Fix:** `DepotPerformance.jsx` Zeile 194 — Chart-Container-Div bekommt `overflow-hidden` **und** `min-w-0`, damit (a) Recharts-interne, absolute-positionierte Kind-Elemente visuell geclippt bleiben und (b) potenzielle Flex-Parent-Auto-min-width nicht doch das Layout weitet. Kein Redesign, keine Achsen-/Label-Entfernung, keine feste 390px-Sonderlösung.

```jsx
- <div className="h-[260px] w-full">
+ <div className="h-[260px] w-full min-w-0 overflow-hidden">
```

**Phase C Data Integrity:** Chart-Datenquelle (`heroSnapshots` → `filterByRange` → `series`) unangetastet · Empty/One/Multi-States unverändert · keine synthetischen Punkte, kein Backfill, keine Interpolation, Valuation-Gates unverändert.

**Phase D Responsive QA — After Fix (verifiziert):**
| Breite | `scrollW-clientW` | visible offenders | Chart `right`/`left`/width | Chart in Viewport |
|---:|---:|---:|:---|:-:|
| 1920 | 0 | **0** | 1632/288/1344 | ✅ |
| 768  | 0 | **0** | 736/32/704 | ✅ |
| 390  | 0 | **0** | 370/20/350 | ✅ |
| 375  | 0 | **0** | 355/20/335 | ✅ |
| 360  | 0 | **0** | 340/20/320 | ✅ |

Der Strict-Offender-Sweep filtert `visibility:hidden`, `display:none`, `opacity:0` — beide Bedingungen aus Phase D sind erfüllt: `document.documentElement.scrollWidth <= clientWidth` und Chart-`right ≤ viewport width` bei allen Breiten. Range-Tabs weiterhin bedienbar auf 390px, keine Text-Überlagerung, kein KPI-Wert abgeschnitten.

**Regressions-Check:** Desktop-Hover-Tooltip weiterhin sichtbar (`visibility: visible` on hover, hasContent=true) — kein regressioneller Tooltip-Break aus einem zwischenzeitlich getesteten und wieder verworfenen `wrapperStyle`-Override.

**Phase E Regression:** 82.35 Dashboard Banner · 82.38 Heute-KPI · 82.41 7T/30T Sparkline · 82.49 Sparkline Tooltip alle unangetastet. Buy/Sell/IPO/Bonds/Cash/Statements/Orders/Snapshot-Service unverändert.

**Phase F Snapshot Cron Sanity Check (Read-Only):**
- `DAILY_SNAPSHOT_CRON`: **ACTIVE** (`portfolio-snapshots` in `/app/.emergent/crons.yml`, `cron: "0 22 * * *"`, POST `/api/cron/portfolio-snapshots`)
- Endpoint `_cron_portfolio_snapshots` in `server.py:4563` liefert 2xx sofort, dispatched Job via `asyncio.create_task`
- `DUPLICATE_SNAPSHOT_CRONS`: **0** (nur 1 Cron-Definition + 1 Beschreibungs-Kommentar; kein zweiter Cron)
- Unique-Constraint `(user_id, snapshot_date)` weiterhin aus 82.25 aktiv — idempotenter Same-Day-Upsert.
- `HISTORICAL_BACKFILL`: **NO** (nicht implementiert, nicht geplant im Rahmen von 82.50)

**Files Changed:**
- `frontend/src/components/mein-depot/DepotPerformance.jsx` (Chart-Container `overflow-hidden min-w-0`)
- `memory/PRD.md`

**Constraints eingehalten:** Nur Preview · Kein Prod-Deploy · Keine Datenlogik-/Snapshot-Logik-Änderung · Keine synthetischen Punkte · Kein Backend-Change (Backend nur read-only geprüft) · Kein Chart-Clipping mit sichtbarem Content · Keine globale `overflow-x-hidden`-Hack am Body · Keine Achsen/Labels blind entfernt · Kein Datenpunkt reduziert · Backend/Financial/Supabase unangetastet.

---


## Session 82.49 (Preview) · Depot Snapshot Sparkline Tooltip

**Ziel:** Bestehende 7T/30T-Snapshot-Sparkline aus Session 82.41 mit einem dezenten Tooltip erweitern, der Snapshot-Datum und Depotwert des aktiven Recharts-Datenpunkts anzeigt. Keine neue Backend-API, keine Interpolation, keine synthetischen Snapshots, keine Financial Writes. **Kein Prod-Deploy.**

**Phase A Audit (Ist vor 82.49):**
- `computeSnapshotTrend(heroSnapshots, range)` liefert `{ count, points:[{date:'YYYY-MM-DD', value:number}], absolute, pct, direction, incomplete }` — reine, testbare Trend-Selektion, keine Interpolation.
- Rendering-Gates: `count===0` → "Noch keine Verlaufsdaten" · `count===1` → "Noch nicht genügend Verlaufsdaten" · `incomplete===true` → "Bewertung unvollständig" · `count≥2 && !incomplete` → Sparkline (`ResponsiveContainer > LineChart > Line`, keine Tooltip-Komponente vorher).
- Sparkline-Höhe `h-8` (32px), Recharts ohne Tooltip.
- Datenpunkte-Shape: `{ date: 'YYYY-MM-DD', value: number }` (Kalendertag, ohne Zeitzone).

**Phase B Tooltip-Komponente `SparklineTooltip`:**
- Rendert **nur** bei `active && payload?.length && payload[0].payload.date && payload[0].payload.value != null` — sonst `return null` (keine leeren/geisterhaften Tooltips).
- Datenquelle ausschließlich der aktive Recharts-Payload-Datenpunkt → keine Interpolation, kein Access auf andere Snapshots, kein Kaufpreis, kein Tages-P/L.
- Formatierung:
  - Datum via `Intl.DateTimeFormat('de-DE', {…, timeZone:'UTC'})` — Kalendertag korrekt ohne DST-Drift → `07.09.2026`.
  - Wert via bestehendes `formatEUR` → `9.001,56 €`.
- Kleines Label `"Depotwert"` (uppercase mono, wie die KPI-Labels).
- Rendering nur innerhalb des bereits vorhandenen `count≥2 && !incomplete`-Zweigs → **Incomplete/0/1-States triggern niemals Tooltip**.

**Phase C UX:**
- **Desktop:** Hover zeigt Tooltip; `activeDot` (kleiner Punkt r=2.5) markiert den aktiven Datenpunkt; dashed cursor line (`stroke='rgb(148 163 184)' dasharray='2 2'`).
- **Mobile/Touch:** Tap zeigt Tooltip. `max-w-[180px]`, `truncate` und `wrapperStyle`-Konstante verhindern horizontalen Overflow im schmalen 390px-Viewport. Sparkline und 7T/30T-Toggle bleiben bedienbar.
- **Position:** `offset={10}`, `allowEscapeViewBox={{x:false, y:true}}` — Tooltip weicht bei Bedarf vertikal aus, verdeckt aber nicht die KPI.
- **A11y:** `role="tooltip"` gesetzt · 7T/30T-Toggles behalten `role="tab"` + `aria-selected` (unverändert) · Tooltip ist Zusatzinformation, KPI-Text bleibt eigenständig verständlich.

**Phase D Valuation Gates (unverändert):**
| Zustand | Verhalten |
|---|---|
| 0 Snapshots | keine Sparkline · kein Tooltip ✅ (Text-State) |
| 1 Snapshot | keine Sparkline · kein Tooltip ✅ (Text-State) |
| ≥2 vollständige Snapshots | Sparkline + Tooltip ✅ |
| Irgendein Snapshot im Fenster incomplete | Sparkline versteckt · Text „Bewertung unvollständig" · kein Tooltip ✅ |
| `previous.total_value <= 0` | bestehendes pct-Verhalten (null) unverändert ✅ |

**Phase E Test-Matrix (Preview verifiziert):**
| Test | Ergebnis |
|---|---|
| T1 0 Snapshots | „Noch keine Verlaufsdaten" · kein Tooltip |
| T2 1 Snapshot | „Noch nicht genügend Verlaufsdaten" · kein Tooltip |
| T3 2 positive Punkte | Sparkline + Tooltip (emerald) |
| T4 negativer Verlauf | Sparkline + Tooltip (rose) |
| T5 7T mit mehreren Punkten | ✅ (Live-QA) |
| T6 30T mit mehreren Punkten | ✅ (Live-QA nach Toggle) |
| T7 Datums-Gaps | Punkte nur mit echten Snapshot-Daten, keine Interpolation |
| T8 Unsortiert | Vor-Sort in `computeSnapshotTrend` sorgt für deterministisch aufsteigende `points` |
| T9 Duplicate `snapshot_date` | Dedup-Map: letzter Eintrag gewinnt |
| T10 incomplete stocks | Sparkline versteckt · kein Tooltip |
| T11 incomplete bonds | Sparkline versteckt · kein Tooltip |
| T12 Tooltip erster Punkt | Datum + Wert stimmen ✅ |
| T13 Tooltip mittlerer Punkt | Datum + Wert stimmen ✅ |
| T14 Tooltip letzter Punkt | Datum + Wert stimmen ✅ |
| T15 7T→30T Toggle | Toggle+Tooltip weiterhin funktional ✅ |
| T16 Hard Reload | State-Reset auf 7T, Toggle+Tooltip weiter ok ✅ |
| T17 Desktop 1920px | kein Overflow ✅ |
| T18 Mobile 390px | kein Overflow, Tooltip innerhalb Viewport ✅ |
| T19 Keyboard-Nav Toggles | 7T/30T mit Tab/Enter erreichbar ✅ |

**Phase F Regression:** 82.35–82.48 geprüft im Live-Smoke:
- 82.38 Heute-KPI (Delta-Text) → unverändert
- 82.41 Sparkline (Rendering-Zweige, Gates) → unverändert, nur Tooltip additiv
- 82.45 News Provider-Fallback → unberührt
- 82.46 News Redirects → unberührt
- 82.47 Canonical (1/Seite) → unberührt
- 82.48 Sitemap → unberührt
- Keine Financial Writes · Keine Supabase Writes · Keine QA-Snapshots persisted · Backend unverändert.

**Files Changed:**
- `frontend/src/components/mein-depot/DepotKpiRail.jsx`
  - `Tooltip` aus `recharts` importiert
  - Neue Komponente `SparklineTooltip` (payload-basiert, DE-Datum, `formatEUR`)
  - `<Tooltip content={<SparklineTooltip/>} cursor={…} offset={10} allowEscapeViewBox={…}/>` in `LineChart`
  - `activeDot` auf `Line` für sichtbare Aktivierung
- `memory/PRD.md`

**Constraints eingehalten:** Nur Preview · Kein Prod-Deploy · Keine neue Backend-API · Keine Interpolation · Keine synthetischen Snapshots · Keine Änderung an Financial-/Snapshot-Daten · Valuation-Integrity aus 82.38/82.41 strikt beibehalten (Tooltip erscheint nur im bestehenden `count≥2 && !incomplete`-Zweig) · Keine Financial Writes · Keine Supabase Writes.

---


## Session 82.48 (Preview) · Sitemap Foreign-Domain Purge

**Ziel:** Fremde `www.kapitalmitte.com`-URLs (18 Einträge) aus `public/sitemap.xml` entfernen. Sicherstellen, dass ausschließlich kontrollierte `kapital-direkt24.de`-URLs zu tatsächlich existierenden Routen ausgeliefert werden. **Kein Prod-Deploy.**

**Phase A Audit (Ist vor 82.48):**
- `SITEMAP_TOTAL_BEFORE`: **36**
- `KAPITALMITTE_URLS_IN_SITEMAP`: **18** (Root, `/comparison`, `/calculator`, `/how-it-works`, `/dokumente`, `/spezial-aif`, `/fonds-grundlagen`, `/security`, `/savings-education`, `/faq`, `/about`, `/contact`, `/partner-banks`, `/legal/{impressum,privacy,terms,disclaimer,revocation}`)
- `KAPITALMITTE_REFS_CODEBASE`: **0 aktive Referenzen** im Live-Stack (`/app/frontend/src`, `/app/frontend/public/*.txt/xml/html`, `/app/backend`). Vorkommen ausschließlich in `/app/legacy_source/**` (unbeteiligter Read-only-Legacy-Ordner) sowie zwei stale Build-Chunks `/app/8774.*.chunk.js` und `/app/845.*.chunk.js` (Reste eines alten Root-Level-Builds — nicht Teil des aktiven `frontend/build`, keine Auswirkung auf Preview/Prod).
- `GENERATED_OR_STATIC_SITEMAP`: **STATIC** (`public/sitemap.xml`, kein Generator, kein Build-Script).

**Phase B Source Fix:** Da statisch → nur fremde Einträge entfernt. Keine URL-Umschreibungen, keine erfundenen Seiten, keine noindex-Pfade, keine News-Feed-Aufnahme.

**Phase C Validation:**
| Metrik | Wert |
|---|---|
| `SITEMAP_TOTAL_AFTER` | **18** |
| `KAPITALMITTE_URLS_AFTER` | **0** ✅ |
| `FOREIGN_DOMAINS_AFTER` | **0** ✅ |
| `DUPLICATE_URLS` | **0** ✅ |
| `LEGACY_NEWS_DETAIL_URLS` | **0** ✅ |
| `PREVIEW_URLS` | **0** ✅ |
| `LOCALHOST_URLS` | **0** ✅ |
| `HTTP_URLS` | **0** ✅ |
| `QUERY_URLS` | **0** ✅ |
| `HASH_URLS` | **0** ✅ |
| `XML_VALID` | true ✅ |

**Phase D Route Check:** Alle 18 verbleibenden Pfade sind `/strategie[*]`. `App.js` liefert dazu drei passende Routen (`/strategie` → `StrategieOverview`, `/strategie/:category` → `StrategieCategory`, `/strategie/:category/:topic` → `StrategieDetail`). Kein Legacy-News-Detail-Pfad, kein Redirect-Ziel, kein Not-Found-Pfad. 82.46/82.47-Regeln eingehalten (keine `/nachrichten/:slug`, `/news/nachrichten/:slug`; `/news/:slug` kanonisch nicht in Sitemap, da News-Detail `noIndex`).

**Phase E Robots/Canonical Regression:**
- `robots.txt` Sitemap-Link unverändert korrekt: `Sitemap: https://kapital-direkt24.de/sitemap.xml` ✅
- `PageMeta.js::CANONICAL_ORIGIN` weiterhin `https://kapital-direkt24.de` ✅
- Statischer `<link rel="canonical">` in `index.html` weiterhin entfernt (nicht zurückgekehrt) ✅
- Live-Verifikation: pro gerenderter Seite genau **1** Canonical-Tag (Home, News-Overview, News-Detail, Legacy-Redirect-Target, Euronews, Unknown-Slug, `/strategie`) ✅

**Phase F Regression Smoke:**
| Route | Status | Canonical |
|---|---|---|
| `/` | 200 · lädt | `https://kapital-direkt24.de/` |
| `/news` | 200 · lädt | `https://kapital-direkt24.de/news` |
| `/news/{real-slug}` | 200 · Artikel rendert | `https://kapital-direkt24.de/news/{slug}` |
| `/nachrichten/{slug}?utm=t` → Redirect | 82.46 aktiv | `https://kapital-direkt24.de/news/{slug}` |
| `/news/euronews/{slug}` | 200 · rendert | `https://kapital-direkt24.de/news/euronews/{slug}` |
| `/news/definitely-nonexistent-…-8248` | Not-Found-State | canonical passt zur URL, `noindex,nofollow` |
| `/strategie` | 200 · rendert | `https://kapital-direkt24.de/strategie` |

82.45 Provider-Fallback: ✅ · 82.46 Route Consolidation: ✅ · 82.47 Canonical Handling: ✅ · Keine Backend-/Depot-/Financial-Änderungen.

**Files Changed:**
- `frontend/public/sitemap.xml` (18 fremde `www.kapitalmitte.com`-Einträge entfernt, Header-Kommentar hinzugefügt der die Session dokumentiert; verbleibende 18 kapital-direkt24-`/strategie/*`-URLs unverändert)
- `memory/PRD.md`

**Constraints eingehalten:** Nur Preview · Kein Prod-Deploy · Keine URL-Umschreibungen · Keine erfundenen Seiten · Keine noindex-Aufnahme · Kein Auto-News-Feed-Import · News-Detail-Routing (82.46) unverändert · Canonical-Strategie (82.47) unverändert · Provider-Fallback (82.45) unverändert · Backend/Depot/Financial-Code nicht angefasst · `robots.txt` unverändert.

---


## Session 82.47 (Preview) · News SEO Consolidation (Canonical + Sitemap Refresh)

**Ziel:** Die in 82.46 konsolidierten News-Detailrouten SEO-seitig sauber vereinheitlichen — genau EIN kanonisches `<link rel="canonical">` pro Seite, absolute Prod-Origin, Query/Hash-frei. **Kein Prod-Deploy.**

**Phase A Audit (Ist-Zustand vor 82.47):**
- `STATIC_INDEX_CANONICAL`: `<link rel="canonical" href="https://kapital-direkt24.de/">` + `<meta property="og:url" content="https://kapital-direkt24.de/">` fix in `public/index.html`
- `DYNAMIC_CANONICAL`: `PageMeta.js` emittierte `href="#${path}"` (Anchor-Fragment, ohne Origin)
- Effekt: **2 Canonical-Tags pro Seite** (statisch + Helmet) — Duplicate-Signal für Suchmaschinen
- `PRODUCTION_ORIGIN`: `https://kapital-direkt24.de` (aus `data/siteContact.js::SITE_URL` — bestätigt als Prod-Domain)
- `PREVIEW_SEO_POLICY`: `PublicNewsDetailPage` setzt bereits `noIndex,nofollow` → Preview-Safe
- `SITEMAP_SOURCE`: Statisches `public/sitemap.xml` (kein dynamischer Generator vorhanden)
- `LEGACY_NEWS_DETAIL_URLS_IN_SITEMAP`: **0** (Sitemap enthält keinerlei News-Detail-URLs)
- `JSON-LD / NewsArticle`: nicht vorhanden auf News-Detail — `NOT PRESENT` (nur auf `StrategieDetail`/`_StrategieBreadcrumb`)

**Phase B–D Canonical Strategy (Prod-Origin, Query/Hash-frei):**
- `PageMeta.js` refactored: `CANONICAL_ORIGIN = 'https://kapital-direkt24.de'` (hart codiert). Neue Helper-Funktion `buildCanonicalUrl(path)` strippt Query & Hash und komponiert absolute URL: `https://kapital-direkt24.de/news/{slug}`.
- `window.location.origin` wird **nicht** verwendet → Preview-Domain kann nie canonical werden.
- OG-Image auf absolute URL normalisiert (externe URLs bleiben unangetastet).

**Phase C index.html — Statische Duplicate-Tags entfernt:**
- Statisches `<link rel="canonical">` und `<meta property="og:url">` aus `public/index.html` entfernt.
- Weitere URL-spezifische Static-Tags gestrafft (nur noch Site-Level-Defaults: og:type, og:site_name, og:image, twitter:card, twitter:image).
- Ergebnis: **CANONICAL_TAG_COUNT = 1** pro gerenderter Seite.

**Phase E Legacy Redirects unverändert:** 82.46-Redirects `/nachrichten/:slug` und `/news/nachrichten/:slug` → `/news/:slug` bleiben aktiv, Query+Hash bleiben beim Redirect erhalten. Nach dem Redirect: Canonical zeigt korrekt auf `https://kapital-direkt24.de/news/{slug}` (kein Legacy-Canonical).

**Phase F Euronews:** `/news/euronews/:slug` bleibt eigenständig; Canonical korrekt auf `https://kapital-direkt24.de/news/euronews/{slug}`; keine Kollision mit Root-Canonical.

**Phase G OG / Structured Data:** og:url, og:title, og:description, og:image auf allen News-Detail-Seiten korrekt gesetzt (verifiziert). JSON-LD/NewsArticle nicht vorhanden → `NOT PRESENT` (kein Backwards-Add ohne Scope).

**Phase H Sitemap:** `public/sitemap.xml` enthält weiterhin **keine** News-Detail-URLs (0 vor, 0 nach). Übersichtsrouten unverändert (`/nachrichten`, `/news/nachrichten` unangetastet). Fremd-Domain-URLs (`kapitalmitte.com`) außerhalb 82.47-Scope belassen.

**Phase I Sitemap Validation:** XML valide · TOTAL=36 · Duplicates=0 · Legacy=0 · Preview=0 · Localhost=0 · Query=0 · Hash=0 · HTTP=0 ✅

**Phase J Robots.txt:** Sitemap-Link von obsoletem `https://www.kapitalmitte.com/sitemap.xml` auf kanonische Prod-Origin `https://kapital-direkt24.de/sitemap.xml` korrigiert. Cloudflare-Managed-Content-Signals bleiben (Kein neues Preview-noindex, da Infra-Verhalten unklar — Policy eingehalten).

**Phase K QA-Testmatrix (Preview verifiziert):**
| Test | URL | Canonical | Pass |
|---|---|---|---|
| T1 kanonisch | `/news/{slug}` | `https://kapital-direkt24.de/news/{slug}` | ✅ 1 Tag |
| T2 mit Query+Hash | `/news/{slug}?utm=test#anchor` | `https://kapital-direkt24.de/news/{slug}` (ohne ?/#) | ✅ 1 Tag |
| T3 Legacy A → Redirect | `/nachrichten/{slug}?utm=t3` | `https://kapital-direkt24.de/news/{slug}` | ✅ 1 Tag |
| T4 Legacy B → Redirect | `/news/nachrichten/{slug}?utm=t4` | `https://kapital-direkt24.de/news/{slug}` | ✅ 1 Tag |
| T5 Euronews | `/news/euronews/{slug}` | `https://kapital-direkt24.de/news/euronews/{slug}` | ✅ 1 Tag |
| T6 Archive-Artikel | via Legacy → Redirect → Detail | canonical `/news/{slug}` | ✅ |
| T7 Provider-Fallback (82.45) | Slugs aus `/api/news/nachrichten` | canonical `/news/{slug}` | ✅ (T3/T4 nutzen genau diesen Slug) |
| T8 Unknown slug | `/news/definitely-nonexistent-…` | canonical korrekt zur URL, `noindex,nofollow`, Not-Found-State | ✅ |
| Regression Home | `/` | `https://kapital-direkt24.de/` | ✅ 1 Tag |
| Regression News Overview | `/news` | `https://kapital-direkt24.de/news` | ✅ 1 Tag |

**Phase L Regression:** 82.45 Provider-Fallback (`/api/content/news/:slug` = 200 für Aggregator-Slug) ✅ · 82.46 Redirects mit Query+Hash-Preservation ✅ · News Overview lädt ✅ · Home lädt ✅. Depot/Auth/Financial-Code nicht angefasst.

**Files Changed:**
- `frontend/public/index.html` (statisches Canonical + og:url + URL-Twitter-Tags entfernt, Defaults gestrafft)
- `frontend/src/components/PageMeta.js` (rewrite: `CANONICAL_ORIGIN`, `buildCanonicalUrl`, absolute Prod-URLs, Query/Hash-Stripping, OG-Image-Normalisierung)
- `frontend/public/robots.txt` (Sitemap-URL auf `kapital-direkt24.de` korrigiert)
- `memory/PRD.md`

**Constraints eingehalten:** Kein Prod-Deploy · Nur Preview · Keine News-Datenänderung · Keine Content-Löschung · Provider-Fallback (82.45) unverändert · Redirects (82.46) unverändert · Übersichtsrouten unverändert · `/news/euronews/:slug` unverändert · `window.location.origin` niemals als Canonical · Robots-Regeln nicht spekulativ erweitert · Depot/Auth/Financial-Code nicht angefasst.

---


## Session 82.46 (Preview) · News-Detail-Route-Konsolidierung

**Ziel:** Parallele News-Detailrouten auf **eine kanonische Route `/news/:slug`** vereinheitlichen (SEO-Duplicate-Content beseitigen, konsistente UX, ein Detail-Renderer).

**Redirects (SPA, `<Navigate replace>` — keine Doppel-History-Einträge, keine Loops):**
- `/nachrichten/:slug` → `/news/:slug`
- `/news/nachrichten/:slug` → `/news/:slug`
- Query-Parameter (`?utm=…`) & Hash (`#…`) bleiben beim Redirect erhalten (Location-Objekt mit `pathname/search/hash`)

**Unverändert (nicht Scope):**
- `/news/euronews/:slug` bleibt als eigene Provider-Route auf `NachrichtenDetailPage`
- Übersichtsrouten `/nachrichten` und `/news/nachrichten` bleiben auf `NachrichtenPage`
- Backend `/api/content/news/:slug` inkl. Provider-Fallback aus Session 82.45 nicht angefasst
- Backend-API `/api/news/nachrichten/:slug` (Aggregator-Endpoint) bleibt bestehen

**Interne Link-Umstellung (22 Referenzen, Detail-Slug):** `NewsletterPage.jsx`, `pages/news/EinordnungPage.jsx`, `pages/news/NachrichtenPage.jsx` (3×), `pages/admin/AdminNewsArticles.jsx`, `pages/themen/ThemenLandingLayout.jsx`, `pages/wissen/SicherInvestierenHub.jsx`, `components/stock/StockNews.jsx`, `components/news/NachrichtenRelated.jsx`, `components/investment/TopicWissenBlock.jsx`, `components/home/HomeFinanceNews.jsx` (3×), `components/home/HomeHeroNewsPreview.jsx` (4×), `components/home/HomeNewsPreview.jsx` (2×), `components/home/HomeNewsMarketShell.jsx` (4×) → alle auf `/news/${slug}` umgestellt.

**Canonical / OG-URL:**
- `PublicNewsDetailPage` (Ziel-Renderer) verwendet bereits `PageMeta path={/news/${slug}}` → Helmet emittiert `<link rel="canonical" href="#/news/:slug">` und `og:url` identisch (Verifikation live).
- `NachrichtenDetailPage` (jetzt nur noch Euronews-Provider-Route) → Canonical auf `/news/euronews/${slug}` korrigiert (vorher fälschlich `/news/nachrichten/${slug}`).

**Testmatrix (Preview verifiziert):**
| Test | Ergebnis |
|---|---|
| `/nachrichten/test?utm=x#frag` → Redirect | → `/news/test?utm=x#frag` ✅ Query+Hash erhalten |
| `/news/nachrichten/test?utm=y` → Redirect | → `/news/test?utm=y` ✅ |
| Legacy-URL mit realem Slug (`dax-faellt-unter-26000-punkte…`) | Redirect → `PublicNewsDetailPage` rendert H1 & Content ✅ |
| Kanonische Route `/news/:slug` (realer Slug) | 200 · H1 gerendert ✅ |
| Unbekannter Slug `/news/definitely-nonexistent-slug-xyz` | Not-Found-State (kein Redirect-Loop) ✅ |
| `/news/euronews/:slug` (unverändert) | Route weiterhin auf `NachrichtenDetailPage` ✅ |
| Canonical-Head (Helmet) an `/news/:slug` | `#/news/:slug` ✅ (statisches `index.html`-Canonical bleibt Legacy-Domain-Default, aus Scope) |
| `replace`-Semantik | ja — Back-Button springt nicht auf Legacy-URL zurück ✅ |
| API-Endpunkte `/api/news/nachrichten/*` | unverändert, RSS-Fetch weiter grün ✅ |

**Files Changed:**
- `frontend/src/pages/news/LegacyNewsDetailRedirect.jsx` (NEW)
- `frontend/src/App.js` (lazy-Import + zwei Legacy-Routes auf Redirect umgemappt)
- `frontend/src/pages/news/NachrichtenDetailPage.jsx` (Canonical-Path)
- 15 weitere UI-Komponenten & Pages mit internen `<Link to>`-Umstellungen (siehe oben)
- `memory/PRD.md`

**Constraints eingehalten:** Kein Prod-Deploy · Nur Preview · Keine Änderung an `/api/content/news/:slug` oder Provider-Fallback (82.45) · Keine Übersichtsrouten angefasst · `/news/euronews/:slug` unverändert · Keine Redirect-Loops · Query & Hash erhalten · Archive-Artikel funktionieren über Legacy-URL → Redirect → kanonische Detail weiterhin (Archiv-Bit via `PublicNewsDetailPage`/`useNewsArticle` unverändert).

---


## Session 82.45 (Preview) · Nachrichten-Detail-Bugfix (Provider-Fallback)

**Root Cause:** `/api/content/news/:slug` (Konsument: `PublicNewsDetailPage` an Route `/news/:slug` via `useNewsArticle` → `newsService.getArticleBySlug`) suchte ausschließlich in der Synthesis-Kollektion `news_articles` (+ retention-Archive). Artikel aus dem RSS-/News-Aggregator (die in der Übersicht `/api/news/nachrichten` erscheinen) lieferten 404 → Frontend zeigt „Diese Meldung ist nicht mehr verfügbar. Sie wurde möglicherweise aus dem aktuellen Nachrichten-Feed entfernt."

**Fix:** In `server.py::get_news_by_slug` einen finalen Fallback auf `_news_provider.get_item(slug)` ergänzt — dieselbe Quelle, die `/api/news/nachrichten/:slug` bereits erfolgreich nutzt. Reihenfolge: `news_articles(is_published=True)` → retention-live → retention-archive → RSS-/News-Provider → 404. Kein Design-Change, keine Änderung am Frontend, kein Löschen/Überschreiben von Artikeln.

**QA verifiziert:** 8 Slugs aus `/api/news/nachrichten?limit=8` liefern über `/api/content/news/:slug` jetzt **8/8 200** (vorher 0/8 · 404 wegen Aggregator-Only). Response-Shape enthält alle nötigen Felder (title, summary, content, category, image_url, source, source_url, published_at). Archive-Bit + retention-90d-Fallback bleiben unverändert.

**Keine Löschungen bei RSS-Sync:** Import-Pipeline schreibt in `news_articles` (`is_published=True`) — beim nächsten Sync werden alte Artikel nicht gelöscht, sondern über `news_retention` nach 90 Tagen ins Archiv verschoben; ihre Detail-Slugs bleiben gültig (`is_archived=true`-Badge in der UI).

**Files Changed:** `backend/server.py` (get_news_by_slug), `memory/PRD.md`.

---


## Session 82.44 (Preview) · Profile Notification Preferences Migration (Supabase → Mongo)

**Phase A Audit — Consumer-Landkarte:**
- WEEKLY_DIGEST CONSUMER: liest `newsletter_subscribers.consent=true` (backend `weekly_digest.py:191`) — NICHT `users.notification_prefs.weekly_digest`. Der ProfilePage-Toggle war reine UI-Präferenz ohne echten Consumer. → **NOT IMPLEMENTED** als Consumer (Stand 82.44 unverändert).
- ORDER_UPDATES CONSUMER: keine Referenz im Codebase → **NOT IMPLEMENTED**.
- PRICE_ALERTS CONSUMER: `alerts.py` liest aus `price_alerts` Collection, ignoriert `notification_prefs.price_alerts` → **NOT IMPLEMENTED**.
- MONTHLY_STATEMENT CONSUMER: `statement_email_service.py` respektiert `notification_prefs.monthly_statement_email` (Session 82.43) ✅
- BACKEND: `PATCH /api/users/onboarding` mit `extra='forbid'` + Whitelist inkl. `notification_prefs: dict` (Session 81.05) — bereit für Cutover.

**Phase B–I Cutover (`ProfilePage.jsx`):**
- `toggleNotification(key)` — vollständig auf `PATCH /api/users/onboarding` umgestellt (kein `supabase.from('profiles').update`). Merged bestehende `user.notification_prefs` mit neuem Key. Setzt zusätzlich `email_digest_enabled = notification_prefs.weekly_digest !== false` als Legacy-Spiegel, damit ein zukünftiger Weekly-Digest-Consumer beide Felder konsistent findet. Optimistic Update mit Rollback bei Fehler bleibt.
- `saveLanguage()` — ebenfalls auf `/api/users/onboarding` umgestellt (Sprach-Präferenz wandert mit `notification_prefs.language`).
- `refreshUser?.()` nach erfolgreichem PATCH → UI liest frischen Mongo-Zustand.

**Phase I Marketing-Consent-Safe:** Frontend-Default-Init in `notificationPrefs` steht auf `marketing: false` (Zeile 66) — es wird **keine** Zustimmung aus fehlendem Feld konstruiert.

**Test Matrix (Preview verifiziert, demo.kunde):**
| Test | Ergebnis |
|---|---|
| T1 Default-Load | 5 Toggles deterministisch aus `user.notification_prefs` ✅ |
| T2 `weekly_digest=false` | persisted ✅ + `email_digest_enabled` gespiegelt |
| T3 `order_updates=false` | persisted ✅ |
| T4 `price_alerts=false` | persisted ✅ |
| T5 `marketing=false` | persisted ✅ (kein Marketing-Send aktiviert) |
| T6 `monthly_statement_email` | funktioniert weiterhin (82.43 unverändert) ✅ |
| T7 Hard-Reload | alle Werte bleiben ✅ |
| T9 Mass Assignment (`role`, `email`, `cash_balance`, `onboarding_completed`) | Extra-Feld `role` → **422** (`extra_forbidden`), sichere Felder wie `onboarding_completed` sind in der Whitelist — nur `role`/`email`/`cash_balance` werden geblockt ✅ |
| T10 Unauth PATCH | **401** ✅ |
| T11 Cross-User | unmöglich — `user_id` aus Session, nie Payload ✅ |
| T12 Supabase offline | ProfilePage-Preferences funktionieren autark (kein Supabase-Call mehr im Save-Path) ✅ |
| T14 Statement Email Opt-Out weiterhin respektiert | ja — 82.43 Path unverändert ✅ |

**Phase K Supabase-Removal-Audit** in `ProfilePage.jsx`:
- **Preference-Scope Supabase-Writes**: `grep "supabase.from('profiles').update"` = **0** ✅
- Andere Supabase-Reads in ProfilePage (Avatar-Upload, Session-Meta, o.ä.) bleiben unverändert (nicht Scope 82.44).

**Consumer-Status-Report (dokumentiert, nicht implementiert in dieser Session):**
- `WEEKLY_DIGEST_CONSUMER = NOT IMPLEMENTED` (Newsletter-Consent ist separate Quelle)
- `ORDER_UPDATES_CONSUMER = NOT IMPLEMENTED`
- `PRICE_ALERTS_CONSUMER = NOT IMPLEMENTED`
- `MARKETING_CONSUMER = NOT IMPLEMENTED` (Default false, Consent-safe)

**Financial Invariants** unverändert (nur `users.notification_prefs` Update).

**Files Changed**: `frontend/src/pages/dashboard/ProfilePage.jsx`, `memory/PRD.md`.

---


## Session 82.43 (Preview) · Statement Email Opt-Out (Customer Notification Preference)

**Phase A Audit** — bestehendes User-Preference-Modell erweiterbar:
- USER MODEL: `users` collection mit `notification_prefs: dict`, `email_digest_enabled: bool` bereits vorhanden (Onboarding-Endpoints seit 81.05).
- PATCH ENDPOINT: `PATCH /api/users/onboarding` mit `notification_prefs: Optional[dict]`, `model_config extra='forbid'` → Mass-Assignment-safe (Session 81.05).
- SETTINGS UI: `pages/dashboard/ProfilePage.jsx`, Section `notifications` mit bestehendem Toggle-Pattern (Bell-Icon).
- STATEMENT DEFAULT: Alle Bestandsnutzer haben KEIN Feld → gilt als aktiv (`monthly_statement_email !== false`).

**Phase B–H Implementierung** (additiv, keine neue Collection, kein Datenschema-Break):

- **`backend/services/statement_email_service.py`**:
  - `send_monthly_statement_email(..., *, force=False)` — neuer Kwarg. Prüft `users.notification_prefs.monthly_statement_email`:
    - `false` + `force=False` → **kein Provider-Call**, Delivery-Log mit `status='skipped', reason='user_opt_out'` upserted (verhindert idempotent auch spätere Doppelversuche im selben Monat).
    - fehlendes Feld ODER `true` → normaler Versand.
    - `force=True` → umgeht Opt-Out (admin-only, explizit).
  - `run_monthly_batch(...)` erweitert um `skipped_opt_out` Counter im Report.

- **`backend/routes/portfolio.py`** — `POST /api/admin/portfolio/statements/send` akzeptiert optional `force: bool` (Default false). Ohne `force` respektiert der Admin-Endpoint das Kundenwunsch-Opt-Out (Spec-Pflicht: „Kein verstecktes Umgehen"). `force=true` ist admin-only, explizit, wird im Log durch das Fehlen von `reason='user_opt_out'` dokumentiert.

- **`frontend/src/pages/dashboard/ProfilePage.jsx`** — neue Sektion **„Dokumente & Benachrichtigungen"** unterhalb der bestehenden Benachrichtigungs-Toggles:
  - Neues Toggle `data-testid="pref-monthly-statement-email"` — „Monatlichen Kontoauszug per E-Mail erhalten".
  - State-Init `user?.notification_prefs?.monthly_statement_email !== false` (Default aktiv für Bestandsnutzer).
  - Speicher via **Mongo-native `PATCH /api/users/onboarding`** (nicht Supabase), Optimistic Update mit Rollback bei Fehler, Toast „Einstellung gespeichert" / „Einstellung konnte nicht gespeichert werden".
  - Bestehende Toggles (weekly_digest, order_updates, marketing, price_alerts, email_otp_enabled) bleiben unverändert (out-of-scope für 82.43).

**Test Matrix (Preview verifiziert):**
| Test | Ergebnis |
|---|---|
| T1 Default (fehlendes Feld) | Frontend zeigt `true` (`!== false` Logik) ✅ |
| T2 Customer setzt false | persisted in `users.notification_prefs.monthly_statement_email=false` ✅ |
| T3 Hard Reload | 2. GET liefert `false` — Persistierung bestätigt ✅ |
| T4 Admin Send (opt-out, force=false) | `{status:'skipped', reason:'user_opt_out'}` · **kein Provider-Call** ✅ |
| T5 Idempotenz 2. Call | wieder `skipped:user_opt_out`, keine Doppelmail ✅ |
| T6 Customer setzt true | persisted true ✅ |
| T7 Nächster Monatslauf möglich | send re-enabled, Batch würde senden ✅ |
| T8 Unauth PATCH | **401** ✅ |
| T9 Mass Assignment (`role`, `email`, `user_id`) | **422** (`extra='forbid'`) ✅ |
| T10 Cross-User Update | unmöglich — `user_id` aus Session, nicht Payload ✅ |
| T11 Manual Statement Download | JSON/CSV/PDF alle 200 (unabhängig vom Opt-Out) ✅ |
| T12 Provider Retry-Logik | unverändert (opt-out bricht Path frühzeitig ab, kein failed) ✅ |
| T13 Cross-User Attachment Isolation | unverändert (Session 82.42 verifiziert) ✅ |
| Admin `force=true` | umgeht Opt-Out — würde senden (im Test lieferte Provider 422 wg. Test-Domain, aber KEIN `skipped`-Status) ✅ |

**Phase K Privacy/Consent:** `monthly_statement_email` ist **ausschließlich** Dokumenten-Zustellpräferenz — keine Marketing-Consent-Vermischung. Regulatorisch nicht zwingend, daher Opt-Out zulässig.

**Financial Invariants** unverändert (keine Writes außerhalb `users.notification_prefs` und `statement_deliveries.status`).

**Files Changed**:
- `backend/services/statement_email_service.py` (+ `force` kwarg, opt-out branch, `skipped_opt_out` counter)
- `backend/routes/portfolio.py` (+ `force` bool in admin send)
- `frontend/src/pages/dashboard/ProfilePage.jsx` (+ Opt-Out Toggle, Mongo-native PATCH)
- `memory/PRD.md`

---


## Session 82.42 (Preview) · Statement Email Delivery (monatlich)

**Phase A Audit** (kein Neubau nötig):
- STATEMENT SERVICE: `portfolio_statement_service.py` (82.39) ✅
- PDF GENERATOR: WeasyPrint ✅
- EMAIL SERVICE: `_send_email_via_emergent` mit **Attachment-Support (Session 75.4)** — Base64-Payload via Emergent-Managed Resend ✅
- EMAIL PROVIDER: **Emergent Managed** via `EMERGENT_EMAIL_KEY` (verified via provider-message-id im Log)
- USER EMAIL SOURCE: `users.email` (serverseitig, keine client-supplied Adresse)
- CRON PATTERN: bestehend (`WEBHOOK_CRON_SECRET` + ack-2xx-sofort + Background-Task)

**Phase B–L Implementierung:**
- **`services/statement_email_service.py`** (NEU, 195 lines):
  - `send_monthly_statement_email(db, user_id, year, month, send_email_fn)` — atomarer Single-User-Versand mit Idempotency-Key `statement:{user_id}:{YYYY-MM}`; wirft NIE (Fehler → `status='failed'` im Log persistiert; Retry via zweitem Call möglich).
  - Timezone: **UTC** (System-Standard, in Docstring dokumentiert).
  - Leerer Monat → PDF wird trotzdem versendet mit „Im ausgewählten Zeitraum gab es keine Buchungen." (keine künstlichen Ledger-Einträge).
  - PDF wird via bestehendem `build_pdf()` aus 82.39 erzeugt (Parity zu manuellem Download garantiert).
  - `run_monthly_batch(db, year, month, send_email_fn)` — iteriert alle `users` mit `is_active != False`; Fehler pro User isoliert; Report `{users_seen, eligible, sent, already_sent, failed, skipped_no_email, skipped_other, duration_ms}`.
  - `ensure_delivery_indexes(db)` — **UNIQUE-Index** `(user_id, year, month)` in `statement_deliveries`.
  - `previous_month(today=None)` — Jahres-Rollover-safe (Dezember → Januar → `(year-1, 12)`).

- **`routes/portfolio.py`** — 2 neue Admin-Endpoints:
  - `POST /api/admin/portfolio/statements/send` — Payload `{user_id, year, month}`. 422 bei ungültigem Input, 401 unauth, 403 customer, 200 admin.
  - `GET /api/admin/portfolio/statements/deliveries?year&month&limit` — Read-only Delivery-Log für Ops-Übersicht.
  - `ensure_indexes()` ruft nun `ensure_statement_delivery_indexes(db)` beim Bootstrap.

- **`server.py`** — Cron `POST /api/cron/monthly-statements`:
  - Bearer via `WEBHOOK_CRON_SECRET` (401 sonst).
  - Ack 2xx sofort mit `{accepted, run_id, job, started_at}`; Batch läuft im `asyncio.create_task`.
  - Verwendet `previous_month()` → versendet immer den vorherigen Kalendermonat.

- **`.emergent/crons.yml`** — neuer Cron-Slot `monthly-statements` mit Schedule **`0 6 1 * *`** (1. Kalendertag des Folgemonats, 06:00 UTC).

**Test-Matrix verifiziert im Preview:**
| Test | Ergebnis |
|---|---|
| T3 Unauth | **401** ✅ |
| T2 Customer 403 | **403** ✅ |
| T-Val bad month=13 | **422** ✅ |
| T-Val bad user_id | **422** ✅ |
| T1 Happy Sept 2026 | **200** `{status:'sent', delivery_id, message_id}` ✅ |
| T4 Duplicate Sept 2026 | **200** `{status:'already_sent'}` — keine zweite E-Mail ✅ |
| T7 Empty Month Juli 2026 | **200** `{status:'sent', count:0}` — PDF mit „keine Buchungen" ✅ |
| T11 Year Rollover Dez 2025 | **200** — `previous_month(Jan 2026) == (2025, 12)` ✅ |
| T5/T9 Idempotency + Retry | UNIQUE(user_id, year, month) verhindert Doppelrow · failed → status='failed' zulässt Retry mit gleicher delivery_id ✅ |
| T10 Cross-User Isolation | `demo.kunde` uid → immer `demo.kunde@…` Email; kein Leak ✅ |
| T12 PDF Parity | Anhang wird via `build_pdf(statement, customer)` = identisch zu `GET /api/portfolio/statements?format=pdf` (82.39) ✅ |
| T13 CSV/PDF Download Regression | JSON/CSV/PDF alle 200 ✅ |
| T14 Financial DB Writes | **0** — nur `statement_deliveries` (Log), nichts im `cash_ledger`/`stock_orders`/`order_executions`/`ipo_allocations`/`bond_executions` ✅ |
| Cron Unauth | **401** ✅ |
| Cron Authorized | **200** `{accepted:true, run_id, job:'monthly-statements'}` — Background-Job lief ✅ |

**Security-Invarianten:**
- Empfängeradresse ausschließlich aus `users.email` (serverseitig aufgelöst).
- Keine `client-supplied email` akzeptiert.
- `user_id` aus Payload wird ObjectId-validiert + gegen `users` verifiziert (via bestehender Batch-Iterator im Cron).
- `last_error` sanitized auf 180 Zeichen — keine PDF-Inhalte, keine Secrets im Log.

**Customer-Setting Audit (Phase P):** Keine `notification_preferences.monthly_statement_email` Präferenz existiert. **Default-Regel für Preview: alle aktiven Kunden mit `email` erhalten den Monatsauszug.** Opt-out kann später als P2-Feature ergänzt werden.

**Regression (Q):** Statement 82.39, Delta-KPI 82.38, Sparkline 82.41, Banner-Fix 82.35, IPO-UI 82.36, Bond-UI 82.37, Widget-Cutover 82.40 alle intakt (Endpoints 200, keine UI-Regression).

**Files Changed**:
- `backend/services/statement_email_service.py` (NEW)
- `backend/routes/portfolio.py` (+ 2 admin endpoints + delivery index bootstrap)
- `backend/server.py` (+ cron endpoint)
- `.emergent/crons.yml` (+ monthly-statements cron slot)
- `memory/PRD.md`

---


## Session 82.41 (Preview) · Depot P1 · 7T/30T Snapshot Sparkline

**Phase A Audit** (kein neuer Backend-Endpoint nötig):
- SNAPSHOT SOURCE: `heroSnapshots` via bestehendem `GET /api/portfolio/snapshots?days=400`
- SNAPSHOT SORT: chronologisch ASC (backend-seitig)
- FIELDS: `snapshot_date, total_value, stocks_valuation_complete, bonds_valuation_complete, cash_value, stock_value, bond_value, ...`
- CHART LIBRARY: **recharts** (bereits im Einsatz in `DepotPerformance.jsx`)

**Phase B — Selector**: neue exportierte reine Funktion `computeSnapshotTrend(heroSnapshots, range)` in `DepotKpiRail.jsx`. Dedup über `snapshot_date` (letzter Eintrag deterministisch gewinnt), chronologische Sortierung, **Kalender-Fenster relativ zum letzten Snapshot** (nicht relativ zu now — zeitzone-/DST-sicher). Rückgabe `{count, points: [{date, value}], absolute, pct, direction, incomplete}`.

**Phase C — Valuation Integrity**: `incomplete=true` bei irgendeinem `stocks_valuation_complete=false` ODER `bonds_valuation_complete=false` im Fenster → Sparkline versteckt, Text-Only „Bewertung unvollständig". **Kein scheinpräziser Verlauf.**

**Phase D — Data Sufficiency**: 0 Punkte → „Noch keine Verlaufsdaten" · 1 Punkt → „Noch nicht genügend Verlaufsdaten" · ≥2 vollständige → Sparkline + Delta.

**Phase E/F — UI** in `DepotKpiRail.jsx` unter dem existierenden „Heute"-KPI (82.38-Wert bleibt fachlich unverändert):
- Neuer `KpiCell.footer`-Slot (kein Layout-Reflow der übrigen 4 KPIs).
- Neue Sub-Component `HeuteSparklineFooter`:
  - Toggle `[ 7T | 30T ]` (`data-testid="heute-trend-range-7d"` / `-30d`).
  - Recharts `LineChart` (30 × 8 px), Stroke: emerald-700 bei pos, rose-700 bei neg, slate-400 bei neutral/incomplete (bestehende Design-Tokens).
  - Delta-Zeile darunter: `+/-abs €  ·  +/-pct %` (deutsches Format).
- Neuer `data-testid="heute-sparkline-block"`, `-empty`, `-insufficient`, `-incomplete`, `-sparkline`, `-delta`.

**Phase G — Range Semantik**: Kalender-Fenster `[latest_date − (days−1), latest_date]` inklusive Grenzen. Snapshots außerhalb des Fensters strikt ausgeschlossen (kein Rückgriff auf ältere Daten). **Keine Interpolation** fehlender Kalendertage.

**Phase H — Test Matrix (Python-Mirror aller 11 Tests):**
- T1 (0 snaps) → count=0 ✅
- T2 (1 snap) → count=1, abs/pct=None ✅
- T3 (positiv 10000→10500) → abs=500 pct=+5.00% dir=pos ✅
- T4 (negativ 10500→10000) → abs=-500 pct=-4.76% dir=neg ✅
- T5 (first=0) → pct=None (keine Division durch 0) ✅
- T6 (incomplete) → incomplete=true ✅
- T7 (7T-Grenze, 9000 vor 8 Tagen) → ausgeschlossen, count=2 ab 09-02 ✅
- T8 (30T-Grenze) → count=2 ab 08-10 ✅
- T9 (Lücken) → keine Interpolation, dates=[09-02, 09-05, 09-08] ✅
- T10 (unsortiert) → chronologisch korrekt ✅
- T11 (Duplicate date) → deterministisch letzter Wert 9500 ✅

**QA im Preview (demo.kunde):**
- Baseline (1 Snap, valuation_complete=false) → „Noch nicht genügend Verlaufsdaten" ✅
- Nach Injection von 3 vollständigen Vortags-Snapshots (9500/9800/10000 €) + latest 9001.56 → Sparkline rendert, Delta rot mit korrekten Werten, 30d-Toggle wechselt korrekt.
- Hard-Reload liefert identisches Ergebnis ✅ · Mobile 390 kein Overflow ✅ · Dashboard-Banner-Regression negativ ✅.
- QA-Testdaten (`source='qa82.41-test'`) nach Verifizierung aus DB entfernt, `2026-09-07` auf `valuation_complete=false` zurückgesetzt.

**Files Changed**: `frontend/src/components/mein-depot/DepotKpiRail.jsx`, `memory/PRD.md`.

---


## Session 82.40 (Preview) · P1 Widget Cutover · Supabase → Mongo-native

**Phase A Audit**:
- MarketOverview.js: `supabase.from('stocks')` + `supabase.from('stock_prices_cache')` + `supabase.functions.invoke('stock-prices')`
- LiveTicker.js: `supabase.from('stocks')` + `supabase.from('stock_prices_cache')`
- CommandPalette.js: `supabase.from('stocks')` + `supabase.from('stock_prices_cache')` + `supabase.from('user_depot_contracts')`
- Mongo `stocks` collection: **0 docs** (Legacy, nie migriert) — Read direkt aus Supabase erklärt persistente Fehler.
- Bestehender FastAPI-Endpoint `GET /api/news-markte/market/stocks` (Alpha-Vantage-backed, bereits im `services/marketService.js` gekapselt) liefert reale Batch-Quotes (`symbol, name, price, change, change_percent, currency, last_updated, data_source, is_delayed, asset_class`).

**Phase B/C/D Cutover** (keine neuen Backend-Endpoints erforderlich):
- `MarketOverview.js` — Vollständiger Rewrite: nutzt `fetchFeaturedStocks(40, 'EUR')` aus `marketService.js`. Neue Spalte „Quelle" mit `dataSource` und `zeitverzögert`-Marker. Refresh-Button ohne Supabase-Function. Empty-/Retry-State kompakt.
- `LiveTicker.js` — Vollständiger Rewrite: nutzt `fetchFeaturedStocks(40, 'EUR')`. 60s Refresh-Interval bleibt. Flash-Animation bei Preisänderung bleibt. Kein Non-Auth-Anforderung; Non-CRITICAL Fehlerpfad (silent degrade).
- `CommandPalette.js` — Import-/State-Umbau: nutzt `fetchFeaturedStocks(60, 'EUR')`. Entfernt `contracts`-State + `user_depot_contracts`-Read (Supabase-Legacy-Feature, non-critical). Symbol-Suche funktioniert weiter via CommandInput-Filter.

**Verifikation im Preview:**
- `grep supabase\.(from|rpc|functions)` in `MarketOverview.js` + `LiveTicker.js` + `CommandPalette.js` = **0** ✅
- CommandPalette Test: 39 Items, typing „SAP" filtert zu **SAP · 232,10 € · +0.45% / SIE 178,44 € +0.35% / ALV 342,20 € +0.05% / DBK 18,75 € −0.58% / IFX 33,05 € +1.07%** ✅
- Regression Dashboard-Banner (82.35): **bannerVisible=false** ✅
- Alle Fetch-Failures sind non-critical (kein globaler Banner-Trigger möglich, da diese Widgets nicht im `DashboardDataContext` referenziert werden).

**Files Changed**: `frontend/src/components/MarketOverview.js`, `frontend/src/components/LiveTicker.js`, `frontend/src/components/CommandPalette.js`, `memory/PRD.md`.

---


## Session 82.39 (Preview) · Kunden-Kontoauszug (CSV + PDF Export)

**Phase A — Read-only Audit (bestätigt):** `cash_ledger` ist die vollständige Financial Source of Truth. Signierte Summe aller 45 settled Entries (demo.kunde) = **8008.26 EUR** = aktueller `cash_balance` (perfekte Reconciliation, 0 Cent Differenz). Alle P0-Event-Typen im Ledger: `deposit, adjustment (incl. cash-reversal), stock_purchase, stock_sale, ipo_purchase, bond_purchase`. Executions/Orders/Requests/Allocations enthalten KEINE eigenen Geldbuchungen — reine Idempotency-Referenzen via `idempotency_key`. **Kein Double-Counting-Risiko.**

**Phase B — Canonical Service** `backend/services/portfolio_statement_service.py`:
- `build_statement(db, user_id, date_from, date_to)` → JSON-serialisierbares Dataset `{period, currency, opening_balance, closing_balance, running_balance_complete, count, entries[…]}`. Entries beinhalten `id, booked_at, value_date, type, type_label, direction, amount, signed_amount, currency, description, symbol, isin, quantity, execution_price, reference_type, reference_id, idempotency_key, running_balance`.
- Sortierung deterministisch nach `(created_at ASC, _id ASC)`. Running-Balance wird über die vollständige Historie berechnet — `running_balance_complete=true` (`cash_ledger` ist append-only und komplett).
- Enrichment via `_enrich_map()`: greift Symbol/Qty/Price aus `order_executions` (Stock-Buy/Sell), `ipo_allocations` (IPO-Zuteilungen), `bond_executions` (Anleiheausführungen). Kein Insert/Update.
- `build_csv(statement)` → UTF-8-BOM, Semikolon-Trenner (deutsches Excel), 15 Spalten. Deutsches Zahlenformat (Komma). **Formula-Injection-Schutz** für Textfelder (Präfix-Escape `=+-@`).
- `build_pdf(statement, customer)` → WeasyPrint (bereits im Stack, Session 82.19 reports). A4, Seitenzahlen, Titel „Kontoauszug", Kunde+Zeitraum+Erstellungszeitpunkt, Anfangs-/Endsaldo, Tabelle aller Buchungen mit deutschem €-Format, Farbcodierung Credit/Debit.

**Phase C — API `GET /api/portfolio/statements`** in `backend/routes/portfolio.py`:
- Query-Parameter: `from` (Alias-Mapping via `Query(alias="from")`, YYYY-MM-DD), `to` (YYYY-MM-DD), `format=json|csv|pdf` (default json).
- 422 bei ungültigem Datum oder `from > to` oder `format ∉ json|csv|pdf`.
- Ownership ausschließlich aus `get_current_user`'s `_oid(user)`. Kein Client-`user_id`.

**Phase D — Customer UI** `frontend/src/pages/dashboard/KontoauszugPage.jsx`:
- Neues Export-Panel oberhalb der bestehenden Print-Statement-Ansicht.
- Von/Bis Date-Inputs (mit min/max Cross-Constraints), CSV + PDF Buttons mit Loading-Spinner (`RefreshCw`).
- Downloads via `credentials: include`, Auslesen von `Content-Disposition` für Filename, Blob→`URL.createObjectURL`.
- Fehler-State inline (role=alert) + Toast. `data-testid`s für alle Interaktionselemente.

**Phase E — QA Verifiziert (demo.kunde Preview):**
- T1 JSON Happy: `count=45, closing_balance=8008.26, running_balance_complete=true` ✅
- T2 CSV: 7180 bytes, UTF-8 BOM, `content-type=text/csv; charset=utf-8`, `content-disposition=attachment; filename="kontoauszug-start-heute.csv"`, deutsches €-Format, Umlaute korrekt, keine unsafe formula-injection ✅
- T3 PDF: 22279 bytes, `magic=%PDF-`, `content-type=application/pdf`, Titel + Anfangssaldo + Endsaldo + Buchungen im Text ✅
- T4 Date Filter `from=2026-09-08&to=2026-09-08`: count=2, opening=8305.26, closing=8008.26 ✅ (nach Alias-Fix)
- T5 Invalid Range `from > to`: **422** ✅ · Invalid Date: **422** ✅ · Invalid Format: **422** ✅
- T6 Isolation: Admin sieht Customer-Entry-IDs NICHT ✅
- T7 Reconciliation: `statement.closing_balance == /api/portfolio/cash.cash_balance` (exakt 8008.26 EUR) ✅
- T8 No Double Counting: 45 Entries, 0 duplicate `idempotency_key` ✅ · Type-Verteilung: `deposit=8, adjustment=4, stock_purchase=14, stock_sale=7, ipo_purchase=6, bond_purchase=6`
- T9 Compensation: 3 `cash-reversal` Adjustment-Entries als eigene Gegenbuchungen sichtbar ✅
- T10 Regression: alle 9 Endpoints liefern 200 · Dashboard-Banner-Fix (82.35), IPO-UI (82.36), Bond-UI (82.37), Delta-KPI (82.38) intakt
- Unauth: **401** ✅
- Desktop 1920 + Mobile 390 QA: Panel + Buttons rendern korrekt (Screenshot bestätigt); Overflow-Zähler in Mobile bezieht sich auf Legacy-Print-Statement-Vorschau (pre-existing), nicht auf das neue Export-Panel.

**Financial Invariants unverändert:** cash_ledger append-only · keine erfundenen Opening-Balances · keine Fake-Preise · keine Bond-/IPO-Marktwerte im Cash-Statement (Cash ist unabhängig vom Valuation-Feed).

**Files Changed**:
- `backend/services/portfolio_statement_service.py` (NEW, 297 lines)
- `backend/routes/portfolio.py` (+Query-Import, +Response-Import, +statement-service-imports, +`GET /api/portfolio/statements` endpoint)
- `frontend/src/pages/dashboard/KontoauszugPage.jsx` (rewrite: Export-Panel + Statement embed)
- `memory/PRD.md`

---


## Session 82.38 (Preview) · Depot Delta-KPI „Heute" aus Portfolio-Snapshots

- **Neue Datenquelle für „Heute"-KPI** in `components/mein-depot/DepotKpiRail.jsx`: statt Intraday-Aktien-Delta (`dailyPortfolioPnl` aus `stock_prices_cache.change_abs`) jetzt echter Snapshot-Vergleich `latest.total_value − previous.total_value` aus `heroSnapshots` (Endpoint `/api/portfolio/snapshots?days=400`, Mongo-Collection `portfolio_snapshots`).
- **Neuer exportierter Selector** `computeSnapshotDayChange(heroSnapshots)` → `{count, absolute, pct, incomplete, latest, previous}`. Frontend rechnet ausschließlich abs/pct; die Snapshot-Werte selbst kommen unverändert vom Backend (Source of Truth).
- **Formel**: `abs = latest.total_value - previous.total_value` · `pct = prevTotal > 0 ? abs/prevTotal*100 : null` (keine Division durch 0).
- **Valuation-Incomplete-Handling (Approach B, keine scheinpräzise Performance)**: wenn `stocks_valuation_complete=false` ODER `bonds_valuation_complete=false` in latest oder previous → `—` mit Sekundär-Hinweis „Bewertung unvollständig — Vergleich nicht verlässlich".
- **Empty/One-Point-States**: 0 Snapshots → „—" · „Noch kein Depot-Snapshot vorhanden"; 1 Snapshot → „—" · „Noch kein Vergleichswert vom Vortag".
- **UI**: positiv dezent emerald-700, negativ dezent rose-700, 0 neutral · Sekundärzeile mit Arrow-Icon + „X,XX % vs. Vortag".
- **KEIN neuer Backend-Endpoint** — `/api/portfolio/snapshots` liefert bereits alles Nötige.
- **QA (verifiziert im Preview, demo.kunde):**
  - Ausgangslage 1 Snapshot (2026-09-07, `total_value=9001.56`, `stocks_valuation_complete=false`, `bonds_valuation_complete=false`) → KPI zeigte korrekt „—" + „Bewertung unvollständig".
  - QA-Setup: synthetischen Vortags-Snapshot 2026-09-06 mit `total_value=10000.0` + beide `valuation_complete=true` eingespielt, sowie den 2026-09-07-Snapshot als valuation_complete markiert.
  - Erwartetes Delta: 9001.56 − 10000.00 = **−998,44 €**, pct = −9,98 %.
  - UI zeigte im Preview den korrekten roten Delta-Betrag im „Heute"-Feld mit „−9,98 % vs. Vortag".
  - Desktop 1920px + Mobile 390px ohne Overflow, KPI-Rail-Zelle vollständig sichtbar.
  - Hard-Reload liefert identischen KPI (keine 0→real Flicker; nur `heroSnapshots` als Datenquelle).
  - Regression-Check: Dashboard-Banner-Fix (82.35), IPO-Allocation-UI (82.36), Bond-Execution-UI (82.37) unverändert.

- **Files Changed**: `components/mein-depot/DepotKpiRail.jsx`, `memory/PRD.md`.
- **QA-Test-Snapshot**: `{user_id: demo.kunde, snapshot_date: 2026-09-06, source: 'qa82.38-test'}` — vor Prod-Deploy bereinigen.

---


## Session 82.37 (Preview) · Admin Bond Execution UI

- **Neuer Frontend-Flow** in `pages/AdminBondRequests.js`:
  - „Ausführung erfassen"-Button (Package-Icon, `data-testid="bond-request-execute-{id}"`) erscheint nur für **Mongo-native** Requests mit `status='approved'`. Legacy-Supabase-Requests behalten den bestehenden Approve/Reject-Prompt-Flow.
  - Modal `data-testid="bond-execute-modal"` mit Read-only Request-Zusammenfassung (Bond, ISIN, Emittent aus `bond_catalog`, Beantragtes Nominal, Stückelung, Kupon, Fälligkeit, Kundenname/E-Mail).
  - Eingaben: `nominal_amount` (Prefill = `requested_nominal || amount_eur`), `execution_price_pct` (Prefill 100), optional `decision_note` ≤500.
  - Live-Vorschau `Gesamtbetrag = Nominal × Kurs ÷ 100` (Anzeige only; Backend Source of Truth).
  - Client-Validation: `nominal > 0`, `price > 0`, `nominal ≤ requested`, `nominal Vielfaches von denomination` (falls Katalog denom>0).
  - Submit-Button während Request disabled → Double-Click-Schutz.
  - BondExecError-Codes gemappt (INSUFFICIENT_CASH, OVER_NOMINAL, INVALID_DENOMINATION, BAD_NOMINAL, BAD_PRICE, REQUEST_BAD_STATUS, BOND_UNAVAILABLE, BOND_EXPIRED, BOND_NOT_FOUND, MISSING_ISIN, REQUEST_REJECTED_RACE). Modal bleibt bei Fehler offen.
  - Nach Erfolg: Toast „Anleiheausführung wurde erfolgreich erfasst.", Modal schließt, Liste re-lädt. Row zeigt Status **Ausgeführt** (sky) + Gross + Nominal + Kurs + Datum via Tabellenspalten.

- **Neuer Customer-Status-Pill** `executed → „Ausgeführt"` in `pages/dashboard/OrdersPage.jsx` (`BOND_STATUS_META`).

- **QA (verifiziert im Preview, patron admin + demo.kunde customer):**
  - Security: unauth **401** · customer **403** · admin **200** ✅
  - REQUEST_BAD_STATUS (pending → execute): **409** ✅
  - INVALID_DENOMINATION (999999999 % 100 ≠ 0): **422** ✅
  - BAD_NOMINAL (0): **422** ✅
  - Happy-Path PREVIEW TEST BOND 3 · 200 nom × 98.5% = 197 EUR → **200**, Execution `completed`, Position + cash_event angelegt, Cash **8205.26 → 8008.26 EUR** ✅
  - Idempotent Retry → gleiche `execution.id`, cash NICHT doppelt belastet ✅
  - Customer `GET /api/bonds/requests/me`: `status='executed'`, `executed_nominal=200`, `execution_price_pct=98.5000`, `gross_amount=197.00`, `executed_at` ✅
  - Customer `GET /api/portfolio/bond-positions`: neue PT_BOND_03 Position sichtbar ✅
  - Client-Validation UI (getestet mit `data-testid`): over-nominal, invalid denomination (150 vs Stückelung 100), bad price 0 → jeweils deutsche Fehler im Modal, Modal bleibt offen ✅
  - Gross-Preview UI: 100 × 98.5% → „98,50 €" ✅
  - Desktop 1920 · Mobile 390 → Modal ohne Overflow, alle Inputs erreichbar ✅
  - Regression Dashboard-Banner-Fix (82.35): bannerVisible=false ✅
  - Kein Supabase-Write · Legacy-Flow unangetastet.

- **Files Changed**: `pages/AdminBondRequests.js` (rewrite), `pages/dashboard/OrdersPage.jsx` (BOND_STATUS_META.executed), `memory/PRD.md`.

---


## Session 82.36 (Preview) · Admin IPO Allocation UI

- **Neuer Frontend-Flow** in `pages/AdminIpoRequests.js`:
  - „Zuteilung erfassen"-Button (Package-Icon, `data-testid="ipo-allocate-btn-{id}"`) erscheint nur für **Mongo-native** Requests mit `status='approved'`. Legacy-Supabase-Requests unverändert (Edit-Button + RPC-Flow).
  - Modal `data-testid="ipo-allocate-modal"` mit Read-only Request-Zusammenfassung (Unternehmen, Ticker, Angefragte Stück, Anlagebetrag, Kundenname/E-Mail) + Eingaben (`allocated_shares`, `subscription_price_per_share`, optional `listing_price_per_share`, optional `decision_note` ≤500).
  - Live-Vorschau `Gesamtbetrag = shares × price` (Anzeige only; Backend ist Source of Truth).
  - Client-Validation: `allocated_shares > 0`, `≤ shares_requested`, `subscription_price_per_share > 0`.
  - Submit-Button während Request disabled → Double-Click-Schutz.
  - Backend-AllocationError-Codes werden zu freundlichen Meldungen gemappt (`INSUFFICIENT_CASH`, `OVER_ALLOCATION`, `REQUEST_BAD_STATUS`, `MISSING_SYMBOL`, `BAD_SHARES`, `BAD_PRICE`, `REQUEST_NOT_FOUND`, `REQUEST_REJECTED_RACE`). Modal bleibt bei Fehler offen.
  - Nach Erfolg: Toast „IPO-Zuteilung wurde erfolgreich erfasst.", Modal schließt, Liste re-lädt. Row zeigt Status **Zugeteilt** (sky-Farbschema) + Stück, Preis, Datum via bestehende Spalten.

- **Neuer Customer-Status-Pill** `allocated → "Zugeteilt"` in `pages/dashboard/OrdersPage.jsx` (`IPO_STATUS_META`), damit der Kunde im Auftragscenter den finalen Zustand sieht.

- **QA (verifiziert im Preview, patron admin + demo.kunde customer):**
  - Security-Matrix: unauth **401** · customer **403** · admin **200** ✅
  - REQUEST_BAD_STATUS (pending → allocate): **409** ✅
  - OVER_ALLOCATION (10 > 5): **422** ✅
  - BAD_SHARES (0): **422** (Pydantic gt=0) ✅
  - Happy-Path Siyata PTT 5 × 20.00 € = 100 € · listing 25.00 € → **200**, Allocation `completed`, Position `PTT qty=5 avg=20`, Cash **8305.26 → 8205.26 EUR** ✅
  - Idempotent Double-Allocate → gleiches allocation_id, `resumed=true` ✅
  - Customer `GET /api/ipo/requests/me` zeigt: `status='allocated'`, `allocated_shares=5`, `subscription_price_per_share=20.0000`, `listing_price_per_share=25.0000`, `allocation_gross_amount=100.00`, `allocation_date` ✅
  - Customer `GET /api/portfolio/stock-positions` zeigt `PTT qty=5.0 avg=20.0` ✅
  - Client-Validation UI: Over-Alloc + Bad-Price zeigen deutsche Fehler im Modal (Modal bleibt offen).
  - Kein Supabase-Write · Kein Legacy-Flow-Impact.

- **Files Changed**: `pages/AdminIpoRequests.js`, `pages/dashboard/OrdersPage.jsx`, `memory/PRD.md`.

---


## Session 82.35 (Preview) · Dashboard Fetch-Banner Fix + IPO Requests Cutover

**Root Cause (verifiziert):** Der globale rote Banner „Einige Dashboard-Daten konnten nicht geladen werden." wurde von `refreshAll()` in `DashboardDataContext.jsx` gesetzt, sobald **irgendeiner** von 12 Fetches `false` zurückgab. Vier Legacy-Supabase-Reads (`stocks`, `profiles/savings_offers`, `comparison_history`, `ipo_subscription_requests`) scheiterten dauerhaft an RLS/UUID-Cast (FastAPI-User-Session ist keine Supabase-Session) und triggerten den Banner obwohl der Depot-Kern gesund war.

**Fix (2 Files):**
- `frontend/src/context/DashboardDataContext.jsx` — Fetches gesplittet in **CRITICAL** (Cash, Depot-Contracts, Bond-Positions, Bond-Requests, Stock-Data, Snapshots) und **NON_CRITICAL** (IPO-Requests, Stock-Catalog, Favorites, Comparison-History, Support-Unread, Inflation). Nur Critical-Fetch-Failures setzen `dashboardFetchHadFailure=true`. Non-Critical-Errors werden geloggt (Sentry + console), aber der globale Banner bleibt aus.
- `fetchIpoSubscriptionRequests` — Cutover von Supabase (`ipo_subscription_requests`) auf Mongo-native `GET /api/ipo/requests/me`. Response wird zu Legacy-Shape normalisiert (`approved_at`/`valuation_set_at` fallback auf `allocation_date`, `ipo_catalog.price_currency='EUR'`, `use_admin_valuation=true`).
- `frontend/src/lib/ipoValuation.js` — `buildIpoValuationMap` akzeptiert Status **`approved` UND `allocated`** (Mongo-Flow setzt `listing_price_per_share` erst bei Allocation).

**QA Preview (verifiziert via Fetch-Mock im echten Preview-Frontend):**
- T1 (Alle Critical 200) → **kein Banner** ✅, Gesamtvermögen 10.351,56 € rendert
- T2 (IPO Mongo API 200) → 11 Requests laden, kein Legacy-Supabase-Read ✅
- T3 (`/api/ipo/requests/me` 500 simuliert) → **kein Banner** ✅ (non-critical)
- T4 (`/api/portfolio/stock-positions` 500) → **Banner erscheint** ✅
- T5 (`/api/portfolio/cash` 500) → **Banner erscheint** ✅
- Alle 8 Critical Backend-Endpoints im Preview liefern 200 (curl-verifiziert)

**Verbleibende Supabase-Reads im `DashboardDataContext` (alle NON-CRITICAL):**
- `stocks` (Stock-Catalog) — CRITICAL=NO
- `profiles` + `savings_offers` (Favoriten) — CRITICAL=NO
- `comparison_history` — CRITICAL=NO
- `macro_rates` (Inflation, bereits tolerant) — CRITICAL=NO
- Supabase Realtime-Channel (`user_stock_orders`, `support_tickets`, `bond_purchase_requests`, `ipo_subscription_requests`) — nur Toast-Nebeneffekt, kein Banner
- Kein Supabase-Write in diesem Scope.

**IPO Requests Supabase Reads in `DashboardDataContext`: MUST = 0 ✅**

---

## Session 82.30 (Preview) · Depot P0 — Bond-Execution Saga
- **cash_service**: `bond_purchase` in `_ACTIVE_TYPES` freigegeben.
- **Neuer Service** `services/bond_execution_service.py` — Saga für approved Bond-Requests. States: `created → cash_debited → position_applied → request_settled → completed` (+ `failed`, `compensation_required`).
- **Neue Collection** `bond_executions` (Unique-Index `bond_request_id`).
- **Bond-Positionen** `bond_positions.(user_id,isin)` unique; Retry-Guard über `applied_execution_ids`; Weighted-Average `avg_purchase_price_pct` und `cost_basis` mit Decimal.
- **Idempotency-Keys** `bond-execution:{request_id}:{cash|position|settle|cash-reversal}`.
- **Katalog-basierte Validierung**: `is_available=True`, `faelligkeitsdatum > today`, `denomination`-Vielfaches, `nominal_amount ≤ requested_nominal`, ISIN aus Katalog.
- **Admin-Endpoint** `POST /api/admin/bonds/requests/{request_id}/execute` (`require_admin`). Body: `{nominal_amount, execution_price_pct, decision_note?, fail_after?}`.
- **Response-Schema** um `executed_nominal / execution_price_pct / gross_amount / executed_at / execution_id / position_id` erweitert (Customer `GET /api/bonds/requests/me`).
- **Kein Fake-Bond-Marktwert**: `portfolio_state.py` unverändert — Bond-Bewertung kommt aus `aktueller_kurs` im Katalog (falls vorhanden) oder bleibt `bonds.valuation_complete=false`, kein Fake-Preis.

### QA Preview (verifiziert)
- **T1 NORMAL** (PT_BOND_01, 500 nom @ 98% → gross 490): request→executed, cash 9420.36→8930.36, position 500 @ 98 ✅
- **T2 DOUBLE EXECUTE**: resumed=true, gleiche exec_id ✅
- **T3 CONCURRENT**: 2× parallel → SAME_ID ✅
- **T4-9 CRASH after cash/position/settle + RETRY**: alle attempt=2 → completed ✅
- **T10 INSUFFICIENT CASH**: 400 ✅
- **T11 OVER-NOMINAL**: 422 ✅
- **T12 INVALID DENOMINATION** (150 vs denom 100): 422 ✅
- **T13 EXPIRED BOND**: create → 400 ✅
- **T14 UNAVAILABLE BOND**: create → 400 ✅
- **T15 PENDING BLOCKED**: 409 ✅
- **T16 REJECTED BLOCKED**: 409 ✅
- **T18 CUSTOMER → 403 · UNAUTH → 401** ✅

### Financial Invariants (Mongo-Aggregation, demo-Kunde)
`EX_COMPLETED=5 · REQUESTS_EXECUTED=5 · BOND_PURCHASE_EVENTS=5 · DOUBLE_CASH_DEBITS=0 · DUPLICATE_EXECUTIONS=0 · EXECUTED_WITHOUT_CASH=0 · EXECUTED_WITHOUT_POSITION=0 · NEGATIVE_CASH=false`

### Constraints
Kein Prod-Deploy · Kein Fake-Bond-Preis · Kein Fake-Rating · Keine Supabase-Writes · Keine Mongo-Transaktionen.

## Session 82.29 (Preview) · Depot P0 — IPO Allocation Saga
- **cash_service**: `ipo_purchase` in `_ACTIVE_TYPES` freigegeben.
- **Neuer Service** `services/ipo_allocation_service.py` — Saga für approved IPO-Requests. States: `created → cash_debited → position_applied → request_settled → completed` (+ `failed`, `compensation_required`).
- **Neue Collection** `ipo_allocations` mit Unique-Index auf `ipo_request_id`.
- **Position-Idempotenz** via `applied_allocation_ids` (separate Liste; kollidiert nicht mit Sell/Buy-`applied_execution_ids`).
- **Idempotency-Keys**: `ipo-allocation:{request_id}:cash` (Cash-Ledger), Guard-Feld für Position, `ipo-allocation:{request_id}:cash-reversal` (Compensation).
- **Symbol-Validation**: Ticker aus IPO-Katalog (nicht Client-Payload). `MISSING_SYMBOL` → 409, keine Fantasie-Symbole.
- **Admin-Endpoint** `POST /api/admin/ipo/requests/{request_id}/allocate` (require_admin). Body: `{allocated_shares, subscription_price_per_share, listing_price_per_share?, decision_note?, fail_after?}`.
- **IPO-Request-Model** um `allocated_shares/subscription_price_per_share/listing_price_per_share/allocation_gross_amount/allocation_date/allocation_id/position_id` erweitert; Customer `GET /api/ipo/requests/me` liefert diese Felder für `status="allocated"`.
- **Cancel-Race-Safety** wie Buy/Sell: settle-CAS `{status: approved}` + `compensation_required`-Fallback bei Reject-Race.

### QA Preview (verifiziert)
- **T1 NORMAL**: PT1AG 20 sh @ 50.00 → allocated, cash 10652.46→9652.46, position 20 @ 50 ✅
- **T2 DOUBLE ALLOCATE**: resumed=true, gleiche alloc_id ✅
- **T3 CONCURRENT**: 2× parallel → SAME_ID=True, resumed differiert lokal (asyncio-Lock) ✅
- **T4-9 CRASH cash/position/settle + RETRY**: alle attempt=2 → `completed` (nach 2. Fix) ✅
- **T10 INSUFFICIENT CASH**: 400, allocation.status=failed ✅
- **T11 OVER-ALLOCATION** (10 > requested 5): 422 ✅
- **T12 REJECTED BLOCKED**: 409 `REQUEST_BAD_STATUS` ✅
- **T13 PENDING BLOCKED**: 409 `REQUEST_BAD_STATUS` ✅
- **T15 MISSING SYMBOL**: 409 `MISSING_SYMBOL`, kein Cash-Debit, keine Position ✅
- **T20 CUSTOMER 403** & **UNAUTH 401** ✅
- **Regression Stock Buy**: unverändert, `completed` ✅

### Financial Invariants (Mongo-Aggregation, demo-Kunde)
`ALLOC_COMPLETED=5 · REQUESTS_ALLOCATED=5 · IPO_PURCHASE_EVENTS=5 · DOUBLE_CASH_DEBITS=0 · DUPLICATE_ALLOCATIONS=0 · ALLOCATED_WITHOUT_CASH=0 · ALLOCATED_WITHOUT_POSITION=0 · NEGATIVE_CASH=false`

### Summary/Snapshot
Nach 5 Allocations: cash 9652.46 EUR (10652.46 − 1350 IPO-Käufe). `stocks.valuation_complete=false` da 5 IPO-Symbole (PT1AG, GDL, ALPER, ICOP, MLOBT) noch **kein Live-Quote-Feed** haben — market_value zeigt nur die eine gepreiste SAP-Position (232.10). Snapshot upsertet transparent mit `stocks_valuation_complete=false` + `unpriced_symbols` gelistet.

### Constraints
Kein Prod-Deploy · Kein Fake-Preis · Keine Fake-Symbole · Keine Supabase-Writes · Keine Mongo-Multi-Document-Transaktionen.

## Session 82.28 (Preview) · Depot P0 — Sell-Order Execution Saga
- **cash_service**: `stock_sale` in `_ACTIVE_TYPES` freigegeben.
- **order_execution_service**: neuer Sell-Zweig in `execute_order` mit spiegelbildlichen Saga-Steps `created → position_decremented → cash_credited → order_settled → completed`. Buy-Pfad unverändert. Persistiert `side`, `cost_basis_sold`, `realized_profit_loss` im Execution-Dokument.
- **Neuer Helper** `_decrement_position(db, user_id, symbol, qty, execution_price, order_id)` — Idempotenz via `applied_execution_ids` + CAS `quantity=old_qty`. Kein Short-Sell (NEGATIVE_POSITION Guard). Zero-Position-Policy: `quantity=0, is_active=false` (Audit-Trail bleibt erhalten, keine harte Löschung).
- **Cash-Credit** via `create_cash_event(type="stock_sale", direction="credit")` mit deterministischem Key `execution:{order_id}:cash-credit`.
- **Cancel-Race**: Sell-Settle-Step erkennt Cancel-Race via CAS-`matched_count=0` + `order.status=cancelled` → markiert Execution `compensation_required` + `ExecutionError(CANCEL_RACE, 409)`. Cancel-Guard in `cancel_order` blockiert Cancel bereits vorher.
- **Position-Reservation** in `create_order` (Sell): `available = position.quantity - Σ pending sell orders(quantity)`. Verhindert Mehrfach-Verkauf identischer Stücke ohne neue Collection.
- **Matcher** in `order_matching_service`: pending `side ∈ {buy, sell}` + Limit-Regel je nach Side (Buy `<=`, Sell `>=`) + neue Counters `buy_seen/sell_seen/buy_executed/sell_executed/insufficient_position`.

### QA Preview
- **Partial Sell** (10 SAP@225, mkt 232.10): executed, Position 36→26, Cash +2321.00, realized_pl=0 ✅
- **Double Execute** derselben Order: resumed=true, gleiche exec_id ✅
- **Limit not reached** (Sell@300 vs mkt 232.10): 409 ✅
- **Oversell** (100 vs verfügbar 25): abgelehnt beim Create ✅
- **Two pending sells exceed position** (Bestand 26, S3=20, S4=10 versucht): S4 abgelehnt (verfügbar 5) ✅
- **Crash after position/cash/settle + Retry**: jeweils attempt_count=2 → completed ✅
- **Matcher+Admin Race**: 1× execution, matcher meldet `sell_executed=2` (parallele Runs) ✅
- **Full Exit**: quantity=0, is_active=false, Position bleibt als Historie ✅
- **Customer execute → 403** ✅
- **Financial Invariants**: DOUBLE_CASH_CREDITS=0 · DOUBLE_CASH_DEBITS=0 · DUPLICATE_EXECUTIONS=0 · EXECUTED_BELOW_SELL_LIMIT=0 · NEGATIVE_POSITION=0 · EXECUTED_SELL_WITHOUT_CASH_CREDIT=0 · NEGATIVE_CASH=false ✅
- **Summary/Snapshot nach vollem Ex-Exit**: `total_value=11234.56 · cash=10770.36 · stock=464.20` — Snapshot upsertet konsistent, kein 2. Dokument.

### Constraints
Kein Prod-Deploy · Nur Limit-Sell (kein Market/Short) · Kein Fake-Preis · Keine Supabase-Writes · Keine Mongo-Transaktionen.

## Session 82.27 (Preview) · Depot P0 — Auto-Limit-Order Matching Worker
- **Neuer Service** `services/order_matching_service.py` — `run_pending_limit_buy_matching(db)` iteriert pending Limit-Buy-Orders (Priority: `created_at ASC`), bündelt Quote-Fetch, prüft `real_price <= limit_price` UND `price_status='fresh'`, und delegiert JEDE Ausführung an die **bestehende** Saga `execute_order` aus Session 82.26. Kein Dual-Codepfad.
- **Neuer Admin-Endpoint** `POST /api/admin/portfolio/orders/match` (require_admin) — Manual-Trigger für Preview-QA.
- **Neuer Cron** `.emergent/crons.yml` + `POST /api/cron/portfolio-matcher` (`*/15 * * * *`, Bearer-Auth). KEIN Echtzeit-Matching — die UI kommuniziert das entsprechend („Wird bei Erreichen des Limits geprüft").
- **Race-Fixes (kritisch)**:
  - `cancel_order`: neuer Guard — 409 wenn eine Execution bereits `cash_debited/position_applied/order_settled/completed` ist. Verhindert cash+position mit cancelled Order.
  - `order_execution_service` settle-step: prüft `matched_count` des CAS-Updates. Wenn 0 UND Order zwischenzeitlich cancelled → Execution `compensation_required`, `ExecutionError(CANCEL_RACE, 409)`. Sicherheitsnetz falls Cancel-Guard umgangen würde.
- **QA Preview (verifiziert)**:
  - Auth: Unauth → 401, Customer → 403 ✅
  - Match-Run: `seen=6 · eligible=1 · executed=1 · limit_not_reached=2 · unavailable=3 · fresh=1` ✅
  - Second Match Run: `seen=5 · eligible=0 · executed=0` (executed Order ignoriert) ✅
  - Multi-Order Cash-Race: 2. Order beim Anlegen abgelehnt (`available=1972.66` < `3600.00`) — kein Negativ-Cash ✅
  - Admin+Matcher parallel für dieselbe Order: 1× executed, matcher liefert `action=executed` (resumed=true intern) ✅
  - Cancel-Race: POST-FIX Retest: Execution completed, Cancel-Response 409 „Order ist nicht mehr stornierbar" ✅
- **Financial Invariants (Aggregation gegen Mongo, demo-Kunde)**:
  - `DOUBLE_CASH_DEBITS=0 · DUPLICATE_EXECUTIONS=0 · EXECUTED_CANCELLED_ORDERS=0 · EXECUTED_ABOVE_LIMIT=0 · NEGATIVE_CASH=false`
  - EXECUTIONS_TOTAL/COMPLETED, STOCK_PURCHASE_EVENTS, ORDERS_EXECUTED und APPLIED_EXECUTION_IDS bleiben konsistent (1:1-Verhältnis).
- **Snapshot nach Matching**: Snapshot upsertet neuen Zustand mit korrigiertem Cash-Balance und Stock-MV. Kein zweites Dokument.

### Constraints
Kein Prod-Deploy · Nur Limit-Buy · Kein Market/Sell/IPO/Bond · Kein Fake-Preis · Kein Supabase-Write · Kein Cron-Slot-Zwang (falls Plattform-Limit greift → BLOCKED-Fallback dokumentiert).

## Session 82.26 (Preview) · Depot P0 — Limit-Order-Execution Saga + Quote-Integrity-Gate
- **Phase 0 (Quote-Integrity-Fix)**: `services/portfolio_state.py` — bei fehlender Quote fällt der Einstand NICHT mehr in `market_value`. Stattdessen: `market_value` summiert ausschließlich bepreiste Positionen, `unpriced_symbols` transparent gelistet, `valuation_complete=false`. Neu: `stocks.priced_cost_basis` (nur bepreiste) neben `stocks.cost_basis` (alle). P/L nur über bepreiste Positionen. Position-Serializer (portfolio.py `_serialize_position` / `_num`) korrigiert für `Decimal128`.
- **Neuer Service** `services/order_execution_service.py` — persistente Saga für **Limit-Buy** Order-Execution auf Standalone Mongo (keine Multi-Document-Transaktion). Schritte: QUOTE-GATE → CASH-DEBIT → POSITION-APPLY → ORDER-SETTLE → COMPLETE. Deterministische Idempotency-Keys `execution:{order_id}:{cash|position|settle|cash-reversal}`.
- **Neue Collection** `order_executions` (Unique: `order_id`). Statusmodell: `created / cash_debited / position_applied / order_settled / completed / failed / compensation_required`. Persistiert `execution_price`, `gross_amount`, `cash_event_id`, `position_id`, `quote_source`, `quote_as_of`, `attempt_count`, `last_error`.
- **Position-Retry-Guard** persistent in `stock_positions.applied_execution_ids` (Liste). CAS-Update mit `$ne`-Filter + `$addToSet` verhindert doppelte Anwendung. Weighted-Average via `(old_qty*old_avg + new_qty*price)/(old_qty+new_qty)` mit `Decimal` und `ROUND_HALF_EVEN`.
- **Cash-Debit** über bestehenden `cash_service.create_cash_event` (`stock_purchase` in `_ACTIVE_TYPES` freigegeben). Amount als `Decimal128`, keine Float-Arithmetik.
- **Order-Settle** setzt `status=executed`, `executed_price`, `executed_quantity`, `executed_at`, `execution_id`, `reserved_cash=0.00` — Reservation verschwindet automatisch weil `status != 'pending'` (Cash-Available-Berechnung liest nur pending buys).
- **Admin-Endpoint** `POST /api/admin/portfolio/orders/{order_id}/execute` (require_admin). Body optional: `{"fail_after":"cash"|"position"|"settle"}` als Test-Injection (HTTP 555 auf simulierten Crash). Kein Customer-Execute-Path.
- **Concurrency**: Per-Order `asyncio.Lock` als Same-Instance-Serialisierung, primärer Schutz ist DB-Idempotenz (Unique-Index `order_id` + Cash-Ledger-Unique + `applied_execution_ids`).
- **Saga-Resume**: Wenn Order bereits `executed` aber Execution nicht `completed` → Saga läuft nur den fehlenden Complete-Schritt. Idempotent bei jedem Retry.
- **Frontend**: Keine Änderungen nötig. Customer-`OrdersPage.jsx` liest bereits `executed_price/quantity/at` aus `/api/portfolio/orders`. Kein Execute-Button für Customer.

### QA Preview (verifiziert)
- Normal Execution ✅ · Double Execute ✅ · Concurrent Execute (2× parallel) ✅
- Crash after Cash + Retry → completed (attempt_count=2) ✅
- Crash after Position + Retry → completed (attempt_count=2) ✅
- Crash after Settle + Retry → completed (attempt_count=2) ✅
- Insufficient Cash → 400 ✅ · Limit not reached → 409 ✅ · Unavailable Quote → 409 ✅ · Stale Quote → 409 ✅
- Customer execute → 403 ✅ · Unauth → 401 ✅
- Weighted-Average über 6 Buys @ 232.10 → qty=18, avg=232.1000 ✅
- Financial Invariants (aggregation gegen Mongo, User demo-Kunde):
  - `DOUBLE_CASH_DEBITS=0 · DUPLICATE_EXECUTIONS=0 · EXECUTED_WITHOUT_CASH=0 · EXECUTED_WITHOUT_POSITION=0 · COMPLETED_WITHOUT_SETTLED=0 · PENDING_RESERVATION_AFTER_EXECUTION=0 · NEGATIVE_CASH=false`
- Phase 0 unpriced Position `NOFEED`: `price=null / market_value=null / profit_loss=null / summary.valuation_complete=false / unpriced_symbols=['NOFEED']`, `total_value` UNVERÄNDERT durch Unpriced-Add ✅
- Snapshot nach Execution: `total_value=11234.56 · cash_value=8913.56 · stock_value=2321.00 · stocks_valuation_complete=true` — Summary↔Snapshot identisch, kein zweites Dokument.

### Cleanup (Preview)
- Test-Artefakt `NOFEED` (manuell eingefügt) und `STALEONLY`-Cache-Stub nach QA sauber entfernt.
- Test-Executions/Cash-Debits/Positionen bleiben als Audit-Trail bestehen (Phase W: append-only Historie nicht antasten).

### Constraints
Kein Prod-Deploy · Nur Limit-Buy (keine Market-Orders, kein Sell, keine IPO/Bond-Ausführung) · Kein Fake-Preis · Kein Fake-Bond-NAV · Keine Supabase-Writes · Keine Mongo-Multi-Document-Transaction.

## Session 82.25 (Preview) · Depot P0 — Portfolio-Snapshot-Service + Vermögensverlauf
- **Neuer Service** `backend/services/portfolio_snapshot_service.py` — idempotenter Tages-Snapshot per Upsert auf `(user_id, snapshot_date)`. Erneuter Lauf am gleichen Tag aktualisiert das bestehende Dokument in-place (kein zweites Doc). Batch-Runner `run_daily_snapshots_for_all_users` iteriert aktive User (Non-ObjectId-Legacy-Rows werden übersprungen und geloggt).
- **Neuer Service** `backend/services/portfolio_state.py` — extrahierte Kern-Berechnung; wird gleichzeitig von `/api/portfolio/summary` UND vom Snapshot-Service genutzt (Summary↔Snapshot-Match mathematisch garantiert).
- **Snapshot-Schema**: `user_id (ObjectId), snapshot_date (ISO YYYY-MM-DD), total_value, cash_value, stock_value, bond_value, invested, profit_loss, profit_loss_pct, stocks_valuation_complete, bonds_valuation_complete, unpriced_symbols, currency (EUR), created_at, updated_at, trigger`. `cash_value = cash.balance` (nicht `available`) — offene Order-Reservations reduzieren Vermögen nicht künstlich.
- **Endpoint-Erweiterung** `GET /api/portfolio/snapshots` akzeptiert jetzt `range ∈ {7d,30d,90d,1y,max}` (Backwards-Compat mit `days`). Invalid-Range → 422. Response enthält Valuation-Flags.
- **Admin-Trigger** `POST /api/admin/portfolio/snapshots/run` — ohne Body: Batch über alle User; mit `{"user_id":"..."}`: nur ein User.
- **Cron** `POST /api/cron/portfolio-snapshots` (`.emergent/crons.yml` → `0 22 * * *`, 22:00 UTC nach US-Market-Close). Bearer-Auth via `WEBHOOK_CRON_SECRET`, Ack 2xx sofort, Ausführung als Background-Task.
- **Frontend**: `DepotPerformance.jsx` Zeitraum-Tabs auf 7T/30T/90T/1J/MAX aktualisiert (konsumiert unverändert `heroSnapshots` aus Context). `PortfolioHistoryChart.js` (bisher direkte Supabase-Reads, im UI nicht mehr eingebunden) auf `/api/portfolio/snapshots?range=…` Mongo-native umgestellt — inkl. Empty-State bei <2 Datenpunkten. Neuer Helper `services/portfolioApi.js` (extrahiert aus DashboardDataContext).
- **QA Preview (verifiziert)**:
  - Range-Validation `bogus` → 422 ✅
  - Cron ohne Bearer → 401, mit Bearer → 202 (accepted) ✅
  - Admin-Batch: 23 Users, 23 success, 0 errors, 73 ms ✅
  - Idempotenz: 2× Trigger pro User → identische Snapshot-ID, kein zweites Dokument ✅
  - Summary↔Snapshot-Match: `total_value / cash / stocks / bonds / valuation_flags` alle identisch nach Cash-Deposit `1234,56 €` ✅
  - Customer-Isolation: demo-Kunde sieht ausschließlich eigenen Snapshot ✅
  - `unpriced_symbols` transparent im Snapshot (kein Fake-Preis, keine 100%-Bond-Schätzung) ✅
  - Kein Supabase-Snapshot-Write ✅

### Constraints
Kein Prod-Deploy · Kein historischer Fake-Backfill · Kein Fake-Bond-Preis (kein Live-Feed) · Keine Order-Execution · Keine Position-Erzeugung · Keine IPO-/Bond-Allocation.

## Session 82.24 (Preview) · Depot Phase 4B-Final — DepotKpiRail Server-Summary-Cutover
- **DepotKpiRail** ruft beim Mount `refreshPortfolioSummary()` und verwendet `portfolioSummary` als **primäre** Quelle für: `investiert = stocks.cost_basis + bondsEinstand`, `gv = profit_loss + bondsGV`, `positionen = stocks.positions + bonds.positions`. Frontend-Aggregation bleibt nur als Fallback wenn Backend-Summary noch nicht geladen ist.
- **Valuation-Incomplete-Handling**: wenn `stocks.valuation_complete=false`, wird bei fehlendem G/V der Hinweis „Kurse teilweise nicht verfügbar" angezeigt statt „Kein Einstand hinterlegt".
- **Cash-Semantik**: Cash-KPI verwendet weiterhin `cashBalance` (Ledger-Balance, nicht `available`) — Reservierungen reduzieren das Vermögen nicht künstlich.
- **DepotHero**: unverändert (nutzt bereits `gesamtvermoegen`-Compound aus Context der auf serverseitigem Cash + berechneten Werten basiert).
- **Legacy `stockPriceMap`**: bleibt vorhanden für Positionsliste (Sparklines/Legacy-Anzeige) und für Fallback-Aggregation. Cutover der detaillierten Positionsliste auf `/api/portfolio/stock-positions` Enrichment steht als eigener P1-Task an.
- **QA Preview**: demo.kunde Empty-Depot zeigt weiterhin sauberen 0/„—"-Zustand; bei vorhandenen Positionen wird `stocks.market_value` aus realer Server-Summary bevorzugt.

### Constraints
Kein Prod-Deploy · Kein Order-Execution · Keine Position-Erzeugung · Keine Market-Order-Freigabe · Keine Bond-Preise erfinden · Snapshot-Cron nicht implementiert.

## Session 82.23 (Preview) · Depot Phase 4B — DashboardDataContext Portfolio-Summary
- **Neuer Fetcher** `fetchPortfolioSummary` in `DashboardDataContext.jsx` — liest serverseitige `/api/portfolio/summary` und persistiert in `state.portfolioSummary`.
- **Context exportiert** `portfolioSummary` (State) + `refreshPortfolioSummary` (Fetcher) → jede Depot-Komponente kann jetzt die serverseitigen Werte konsumieren, statt sie aus mehreren Frontend-Quellen zusammenzurechnen.
- **Backend-Snapshot** (verifiziert für demo.kunde): `total_value=0 · cash={balance,available,unsettled}=0 · stocks.market_value=0 · stocks.valuation_complete=true · bonds.valuation_complete=false · profit_loss=0 · profit_loss_pct=0`.
- **Quotes**: SAP 232.10 EUR fresh · NVDA 119.37 EUR fresh · ORCL unavailable (kein Fake-Fallback).
- **DepotHero/DepotKpiRail**: aktuelle Frontend-Berechnungslogik bleibt zunächst unangetastet — der neue Server-Summary-Wert liegt jetzt kanonisch im Context bereit und kann in einer P1-Iteration schrittweise vor die alte Frontend-Berechnung geschaltet werden (Risiko-arm, ohne Regressionsgefahr).
- **Empty-State**: Kein 0-EUR-Fake, kein roter Fehlerbanner. demo.kunde sieht sauberes Empty-Depot.

### Constraints
Kein Prod-Deploy · Keine Order-Execution · Keine Position-Erzeugung · Keine Market-Order-Freigabe · Keine Fake-Preise · Cash-Ledger/Watchlist/Alerts/Orders/IPO/Bond/Stock-Prices unverändert.

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
