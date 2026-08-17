import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Briefcase,
  ChevronRight,
  CalendarClock,
  ArrowUpRight,
  ArrowDownRight,
  X,
  FileDown as FileDownIcon,
  FileText as FileTextIcon,
  LayoutGrid,
  LineChart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDashboardData } from '@/context/DashboardDataContext';
import DividendPanel from '@/components/dashboard/DividendPanel';
import MaturityTimelineChart from '@/components/dashboard/charts/MaturityTimelineChart';
import PortfolioPageLayout from '@/components/dashboard/PortfolioPageLayout';
import PortfolioTabs from '@/components/dashboard/PortfolioTabs';
import MarketOverviewWidget from '@/components/dashboard/MarketOverviewWidget';
import HotNewsCarousel from '@/components/dashboard/HotNewsCarousel';
import WatchlistWidget from '@/components/dashboard/WatchlistWidget';
import PortfolioEarningsCalendar from '@/components/dashboard/portfolio/PortfolioEarningsCalendar';
import QuickActionBar from '@/components/dashboard/portfolio/QuickActionBar';
import { PageContainer } from '@/components/dashboard/PageHeader';
import { buildMaturityTimeline } from '@/lib/dashboardMetrics';
import { formatEUR, formatEURSigned } from '@/lib/dashboardFormatters';
import { downloadCSV, formatDate as fmtDate } from '@/lib/export';
import { fetchSparkline } from '@/services/stockHistoryService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import useWidgetPrefs from '@/hooks/useWidgetPrefs';
import TaxSummaryWidget from '@/components/dashboard/TaxSummaryWidget';
import DashboardOnboarding, { isOnboardingCompleted } from '@/components/dashboard/DashboardOnboarding';
import DashboardTabPanel from '@/components/dashboard/motion/DashboardTabPanel';

const GesamtuebersichtSection = lazy(() => import('@/components/dashboard/GesamtuebersichtSection'));
const UnifiedPositionsTable = lazy(() => import('@/components/dashboard/portfolio/UnifiedPositionsTable'));
const PerformanceBenchmarkChart = lazy(() => import('@/components/dashboard/portfolio/PerformanceBenchmarkChart'));
const SectorAllocationChart = lazy(() => import('@/components/dashboard/portfolio/SectorAllocationChart'));

const TabFallback = () => (
  <div className="mb-6 h-48 animate-pulse rounded-xl border border-bank-border bg-bank-border/30" />
);

const TX_META = {
  deposit: { label: 'Einzahlung', tone: 'pos' },
  withdrawal: { label: 'Auszahlung', tone: 'neg' },
  interest: { label: 'Zinsgutschrift', tone: 'pos' },
  payout: { label: 'Festgeld-Auszahlung', tone: 'pos' },
  fee: { label: 'Gebühr', tone: 'neg' },
  adjustment: { label: 'Korrektur', tone: 'mid' },
  stock_buy: { label: 'Aktienkauf', tone: 'neg' },
  stock_sell: { label: 'Aktienverkauf', tone: 'pos' },
};

