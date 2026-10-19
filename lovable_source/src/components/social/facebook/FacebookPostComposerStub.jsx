import React from 'react';
import { Image, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';
import facebookProfile from '@/data/social/facebookProfile';
import { cardClass, PageAvatar } from '@/components/social/facebook/facebookShared';

const FacebookPostComposerStub = ({ onOpenGate, className }) => (
  <div className={cn(cardClass, 'p-3', className)}>
    <div className="flex gap-2">
      <button type="button" onClick={onOpenGate} className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1877F2]" aria-label="Profil anzeigen">
        <PageAvatar size={40} />
      </button>
      <button
        type="button"
        onClick={onOpenGate}
        className="flex min-h-[40px] flex-1 items-center rounded-full bg-[#f0f2f5] px-4 text-left text-[15px] text-[#65676b] transition-colors hover:bg-[#e4e6eb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1877F2]"
      >
        Was gibt es Neues, {facebookProfile.pageName}?
      </button>
    </div>
    <div className="mt-2 flex gap-1 border-t border-[#dddfe2] pt-2">
      <button type="button" onClick={onOpenGate} className="flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-[13px] font-semibold text-[#65676b] hover:bg-[#f0f2f5]">
        <Image className="h-5 w-5 text-[#45bd62]" strokeWidth={1.5} aria-hidden />
        Foto/Video
      </button>
      <button type="button" onClick={onOpenGate} className="flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-[13px] font-semibold text-[#65676b] hover:bg-[#f0f2f5]">
        <Smile className="h-5 w-5 text-[#f7b928]" strokeWidth={1.5} aria-hidden />
        Stimmung
      </button>
    </div>
  </div>
);

export default FacebookPostComposerStub;
