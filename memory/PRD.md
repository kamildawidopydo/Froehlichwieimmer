# Fröhlich Vermögensberatung — PRD

## Original Problem Statement
FastAPI + MongoDB news/finance portal, light editorial private-banking aesthetic.

## Roadmap
Phase 0-3: DONE. Phase 4-5: BACKLOG.

## Session Log
- 76.5–77.9 — Palette rebuild, Footer/Contact/Hero light, News-Hero Editorial, News-lock fix, `/api/news/admin/status`, Admin Freshness Tile, Two-Strike Email Alarm, Fresh Article Toast.
- 78.8 (Feb 25 2026) — **Finnhub-Analystenprovider + Provider-Consensus-Modellierung**:
  - Neu: `/app/backend/providers/analyst_finnhub.py` (~180 LOC). Implementiert `AnalystResearchProvider` gegen `/stock/price-target` und `/stock/recommendation`. Auth via `FINNHUB_API_KEY`. Timeout via `FINNHUB_TIMEOUT_S`. Throttle 1.1 s zwischen Ticker-Requests (Free-Tier 60 rpm sicher).
  - **Kritischer Realitäts-Check**: Finnhub liefert **keine** Einzelanalysten und **keine** Research-Häuser — nur aggregierte Werte (`targetHigh/Low/Mean/Median`, `numberAnalysts`, `lastUpdated`) und gebündelte Rating-Buckets (`buy/hold/sell/strongBuy/strongSell`). Der Provider **erfindet keine Namen**: `analyst=None`, `research_house=None`, `source_url=None`.
  - **Datenmodell erweitert (rückwärtskompatibel)**: neues Feld `record_type ∈ {"analyst_research", "provider_consensus"}` auf allen Rows. Manuelle/CSV-Rows und namentliche Rows sind `analyst_research` (Default beim Serialize). Finnhub-Rows sind `provider_consensus`. Zusätzlich `provider_meta` mit `target_mean/median/high/low`, `number_analysts`, `notes`, `provider_endpoint`.
  - **Validierung angepasst**: „analyst ODER research_house"-Regel wird für `record_type=provider_consensus` **legitim** übersprungen (Quelle = Provider selbst). Alle anderen Validierungsregeln (target>0, currency, date-not-future, source_name) bleiben aktiv.
  - **Consensus-Doppelzählung ausgeschlossen**: `/api/stock-research/consensus` Aggregation-Pipeline `$match` schließt Rows mit `record_type=provider_consensus` aus. Der interne Median wird ausschließlich aus namentlichen Einzelanalysten-Rows berechnet — Finnhubs eigener Median wird separat auf der `provider_consensus`-Row als `target_price` gespeichert und angezeigt.
  - **Provider-Auswahl**: `_analyst_provider()` gibt `FinnhubAnalystProvider` zurück wenn `FINNHUB_API_KEY` gesetzt, sonst `NullAnalystProvider`. Backend startet in beiden Fällen sauber.
  - **Rate-Limit-Strategie**: Sequentielle Requests mit 1.1 s Delay + Hard-Cap 40 Ticker → max. 80 Requests/Sync × 45 min Preis-Cron = kein Rate-Limit-Risiko. Zusätzlicher Analyst-Cron `stock-research-analyst-sync` schedule `0 4,16 * * *` (2×täglich).
  - **Fehlerbehandlung**: 401/403 → PermissionError → Sync bricht ab, DB unangetastet. 429 → RuntimeError → Sync bricht früh ab mit bereits gesammelten Rows. Timeout → einzelner Ticker übersprungen. Leere Response → Ticker übersprungen. Unbekannter Ticker → keine Row emittiert.
  - **Deduplication**: identischer Key wie manuell (`ticker+house+analyst+date+target`). Consensus-Rows haben `research_house=None, analyst=None` → Key ist stabil `AAPL||{date}|{target}`, wird bei jedem Sync als Upsert erkannt (kein Doubletten-Insert).
  - **QA (grün):**
    - Structural: Mock-Test mit realer Finnhub-Response-Shape → 1 Row für AAPL, `analyst/research_house=None`, `rating="Kaufen (24/8/2)"` aus recommendation-Buckets, `record_type=provider_consensus`, `provider_meta` vollständig. 401/429 → 0 Rows, kein Crash.
    - Doppelzählung: 3 namentliche Rows + 1 provider_consensus Row für AAPL → `/consensus` zeigt `analyst_count=3` (nicht 4). ✓
    - Public API: 4 Rows sichtbar, `record_type` korrekt unterschieden, `source_name` transparent.
    - Backend Start ohne Key: OK. Backend Start mit Key (env-Injection): OK. Provider-Selection korrekt.
    - Auth-Regression: `/sync` ohne Auth → 401.
    - OpenAPI: 107 unique / 107 total operation IDs, 0 duplicates.
  - **Externer Blocker (bewusst benannt):** Für Live-E2E muss `FINNHUB_API_KEY` im Environment gesetzt werden (kostenlose Registrierung auf finnhub.io, 60 rpm Free Tier). Danach übernimmt der bestehende Cron automatisch. Kein weiterer Code nötig.
  - Bewusst NICHT verändert: Frontend `StockResearchSection.jsx` (Empty-State bleibt korrekt bei 0 Rows; die neue `record_type`-Info wird noch nicht visuell differenziert — Spec §9 „Frontend nur minimal anpassen, falls erforderlich. Kein Redesign."), Admin-UI/CSV-Import, News-Pipeline, PDF-/Mail-/Auth-Routen.
- 78.7 (Feb 25 2026) — **Stock-Research: Auto-Sync-Pipeline (Provider-Architektur + Consensus)**:
  - **Provider-Layer** neu unter `/app/backend/providers/`:
    - `base.py` — abstrakte `MarketPriceProvider` + `AnalystResearchProvider` mit strengem Vertrag (keine Fake-Daten, keine erfundenen Analysten).
    - `market_price_internal.py` — `InternalQuoteProvider` wrapt den existierenden `market_quote(...)` aus server.py (keine doppelte Provider-Integration). Liefert `price`, `currency`, `company_name`, `is_delayed`, `price_updated_at`.
    - `analyst_null.py` — `NullAnalystProvider` (`available=False`) mit dokumentierter Blocker-Liste (`FINNHUB_API_KEY` oder `FMP_API_KEY`). Kein Improvisation, keine LLM-Meinungen.
  - **Sync-Runner** `/app/backend/routes/stock_research_sync.py` (~230 LOC):
    - Ticker-Universe-Discovery: published Rows → alle Rows → Watchlist (Hard-Cap 40 Ticker gegen Quota-Blowout).
    - Price-Sync updated `current_price`, `currency`, `price_updated_at`, `price_source`, `price_is_delayed`; überschreibt **niemals** manuelle Curator-Felder (target, analyst, source, research_date). Company-Name nur wenn leer.
    - Analyst-Sync validiert 8 Regeln (ticker/target>0/currency/date-not-future/source/analyst-or-house/dedupe/…) → invalide Rows landen in `stock_research_rejects` (Audit) statt in der Publish-Pipeline.
    - Duplicate-Key identisch zur manuellen Anlage (`ticker+house+analyst+date+target`) → 2. Sync erzeugt 0 Writes.
    - Provider-Ausfall = keine Löschung: `try/except` fängt Provider-Crash, DB bleibt unangetastet.
    - Audit-Trail in `stock_research_sync_runs` mit Startzeit, Dauer, Universe-Size, Zähler pro Provider.
  - **Neue Endpoints (alle admin, außer Consensus):**
    - `POST /api/admin/stock-research/sync?auto_publish&ticker=` → manueller/Cron-Trigger.
    - `GET /api/admin/stock-research/sync/history` → letzte 10 Sync-Läufe.
    - `GET /api/stock-research/consensus` (public) → Median-Kursziel + min/max/spread + upside% ausschließlich für Ticker mit ≥3 validen, nicht-stalen Rows.
  - **Additive Response-Felder** in `serialize_public` (rückwärtskompatibel): `price_updated_at`, `research_updated_at`, `price_is_delayed`, `is_stale` (>90 Tage), `ingestion_source` (`manual`/Provider-Name). OpenAPI 0 Duplicate Operation IDs.
  - **Cron** in `.emergent/crons.yml`: `stock-research-sync` alle 45 Min (`*/45 * * * *`) POST `/api/admin/stock-research/sync`.
  - **Stale-Regel** = 90 Tage (konsistent mit Consensus-Cutoff). Stale-Rows werden markiert, nicht gelöscht.
  - **E2E-QA (grün):** Sync gegen AAPL läuft in ~300 ms; Preis von 190→208 EUR aktualisiert (Fallback-Modus, is_delayed=true, ingestion_source unverändert `manual` für die Curator-Row). 2. Sync-Aufruf: `price.updated=0` (idempotent). Consensus mit 3 AAPL-Rows (target 230/230/245): `median=230, min=230, max=245, spread=15, upside=+21.05%`. Unbekannter Ticker `XZZZZZZZ` → keine Löschung (before=after). Auth-Regression: `/sync` + `/sync/history` ohne Auth → 401. Cleanup entfernt alle QA-Seeds, Empty-State wiederhergestellt.
  - **Externer Blocker (klar benannt):** Für echte Analystendaten wird **ein API-Key eines strukturierten Vendors** benötigt: primär **Finnhub** (`FINNHUB_API_KEY` — Free Tier verfügbar für `/stock/recommendation-trends` + `/stock/price-target`) oder alternativ **Financial Modeling Prep** (`FMP_API_KEY`). Bis dahin liefert `NullAnalystProvider` sauber `[]` und `AnalystResearchProvider.available=False`; die Pipeline bleibt vollständig implementiert und produktionsbereit.
  - Bewusst NICHT verändert: `StockResearchSection.jsx` (Empty-State bleibt korrekt bei 0 Rows), Admin-UI/CSV-Import (78.3), News-Pipeline, PDF-/Mail-/Auth-/Investment-Topics-Routen.
- 78.6 (Feb 24 2026) — **server.py Wave 4 — Product-Inquiry-Router korrekt registriert, Stub entfernt**:
  - Bestandsaufnahme: 17 Investment-nahe Routen. Bereits sauber modular: `investment_topics.py` (3 public + 3 admin + `/news/by-slugs`, via `_register_investment_topics(api, db, ...)`), `einordnung.py` (6 Endpoints, via `_register_einordnung(api, db)`), `routes/reports.py` (`/reports/products`, `POST /reports/pdf` via `include_router`), `routes/stock_research.py` (Session 78.3).
  - Einzige verbliebene Investment-Baustelle: `POST /api/send-product-inquiry-email` — server.py hatte einen Stub mit `@api.post` + Pydantic-Validierung, der lazy an `routes/product_inquiry.py` delegierte (Body dort `payload: Any`).
  - **Fix (Wave 4)**: `routes/product_inquiry.py` importiert nun `ProductInquiryEmailPayload` top-level aus server (safe: Router-Import läuft am Ende von server.py). Handler-Signatur ist jetzt typisiert: `payload: ProductInquiryEmailPayload`. Router in server.py am Ende via `from routes import product_inquiry as _product_inquiry_routes; app.include_router(_product_inquiry_routes.router)` registriert. Der ursprüngliche Stub bleibt als Legacy-Fallback (falls jemand vor dem include-Router-Aufruf gegen `api` postet), wird im Regelbetrieb aber durch den registrierten Router überschrieben.
  - **Investment-Topics und Einordnung bewusst NICHT umgeschrieben** — Spec §2 „Wenn `product_inquiry.py` bereits sauber getrennt ist: nicht unnötig neu schreiben." Beide Module sind funktional korrekt modular (jeweils eigene Datei, register-Pattern). Ein Wechsel zu APIRouter+include_router wäre risikoreich (Investment-Topics 494 LOC) ohne funktionalen Mehrwert.
  - LOC: server.py 3699 → 3702 (Netto +3 durch Router-Registrierung + Kommentare). routes/product_inquiry.py 148 → 157.
  - **OpenAPI-Diff vorher↔nachher: 0 Abweichungen** (17 Investment-Routen identisch, `diff` leer). Keine Duplicate Operation IDs.
  - QA E2E: Product Inquiry mit identischer leadId → 1. Request `ok=true, pdf_attached=true, dry_run=true`, 2. Request `ok=true, duplicate=true` (Idempotenz erhalten, keine zweite Mail). Alle 6 Produkte (aktien/anleihen/fonds/tagesgeld/festgeld/flexgeld) HTTP 200 + PDF-Attach. `POST /reports/pdf` → `application/pdf` mit `%PDF`-Magic-Bytes. Investment-Topics `/active` und `/{slug}` 200. Einordnung `/`, `/categories` 200. `/news/by-slugs` weiterhin 200. Auth-Regression: `/admin/investment-topics`, `/einordnung/admin/list` ohne Auth → 401.
  - Bewusst NICHT verändert: Design/News-Hero/Wizard-Flow/Ticker-Lookup/Stock-Research/News-Pipeline/PDF-Layout/Mail-Templates/PRODUCT_INQUIRY_TO/Supabase-Constraints.
- 78.5 (Feb 24 2026) — **Analyst Ticker Lookup (Admin-Form → bestehender Quote-Endpoint)**:
  - `AdminStockResearch.jsx`: Neben dem Ticker-Feld ein „Marktdaten laden"-Button. Auf Klick (oder Enter) → normalisiert Input (trim, uppercase, whitelist `A-Z0-9.-`, max 12) und ruft den **bestehenden** internen Endpoint `GET /api/news-markte/market/quote/{symbol}` (aus Session 78.4).
  - **Nur reale Response-Felder** werden verwendet: `symbol`, `name`, `display_price`|`price`, `display_currency`|`currency`, `last_updated`, `market_status`, `data_source`, `is_delayed`. Kein Feld wird erfunden.
  - Prefill-Regeln: `ticker` (aus `symbol`), `current_price` (aus `display_price`), `currency`, `company_name` (aus `name`, nur wenn geliefert). **Kursziel, Analyst, Research-Haus, Quelle bleiben strikt manuell** — spec §14.
  - Dezentes Info-Panel unter dem Ticker: „Marktdaten geladen" mit Symbol + Name (oder Hinweis „Kein Unternehmensname geliefert"), Kurs mit Währung, `Fallback`/`Verzögert`-Badge wenn `data_source==='fallback'` oder `is_delayed`, echter Kursstand aus `last_updated` (kein Fake-Timestamp). Kein „LIVE"-Label.
  - Fehler: 404 → „Für dieses Symbol konnten keine Marktdaten gefunden werden." · Andere Fehler → „Marktdaten konnten momentan nicht geladen werden. Sie können die Analyse weiterhin manuell erfassen." Formular bleibt in beiden Fällen voll bedienbar.
  - Loading: Button disabled + Spinner + Statuszeile „Marktdaten werden geladen …". Kein Fullscreen-Loader, kein Doppel-Request (Button disabled während `lookup.loading`).
  - Upside-Vorschau nutzt weiterhin die zentrale Formel `((target-current)/current)*100` (keine zweite Berechnungslogik).
  - **Kein neuer Endpoint**, kein neuer Cron, keine Provider-Secrets im Frontend. Admin CRUD unverändert `require_admin`.
  - E2E-Verifikation: `aapl` (lowercase) → normalisiert zu `AAPL`, Prefill: ticker=AAPL, company=Apple, price=208.08, currency=EUR; Info-Panel zeigt Kursstand `24.08.2026, …` + `Fallback`-Badge (data_source=fallback, is_delayed=true, note=no_api_key). Kursziel manuell 250 → Upside +20.1 % korrekt. Unknown Ticker `NOTREAL` → Error-State ohne Formular-Blockade. Mobile 390px: kein horizontaler Scroll.
  - **Regression-safe**: Stock-Research Public API, CSV-Import, Duplicate-Key, Publish-Guard, Homepage-Empty-State, News-Hero, News-Pipeline unverändert.
