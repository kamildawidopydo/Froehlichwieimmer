# Fröhlich Vermögensberatung — PRD

## Original Problem Statement
Import existing Supabase+React repo, migrate to FastAPI + MongoDB on Emergent.
Rebrand to "Fröhlich Vermögensberatung GmbH" with editorial private-banking aesthetic.

## Roadmap
- Phase 0-3: DONE. Phase 4-5: BACKLOG.

## Design Tokens (light private banking)
- Primary Teal `#7FAFAA`, Strong `#527F7B`, Accent Coral `#E56A73` (Conversion only)
- Text `#1E292B` / `#344443` / `#667675` / `#7A8786`
- Backgrounds `#FFFFFF` / `#F7FAF9` / `#EAF3F2`, Border `#DDE7E5`

## Session Log
- 76.5 — Refined Teal + Coral palette.
- 76.6 — QA palette across secondary surfaces.
- 76.7 — Light lower page (Bonus/Trust/Footer).
- 76.8 — Kontaktleiste hell.
- 76.9 — Hero left side replaced with news preview.
- 77.0 (Feb 28 2026) — **Hero news micro-features**:
  - Featured card: relative-time pill `"vor N Min./Std./Tagen"` on `bg-bank-mint` + `text-bank-primary-strong`, auto-updates every 60 s via clean interval, defensive against invalid dates.
  - Small cards: category chip is now a real `<a href="/nachrichten#kategorie=<key>">` with `preventDefault + stopPropagation`, `trackInvestmentEvent('news_category_click', {category, source:'home_hero'})`, `aria-label="Kategorie X anzeigen"`, Teal focus-ring.
  - Card structure refactored to `<div>` + stretched `<Link absolute inset-0>` under the chip's `z-10` — chip and detail-page click are cleanly separated, both keyboard-reachable.
  - `NachrichtenPage.jsx` reads `#kategorie=<key>` on mount and reacts to `hashchange` — deep-link now works end-to-end (Home hero chip → News overview pre-filtered).
  - No API/backend/sorting/dedup/SafeNewsImage changes.

## Blockers
- P1: Supabase constraint `product_inquiry_leads_product_check` (manual DBA).
- P2: Alpha Vantage + Unsplash API keys (awaiting user).

## Files of Reference
- `/app/frontend/src/components/home/HomeHeroNewsPreview.jsx` (badge + clickable chips + analytics)
- `/app/frontend/src/pages/news/NachrichtenPage.jsx` (hash deep-link reader)
- `/app/frontend/src/components/BankingHero.js`
- `/app/frontend/src/components/news/SafeNewsImage.jsx`
- `/app/frontend/src/lib/investmentAnalytics.js`

## Backlog
- Server.py modularization Wave 2
- Phase 4: Content Automation (Social)
- Phase 5: Sentry, Rate limiting, Deploy
