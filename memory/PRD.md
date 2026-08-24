# Fröhlich Vermögensberatung — PRD

## Original Problem Statement
Import existing Supabase+React repo, migrate to FastAPI + MongoDB stack on Emergent.
Rebrand to "Fröhlich Vermögensberatung GmbH" with editorial "Private Banking" aesthetic.
Self-sufficient news + finance portal.

## Roadmap
- Phase 0-3: DONE
- Phase 4: Content Automation (Social Media) — BACKLOG
- Phase 5: Sentry, Rate limiting, Deploy — BACKLOG

## Design Tokens (light private banking)
- `--bank-primary #7FAFAA` — chrome/links/focus
- `--bank-primary-strong #527F7B` — hover/small text
- `--bank-accent #E56A73` — Conversion-only
- `--bank-text #1E292B`, `--bank-text-strong #344443`, `--bank-text-muted #667675`, `--bank-text-soft #7A8786`
- `--bank-bg #FFFFFF`, `--bank-panel #F7FAF9`, `--bank-mint #EAF3F2`, `--bank-border #DDE7E5`

## Session Log
- 76.5 — Refined Teal + Coral palette.
- 76.6 — QA palette across secondary surfaces.
- 76.7 — Light redesign for lower page (Bonus, Trust, Footer).
- 76.8 — Kontaktleiste hell umgefärbt (bg-bank-panel, Teal icon chips).
- 76.9 (Feb 28 2026) — **Hero left side replaced with News Preview**:
  - New `HomeHeroNewsPreview.jsx` fetches `/api/news/nachrichten?limit=12` once, filters own editorial (`content_type !== 'aggregated'`), dedupes by slug, sorts DESC by `published_at`, shows top 4.
  - Layout: kicker → 1 large featured card (image ~42% + text ~58% on desktop, stacked on mobile) → 3 small cards (grid-cols-3 desktop, 1-col mobile) → "Alle Nachrichten im Überblick" full-width nav link.
  - Uses `SafeNewsImage` (3-stage category fallback) for all images, `loading="eager"` on featured + `loading="lazy"` on small cards.
  - `BankingHero.js` refactored: left copy block completely removed (headline, ledes, CTAs), replaced by `<HomeHeroNewsPreview />`. Right family image + parallax + preload UNCHANGED.
  - Routing untouched: cards link to `/nachrichten/:slug`, "Alle Nachrichten" to `/nachrichten`.
  - No new deps, no API/backend changes, no analytics/tracking changes.

## Blockers
- P1: Supabase constraint `product_inquiry_leads_product_check` — manual DBA action.
- P2: Alpha Vantage + Unsplash API keys — awaiting user.

## Files of Reference
- `/app/frontend/src/components/BankingHero.js` (hero shell, right image untouched)
- `/app/frontend/src/components/home/HomeHeroNewsPreview.jsx` (new news preview)
- `/app/frontend/src/components/news/SafeNewsImage.jsx` (fallback engine)
- `/app/frontend/src/index.css` — design tokens
- `/app/frontend/src/components/Footer.js`, `/app/frontend/src/components/NavCustomerServiceContact.jsx`

## Backlog
- Server.py modularization Wave 2 (Auth, News, Investments routes)
- Phase 4: Content Automation (Social Media)
- Phase 5: Sentry, Rate limiting, Deploy
