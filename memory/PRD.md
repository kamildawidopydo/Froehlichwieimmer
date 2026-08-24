# Fröhlich Vermögensberatung — PRD

## Original Problem Statement
Import Supabase+React → FastAPI + MongoDB on Emergent. Rebrand "Fröhlich Vermögensberatung GmbH", editorial private-banking aesthetic. Self-sufficient news/finance portal.

## Roadmap
Phase 0-3: DONE. Phase 4-5: BACKLOG.

## Session Log
- 76.5–77.3 — Palette rebuild, Footer/Contact/Hero light, News preview, Deep-link chips, Active-chip + Hero auto-refresh, News lock bug fix.
- 77.4 (Feb 28 2026) — **News pipeline stability**:
  - `news_synthesizer.py`: fixed lock RELEASE to use `owner_token` (BSON-ms truncation bug fix); persist fetch_feeds_summary + synthesize_pending_summary to new `job_summaries` collection with `_id ∈ {fetch_feeds, synthesize_pending}`.
  - `server.py::_news_post_deploy_fetch`: 30-min guard reads `job_summaries.fetch_feeds.last_success_at` — skips startup fetch if <30 min ago. Verified: `startup fetch skipped: recent successful fetch (1.0 min ago)`.
  - `server.py`: new `GET /api/news/admin/status` (require_admin) returns `freshness`, fetch/synthesize summaries, content counts (24h/7d), lock_active. Read-only. No secrets/tokens/raw payloads.
  - Freshness rules: `fresh` = <=120 min since last success; `stale` = older; `error` = errors present + >60 min old.

## Files of Reference
- `/app/backend/news_synthesizer.py` — lock owner_token + summary persistence
- `/app/backend/server.py` — 30-min guard on startup + `/api/news/admin/status`
- `/app/frontend/src/components/home/HomeHeroNewsPreview.jsx`
- `/app/frontend/src/pages/news/NachrichtenPage.jsx`
- `/app/.emergent/crons.yml` — 5/5 slots unchanged

## Cron Configuration (5/5 slots — unchanged)
news-fetch-feeds `0 * * * *` · news-synthesize `10 * * * *` · price-alerts-check `*/15 * * * *` · newsletter-weekly-digest `0 8 * * 5` · news-image-sweep `30 2 * * *`

## Blockers
- P1: Supabase constraint `product_inquiry_leads_product_check` (DBA)
- P2: Alpha Vantage + Unsplash API keys (User)

## Backlog
- Server.py modularization Wave 2 (Auth 8 endpoints, News ~28, Investments)
- Phase 4: Content Automation (Social)
- Phase 5: Sentry, Rate limiting, Deploy
- Fresh Article Toast on Hero background refresh