- 78.4 (Feb 24 2026) — **server.py Wave 3 — News-Routen extrahiert (33 Endpoints)**:
  - Neuer Router `/app/backend/routes/news.py` (134 LOC) mit `APIRouter(prefix="/api", tags=["news"])`. Shim-Pattern: Funktions-Bodies bleiben unverändert in `server.py`, nur die `@api.<verb>(...)`-Decorators wurden dort entfernt und via `router.add_api_route(path, callable, methods=[…], response_model=…, summary=…)` gegen den neuen Router registriert. Garantiert 100 % API-Vertragserhalt (URLs, Methoden, Query-Params, Response-Shapes, Auth-Guards, Statuscodes, Error-Bodies).
  - Extrahierte Endpoints (33): 13 `/news-markte/*` (feed, markets, editorial CRUD, anlagetrends, investment-radar, market-voices, preferences GET+PUT, for-you) · 10 `/news-markte/market/*` + `/symbol[s]/news` · 6 `/news/admin/*` (fetch-feeds, synthesize, list, image-sweep, purge-demo, status) · 4 public `/news/nachrichten*` + `/news/publishers`.
  - **Bewusst NICHT extrahiert**: `/api/content/news` (Content-Router), `/api/newsletter/*` (eigenständiges Feature), `/api/admin/news*` (Investment-Topic-Mapping via `_register_investment_topics`), `/api/news/by-slugs` (bereits in `investment_topics.py`).
  - LOC: `server.py` 3728 → 3699 (−29 durch entfernte Decorator-Zeilen). `routes/news.py` 134. Restliche `@api.` Decorators in server.py: 24 (nicht-News).
  - Registrierung: `from routes import news as _news_routes; app.include_router(_news_routes.router)` in server.py am Ende (nach stock_research, vor `include_router(api)`).
  - **OpenAPI-Diff vorher/nachher: 0 Abweichungen** — 43 News-nahe Routen identisch (Pfade, Methoden, Response-Codes).
  - QA: Backend startet clean (keine ImportErrors, kein Duplicate Operation ID). Public: `GET /news/nachrichten` 200, `/publishers` 200, `/nachrichten/{slug}` 200, `/related` 200, `/news-markte/feed` 200, `/editorial` 200, `/market/overview` 200. Auth-Regression: `/news/admin/*` und `POST /news-markte/editorial` ohne Auth → 401. Mit Admin-Cookie: `/news/admin/status` 200 mit `freshness`+`content.articles_last_24h`+`_7d`. Frontend: Homepage News-Hero rendert Artikel, `/nachrichten` und Detailseite laden korrekt. StockResearchSection unverändert (Empty-State). Webpack: 0 neue Warnings. News-Pipeline (Fetch-Cron, Locks, job_summaries, Post-Deploy-Guard, Two-Strike-Alarm) unverändert.
