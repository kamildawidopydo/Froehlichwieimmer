# Fröhlich Vermögensberatung — PRD

## Original Problem Statement
FastAPI + MongoDB news/finance portal for Fröhlich Vermögensberatung GmbH,
light editorial private-banking aesthetic. Migrated from Supabase+React.

## Roadmap
- Phase 0-3: DONE. Phase 4-5: BACKLOG.

## Design Tokens
Primary Teal `#7FAFAA`, Strong `#527F7B`, Coral `#E56A73` (Conversion only)
Text `#1E292B / #344443 / #667675 / #7A8786`
Surfaces `#FFFFFF / #F7FAF9 / #EAF3F2`, Border `#DDE7E5`

## Session Log
- 76.5-77.0 — Palette rebuild, Footer light, Hero news preview, Deep-link chips, Live-timestamp badge.
- 77.1 (Feb 28 2026):
  - `NachrichtenPage.jsx` — active category chip styling: `bg-bank-mint border-bank-primary text-bank-primary-strong font-semibold`, `data-active` + `aria-current="true"`. Inactive: white + subtle mint hover. Focus-ring teal.
  - `NachrichtenPage.jsx` — chip click now `pushState` `#kategorie=<key>` (or empty for `alle`); Back/Forward navigiert zwischen Filtern; `hashchange` bereits vorhanden.
  - `HomeHeroNewsPreview.jsx` — silent auto-refresh:
    - 5-min interval (`setInterval`) mit visibility-Check (`document.visibilityState !== 'hidden'`)
    - visibility-change listener → refresh nur wenn letzter Fetch ≥ 5 min alt
    - `lastFetchRef` (useRef) verhindert Doppelrequests
    - Silent-Error-Modus (console.warn, kein UI-Flackern) für Background-Refresh; initial fetch nutzt weiter `state='error'`
    - Slug-Reihenfolgen-Vergleich → kein Rerender bei identischem Ergebnis (kein Flackern)
    - Timer & Listener sauber im useEffect-Cleanup entfernt
    - 60s-Timestamp-Timer bleibt unverändert getrennt
  - Keine API/Backend/SafeNewsImage/Detail-Routing/Analytics/Footer/Sticky-CTA/Newsletter/Sortierung/Dedup-Änderungen.

## Blockers
- P1: Supabase constraint `product_inquiry_leads_product_check` (manual DBA).
- P2: Alpha Vantage + Unsplash API keys (awaiting user).

## Files of Reference
- `/app/frontend/src/pages/news/NachrichtenPage.jsx`
- `/app/frontend/src/components/home/HomeHeroNewsPreview.jsx`

## Backlog
- Server.py modularization Wave 2
- Phase 4: Content Automation (Social)
- Phase 5: Sentry, Rate limiting, Deploy
