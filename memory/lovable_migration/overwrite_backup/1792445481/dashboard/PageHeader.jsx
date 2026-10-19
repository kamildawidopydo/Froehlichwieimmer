import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useDashboardMotion } from '@/components/dashboard/motion/dashboardMotion';

export const PageHeader = ({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
  className,
}) => (
  <header className={cn('mb-7 border-b border-bank-border/70 pb-5', className)}>
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-bank-text-muted">{eyebrow}</p>
        )}
        <div className={cn('flex items-center gap-3', eyebrow && 'mt-1.5')}>
          {Icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-bank-border bg-bank-primary/5 text-bank-primary">
              <Icon size={18} strokeWidth={1.6} />
            </div>
          )}
          <h1 className="dashboard-page-title truncate text-[1.5rem] font-semibold leading-tight text-bank-text sm:text-[1.75rem]">
            {title}
          </h1>
        </div>
        {description && <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-bank-text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </div>
  </header>
);

export const PageContainer = ({ children, className }) => (
  <div
    className={cn(
      'dashboard-page mx-auto w-full max-w-7xl min-w-0 px-3 py-5 sm:px-4 sm:py-6 md:px-5 lg:px-5 xl:px-8',
      className,
    )}
  >
    {children}
  </div>
);

export const SurfaceCard = ({ children, className, padded = true, accent = false }) => {
  const { panel } = useDashboardMotion();

  return (
    <motion.div
      {...panel}
      className={cn(
        'rounded-lg border border-bank-border bg-white shadow-sm transition-all duration-300 hover:border-bank-primary/15 hover:shadow-editorial-sm',
        accent && 'border-bank-primary/20',
        padded && 'p-5 sm:p-6',
        className,
      )}
    >
      {children}
    </motion.div>
  );
};

export const SectionTitle = ({ children, action, kicker, className }) => (
  <div className={cn('mb-3 flex items-end justify-between gap-3', className)}>
    <div className="min-w-0">
      {kicker && <p className="mb-0.5 text-[11px] font-medium uppercase tracking-[0.04em] text-bank-text-muted">{kicker}</p>}
      <h2 className="dashboard-page-title text-[1.05rem] font-semibold leading-tight text-bank-text">{children}</h2>
    </div>
    {action}
  </div>
);

export default PageHeader;