- 78.3 (Feb 24 2026) — **Analyst Data Feed — Admin CRUD + CSV Import + Public API**:
  - Backend: neuer Router `/app/backend/routes/stock_research.py` (~520 LOC) mit MongoDB-Collection `stock_research`. Endpoints: `GET /api/admin/stock-research`, `POST`, `PATCH /:id`, `DELETE /:id`, `POST /:id/publish`, `POST /:id/unpublish`, `POST /bulk`, `POST /import/preview` (multipart CSV), `POST /import/confirm`, sowie **public** `GET /api/stock-research` (nur `published=true`, limit ≤12, sortiert `research_date DESC`).
  - Admin-Endpoints via `require_admin`. Public-Endpoint filtert interne Felder (`notes`, `created_by`, `created_at`, `updated_at`, `dedupe_key`) heraus.
  - Upside-Prozentwert wird zentral serverseitig serialisiert: `((target - current) / current) * 100` (Division-by-zero-safe, auf 2 Dezimalstellen).
  - Publish-Guard: Ohne `source_name`, `research_date`, valide Kurse → 400 „Für die Veröffentlichung ist eine nachvollziehbare Research-Quelle erforderlich."
  - Duplicate-Key: SHA256 aus `ticker + research_house + analyst + research_date + target_price` → 409 bei manueller Anlage / CSV.
  - CSV: `_sniff_reader` (Komma/Semikolon/Tab), UTF-8/Latin-1, Max 512 KB, Max 500 Zeilen. Formula-Injection-Guard (`=`, `+`, `-`, `@` werden mit `'` neutralisiert). Preview → Confirm-Zwei-Schritt-Workflow. CSV-`published=true` wird **ignoriert** (Draft-First-Regel §10) und als Warnung ausgegeben.
  - Bulk-Aktionen (`publish`|`unpublish`|`delete`) mit Revalidierung bei Bulk-Publish (§11).
  - Frontend: neue Admin-Seite `/app/frontend/src/pages/admin/AdminStockResearch.jsx` (~600 LOC) mit Liste, Manuellem Anlage-/Bearbeitungs-Modal (mit inline Upside-Vorschau), CSV-Import-Wizard (Upload → Preview mit Fehler-/Warn-/Gültig-Zählern → Bestätigung), Bulk-Toolbar, Row-Actions (Bearbeiten/Publish/Unpublish/Löschen mit Confirm), Statusfilter „veröffentlicht/Entwurf".
  - Route in `App.js`: `/admin/stock-research`. Nav-Eintrag „Aktienanalysen" in `AdminDashboardLayout.jsx` unter „Produkte & Inhalte".
  - `StockResearchSection.jsx`: fetcht `/api/stock-research` bei Mount. Wenn `items>0` → `ResearchTable`; sonst weiterhin bestehender Empty-State. Datenstand-Zeile („Datenstand: … · Quellen: Analysten-/Research-Angaben der jeweils genannten Anbieter") nur bei echten Daten sichtbar. Rendert `source_url` als klickbaren Link. Disclaimer unverändert.
  - E2E-QA (curl): Login → Draft-Create (nicht public) → Publish (public sichtbar) → Unpublish (public leer) → 401 ohne Auth → Delete OK. CSV mit 6 Zeilen (2 valide, 4 Fehler: Ticker/Quelle/Datum/Kurs, 1 Warnung published=true) → 2 als Drafts importiert, Duplicate-Preview → 0 importable. Bulk-Delete Cleanup. Preview endet mit leerer Collection + Empty-State auf der Homepage. Kein horizontaler Scroll @390px. Webpack 0 neue Warnings.
- 78.2 (Feb 24 2026) — **Homepage „Aktien mit Potenzial" — Stock Research Section (Empty-State)**:
  - Neue Datei `/app/frontend/src/components/home/StockResearchSection.jsx` (~330 LOC): Editorial Research-Bereich mit Eyebrow „EXKLUSIVE ANALYSEN", H2 „Aktien mit Potenzial", Empty-State (`Aktuell liegen keine verifizierten Analysteneinschätzungen vor.`), Table-Header-Vorschau, 3 Info-Karten (Fundamentale Stärke / Experten-Know-How / Risikobewusst Investieren), Disclaimer.
  - `Home.js`: Import + JSX von `HomeInvestmentSpectrum` durch `StockResearchSection` ersetzt (an gleicher Stelle).
  - Komponente akzeptiert bereits `rows` Prop mit Feldern (company, ticker, currentPrice, priceTarget, upsidePct, analyst, asOfDate, source, currency) — sobald echte Daten anliegen, rendert automatisch die vollständige `ResearchTable` (Desktop-Table + Mobile-Cards, `Intl.NumberFormat` für EUR + Datum) anstelle des Empty-States.
  - STRIKT keine Fake-Daten. Empty-State ist bewusst editorial gestaltet (Mint-Icon-Kreis, dezente Skelett-Andeutung, keine Warnfarben).
  - QA: Webpack 0 neue Warnings; `home-investment-spectrum` DOM-abwesend; `home-stock-research`, `stock-research-empty-state`, `stock-research-info-cards` DOM-präsent; kein horizontaler Scroll @390px.
- 78.0 (Feb 28 2026) — **Server.py Modularisierung Wave 2 — Auth extrahiert**:
  - Neue Datei `/app/backend/routes/auth.py` (175 LOC) mit `APIRouter(prefix="/api", tags=["auth"])` und den 8 Auth-Endpoints. Alle Helper (`db`, `hash_password`, `verify_password`, `create_access_token`, `create_refresh_token`, `set_auth_cookies`, `clear_auth_cookies`, `public_user`, `get_current_user`, `check_lockout`, `record_failed_login`, `clear_login_attempts`, `_as_aware`, `JWT_SECRET`, `JWT_ALGORITHM`, `ACCESS_TOKEN_MINUTES`) sowie Pydantic-Modelle (`RegisterInput`, `LoginInput`, `UpdateMeInput`, `ForgotInput`, `ResetInput`) top-level aus `server` importiert — safe weil `from routes import auth` am Ende von server.py steht.
  - `server.py`: 8 alte `@api.post/get/patch(...)`-Decorators im Auth-Block (früher Z. 334–455) entfernt und durch Kommentar-Anchor ersetzt. `app.include_router(_auth_routes.router)` am Ende registriert.
  - Server-LOC: 3840 → 3724 (-116 Zeilen). Routes/auth.py: 175 Zeilen.

## Auth-Endpoints (alle exakt gleiche URL, Methode und Response-Shape wie vorher)
1. POST /api/auth/register — 200 + cookies / 409 duplicate
2. POST /api/auth/login — 200 + cookies / 401 invalid
3. POST /api/auth/logout — 200 (require_user via get_current_user)
4. GET /api/auth/me — 200 / 401
5. PATCH /api/auth/me — 200 (update name/avatar_url)
6. POST /api/auth/refresh — 200 / 401
7. POST /api/auth/forgot-password — always 200 (anti-enumeration)
8. POST /api/auth/reset-password — 200 / 400 (invalid/used/expired token)

## Cookie-Regression (verified via Set-Cookie header)
`HttpOnly; Max-Age=86400 (access) / 2592000 (refresh); Path=/; Secure; SameSite=None; Partitioned` — identisch zu vorher.

## Blockers
- P1: Supabase `product_inquiry_leads_product_check` (DBA)
- P2: Alpha Vantage + Unsplash API-Keys (User)

## Files of Reference
- `/app/backend/server.py` — Auth-Block entfernt, Router-Include am Ende
- `/app/backend/routes/auth.py` (NEU) — 8 Endpoints per APIRouter
- `/app/backend/routes/product_inquiry.py` (bestehend)
- `/app/backend/routes/reports.py` (bestehend)

## Backlog
- News-Routen extrahieren (~28 Endpoints)
- Investments-Routen extrahieren
- News Retention Archive (>90 Tage)
- Phase 4/5
