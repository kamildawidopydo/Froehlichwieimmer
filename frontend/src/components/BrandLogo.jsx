import React from 'react';
import { cn } from '@/lib/utils';
import {
  BRAND_LOGO_ON_DARK_SRC,
  BRAND_LOGO_PNG_SRC,
} from '@/lib/brand';

/**
 * Kapitalmitte lockup — transparent PNG only.
 * Light: blue lockup. Dark / onDark: white lockup.
 * Letter counters are punched transparent (no solid white fills).
 */
export default function BrandLogo({
  alt = 'Kapitalmitte',
  className,
  imgClassName,
  variant = 'auto',
  ...props
}) {
  const baseCls = cn('w-auto max-w-full object-contain object-left overflow-visible', imgClassName, className);

  if (variant === 'onDark') {
    return <img src={BRAND_LOGO_ON_DARK_SRC} alt={alt} className={baseCls} {...props} />;
  }

  if (variant === 'light' || variant === 'png') {
    return <img src={BRAND_LOGO_PNG_SRC} alt={alt} className={baseCls} {...props} />;
  }

  // auto: swap with theme so night mode never shows white counter blobs
  return (
    <>
      <img
        src={BRAND_LOGO_PNG_SRC}
        alt={alt}
        className={cn(baseCls, 'dark:hidden')}
        {...props}
      />
      <img
        src={BRAND_LOGO_ON_DARK_SRC}
        alt=""
        aria-hidden="true"
        className={cn(baseCls, 'hidden dark:block')}
        {...props}
      />
    </>
  );
}
