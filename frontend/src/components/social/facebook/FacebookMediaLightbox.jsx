import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SOCIAL_PREVIEW_LIGHT } from '@/components/social/socialPreviewLight';

const FacebookMediaLightbox = ({ items, index, onClose, onIndexChange }) => {
  const open = index !== null && index >= 0 && items?.length > 0;
  const current = open ? items[index] : null;
  const total = items?.length ?? 0;

  const goPrev = useCallback(() => {
    if (!open) return;
    onIndexChange((index - 1 + total) % total);
  }, [open, index, total, onIndexChange]);

  const goNext = useCallback(() => {
    if (!open) return;
    onIndexChange((index + 1) % total);
  }, [open, index, total, onIndexChange]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, goPrev, goNext]);

  if (!open || !current) return null;

  const src = current.src;

  return createPortal(
    <div className="fixed inset-0 z-[230] flex items-center justify-center p-4" role="presentation">
      <button type="button" aria-label="Schließen" className="absolute inset-0 bg-black/75" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={current.alt ?? 'Foto'}
        className={cn(SOCIAL_PREVIEW_LIGHT, 'relative flex max-h-[min(90vh,800px)] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#dddfe2] px-4 py-3">
          <p className="text-[15px] font-semibold text-[#050505]">
            Fotos · {index + 1} / {total}
          </p>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-[#65676b] hover:bg-[#f0f2f5]" aria-label="Schließen">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-[#0a2540] p-4">
          <img src={src} alt={current.alt ?? ''} className="max-h-[min(70vh,640px)] max-w-full object-contain" />
          {total > 1 && (
            <>
              <button type="button" onClick={goPrev} className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow" aria-label="Zurück">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button type="button" onClick={goNext} className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow" aria-label="Weiter">
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
        </div>
        {current.alt && <p className="border-t border-[#dddfe2] px-4 py-3 text-center text-[13px] text-[#65676b]">{current.alt}</p>}
      </div>
    </div>,
    document.body,
  );
};

export default FacebookMediaLightbox;
