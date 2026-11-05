import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, YAxis, Tooltip } from 'recharts';
import { useDashboardData } from '@/context/DashboardDataContext';
import { formatEUR, formatEURSigned, pnlToneKey } from '@/lib/dashboardFormatters';
import { buildDepotRows, computeDepotTotals, pctTxt } from '@/lib/depotRows';
import { cn } from '@/lib/utils';

/**
 * DepotKpiRail — 5 professionelle KPIs unter dem DepotHero (/mein-depot Schritt 2/7).
 *
 * KPIs & Datenherkunft:
 *  1. Investiert       ← depotEinstand + bondsEinstand  (B — beide vorhanden)
 *  2. Gesamt G/V       ← depotGV + bondsGV  (B) + % vs. Wertpapier-Einstand
 *                        Wenn Einstand=0 → "—" (nicht 0,00 €)
 *  3. Heute            ← dailyPortfolioPnl (A, nur Aktien-Teil, klar im Sub gelabelt)
 *                        Wenn 0 Aktien-Positionen → "—"
 *  4. Liquidität       ← cashBalance (A, direkt aus profiles.cash_balance)
 *  5. Positionen       ← stockMetrics.length + activeBonds.length (B)
 *                        Watchlist explizit NICHT gezählt (per Vorgabe)
 *                        Verträge werden separat als Anlagegefäße geführt und
 *                        nicht als "Depotposition" — entspricht bestehender
 *                        Trennung in DepotPage (Zeilen 146/154).
 *
 * Bewusst NICHT dargestellt (Kategorie C):
 *  - "Ausschüttungen" — es gibt keine dedizierte Dividenden-/Kupon-
 *    Ausschüttungshistorie pro User im aktuellen DashboardDataContext.
 *    (realizedPnlTotal ist realisierter Aktien-Handels-P&L, KEIN
 *    Ausschüttungswert. Bond-Kupon × Nominal ist geplant, nicht ausgezahlt.)
 *    Erst mit dedizierter Datenquelle in einem Folge-Schritt einführen.
 *
 * Null vs. Missing (Vorgabe §14):
 *  - Echter 0,00 € Wert (z. B. Cash=0) → "0,00 €"
 *  - Fehlende Berechnungsbasis (z. B. kein Einstand für G/V %) → "—"
 *
 * Farbe ist NIE einziger Info-Träger für G/V — immer zusätzlich "+" / "−" + Icon + Textlabel.
 */

const KPI_BASE =
  'group flex min-w-0 flex-col gap-1 border-t border-bank-border/70 pt-5';

const KpiCell = ({ label, primary, secondary, tone = 'neutral', testId, footer }) => (
  <div className={KPI_BASE} data-testid={testId}>
    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-bank-text-muted">
      {label}
    </p>
    <p
      className={cn(
        'rate-figure mt-1 truncate text-[1.4rem] leading-[1.1] tabular-nums sm:text-[1.55rem]',
        tone === 'pos' && 'text-bank-success',
        tone === 'neg' && 'text-bank-error',
        tone === 'neutral' && 'text-bank-text',
        tone === 'muted' && 'text-bank-text-muted',
      )}
    >
      {primary}
    </p>
    {secondary && (
      <div className="mt-0.5 min-h-[16px] text-[11.5px] leading-tight text-bank-text-muted">
        {secondary}
      </div>
    )}
    {footer}
  </div>
);

// Session 82.38 · Tages-Delta ausschließlich aus echten Portfolio-Snapshots.
// Frontend berechnet nur abs/pct; Backend bleibt Source of Truth für die Snapshot-Werte.
export const computeSnapshotDayChange = (heroSnapshots) => {
  const sorted = [...(heroSnapshots || [])]
    .filter((s) => s && s.snapshot_date && s.total_value != null)
    .sort((a, b) => String(a.snapshot_date).localeCompare(String(b.snapshot_date)));
  const n = sorted.length;
  if (n === 0) return { count: 0, absolute: null, pct: null, incomplete: false, latest: null, previous: null };
  if (n === 1) return { count: 1, absolute: null, pct: null, incomplete: false, latest: sorted[0], previous: null };
  const latest = sorted[n - 1];
  const previous = sorted[n - 2];
  const incomplete =
    latest.stocks_valuation_complete === false ||
    latest.bonds_valuation_complete === false ||
    previous.stocks_valuation_complete === false ||
    previous.bonds_valuation_complete === false;
  const prevTotal = Number(previous.total_value);
  const latestTotal = Number(latest.total_value);
  const absolute = latestTotal - prevTotal;
  const pct = prevTotal > 0 ? (absolute / prevTotal) * 100 : null;
  return { count: n, absolute, pct, incomplete, latest, previous };
};

