# Dashboard Animation — Phasenplan

Technologie: **framer-motion** (layout/mount/tab), **@formkit/auto-animate** (liste), **lottie-react** (empty states), **tailwindcss-animate** (Radix/shadcn).  
Tüm animasyonlar `prefers-reduced-motion` ile uyumludur (`MotionConfig` + `useDashboardMotion`).

---

## Faz 1 — Altyapı ✅

| Bileşen | Dosya | Açıklama |
|---------|-------|----------|
| Motion tokens | `motion/dashboardMotion.js` | Ease, stagger, panel variants |
| Route geçişi | `motion/DashboardPageTransition.jsx` | Sayfa fade (260ms) |
| KPI stagger | `motion/DashboardStagger.jsx` | Grid çocukları sırayla girer |
| Liste animasyonu | `hooks/useAutoAnimateRef.js` | auto-animate wrapper |
| Chart kartı | `charts/ChartCard.jsx` | Mount fade + hover shadow |
| Surface kartı | `PageHeader.jsx` → `SurfaceCard` | Mount fade |

**Uygulanan sayfalar:** DashboardShell (tüm route'lar), Übersicht KPI, Vermögen KPI, Anleihen KPI/charts, Notifications, Orders (mobil).

---

## Faz 2 — Tab, chart, loading ✅

| Bileşen | Dosya | Açıklama |
|---------|-------|----------|
| Tab panel | `motion/DashboardTabPanel.jsx` | Tab/segment değişiminde fade |
| Content reveal | `motion/DashboardContentReveal.jsx` | Skeleton → içerik crossfade |
| Panel shell | `motion/DashboardPanel.jsx` | Section/chart kart mount |

**Uygulanan:** Uebersicht, Aktien, Gesamtuebersicht, Flex/Fest/Tagesgeld, Depot, UnifiedPositionsTable.

---

## Faz 3 — Mikro-etkileşim ✅

| Hedef | Durum | Not |
|-------|-------|-----|
| Hero € count-up | ✅ | Gesamtuebersicht, HeroBanner, Depot |
| Liste auto-animate | ✅ | Depot, Orders, Support, Handeln, ContractsTable |
| IpoPage stagger | ✅ | DashboardStagger + ContentReveal |
| AnimatedNumber KPI | ✅ | Aktien Marktwert, Depot Gesamt |
| Tablo satır hover | ✅ | ContractsTable `transition-colors` |
| Donut slice tween | ✅ | EditorialDonut `motion.path` hover |

---

## Faz 4 — Opsiyonel ✅

| Hedef | Kütüphane | Durum | Not |
|-------|-----------|-------|-----|
| HeroBanner giriş | framer-motion | ✅ | Mount fade + AnimatedNumber |
| Handeln tablo | auto-animate | ✅ | Desktop tbody |
| Tab pill layoutId | framer-motion | ✅ | PortfolioTabs |
| StockDetail trade panel | DashboardStagger + Panel | ✅ | Sağ kolon: position, form, widgets |
| Profile section | DashboardTabPanel + Stagger | ✅ | Profil sekmeleri |
| Visx chart crossfade | VisxChartFade | ✅ | PortfolioHeroChart range/mode |
| Recharts area tween | recharts | ✅ | PerformanceBenchmarkChart |
| Empty state Lottie | lottie-react | ✅ | ChartEmpty `lottie` prop, `empty-chart.json` |

---

## Animasyon yapma listesi

- MarketTicker (zaten hareketli)
- Trading canlı fiyat tick'leri
- Her beyaz kutuya stagger (gürültü)
- 500ms+ süreler

---

## Kullanım örnekleri

```jsx
import { DashboardStagger, DashboardStaggerItem, DashboardTabPanel, DashboardPanel } from '@/components/dashboard/motion';
import useAutoAnimateRef from '@/hooks/useAutoAnimateRef';
import ChartEmpty from '@/components/dashboard/charts/ChartEmpty';

// Empty state with Lottie (respects reduced-motion)
<ChartEmpty height={240} hint="Keine Daten." lottie />

// Visx chart data change
import VisxChartFade from '@/components/dashboard/charts/visx/VisxChartFade';
<VisxChartFade chartKey={`${mode}-${points.length}`}>
  <AreaClosed ... />
</VisxChartFade>
```

---

## Dosya haritası

```
src/components/dashboard/motion/
  dashboardMotion.js
  DashboardPageTransition.jsx
  DashboardStagger.jsx
  DashboardTabPanel.jsx
  DashboardContentReveal.jsx
  DashboardPanel.jsx
  index.js

src/components/dashboard/charts/
  ChartEmpty.jsx          — optional lottie
  visx/VisxChartFade.jsx  — chart data crossfade
  EditorialDonut.jsx      — motion.path slice hover

src/assets/lottie/empty-chart.json
src/hooks/useAutoAnimateRef.js
```

---

## Bakım notları

- `useAutoAnimateRef` cleanup: `controller.destroy()`
- Hook'lar state'ten **sonra** çağrılmalı
- `ChartEmpty lottie` — reduced-motion'da Lucide ikona düşer
- `motion.path` `d` animasyonu — slice hover için EditorialDonut'ta kullanılır
