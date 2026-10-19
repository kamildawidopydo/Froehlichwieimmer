import React, { useMemo } from 'react';
import { useDashboardData } from '@/context/DashboardDataContext';
import { formatEUR, formatEURSigned } from '@/lib/dashboardFormatters';
import { cn } from '@/lib/utils';

/**
 * Ertraege — kompakte editorial Card mit drei Ertragsarten für /mein-depot.
 *
 * Ertragsarten (KEINE Dividenden — es existieren keine user-bezogenen
 * Dividendendaten im DashboardDataContext; deshalb bewusst weggelassen):
 *
 *   1) Aufgelaufene Zinsen (Zinsanlagen)
 *      → `portfolioAggregate.accruedGrossTotal`  (bestehend)
 *   2) Jährliche Kupons (Anleihen, planmäßig, brutto)
 *      → Σ `activeBonds.nominal_betrag * kupon_rate / 100`
 *   3) Realisierte Ergebnisse (Aktien-Handel)
 *      → `realizedPnlTotal`  (bestehend)
 *
 * KEINE neuen Steuerabzüge, KEINE neue Zinsformel. Nur Anzeige.
 * Kupon-Wert ist ausdrücklich als „geplant p.a., brutto" gelabelt — kein
 * ausgezahlter Wert, damit keine Verwechslung mit Ist-Ausschüttungen entsteht.
 */

const Card = ({ label, value, sub, tone = 'neutral', testId }) => (
  <div data-testid={testId} className="border-t border-bank-border/60 pt-5">
    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-bank-text-muted">{label}</p>
    <p
      className={cn(
        'rate-figure mt-1 truncate text-[1.4rem] leading-[1.1] tabular-nums sm:text-[1.55rem]',
        tone === 'pos' && 'text-emerald-700',
        tone === 'neg' && 'text-rose-700',
        tone === 'neutral' && 'text-bank-text',
        tone === 'muted' && 'text-bank-text-muted',
      )}
    >
      {value}
    </p>
    {sub && <p className="mt-1 text-[11.5px] leading-tight text-bank-text-muted">{sub}</p>}
  </div>
);

const Ertraege = () => {
  const { loading, portfolioAggregate, activeBonds, realizedPnlTotal, activeContracts } = useDashboardData();

  const values = useMemo(() => {
    const accrued = Number(portfolioAggregate?.accruedGrossTotal || 0);
    const kupons = (activeBonds || []).reduce((sum, b) => {
      const nom = Number(b.nominal_betrag || 0);
      const rate = Number(b.kupon_rate || 0);
      return sum + (nom * rate) / 100;
    }, 0);
    const realized = Number(realizedPnlTotal || 0);
    return {
      accrued,
      kupons,
      realized,
      hasContracts: (activeContracts || []).length > 0,
      hasBonds: (activeBonds || []).length > 0,
    };
  }, [portfolioAggregate, activeBonds, realizedPnlTotal, activeContracts]);

  return (
    <section aria-labelledby="mein-depot-ertraege-title" data-testid="mein-depot-ertraege" className="mb-14">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-text-muted">Erträge</p>
      <h2
        id="mein-depot-ertraege-title"
        className="mt-2 font-display text-[1.4rem] font-light tracking-[-0.01em] text-bank-text sm:text-[1.55rem]"
      >
        Zinsen, Kupons und realisierte Ergebnisse
      </h2>

      {loading ? (
        <div data-testid="mde-skeleton" className="mt-5 h-[120px] animate-pulse rounded-sm bg-bank-border/25" />
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-3">
          <Card
            label="Aufgelaufene Zinsen"
            value={values.hasContracts ? formatEURSigned(values.accrued) : '—'}
            sub={values.hasContracts ? 'Zinsanlagen (Fest-/Tages-/Flexgeld, brutto)' : 'Noch keine Zinsanlagen'}
            tone={values.hasContracts && values.accrued > 0 ? 'pos' : 'muted'}
            testId="mde-accrued"
          />
          <Card
            label="Kupons p.a."
            value={values.hasBonds ? formatEUR(values.kupons) : '—'}
            sub={values.hasBonds ? 'Planmäßiger Kupon je Jahr, brutto' : 'Noch keine Anleihen'}
            tone="neutral"
            testId="mde-kupons"
          />
          <Card
            label="Realisierte Ergebnisse"
            value={values.realized !== 0 ? formatEURSigned(values.realized) : '0,00 €'}
            sub="Aus ausgeführten Verkaufs-Orders"
            tone={values.realized > 0 ? 'pos' : values.realized < 0 ? 'neg' : 'neutral'}
            testId="mde-realized"
          />
        </div>
      )}
    </section>
  );
};

export default Ertraege;
