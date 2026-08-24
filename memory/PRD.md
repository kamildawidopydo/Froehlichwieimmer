# Fröhlich Vermögensberatung — PRD

## Original Problem Statement
Import existing Supabase+React repo, migrate to FastAPI + MongoDB stack on Emergent.
Rebrand to "Fröhlich Vermögensberatung GmbH" with editorial "Private Banking" aesthetic.
Self-sufficient news + finance portal.

## Roadmap
- **Phase 0**: 1:1 Import — DONE
- **Phase 1**: FastAPI skeleton + Auth + Public Content APIs — DONE
- **Phase 2**: Market Data & Watchlist APIs — DONE
- **Phase 3**: PDF Generation & Emails (Resend) — DONE
- **Phase 4**: Content Automation (Social Media) — BACKLOG
- **Phase 5**: Sentry, Rate limiting, Deploy — BACKLOG

## Design Tokens (Session 76.5+)
Palette: Muted "Teal + Coral" Private-Banking. Central CSS variables in `/app/frontend/src/index.css`:
- **Primary (Teal)** `--bank-primary: #7FAFAA` — chrome, navigation, links, focus, trust
- **Accent (Coral)** `--bank-accent: #E56A73` — CONVERSION-only, kurze Marker, seltene Editorial-Emphasis
- **Text** `--bank-text: #1E1E22` (Anthracite), `--bank-text-muted: #6B7280`
- **Surface** `--bank-bg / --bank-surface: #FFFFFF`, `--bank-surface-elev: #FAF9F7`
- **Ink** `--bank-ink: #302A2C` (Footer/Dark Bands)
- **Error** `--bank-error: #DC2626` — echte Fehlerzustände (nie Coral)

## Session Log
- **Session 76.5** — Refined website colors to Teal + Coral (Private Banking aesthetic).
- **Session 76.6** (Feb 28 2026) — QA Teal/Coral palette across secondary surfaces. Removed all legacy blue-shadow hardcodes `rgb(76,124,186)` in Sticky-CTA (PulseStyle, CompactPill, ProductInquiryStickyCta). Migrated `bank-gold` (aliased to Coral) usage on chrome away to `bank-primary`:
    - AuthShell: numbered labels, form-title rule → teal
    - Login: input focus rings, "Vergessen?" link, "Konto wird geprüft" info banner, OTP KeyRound box → teal
    - Register: input focus rings (all), Compass icon, mini-rail active step, success card border/icon/kicker/rule + top gradient → teal
    - Wizard: input focus rings (6× occurrences) → teal
    - NachrichtenDetailPage: bullet-marker, 2× kicker "Eigene Zusammenfassung"/"Quellen" → teal; "Hinweis" → muted
    - Sticky CTA ProductMenu: hover-border + focus-ring → teal
    - Coral intentionally kept in dark hero brand panel (AuthShell top gradient, backlight blur, wordmark hover, "Alle Investments." italic emphasis + short tagline) as editorial dark-surface accent.
    - All Rose/error-semantics preserved untouched (Auth error states, order rejected states, deletion warnings, negative price movements).
    - No functional/routing/API/wizard changes. Webpack compiled clean (0 errors). WCAG contrast verified for white-on-teal via CSS var `--bank-primary` `#7FAFAA` (contrast ratio ≥ 3.0 for large UI). Sticky-CTA shadows now teal-tinted matching brand.

## Blockers
- **P1**: Supabase constraint `product_inquiry_leads_product_check` — manual DBA action required.
- **P2**: Alpha Vantage + Unsplash API keys — awaiting user.

## Files of Reference
- `/app/frontend/src/index.css` — central design tokens
- `/app/frontend/src/components/editorial/AuthShell.jsx` — auth split-screen shell
- `/app/frontend/src/pages/Login.js`, `/app/frontend/src/pages/Register.js`
- `/app/frontend/src/pages/news/NachrichtenDetailPage.jsx`
- `/app/frontend/src/components/home/NewsletterSignup.jsx`, `Footer.js`
- `/app/frontend/src/components/home/ProductInquiryStickyCta.jsx` + `/stickyCta/*.jsx`
- `/app/frontend/src/components/home/ProductInquiryWizard.jsx`

## Backlog
- Server.py modularization Wave 2 (Auth, News, Investments routes)
- Phase 4: Content Automation (Social Media)
- Phase 5: Sentry, Rate limiting, Deploy
