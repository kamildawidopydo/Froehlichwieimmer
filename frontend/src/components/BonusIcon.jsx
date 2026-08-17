import React from 'react';
import { cn } from '@/lib/utils';
import siteImages from '@/data/siteImages';

/**
 * Shared bonus gift mark — Recraft `box` asset (SVG).
 * Lucide-compatible props: size, className, strokeWidth (ignored).
 */
const BonusIcon = ({
  className,
  size,
  tone: _tone = 'gold',
  title,
  'aria-hidden': ariaHidden,
  strokeWidth: _strokeWidth,
  ...props
}) => {
  const labelled = Boolean(title);
  const dim = typeof size === 'number' ? size : undefined;

  return (
    <img
      src={siteImages.icons.bonusGift}
      alt={labelled ? title : ''}
      title={title}
      width={dim}
      height={dim}
      className={cn('shrink-0 object-contain', className)}
      role={labelled ? 'img' : undefined}
      aria-hidden={labelled ? undefined : ariaHidden ?? true}
      decoding="async"
      {...props}
    />
  );
};

export default BonusIcon;
