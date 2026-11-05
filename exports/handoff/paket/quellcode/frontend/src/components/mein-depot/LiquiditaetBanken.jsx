import React, { useMemo } from 'react';
import BankLogo from '@/components/BankLogo';
import { useDashboardData } from '@/context/DashboardDataContext';
import { formatEUR } from '@/lib/dashboardFormatters';
import { cn } from '@/lib/utils';

/**
 * LiquiditaetBanken — zweispaltige Sektion auf /mein-depot.
 *
 * A) Liquidität — nutzt die drei Cash-Felder aus DashboardDataContext:
 *      - cashBalance      (Gesamt-Guthaben, `profiles.cash_balance`)
 *      - cashAvailable    (`profiles.cash_available` — Fallback = cash_balance)
 *      - cashUnsettled    (`profiles.cash_unsettled`)
 *    WICHTIG: die drei Felder sind in Supabase teilweise TEILMENGEN
 *    (available + unsettled ≈ balance), keine Additionsbasis. Sie werden
 *    daher SEPARAT und LABEL-genau angezeigt, ohne Summenbildung.
 *
 * B) Bank-Konzentration — Client-side-Gruppierung von `activeContracts` nach
 *    `bank_id` bzw. `banks.name`. Pro Bank:
 *      - Gesamtbetrag (Anlagen bei dieser Bank)
 *      - Anzahl Verträge
 *      - Anteil an Zinsanlagen (Prozent von contractsTotal)
 *      - Einlagensicherung (falls `banks.deposit_protection_amount` gesetzt) —
 *        nur neutral als „hinterlegte Sicherungsinformation" gelabelt, keine
 *        Sicherheitsaussage.
 */

const LiquiditaetBanken = () => {
  const {
    loading,
    cashBalance,
    cashAvailable,
    cashUnsettled,
    activeContracts,
    contractsTotal,
  } = useDashboardData();

  const banks = useMemo(() => {
    const map = new Map();
    (activeContracts || []).forEach((c) => {
      const id = c?.bank_id || c?.banks?.id || `_${c?.banks?.name || 'unknown'}`;
      const name = c?.banks?.name || 'Unbekannte Bank';
      const logo = c?.banks?.logo_url || null;
      const country = c?.banks?.country || null;
      const protection = c?.banks?.deposit_protection_amount != null
        ? Number(c.banks.deposit_protection_amount)
        : null;
      const amount = Number(c?.amount_eur || 0);
      if (!map.has(id)) map.set(id, { id, name, logo, country, protection, total: 0, count: 0 });
      const rec = map.get(id);
      rec.total += amount;
      rec.count += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [activeContracts]);

  const total = Number(contractsTotal || 0);
  const anyBanks = banks.length > 0;

  return (
    <section
      aria-labelledby="mein-depot-liq-title"
      data-testid="mein-depot-liq-banken"
      className="mb-14 grid grid-cols-1 gap-6 lg:grid-cols-2"
    >
      {/* A — Liquidität */}
      <div>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-text-muted">Liquidität</p>
        <h2 id="mein-depot-liq-title" className="mt-2 font-display text-[1.4rem] font-light tracking-[-0.01em] text-bank-text sm:text-[1.55rem]">
          Ihre verfügbaren Mittel
        </h2>
        <div className="mt-5 rounded-sm border border-bank-border bg-white">
          {loading ? (
            <div className="h-[180px] animate-pulse bg-bank-border/25" />
          ) : (
            <dl className="divide-y divide-bank-border/60">
              <div className="flex items-baseline justify-between px-4 py-3 sm:px-5">
                <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-bank-text-muted">Cash-Guthaben</dt>
                <dd className="tabular-nums text-[14px] font-semibold text-bank-text">{formatEUR(cashBalance)}</dd>
              </div>
              <div className="flex items-baseline justify-between px-4 py-3 sm:px-5">
                <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-bank-text-muted">Verfügbar</dt>
                <dd className="tabular-nums text-[14px] font-medium text-bank-text">{formatEUR(cashAvailable)}</dd>
              </div>
              <div className="flex items-baseline justify-between px-4 py-3 sm:px-5">
                <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-bank-text-muted">Noch nicht verfügbar</dt>
                <dd className="tabular-nums text-[14px] font-medium text-bank-text">{formatEUR(cashUnsettled)}</dd>
              </div>
              <div className="flex items-baseline justify-between px-4 py-3 sm:px-5">
                <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-bank-text-muted">Gebunden in Zinsanlagen</dt>
                <dd className="tabular-nums text-[14px] font-medium text-bank-text">{formatEUR(total)}</dd>
              </div>
            </dl>
          )}
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-bank-text-muted">
          „Verfügbar" und „Noch nicht verfügbar" sind Teilmengen des Cash-Guthabens.
          „Gebunden in Zinsanlagen" wird zusätzlich getrennt geführt.
        </p>
      </div>

      {/* B — Bank-Konzentration */}
      <div>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-text-muted">Bank-Verteilung</p>
        <h2 className="mt-2 font-display text-[1.4rem] font-light tracking-[-0.01em] text-bank-text sm:text-[1.55rem]">
          Ihre Zinsanlagen nach Bank
        </h2>
        <div className="mt-5">
          {loading ? (
            <div className="h-[180px] animate-pulse rounded-sm bg-bank-border/25" />
          ) : !anyBanks ? (
            <div data-testid="mdb-empty" className="rounded-sm border border-dashed border-bank-border px-6 py-10 text-center">
              <p className="text-[13px] text-bank-text-muted">Aktuell keine Zinsanlagen bei Banken hinterlegt.</p>
            </div>
          ) : (
            <ul className="divide-y divide-bank-border/60 rounded-sm border border-bank-border bg-white">
              {banks.map((b) => {
                const share = total > 0 ? (b.total / total) * 100 : null;
                return (
                  <li key={b.id} data-testid={`mdb-bank-${b.id}`} className="px-4 py-4 sm:px-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {b.logo ? (
                          <BankLogo logo={b.logo} bankName={b.name} size="sm" />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-bank-bg text-[11px] font-semibold text-bank-text-muted">
                            {(b.name || '?').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-medium text-bank-text">{b.name}</p>
                          <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
                            {b.count} {b.count === 1 ? 'Vertrag' : 'Verträge'}
                            {b.country ? ` · ${b.country}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="tabular-nums text-[14px] font-semibold text-bank-text">{formatEUR(b.total)}</p>
                        <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
                          {share != null ? `${share.toFixed(1).replace('.', ',')} % Anteil` : '—'}
                        </p>
                      </div>
                    </div>
                    {b.protection != null && b.protection > 0 && (
                      <p className={cn('mt-3 flex items-start gap-1.5 border-t border-bank-border/40 pt-3 text-[11.5px] text-bank-text-muted')}>
                        <span className="font-mono uppercase tracking-[0.14em]">Hinterlegte Sicherungsinformation:</span>
                        <span className="tabular-nums text-bank-text">bis {formatEUR(b.protection)}</span>
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};

export default LiquiditaetBanken;
