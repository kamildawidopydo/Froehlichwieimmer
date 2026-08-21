# Kapitalmitte / Webmain — Migration PRD

## Original Problem Statement
Bestehendes Repo `gregorbraun36/webmain` 1:1 in dieses Projekt übernehmen und auf FastAPI + MongoDB migrieren. Frontend behalten, Backend (Supabase + Cloudflare Workers) neu aufbauen. Massive Rebranding auf **„Fröhlich Vermögensberatung GmbH"** mit editorial Private-Banking-Design (kein Rounded-SaaS, Playfair Serif, Dunkelblau/Gold), Legal-Domain: `kapital-direkt24.de`.

## User Choices
- **DB**: MongoDB · **Marktdaten**: Alpha Vantage · **Auth**: FastAPI JWT (httpOnly Cookies)
- **LLM**: Emergent Universal Key · **Sprache**: Deutsch primär

## Session 19 (Feb 26, 2026) — Fröhlich „Unsere Einordnung"

**Backend (`einordnung.py`)**
- Neue Mongo-Collection `einordnung_posts` + `PyObjectId`-freundliches Schema (slug, title, category, teaser, body, author, image_url, related_news_slug, status, is_featured, is_demo, published_at, timestamps).
- Public: `GET /api/einordnung` (Liste mit `category` + `featured_only` + Pagination + Kategorienliste), `GET /api/einordnung/{slug}`.
- Admin (require_admin): `GET /admin/list?status=`, `POST /admin`, `PUT /admin/{id}`, `DELETE /admin/{id}` — Statusflow draft/scheduled/published/archived, Slug-Kollisionsschutz.
- Startup-Seed: 4 DEMO-Beiträge (Zinsen, Aktienmärkte, Rohstoffe, Technologie), alle `is_demo=true` + `status=published`, jeder Beitrag hat H2-Zwischenüberschriften und einen „Was bedeutet das für Anleger?"-Abschluss.

**Frontend**
- `services/einordnungApi.js`, `components/nachrichten/EinordnungSection.jsx` (1 Feature-Card + 3 Standard-Cards, Gold-Akzentlinie, DEMO-Tag), `pages/news/EinordnungPage.jsx` (H2-Renderer, Persönliche-Beratung-CTA zu `/contact`, Disclaimer).
- Neue Route `/news/einordnung/:slug` in `App.js`, Section unter Card-Grid auf `/news/nachrichten` (mit sichtbarer optischer Trennung zu externen Nachrichten).

## Session 18 (Feb 26, 2026) — Nachrichten-Bereich (Euronews DEMO)

**Rechtlicher Kurzbefund**
- Euronews-Widgets/MRSS/RSS: kommerziell **nicht** ohne Lizenz nutzbar (ToS + UrhG-Rechtsprechung).
- Commercial-Kontakt: `salesoperations@euronews.com` / https://www.euronews.com/commercial/licensing-services
- Anfragepaket (DE + EN) + Checkliste unter **`/app/memory/EURONEWS_LICENCE_INQUIRY.md`**.

**Backend**
- Neue Provider-Abstraktion `news_provider.py`: abstrakte `NewsProvider`-Klasse, aktive Instanz `EuronewsDemoProvider` (DEMO), Platzhalter `EuronewsLicensedProvider` fürs spätere Aktivieren nach Lizenzabschluss.
- Normalisiertes Datenmodell: `id, slug, title, summary, category, image_url, video_embed_url, published_at, source, source_url, article_content, language, content_type, is_demo`.
- 12 DEMO-Meldungen (Politik/Wirtschaft/Europa/Welt/Wissen/Umwelt/Kultur/Sport/Videos) — jede Überschrift beginnt mit „DEMO —".
- Neue Endpunkte: `GET /api/news/nachrichten?category=&limit=` und `GET /api/news/nachrichten/{slug}`.

