import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSocialPreview } from '@/context/SocialPreviewContext';
import SocialAccessGate from '@/components/social/SocialAccessGate';
import FacebookPreview from '@/components/social/facebook/FacebookPreview';
import LinkedInPreview from '@/components/social/linkedin/LinkedInPreview';
import InstagramPreview from '@/components/social/instagram/InstagramPreview';
import { SOCIAL_PREVIEW_LIGHT } from '@/components/social/socialPreviewLight';

const PLATFORM_META = {
  facebook: {
    label: 'Facebook',
    bar: 'bg-[#1877F2]',
    wordmark: '/assets/social/wordmarks/facebook-wordmark-white.svg',
    wordmarkClass: 'h-[18px] w-auto',
  },
  linkedin: {
    label: 'LinkedIn',
    bar: 'bg-[#0A66C2]',
    wordmark: '/assets/social/wordmarks/linkedin-wordmark-white.svg',
    wordmarkClass: 'h-[22px] w-auto',
  },
  instagram: {
    label: 'Instagram',
    bar: 'bg-[#0095F6]',
    wordmark: '/assets/social/wordmarks/instagram-wordmark-white.svg',
    wordmarkClass: 'h-[26px] w-auto max-w-[min(200px,55vw)]',
  },
};

const SocialPreviewModal = () => {
  const { platform, isOpen, gatePassed, closePreview, acknowledgeGate } = useSocialPreview();

  useEffect(() => {
    if (!isOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') closePreview();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closePreview]);

  if (!isOpen || !platform) return null;

  const meta = PLATFORM_META[platform] ?? PLATFORM_META.facebook;
  const showGate = !gatePassed;

  return createPortal(
    <div className="fixed inset-0 z-modal flex items-center justify-center p-3 sm:p-5" role="presentation">
      <button
        type="button"
        aria-label="Schließen"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={closePreview}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="social-preview-title"
        className={cn(
          SOCIAL_PREVIEW_LIGHT,
          'relative flex max-h-[min(92vh,900px)] w-full max-w-[min(1100px,96vw)] flex-col overflow-hidden',
          'rounded-2xl bg-white shadow-2xl ring-1 ring-black/10',
          showGate && 'max-w-lg',
        )}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {!showGate && (
          <div className={cn('flex shrink-0 items-center justify-between px-4 py-3 text-white', meta.bar)}>
            <img
              id="social-preview-title"
              src={meta.wordmark}
              alt={meta.label}
              draggable={false}
              className={cn('object-contain object-left', meta.wordmarkClass)}
            />
            <button
              type="button"
              onClick={closePreview}
              className="rounded p-1 text-white/90 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              aria-label="Fenster schließen"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        )}

        {showGate ? (
          <SocialAccessGate
            platformLabel={meta.label}
            onClose={closePreview}
            onAcknowledge={acknowledgeGate}
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {platform === 'facebook' && <FacebookPreview />}
            {platform === 'linkedin' && <LinkedInPreview />}
            {platform === 'instagram' && <InstagramPreview />}
          </div>
        )}

        {!showGate && (
          <p className="shrink-0 border-t border-[#e4e6eb] bg-[#f0f2f5] px-4 py-2 text-center text-[11px] text-[#65676b]">
            Diese Ansicht zeigt eine integrierte Vorschau der jeweiligen Social-Media-Präsenz innerhalb
            unserer Webseite.
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default SocialPreviewModal;
