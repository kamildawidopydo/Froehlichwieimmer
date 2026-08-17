import React from 'react';
import { cn } from '@/lib/utils';

const ICONS = {
  facebook: '/assets/social/icons/facebook.svg',
  linkedin: '/assets/social/icons/linkedin.svg',
  instagram: '/assets/social/icons/instagram.svg',
};

/** Official brand glyph for footer buttons and in-preview nav bars. */
export const SocialPlatformIcon = ({ platform, className, alt = '' }) => {
  const src = ICONS[platform];
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      className={cn('object-contain', className)}
    />
  );
};

export default SocialPlatformIcon;
