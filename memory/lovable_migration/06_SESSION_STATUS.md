# Phase A + Phase B Status · Lovable → Emergent

**Datum**: Oktober 2026
**Dauer**: ~1,5 Std (statt angekündigte 2-3 Std)

## Was erledigt wurde

### ✅ Phase A — Depot-Upgrade (ContractCard)
- Länderflagge neben Bank-Namen
- „Einlagensicherung"-Badge (grün)
- Chevron-Pfeil rechts bei klickbaren Karten
- Flaches, modernes Styling (`rounded-lg`)
- 1 Bank-Backfill: Norisbank → country_code=DE, deposit_protection=true, 100.000 €

### ✅ Phase B.1 — 6 neue Komponenten aus Lovable übernommen
| Datei | Zweck |
|---|---|
| `components/LegacyShell.jsx` | Legacy-App-Rahmen |
| `components/SitePrivacyNotice.jsx` | Cookie- und Tracking-Hinweis |
| `components/dashboard/portfolio/SecurityPositionCard.jsx` | Wertpapier-Positions-Karte |
| `components/mein-depot/Steuerübersicht.jsx` | Steuerliche Zusammenfassung |
| `components/ui/sidebar.tsx` | Shadcn-Sidebar-Primitiv |
| `components/ui/chart.tsx` | Shadcn-Chart-Primitiv (Recharts-Wrapper) |

### ✅ Phase B.2 — 10 Dashboard-Komponenten mit Lovable-Version überschrieben
AdminDashboardLayout · DashboardSidebar · GesamtuebersichtSection · IpoPositionsTable · StatTile · VermoegenSubNav · UnifiedPositionsTable · ChartEmpty · EuronewsVideoPlayer · userDashboardNav

**Rollback-Backup**: `/app/memory/lovable_migration/overwrite_backup/1792445481/`

### ✅ Problem 1 — Angebote-Sichtbarkeit (bereits gelöst, kein Eingriff nötig)
Public-API `/api/public/savings-offers` liefert **297 von 298 Angeboten** (`has_demo=true, demo_count=288`). Default-ENV `DEMO_MODE_ENABLED=true` genügt — Demo-Angebote werden korrekt mit Hinweis angezeigt.

## Datenbestand nach Session

| Collection | Count | Public-API sichtbar |
|---|---|---|
| banks | 75 | ✓ |
| countries | 15 | ✓ |
| savings_offers | 298 | 297 ✓ |
| credit_offers | 5 | ✓ |
| live_news (Backend-Pipeline) | — | ✓ |

Alle Lovable-Daten liegen zusätzlich lokal unter `/app/memory/lovable_migration/data/`
als JSON-Snapshot, falls Rebuild nötig.

## Noch offen (später, nach deiner Freigabe)

- **Marketing-Seiten voll angleichen**: /about, /leistungen, /spezial-aif, /philosophie, /sicherheit-regulierung, /kundenstimmen — Inhalte liegen in `/app/memory/lovable_migration/02-04_*.md`
- **Impressum-Volltext**: Die 13 Paragraphen incl. Dr. Susanne Müller, EUID, Crefo-Nr., Redaktion
- **DNS-Umzug**: Erst wenn alles fertig ist, von Lovable auf Emergent-Prod umschalten
