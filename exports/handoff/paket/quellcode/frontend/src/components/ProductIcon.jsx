import React from 'react';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import { getProductIcon, PRODUCT_ICON_ACCENT } from '@/lib/productIcons';

const SIZE = {
  xs: { box: 'h-7 w-7', icon: 14, stroke: LUCIDE_STROKE },
  sm: { box: 'h-8 w-8', icon: 16, stroke: LUCIDE_STROKE },
  md: { box: 'h-10 w-10', icon: 18, stroke: 1.6 },
  lg: { box: 'h-12 w-12', icon: 22, stroke: LUCIDE_STROKE },
  empty: { box: null, icon: 32, stroke: 1.4 },
};

/**
 * Shared product glyph — Festgeld, Tagesgeld, Flexgeld, Aktien, Anleihen, IPO.
 * Uses the canonical Lucide mapping from `@/lib/productIcons`.
 */
const ProductIcon = ({
  product,
  size = 'md',
  className,
  iconClassName,
  showBubble = true,
  ...props
}) => {
  const Icon = getProductIcon(product);
  if (!Icon) return null;

  const cfg = SIZE[size] || SIZE.md;
  const accent = PRODUCT_ICON_ACCENT[product] || 'text-bank-primary';

  if (!showBubble || !cfg.box) {
    return (
      <Icon
        size={cfg.icon}
        strokeWidth={cfg.stroke}
        className={cn(accent, iconClassName, className)}
        aria-hidden
        {...props}
      />
    );
  }

  return (
    <div
      className={cn(
        cfg.box,
        'flex shrink-0 items-center justify-center rounded-lg border border-bank-primary/20 bg-bank-primary/5',
        accent,
        className,
      )}
    >
      <Icon size={cfg.icon} strokeWidth={cfg.stroke} className={iconClassName} aria-hidden {...props} />
    </div>
  );
};

export default ProductIcon;
