import React from 'react';
import { cn } from '@/lib/utils';
import { preventImageContextMenu, protectedImageStyle } from '@/components/social/socialImageProtect';

/**
 * Fröhlich Vermögensberatung wordmark is very wide — in circular avatars use width-first sizing
 * so the logo stays legible (not a tiny strip in the center).
 */
export const SocialBrandLogo = ({ src, alt = '', className, fit = 'wide' }) => (
  <img
    src={src}
    alt={alt}
    draggable={false}
    className={cn(
      'select-none object-contain object-center',
      fit === 'wide' ? 'h-auto w-[92%] max-w-[92%]' : 'max-h-full max-w-full',
      className,
    )}
    style={protectedImageStyle}
    onContextMenu={preventImageContextMenu}
  />
);

export default SocialBrandLogo;
