import React from 'react';
import { Image, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import linkedinProfile from '@/data/social/linkedinProfile';
import { cardClass, CompanyLogo } from '@/components/social/linkedin/linkedinShared';

const LinkedInPostComposerStub = ({ onOpenGate, className }) => (
  <div className={cn(cardClass, 'p-3', className)}>
    <div className="flex gap-3">
      <button type="button" onClick={onOpenGate} className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2]" aria-label="Profil anzeigen">
        <CompanyLogo size={48} />
      </button>
      <button
        type="button"
        onClick={onOpenGate}
        className="flex min-h-[48px] flex-1 items-center rounded-full border border-[#E0E0E0] px-4 text-left text-[14px] font-medium text-[#666] transition-colors hover:bg-[#00000006] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2]"
      >
        Beitrag als {linkedinProfile.companyName} verfassen …
      </button>
    </div>
    <div className="mt-3 flex justify-around border-t border-[#E0E0E0] pt-2">
      <button
        type="button"
        onClick={onOpenGate}
        className="flex items-center gap-2 rounded-md px-3 py-2 text-[14px] font-semibold text-[#666] hover:bg-[#00000006]"
      >
        <Image className="h-5 w-5 text-[#57c5c6]" strokeWidth={1.5} aria-hidden />
        Foto
      </button>
      <button
        type="button"
        onClick={onOpenGate}
        className="flex items-center gap-2 rounded-md px-3 py-2 text-[14px] font-semibold text-[#666] hover:bg-[#00000006]"
      >
        <Calendar className="h-5 w-5 text-[#e16745]" strokeWidth={1.5} aria-hidden />
        Event
      </button>
    </div>
  </div>
);

export default LinkedInPostComposerStub;
