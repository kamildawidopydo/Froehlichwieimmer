import React, { useMemo } from 'react';
import { useDashboardData } from '@/context/DashboardDataContext';
import { formatEUR } from '@/lib/dashboardFormatters';
import { cn } from '@/lib/utils';

/**
 * AnlageklassenDetail — detaillierte horizontale Aufteilung der 4 Anlageklassen
 * (Aktien / Anleihen / Zinsanlagen / Liquidität).
 *
 * Datenquelle: bestehende Aggregate aus DashboardDataContext
 *   - depotWert        (Aktien-Marktwert)
 *   - bondsMarktwert   (Anleihen-Marktwert, EUR)
 *   - contractsTotal   (Festgeld+Tagesgeld+Flexgeld, EUR)
 *   - cashBalance      (Cash-Guthaben, EUR)
 *   - gesamtvermoegen  (Summe obiger vier; einzige belastbare Gesamtbasis)
 *
 * Anteil = classValue / gesamtvermoegen * 100.
 * Aktien-Marktwert kann FX-belastet sein (Phase-12 Punkt 16). Da beide (Klasse
 * und Gesamt) mit demselben Bias summiert werden, ist der Anteil intern
 * konsistent. Trotzdem: wenn `gesamtvermoegen <= 0`, wird pro Zeile „—" gezeigt.
 *
 * Duplikatvermeidung: Diese Detailansicht ersetzt NICHT den kompakten Donut aus
 * Schritt 2 — sie ergänzt ihn. Design ist bewusst textbasiert (Balken + %),
 * ohne konkurrierende Neuberechnung.
 *
 * Farbe ist NICHT einziger Informations-Träger — Text-Label + Betrag + Prozent
 * immer sichtbar.
 */

const CLASSES = [
  { key: 'stocks',    label: 'Aktien',       tone: 'bg-bank-primary' },
  { key: 'bonds',     label: 'Anleihen',     tone: 'bg-emerald-600' },
  { key: 'contracts', label: 'Zinsanlagen',  tone: 'bg-bank-gold' },
  { key: 'cash',      label: 'Liquidität',   tone: 'bg-slate-500' },
];

const AnlageklassenDetail = () => {
  const {
    loading,
    depotWert,
    bondsMarktwert,
    contractsTotal,
    cashBalance,
    gesamtvermoegen,
    stockMetrics,
    activeBonds,
    activeContracts,
  } = useDashboardData();

  const totals = useMemo(() => {
    const stocks    = Number(depotWert || 0);
    const bonds     = Number(bondsMarktwert || 0);
    const contracts = Number(contractsTotal || 0);
    const cash      = Number(cashBalance || 0);
    const grand     = Number(gesamtvermoegen || 0);
    return {
      stocks:    { value: stocks,    count: (stockMetrics    || []).length },
      bonds:     { value: bonds,     count: (activeBonds     || []).length },
      contracts: { value: contracts, count: (activeContracts || []).length },
      cash:      { value: cash,      count: null },
      grand,
    };
  }, [depotWert, bondsMarktwert, contractsTotal, cashBalance, gesamtvermoegen, stockMetrics, activeBonds, activeContracts]);

  const hasAnything = totals.stocks.value > 0 || totals.bonds.value > 0 || totals.contracts.value > 0 || totals.cash.value > 0;

  return (
    <section
      aria-labelledby="mein-depot-anlageklassen-title"
      data-testid="mein-depot-anlageklassen"
      className="mb-14"
    >
      <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-text-muted">
        Meine Anlageklassen
      </p>
      <h2
        id="mein-depot-anlageklassen-title"
        className="mt-2 font-display text-[1.4rem] font-light tracking-[-0.01em] text-bank-text sm:text-[1.55rem]"
      >
        Wie sich Ihr Vermögen aufteilt
      </h2>

      <div className="mt-5">
        {loading ? (
          <div data-testid="mdk-skeleton" className="h-[220px] animate-pulse rounded-sm bg-bank-border/25" />
        ) : !hasAnything ? (
          <div data-testid="mdk-empty" className="rounded-sm border border-dashed border-bank-border px-6 py-10 text-center">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-bank-text-muted">Noch keine Aufteilung</p>
            <p className="mt-3 text-[14px] font-medium text-bank-text">Noch keine Anlageklassen im Depot.</p>
          </div>
        ) : (
          <ul className="divide-y divide-bank-border/60 rounded-sm border border-bank-border bg-white">
            {CLASSES.map((c) => {
              const t = totals[c.key];
              const share = totals.grand > 0 ? (t.value / totals.grand) * 100 : null;
              const shareTxt = share != null ? `${share.toFixed(1).replace('.', ',')} %` : '—';
              const barWidth = share != null ? Math.max(0, Math.min(100, share)) : 0;
              return (
                <li key={c.key} data-testid={`mdk-row-${c.key}`} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <p className="text-[14px] font-medium text-bank-text">{c.label}</p>
                    <p className="tabular-nums text-[14px] font-semibold text-bank-text">{formatEUR(t.value)}</p>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-[6px] flex-1 rounded-sm bg-bank-border/40">
                      <div
                        className={cn('h-full rounded-sm transition-all', c.tone)}
                        style={{ width: `${barWidth}%` }}
                        aria-hidden
                      />
                    </div>
                    <p className="font-mono text-[11px] tabular-nums text-bank-text-muted min-w-[3.5rem] text-right">
                      {shareTxt}
                    </p>
                  </div>
                  {t.count != null && (
                    <p className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
                      {t.count === 0 ? 'Keine Positionen' : `${t.count} ${t.count === 1 ? 'Position' : 'Positionen'}`}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};

export default AnlageklassenDetail;
