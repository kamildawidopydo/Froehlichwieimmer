import React from 'react';
import { Bell, Grid2X2, MessageCircle, Search } from 'lucide-react';
import { SocialBrandLogo } from '@/components/social/SocialBrandLogo';
import { SocialPlatformIcon } from '@/components/social/SocialPlatformIcon';

const FacebookTopNav = ({ onFakeAction, onSearchClick, onMessageClick }) => (
  <div className="border-b border-[#dddfe2] bg-white">
    <div className="mx-auto flex max-w-[1012px] items-center gap-3 px-3 py-2 sm:px-4 md:px-6">
      <SocialPlatformIcon platform="facebook" className="h-10 w-10 shrink-0" alt="Facebook" />
      <button
        type="button"
        onClick={onSearchClick}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-[#f0f2f5] px-3 py-2 text-left transition-colors hover:bg-[#e4e6eb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1877F2]/40"
        aria-label="Auf Facebook suchen"
      >
        <Search className="h-4 w-4 shrink-0 text-[#65676b]" strokeWidth={2} />
        <span className="truncate text-[15px] text-[#65676b]">Auf Facebook suchen</span>
      </button>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button type="button" onClick={onFakeAction} aria-label="Menü" className="rounded-full p-2 hover:bg-[#f0f2f5]">
          <Grid2X2 className="h-5 w-5 text-[#050505]" strokeWidth={1.75} />
        </button>
        <button type="button" onClick={onMessageClick} aria-label="Messenger" className="rounded-full p-2 hover:bg-[#f0f2f5]">
          <MessageCircle className="h-5 w-5 text-[#050505]" strokeWidth={1.75} />
        </button>
        <button type="button" onClick={onFakeAction} aria-label="Benachrichtigungen" className="rounded-full p-2 hover:bg-[#f0f2f5]">
          <Bell className="h-5 w-5 text-[#050505]" strokeWidth={1.75} />
        </button>
        <span className="hidden h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[#dddfe2] bg-white px-1 sm:flex">
          <SocialBrandLogo src="/assets/logo/frohlich-logo.png?v=2" fit="wide" />
        </span>
      </div>
    </div>
  </div>
);

export default FacebookTopNav;
