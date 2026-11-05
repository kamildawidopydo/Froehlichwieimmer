import React from 'react';
import { cn } from '@/lib/utils';
import { partnerLogoStrip } from '@/data/partnerLogoStrip';

/**
 * Infinite, silent logo ticker for partner banks.
 * Reuses the global `.marquee-track` keyframes (translateX -50% over a doubled
 * list) so the loop is seamless. Pauses on hover; respects reduced-motion.
 * Logos sit in light chips so colored marks read cleanly on the navy panel.
 */
const PartnerLogoMarquee = ({ items = partnerLogoStrip, className }) => {
  if (!items?.length) return null;
  const doubled = [...items, ...items];

  return (
    <div
      className={cn('marquee-pause relative overflow-hidden', className)}
      aria-label="Partnerbanken"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-bank-ink to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-bank-ink to-transparent"
      />
      <div className="marquee-track flex w-max items-center gap-3 py-1">
        {doubled.map((it, i) => (
          <span
            key={`${it.src}-${i}`}
            className="flex h-11 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/95 px-4 shadow-sm"
          >
            <img
              src={it.src}
              alt={it.alt}
              loading="lazy"
              draggable={false}
              className="h-5 w-auto max-w-[104px] object-contain"
            />
          </span>
        ))}
      </div>
    </div>
  );
};

export default PartnerLogoMarquee;
