import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Section kicker with accent dot — brand primary.
 */
const Eyebrow = ({ children, as: Tag = 'p', className, dotless = false, tone = 'muted' }) => {
  const dotClass = 'bg-bank-primary';
  const toneClass =
    tone === 'light' ? 'text-white/75'
    : tone === 'gold' ? 'text-bank-primary'
    : 'text-bank-text-muted';

  return (
    <Tag
      className={cn(
        'inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.28em]',
        toneClass,
        className
      )}
    >
      {!dotless && <span aria-hidden className={cn('h-[5px] w-[5px] rounded-full', dotClass)} />}
      <span>{children}</span>
    </Tag>
  );
};

export default Eyebrow;
