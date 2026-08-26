import React from 'react';
import { cn } from '@/lib/utils';
import { BRAND_LOGO_PNG_SRC } from '@/lib/brand';

/**
 * Fröhlich Vermögensberatung lockup — echt transparent, kein weißer Karten-Hintergrund.
 * - Light / auto (light theme): Original-Blau auf transparent.
 * - onDark / auto (dark theme): transparente PNG-Variante; per CSS-Filter zu Weiß
 *   gefärbt (funktioniert nur mit echt transparentem Hintergrund).
 * Session 80.26 fix-pass: switched dark variant source from opaque `frohlich-logo.png`
 * to `frohlich-logo-transparent.png` — Test-Agent reported the invert filter produced
 * a solid white rectangle instead of a white wordmark.
 */
const BRAND_LOGO_TRANSPARENT_SRC = '/assets/logo/frohlich-logo-transparent.png?v=3';

export default function BrandLogo({
  alt = 'Fröhlich Vermögensberatung',
  className,
  imgClassName,
  variant = 'auto',
  ...props
}) {
  const imgCls = cn(
    'w-auto max-w-full object-contain object-left overflow-visible',
    imgClassName,
  );

  // Farbfilter macht die (transparent gelieferte) Wortmarke auf dunklen Flächen weiß.
  // Stabiler Class-Hook `brand-logo-invertible` gestattet CSS-Overrides (siehe index.css
  // Session 80.26 fix-pass: mix-blend-mode: screen für nicht-transparente PNGs).
  const invertToWhite = 'brand-logo-invertible [filter:brightness(0)_invert(1)]';

  if (variant === 'onDark') {
    return (
      <img
        src={BRAND_LOGO_TRANSPARENT_SRC}
        alt={alt}
        className={cn(imgCls, invertToWhite, className)}
        {...props}
      />
    );
  }

  if (variant === 'light' || variant === 'png') {
    return (
      <img
        src={BRAND_LOGO_PNG_SRC}
        alt={alt}
        className={cn(imgCls, className)}
        {...props}
      />
    );
  }

  // auto: helles Theme → Original, dunkles Theme → transparente PNG + Invert
  return (
    <>
      <img
        src={BRAND_LOGO_PNG_SRC}
        alt={alt}
        className={cn(imgCls, className, 'dark:hidden')}
        {...props}
      />
      <img
        src={BRAND_LOGO_TRANSPARENT_SRC}
        alt=""
        aria-hidden="true"
        className={cn(imgCls, invertToWhite, className, 'hidden dark:inline-block')}
        {...props}
      />
    </>
  );
}
