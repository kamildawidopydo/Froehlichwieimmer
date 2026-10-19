import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Editorial KPI: oversized serif numeral with mono caption.
 * <Stat value="34" unit="+" label="Partnerbanken in der EU" />
 */
const Stat = ({ value, unit, label, sublabel, tone = 'light', className }) => {
  const isDark = tone === 'dark';
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            'rate-figure text-display-md leading-none',
            isDark ? 'text-white' : 'text-bank-text'
          )}
          data-numeric
        >
          {value}
        </span>
        {unit && (
          <span
            className={cn(
              'font-mono text-base font-medium tracking-tight',
              isDark ? 'text-bank-accent' : 'text-bank-accent-strong'
            )}
          >
            {unit}
          </span>
        )}
      </div>
      <span aria-hidden className="rule-accent" />
      <p
        className={cn(
          'max-w-[14rem] text-[13px] font-medium uppercase tracking-[0.16em]',
          isDark ? 'text-white/70' : 'text-bank-text-muted'
        )}
      >
        {label}
      </p>
      {sublabel && (
        <p
          className={cn(
            'max-w-[18rem] text-sm leading-relaxed',
            isDark ? 'text-white/55' : 'text-bank-text-muted'
          )}
        >
          {sublabel}
        </p>
      )}
    </div>
  );
};

export default Stat;
