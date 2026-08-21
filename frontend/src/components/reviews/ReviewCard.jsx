import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { StarsDisplay } from '@/components/reviews/RatingStars';
import { formatReviewDate } from '@/services/reviewsApi';

const ReviewCard = ({ review, dark = false }) => {
  const nameChip = (review.display_name || 'Anonym').slice(0, 2).toUpperCase();
  const bg = dark ? 'bg-white/5 border-white/10 hover:bg-white/8' : 'bg-white border-bank-border hover:shadow-[0_16px_40px_-24px_rgba(0,0,0,0.22)]';
  const textCol = dark ? 'text-white' : 'text-bank-text';
  const mutedCol = dark ? 'text-white/60' : 'text-bank-text-muted';
  return (
    <article
      className={`flex h-full flex-col gap-4 rounded-2xl border p-6 transition-all duration-300 ${bg}`}
      data-testid="review-card"
    >
      <div className="flex items-center justify-between">
        <StarsDisplay value={review.rating} size={18} />
        {review.is_verified && (
          <span className={`inline-flex items-center gap-1 text-[10.5px] font-medium uppercase tracking-[0.18em] ${dark ? 'text-emerald-300' : 'text-emerald-700'}`}>
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.6} />
            Verifizierte Bewertung
          </span>
        )}
      </div>

      <p className={`text-[15px] leading-relaxed ${textCol}`}>„{review.text}"</p>

      <div className="mt-auto flex items-center gap-3 border-t pt-4" style={{ borderColor: dark ? 'rgba(255,255,255,0.08)' : undefined }}>
        <span
          aria-hidden
          className={`flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-medium tracking-wide ${dark ? 'bg-bank-gold/20 text-bank-gold' : 'bg-bank-primary/10 text-bank-primary'}`}
        >
          {nameChip}
        </span>
        <div className="flex flex-col">
          <span className={`font-serif text-[15px] ${textCol}`}>{review.display_name}</span>
          <span className={`text-[11.5px] uppercase tracking-[0.16em] ${mutedCol}`}>{formatReviewDate(review.created_at)}</span>
        </div>
      </div>
    </article>
  );
};

export default ReviewCard;
