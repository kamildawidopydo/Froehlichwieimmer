import React from 'react';
import { cn } from '@/lib/utils';
import facebookProfile from '@/data/social/facebookProfile';
import { SocialBrandLogo } from '@/components/social/SocialBrandLogo';

export const FB_BLUE = '#1877F2';

export const TABS = [
  { id: 'beitraege', label: 'Beiträge' },
  { id: 'info', label: 'Info' },
  { id: 'fotos', label: 'Fotos' },
  { id: 'kontakt', label: 'Kontakt' },
];

export const FB_REACTION_META = {
  like: { emoji: '👍', label: 'Gefällt mir', bg: '#1877F2' },
  love: { emoji: '❤️', label: 'Liebe', bg: '#f33e58' },
  haha: { emoji: '😆', label: 'Haha', bg: '#f7b125' },
  wow: { emoji: '😮', label: 'Wow', bg: '#f7b125' },
  sad: { emoji: '😢', label: 'Traurig', bg: '#f7b125' },
  angry: { emoji: '😡', label: 'Wütend', bg: '#e9710f' },
};

export const cardClass = 'rounded-lg border border-[#dddfe2] bg-white shadow-sm';

export const PageAvatar = ({ className, size = 40 }) => (
  <span
    className={cn(
      'flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#dddfe2] bg-white shadow-sm',
      size >= 80 ? 'px-[6%] py-[14%]' : 'px-1 py-1.5',
      className,
    )}
    style={{ width: size, height: size }}
  >
    <SocialBrandLogo src={facebookProfile.assets.avatar} alt="Kapitalmitte" fit="wide" />
  </span>
);

export const LocalUserAvatar = () => (
  <span
    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e4e6eb] text-[13px] font-semibold text-[#65676b]"
    aria-hidden
  >
    S
  </span>
);
