import React from 'react';
import { Phone, Mail } from 'lucide-react';
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
          'group inline-flex min-w-0 items-center gap-2.5 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bank-panel',
          className,
        )}
        aria-label={`Kundenservice anrufen: ${siteContact.phoneDisplay}`}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-bank-border bg-white text-bank-primary-strong transition-colors group-hover:bg-bank-mint group-hover:border-bank-primary/30">
          <Phone className="h-3.5 w-3.5" strokeWidth={LUCIDE_STROKE} aria-hidden />
        </span>
        <span className="flex min-w-0 flex-col sm:flex-row sm:items-baseline sm:gap-2.5">
          <span className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-bank-primary-strong sm:inline">
            Persönliche Beratung
          </span>
          <span className="font-display text-[13px] font-medium tabular-nums leading-none tracking-tight text-bank-text transition-colors group-hover:text-bank-primary-strong sm:text-[14px]">
            {siteContact.phoneDisplay}
          </span>
          <span className="mt-0.5 text-[10px] leading-none text-bank-text-muted sm:mt-0 sm:border-l sm:border-bank-border sm:pl-2.5">
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
        'relative z-[101] border-b border-bank-border bg-bank-panel print:hidden',
        className,
      )}
    >
      <div className="mx-auto flex h-11 max-w-[1600px] items-center justify-between gap-4 px-5 sm:h-12 lg:px-12 xl:px-8">
        <NavCustomerServiceContact variant="topbar" />
        <a
          href={`mailto:${siteContact.email}`}
          className="group hidden min-w-0 shrink items-center gap-2 truncate text-[11px] text-bank-text-muted transition-colors hover:text-bank-primary-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bank-panel sm:inline-flex"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-bank-border bg-white text-bank-primary-strong transition-colors group-hover:bg-bank-mint group-hover:border-bank-primary/30">
            <Mail className="h-3.5 w-3.5" strokeWidth={LUCIDE_STROKE} aria-hidden />
          </span>
          <span className="truncate">{siteContact.email}</span>
        </a>
      </div>
    </div>
  );
};

export default NavCustomerServiceContact;
