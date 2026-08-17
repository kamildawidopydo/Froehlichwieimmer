import React from 'react';
import { Phone } from 'lucide-react';
import { siteContact } from '@/data/siteContact';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';

/**
 * Compact Kundenservice block — phone icon + label, number, hours.
 * @param {{ variant?: 'light' | 'dark' | 'topbar'; className?: string }} props
 */
const NavCustomerServiceContact = ({ variant = 'light', className }) => {
  const isTopbar = variant === 'topbar';
  const isDark = variant === 'dark' || isTopbar;

  if (isTopbar) {
    return (
      <a
        href={`tel:${siteContact.phoneTel}`}
        className={cn(
          'group inline-flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-90',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bank-ink',
          className,
        )}
        aria-label={`Kundenservice anrufen: ${siteContact.phoneDisplay}`}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-400/35 bg-white/[0.06] text-slate-300 transition-colors group-hover:border-slate-300/50 group-hover:bg-white/[0.1] group-hover:text-slate-200">
          <Phone className="h-3.5 w-3.5" strokeWidth={LUCIDE_STROKE} aria-hidden />
        </span>
        <span className="flex min-w-0 flex-col sm:flex-row sm:items-baseline sm:gap-2.5">
          <span className="hidden text-[10px] font-medium uppercase tracking-[0.14em] text-white/45 sm:inline">
            Persönliche Beratung
          </span>
          <span className="font-display text-[13px] font-medium tabular-nums leading-none tracking-tight text-white sm:text-[14px]">
            {siteContact.phoneDisplay}
          </span>
          <span className="mt-0.5 text-[10px] leading-none text-white/45 sm:mt-0 sm:border-l sm:border-white/15 sm:pl-2.5">
            {siteContact.businessHoursLine}
          </span>
        </span>
      </a>
    );
  }

  return (
    <a
      href={`tel:${siteContact.phoneTel}`}
      className={cn(
        'group flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/30 sm:gap-3',
        className,
      )}
      aria-label={`Kundenservice anrufen: ${siteContact.phoneDisplay}`}
    >
      <Phone
        className={cn(
          'h-5 w-5 shrink-0 transition-colors sm:h-[22px] sm:w-[22px]',
          isDark ? 'text-bank-accent' : 'text-bank-accent-strong',
        )}
        strokeWidth={1.5}
      />
      <span className="flex min-w-0 flex-col">
        <span
          className={cn(
            'text-[10px] leading-none tracking-[0.02em] sm:text-[11px]',
            isDark ? 'text-white/50' : 'text-bank-text-muted',
          )}
        >
          Persönliche Beratung
        </span>
        <span
          className={cn(
            'mt-1 font-display text-[14px] font-medium tabular-nums leading-none tracking-tight sm:mt-1.5 sm:text-[16px]',
            isDark ? 'text-bank-accent' : 'text-bank-accent-strong',
          )}
        >
          {siteContact.phoneDisplay}
        </span>
        <span
          className={cn(
            'mt-1.5 text-[10px] leading-none tracking-[0.01em] sm:text-[11px]',
            isDark ? 'text-bank-accent/75' : 'text-bank-accent-strong/85',
          )}
        >
          {siteContact.businessHoursLine}
        </span>
      </span>
    </a>
  );
};

/** Slim contact strip above the main nav. */
export const CustomerServiceTopBar = ({ className }) => {
  return (
    <div
      aria-label="Kundenservice"
      className={cn(
        'relative z-[101] border-b border-white/[0.08] bg-bank-ink print:hidden',
        className,
      )}
    >
      <div className="mx-auto flex h-9 max-w-[1600px] items-center justify-between gap-4 px-5 sm:h-10 lg:px-12 xl:px-16">
        <NavCustomerServiceContact variant="topbar" />
        <a
          href={`mailto:${siteContact.email}`}
          className="hidden truncate text-[11px] text-white/45 transition-colors hover:text-white/80 sm:inline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/40"
        >
          {siteContact.email}
        </a>
      </div>
    </div>
  );
};

export default NavCustomerServiceContact;
