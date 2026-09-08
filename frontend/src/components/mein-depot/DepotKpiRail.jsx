import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, YAxis } from 'recharts';
import { useDashboardData } from '@/context/DashboardDataContext';
import { formatEUR, formatEURSigned } from '@/lib/dashboardFormatters';
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
        tone === 'pos' && 'text-emerald-700',
        tone === 'neg' && 'text-rose-700',
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
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={strokeColor}
                  strokeWidth={1.6}
                  dot={false}
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
    depotEinstand,
    depotGV,
    bondsEinstand,
    bondsGV,
    cashBalance,
    stockMetrics,
    activeBonds,
    dashboardFetchHadFailure,
    portfolioSummary,
    refreshPortfolioSummary,
    heroSnapshots,
  } = useDashboardData();

  // Session 82.24 · Depot Phase 4B-Final — serverseitige Summary beim Mount ziehen.
  useEffect(() => {
    refreshPortfolioSummary?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wenn technischer Fetch-Fehler UND alle Bestandswerte 0 → Werte als „—"
  // anzeigen statt suggestive „0,00 €" — differenziert von echtem leeren Depot.
  const uncertain = !!dashboardFetchHadFailure &&
    Number(cashBalance || 0) === 0 &&
    (stockMetrics || []).length === 0 &&
    (activeBonds || []).length === 0;

  const kpis = useMemo(() => {
    // Session 82.24 · Server-Summary als Source of Truth (Fallback: Frontend-Aggregation).
    const s = portfolioSummary;
    const useServer = !!s;
    const stocksMV = useServer ? Number(s.stocks?.market_value ?? 0) : Number(depotGV || 0) + Number(depotEinstand || 0);
    const stocksCost = useServer ? Number(s.stocks?.cost_basis ?? 0) : Number(depotEinstand || 0);
    const bondsCost = Number(bondsEinstand || 0);
    const wpEinstand = useServer ? stocksCost + bondsCost : Number(depotEinstand || 0) + bondsCost;
    const wpGV = useServer ? Number(s.profit_loss ?? 0) + Number(bondsGV || 0) : Number(depotGV || 0) + Number(bondsGV || 0);
    const wpGVPct = wpEinstand > 0 ? (wpGV / wpEinstand) * 100 : null;
    const gvUp = wpGV >= 0;

    const stockCount = useServer ? Number(s.stocks?.positions ?? 0) : (stockMetrics || []).length;
    const bondCount = useServer ? Number(s.bonds?.positions ?? 0) : (activeBonds || []).length;
    const posTotal = stockCount + bondCount;

    // Session 82.38 · „Heute" nur aus echten Portfolio-Snapshots (2+ Tage), keine Intraday-Simulation.
    const snapDelta = computeSnapshotDayChange(heroSnapshots);
    const stocksValIncomplete = useServer && s.stocks?.valuation_complete === false;

    return {
      // 1. Investiert
      investiert: {
        primary: wpEinstand > 0 ? formatEUR(wpEinstand) : '—',
        secondary:
          wpEinstand > 0
            ? 'Aktien- und Anleihen-Einstand'
            : 'Noch keine Wertpapiere im Depot',
      },
      // 2. Gesamt G/V
      gv: {
        primary: wpEinstand > 0 ? formatEURSigned(wpGV) : '—',
        tone: wpEinstand > 0 ? (gvUp ? 'pos' : 'neg') : 'muted',
        secondary:
          wpGVPct == null ? (
            stocksValIncomplete
              ? 'Kurse teilweise nicht verfügbar'
              : 'Kein Wertpapier-Einstand hinterlegt'
          ) : (
            <span className="inline-flex items-center gap-1 tabular-nums">
              {gvUp ? (
                <ArrowUpRight size={12} strokeWidth={1.6} aria-hidden />
              ) : (
                <ArrowDownRight size={12} strokeWidth={1.6} aria-hidden />
              )}
              <span aria-hidden>{gvUp ? '+' : ''}</span>
              <span className="sr-only">
                {gvUp ? 'positiv ' : 'negativ '}
              </span>
              {wpGVPct.toFixed(2).replace('.', ',')} % Wertpapiere
            </span>
          ),
      },
      // 3. Heute — Tages-Delta aus echten Portfolio-Snapshots (Session 82.38).
      // 0 Snapshots → „—"; 1 Snapshot → „Noch kein Vergleichswert";
      // 2+ mit valuation_complete=false → „—" + Hinweis („keine scheinpräzise Performance");
      // 2+ vollständig → abs + optional % (null wenn previous.total_value ≤ 0).
      heute: (() => {
        if (snapDelta.count === 0) {
          return { primary: '—', tone: 'muted', secondary: 'Noch kein Depot-Snapshot vorhanden' };
        }
        if (snapDelta.count === 1) {
          return { primary: '—', tone: 'muted', secondary: 'Noch kein Vergleichswert vom Vortag' };
        }
        if (snapDelta.incomplete) {
          return {
            primary: '—',
            tone: 'muted',
            secondary: 'Bewertung unvollständig — Vergleich nicht verlässlich',
          };
        }
        const dayUp = (snapDelta.absolute || 0) >= 0;
        const absTxt = formatEURSigned(snapDelta.absolute);
        return {
          primary: absTxt,
          tone: snapDelta.absolute === 0 ? 'neutral' : dayUp ? 'pos' : 'neg',
          secondary: (
            <span className="inline-flex items-center gap-1 tabular-nums">
              {snapDelta.absolute === 0 ? null : dayUp ? (
                <ArrowUpRight size={12} strokeWidth={1.6} aria-hidden />
              ) : (
                <ArrowDownRight size={12} strokeWidth={1.6} aria-hidden />
              )}
              {snapDelta.pct == null ? (
                <span>Vs. Vortag · % nicht berechenbar</span>
              ) : (
                <>
                  <span aria-hidden>{dayUp && snapDelta.absolute !== 0 ? '+' : ''}</span>
                  <span className="sr-only">
                    {dayUp ? 'positiv ' : 'negativ '}
                  </span>
                  <span>{snapDelta.pct.toFixed(2).replace('.', ',')} % vs. Vortag</span>
                </>
              )}
            </span>
          ),
        };
      })(),
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
            : `${stockCount} Aktien · ${bondCount} Anleihen`,
      },
    };
  }, [
    depotEinstand,
    depotGV,
    bondsEinstand,
    bondsGV,
    stockMetrics,
    activeBonds,
    cashBalance,
    heroSnapshots,
    portfolioSummary,
    uncertain,
  ]);

  if (loading) {
    return (
      <section
        aria-label="Kennzahlen werden geladen"
        data-testid="mein-depot-kpi-rail-skeleton"
        className="mb-12 grid grid-cols-2 gap-x-8 gap-y-8 lg:grid-cols-5"
      >
        {[0, 1, 2, 3, 4].map((i) => (
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
      className="mb-12 grid grid-cols-2 gap-x-8 gap-y-8 lg:grid-cols-5"
    >
      <KpiCell label="Investiert" primary={kpis.investiert.primary} secondary={kpis.investiert.secondary} testId="kpi-investiert" />
      <KpiCell label="Gesamt G/V" primary={kpis.gv.primary} secondary={kpis.gv.secondary} tone={kpis.gv.tone} testId="kpi-gv" />
      <KpiCell
        label="Heute"
        primary={kpis.heute.primary}
        secondary={kpis.heute.secondary}
        tone={kpis.heute.tone}
        testId="kpi-heute"
        footer={<HeuteSparklineFooter heroSnapshots={heroSnapshots} />}
      />
      <KpiCell label="Liquidität" primary={kpis.cash.primary} secondary={kpis.cash.secondary} tone={kpis.cash.tone} testId="kpi-liquidity" />
      <KpiCell label="Positionen" primary={kpis.positionen.primary} secondary={kpis.positionen.secondary} tone={kpis.positionen.tone} testId="kpi-positionen" />
    </section>
  );
};

export default DepotKpiRail;
