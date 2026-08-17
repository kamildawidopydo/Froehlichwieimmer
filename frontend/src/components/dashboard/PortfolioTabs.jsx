import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { DASHBOARD_EASE } from '@/components/dashboard/motion/dashboardMotion';

const TABS = [
  { id: 'dashboard', labelKey: 'dashboardShell.tabs.dashboard', defaultLabel: 'Dashboard' },
  { id: 'positionen', labelKey: 'dashboardShell.tabs.positions', defaultLabel: 'Positionen' },
  { id: 'performance', labelKey: 'dashboardShell.tabs.performance', defaultLabel: 'Performance' },
];

/** Legacy tab ids redirected elsewhere (not shown in tab bar). */
const LEGACY_TAB_IDS = ['salden', 'news'];

const PortfolioTabs = ({ active, onChange, compact = false, className }) => {
  const { t } = useTranslation();
  return (
    <div
      role="tablist"
      aria-label={t('dashboardShell.tabs.aria', { defaultValue: 'Portfolio-Ansichten' })}
      className={cn(
        'flex flex-wrap gap-1 border-b border-bank-border pb-0',
        compact ? 'mb-3' : 'mb-6',
        className,
      )}
    >
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative px-4 py-2.5 text-[13px] font-medium transition-colors',
              isActive ? 'text-bank-primary' : 'text-bank-text-muted hover:text-bank-text',
            )}
          >
            {isActive && (
              <motion.span
                layoutId="portfolio-tab-indicator"
                className="absolute inset-x-0 bottom-0 h-0.5 bg-bank-primary"
                transition={{ duration: 0.22, ease: DASHBOARD_EASE }}
              />
            )}
            {t(tab.labelKey, { defaultValue: tab.defaultLabel })}
          </button>
        );
      })}
    </div>
  );
};

export { TABS, LEGACY_TAB_IDS };
export default PortfolioTabs;
