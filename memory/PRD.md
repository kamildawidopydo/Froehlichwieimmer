# Fröhlich Vermögensberatung — PRD

## Original Problem Statement
FastAPI + MongoDB news/finance portal, light editorial private-banking aesthetic.

## Roadmap
Phase 0-3: DONE. Phase 4-5: BACKLOG.

## Session Log
- 76.5–77.7 — Palette, Footer light, News preview, Deep-link, Auto-refresh, News-lock fix, Post-deploy guard, `/api/news/admin/status`, Admin Freshness Tile, Two-Strike Email Alarm, Editorial 3-Column Hero.
- 77.8 (Feb 28 2026) — **Category Ribbon on Editorial Hero**:
  - `HomeHeroNewsPreview.jsx`: Dedup-Limit von 5 auf 12 erhöht (nur die 5 Top-Artikel werden angezeigt, aber alle 12 fließen in die Ribbon-Aggregation).
  - Neuer `CategoryRibbon`-Component (nur intern in derselben Datei) oberhalb des Grids: aggregiert Kategorien der letzten 24 h aus geladenen Items via `Map<key,{count,newest}>`, sortiert nach Count DESC + Tie-Break newest DESC, `slice(0,5)`. Rendert bis zu 5 Chips als echte `<Link to="/nachrichten#kategorie=<key>">`.
  - Kein zusätzlicher API-Request. Bestehende `/api/news/nachrichten?limit=12` Response wiederverwendet.
  - Chip-Styling: `rounded-full bg-white border-bank-border`, hover `bg-bank-mint`, text `bank-primary-strong`, mono uppercase, min-h-[32px]. Kein Coral.
  - Mobile: horizontal scrollbare Zeile ohne sichtbare Scrollbar, `THEMEN`-Label nur ≥sm.
  - Analytics: `trackInvestmentEvent('news_category_click', {category, source:'home_hero_ribbon'})`.

## Files of Reference
- `/app/frontend/src/components/home/HomeHeroNewsPreview.jsx` — Ribbon + Editorial-Hero
- `/app/frontend/src/components/BankingHero.js`

## Blockers
- P1: Supabase `product_inquiry_leads_product_check` (DBA)
- P2: Alpha Vantage + Unsplash API-Keys (User)

## Backlog
- Server.py modularization Wave 2
- Fresh Article Toast on Hero background refresh
- News Retention Archive (>90 Tage)
- Phase 4/5
