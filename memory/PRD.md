# Fröhlich Vermögensberatung — PRD

## Original Problem Statement
FastAPI + MongoDB news/finance portal, light editorial private-banking aesthetic.

## Roadmap
Phase 0-3: DONE. Phase 4-5: BACKLOG.

## Session Log
- 76.5–77.6 — Palette, Footer light, News preview, Deep-link, Auto-refresh, News-lock fix, Post-deploy guard, `/api/news/admin/status`, Admin Freshness Tile, Two-Strike Email Alarm.
- 77.7 (Feb 28 2026) — **Editorial 3-Column Homepage-Hero**:
  - `BankingHero.js` komplett vereinfacht: Familienbild + Parallax + Preload entfernt; nur noch schmaler Wrapper-Section (`bg-bank-bg border-b border-bank-border`, max-w-1440), Inhalt = `<HomeHeroNewsPreview />`.
  - `HomeHeroNewsPreview.jsx` komplett neu strukturiert:
    - `articles[0]` → **Mitte Top-Story**: aspect-16/10 Bild via SafeNewsImage (`loading="eager"`) + Editorial-Box unter dem Bild (mobile) / als Overlay `lg:absolute lg:inset-x-6 lg:bottom-6` mit `bg-white/95 backdrop-blur-sm` + feiner Border + Shadow (desktop). Meta + relative Zeit + große Serif-Headline + 2-Zeilen-Teaser + "Artikel lesen →". Karte komplett klickbar → `/nachrichten/:slug`.
    - `articles[1]` → **Links Text-Story**: Kicker `AKTUELLE NACHRICHTEN`, Meta+Zeit, Serif-Headline, 3-Zeilen-Teaser, "Artikel lesen →", ohne Bild, ruhig editorial.
    - `articles[2..4]` → **Rechts 3 kompakte Meldungen** unter Kicker `WEITERE MELDUNGEN`: Text links + ~92×70px SafeNewsImage rechts, Kategorie-Chip klickbar (Hash-Deep-Link + preventDefault/stopPropagation), Stretched-Link für Detail-Route.
  - `divide-y divide-bank-border` zwischen rechten Meldungen — keine dicken Cards, keine großen Shadows.
  - Grid: mobile 1-col + `order-1/2/3` (Top → Left → Right), md 6-col (Top col-span-6, Left col-span-3, Right col-span-3), lg 12-col (Left 3 · Top 6 · Right 3).
  - "Alle Nachrichten im Überblick"-Reihe als volle Breite unter dem Grid, `bg-white → hover:bg-bank-mint`, Teal Focus-Ring.
  - Bestehende Logik unverändert: 5-min silent auto-refresh, 60-s relative-time timer, visibility-gating, slug-dedupe, `content_type !== 'aggregated'` filter, published_at DESC sort, `SafeNewsImage` für alle Bilder, `trackInvestmentEvent('news_category_click', {category, source:'home_hero'})` für Chip-Klicks.
  - Keine neuen APIs. Ein einziger Request (`/api/news/nachrichten?limit=12`). Kein Coral eingesetzt.

## Files of Reference
- `/app/frontend/src/components/BankingHero.js` — minimaler Wrapper
- `/app/frontend/src/components/home/HomeHeroNewsPreview.jsx` — 3-Column Editorial Hero
- `/app/frontend/src/components/news/SafeNewsImage.jsx` — unverändert

## Blockers
- P1: Supabase `product_inquiry_leads_product_check` (DBA)
- P2: Alpha Vantage + Unsplash API-Keys (User)

## Backlog
- Server.py modularization Wave 2
- Fresh Article Toast on Hero background refresh
- News Retention Archive (>90 Tage)
- Phase 4/5
