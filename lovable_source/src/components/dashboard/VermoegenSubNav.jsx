import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { VERMOEGEN_HUB_PATH } from '@/components/dashboard/VermoegenBreadcrumb';

const LINKS = [
  { to: VERMOEGEN_HUB_PATH, labelKey: 'dashboardShell.vermoegenSub.overview', fallback: 'Übersicht', end: true },
  { to: '/dashboard/festgeld', labelKey: 'shell.user.fixedDeposit', fallback: 'Festgeld' },
  { to: '/dashboard/tagesgeld', labelKey: 'shell.user.dailyDeposit', fallback: 'Tagesgeld' },
  { to: '/dashboard/flexgeld', labelKey: 'shell.user.flexDeposit', fallback: 'Flexgeld' },
  { to: '/dashboard/anleihen', labelKey: 'shell.user.bonds', fallback: 'Anleihen' },
  { to: '/dashboard/aktien', labelKey: 'shell.user.stocks', fallback: 'Aktien' },
  { to: '/dashboard/ipo', labelKey: 'shell.user.ipo', fallback: 'IPO' },
];

/** Horizontal quick-nav for Vermögen hub and product pages (especially mobile). */
const VermoegenSubNav = ({ className }) => {
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t('shell.user.wealth', { defaultValue: 'Vermögen' })}
      className={cn(
        'mb-6 flex gap-5 overflow-x-auto border-b border-bank-border no-scrollbar',
        className,
      )}
    >
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            cn(
              'shrink-0 border-b-2 px-1 py-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/30',
              isActive
                ? 'border-bank-primary text-bank-primary'
                : 'border-transparent text-bank-text-muted hover:border-bank-border hover:text-bank-text',
            )
          }
        >
          {t(link.labelKey, { defaultValue: link.fallback })}
        </NavLink>
      ))}
    </nav>
  );
};

export default VermoegenSubNav;
