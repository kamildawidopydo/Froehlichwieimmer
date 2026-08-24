# Fröhlich Vermögensberatung — PRD

## Original Problem Statement
Import existing Supabase+React repo, migrate to FastAPI + MongoDB stack on Emergent.
Rebrand to "Fröhlich Vermögensberatung GmbH" with editorial "Private Banking" aesthetic.
Self-sufficient news + finance portal.

## Roadmap
- Phase 0: 1:1 Import — DONE
- Phase 1: FastAPI + Auth + Public Content APIs — DONE
- Phase 2: Market Data & Watchlist APIs — DONE
- Phase 3: PDF Generation & Emails (Resend) — DONE
- Phase 4: Content Automation (Social Media) — BACKLOG
- Phase 5: Sentry, Rate limiting, Deploy — BACKLOG

## Design Tokens (Session 76.7)
Palette: light, airy private-banking. Central CSS variables in `/app/frontend/src/index.css`:
- `--bank-primary #7FAFAA` — chrome, links, focus, trust
- `--bank-primary-strong #527F7B` — hover, small text with contrast
- `--bank-accent #E56A73` (Coral) — Conversion-only, seltene Editorial-Emphasis
- `--bank-text #1E292B` (Anthracite body), `--bank-text-strong #344443` (light-bg links)
- `--bank-text-muted #667675`, `--bank-text-soft #7A8786` (copyright)
- `--bank-bg #FFFFFF`, `--bank-panel #F7FAF9` (footer/alt), `--bank-mint #EAF3F2` (very light teal)
- `--bank-border #DDE7E5`
- `--bank-ink #302A2C` still exists for dark editorial ink surfaces (AuthShell brand panel, News tabs, RateMarquee) — NOT used for footer anymore

## Session Log
- Session 76.5 — Refined website colors to Teal + Coral (Private Banking).
- Session 76.6 — QA Teal/Coral palette across secondary surfaces (Login, Register, Wizard, NewsDetail, Sticky-CTA).
- Session 76.7 (Feb 28 2026) — Light Private-Banking Redesign for lower page:
  - Added CSS tokens `--bank-panel`, `--bank-mint`, `--bank-primary-strong`, `--bank-text-strong`, `--bank-text-soft`; tuned `--bank-text`, `--bank-text-muted`, `--bank-border` toward greener anthracite/mint. Tailwind exposes `bank-panel`, `bank-mint`, `bank-primary-strong`, `bank-text-soft`, `bank-text-strong`.
  - Footer.js completely repainted: `bg-bank-panel text-bank-text`, column heads `text-bank-primary-strong`, links `text-bank-text-strong` hover teal, hairlines `border-bank-border`. Trust badge box + copyright band on `bg-white` with `#DDE7E5` border. No dark brown.
  - FooterBenefitsBand.jsx bg `bank-gold-soft` → `bank-panel`.
  - SocialFooterIcons.jsx: white circles with `border-bank-border` and teal icons.
  - Home.js Bonus CTA: `bg-bank-ink` → `bg-bank-mint`, all `text-white` → `text-bank-text`, icon frame `bg-white` + `border-bank-border`.
  - Zero content, image, function, route or API changes. Webpack compiled clean.

## Blockers
- P1: Supabase constraint `product_inquiry_leads_product_check` — manual DBA action.
- P2: Alpha Vantage + Unsplash API keys — awaiting user.

## Files of Reference
- `/app/frontend/src/index.css` — central design tokens
- `/app/frontend/tailwind.config.js` — bank color mapping
- `/app/frontend/src/components/Footer.js` (repainted light)
- `/app/frontend/src/components/footer/FooterBenefitsBand.jsx`
- `/app/frontend/src/components/footer/FooterTrustBadges.jsx`
- `/app/frontend/src/components/social/SocialFooterIcons.jsx`
- `/app/frontend/src/pages/Home.js` (Bonus CTA light mint)

## Backlog
- Server.py modularization Wave 2 (Auth, News, Investments routes)
- Phase 4: Content Automation (Social Media)
- Phase 5: Sentry, Rate limiting, Deploy
