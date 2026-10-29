import React from 'react';
import { cn } from '@/lib/utils';

const StatTile = ({ icon: Icon, label, value, sub, tone = 'neutral', className }) => (
  <div
    className={cn(
      'min-w-0 h-full rounded-lg border border-bank-border bg-bank-surface p-4 sm:p-5',
      className,
    )}
  >
    <div className="flex min-w-0 items-start gap-2 text-bank-text-muted">
      {Icon && <Icon size={15} strokeWidth={1.6} className="mt-0.5 shrink-0" />}
      <p className="text-xs font-medium leading-5">{label}</p>
    </div>
    <p
      className={cn(
        'mt-3 break-words text-xl font-semibold tabular-nums leading-tight',
        tone === 'neg' ? 'text-bank-error' : tone === 'gain' ? 'text-bank-success' : 'text-bank-text',
      )}
    >
      {value}
    </p>
    {sub && <div className="mt-2 text-xs leading-5 text-bank-text-muted">{sub}</div>}
  </div>
);

export default StatTile;
