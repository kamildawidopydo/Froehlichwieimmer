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

## Design Tokens (Session 76.7+)
Palette: light, airy private-banking. Central CSS variables in `/app/frontend/src/index.css`:
- `--bank-primary #7FAFAA` — chrome, links, focus, trust
- `--bank-primary-strong #527F7B` — hover, small text with contrast
- `--bank-accent #E56A73` (Coral) — Conversion-only, seltene Editorial-Emphasis
- `--bank-text #1E292B` (Anthracite body), `--bank-text-strong #344443` (light-bg links)
- `--bank-text-muted #667675`, `--bank-text-soft #7A8786` (copyright)
- `--bank-bg #FFFFFF`, `--bank-panel #F7FAF9` (topbar+footer+alt sections), `--bank-mint #EAF3F2` (icon hover)
- `--bank-border #DDE7E5`
- `--bank-ink #302A2C` still exists for dark editorial ink surfaces (AuthShell brand panel, News tabs, RateMarquee)

## Session Log
- Session 76.5 — Refined website colors to Teal + Coral (Private Banking).
- Session 76.6 — QA Teal/Coral palette across secondary surfaces.
- Session 76.7 — Light redesign for lower page (Bonus, Trust, Footer).
- Session 76.8 (Feb 28 2026) — Light redesign for TOP customer service bar:
  - `NavCustomerServiceContact.jsx` topbar variant: dark chrome (`bg-white/[0.06]`, `text-slate-300`, `text-white/45`) → light chrome (white icon container with `border-bank-border` + teal-strong icon; label `text-bank-primary-strong` uppercase; number `text-bank-text` display; hours `text-bank-text-muted`; vertical divider `border-bank-border`).
  - `CustomerServiceTopBar` wrapper: `bg-bank-ink border-white/[0.08]` → `bg-bank-panel border-bank-border`. Bar height 44px mobile / 48px desktop (`h-11 sm:h-12`).
  - Mail link: added teal-icon chip matching phone icon; muted text `text-bank-text-muted` with hover `text-bank-primary-strong`. Focus-ring `bank-primary/40` with `ring-offset-bank-panel`.
  - Kein Coral auf Kontaktlinks. Keine Struktur-/Funktions-/Content-Änderung. Webpack clean.

## Blockers
- P1: Supabase constraint `product_inquiry_leads_product_check` — manual DBA action.
- P2: Alpha Vantage + Unsplash API keys — awaiting user.

## Files of Reference
- `/app/frontend/src/index.css` — central design tokens
- `/app/frontend/tailwind.config.js` — bank color mapping
- `/app/frontend/src/components/NavCustomerServiceContact.jsx` (topbar + wrapper light)
- `/app/frontend/src/components/Footer.js` (light)
- `/app/frontend/src/components/footer/FooterBenefitsBand.jsx`
- `/app/frontend/src/components/social/SocialFooterIcons.jsx`
- `/app/frontend/src/pages/Home.js` (Bonus CTA light mint)

## Backlog
- Server.py modularization Wave 2 (Auth, News, Investments routes)
- Phase 4: Content Automation (Social Media)
- Phase 5: Sentry, Rate limiting, Deploy
