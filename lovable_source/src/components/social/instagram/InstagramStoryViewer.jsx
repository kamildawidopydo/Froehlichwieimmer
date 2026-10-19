import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Camera,
  Heart,
  MoreHorizontal,
  Send,
  X,
} from 'lucide-react';
import instagramProfile from '@/data/social/instagramProfile';
import { ProfileAvatar } from '@/components/social/instagram/instagramShared';

const STORY_MS = 5200;

const useStoryPlayback = ({ slideCount, onEnd, initialIndex = 0 }) => {
  const [slideIndex, setSlideIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const elapsedRef = useRef(0);
  const rafRef = useRef(null);
  const slideIndexRef = useRef(slideIndex);

  slideIndexRef.current = slideIndex;

  const resetSlideTimer = useCallback(() => {
    elapsedRef.current = 0;
    setProgress(0);
  }, []);

  const goTo = useCallback(
    (next) => {
      const clamped = Math.max(0, Math.min(slideCount - 1, next));
      if (clamped === slideIndexRef.current) return;
      setSlideIndex(clamped);
      resetSlideTimer();
    },
    [slideCount, resetSlideTimer],
  );

  const goPrev = useCallback(() => {
    if (slideIndexRef.current > 0) goTo(slideIndexRef.current - 1);
    else resetSlideTimer();
  }, [goTo, resetSlideTimer]);

  const goNext = useCallback(() => {
    if (slideIndexRef.current < slideCount - 1) goTo(slideIndexRef.current + 1);
    else onEnd();
  }, [slideCount, goTo, onEnd]);

  useEffect(() => {
    resetSlideTimer();
  }, [slideIndex, resetSlideTimer]);

  useEffect(() => {
    if (paused || slideCount === 0) return undefined;

    const startedAt = performance.now() - elapsedRef.current;

    const tick = (now) => {
      const elapsed = now - startedAt;
      const pct = Math.min(100, (elapsed / STORY_MS) * 100);
      setProgress(pct);
      elapsedRef.current = elapsed;

      if (pct >= 100) {
        if (slideIndexRef.current < slideCount - 1) goTo(slideIndexRef.current + 1);
        else onEnd();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [slideIndex, paused, slideCount, goTo, onEnd]);

  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);

  return { slideIndex, progress, paused, goPrev, goNext, pause, resume };
};

const StoryProgressBars = ({ count, activeIndex, progress }) => (
  <div className="absolute left-0 right-0 top-2 z-20 flex gap-[3px] px-2">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="h-[2px] flex-1 overflow-hidden rounded-full bg-white/35" aria-hidden>
        <div
          className="h-full rounded-full bg-white will-change-[width]"
          style={{
            width: i < activeIndex ? '100%' : i === activeIndex ? `${progress}%` : '0%',
            transition: i === activeIndex ? 'none' : 'width 200ms ease-out',
          }}
        />
      </div>
    ))}
  </div>
);

const InstagramStoryViewer = ({ highlight, initialSlide = 0, onClose, onProfileGate }) => {
  const slides = highlight?.slides ?? [];
  const slideCount = slides.length;

  const onEnd = useCallback(() => onClose(), [onClose]);

  const { slideIndex, progress, goPrev, goNext, pause, resume } = useStoryPlayback({
    slideCount,
    onEnd,
    initialIndex: initialSlide,
  });

  const slide = slides[slideIndex];
  const [transitionKey, setTransitionKey] = useState(0);
  const prevIndexRef = useRef(slideIndex);

  useEffect(() => {
    if (prevIndexRef.current !== slideIndex) {
      setTransitionKey((k) => k + 1);
      prevIndexRef.current = slideIndex;
    }
  }, [slideIndex]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === ' ') {
        e.preventDefault();
        pause();
      }
    };
    const onKeyUp = (e) => {
      if (e.key === ' ') resume();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [onClose, goPrev, goNext, pause, resume]);

  if (!highlight || !slide) return null;

  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/95 p-0 sm:p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="Story schließen" className="absolute inset-0" onClick={onClose} />

      <div
        className="relative z-10 flex h-[100dvh] w-full max-w-[420px] flex-col overflow-hidden bg-black sm:h-[min(92vh,780px)] sm:rounded-xl sm:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          pause();
        }}
        onPointerUp={resume}
        onPointerLeave={resume}
        onPointerCancel={resume}
      >
        <StoryProgressBars count={slideCount} activeIndex={slideIndex} progress={progress} />

        <header className="absolute left-0 right-0 top-4 z-20 flex items-center gap-2 px-3">
          <button type="button" onClick={onProfileGate} className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50" aria-label="Profil anzeigen">
            <ProfileAvatar size={36} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-white drop-shadow-sm">{instagramProfile.username}</p>
            <p className="text-[12px] text-white/80 drop-shadow-sm">{highlight.title}</p>
          </div>
          <button type="button" onClick={onProfileGate} className="rounded-full p-1 text-white hover:bg-white/10" aria-label="Optionen">
            <MoreHorizontal className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-white hover:bg-white/10"
            aria-label="Schließen"
          >
            <X className="h-6 w-6" />
          </button>
        </header>

        <div className="relative flex-1 overflow-hidden bg-black">
          <img
            key={`${slide.image}-${transitionKey}`}
            src={slide.image}
            alt={highlight.title}
            className="story-slide-enter h-full w-full object-cover"
          />
        </div>

        <button
          type="button"
          className="absolute left-0 top-0 z-10 h-[85%] w-[35%]"
          aria-label="Vorherige Story"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
        />
        <button
          type="button"
          className="absolute right-0 top-0 z-10 h-[85%] w-[35%]"
          aria-label="Nächste Story"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
        />

        <footer className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/70 to-transparent px-3 pb-4 pt-10">
          <div className="pointer-events-auto flex items-center gap-2">
            <button type="button" onClick={onProfileGate} className="shrink-0 rounded-full p-2 text-white/90" aria-label="Kamera">
              <Camera className="h-6 w-6" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={onProfileGate}
              className="min-w-0 flex-1 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-left text-[14px] text-white/60 backdrop-blur-sm"
            >
              Antwort an {instagramProfile.username}…
            </button>
            <button type="button" onClick={onProfileGate} className="shrink-0 p-2 text-white/90" aria-label="Gefällt mir">
              <Heart className="h-6 w-6" strokeWidth={1.75} />
            </button>
            <button type="button" onClick={onProfileGate} className="shrink-0 p-2 text-white/90" aria-label="Teilen">
              <Send className="h-6 w-6" strokeWidth={1.75} />
            </button>
          </div>
        </footer>

        <style>{`
          @keyframes storySlideIn {
            from { opacity: 0; transform: scale(1.04); }
            to { opacity: 1; transform: scale(1); }
          }
          .story-slide-enter {
            animation: storySlideIn 380ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
          }
        `}</style>
      </div>
    </div>,
    document.body,
  );
};

export default InstagramStoryViewer;
