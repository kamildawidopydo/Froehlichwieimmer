import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PublicVideoCard from '@/components/news/PublicVideoCard';

const PublicVideoCarousel = ({ title = 'Weitere Videos', videos }) => {
  const trackRef = useRef(null);
  if (!videos?.length) return null;

  const scroll = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  return (
    <section className="mt-14 border-t border-bank-border/60 pt-10">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-display text-[1.35rem] font-light text-bank-text">
          {title}
        </h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label="Zurück"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-bank-border/70 text-bank-text-muted transition-colors hover:text-bank-text"
          >
            <ChevronLeft size={16} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="Weiter"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-bank-border/70 text-bank-text-muted transition-colors hover:text-bank-text"
          >
            <ChevronRight size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto overscroll-x-contain pb-2 snap-x snap-mandatory no-scrollbar [touch-action:pan-x]"
      >
        {videos.map((video) => (
          <div key={video.id} className="w-[min(100%,18rem)] shrink-0 snap-start">
            <PublicVideoCard video={video} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default PublicVideoCarousel;