// Session 82.41 · Reine, testbare Trend-Selektion für 7T/30T-Sparkline.
// Ausschließlich echte persistierte Snapshots. Kein Backfill, keine Interpolation,
// keine synthetischen Zwischenpunkte. Deduping über snapshot_date (letzter gewinnt).
// Kalendertage-Fenster relativ zum letzten Snapshot (nicht relativ zu now, um DST-
// und Zeitzonen-Artefakte zu vermeiden — die snapshot_date-Reihe ist authoritative).
export const computeSnapshotTrend = (heroSnapshots, range /* '7d' | '30d' */) => {
  const rangeDays = range === '30d' ? 30 : 7;
  const dedup = new Map();
  (heroSnapshots || []).forEach((s) => {
    if (!s || !s.snapshot_date || s.total_value == null) return;
    const v = Number(s.total_value);
    if (!Number.isFinite(v)) return;
    // Duplicate snapshot_date → letzter Eintrag gewinnt (deterministisch).
    dedup.set(String(s.snapshot_date), s);
  });
  const sorted = [...dedup.values()].sort((a, b) =>
    String(a.snapshot_date).localeCompare(String(b.snapshot_date)),
  );
  if (sorted.length === 0) {
    return { count: 0, points: [], absolute: null, pct: null, direction: 'neutral', incomplete: false };
  }
  const latest = sorted[sorted.length - 1];
  // Kalender-Fenster: alle snapshot_date >= (latest.snapshot_date - rangeDays + 1).
  const latestDate = new Date(`${String(latest.snapshot_date).slice(0, 10)}T00:00:00Z`);
  const cutoff = new Date(latestDate.getTime() - (rangeDays - 1) * 86400000);
  const cutoffISO = cutoff.toISOString().slice(0, 10);
  const windowed = sorted.filter((s) => String(s.snapshot_date).slice(0, 10) >= cutoffISO);
  if (windowed.length === 0) {
    return { count: 0, points: [], absolute: null, pct: null, direction: 'neutral', incomplete: false };
  }
  const incomplete = windowed.some(
    (s) => s.stocks_valuation_complete === false || s.bonds_valuation_complete === false,
  );
  const points = windowed.map((s) => ({
    date: String(s.snapshot_date).slice(0, 10),
    value: Number(s.total_value),
  }));
  if (points.length < 2) {
    return { count: points.length, points, absolute: null, pct: null, direction: 'neutral', incomplete };
  }
  const first = points[0].value;
  const last = points[points.length - 1].value;
  const absolute = last - first;
  const pct = first > 0 ? (absolute / first) * 100 : null;
  const direction = absolute === 0 ? 'neutral' : absolute > 0 ? 'pos' : 'neg';
  return { count: points.length, points, absolute, pct, direction, incomplete };
};

// Session 82.49 · Dezenter Sparkline-Tooltip.
// Nutzt ausschließlich den aktiven Recharts-Datenpunkt aus `payload` — keine
// Interpolation, kein Access auf Snapshot-Daten außerhalb des tatsächlich
// existierenden Punkts. Rendert nichts, wenn kein aktiver Punkt.
const SPARKLINE_TOOLTIP_DATE_FMT = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC', // snapshot_date ist ein Kalendertag ohne Zeitzone
});

const SparklineTooltip = ({ active, payload }) => {
  if (!active || !Array.isArray(payload) || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point || point.date == null || point.value == null) return null;
  const dateISO = String(point.date).slice(0, 10);
  let dateLabel = dateISO;
  try {
    // ISO-Kalendertag (YYYY-MM-DD) → deutsches Datum (DD.MM.YYYY).
    const asDate = new Date(`${dateISO}T00:00:00Z`);
    if (!Number.isNaN(asDate.getTime())) {
      dateLabel = SPARKLINE_TOOLTIP_DATE_FMT.format(asDate);
    }
  } catch {
    // Fallback: ISO-String belassen.
  }
  return (
    <div
      role="tooltip"
      data-testid="heute-trend-tooltip"
      className="pointer-events-none max-w-[180px] rounded-sm border border-bank-border bg-white/95 px-2 py-1.5 text-left shadow-editorial-sm backdrop-blur-sm"
    >
      <p
        className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-bank-text-muted"
        data-testid="heute-trend-tooltip-label"
      >
        Depotwert
      </p>
      <p
        className="mt-0.5 truncate font-mono text-[11px] tabular-nums text-bank-text"
        data-testid="heute-trend-tooltip-date"
      >
        {dateLabel}
      </p>
      <p
        className="truncate text-[12px] font-semibold tabular-nums text-bank-text"
        data-testid="heute-trend-tooltip-value"
      >
        {formatEUR(Number(point.value))}
      </p>
    </div>
  );
};

