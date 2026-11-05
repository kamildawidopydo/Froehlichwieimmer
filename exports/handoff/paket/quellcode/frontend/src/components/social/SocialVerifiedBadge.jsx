import React from 'react';
import { cn } from '@/lib/utils';

const COLORS = {
  instagram: '#0095F6',
  facebook: '#1877F2',
  linkedin: '#0A66C2',
};

const SIZES = { sm: 16, md: 20, lg: 24 };

/** Crisp vector verified mark — avoids pixelated Lucide / oversized star paths at small sizes. */
export const SocialVerifiedBadge = ({ platform = 'instagram', size = 'sm', className, title, ...rest }) => {
  const px = typeof size === 'number' ? size : (SIZES[size] ?? 16);
  const fill = COLORS[platform] ?? COLORS.instagram;

  if (platform === 'linkedin') {
    return (
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        className={cn('inline-block shrink-0', className)}
        aria-hidden={!title}
        {...rest}
      >
        <rect x="2" y="2" width="20" height="20" rx="4" fill={fill} />
        <path
          fill="#fff"
          d="M10.2 16.5 6.5 12.8l1.4-1.4 2.2 2.2 5.8-5.8 1.4 1.4z"
        />
      </svg>
    );
  }

  if (platform === 'facebook') {
    return (
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        className={cn('inline-block shrink-0', className)}
        aria-hidden={!title}
        {...rest}
      >
        <circle cx="12" cy="12" r="10" fill={fill} />
        <path
          fill="#fff"
          d="M10.2 16.5 6.5 12.8l1.4-1.4 2.2 2.2 5.8-5.8 1.4 1.4z"
        />
      </svg>
    );
  }

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      className={cn('inline-block shrink-0', className)}
      aria-label={title ?? 'Verifiziert'}
      role="img"
      {...rest}
    >
      <circle cx="12" cy="12" r="10" fill={fill} />
      <path fill="#fff" d="M10.2 16.5 6.5 12.8l1.4-1.4 2.2 2.2 5.8-5.8 1.4 1.4z" />
    </svg>
  );
};

export default SocialVerifiedBadge;
