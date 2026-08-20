import React from 'react';
import { cn } from '@/lib/utils';
import {
  BRAND_LOGO_ON_DARK_SRC,
  BRAND_LOGO_PNG_SRC,
} from '@/lib/brand';

/**
 * Fröhlich Vermögensberatung lockup.
 * - `light` / auto (light theme): raw transparent PNG (blue-on-white/transparent).
 * - `onDark` / auto (dark theme): same lockup wrapped in a compact white
 *   "logo card" with rounded corners + subtle drop shadow — the standard
 *   professional treatment for a light-only logo on a dark surface.
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
  const darkCard =
    'inline-flex items-center rounded-2xl bg-white px-4 py-2 shadow-[0_12px_32px_-14px_rgba(0,0,0,0.55)] ring-1 ring-black/[0.04]';

  if (variant === 'onDark') {
    return (
      <span className={cn(darkCard, className)}>
        <img src={BRAND_LOGO_ON_DARK_SRC} alt={alt} className={imgCls} {...props} />
      </span>
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

  // auto: swap treatment with theme so dark mode never shows a floating white slab
  return (
    <>
      <img
        src={BRAND_LOGO_PNG_SRC}
        alt={alt}
        className={cn(imgCls, className, 'dark:hidden')}
        {...props}
      />
      <span className={cn(darkCard, className, 'hidden dark:inline-flex')}>
        <img
          src={BRAND_LOGO_ON_DARK_SRC}
          alt=""
          aria-hidden="true"
          className={imgCls}
          {...props}
        />
      </span>
    </>
  );
}
