import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { SocialBrandLogo } from '@/components/social/SocialBrandLogo';
import { SocialVerifiedBadge } from '@/components/social/SocialVerifiedBadge';
import { IG_GRADIENT } from '@/components/social/instagram/instagramShared';
import { cn } from '@/lib/utils';
import { SOCIAL_PREVIEW_LIGHT } from '@/components/social/socialPreviewLight';

/** Plattformspezifische Profilbild-Vorschau (Facebook / Instagram). LinkedIn hat keine. */
const SocialProfilePhotoPreview = ({ open, onClose, platform, src, alt = '', title, verified }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (!open || !platform || platform === 'linkedin') return null;

  if (platform === 'instagram') {
    return createPortal(
      <div className="fixed inset-0 z-[230] flex items-center justify-center p-6" role="presentation">
        <button type="button" aria-label="Schließen" className="absolute inset-0 bg-black/85" onClick={onClose} />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Profilbild von ${title}`}
          className={cn(SOCIAL_PREVIEW_LIGHT, 'relative flex flex-col items-center')}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute -top-12 right-0 rounded-full p-2 text-white/90 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            aria-label="Schließen"
          >
            <X className="h-6 w-6" strokeWidth={1.75} />
          </button>
          <span
            className="inline-flex items-center justify-center rounded-full p-[4px]"
            style={{ background: IG_GRADIENT, width: 280, height: 280 }}
          >
            <span className="flex h-[272px] w-[272px] items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white">
              <SocialBrandLogo src={src} alt={alt} fit="wide" className="max-h-[55%]" />
            </span>
          </span>
          <p className="mt-4 flex items-center gap-1.5 text-[16px] font-semibold text-white">
            {title}
            {verified && <SocialVerifiedBadge platform="instagram" size="md" />}
          </p>
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[230] flex items-center justify-center p-4" role="presentation">
      <button type="button" aria-label="Schließen" className="absolute inset-0 bg-black/75" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Profilbild von ${title}`}
        className={cn(SOCIAL_PREVIEW_LIGHT, 'relative flex max-h-[min(90vh,720px)] w-full max-w-md flex-col overflow-hidden rounded-lg bg-white shadow-2xl')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#dddfe2] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-[15px] font-semibold text-[#050505]">{title}</p>
            {verified && <SocialVerifiedBadge platform="facebook" size="sm" title="Verifiziert" />}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#65676b] transition-colors hover:bg-[#f0f2f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1877F2]/40"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex items-center justify-center bg-[#0a2540] p-8">
          <div className="flex h-[min(60vw,320px)] w-[min(60vw,320px)] items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white px-6 py-8">
            <SocialBrandLogo src={src} alt={alt} fit="wide" />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default SocialProfilePhotoPreview;
