import React, { useEffect, useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
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

const KpiCell = ({ label, primary, secondary, tone = 'neutral', testId }) => (
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
      <KpiCell label="Heute" primary={kpis.heute.primary} secondary={kpis.heute.secondary} tone={kpis.heute.tone} testId="kpi-heute" />
      <KpiCell label="Liquidität" primary={kpis.cash.primary} secondary={kpis.cash.secondary} tone={kpis.cash.tone} testId="kpi-liquidity" />
      <KpiCell label="Positionen" primary={kpis.positionen.primary} secondary={kpis.positionen.secondary} tone={kpis.positionen.tone} testId="kpi-positionen" />
    </section>
  );
};

export default DepotKpiRail;
