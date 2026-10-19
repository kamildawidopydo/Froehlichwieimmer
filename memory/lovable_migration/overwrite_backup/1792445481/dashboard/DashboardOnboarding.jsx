import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Briefcase, LayoutGrid, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DEFAULT_PREFS } from '@/hooks/useWidgetPrefs';
import { DashboardEvents, trackDashboardEvent } from '@/lib/dashboardAnalytics';

export const ONBOARDING_STORAGE_KEY = 'dashboard_onboarding_v1_completed';

export function isOnboardingCompleted() {
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markOnboardingCompleted() {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
  } catch {
    /* ignore */
  }
}

const WIDGET_OPTIONS = [
  ['marketOverview', 'dashboardShell.widgets.markets', 'Märkte'],
  ['hotNews', 'dashboardShell.widgets.news', 'News'],
  ['watchlist', 'dashboardShell.widgets.watchlist', 'Watchlist'],
  ['maturity', 'dashboardShell.widgets.maturity', 'Fälligkeiten'],
  ['dividends', 'dashboardShell.widgets.dividends', 'Dividenden'],
  ['earnings', 'dashboardShell.widgets.earnings', 'Termine'],
  ['pendingOrders', 'dashboardShell.widgets.pendingOrders', 'Offene Orders'],
  ['taxSummary', 'dashboardShell.widgets.tax', 'Steuer'],
  ['performanceTeaser', 'dashboardShell.widgets.performance', 'Performance'],
  ['export', 'dashboardShell.widgets.export', 'Export'],
];

const DashboardOnboarding = ({ open, onComplete, onApplyWidgets }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [widgetDraft, setWidgetDraft] = useState(() => ({ ...DEFAULT_PREFS }));

  const steps = useMemo(
    () => [
      {
        icon: LayoutDashboard,
        title: t('dashboardShell.onboarding.step1Title', { defaultValue: 'Ihre Übersicht' }),
        body: t('dashboardShell.onboarding.step1Body', {
          defaultValue:
            'Hier sehen Sie Gesamtvermögen, Tagesperformance und Ihre wichtigsten Positionen — alles auf einen Blick.',
        }),
      },
      {
        icon: Briefcase,
        title: t('dashboardShell.onboarding.step2Title', { defaultValue: 'Mein Vermögen' }),
        body: t('dashboardShell.onboarding.step2Body', {
          defaultValue:
            'Festgeld, Tagesgeld, Anleihen und Aktien finden Sie unter Mein Vermögen — in der Sidebar unter dem Pfeil aufklappbar.',
        }),
        link: { to: '/dashboard/vermoegen', label: t('shell.user.wealthHub', { defaultValue: 'Mein Vermögen' }) },
      },
      {
        icon: LayoutGrid,
        title: t('dashboardShell.onboarding.step3Title', { defaultValue: 'Ansicht anpassen' }),
        body: t('dashboardShell.onboarding.step3Body', {
          defaultValue: 'Wählen Sie, welche Bereiche auf Ihrer Übersicht erscheinen sollen.',
        }),
      },
    ],
    [t],
  );

  const finish = (skipped = false) => {
    if (!skipped) onApplyWidgets?.(widgetDraft);
    trackDashboardEvent(
      skipped ? DashboardEvents.ONBOARDING_SKIPPED : DashboardEvents.ONBOARDING_COMPLETED,
    );
    markOnboardingCompleted();
    onComplete?.();
  };

  const handleNext = () => {
    if (step >= steps.length - 1) {
      finish(false);
      return;
    }
    setStep((s) => s + 1);
  };

  if (!open) return null;

  const current = steps[step];
  const Icon = current.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dashboard-onboarding-title"
      className="fixed inset-0 z-modal flex items-end justify-center p-4 sm:items-center"
      style={{ backgroundColor: 'rgba(8,30,56,0.55)' }}
      onClick={(e) => e.target === e.currentTarget && finish(true)}
    >
      <div className="relative w-full max-w-lg rounded-xl border border-bank-border bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-bank-border px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-bank-text-muted">
              {t('dashboardShell.onboarding.eyebrow', { defaultValue: 'Willkommen' })}{' '}
              · {step + 1}/{steps.length}
            </p>
            <h2 id="dashboard-onboarding-title" className="mt-1 text-lg font-semibold text-bank-text">
              {current.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => finish(true)}
            className="rounded-md p-1 text-bank-text-muted hover:bg-bank-bg hover:text-bank-text"
            aria-label={t('dashboardShell.onboarding.skip', { defaultValue: 'Schließen' })}
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-bank-primary/20 bg-bank-primary/5 text-bank-primary">
            <Icon size={20} strokeWidth={1.6} />
          </div>
          <p className="text-[14px] leading-relaxed text-bank-text-muted">{current.body}</p>

          {current.link && (
            <Link
              to={current.link.to}
              className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-bank-primary hover:underline"
            >
              {current.link.label}
              <ChevronRight size={14} />
            </Link>
          )}

          {step === 2 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {WIDGET_OPTIONS.map(([key, labelKey, fallback]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setWidgetDraft((prev) => ({ ...prev, [key]: !prev[key] }))}
                  className={cn(
                    'rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors',
                    widgetDraft[key]
                      ? 'border-bank-primary bg-bank-primary/10 text-bank-primary'
                      : 'border-bank-border text-bank-text-muted hover:border-bank-primary/30',
                  )}
                >
                  {t(labelKey, { defaultValue: fallback })}
                </button>
              ))}
            </div>
          )}

          <div className="mt-3 flex gap-1">
            {steps.map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full',
                  i <= step ? 'bg-bank-primary' : 'bg-bank-border',
                )}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-bank-border px-5 py-4">
          <button
            type="button"
            onClick={() => finish(true)}
            className="text-[13px] font-medium text-bank-text-muted hover:text-bank-text"
          >
            {t('dashboardShell.onboarding.skipAll', { defaultValue: 'Überspringen' })}
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                {t('dashboardShell.onboarding.back', { defaultValue: 'Zurück' })}
              </Button>
            )}
            <Button type="button" variant="primary" size="sm" onClick={handleNext}>
              {step >= steps.length - 1
                ? t('dashboardShell.onboarding.done', { defaultValue: 'Fertig' })
                : t('dashboardShell.onboarding.next', { defaultValue: 'Weiter' })}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOnboarding;
