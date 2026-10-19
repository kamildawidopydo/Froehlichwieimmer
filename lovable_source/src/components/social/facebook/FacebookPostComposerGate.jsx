import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import SocialAccessGate from '@/components/social/SocialAccessGate';
import { cn } from '@/lib/utils';
import { SOCIAL_PREVIEW_LIGHT } from '@/components/social/socialPreviewLight';

const FacebookPostComposerGate = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4" role="presentation">
      <button type="button" aria-label="Schließen" className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="social-composer-gate-title"
        className={cn(SOCIAL_PREVIEW_LIGHT, 'relative w-full max-w-lg overflow-hidden rounded-2xl bg-[#FDFBF7] shadow-2xl ring-1 ring-black/10')}
        onClick={(e) => e.stopPropagation()}
      >
        <SocialAccessGate variant="composer" compact className="min-h-0" onClose={onClose} onAcknowledge={onClose} />
      </div>
    </div>,
    document.body,
  );
};

export default FacebookPostComposerGate;