const HeuteSparklineFooter = ({ heroSnapshots }) => {
  const [range, setRange] = useState('7d');
  const trend = useMemo(() => computeSnapshotTrend(heroSnapshots, range), [heroSnapshots, range]);
  const strokeColor =
    trend.incomplete || trend.direction === 'neutral'
      ? 'rgb(148 163 184)' // slate-400 (neutral, keine scheinpräzise Performance-Farbe)
      : trend.direction === 'pos'
        ? 'rgb(4 120 87)' // emerald-700
        : 'rgb(190 18 60)'; // rose-700
  const isPos = trend.direction === 'pos';

  return (
    <div className="mt-2.5 flex flex-col gap-1" data-testid="heute-sparkline-block">
      <p className="text-[11px] font-semibold text-bank-text" data-testid="heute-trend-caption">
        Verlauf Depotwert inkl. Liquidität (Tagesstände)
      </p>
      <p className="text-[10.5px] leading-snug text-bank-text-muted" data-testid="heute-trend-basis">
        Liquidität + Aktien zum Börsenkurs + Anleihen. Ohne IPO-Schätzungen und Zinsanlagen. Verändert sich auch durch Ein- und Auszahlungen – keine reine Kursentwicklung.
      </p>
      <div className="inline-flex gap-1" role="tablist" aria-label="Trend-Zeitraum">
        {['7d', '30d'].map((r) => (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={range === r}
            onClick={() => setRange(r)}
            data-testid={`heute-trend-range-${r}`}
            className={cn(
              'rounded-sm border px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] transition-colors',
              range === r
                ? 'border-bank-text bg-bank-text text-white'
                : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-text/50',
            )}
          >
            {r === '7d' ? '7 T' : '30 T'}
          </button>
        ))}
      </div>
      {trend.count === 0 ? (
        <p className="text-[11px] text-bank-text-muted" data-testid="heute-trend-empty">
          Noch keine Verlaufsdaten
        </p>
      ) : trend.count === 1 ? (
        <p className="text-[11px] text-bank-text-muted" data-testid="heute-trend-insufficient">
          Noch nicht genügend Verlaufsdaten
        </p>
      ) : trend.incomplete ? (
        <p className="text-[11px] text-bank-text-muted" data-testid="heute-trend-incomplete">
          Bewertung unvollständig
        </p>
      ) : (
        <>
          <div className="-mx-1 h-8 w-full" data-testid="heute-trend-sparkline">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend.points} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                <YAxis hide domain={['dataMin', 'dataMax']} />
                <Tooltip
                  content={<SparklineTooltip />}
                  cursor={{ stroke: 'rgb(148 163 184)', strokeWidth: 0.75, strokeDasharray: '2 2' }}
                  offset={10}
                  allowEscapeViewBox={{ x: false, y: true }}
                  wrapperStyle={{ zIndex: 20, outline: 'none' }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={strokeColor}
                  strokeWidth={1.6}
                  dot={false}
                  activeDot={{ r: 2.5, strokeWidth: 0, fill: strokeColor }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p
            className={cn(
              'font-mono text-[10.5px] tabular-nums',
              trend.direction === 'pos' && 'text-emerald-700',
              trend.direction === 'neg' && 'text-rose-700',
              trend.direction === 'neutral' && 'text-bank-text-muted',
            )}
            data-testid="heute-trend-delta"
          >
            {trend.absolute === 0
              ? '±0,00 €'
              : `${isPos ? '+' : ''}${formatEURSigned(trend.absolute)}`}
            {trend.pct != null
              ? ` · ${isPos && trend.absolute !== 0 ? '+' : ''}${trend.pct.toFixed(2).replace('.', ',')} %`
              : ''}
          </p>
        </>
      )}
    </div>
  );
};

const DepotKpiRail = () => {
  const {
    loading,
    cashBalance,
    stockMetrics,
    stockPriceMap,
    activeBonds,
    computeBondMetrics,
    dashboardFetchHadFailure,
    heroSnapshots,
  } = useDashboardData();

  // Wenn technischer Fetch-Fehler UND alle Bestandswerte 0 → Werte als „—"
  // anzeigen statt suggestive „0,00 €" — differenziert von echtem leeren Depot.
  const uncertain = !!dashboardFetchHadFailure &&
    Number(cashBalance || 0) === 0 &&
    (stockMetrics || []).length === 0 &&
    (activeBonds || []).length === 0;

  const kpis = useMemo(() => {
    // Same rows + price snapshot as the Depotübersicht (no separate server summary).
    const rows = buildDepotRows({ stockMetrics, stockPriceMap, bondPositions: activeBonds || [], computeBondMetrics });
    const t = computeDepotTotals(rows);
    const stockCount = rows.filter((r) => r.kind !== 'bond').length;
    const bondCount = rows.length - stockCount;
    const posTotal = rows.length;
    const unvaluedNote = t.unvaluedCount > 0 ? ` · ${t.unvaluedCount} mit Ersatzbewertung (Einstand)` : '';

    return {
      hasPositions: posTotal > 0,
      investiert: {
        primary: t.cost > 0 ? formatEUR(t.cost) : '—',
        secondary: t.cost > 0 ? 'Einstand Aktien, IPO und Anleihen' : 'Noch keine Wertpapiere im Depot',
      },
      gv: {
        primary: t.hasValued ? formatEURSigned(t.gv) : '—',
        tone: t.hasValued ? pnlToneKey(t.gv) : 'muted',
        secondary: t.hasValued
          ? `${pctTxt(t.gvPct)}${t.hasIpo ? ' · inkl. IPO-Schätzung' : ''}${unvaluedNote}`
          : 'Keine Bewertung verfügbar',
      },
      listed: {
        primary: t.hasListed ? formatEURSigned(t.listedGv) : '—',
        tone: t.hasListed ? pnlToneKey(t.listedGv) : 'muted',
        secondary: t.hasListed ? `${pctTxt(t.listedGvPct)} · Aktien & Anleihen zum Marktkurs` : 'Keine börsennotierten Positionen',
      },
      heute: t.day == null
        ? { primary: '—', tone: 'muted', secondary: 'Keine aktuellen Börsenkurse' }
        : {
            primary: formatEURSigned(t.day),
            tone: pnlToneKey(t.day),
            secondary: `${pctTxt(t.dayPct)} · nur Börsenkurse, ohne IPO`,
          },
      // 4. Liquidität
      cash: {
        primary: uncertain ? '—' : formatEUR(cashBalance || 0),
        tone: uncertain ? 'muted' : 'neutral',
        secondary: uncertain ? 'Wert derzeit nicht verfügbar' : 'Verfügbares Cash-Guthaben',
      },
      // 5. Positionen (Aktien + Anleihen; Watchlist ausgeschlossen)
      positionen: {
        primary: uncertain ? '—' : posTotal.toLocaleString('de-DE'),
        tone: uncertain ? 'muted' : 'neutral',
        secondary: uncertain
          ? 'Wert derzeit nicht verfügbar'
          : posTotal === 0
            ? 'Noch keine Wertpapiere im Depot'
            : `${stockCount} Aktien/IPO · ${bondCount} Anleihen`,
      },
    };
  }, [stockMetrics, stockPriceMap, activeBonds, computeBondMetrics, cashBalance, uncertain]);

  if (loading) {
    return (
      <section
        aria-label="Kennzahlen werden geladen"
        data-testid="mein-depot-kpi-rail-skeleton"
        className="mb-12 grid grid-cols-2 gap-x-8 gap-y-8 lg:grid-cols-3 xl:grid-cols-6"
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={KPI_BASE}>
            <div className="h-3 w-16 animate-pulse rounded-sm bg-bank-border/40" />
            <div className="mt-2 h-6 w-24 animate-pulse rounded-sm bg-bank-border/50" />
            <div className="mt-2 h-3 w-32 animate-pulse rounded-sm bg-bank-border/30" />
          </div>
        ))}
      </section>
    );
  }

  return (
    <section
      aria-label="Depot-Kennzahlen"
      data-testid="mein-depot-kpi-rail"
      className="mb-12 grid grid-cols-2 gap-x-8 gap-y-8 lg:grid-cols-3 xl:grid-cols-6"
    >
      <KpiCell label="Investiert" primary={kpis.investiert.primary} secondary={kpis.investiert.secondary} testId="kpi-investiert" />
      <KpiCell label="Gesamtgewinn inkl. IPO" primary={kpis.gv.primary} secondary={kpis.gv.secondary} tone={kpis.gv.tone} testId="kpi-gv" />
      <KpiCell label="Gewinn börsennotiert" primary={kpis.listed.primary} secondary={kpis.listed.secondary} tone={kpis.listed.tone} testId="kpi-gv-listed" />
      <KpiCell
        label="Heute (Börsenkurse)"
        primary={kpis.heute.primary}
        secondary={kpis.heute.secondary}
        tone={kpis.heute.tone}
        testId="kpi-heute"
      />
      <KpiCell label="Liquidität" primary={kpis.cash.primary} secondary={kpis.cash.secondary} tone={kpis.cash.tone} testId="kpi-liquidity" />
      <KpiCell label="Positionen" primary={kpis.positionen.primary} secondary={kpis.positionen.secondary} tone={kpis.positionen.tone} testId="kpi-positionen" />
      {kpis.hasPositions && (
        <div className="col-span-2 max-w-md lg:col-span-3 xl:col-span-2" data-testid="depot-snapshot-trend">
          <HeuteSparklineFooter heroSnapshots={heroSnapshots} />
        </div>
      )}
    </section>
  );
};

export default DepotKpiRail;
