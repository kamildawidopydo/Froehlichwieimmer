import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { resolveReviewDisplay } from '@/lib/offerReviewDisplay';
import { formatStarAverageDe } from '@/lib/starRating';
import StarRatingRow from '@/components/comparison/StarRatingRow';

const OfferReviewSummary = memo(function OfferReviewSummary({
  offer,
  variant = 'inline',
  className,
  dbStats,
}) {
  const { count: totalReviews, average: starAvg } = resolveReviewDisplay(offer, dbStats);
  const starLabel = formatStarAverageDe(starAvg);
  const reviewLine = (
    <>
      <span className="font-medium tabular-nums text-bank-text">
        {totalReviews.toLocaleString('de-DE')}
      </span>{' '}
      <span className="text-bank-text-muted">Bewertungen</span>
    </>
  );

  if (variant === 'stacked') {
    return (
      <div
        className={cn('flex min-w-[7.5rem] flex-col items-start gap-1', className)}
        aria-label={`${starLabel} von 5 Sternen, ${totalReviews.toLocaleString('de-DE')} Bewertungen`}
      >
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <StarRatingRow value={starAvg} size="sm" />
          <span className="shrink-0 text-[11.5px] font-medium tabular-nums text-bank-text">{starLabel}</span>
        </div>
        <p className="whitespace-nowrap text-[11.5px] leading-none">{reviewLine}</p>
      </div>
    );
  }

  return (
    <div
      className={cn('flex flex-wrap items-center gap-x-2 gap-y-1', className)}
      aria-label={`${starLabel} von 5 Sternen, ${totalReviews.toLocaleString('de-DE')} Bewertungen`}
    >
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <StarRatingRow value={starAvg} size="sm" />
        <span className="shrink-0 text-[12.5px] font-medium tabular-nums text-bank-text">{starLabel}</span>
      </div>
      <p className="whitespace-nowrap text-[12.5px] leading-snug">{reviewLine}</p>
    </div>
  );
});

export default OfferReviewSummary;
