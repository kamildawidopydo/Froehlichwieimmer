import React from 'react';
import { cn } from '@/lib/utils';
import Eyebrow from '@/components/editorial/Eyebrow';

/**
 * Section header pattern: eyebrow → display headline → optional lede.
 * Embeds a hairline brass rule under the eyebrow for editorial feel.
 */
const SectionLabel = ({
  eyebrow,
  title,
  lede,
  align = 'left',
  tone = 'light',
  size = 'md',
  className,
}) => {
  const isDark = tone === 'dark';
  const titleSize =
    size === 'lg' ? 'text-display-lg'
    : size === 'sm' ? 'text-display-sm'
    : 'text-display-md';

  return (
    <header
      className={cn(
        'flex flex-col gap-5',
        align === 'center' && 'items-center text-center',
        align === 'right' && 'items-end text-right',
        className
      )}
    >
      {eyebrow && (
        <div className={cn('flex items-center gap-3', align === 'center' && 'justify-center')}>
          <Eyebrow tone={isDark ? 'light' : 'muted'}>{eyebrow}</Eyebrow>
          <span aria-hidden className="rule-accent" />
        </div>
      )}
      {title && (
        <h2
          className={cn(
            'max-w-3xl font-semibold',
            titleSize,
            isDark ? 'text-white' : 'text-bank-text',
            align === 'center' && 'mx-auto'
          )}
        >
          {title}
        </h2>
      )}
      {lede && (
        <p
          className={cn(
            'max-w-2xl text-base leading-relaxed sm:text-lg',
            isDark ? 'text-white/65' : 'text-bank-text-muted',
            align === 'center' && 'mx-auto'
          )}
        >
          {lede}
        </p>
      )}
    </header>
  );
};

export default SectionLabel;
