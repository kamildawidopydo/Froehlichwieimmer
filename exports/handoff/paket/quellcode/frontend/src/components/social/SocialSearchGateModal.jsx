import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import SocialAccessGate from '@/components/social/SocialAccessGate';
import { SOCIAL_PREVIEW_LIGHT } from '@/components/social/socialPreviewLight';

const PLATFORM_LABELS = {
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
};

/** Fake search — opens legal/info gate instead of a real search UI. */
const SocialSearchGateModal = ({ open, onClose, platform = 'facebook' }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const platformLabel = PLATFORM_LABELS[platform] ?? 'Facebook';

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4" role="presentation">
      <button type="button" aria-label="Schließen" className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="social-search-gate-title"
        className={cn(SOCIAL_PREVIEW_LIGHT, 'relative w-full max-w-lg overflow-hidden rounded-2xl bg-[#FDFBF7] shadow-2xl ring-1 ring-black/10')}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-[#94a3b8] transition-colors hover:bg-black/[0.04] hover:text-[#4a5568] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3a6b]/30"
          aria-label="Schließen"
        >
          <X className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <SocialAccessGate
          variant="search"
          platformLabel={platformLabel}
          compact
          className="min-h-0 pt-10"
          onClose={onClose}
          onAcknowledge={onClose}
        />
      </div>
    </div>,
    document.body,
  );
};

export default SocialSearchGateModal;
