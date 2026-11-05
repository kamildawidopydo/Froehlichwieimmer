import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Briefcase, TrendingUp, ListTodo, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardData } from '@/context/DashboardDataContext';

const TabButton = ({ to, label, icon: Icon, end, badge }) => {
  const location = useLocation();
  const isActive = end
    ? location.pathname === to
    : location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <NavLink
      to={to}
      end={end}
      className={cn(
        'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors',
        isActive ? 'text-bank-primary' : 'text-bank-text-muted',
      )}
    >
      <span
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
          isActive && 'bg-bank-primary/10',
        )}
      >
        <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
      </span>
      <span className="truncate">{label}</span>
      {badge > 0 && (
        <span className="absolute right-[calc(50%-22px)] top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-bank-primary px-1 text-[9px] font-bold text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </NavLink>
  );
};

/** IBKR-style fixed bottom tab bar (mobile / tablet). */
const DashboardMobileNav = ({ onOpenMenu }) => {
  const { t } = useTranslation();
  const { pendingOrders, bondPurchaseRequests } = useDashboardData();
  const orderBadge =
    (pendingOrders?.length || 0) +
    ((bondPurchaseRequests || []).filter((b) => b.status === 'pending').length || 0);

  const tabs = [
    {
      to: '/dashboard/uebersicht',
      label: t('shell.user.overview', { defaultValue: 'Übersicht' }),
      icon: LayoutDashboard,
      end: true,
    },
    {
      to: '/dashboard/vermoegen',
      label: t('shell.user.wealthHub', { defaultValue: 'Vermögen' }),
      icon: Briefcase,
    },
    {
      to: '/dashboard/handeln',
      label: t('shell.user.market', { defaultValue: 'Markt' }),
      icon: TrendingUp,
    },
    {
      to: '/dashboard/auftraege',
      label: t('shell.user.orders', { defaultValue: 'Aufträge' }),
      icon: ListTodo,
      badgeKey: 'orders',
    },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-bank-border bg-white/95 backdrop-blur-md dark:bg-bank-surface/95 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label={t('shell.user.overview', { defaultValue: 'Hauptnavigation' })}
    >
      <div className="mx-auto flex h-14 max-w-lg items-stretch justify-around">
        {tabs.map((tab) => (
          <TabButton
            key={tab.to}
            {...tab}
            badge={tab.badgeKey === 'orders' ? orderBadge : 0}
          />
        ))}
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium text-bank-text-muted transition-colors hover:text-bank-text"
          aria-label={t('commandPalette.navigationHeading', { defaultValue: 'Menü öffnen' })}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg">
            <Menu size={18} strokeWidth={1.5} />
          </span>
          <span>{t('commandPalette.navigationHeading', { defaultValue: 'Menü' })}</span>
        </button>
      </div>
    </nav>
  );
};

export default DashboardMobileNav;
