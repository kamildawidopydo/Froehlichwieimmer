import React from 'react';
import { useDashboardData } from '@/context/DashboardDataContext';
import { formatEUR } from '@/lib/dashboardFormatters';

/**
 * Steuerübersicht — editorial Version von `TaxSummaryWidget` für /mein-depot.
 *
 * Datenquelle: `taxPrefs` aus DashboardDataContext (bestehende Felder):
 *   - allowanceEur          (Freistellungsauftrag)
 *   - allowanceUsedEur      (bereits verbraucht)
 *   - churchTaxEnabled      (Kirchensteuer aktiviert JA/NEIN)
 *   - churchTaxRate         (8 % oder 9 %)
 * Steuerwohnsitz (residency): NICHT VERIFIZIERT im Context — Feld heißt in
 * `profiles` `tax_residency_country`, wird aber im Kontext-Reducer nicht in
 * `taxPrefs` gemappt. Solange nicht vorhanden, wird KEIN Wohnsitz angezeigt
 * (§13 „keine Default-Steuerwerte erfinden").
 *
 * Keine Steuerberatung, keine „Sie sollten"-Aussagen. Nur Datenanzeige.
 */

const Steuerübersicht = () => {
  const { loading, taxPrefs } = useDashboardData();

  const allowance = Number(taxPrefs?.allowanceEur || 0);
  const used = Number(taxPrefs?.allowanceUsedEur || 0);
  const remaining = allowance > 0 ? Math.max(0, allowance - used) : null;
  const pct = allowance > 0 ? Math.min(100, (used / allowance) * 100) : 0;
  const church = !!taxPrefs?.churchTaxEnabled;
  const hasAnything = allowance > 0 || church;

  return (
    <section aria-labelledby="mein-depot-tax-title" data-testid="mein-depot-tax" className="mb-14">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-text-muted">Steuerübersicht</p>
      <h2
        id="mein-depot-tax-title"
        className="mt-2 font-display text-[1.4rem] font-light tracking-[-0.01em] text-bank-text sm:text-[1.55rem]"
      >
        Freibetrag und Kirchensteuer
      </h2>

      {loading ? (
        <div data-testid="mdt-skeleton" className="mt-5 h-[120px] animate-pulse rounded-sm bg-bank-border/25" />
      ) : !hasAnything ? (
        <div data-testid="mdt-empty" className="mt-5 rounded-sm border border-dashed border-bank-border px-6 py-10 text-center">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-bank-text-muted">Noch keine Angaben</p>
          <p className="mt-3 text-[14px] font-medium text-bank-text">Noch keine Steuerinformationen hinterlegt.</p>
          <p className="mx-auto mt-2 max-w-md text-[12.5px] leading-relaxed text-bank-text-muted">
            Freistellungsauftrag und Kirchensteuer können im Profil hinterlegt werden.
          </p>
        </div>
      ) : (
        <div className="mt-5 rounded-sm border border-bank-border bg-white">
          {allowance > 0 && (
            <div className="border-b border-bank-border/60 px-4 py-4 sm:px-5">
              <div className="mb-2 flex items-baseline justify-between">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-bank-text-muted">Freistellungsauftrag</p>
                <p className="tabular-nums text-[14px] font-semibold text-bank-text">
                  <span data-testid="mdt-remaining">{formatEUR(remaining)}</span>
                  <span className="ml-2 font-normal text-bank-text-muted">verbleibend / {formatEUR(allowance)}</span>
                </p>
              </div>
              <div className="h-1.5 overflow-hidden rounded-sm bg-bank-border/40" aria-hidden>
                <div className="h-full rounded-sm bg-bank-gold" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
                Verbraucht <span className="tabular-nums text-bank-text">{formatEUR(used)}</span>
              </p>
            </div>
          )}
          <dl className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 sm:px-5">
            <div>
              <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-bank-text-muted">Kirchensteuer</dt>
              <dd className="mt-1 text-[14px] font-medium text-bank-text">
                {church ? (
                  <>
                    Aktiviert · <span className="tabular-nums">{taxPrefs?.churchTaxRate ?? 9} %</span>
                  </>
                ) : (
                  'Nicht aktiviert'
                )}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-bank-text-muted">Abgeltungsteuer</dt>
              <dd className="mt-1 text-[14px] font-medium text-bank-text">25 % zzgl. Soli 5,5 %</dd>
            </div>
          </dl>
        </div>
      )}
    </section>
  );
};

export default Steuerübersicht;
