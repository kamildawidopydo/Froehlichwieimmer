import React from 'react';
import { cn } from '@/lib/utils';
import { preventImageContextMenu, protectedImageStyle } from '@/components/social/socialImageProtect';

const SocialAvatarImage = ({ src, alt = '', className, style, loading = 'lazy', onError }) => (
  <img
    src={src}
    alt={alt}
    draggable={false}
    loading={loading}
    className={cn('select-none', className)}
    style={{ ...protectedImageStyle, ...style }}
    onContextMenu={preventImageContextMenu}
    onError={onError}
  />
);

export default SocialAvatarImage;
