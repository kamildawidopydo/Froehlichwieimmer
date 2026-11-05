import React from 'react';
import { cn } from '@/lib/utils';
import instagramProfile from '@/data/social/instagramProfile';
import { SocialVerifiedBadge } from '@/components/social/SocialVerifiedBadge';
import { SocialBrandLogo } from '@/components/social/SocialBrandLogo';

export const IG_GRADIENT =
  'linear-gradient(45deg, #F58529 0%, #DD2A7B 50%, #8134AF 75%, #515BD4 100%)';

export const ProfileAvatar = ({ size = 88, className }) => (
  <span
    className={cn('inline-flex shrink-0 items-center justify-center rounded-full p-[3px]', className)}
    style={{ background: IG_GRADIENT, width: size, height: size }}
  >
    <span
      className="flex items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white"
      style={{ width: size - 6, height: size - 6 }}
    >
      <SocialBrandLogo src={instagramProfile.assets.avatar} fit="wide" className="max-h-[70%]" />
    </span>
  </span>
);

export const VerifiedBadge = () => <SocialVerifiedBadge platform="instagram" size="md" />;

export const LocalUserAvatar = () => (
  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#efefef] text-[11px] font-semibold text-[#262626]">
    Sie
  </span>
);
