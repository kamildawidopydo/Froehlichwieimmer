# Fröhlich Vermögensberatung — PRD

## Original Problem Statement
FastAPI + MongoDB news/finance portal, light editorial private-banking aesthetic.

## Roadmap
Phase 0-3: DONE. Phase 4-5: BACKLOG.

## Session Log
- 76.5–77.5 — Palette rebuild, Footer light, News preview, Deep-link chips, Auto-refresh, News-lock fix, Post-deploy 30-min guard, `/api/news/admin/status`, Admin Freshness Tile.
- 77.6 (Feb 28 2026) — **News-Pipeline Two-Strike Email Alarm**:
  - New `backend/news_alert.py::evaluate_and_alert(db, send_email)` — reads `job_summaries`, computes freshness (same rules as `/api/news/admin/status`), applies two-strike + anti-spam, optional recovery mail.
  - State schema `job_summaries._id="alert_state"`: `consecutive_problem_count`, `alert_active`, `last_alert_at`, `last_recovery_at`, `last_status`, `updated_at`.
  - Rule: `PROBLEM_STATES = {"stale", "error"}` — count++ jedes Auftreten; auf zweiter aufeinanderfolgender problematischer Bewertung UND `alert_active=False` → Warnmail versenden + `alert_active=True`. Bei `fresh` → count=0; falls `alert_active` vorher True → Recovery-Mail + `alert_active=False`.
  - Recipient: `NEWS_ALERT_TO` env, Fallback `PRODUCT_INQUIRY_TO` (`kundenservice@kapitalmitte.com`, verifizierte kapitalmitte.com-Resend-Domain).
  - Integration in `server.py::_admin_fetch_feeds` und `_admin_synthesize` — nach jedem Job-Return, immer in try/except → Pipeline blockiert NIE bei Alert-Fehler.
  - No secrets, keine Tokens, keine Raw-Payloads in Mail.
  - Regressionstests `backend/tests/test_news_alert.py` — 7 Fälle: fresh, stale×1, stale×2 (mail), stale×3 (no mail), recovery, error×2, provider-crash. Alle grün.

## Files of Reference
- `/app/backend/news_alert.py` (neu)
- `/app/backend/server.py` — Alert-Wiring in Admin-Endpoints
- `/app/backend/tests/test_news_alert.py` (neu)
- `/app/backend/news_synthesizer.py`
- `/app/frontend/src/components/admin/NewsFreshnessTile.jsx`

## Blockers
- P1: Supabase `product_inquiry_leads_product_check` (DBA-Fix)
- P2: Alpha Vantage + Unsplash API-Keys (User)

## Backlog
- Server.py modularization Wave 2
- Fresh Article Toast on Hero background refresh
- News Retention Archive (>90 Tage)
- Phase 4/5
