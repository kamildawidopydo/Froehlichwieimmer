# Fröhlich Vermögensberatung — PRD

## Original Problem Statement
FastAPI + MongoDB news/finance portal, light editorial private-banking aesthetic.

## Roadmap
Phase 0-3: DONE. Phase 4-5: BACKLOG.

## Session Log
- 76.5–77.9 — Palette rebuild, Footer/Contact/Hero light, News-Hero Editorial, News-lock fix, `/api/news/admin/status`, Admin Freshness Tile, Two-Strike Email Alarm, Fresh Article Toast.
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
