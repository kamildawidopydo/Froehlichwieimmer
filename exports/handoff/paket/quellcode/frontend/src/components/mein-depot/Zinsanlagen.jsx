import React, { useMemo } from 'react';
import { Lock, Clock, CheckCircle } from 'lucide-react';
import BankLogo from '@/components/BankLogo';
import { useDashboardData } from '@/context/DashboardDataContext';
import { formatEUR, formatEURSigned, formatDate } from '@/lib/dashboardFormatters';
import { PRODUCT_LABEL } from '@/lib/dashboardMetrics';
import { cn } from '@/lib/utils';

/**
 * Zinsanlagen — kompakte Cards für Fest-/Tages-/Flexgeld-Verträge auf /mein-depot.
 *
 * Datenquelle: `activeContracts` aus DashboardDataContext, aufbereitet über den
 * BESTEHENDEN `computeContractMetrics()`. KEINE neue Zinsformel, KEINE neue
 * Early-Withdrawal-Berechnung. Nur Anzeige.
 *
 * Grouped by product_type; Untergruppen erscheinen nur bei vorhandenen Verträgen.
 */

const TYPES = ['tagesgeld', 'festgeld', 'flexgeld'];

const Row = ({ label, value, valueClass = 'text-bank-text' }) => (
  <div>
    <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-bank-text-muted">{label}</dt>
    <dd className={cn('mt-0.5 tabular-nums text-[13px] font-medium', valueClass)}>{value}</dd>
  </div>
);

const ContractRow = ({ contract }) => {
  const { computeContractMetrics } = useDashboardData();
  const m = computeContractMetrics(contract);
  const c = contract;
  const isFestgeld = c.product_type === 'festgeld';
  const isFlexgeld = c.product_type === 'flexgeld';
  const isTagesgeld = c.product_type === 'tagesgeld';

  return (
    <li
      data-testid={`mdz-contract-${c.id}`}
      className="border-t border-bank-border/60 px-4 py-4 first:border-t-0 sm:px-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {c.banks?.logo_url ? (
            <BankLogo logo={c.banks.logo_url} bankName={c.banks?.name} size="sm" />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-bank-bg text-[11px] font-semibold text-bank-text-muted">
              {(c.banks?.name || '?').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium text-bank-text">{c.banks?.name || PRODUCT_LABEL[c.product_type] || 'Vertrag'}</p>
            <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
              {PRODUCT_LABEL[c.product_type] || c.product_type}
              {c.laufzeit_monate ? ` · ${c.laufzeit_monate} Monate` : ''}
            </p>
          </div>
        </div>
        <p className="rate-figure shrink-0 text-right text-[16px] tabular-nums text-bank-text">
          {c.zinssatz != null ? `${Number(c.zinssatz).toLocaleString('de-DE')}\u00A0% p.a.` : '—'}
        </p>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Row label="Anlagebetrag" value={formatEUR(m.amount)} />
        <Row
          label="Aufgel. Zinsen"
          value={m.aufgelaufeneZinsen > 0 ? formatEURSigned(m.aufgelaufeneZinsen) : '—'}
          valueClass={m.aufgelaufeneZinsen > 0 ? 'text-emerald-700' : 'text-bank-text-muted'}
        />
        <Row label="Startdatum" value={c.active_from ? formatDate(c.active_from) : '—'} />
        <Row
          label={isTagesgeld ? 'Verfügbarkeit' : (isFlexgeld ? 'Festbindung bis' : 'Fälligkeit')}
          value={
            isTagesgeld
              ? (m.isLocked ? 'Gebunden' : 'Frei verfügbar')
              : (isFlexgeld
                ? (m.lockUntil ? formatDate(m.lockUntil) : 'Keine Festbindung')
                : (c.active_until ? formatDate(c.active_until) : '—'))
          }
        />
      </dl>

      {isFestgeld && m.totalDays > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-bank-text-muted">
            <span>Laufzeit</span>
            <span className="tabular-nums text-bank-text">Noch {m.daysRemaining} Tage</span>
          </div>
          <div className="mt-1.5 h-1 w-full rounded-sm bg-bank-border/40" aria-hidden>
            <div className="h-full rounded-sm bg-bank-primary" style={{ width: `${Math.min(100, Math.max(0, m.progress))}%` }} />
          </div>
        </div>
      )}

      {isFestgeld && m.earlyWithdrawalPayoutTodayNet != null && m.earlyWithdrawalPayoutTodayNet > 0 && (
        <p
          data-testid={`mdz-early-${c.id}`}
          className="mt-3 flex items-start gap-2 border-t border-bank-border/40 pt-3 text-[12px] text-bank-text-muted"
        >
          <Lock size={12} strokeWidth={1.6} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            Vorzeitige Verfügung heute: <span className="tabular-nums font-medium text-bank-text">≈ {formatEUR(m.earlyWithdrawalPayoutTodayNet)}</span>
            {m.earlyWithdrawalPenaltyEur > 0 && (
              <> · Strafe <span className="tabular-nums text-rose-700">{formatEUR(m.earlyWithdrawalPenaltyEur)}</span></>
            )}
          </span>
        </p>
      )}

      {isFlexgeld && m.lockUntil && (
        <p className="mt-3 flex items-start gap-2 border-t border-bank-border/40 pt-3 text-[12px] text-bank-text-muted">
          {m.isLocked ? <Lock size={12} strokeWidth={1.6} className="mt-0.5 shrink-0" aria-hidden /> : <CheckCircle size={12} strokeWidth={1.6} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden />}
          <span>{m.isLocked ? `Noch ${m.lockDaysRemaining} Tage gebunden` : 'Frei verfügbar'}</span>
        </p>
      )}
    </li>
  );
};

