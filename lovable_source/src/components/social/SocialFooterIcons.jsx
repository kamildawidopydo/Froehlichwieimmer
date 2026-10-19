import React from 'react';
import { cn } from '@/lib/utils';
import { useSocialPreview } from '@/context/SocialPreviewContext';
import { SocialPlatformIcon } from '@/components/social/SocialPlatformIcon';

const iconBtn =
  'flex h-11 w-11 items-center justify-center rounded-full border border-bank-border bg-white p-2 text-bank-primary shadow-sm transition-all duration-200 hover:border-bank-primary/40 hover:bg-bank-mint hover:text-bank-primary-strong hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bank-panel disabled:cursor-not-allowed disabled:opacity-45';

const PLATFORMS = [
  { id: 'facebook', label: 'Fröhlich Vermögensberatung GmbH auf Facebook — Vorschau öffnen' },
  { id: 'linkedin', label: 'Fröhlich Vermögensberatung GmbH auf LinkedIn — Vorschau öffnen' },
  { id: 'instagram', label: 'Fröhlich Vermögensberatung GmbH auf Instagram — Vorschau öffnen' },
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
          data-testid={`social-footer-icon-${id}`}
          onClick={() => openPreview(id)}
        >
          <SocialPlatformIcon platform={id} className="h-full w-full" />
        </button>
      ))}
    </div>
  );
};

export default SocialFooterIcons;
