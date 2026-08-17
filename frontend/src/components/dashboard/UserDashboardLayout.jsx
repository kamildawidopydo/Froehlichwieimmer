import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { shouldShowMarketTicker } from '@/lib/dashboardMarketTicker';
import { Button } from '@/components/ui/button';
import DashboardShell from './DashboardShell';
import { DashboardDataProvider, useDashboardData } from '@/context/DashboardDataContext';
import { createUserDashboardNavItems } from './userDashboardNav';

const InnerShell = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const showMarketTicker = shouldShowMarketTicker(location.pathname);
  const {
    pendingOrders,
    supportUnread,
    bondPurchaseRequests,
    ipoSubscriptionRequests,
    dashboardFetchHadFailure,
    refreshAll,
    loading,
  } = useDashboardData();
  const [dismissedFetchBanner, setDismissedFetchBanner] = useState(false);

  useEffect(() => {
    if (!dashboardFetchHadFailure) setDismissedFetchBanner(false);
  }, [dashboardFetchHadFailure]);

  const pendingBondRequests =
    (bondPurchaseRequests || []).filter((b) => b.status === 'pending').length || 0;
  const pendingIpoRequests =
    (ipoSubscriptionRequests || []).filter((r) => r.status === 'pending').length || 0;

  const showFetchBanner =
    dashboardFetchHadFailure && !dismissedFetchBanner && !loading;

  const fetchErrorBanner = showFetchBanner ? (
    <div
      role="alert"
      className="flex flex-col gap-3 border-b border-bank-error/25 bg-bank-error/10 px-4 py-3 text-[13px] text-bank-text sm:flex-row sm:items-center sm:justify-between sm:px-6"
    >
      <p className="leading-snug">
        {t('dashboardShell.fetchError', {
          defaultValue:
            'Einige Dashboard-Daten konnten nicht geladen werden. Bitte prüfen Sie Ihre Verbindung und versuchen Sie es erneut.',
        })}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => refreshAll()}>
          {t('dashboardShell.retry', { defaultValue: 'Erneut laden' })}
        </Button>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center border border-bank-border bg-white text-bank-text-muted transition-colors hover:border-bank-gold/45 hover:text-bank-text dark:bg-bank-surface"
          aria-label="Hinweis schließen"
          onClick={() => setDismissedFetchBanner(true)}
        >
          <X size={15} strokeWidth={1.32} />
        </button>
      </div>
    </div>
  ) : null;

  const items = useMemo(
    () =>
      createUserDashboardNavItems({
        t,
        pendingOrdersCount: pendingOrders?.length || 0,
        pendingBondRequests,
        pendingIpoRequests,
        supportUnread,
      }),
    [pendingOrders, pendingBondRequests, pendingIpoRequests, supportUnread, t],
  );

  return (
    <DashboardShell
      className="dashboard-theme"
      items={items}
      profilePath="/dashboard/profil"
      banner={fetchErrorBanner}
      showMarketTicker={showMarketTicker}
      brand={{
        title: 'Kapitalmitte',
        subtitle: t('shell.user.brandSubtitle', { defaultValue: 'Mein Vermögen' }),
        shortLabel: 'BR',
      }}
    />
  );
};

const UserDashboardLayout = () => (
  <DashboardDataProvider>
    <InnerShell />
  </DashboardDataProvider>
);

export default UserDashboardLayout;
