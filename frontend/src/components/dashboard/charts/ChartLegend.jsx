import React from 'react';
import { cn } from '@/lib/utils';

/** Inline swatch legend below charts. */
const ChartLegend = ({ items = [], className }) => {
  if (!items.length) return null;
  return (
    <div
      className={cn(
        'mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-bank-border/50 px-1 pt-3 text-[11px] text-bank-text-muted',
        className,
      )}
    >
      {items.map(({ key, label, color }) => (
        <span key={key ?? label} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-sm"
            style={{ background: color }}
            aria-hidden
          />
          {label}
        </span>
      ))}
    </div>
  );
};

export default ChartLegend;
