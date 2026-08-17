import React, { memo } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { roundToQuarter } from '@/lib/starRating';

const STEPS = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75, 4, 4.25, 4.5, 4.75, 5];

const InteractiveStarRating = memo(function InteractiveStarRating({ value, onChange, className }) {
  const rating = roundToQuarter(value || 4);

  const bump = (delta) => {
    const idx = STEPS.indexOf(rating);
    const next = STEPS[Math.min(STEPS.length - 1, Math.max(0, idx + delta))];
    onChange(next);
  };

  const setStar = (starIndex) => {
    const target = starIndex + 1;
    if (rating >= target) {
      onChange(Math.max(1, target - 0.25));
    } else {
      onChange(target);
    }
  };

  const fills = Array.from({ length: 5 }, (_, i) => Math.min(1, Math.max(0, rating - i)));

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      <div className="flex items-center gap-0.5" role="group" aria-label="Sternebewertung wählen">
        {fills.map((fill, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setStar(i)}
            className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/40"
            aria-label={`${i + 1} Sterne`}
          >
            <span className="relative inline-flex h-8 w-8">
              <Star className="h-8 w-8 fill-amber-100 text-amber-100" strokeWidth={1.5} />
              <span
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star className="h-8 w-8 fill-amber-400 text-amber-400" strokeWidth={1.5} />
              </span>
            </span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => bump(-1)}
          className="flex h-8 w-8 items-center justify-center border border-bank-border text-bank-text-muted hover:border-bank-primary/40"
          aria-label="Weniger Sterne"
        >
          −
        </button>
        <span className="min-w-[3rem] text-center text-sm font-medium tabular-nums text-bank-text">
          {rating.toFixed(2).replace('.', ',')}
        </span>
        <button
          type="button"
          onClick={() => bump(1)}
          className="flex h-8 w-8 items-center justify-center border border-bank-border text-bank-text-muted hover:border-bank-primary/40"
          aria-label="Mehr Sterne"
        >
          +
        </button>
      </div>
    </div>
  );
});

export default InteractiveStarRating;
