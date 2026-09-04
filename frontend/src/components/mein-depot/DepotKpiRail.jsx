import React, { useMemo } from 'react';
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

const DepotKpiRail = () => {
  const {
    loading,
    depotEinstand,
    depotGV,
    bondsEinstand,
    bondsGV,
    dailyPortfolioPnl,
    cashBalance,
    stockMetrics,
    activeBonds,
    dashboardFetchHadFailure,
  } = useDashboardData();
  // Wenn technischer Fetch-Fehler UND alle Bestandswerte 0 → Werte als „—"
  // anzeigen statt suggestive „0,00 €" — differenziert von echtem leeren Depot.
  const uncertain = !!dashboardFetchHadFailure &&
    Number(cashBalance || 0) === 0 &&
    (stockMetrics || []).length === 0 &&
    (activeBonds || []).length === 0;

  const kpis = useMemo(() => {
    const wpEinstand = Number(depotEinstand || 0) + Number(bondsEinstand || 0);
    const wpGV = Number(depotGV || 0) + Number(bondsGV || 0);
    const wpGVPct = wpEinstand > 0 ? (wpGV / wpEinstand) * 100 : null;
    const gvUp = wpGV >= 0;

    const stockCount = (stockMetrics || []).length;
    const bondCount = (activeBonds || []).length;
    const posTotal = stockCount + bondCount;

    const dailyPnl = Number(dailyPortfolioPnl || 0);
    const dailyKnown = stockCount > 0; // sonst keine Bezugsgröße
    const dailyUp = dailyPnl >= 0;

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
            'Kein Wertpapier-Einstand hinterlegt'
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
      // 3. Heute (nur Aktien-Delta aus stock_prices_cache.change_abs)
      heute: {
        primary: dailyKnown ? formatEURSigned(dailyPnl) : '—',
        tone: dailyKnown ? (dailyUp ? 'pos' : 'neg') : 'muted',
        secondary: dailyKnown
          ? 'Tagesveränderung Aktien-Positionen'
          : 'Keine Aktien-Positionen im Depot',
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
    dailyPortfolioPnl,
    cashBalance,
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
