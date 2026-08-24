# Fröhlich Vermögensberatung — PRD

## Original Problem Statement
FastAPI + MongoDB news/finance portal, light editorial private-banking aesthetic.

## Roadmap
Phase 0-3: DONE. Phase 4-5: BACKLOG.

## Session Log
- 76.5–77.9 — Palette rebuild, Footer/Contact/Hero light, News-Hero Editorial, News-lock fix, `/api/news/admin/status`, Admin Freshness Tile, Two-Strike Email Alarm, Fresh Article Toast.
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
