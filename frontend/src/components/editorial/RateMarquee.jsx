import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Silent ticker for live rates. Pauses on hover.
 * items: [{ bank, rate, term }]
 */
const RateMarquee = ({ items, tone = 'light', className }) => {
  if (!items?.length) return null;
  const isDark = tone === 'dark';
  const doubled = [...items, ...items];

  return (
    <div
      className={cn(
        'marquee-pause relative overflow-hidden border-y',
        isDark
          ? 'border-white/10 bg-bank-ink/75 text-white/85'
          : 'border-bank-border bg-white text-bank-text',
        className
      )}
      aria-label="Aktuelle Sparzinsen — Übersicht"
    >
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r',
          isDark ? 'from-bank-ink/90' : 'from-white'
        )}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l',
          isDark ? 'from-bank-ink/90' : 'from-white'
        )}
      />
      <div className="marquee-track flex w-max items-center gap-12 py-4">
        {doubled.map((it, i) => (
          <span
            key={i}
            className="flex shrink-0 items-center gap-3 text-[13px] font-medium tracking-[0.04em]"
          >
            <span aria-hidden className="h-[3px] w-[3px] rounded-full bg-bank-accent-strong dark:bg-bank-accent" />
            <span className={cn('uppercase tracking-[0.18em] text-[10.5px]', isDark ? 'text-white/55' : 'text-bank-text-muted')}>
              {it.bank}
            </span>
            <span className={cn('rate-figure text-base', isDark ? 'text-white' : 'text-bank-text')} data-numeric>
              {it.rate}
            </span>
            <span className="font-mono text-[10.5px] text-bank-accent-strong dark:text-bank-accent">% p.a.</span>
            {it.term && (
              <span className={cn('font-mono text-[10.5px]', isDark ? 'text-white/45' : 'text-bank-text-muted/85')}>
                · {it.term}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
};

export default RateMarquee;
