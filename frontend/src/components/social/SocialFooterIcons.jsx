import React from 'react';
import { cn } from '@/lib/utils';
import { useSocialPreview } from '@/context/SocialPreviewContext';
import { SocialPlatformIcon } from '@/components/social/SocialPlatformIcon';

const iconBtn =
  'flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white p-2 shadow-sm transition-all duration-200 hover:border-white/40 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bank-ink disabled:cursor-not-allowed disabled:opacity-45';

const PLATFORMS = [
  { id: 'facebook', label: 'Alexander Wahl Vermögensverwaltung GmbH auf Facebook — Vorschau öffnen' },
  { id: 'linkedin', label: 'Alexander Wahl Vermögensverwaltung GmbH auf LinkedIn — Vorschau öffnen' },
  { id: 'instagram', label: 'Alexander Wahl Vermögensverwaltung GmbH auf Instagram — Vorschau öffnen' },
];

const SocialFooterIcons = ({ className }) => {
  const { openPreview } = useSocialPreview();

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {PLATFORMS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className={iconBtn}
          aria-label={label}
          onClick={() => openPreview(id)}
        >
          <SocialPlatformIcon platform={id} className="h-full w-full" />
        </button>
      ))}
    </div>
  );
};

export default SocialFooterIcons;
