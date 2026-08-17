import React from 'react';
import { cn } from '@/lib/utils';

const StatTile = ({ icon: Icon, label, value, sub, tone = 'neutral', className }) => (
  <div
    className={cn(
      'min-w-0 rounded-lg border border-bank-border bg-white p-3.5 shadow-sm transition-all duration-300 hover:border-bank-primary/20 hover:shadow-editorial-sm',
      className,
    )}
  >
    <div className="flex min-w-0 items-center gap-1.5 text-bank-text-muted">
      {Icon && <Icon size={13} strokeWidth={1.6} className="shrink-0 opacity-70" />}
      <p className="truncate text-[10px] font-semibold uppercase tracking-[0.05em]">{label}</p>
    </div>
    <p
      className={cn(
        'mt-1 truncate text-[17px] font-semibold tabular-nums leading-tight',
        tone === 'pos' ? 'text-emerald-600' : tone === 'neg' ? 'text-rose-600' : 'text-bank-text',
      )}
    >
      {value}
    </p>
    {sub && <div className="mt-0.5 truncate text-[11px] text-bank-text-muted">{sub}</div>}
  </div>
);

export default StatTile;
