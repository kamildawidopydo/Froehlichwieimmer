# Lovable → Emergent · Gründlicher Audit-Report

**Datum**: Oktober 2026
**Methodik**: File-Level-Diff + Dependency-Scan + Code-Review-Agent + Backend-Vergleich + Supabase-Schema vs. MongoDB-Collections

## Zusammenfassung

**Verdikt: Emergent ist in Summe REIFER als Lovable.** Nur gezielte Anpassungen nötig, keine große Migration.

| Metrik | Lovable | Emergent |
|---|---|---|
| Frontend-Source-Dateien | 877 | 816 |
| Marketing-/Public-Pages | 33 | **48** (mehr!) |
| MongoDB-Collections mit Daten | — | **89** mit echten Produktionsdaten |
| Supabase-Tabellen mit Daten | 3 (banks, savings_offers, countries) | — |
| News-Artikel | 644 (live_news) | **2.731** (news_articles) + 4.771 raw |
| Bond-Katalog | 0 | **1.176** |
| Reviews | 0 | **480** |
| Dependencies (prod) | Vite + TanStack + Supabase | CRA + React Router + MongoDB + echte Backends |

## Was in dieser Session gefunden + gefixt

### ✅ Fix 1: ContractCard-Upgrade
Flagge + Einlagensicherung-Badge + Chevron auf allen Depot-Vertragskarten.

### ✅ Fix 2: 8 Komponenten übernommen, 10 überschrieben
Siehe `06_SESSION_STATUS.md`

### ✅ Fix 3: Impressum vollständig
legalPages.jsx mit Dr. Susanne Müller, EUID, Crefo-Nr., Zentrale-Telefon, Redaktion.

### ✅ Fix 4: Code-Review Cleanup — 6 tote Dateien gelöscht
Nach Code-Review-Agent-Finding:
- `/app/frontend/src/LegacyApp.jsx` ❌ (verursachte Nested-Router-Risiko)
- `/app/frontend/src/components/LegacyShell.jsx` ❌
- `/app/frontend/src/components/SitePrivacyNotice.jsx` ❌ (dupliziert bestehenden CookieConsent)
- `/app/frontend/src/components/ui/sidebar.tsx` ❌ (TypeScript in JS-Projekt, 0 Importer)
- `/app/frontend/src/components/ui/chart.tsx` ❌ (0 Importer)
- `/app/frontend/src/hooks/use-mobile.tsx` ❌ (nur von sidebar.tsx genutzt)

## Was ich bewusst NICHT übernommen habe

### ❌ DashboardDataContext-Upgrade (Lovable → Emergent)
**Grund**: Lovable mappt Depot-Positionen über `/api/kunde/depot`. Dieser Endpoint existiert in Emergent **nicht** (HTTP 404). Portieren würde die App brechen. Empfohlen für spätere Session, wenn das Backend den Endpoint liefert.

### ❌ Phone-Nummer-Rückänderung
Lovable hat `089 20 175 125` (München). User-Bestätigung: korrekte Nummer ist `06966 7785 941` (Frankfurt). Emergent-Wert ist richtig, wurde beibehalten.

### ❌ Local-Data-Approach bei Vergleich/Market-Context
`OfferDetailDrawer.jsx` + `MarketContextStrip.jsx` nutzen in Lovable lokale JSON-Daten (`savingsOffersLocal`, `marketContextLocal`). Emergent nutzt echte API (`/api/content/comparison/context`). Emergent-Approach ist produktionsreifer, bleibt.

### ❌ PageMeta-Downgrade
Lovable's `PageMeta.jsx` ist ein `null`-Stub. Emergent hat volle SEO-Implementation mit Canonical-URLs, Helmet, Prod-Origin-Fixing. Emergent ist deutlich besser.

### ❌ Admin-Reviews-Endpoints
Lovable's `lib/offerReviews.js` liefert `DATA_SOURCE_UNAVAILABLE`. Emergent hat echte Admin-Endpoints. Emergent bleibt.

## Offene Lücken (Priority-sortiert)

### 🟡 MEDIUM — Xing-Profil-Link fehlt im Footer
Lovable Footer verlinkt auf `https://www.xing.com/pages/froehlich-vermoegensberatung-gmbh`. Emergent Footer hat `SocialFooterIcons` mit FB/LI/IG, aber **kein Xing**. SocialPlatformIcon hat keine `xing`-Variante.

**Lösung**: Entweder (a) Xing zu SocialPlatformIcon + PLATFORMS-Array hinzufügen, oder (b) separaten Xing-Link neben SocialFooterIcons einbauen (wie Lovable). Falls Xing-Profil wirklich existiert.

### 🟢 LOW — Non-ASCII-Dateiname `Steuerübersicht.jsx`
Linux funktioniert, Windows/manche Build-Tools können Probleme machen. Nicht dringend.

### 🟢 LOW — `badgeSecondary`-Feld in AdminDashboardLayout unused
Pre-existing Technical Debt (nicht in dieser Session eingeführt). Entweder rendern oder entfernen.

## Nicht-Lücken (nur formale Unterschiede)

- **241 Lovable-Dateien „fehlen" in Emergent**: In Wahrheit existieren alle als `.js` statt `.jsx`-Variante. Inhalt identisch.
- **209 Emergent-Dateien „fehlen" in Lovable**: Emergent hat mehr Features (Admin-Panels, Bank-Produkt-Detailseiten, Dashboard-Pages).

## Produktionsreife-Check

- Frontend: HTTP 200 ✅
- `/legal/impressum`: HTTP 200 ✅
- `/api/public/savings-offers`: 297/298 Angebote sichtbar ✅
- yarn build: 94s durchgelaufen ✅
- Compile-Errors: 0 ✅
- Rollback-Backup: `/app/memory/lovable_migration/overwrite_backup/1792445481/` ✅
- Prod-Deployment: in Pipeline (Job `4cb1a3eb-243a-47a8-a2cd-9c32d6e04c42`)
