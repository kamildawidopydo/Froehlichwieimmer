import React from 'react';
import { Bell, Briefcase, Home, MessageCircle, Search, Users } from 'lucide-react';
import { SocialBrandLogo } from '@/components/social/SocialBrandLogo';
import { SocialPlatformIcon } from '@/components/social/SocialPlatformIcon';

const NAV = [
  { Icon: Home, label: 'Startseite' },
  { Icon: Users, label: 'Netzwerk' },
  { Icon: Briefcase, label: 'Jobs' },
  { Icon: MessageCircle, label: 'Nachrichten' },
  { Icon: Bell, label: 'Mitteilungen' },
];

const LinkedInTopNav = ({ onFakeAction, onSearchClick, onMessageClick }) => (
  <div className="border-b border-[#E0E0E0] bg-white">
    <div className="mx-auto flex max-w-[1128px] items-center gap-4 px-3 py-1.5 sm:px-4">
      <SocialPlatformIcon platform="linkedin" className="h-9 w-9 shrink-0" alt="LinkedIn" />
      <button
        type="button"
        onClick={onSearchClick}
        className="hidden min-w-0 flex-1 items-center gap-2 rounded-sm bg-[#EEF3F8] px-3 py-1.5 text-left transition-colors hover:bg-[#dfe9f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2]/40 sm:flex sm:max-w-[280px]"
        aria-label="Suche"
      >
        <Search className="h-4 w-4 shrink-0 text-[#666]" strokeWidth={2} />
        <span className="truncate text-[14px] text-[#666]">Suche</span>
      </button>
      <button
        type="button"
        onClick={onSearchClick}
        className="flex shrink-0 rounded-sm p-2 text-[#666] hover:bg-[#EEF3F8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2]/40 sm:hidden"
        aria-label="Suche"
      >
        <Search className="h-5 w-5" strokeWidth={2} />
      </button>
      <nav className="ml-auto flex items-center gap-0 sm:gap-1" aria-label="LinkedIn Navigation">
        {NAV.map(({ Icon, label }) => (
          <button
            key={label}
            type="button"
            onClick={label === 'Nachrichten' ? onMessageClick : onFakeAction}
            aria-label={label}
            className="flex min-w-[48px] flex-col items-center gap-0.5 px-2 py-1 text-[#666] hover:text-[rgba(0,0,0,0.9)]"
          >
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />
            <span className="hidden text-[10px] sm:block">{label}</span>
          </button>
        ))}
        <span className="ml-1 hidden h-6 w-px bg-[#E0E0E0] sm:block" aria-hidden />
        <span className="ml-1 flex h-7 w-7 items-center justify-center overflow-hidden rounded-sm border border-[#E0E0E0] bg-white px-0.5 sm:h-8 sm:w-8">
          <SocialBrandLogo src="/assets/logo/frohlich-logo.png?v=2" fit="wide" />
        </span>
      </nav>
    </div>
  </div>
);

export default LinkedInTopNav;
