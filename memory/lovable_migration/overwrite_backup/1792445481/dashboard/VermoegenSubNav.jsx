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
        'mb-5 -mx-1 flex gap-1 overflow-x-auto pb-1 no-scrollbar',
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
              'shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors',
              isActive
                ? 'border-bank-primary bg-bank-primary/10 text-bank-primary'
                : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-primary/30 hover:text-bank-text',
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