const Zinsanlagen = () => {
  const { loading, activeContracts, dashboardFetchHadFailure } = useDashboardData();

  const grouped = useMemo(() => {
    const g = { tagesgeld: [], festgeld: [], flexgeld: [] };
    (activeContracts || []).forEach((c) => {
      if (g[c.product_type]) g[c.product_type].push(c);
    });
    // Sort each bucket by amount desc
    Object.values(g).forEach((arr) => arr.sort((a, b) => Number(b.amount_eur || 0) - Number(a.amount_eur || 0)));
    return g;
  }, [activeContracts]);

  const anyContract = (activeContracts || []).length > 0;
  const showError = !loading && !anyContract && dashboardFetchHadFailure;

  return (
    <section aria-labelledby="mein-depot-zinsanlagen-title" data-testid="mein-depot-zinsanlagen" className="mb-14">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-text-muted">Meine Zinsanlagen</p>
      <h2
        id="mein-depot-zinsanlagen-title"
        className="mt-2 font-display text-[1.4rem] font-light tracking-[-0.01em] text-bank-text sm:text-[1.55rem]"
      >
        Festgeld, Tagesgeld und Flexgeld
      </h2>

      <div className="mt-5">
        {loading ? (
          <div data-testid="mdz-skeleton" className="h-[220px] animate-pulse rounded-sm bg-bank-border/25" />
        ) : showError ? (
          <div data-testid="mdz-error" className="rounded-sm border border-dashed border-bank-border px-6 py-10 text-center">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-bank-text-muted">Verbindung</p>
            <p className="mt-3 text-[14px] font-medium text-bank-text">Ihre Anlageprodukte konnten momentan nicht geladen werden.</p>
          </div>
        ) : !anyContract ? (
          <div data-testid="mdz-empty" className="rounded-sm border border-dashed border-bank-border px-6 py-10 text-center">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-bank-text-muted">Noch keine Anlagen</p>
            <p className="mt-3 text-[14px] font-medium text-bank-text">Noch keine Zinsanlagen hinterlegt.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {TYPES.map((t) => {
              const list = grouped[t];
              if (list.length === 0) return null;
              const label = PRODUCT_LABEL[t] || t;
              const sum = list.reduce((a, c) => a + Number(c.amount_eur || 0), 0);
              return (
                <div key={t} data-testid={`mdz-group-${t}`}>
                  <div className="mb-2 flex items-baseline justify-between font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
                    <span>{label} · {list.length}</span>
                    <span className="tabular-nums text-bank-text">{formatEUR(sum)}</span>
                  </div>
                  <ul className="rounded-sm border border-bank-border bg-white">
                    {list.map((c) => <ContractRow key={c.id} contract={c} />)}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default Zinsanlagen;