export default function UebersichtPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'dashboard';
  const setTab = (id) => setSearchParams({ tab: id }, { replace: true });

  const {
    cashBalance,
    cashHistory,
    cashHistoryLoading,
    refreshCashHistory,
    activeContracts,
    taxPrefs,
    stockMetrics,
    stockOrders,
    pendingOrders,
    watchlistItems,
    loading,
  } = useDashboardData();

  const [showVerlauf, setShowVerlauf] = useState(false);
  const [sparklines, setSparklines] = useState({});
  const [showWidgetSettings, setShowWidgetSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { prefs, loaded, toggle, setCompact, setPrefsBulk } = useWidgetPrefs();
  const compact = prefs.compactMode;

  useEffect(() => {
    if (loaded && !isOnboardingCompleted()) setShowOnboarding(true);
  }, [loaded]);

  const maturityRows = useMemo(
    () => buildMaturityTimeline(activeContracts || [], { taxPrefs }),
    [activeContracts, taxPrefs],
  );

  const dividendPositions = useMemo(
    () =>
      [...(stockMetrics || [])]
        .filter((s) => Number(s.qty) > 0)
        .map((s) => ({
          symbol: s.symbol,
          name: s.stockName || s.symbol,
          logoUrl: s.logoUrl,
          qty: Number(s.qty || 0),
        })),
    [stockMetrics],
  );

  const symbolsKey = useMemo(() => {
    const set = new Set([
      ...(stockMetrics || []).map((m) => m.symbol),
      ...(watchlistItems || []).map((w) => w.symbol),
    ]);
    return Array.from(set).filter(Boolean).join(',');
  }, [stockMetrics, watchlistItems]);

  useEffect(() => {
    if (tab === 'salden') {
      navigate('/dashboard/kontoauszug', { replace: true });
    } else if (tab === 'news') {
      navigate('/dashboard/news', { replace: true });
    }
  }, [tab, navigate]);

  useEffect(() => {
    let active = true;
    const symbols = symbolsKey ? symbolsKey.split(',') : [];
    if (!symbols.length) {
      setSparklines({});
      return undefined;
    }
    Promise.all(
      symbols.map(async (s) => {
        try {
          return [s, await fetchSparkline(s, '1mo')];
        } catch {
          return [s, null];
        }
      }),
    ).then((entries) => {
      if (!active) return;
      const map = {};
      entries.forEach(([s, v]) => {
        if (v?.length > 1) map[s] = v;
      });
      setSparklines(map);
    });
    return () => {
      active = false;
    };
  }, [symbolsKey]);

  const openVerlauf = () => {
    setShowVerlauf(true);
    refreshCashHistory();
  };

  return (
    <PageContainer>
      <DashboardOnboarding
        open={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
        onApplyWidgets={setPrefsBulk}
      />
      <PortfolioPageLayout>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <PortfolioTabs active={tab} onChange={setTab} className="mb-0 flex-1 border-b-0 sm:border-b sm:border-bank-border" />
          {tab === 'dashboard' && (
            <button
              type="button"
              onClick={() => setShowWidgetSettings((v) => !v)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-[12px] font-medium transition-colors',
                showWidgetSettings
                  ? 'border-bank-primary bg-bank-primary/10 text-bank-primary'
                  : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-primary/40 hover:text-bank-primary',
              )}
            >
              <LayoutGrid size={14} />
              {t('dashboardShell.widgets.configure', { defaultValue: 'Widgets anpassen' })}
            </button>
          )}
        </div>
        <DashboardTabPanel tabKey={tab}>
        {tab === 'dashboard' && (
          <>
            <QuickActionBar />
            {showWidgetSettings && (
              <div className="mb-4 rounded-xl border border-bank-border bg-white p-4 shadow-sm">
                <p className="mb-1 text-[13px] font-semibold text-bank-text">
                  {t('dashboardShell.widgets.title', { defaultValue: 'Widgets anzeigen' })}
                </p>
                <p className="mb-3 text-[12px] text-bank-text-muted">
                  {t('dashboardShell.widgets.hint', {
                    defaultValue: 'Blenden Sie Bereiche ein oder aus — Ihre Auswahl wird gespeichert.',
                  })}
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    ['marketOverview', t('dashboardShell.widgets.markets', { defaultValue: 'Märkte' })],
                    ['hotNews', t('dashboardShell.widgets.news', { defaultValue: 'News' })],
                    ['watchlist', t('dashboardShell.widgets.watchlist', { defaultValue: 'Watchlist' })],
                    ['maturity', t('dashboardShell.widgets.maturity', { defaultValue: 'Fälligkeiten' })],
                    ['dividends', t('dashboardShell.widgets.dividends', { defaultValue: 'Dividenden' })],
                    ['earnings', t('dashboardShell.widgets.earnings', { defaultValue: 'Termine' })],
                    ['pendingOrders', t('dashboardShell.widgets.pendingOrders', { defaultValue: 'Offene Orders' })],
                    ['taxSummary', t('dashboardShell.widgets.tax', { defaultValue: 'Steuer' })],
                    ['performanceTeaser', t('dashboardShell.widgets.performance', { defaultValue: 'Performance' })],
                    ['export', t('dashboardShell.widgets.export', { defaultValue: 'Export' })],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggle(key)}
                      className={cn(
                        'rounded-lg border px-2.5 py-1 text-[11px] font-medium',
                        prefs[key] ? 'border-bank-primary bg-bank-primary/10 text-bank-primary' : 'border-bank-border text-bank-text-muted',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-[12px] text-bank-text-muted">
                  <input
                    type="checkbox"
                    checked={compact}
                    onChange={(e) => setCompact(e.target.checked)}
                    className="rounded border-bank-border"
                  />
                  {t('dashboardShell.widgets.compact', { defaultValue: 'Kompakte Ansicht' })}
                </label>
              </div>
            )}
            <Suspense fallback={<TabFallback />}>
              <GesamtuebersichtSection loading={loading} />
            </Suspense>
            {(prefs.marketOverview || prefs.hotNews || prefs.watchlist) && (
            <div className={cn('mb-6 grid gap-4 lg:grid-cols-3', compact && 'mb-4 gap-3')}>
              {prefs.marketOverview && <MarketOverviewWidget />}
              {prefs.hotNews && <HotNewsCarousel />}
              {prefs.watchlist && <WatchlistWidget sparklines={sparklines} />}
            </div>
            )}
            {prefs.maturity && (maturityRows.length > 0 || (prefs.dividends && dividendPositions.length > 0)) && (
              <div className={cn('mb-6 grid gap-4 lg:grid-cols-2', compact && 'mb-4 gap-3')}>
                {prefs.maturity && maturityRows.length > 0 && (
                  <div className={cn('rounded-xl border border-bank-border bg-white p-5 shadow-sm', compact && 'p-4')}>
                    <h3 className="mb-4 inline-flex items-center gap-2 text-[15px] font-semibold text-bank-text">
                      <CalendarClock size={16} className="text-bank-primary" />
                      Fälligkeitsverlauf
                    </h3>
                    <MaturityTimelineChart rows={maturityRows} height={240} />
                  </div>
                )}
                {prefs.dividends && dividendPositions.length > 0 && <DividendPanel positions={dividendPositions} />}
              </div>
            )}
            {prefs.earnings && <PortfolioEarningsCalendar />}
            {(prefs.taxSummary || prefs.performanceTeaser) && (
              <div className={cn('mb-6 grid gap-4 lg:grid-cols-2', compact && 'mb-4 gap-3')}>
                {prefs.taxSummary && <TaxSummaryWidget compact={compact} />}
                {prefs.performanceTeaser && (
                  <button
                    type="button"
                    onClick={() => setTab('performance')}
                    className={cn(
                      'group flex flex-col rounded-xl border border-bank-border bg-white p-5 text-left shadow-sm transition-colors hover:border-bank-primary/30 hover:bg-bank-primary/5',
                      compact && 'p-4',
                    )}
                  >
                    <h3 className="inline-flex items-center gap-2 text-[15px] font-semibold text-bank-text">
                      <LineChart size={16} className="text-bank-primary" />
                      {t('dashboardShell.performance.teaserTitle', { defaultValue: 'Performance & Benchmark' })}
                    </h3>
                    <p className="mt-2 flex-1 text-[13px] text-bank-text-muted">
                      {t('dashboardShell.performance.teaserBody', {
                        defaultValue: 'Vergleichen Sie Ihr Portfolio mit DAX, S&P 500 und Euro Stoxx 50.',
                      })}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-bank-primary group-hover:underline">
                      {t('dashboardShell.performance.open', { defaultValue: 'Zur Performance-Ansicht' })}
                      <ChevronRight size={14} />
                    </span>
                  </button>
                )}
              </div>
            )}
            {prefs.pendingOrders && pendingOrders.length > 0 && (
              <div className={cn('mb-6 rounded-xl border border-bank-border bg-white p-5 shadow-sm', compact && 'mb-4 p-4')}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="inline-flex items-center gap-2 text-[15px] font-semibold text-bank-text">
                    <Briefcase size={16} /> Offene Aufträge
                    <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">
                      {pendingOrders.length}
                    </span>
                  </h3>
                  <Link to="/dashboard/auftraege" className="text-[13px] font-medium text-bank-primary hover:underline">
                    Alle <ChevronRight size={14} className="inline" />
                  </Link>
                </div>
                <ul className="divide-y divide-bank-border/70">
                  {pendingOrders.slice(0, 5).map((o) => (
                    <li key={o.id} className="flex items-center justify-between py-2.5 text-sm">
                      <div>
                        <span className="font-mono font-medium">{o.symbol}</span>
                        <span
                          className={cn(
                            'ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                            o.side === 'buy' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
                          )}
                        >
                          {o.side === 'buy' ? 'Kauf' : 'Verkauf'}
                        </span>
                      </div>
                      <span className="text-[12px] text-amber-600">In Bearbeitung</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {prefs.export && (
            <div className={cn('rounded-xl border border-bank-border bg-white p-5 shadow-sm', compact && 'p-4')}>
              <h3 className="mb-3 text-[15px] font-semibold text-bank-text">
                {t('dashboardShell.widgets.exportSection', { defaultValue: 'Export & Auszüge' })}
              </h3>
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" size="sm" onClick={() => navigate('/dashboard/kontoauszug')}>
                  <FileTextIcon size={13} /> {t('dashboardShell.widgets.statementPdf', { defaultValue: 'Depotauszug (PDF)' })}
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/dokumente')}>
                  <FileTextIcon size={13} /> {t('shell.user.documents', { defaultValue: 'Dokumente' })}
                </Button>
                <Button variant="outline" size="sm" onClick={openVerlauf}>
                  Kontoverlauf
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!stockOrders?.length) {
                      toast.info('Keine Aufträge vorhanden');
                      return;
                    }
                    downloadCSV(
                      stockOrders,
                      [
                        { header: 'Datum', value: (r) => fmtDate(r.created_at) },
                        { header: 'Symbol', value: 'symbol' },
                        { header: 'Seite', value: (r) => (r.side === 'buy' ? 'Kauf' : 'Verkauf') },
                        { header: 'Stück', value: (r) => Number(r.quantity || 0).toString() },
                        { header: 'Status', value: 'status' },
                      ],
                      `auftraege_${new Date().toISOString().slice(0, 10)}`,
                    );
                    toast.success('Exportiert');
                  }}
                >
                  <FileDownIcon size={13} /> Aufträge CSV
                </Button>
              </div>
            </div>
            )}
          </>
        )}
        {tab === 'positionen' && (
          <Suspense fallback={<TabFallback />}>
            <UnifiedPositionsTable sparklines={sparklines} />
          </Suspense>
        )}
        {tab === 'performance' && (
          <Suspense fallback={<TabFallback />}>
            <div className="space-y-6">
              <PerformanceBenchmarkChart />
              <SectorAllocationChart />
            </div>
          </Suspense>
        )}
        </DashboardTabPanel>
      </PortfolioPageLayout>

      {showVerlauf && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-modal flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(8,30,56,0.55)' }}
          onClick={(e) => e.target === e.currentTarget && setShowVerlauf(false)}
        >
          <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-xl border border-bank-border bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-bank-border px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-bank-text">Kontoverlauf</h2>
                <p className="text-[12px] text-bank-text-muted">Saldo {formatEUR(cashBalance)}</p>
              </div>
              <button type="button" onClick={() => setShowVerlauf(false)} aria-label="Schließen">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {cashHistoryLoading ? (
                <p className="p-8 text-center text-bank-text-muted">Wird geladen…</p>
              ) : cashHistory.length === 0 ? (
                <p className="p-8 text-center text-bank-text-muted">Keine Buchungen</p>
              ) : (
                <ul className="divide-y divide-bank-border">
                  {cashHistory.map((r) => {
                    const meta = TX_META[r.type] || TX_META.adjustment;
                    const positive = Number(r.amount) >= 0;
                    const Icon = positive ? ArrowUpRight : ArrowDownRight;
                    return (
                      <li key={r.id} className="flex items-start gap-3 px-6 py-3">
                        <Icon size={16} className={positive ? 'text-emerald-600' : 'text-rose-600'} />
                        <div className="flex-1">
                          <p className="text-[13px] font-medium">{meta.label}</p>
                          {r.description && <p className="text-[12px] text-bank-text-muted">{r.description}</p>}
                        </div>
                        <p className={cn('font-semibold tabular-nums', positive ? 'text-emerald-700' : 'text-rose-600')}>
                          {formatEURSigned(r.amount)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
