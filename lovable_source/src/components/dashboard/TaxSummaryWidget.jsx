import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Receipt, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDashboardData } from '@/context/DashboardDataContext';
import { formatEUR } from '@/lib/dashboardFormatters';
import { cn } from '@/lib/utils';

/** Freistellungsauftrag overview for Übersicht / Profil cross-link. */
const TaxSummaryWidget = ({ compact = false }) => {
  const { t } = useTranslation();
  const { taxPrefs } = useDashboardData();

  const allowance = Number(taxPrefs?.allowanceEur || 0);
  const used = Number(taxPrefs?.allowanceUsedEur || 0);
  const remaining = Math.max(0, allowance - used);
  const pct = allowance > 0 ? Math.min(100, (used / allowance) * 100) : 0;

  const churchLabel = useMemo(() => {
    if (!taxPrefs?.churchTaxEnabled) return null;
    return `${taxPrefs.churchTaxRate || 9} %`;
  }, [taxPrefs]);

  if (allowance <= 0 && !taxPrefs?.churchTaxEnabled) {
    return (
      <div
        className={cn(
          'rounded-xl border border-dashed border-bank-border bg-white p-5 shadow-sm',
          compact && 'p-4',
        )}
      >
        <h3 className="inline-flex items-center gap-2 text-[15px] font-semibold text-bank-text">
          <Receipt size={16} className="text-bank-primary" />
          {t('dashboardShell.tax.title', { defaultValue: 'Steuerübersicht' })}
        </h3>
        <p className="mt-2 text-[13px] text-bank-text-muted">
          {t('dashboardShell.tax.empty', {
            defaultValue: 'Hinterlegen Sie Ihren Freistellungsauftrag im Profil für Netto-Renditen.',
          })}
        </p>
        <Link
          to="/dashboard/profil"
          className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-bank-primary hover:underline"
        >
          {t('dashboardShell.tax.configure', { defaultValue: 'Steuern einrichten' })}
          <ChevronRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-bank-border bg-white p-5 shadow-sm',
        compact && 'p-4',
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="inline-flex items-center gap-2 text-[15px] font-semibold text-bank-text">
          <Receipt size={16} className="text-bank-primary" />
          {t('dashboardShell.tax.title', { defaultValue: 'Steuerübersicht' })}
        </h3>
        <Link
          to="/dashboard/profil"
          className="text-[12px] font-medium text-bank-primary hover:underline"
        >
          {t('common.edit', { defaultValue: 'Bearbeiten' })}
        </Link>
      </div>

      <div className="mb-2 flex items-end justify-between text-[13px]">
        <span className="text-bank-text-muted">
          {t('dashboardShell.tax.allowanceRemaining', { defaultValue: 'Freibetrag verbleibend' })}
        </span>
        <span className="font-semibold tabular-nums text-bank-text">
          {formatEUR(remaining)}{' '}
          <span className="font-normal text-bank-text-muted">/ {formatEUR(allowance)}</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-bank-border/60">
        <div
          className="h-full rounded-full bg-bank-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] text-bank-text-muted">
        {t('dashboardShell.tax.used', { defaultValue: 'Verbraucht' })}: {formatEUR(used)}
        {churchLabel &&
          ` · ${t('dashboardShell.tax.church', { defaultValue: 'KiSt' })} ${churchLabel}`}
      </p>
      <Link
        to="/dashboard/dokumente#freistellungsauftrag"
        className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-bank-primary hover:underline"
      >
        {t('dashboardShell.tax.downloadForm', { defaultValue: 'Freistellungsauftrag (PDF)' })}
        <ChevronRight size={13} />
      </Link>
    </div>
  );
};

export default TaxSummaryWidget;
