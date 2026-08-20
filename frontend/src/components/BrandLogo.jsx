import React from 'react';
import { cn } from '@/lib/utils';
import { BRAND_LOGO_PNG_SRC } from '@/lib/brand';

/**
 * Fröhlich Vermögensberatung lockup — echt transparent, kein weißer Karten-Hintergrund.
 * - `light` / auto (light theme): Original-Blau auf transparent.
 * - `onDark` / auto (dark theme): dieselbe PNG, per CSS-Filter zu Weiß invertiert
 *   → wirkt auf blauen/dunklen Flächen sauber ohne Kasten.
 */
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

  // Filter macht die blaue Wortmarke auf dunklen Untergründen komplett weiß.
  const invertToWhite = '[filter:brightness(0)_invert(1)]';

  if (variant === 'onDark') {
    return (
      <img
        src={BRAND_LOGO_PNG_SRC}
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

  // auto: helles Theme → Original, dunkles Theme → weiß-invertiert (kein Kasten)
  return (
    <>
      <img
        src={BRAND_LOGO_PNG_SRC}
        alt={alt}
        className={cn(imgCls, className, 'dark:hidden')}
        {...props}
      />
      <img
        src={BRAND_LOGO_PNG_SRC}
        alt=""
        aria-hidden="true"
        className={cn(imgCls, invertToWhite, className, 'hidden dark:inline-block')}
        {...props}
      />
    </>
  );
}
