# Fröhlich Vermögensberatung — PRD

## Original Problem Statement
Import existing Supabase+React repo, migrate to FastAPI + MongoDB on Emergent.
Rebrand to "Fröhlich Vermögensberatung GmbH" — light editorial private-banking.

## Roadmap
Phase 0-3: DONE. Phase 4-5: BACKLOG.

## Design Tokens
Teal `#7FAFAA` / Strong `#527F7B` / Coral `#E56A73` (Conversion) — Text `#1E292B/#344443/#667675/#7A8786` — Surfaces `#FFFFFF/#F7FAF9/#EAF3F2` — Border `#DDE7E5`.

## Session Log
- 76.5–77.1 — Palette rebuild, Footer/Contact/Hero light, News preview, Timestamp badge, Category deep-link, Active-chip + Hero auto-refresh.
- 77.2 — Server.py modularization: exploration only (deferred to future sessions).
- 77.3 (Feb 28 2026) — **News-Pipeline zuverlässig gemacht + /nachrichten Auto-Refresh**:
  - **Root cause fixed** in `news_synthesizer.py::fetch_feeds`: Mongo-Lock-Check verglich `acquired_at == started` als datetime, aber BSON trunkiert auf ms-Präzision → sporadisch immer geskippt. Ersetzt durch `owner_token = uuid.uuid4().hex` mit robustem String-Vergleich.
  - Stale lock gecleart und Pipeline manuell verifiziert: fetch=241/115 relevant/72 new, dann Synthese: 3 neue Artikel published (14:49 → 12:09 today).
  - `NachrichtenPage.jsx` erweitert um Background-Refresh (5 min interval + visibility gating + lastFetchRef + Slug-Vergleich für Flicker-Free-Rerender + silent-error). Aktiver Kategorie-Filter, Hash und Scroll bleiben erhalten. Timer-Cleanup identisch zu HomeHeroNewsPreview.
  - Keine Änderungen an Sortierung/Dedup/SafeNewsImage/Detail-Routing/Analytics/Cron-Konfiguration/News-Synthesizer-Logik.

## Cron Configuration (5/5 slots used — no change)
- `news-fetch-feeds`      `0 * * * *`   POST `/api/news/admin/fetch-feeds?trigger=hourly_cron`
- `news-synthesize`       `10 * * * *`  POST `/api/news/admin/synthesize?max_articles=25`
- `price-alerts-check`    `*/15 * * * *`
- `newsletter-weekly-digest` `0 8 * * 5`
- `news-image-sweep`      `30 2 * * *`

## Freshness (2026-08-24 12:10 UTC snapshot)
- Newest `published_at`: 2026-08-24 12:09:10 (welt/wirtschaft)
- Last 24h: 7 articles
- Last 7 days: 14 articles
- Last fetch_feeds_summary: 2026-08-24 12:08:55 (241 fetched, 72 new, 0 errors)
- Last synthesis_start: 2026-08-24 12:10:13
- Fetch lock: None (idle)

## Blockers
- P1: Supabase `product_inquiry_leads_product_check` (DBA action)
- P2: Alpha Vantage + Unsplash API keys (User input)

## Files of Reference
- `/app/backend/news_synthesizer.py` — lock fix via owner_token
- `/app/frontend/src/pages/news/NachrichtenPage.jsx` — background auto-refresh
- `/app/frontend/src/components/home/HomeHeroNewsPreview.jsx` — hero auto-refresh
- `/app/.emergent/crons.yml` — 5 cron slots
- `/app/backend/server.py` — 3748 lines, 64 endpoints (modularization deferred)

## Backlog
- Server.py modularization Wave 2 (Auth, News, Investments)
- Phase 4: Content Automation (Social)
- Phase 5: Sentry, Rate limiting, Deploy
- Investigate why `post_deploy` fetch runs multiple times per backend reload (not blocking)