**Frontend**
- Neue Seite `/news/nachrichten` (`NachrichtenPage.jsx`): Hero-Card links + Schlagzeilen-Spalte rechts, Live-Slot als Placeholder („Live-Integration nach Freigabe des offiziellen Euronews-Players"), Kategorien-Navigation, 3-Spalten-Card-Grid, „Fröhlich — Unsere Einordnung" als optische Klammer.
- Neue Detail-Seite `/news/euronews/:slug` (`EuronewsArticlePage.jsx`): Bild, Video-Embed-Slot, Artikeltext, „Originalbeitrag bei Euronews öffnen"-Button (nur wenn `source_url`), Disclaimer + noindex.
- Subnav auf `/news` (unter Hero): Marktüberblick · Aktien · Watchlist · **Nachrichten** (letztere führt zur neuen Seite).
- DEMO-Badge (`DEMO / TESTDATEN`, amber) auf allen DEMO-Meldungen sichtbar.

## Session 17 (Feb 25, 2026) — EUR | USD Anzeige-Umschalter

**Backend**
- `_apply_display_currency` unterstützt jetzt beide Richtungen: USD→EUR (× rate) und EUR→USD (÷ rate).
- Alle Markt-Endpunkte (`/news-markte/market/overview|stocks|indices|commodities|fx|quote/{symbol}|quotes`, `/news-markte/markets`, `/watchlist`) akzeptieren `?display_currency=EUR|USD` (Default EUR, ungültige Werte werden auf EUR normalisiert).
- Zentraler USD/EUR-FX-Cache wird für beide Richtungen wiederverwendet — keine doppelten FX-Requests.
- **48/48 Tests grün**, davon 7 neue Cases (`test_display_currency_*`) für Default, USD-Target, Same-Native-No-Conversion, Index/FX unbeeinflusst, Overview-USD, Invalid-Fallback.

**Frontend**
- Neuer `DisplayCurrencyContext` mit localStorage-Persistenz (`display_currency_v1`), cross-tab-sync via storage-Event, Default EUR.
- Neue `<DisplayCurrencyToggle />`-Komponente (Private-Banking-Stil: dezente Pill, aktive Auswahl in Dunkelblau, kleiner Trennstrich, kein Trading-App-Look).
- App-weit im `App.js` gewrapped, damit `useDisplayCurrency()` überall verfügbar ist.
- `marketService.js`, `newsMarkteApi.js`, `watchlistApi.js` reichen die aktive Währung als `?display_currency=` an die Backend-Endpunkte weiter.
- `useMarketInsights`, `useWatchlist`, `AktienImFokus` haben `currency` in ihren useEffect-Dependencies → Umschaltung ohne Reload.
- Toggle-Platzierung im Header der Markt-Insights-Sektion auf `/news` (rechts oben, klein). Wirkt auf alle Konsumenten: Marktüberblick, Aktien im Fokus, Watchlist (Home + `/news/watchlist`).

## Session 16 (Feb 25, 2026) — /news Marktdaten EUR-Normalisierung

**Backend (`server.py`)**
- Neue Config-Felder pro Symbol: `asset_class` (index/stock/commodity/fx), `native_currency`, `unit` (Punkte / Feinunze / Barrel).
- Deutsche Blue Chips (SAP, SIE, ALV, DBK, IFX, RHM) auf native `.DE`-Symbole umgestellt und `native_currency="EUR"` markiert — Fallback-Preise in EUR realistisch angepasst.
- **Neuer FX-Helper `_get_usd_to_eur()`**: nutzt den EURUSD-Quote-Pfad (MongoDB-TTL-Cache + Stale-Fallback), invertiert die Rate, TTL 10 min. Keine hardcodierte Rate.
- **Neuer `_apply_display_currency(quote, target="EUR", fx_info=…)`**: befüllt `display_price` / `display_currency` / `fx_rate` / `fx_updated_at` / `conversion_available`. Indizes & FX-Paare werden nie umgerechnet.
- **Neuer `_fetch_many_display(configs, target="EUR")`**: batch-fetch + zentraler FX-Call (max 1 EUR/USD-Request pro Overview-Aufruf).
- Alle Markt-Endpunkte (`/news-markte/market/overview|stocks|indices|commodities|fx|quote/{s}|quotes` + `/watchlist` + `/news-markte/markets`) liefern jetzt EUR-normalisierte Werte und geben `fx_usd_to_eur` mit zurück.
- Quote-Shape erweitert: `{original_price, original_currency, display_price, display_currency, fx_rate, fx_updated_at, conversion_available, asset_class, unit}` — Legacy-Felder `price`/`currency` bleiben und spiegeln display_*.

**Frontend**
- `services/marketService.js`: `mapQuoteToRow` bevorzugt `display_price`/`display_currency`; neue Utility `formatDisplayPrice(row)` liefert `{primary, secondary}` mit deutschem Zahlenformat (`toLocaleString('de-DE')`).
  - Aktien/Rohstoffe: „119,42 €" primär, „138,85 USD" sekundär (nur ab sm-Breakpoint, mobile ausgeblendet)
  - Indizes: „24.783,00" + Sub-Label „Punkte"
  - FX: nur Rate „1,0862"
- `AktienImFokus.jsx`, `WatchlistSection.jsx`, `WatchlistPage.jsx`: nutzen `formatDisplayPrice`, blenden Originalpreis dezent unter dem EUR-Preis ein.
- `MarktInsights.jsx` liest `insight.unit` unverändert — Backend liefert jetzt "Punkte" / "EUR/Feinunze" / "EUR/Barrel" / "" (FX).

**Tests (`test_market_data_phase2.py`)** — erweitert um Currency-Contract-Prüfung: `asset_class`, `original_price/currency`, `display_price/currency`, `fx_rate`, `fx_updated_at`, `conversion_available`. **24/24 PASS**.

**Verifikations-Beispiele (Fallback-Modus, EURUSD=1,0862 → USD/EUR≈0,9206)**
- NVDA: orig 138,85 USD → disp 127,83 €
- AAPL: orig 226,02 USD → disp 208,08 €
- SAP:  orig 232,10 EUR → disp 232,10 € (keine Umrechnung)
- GOLD: orig 218,65 USD → disp 201,30 € / Feinunze
- DAX:  47,83 Punkte (kein €-Zeichen)
- EUR/USD: 1,0862 (kein €-Zeichen)

## Session 15 (Feb 25, 2026) — Demo-Kundenstimmen komplett überarbeitet

- `_generate_demo_reviews` + Pools in `server.py` grundlegend neu geschrieben (ersetzt die vorherige „AI-typische" Text-Manipulation über `variants[i%3]`).
- Neue Text-Pools mit humanem Sprachmuster-Mix:
  - 5★ (60 Vorlagen): kurze Kommentare, normale Kommentare, konkrete Situationen (Immobilienverkauf, Wechsel von Bank, Login-Probleme, Auslandsüberweisung, bAV etc.)
  - 4★ (45 Vorlagen): solide Zufriedenheit + kleine Kritik (App, Rückmeldezeit, Papierkram)
  - 3★ (25 Vorlagen): spürbare Kritik, aber weiter dabei
  - 2★ (12 Vorlagen): deutliche Kritik ohne Beleidigungen
- Antworten von Fröhlich nur ~30 % gesamt (5★=20 %, 4★=30 %, 3★=60 %, 2★=90 %), Templates deutlich kürzer & variabler.
- Firmennamen „Fröhlich" nur noch in 2 Vorlagen (sehr sparsam); die meisten sagen „die Beratung", „mein Ansprechpartner", „das Team" o. Ä.
- Marketing-Wörter (ganzheitlich, maßgeschneidert, herausragend etc.) durchgehend eliminiert.
- 30 zufällige Kommentare manuell geprüft: 0 KI-typische Phrasen, klare Unterschiede in Länge/Stil/Situation.
- Ratings-Distribution: 5★=120 · 4★=65 · 3★=22 · 2★=11 (Summe 218) · 32,6 % mit Antwort · alle 8 Topics vertreten.
- Tests aktualisiert (`test_reviews_demo_auth.py`) auf tatsächlich vorhandene 12 echte Reviews (Summe 230). **37/37 PASS**.

## Session 14 (Feb 25, 2026) — Verifikation

- Visuelle Verifikation der Testimonials-UI durchgeführt (Screenshots `/kundenstimmen` + Home).
- Bestätigt: Karten zeigen `KOMMENTAR VOM TT.MM.JJJJ` (z. B. „KOMMENTAR VOM 21.08.2026"), VERIFIZIERT-Badge, Quote-Icon, Filter/Sortierung intakt.
- Homepage lädt weiterhin exakt 2 Featured Cards + CTA zu `/kundenstimmen`.
- Keine Code-Änderungen nötig. Alle Punkte aus Session 13 bleiben stabil.

## What's Been Implemented — Session 13 (Feb 24, 2026)

### ✅ Phase 2c — Watchlist-News + Drag & Drop (Feb 24, 2026)

**Backend (`server.py`)**
- `GET /api/news-markte/symbol/{symbol}/news` — normalisierte News pro Symbol
  - Alpha-Vantage NEWS_SENTIMENT (tickers für Aktien/ETFs, topics für Indizes/Rohstoffe/FX)
  - Topic-Mapping: DAX/SPX/DJI→economy_macro, NDX→technology, GOLD/SILVER→financial_markets, OIL→energy_transportation, EURUSD→economy_monetary
  - 30-min MongoDB-Cache via `symbol_news_cache` mit TTL-Index
  - Ohne API-Key: `items: []`, `data_source: "empty"`, `empty_reason: "no_provider"` — **niemals Fake-News**
  - Dedupliziert nach Title, Summary auf 320 Zeichen limitiert, Titel auf 220
- `GET /api/news-markte/symbols/news?symbols=` — Batch-Endpoint (max 25 Symbole, sequenziell cache-first)
- Response-Shape pro Item: `{title, source, published_at (ISO), summary, url, category}`

**Frontend**
- `services/symbolNewsApi.js` — `forSymbol` + `batch` mit relativer Zeitformatierung
- `components/watchlist/SymbolNews.jsx` — 2 Varianten: `compact` (1 Item) für `/news`, `detailed` (bis 3) für `/news/watchlist`
- Empty-State: „Aktuell keine relevanten Meldungen zu {name} verfügbar." + „News-Provider noch nicht konfiguriert" (bei fehlendem Key)
- WatchlistSection rewritten: 1 News unter jeder Zeile, „Weitere News & Verwaltung"-Button
- WatchlistPage rewritten: bis zu 3 News pro Zeile via Batch-Fetch (1 Request)
- Leitidee: **„Beobachten. Verstehen. Einordnen."** — keine „Jetzt kaufen"/„Kursziel"-Suggestionen

**Drag & Drop (`@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`)**
- Ersetzt Up/Down-Buttons auf `/news/watchlist`
- GripVertical-Handle, cursor-grab/grabbing
- PointerSensor (Desktop, 5 px) + TouchSensor (mobile, 150 ms) + KeyboardSensor (Leertaste + Pfeile)
- ARIA: `aria-roledescription="Sortierbares Element"`, sprechendes `aria-label`
- Sofortige serverseitige Persistenz via `PUT /api/watchlist/order`

**Tests (`test_symbol_news_phase2c.py`)** — **8/8 PASS**
- Normalisierte Shape, Empty-State ohne Provider, Symbol-Normalisierung, Batch-Endpoint, Batch-Max (25), Cache-Determinismus, Secret-Leak-Check, Topic-Indizes

**Gesamt-Regression**: 49/49 in Phase 2 + 2b + 2c-Suiten

## What's Been Implemented — Session 12 (Feb 22-24, 2026)

### ✅ Kundenstimmen — 218 Demo-Daten & Volltest (Feb 24, 2026)
- Backend: `/api/reviews/public` unterstützt `q`, `rating`, `sort`, `topic`, `response_filter (with/without)`, `include_demo`, `offset/limit`
- Backend: `/api/reviews/topics?include_demo=` liefert Zähler pro Thema mit Demo-Toggle
- Backend: `PUT /api/reviews/{id}` akzeptiert `admin_response` (+ `responded_at`, `responded_by`)
- Backend: `POST /api/reviews/admin/demo/seed` (idempotent, 218 Demo-Reviews mit realistischer Verteilung) und `DELETE /api/reviews/admin/demo`
- Backend: Demo-Reviews mit `is_demo=true` werden **niemals in `/api/reviews/stats`** eingerechnet (verifiziert: real total=2, avg=4.5, mit Demo=220)
- Frontend `Kundenstimmen.jsx`: PAGE_SIZE=12, Suche (debounced), Rating-Chip (1-5★), Response-Filter (Mit/Ohne Antwort), Sort-Selector (newest/oldest/best/worst), Topic-Pills mit Zähler, Reset-Filter, Empty-State, Skeleton-Loading, Antwort-von-Fröhlich-Block
- Frontend `TestimonialCard`: rendert `admin_response` in gold-gerahmtem italic Block "Antwort von Fröhlich Vermögensberatung", zeigt DEMO-Badge wenn `is_demo`
- Frontend `AdminReviews`: DEMO-Badge (dashed amber border), Toggle "Demo-Daten anzeigen", Response-Modal ("Antworten"/"Antwort bearbeiten"), Seed/Delete-Demo-Buttons
- Preview-Modus: `/kundenstimmen?admin_preview=1` zeigt Warn-Banner + Demo-Reviews sichtbar (nur QA)
- **Testing (iteration 12): 37/37 Backend-Tests PASS, 92% Frontend-Flows PASS**

### ✅ Auth-Migration Supabase → FastAPI (Feb 24, 2026)
- `AuthContext.js` rewritten: `authApi.me()` primary, Supabase Fallback nur für Legacy-Accounts (best-effort)
- Login → tries FastAPI first, fällt für Legacy-Users auf Supabase zurück
- Logout → beide Sessions parallel
- Register/Password-Reset → FastAPI primary, Supabase-Profile-Row als best-effort Nebenwirkung
- `/admin/*` Routen: `ProtectedRoute` prüft `user.role === 'admin'` via FastAPI-hydratiertes User-Objekt
- `?next=` URL-Parameter respektiert nach Login (mit safe-path Validierung)
- `data-testid="admin-logout-btn"` + `topbar-user-menu-btn` für QA-Automation
- OTP-Flow via Supabase Edge Functions bleibt erhalten (opt-in per user pref)
- **Testing (iteration 12): unautorisierter Zugriff blockiert, Session persistiert, Logout säubert Cookies**

### ✅ Follow-ups iteration 13 (Post-Testing Fixes, Feb 24, 2026)
- `reviewsApi.topics({include_demo})` — Topic-Pills sind jetzt Preview-aware (alle 8 Themen mit Demo-Zählern sichtbar)
- `loadMore()` mit `.catch` → Error-State bei fehlgeschlagenem Nachladen
- Login: `?next=` respektiert nach erfolgreichem Login
- Search-Input `type="text"` (kein doppelter native Clear-Icon)
- DashboardTopbar-Logout mit `data-testid` für QA

## Previous Sessions (History)

### Homepage & Editorial Redesign (Session 11)
- `PlatformFlowDiagram` entfernt
- Massive `/news`-Portal (Top News, Market Insights, Editorials, Trends, Detail Pages)
- Home-FAQ mit 4 neuen Investment-Kategorien (Stocks, Bonds, IPO, Crypto)
- Kundenstimmen (Testimonials) System mit Admin Moderation, Resend E-Mail-Einladungen, Topic-Tags
- Trust/Security Section (built, dann per User-Feedback wieder entfernt)

### FastAPI Skeleton (Phase 1, Session 8-10)
- FastAPI + Motor + JWT auth (register, login, me, refresh, logout, forgot, reset)
- Public content APIs (banks, offers, news)
- MongoDB indexes, brute-force lockout, admin seeding

## Architecture

### Frontend
- React 18 + Craco + Tailwind + shadcn/ui + Radix
- react-router-dom v7 (100+ Routen)
- AuthContext hybrid: FastAPI primary, Supabase legacy fallback
- `services/apiClient.js` (axios, `withCredentials=true`)
- Location: `/app/frontend/`

### Backend
- FastAPI + Motor + JWT (bcrypt, httpOnly Cookies, tz-aware)
- Endpoints: `/api/health`, `/api/auth/*`, `/api/content/*`, `/api/reviews/*`, `/api/news-markte/*`
- 218 Demo-Reviews seedable via `/api/reviews/admin/demo/seed`
- Location: `/app/backend/server.py` (~1950 Zeilen — Refactoring in Modules empfohlen)
- Tests: `/app/backend/tests/test_reviews_demo_auth.py` (37 cases)

### Legacy
- `/app/legacy_source/` — Supabase Edge Functions, Cloudflare Workers, PDF/Content-Scripts

## Roadmap

### 🟠 P1 — Next Up
- **Phase 2 Market Data**: Alpha Vantage Backend-Integration (aktuell mocked JSON in `/news`), `marketService.js` mit Real Data verdrahten
- **Personal Watchlist**: Persistente Watchlist für eingeloggte User unter `/news`

### 🟡 P2 — Later
- Phase 3: PDF-Microservice (Puppeteer aus `/app/legacy_source/`)
- Phase 4: Content Automation (Social Media)
- Phase 5: Sentry, Rate-Limiting, Deploy

### 🔵 Refactoring / Debt
- `server.py` in Router-Module aufsplitten (reviews, auth, content, news-markte)
- Kubernetes-Ingress-CORS-Override (verhindert korrekte Credentialed-Preflight)
- Supabase-Konsolen-Log-Noise (401s aus Legacy-Fallback) reduzieren
- Demo-Generator: mindestens 1× 1-Sterne-Bewertung ergänzen (aktuell 0)
- Search Q auch auf `admin_response` erweitern (optional)


## Architecture

### Frontend (übernommen, 1:1)
- React 18 + Craco + Tailwind + shadcn/ui + Radix
- react-router-dom v7 mit 100+ Routen (Marketing, Dashboard, Admin, Banken)
- Zustand: Context (AuthContext, ThemeContext, SocialPreviewContext)
- i18next (Deutsch primär)
- Charts: visx, recharts, lightweight-charts
- Sentry, Cloudinary, Supabase-Client (noch aktiv — legacy)
- Neu: `services/apiClient.js` — axios-Client für FastAPI-Endpoints
- Location: `/app/frontend/`

### Backend (FastAPI Phase 1 — Feb 2026)
- FastAPI + Motor + JWT (bcrypt Passwörter, httpOnly Cookies, tz-aware)
- Endpoints: `/api/health`, `/api/auth/*` (7 endpoints), `/api/content/{banks,offers,news}`
- Admin-Seeding, brute-force lockout (email-based, atomarer $inc), Password-Reset mit Token
- MongoDB Indexes für users.email, expiring reset tokens (TTL), login_attempts, banks.slug, news.slug
- Location: `/app/backend/server.py`

### Legacy Backend Sources
- Location: `/app/legacy_source/` — Supabase Edge Functions, Cloudflare Workers, PDF/Content-Scripts, Design-System
- Referenz für Phase 2+ Migration

## What's Been Implemented (Feb 2026)

### Homepage Cleanup ✅ (Feb 22, 2026)
- `PlatformFlowDiagram` (Sektionen "So funktioniert Ihre Sparplattform", "Von der Anmeldung bis zur Verzinsung", "Ihre Vorteile") komplett aus `Home.js` entfernt und Datei gelöscht
- Import bereinigt, Webpack kompiliert ohne Fehler

### Vertrauen & Sicherheit — Sektion wieder entfernt ✅ (Feb 22, 2026)
- Auf Kundenwunsch komplett aus der Startseite herausgenommen. `HomeTrustSecurity.jsx` gelöscht, Import + Nutzung aus `Home.js` bereinigt. Webpack kompiliert clean.

### Vertrauen & Sicherheit — Seal-Badge-Redesign ✅ (Feb 22, 2026)
- `HomeTrustSecurity` überarbeitet nach visueller Vorlage: goldene Eckakzente, dunkelblaue kreisförmige Siegel-Medaillons mit doppeltem Gold-Ring, zentrierte Serif-Titel, dezente Gold-Trennstriche
- 5 Cards: Geprüfte Datensicherheit, ISO 27001, Qualitätsmanagement, Mitgliedschaften & Branchenstandards, Persönliche & langfristige Beratung
- 4 Zertifizierungs-Cards zeigen explizit „Zertifikat/Logo hinterlegen"-Placeholder-Badge — keine echten TÜV/ISO/BVV-Marken werden verwendet, bis der Kunde die Nachweise liefert; `SealBadge` kann via `logoUrl`-Prop das offizielle Logo laden

### Vertrauen & Sicherheit — 5-Card-Section (initial) ✅ (Feb 22, 2026)
- Neue Home-Sektion `HomeTrustSecurity` mit 5 Cards nebeneinander (Desktop) / 2-3 (Tablet) / 1 (Mobile): Geprüfte Datensicherheit, Informationssicherheit, Qualitätsmanagement, Mitgliedschaften & Standards, Persönliche Beratung
- Gold-Ring-Icons, jede Card mit CTA-Link, „Logo folgt"-Badge auf den 4 Zertifizierungs-Cards als expliziter Platzhalter — **keine erfundenen TÜV/ISO-Logos**. Sobald der Kunde ein echtes Zertifikat liefert, kann das Original-Logo statt dem Placeholder-Icon eingesetzt werden
- Darunter dezente Icon-Leiste mit 5 Werten (Sicherheit & Diskretion, Persönliche Betreuung, Langfristige Partnerschaft, Transparenz & Klarheit, Vertrauen & Verlässlichkeit) plus Closing-Line „Vertrauen entsteht durch Transparenz."
- Platzierung: direkt zwischen `HomePostHero` (Produktüberblick) und `SpecialAifOverview` in `/app/frontend/src/pages/Home.js`. Datei: `/app/frontend/src/components/home/HomeTrustSecurity.jsx`
- **Hinweis**: Der Bereich der „alten 3 Symbole" wurde nicht explizit gefunden — falls Sie mir die genaue Position zeigen (Screenshot mit Kringel), entferne ich diesen Bestandsblock in einer Folge-Iteration sauber

### Follow-ups iteration 13 ✅ (Feb 22, 2026)
- **Themen-Highlights auf `/kundenstimmen`**: `/api/reviews/topics` liefert jetzt eine `count` pro Thema (aus MongoDB-Aggregation der freigegebenen Bewertungen) plus `total_approved`. Frontend-Filterchips zeigen die Zahl in einem kleinen Kreis („Alle Themen 2", „Persönliche Betreuung 1", …). Die zwei Seed-Bewertungen wurden mit Beispielthemen versehen, damit die Zähler sofort greifen.
- **Resend-E-Mail-Versand**: Emergent-managed Resend Playbook integriert. `POST /api/reviews/invite` versendet jetzt automatisch eine Einladungs-Mail über den Emergent-Proxy an die Kunden-Adresse. Verifiziert mit `delivered@resend.dev` — Antwort HTTP 202. HTML-Template mit Fröhlich-Branding, dezenter Gold-Eyebrow, sicherem Absende-Link zur `/kundenstimmen?einladung=<token>`-URL, Anti-Phishing-Fußzeile ("Wir bitten niemals per E-Mail um Passwörter"). Guardrail-Gate (`_assert_safe_email`) prüft vor jedem Versand: keine `<form>`, keine nicht-https-Links, keine Shortener/IP-Hosts, keine Credential-Ask-Phrasen. Admin-UI zeigt jetzt „Einladung wurde per E-Mail versendet" bzw. Fallback bei Versandfehler.
- **Auth-Migration**: Weiter deferred. Backend-APIs für Admin funktionieren einwandfrei über die FastAPI-Cookie-Session, aber die React-Routen unter `/admin/*` hängen noch am Supabase-Guard.

### Follow-ups iteration 12 ✅ (Feb 22, 2026)
- **Themen-Tags**: `reviews` bekommen jetzt bis zu 3 Themen (`persoenliche-betreuung`, `vertrauen`, `beratung`, `erreichbarkeit`, `langfristigkeit`, `transparenz`, `service`, `investmentuebersicht`). Endpoint `/api/reviews/topics`, Filter `?topic=...`, Submit-UI-Chips, Kundenstimmen-Filterleiste, Anzeige als kleine Chips auf `TestimonialCard`
- **Erfahrungs-Einladung**: Admin öffnet Modal „Erfahrung einladen" → Backend erzeugt Token in `review_invites` (30 Tage gültig, `POST /api/reviews/invite`) + gibt persönliche Share-URL `/kundenstimmen?einladung=<token>` zurück. Beim Öffnen prefillt das Submit-Formular Name/E-Mail, zeigt ein Banner „Ihre persönliche Einladung ist gültig" und die Bewertung wird mit `invited=true` gespeichert. E-Mail-Versand über Resend ist strukturell vorbereitet — der Admin kopiert den Link aktuell manuell
- **Home-Trust-Zeile**: Neue schmale Leiste `HomeTrustLine` direkt unter dem Hero mit 5 goldenen Sternen + Linksatz „Von unseren Kunden über Jahre begleitet — persönliche Erfahrungen lesen" → `/kundenstimmen`
- Datei-Ausschnitt: `/app/backend/server.py` (Reviews-Block + `REVIEW_TOPICS` + Invite-Endpoints), `/app/frontend/src/data/reviewTopics.js`, `/app/frontend/src/components/reviews/ReviewSubmitForm.jsx`, `/app/frontend/src/components/home/HomeTrustLine.jsx`, `/app/frontend/src/pages/Kundenstimmen.jsx` (Topic-Filter), `/app/frontend/src/pages/AdminReviews.jsx` (InviteModal + Einladen-Button)

### Kundenstimmen — Testimonial-Fokus ✅ (Feb 22, 2026)
- Neues Home-Modul `HomeTestimonials` löst `HomeCustomerReviews` ab: fokussiert auf persönliche Erfahrungen mit großem Serif-Zitat, dezenten goldenen Anführungszeichen und weichem weißen Hintergrund; Karten aus `TestimonialCard.jsx`, keine Stats-Dominanz mehr
- Neue öffentliche Seite `/kundenstimmen` mit Hero auf Dunkelblau, „Ausgewählte Stimmen" (nur featured), Grid für weitere Rückmeldungen, „Weitere anzeigen"-Pagination und eigenem Erfahrung-teilen-Formular
- Backend erweitert: `reviews` besitzt jetzt `customer_since` (unter_1/1_bis_3/3_bis_5/ueber_5) und `is_featured`; `/api/reviews/public` unterstützt `?featured=true`; Moderation-Input akzeptiert Beides
- Submit-Formular hat Variante `testimonial`: Sterne optional, „Seit wann Kunde?"-Dropdown optional, Text-Placeholder fragt nach Betreuung/Erreichbarkeit/Beratung, Button „Erfahrung teilen", Success-Text „Vielen Dank für Ihre Rückmeldung"
- Admin-Seite: neues Tab-Label „Neu" (statt „Ausstehend"), Edit-Modal kann jetzt `is_featured` togglen, `customer_since` setzen, Anzeigename beliebig (z. B. „Michael – Kunde seit 2019") anpassen; Badge „Auf Startseite" (goldene Sterne) neben „Verifiziert"
- Home-Modal für schnelles Teilen der Erfahrung öffnet das Submit-Formular direkt aus der Home-Sektion

### Kundenbewertungen — Testfeedback iteration_11 behoben ✅ (Feb 22, 2026)
- **HIGH — Gold-Kontrast**: `--bank-gold` Token in `/app/frontend/src/index.css` von blau-primary auf echtes Warm-Gold umgestellt: Light-Theme `#C9A961` (rgb 201 169 97), Dark-Theme `#D4B880` (rgb 212 184 128) inkl. Dashboard-Themes. Damit sind Sterne, Eyebrow „Kundenerfahrungen" und die goldenen CTAs jetzt gut lesbar auf Dunkelblau
- **MEDIUM — Fehlerbehandlung**: `Bewertungen.jsx` fängt jetzt Netzwerkfehler beim Laden ab und zeigt `reviews-load-error` statt fälschlicher Empty-State-Anzeige
- **MINOR — Rate-Limit hinter K8s-Ingress**: `POST /api/reviews/submit` liest jetzt `X-Forwarded-For` (linkeste IP) und prunet stale Einträge in `_review_rate_limit`. Quota auf 5/h/IP angehoben, damit reale Besucher hinter Proxy nicht global gedrosselt werden
- **LOW — Kupferpreis-Bild**: Migration setzt jetzt beim Startup ein passenderes Rohstoff-Bild

### Kundenbewertungen mit Moderation ✅ (Feb 22, 2026)
- Neue MongoDB-Kollektion `reviews` mit Feldern first_name/last_name/email/rating/text/status/display_name/is_verified/moderated_by
- Endpoints: `POST /api/reviews/submit` (public, Honeypot + Rate-Limit 3/h/IP + Textsanitizer + Consent-Pflicht), `GET /api/reviews/public` (nur approved, Filter/Sort/Pagination), `GET /api/reviews/stats` (Durchschnitt + Verteilung dynamisch aus DB), `GET /api/reviews/admin`, `PUT /api/reviews/{id}` (Status / Anzeigename / Verifiziert / Admin-Notiz), `DELETE /api/reviews/{id}`
- Neue Public-Seite `/bewertungen` (Hero mit Stats auf Dunkelblau · Filter 5/4/3/2/1 Stern · Sortierung Neueste/Beste · „Weitere laden" · Submit-Formular unten)
- Home-Sektion `HomeCustomerReviews` (Dunkelblau, goldene Sterne, Stats links + neueste 3 Bewertungen rechts, Empty-State wenn 0 freigegeben, 2 CTAs)
- Admin-Moderation `/admin/reviews` mit Tabs Ausstehend/Freigegeben/Abgelehnt/Alle, „Neue Bewertung — Freigabe erforderlich"-Badge, Aktionen Freigeben/Ablehnen/Bearbeiten (nur Anzeigename & Verifizierung, Text bleibt unberührt) / Löschen mit Sicherheitsabfrage
- **Zentraler Moderations-Contract**: Keine neue Bewertung wird ohne Admin-Freigabe öffentlich; Honeypot- und Bot-Versuche werden ohne Rückmeldung verworfen; verifizierter Status niemals automatisch gesetzt
- Datei-Ausschnitt: `/app/backend/server.py` (Reviews-Block), `/app/frontend/src/services/reviewsApi.js`, `/app/frontend/src/components/reviews/*`, `/app/frontend/src/pages/Bewertungen.jsx`, `/app/frontend/src/pages/AdminReviews.jsx`, `/app/frontend/src/components/home/HomeCustomerReviews.jsx`

### Investment FAQ Ausbau ✅ (Feb 21, 2026)
- 4 neue Kategorien in `faqCopy.categories`: Aktien, Anleihen, IPO, Krypto
- 22 neue Q&A-Items in `siteCopyPhase5.js` (Was ist eine Aktie, ETF-Unterschied, Dividenden, Marktorder/Limitorder, Anleihenarten, Zinsänderungsrisiko, Rating, Anleihen vs. Festgeld, IPO-Teilnahme, Lock-up, IPO-Risiken, Krypto-Verwahrung, Krypto-Steuern, Anlage vs. Spekulation, Depot-Kosten, Diversifikation)
- Home-Preview umgestellt: die 6 Fragen unter „Die wichtigsten Antworten — kompakt & klar" sind jetzt Investment-Themen statt Sparkonten
- Subtitle in `HomeSavingsFaqSection.jsx` angepasst: „Wichtige Fragen zu Aktien, Anleihen, IPO und Krypto — kompakt beantwortet."

### News & Märkte Backend-Erweiterung ✅ (Feb 21, 2026)
- Neue MongoDB-Kollektionen: `anlagetrends` (9 Themen), `investment_radar` (6 Radar-Themen), `market_voices` (6 externe Stimmen), `user_preferences` (Scaffold)
- Neue Endpoints: `/api/news-markte/anlagetrends`, `/investment-radar`, `/market-voices`, `/preferences` (GET/PUT auth), `/for-you` (auth, personalisiert)
- `NEWS_CATEGORIES` erweitert um: fonds-etfs, rohstoffe, seltene-erden, waehrungen, anleihen, investmenttrends
- Article-Seed um 13 zusätzliche Artikel erweitert (fund/etf, Rohstoffe, Seltene Erden, Anleihen, Währungen, Investmenttrends)
- Test-Feedback umgesetzt: kaputte Unsplash-URL ersetzt, DELETE liefert 404 bei nicht-existenter ID, `de-DE`-Locale für Change-%, "Alle aktuellen News" verlinkt jetzt auf `/news/archiv`, Marktdaten-Fußnote entschärft

### About-Page Overhaul ✅ (Feb 20, 2026)
- `/app/frontend/src/pages/About.js` komplett neu geschrieben nach User-Vorgabe
- Neue Struktur: Hero → Wer wir sind → Mehr als klassische Anlageberatung → Konservativ denken → Kompetenz (3 Karten) → Langfristige Zusammenarbeit (Highlight-Block mit 6 Werten) → Weiterempfehlung → Philosophie (4 Karten) → CTA
- Kein Partner-Content mehr (Vermogens Advies aus Hero + Body entfernt, kein Amsterdam-Bezug), keine Renditeversprechen, alle Zitate & Werte 1:1 aus Briefing
- Rechtlicher Hinweis am Ende: klärt, dass Branchenangaben nicht als aufsichtsrechtliche Erlaubnisse zu verstehen sind
- Rendert sauber, 20/20 Content-Assertions grün via Playwright

### Legal / Impressum Overhaul ✅ (Feb 20, 2026)
- `siteContact.js`: HQ-Adresse global auf **Bösgrunder Weg 62, 55543 Bad Kreuznach** umgestellt
- `legalPages.jsx` Impressum: neue Firmendaten (HRB 23436, Amtsgericht Bad Kreuznach, GF Manfred Franz Fröhlich)
- Kooperationspartner-Block (Vermogens Advies Administratie B.V., AFM) **komplett aus Impressum entfernt**
- USt-IdNr., BaFin- und IHK-Angaben als TODO markiert (nicht erfunden — auf Zulassungsbescheide warten)
- Neue Impressum-Sektionen "Zuständige Aufsichtsbehörde" & "Berufsrechtliche Angaben" mit klaren Platzhaltern
- AGB § 8 Gerichtsstand: Frankfurt am Main → Bad Kreuznach
- Konsistenz-Fixes in `SicherheitRegulierung.js`, `About.js`, `PasswordPage.js`, `spezialAifContent.js`, `siteCopyPhase5.js` (Fröhlich-Standort)

### Phase 0: Import & Baseline ✅
- Repo geklont via PAT, 2508 Dateien, ~600 MB Assets nach `/app/frontend/`
- Legacy Backend nach `/app/legacy_source/` archiviert
- Craco/Tailwind/PostCSS/JSConfig/Components-Konfig aus Repo übernommen
- `yarn install --ignore-engines` (Supabase erwartet Node 22, wir haben 20)
- Puppeteer-Chromium-Download deaktiviert (-200 MB)
- devServer host: 127.0.0.1 → 0.0.0.0 (Supervisor)
- oxlint/eslint ignorieren `public/mediapipe/`, `public/models/`
- Frontend läuft, Kapitalmitte-Seite rendert

### Phase 1a: FastAPI Auth ✅ (getestet 21/22)
- Auth komplett: Register/Login/Me/Update/Refresh/Logout/Forgot/Reset
- Cookies: httpOnly, secure, SameSite=None; 1 Tag Access, 30 Tage Refresh
- Brute-force Lockout: email-basiert (nicht IP — rotierende Ingress-Proxies), 5 Fehlversuche → 15 min Lock
- ObjectId-Guard in JWT-Sub-Validierung (401 statt 500 bei forged token)
- tz-aware Motor-Client für konsistente Datetime-Vergleiche
- Idempotentes Seeding pro Collection

### Phase 1b: Public Content ✅
- `/api/content/banks` — 5 Banken (BBVA, bunq, ING, Postbank, Knab) mit Slug, Land, Logo
- `/api/content/offers` — 9 Sparangebote mit Zins, Laufzeit, Min/Max; Filter by bank_slug & product_type
- `/api/content/news` — 3 Beispiel-Artikel mit ISO-Timestamps

### Phase 1c: Supabase-Inventar ✅
- Dokumentiert in `/app/memory/supabase_migration_backlog.md`
- 70 Frontend-Dateien nutzen Supabase, 29 Tables, 15 Edge Functions, 8 Auth-Methoden

### Known Non-App Issues
- **CORS Ingress Override**: Kubernetes Ingress liefert `Access-Control-Allow-Origin: *` statt der FRONTEND_URL. FastAPI-Middleware ist korrekt konfiguriert (direkter ASGI-Test bestätigt); Fix erfordert Ingress-Konfiguration.

## Prioritized Backlog

### P0 — Frontend an FastAPI verkabeln
- `AuthContext` umbauen: Nutze `authApi` aus `services/apiClient.js` statt `supabase.auth.*`
- Login/Register/ForgotPassword/ResetPassword Seiten anpassen
- ProtectedRoute → nutzt neuen Context
- Marketing-Pages (Home, PartnerBanks, SavingsComparison) an `contentApi` verkabeln

### P1 — Marktdaten (Alpha Vantage)
- User braucht API-Key (25 req/day free tier)
- Endpoints: `/api/market/stocks`, `/api/market/history/:symbol`, `/api/market/sparklines`
- MongoDB cache-Layer für price-Snapshots (statt Redis)
- APScheduler für tägliche Sync-Jobs

### P2 — User Portfolio
- Collections: `user_stock_watchlist`, `user_stock_positions`, `user_stock_orders`, `user_bond_positions`, `user_depot_contracts`, `user_price_alerts`
- CRUD-Endpoints mit `get_current_user`-Dependency

### P3 — Forms & Leads (Admin)
- `applications`, `contact_messages`, `support_messages`, `credit_leads`, `product_inquiry_leads` etc.
- Admin-Endpoints mit `require_admin`-Guard

### P4 — Emails (Resend) + PDF (Node-Microservice)
- Resend-Integration für Application-Emails, Weekly-Digest, Stock-Alerts
- Node-Microservice aus `/app/legacy_source/scripts/` extrahieren
- FastAPI ruft Node via HTTP für Vertrags-/Produktinfo-PDFs

### P5 — Deploy Prep
- Sentry Backend
- Ingress-CORS Fix
- Rate Limiting

## Test Coverage
- `/app/backend/tests/backend_test.py` — 22 pytest cases (21 passed, 1 known infra issue)
- `/app/backend/tests/test_auth_supplemental.py` — direct ASGI CORS check + admin password rotation
- Admin bcrypt hash validated ($2b$ prefix, cookies httpOnly+Secure+SameSite=None)
