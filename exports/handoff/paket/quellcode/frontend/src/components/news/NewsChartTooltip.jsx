import React from 'react';
import { cn } from '@/lib/utils';

const NewsChartTooltip = ({ label, value, sub, className }) => (
  <div
    className={cn(
      'rounded-md border border-bank-border/80 bg-white/95 px-2.5 py-1.5 text-[11px] shadow-editorial-sm backdrop-blur-sm dark:border-white/10 dark:bg-bank-ink/90',
      className,
    )}
  >
    {label ? <p className="font-medium text-bank-text-muted">{label}</p> : null}
    {value != null ? (
      <p className="font-semibold tabular-nums text-bank-text">{value}</p>
    ) : null}
    {sub ? <p className="text-[10px] tabular-nums text-bank-text-muted">{sub}</p> : null}
  </div>
);

export default NewsChartTooltip;
