import React from 'react';
import { cn } from '@/lib/utils';
import { BRAND_LOGO_PNG_SRC } from '@/lib/brand';

/**
 * Fröhlich Vermögensberatung lockup — echt transparent, kein weißer Karten-Hintergrund.
 * Session 80.66: single-source PNG mit echter Alpha-Kanal-Transparenz
 * (`frohlich-logo-clear.png`, generiert via alpha-threshold + Anti-Alias-Ramp aus
 * dem Original-Palette-PNG). Vorher: opake Varianten erzeugten einen weißen
 * "Card"-Hintergrund auf warm-cream Flächen.
 *   - Light / auto (light theme): navy Wortmarke auf transparent.
 *   - Dark / onDark: gleiche Datei + `brand-logo-invertible` CSS-Hook färbt zu Weiß.
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

  // Class-Hook für Dark-Mode-Invert (siehe index.css: `:root.dark img.brand-logo-invertible`).
  const invertHook = 'brand-logo-invertible';

  if (variant === 'onDark') {
    return (
      <img
        src={BRAND_LOGO_PNG_SRC}
        alt={alt}
        className={cn(imgCls, invertHook, 'dark-force-invert', className)}
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

  // auto: einmalige `<img>`-Instanz, Dark-Mode wird via CSS-Klasse gehandhabt.
  return (
    <img
      src={BRAND_LOGO_PNG_SRC}
      alt={alt}
      className={cn(imgCls, invertHook, className)}
      {...props}
    />
  );
}
