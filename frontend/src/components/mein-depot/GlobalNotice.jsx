import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useDashboardData } from '@/context/DashboardDataContext';

/**
 * GlobalNotice — einziger, kompakter, editorial gestalteter Hinweis, wenn
 * mindestens ein Fetch aus DashboardDataContext technisch fehlgeschlagen ist.
 *
 * Ersetzt/entdramatisiert den vorherigen dominanten roten Fullscreen-Banner.
 * Wird nur einmal oben angezeigt — Sektionen unterdrücken danach ihre eigenen
 * Duplikat-Fehlerboxen (via `dashboardFetchHadFailure`-Prop-Konsum in den
 * Section-Empty-States, die weiterhin "—" statt "0,00 €" zeigen).
 */
const GlobalNotice = () => {
  const { dashboardFetchHadFailure, loading, refreshAll } = useDashboardData();
  if (loading || !dashboardFetchHadFailure) return null;
  return (
    <div
      role="status"
      data-testid="mein-depot-global-notice"
      className="mb-8 flex flex-wrap items-center gap-3 rounded-sm border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-[12.5px] leading-relaxed text-bank-text"
    >
      <AlertTriangle size={14} strokeWidth={1.6} className="shrink-0 text-amber-600" aria-hidden />
      <p className="min-w-0 flex-1">
        Einige Depotdaten konnten momentan nicht geladen werden. Fehlende Werte werden als „—" dargestellt.
      </p>
      <button
        type="button"
        onClick={() => refreshAll && refreshAll()}
        data-testid="mein-depot-global-notice-retry"
        className="min-h-[36px] rounded-sm border border-bank-border bg-white px-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-bank-text hover:bg-bank-bg focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bank-gold"
      >
        Erneut versuchen
      </button>
    </div>
  );
};

export default GlobalNotice;
