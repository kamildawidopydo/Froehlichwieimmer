# Fröhlich Vermögensberatung — PRD

## Original Problem Statement
FastAPI + MongoDB news/finance portal, light editorial private-banking aesthetic.

## Roadmap
Phase 0-3: DONE. Phase 4-5: BACKLOG.

## Session Log
- 76.5–77.8 — Palette rebuild, Footer/Contact/Hero light, Editorial 3-column Hero, Category Ribbon, News-lock fix, Admin Freshness Tile, Two-Strike Email Alarm.
- 77.9 (Feb 28 2026) — **Fresh Article Toast im Editorial-Hero**:
  - `HomeHeroNewsPreview.jsx` erweitert um Toast-State + Refs (`prevTopSlugRef`, `prevTopTimeRef`, `toastTimerRef`, `initialLoadRef`) und Toast-Komponente über dem 3-Spalten-Grid.
  - Erkennungslogik: `silent && !initialLoad && nextTop && prevSlug && nextSlug!==prevSlug && nextTime>prevTime && sessionStorage-Guard`.
  - Anti-Spam via `sessionStorage.heroNewsLastToastSlug` — gleicher Slug in Session → kein zweiter Toast; zusätzlich Timestamp-Guard gegen Reordering ohne echte Neuigkeit.
  - Auto-Close nach 9 s (setTimeout, cleanup on dismiss/unmount).
  - Design: heller Editorial-Kasten `bg-white border-bank-border shadow-editorial`, News-Icon in Mint-Kreis, "NEUE MELDUNG"-Kicker Teal-Strong, Headline `line-clamp-2`, "Ansehen →" Link + X-Close. Kein Coral. `prefers-reduced-motion` respektiert.
  - A11y: `role="status" aria-live="polite"`, Close-Button `aria-label`, Focus-Ring teal.
  - Analytics: `trackInvestmentEvent('news_fresh_toast_show'/'news_fresh_toast_click', {slug, source:'home_hero'})` in try/catch.
  - Position: über der Category Ribbon, `max-w-[640px]` — deckt keine News-Karten und keinen Sticky-CTA.

## Files of Reference
- `/app/frontend/src/components/home/HomeHeroNewsPreview.jsx` — Hero + Ribbon + Toast

## Blockers
- P1: Supabase `product_inquiry_leads_product_check` (DBA)
- P2: Alpha Vantage + Unsplash API-Keys (User)

## Backlog
- Server.py modularization Wave 2
- News Retention Archive (>90 Tage)
- Ribbon Fade-Edges Mobile
- Alert Escalation Ladder (6h Reminder)
- Phase 4/5
