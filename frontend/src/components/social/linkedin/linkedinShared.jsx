import React from 'react';
import { cn } from '@/lib/utils';
import linkedinProfile from '@/data/social/linkedinProfile';
import { SocialBrandLogo } from '@/components/social/SocialBrandLogo';

export const LI = '#0A66C2';

export const TABS = [
  { id: 'startseite', label: 'Startseite' },
  { id: 'beitraege', label: 'Beiträge' },
  { id: 'info', label: 'Info' },
  { id: 'mitarbeiter', label: 'Mitarbeiter' },
  { id: 'produkte', label: 'Produkte' },
];

export const REACTION_META = {
  like: { emoji: '👍', label: 'Gefällt mir', bg: '#0A66C2' },
  celebrate: { emoji: '🎉', label: 'Feiern', bg: '#6dae4f' },
  support: { emoji: '💜', label: 'Unterstützen', bg: '#9b72b0' },
  love: { emoji: '❤️', label: 'Gefallen', bg: '#df704d' },
  insightful: { emoji: '💡', label: 'Einsichtig', bg: '#f5b240' },
  funny: { emoji: '😄', label: 'Lustig', bg: '#56a4c7' },
};

export const CompanyLogo = ({ className, size = 48 }) => (
  <span
    className={cn(
      'flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#E0E0E0] bg-white',
      size >= 72 ? 'px-[8%] py-[12%]' : 'px-1 py-1.5',
      className,
    )}
    style={{ width: size, height: size }}
  >
    <SocialBrandLogo src={linkedinProfile.assets.logo} alt="Kapitalmitte" fit="wide" />
  </span>
);

export const LocalUserAvatar = () => (
  <span
    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E0E0E0] text-[14px] font-semibold text-[#666]"
    aria-hidden
  >
    S
  </span>
);

export const cardClass = 'overflow-hidden rounded-lg border border-[#E0E0E0] bg-white';
