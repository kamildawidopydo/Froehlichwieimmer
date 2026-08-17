import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Editorial pull-quote with an accent-blue left rule and Fraunces italic body.
 * Use inside long-form articles to break the rhythm and emphasize key claims.
 */
const Pullquote = ({ children, cite, tone = 'light', className }) => {
  const isDark = tone === 'dark';
  return (
    <figure
      className={cn(
        'my-10 border-l-2 pl-6 sm:my-12 sm:pl-7',
        isDark ? 'border-bank-accent/65' : 'border-bank-accent-strong/55',
        className
      )}
    >
      <blockquote
        className={cn(
          'max-w-full break-words font-display text-[1.25rem] font-light italic leading-[1.4] [overflow-wrap:anywhere] sm:text-[1.65rem]',
          isDark ? 'text-white' : 'text-bank-text',
        )}
        style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
      >
        {children}
      </blockquote>
      {cite && (
        <figcaption
          className={cn(
            'mt-4 font-mono text-[10.5px] uppercase tracking-[0.22em]',
            isDark ? 'text-white/55' : 'text-bank-text-muted'
          )}
        >
          — {cite}
        </figcaption>
      )}
    </figure>
  );
};

export default Pullquote;
