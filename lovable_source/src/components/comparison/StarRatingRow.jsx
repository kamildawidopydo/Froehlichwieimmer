import React, { memo } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStarFillPercents, roundToQuarter } from '@/lib/starRating';

function PartialStar({ fill, iconClass }) {
  const clamped = Math.min(1, Math.max(0, fill));
  if (clamped <= 0) {
    return <Star className={cn(iconClass, 'fill-amber-100 text-amber-100')} strokeWidth={1.5} aria-hidden />;
  }
  if (clamped >= 1) {
    return <Star className={cn(iconClass, 'fill-amber-400 text-amber-400')} strokeWidth={1.5} aria-hidden />;
  }

  return (
    <span className={cn('relative inline-flex shrink-0', iconClass)} aria-hidden>
      <Star className={cn(iconClass, 'fill-amber-100 text-amber-100')} strokeWidth={1.5} />
      <span
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${clamped * 100}%` }}
      >
        <Star className={cn(iconClass, 'fill-amber-400 text-amber-400')} strokeWidth={1.5} />
      </span>
    </span>
  );
}

const StarRatingRow = memo(function StarRatingRow({ value, className, size = 'sm' }) {
  const rating = roundToQuarter(value);
  const fills = getStarFillPercents(rating);
  const iconClass = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';

  return (
    <div
      className={cn('flex shrink-0 items-center gap-0.5', className)}
      role="img"
      aria-label={`${rating.toFixed(2).replace('.', ',')} von 5 Sternen`}
    >
      {fills.map((fill, i) => (
        <PartialStar key={i} fill={fill} iconClass={iconClass} />
      ))}
    </div>
  );
});

export default StarRatingRow;
