import React, { useMemo } from 'react';
import { useDashboardData } from '@/context/DashboardDataContext';
import { formatEUR, formatDate } from '@/lib/dashboardFormatters';
import { PRODUCT_LABEL } from '@/lib/dashboardMetrics';

/**
 * Faelligkeiten — kompakte Timeline anstehender Fälligkeiten für /mein-depot.
 *
 * Datenquelle: `activeContracts` (via computeContractMetrics → daysRemaining) +
 * `activeBonds` (faelligkeitsdatum). Kein Fetch, keine neue Berechnung.
 *
 * Zeiträume:
 *   - Nächste 30 Tage      (daysRemaining <= 30)
 *   - 31 bis 90 Tage       (30 < daysRemaining <= 90)
 *   - Später               (> 90 Tage)
 *
 * Anleihen ohne Fälligkeitsdatum werden übersprungen. Fälligkeiten in der
 * Vergangenheit werden nicht dargestellt (Rest-Tage < 0). Keine Prognose,
 * was danach passiert.
 */

const BUCKETS = [
  { key: '30',    label: 'Nächste 30 Tage',     max: 30 },
  { key: '31-90', label: '31 bis 90 Tage',      max: 90 },
  { key: 'later', label: 'Später',              max: Infinity },
];

const daysUntil = (iso) => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const diff = t - Date.now();
  return Math.floor(diff / 86400000);
};

const Faelligkeiten = () => {
  const { loading, activeContracts, activeBonds, computeContractMetrics } = useDashboardData();

  const items = useMemo(() => {
    const out = [];
    (activeContracts || []).forEach((c) => {
      if (!c.active_until || c.product_type === 'tagesgeld') return; // Tagesgeld hat keine harte Fälligkeit
      const m = computeContractMetrics(c);
      const rem = m.daysRemaining;
      if (rem == null || rem < 0) return;
      out.push({
        id: `c-${c.id}`,
        kind: 'contract',
        product: PRODUCT_LABEL[c.product_type] || c.product_type,
        title: c.banks?.name || 'Vertrag',
        amount: Number(c.amount_eur || 0),
        due: c.active_until,
        daysRemaining: rem,
      });
    });
    (activeBonds || []).forEach((b) => {
      const rem = daysUntil(b.faelligkeitsdatum);
      if (rem == null || rem < 0) return;
      out.push({
        id: `b-${b.id}`,
        kind: 'bond',
        product: 'Anleihe',
        title: b.bond_name || b.isin || 'Anleihe',
        amount: Number(b.nominal_betrag || 0),
        due: b.faelligkeitsdatum,
        daysRemaining: rem,
        kupon: b.kupon_rate != null ? Number(b.kupon_rate) : null,
      });
    });
    return out.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [activeContracts, activeBonds, computeContractMetrics]);

  const buckets = useMemo(() => {
    const map = { '30': [], '31-90': [], later: [] };
    items.forEach((it) => {
      if (it.daysRemaining <= 30) map['30'].push(it);
      else if (it.daysRemaining <= 90) map['31-90'].push(it);
      else map.later.push(it);
    });
    return map;
  }, [items]);

  if (loading) return null;
  if (items.length === 0) return null; // Section ausblenden bei Empty (Vorgabe §15)

  return (
    <section
      aria-labelledby="mein-depot-faelligkeiten-title"
      data-testid="mein-depot-faelligkeiten"
      className="mb-14"
    >
      <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-text-muted">
        Anstehende Fälligkeiten
      </p>
      <h2
        id="mein-depot-faelligkeiten-title"
        className="mt-2 font-display text-[1.4rem] font-light tracking-[-0.01em] text-bank-text sm:text-[1.55rem]"
      >
        Wann Kapital wieder verfügbar wird
      </h2>

      <div className="mt-5 space-y-6">
        {BUCKETS.map((b) => {
          const list = buckets[b.key];
          if (!list || list.length === 0) return null;
          const sum = list.reduce((a, x) => a + x.amount, 0);
          return (
            <div key={b.key} data-testid={`mdf-bucket-${b.key}`}>
              <div className="mb-2 flex items-baseline justify-between font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
                <span>{b.label} · {list.length}</span>
                <span className="tabular-nums text-bank-text">{formatEUR(sum)}</span>
              </div>
              <ul className="divide-y divide-bank-border/60 rounded-sm border border-bank-border bg-white">
                {list.map((it) => (
                  <li key={it.id} className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-4 sm:px-5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-bank-text">{it.title}</p>
                      <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
                        {it.product}
                        {it.kupon != null ? ` · ${it.kupon.toString().replace('.', ',')} % Kupon` : ''}
                      </p>
                    </div>
                    <p className="tabular-nums text-[13px] font-semibold text-bank-text sm:text-right">{formatEUR(it.amount)}</p>
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted tabular-nums sm:text-right">
                      {formatDate(it.due)} · Noch {it.daysRemaining} Tage
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default Faelligkeiten;
