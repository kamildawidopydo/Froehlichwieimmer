import React from 'react';
import { CheckCircle2, Quote, MessageCircle } from 'lucide-react';
import { StarsDisplay } from '@/components/reviews/RatingStars';
import { formatCommentDate } from '@/services/reviewsApi';
import { TOPIC_LABEL } from '@/data/reviewTopics';
import stripOuterQuotes from '@/lib/stripOuterQuotes';

/**
 * TestimonialCard — testimonial-focused layout: big serif quote, personal
 * intro, subtle stars, and optional response from Fröhlich Vermögensberatung.
 * Publicly the card only shows the comment date — never customer tenure.
 */
const TestimonialCard = ({ review, tone = 'light', size = 'md' }) => {
  const dark = tone === 'dark';
  const bg = dark
    ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.06]'
    : 'bg-white border-bank-border shadow-editorial-sm hover:shadow-[0_20px_60px_-30px_rgba(15,29,52,0.28)]';
  const textCol = dark ? 'text-white' : 'text-bank-text';
  const mutedCol = dark ? 'text-white/60' : 'text-bank-text-muted';
  const bodySize = size === 'lg' ? 'text-[17px] sm:text-[19px]' : 'text-[15px] sm:text-[16px]';

  const nameChip = (review.display_name || 'Kunde').slice(0, 2).toUpperCase();
  const commentDate = formatCommentDate(review.created_at);

  return (
    <article
      className={`group relative flex h-full flex-col gap-6 rounded-3xl border p-8 transition-all duration-300 ${bg}`}
      data-testid="testimonial-card"
    >
      <Quote
        className={`absolute right-6 top-6 h-10 w-10 opacity-40 ${dark ? 'text-bank-gold' : 'text-bank-gold'}`}
        strokeWidth={1.1}
        aria-hidden
      />

      <div className="flex flex-wrap items-center gap-2">
        {review.is_verified && (
          <span className={`inline-flex items-center gap-1 text-[10.5px] font-medium uppercase tracking-[0.18em] ${dark ? 'text-emerald-300' : 'text-emerald-700'}`}>
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.6} />
            Verifiziert
          </span>
        )}
        {review.is_demo && (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.2em] text-amber-900"
            data-testid="testimonial-demo-badge"
            title="Demo — nur für Entwicklung und Tests"
          >
            Demo
          </span>
        )}
      </div>

      <p className={`font-serif leading-[1.55] ${bodySize} ${textCol}`}>{stripOuterQuotes(review.text)}</p>

      {review.topics && review.topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {review.topics.map((t) => (
            <span
              key={t}
              className={`inline-block rounded-full border px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.14em] ${
                dark ? 'border-white/15 bg-white/[0.05] text-white/70' : 'border-bank-border bg-neutral-50 text-bank-text-muted'
              }`}
              data-testid="testimonial-topic"
            >
              {TOPIC_LABEL[t] || t}
            </span>
          ))}
        </div>
      )}

      {/* Antwort von Fröhlich Vermögensberatung */}
      {review.admin_response && (
        <div
          className={`rounded-2xl border-l-2 px-4 py-3 ${
            dark
              ? 'border-bank-gold/60 bg-white/[0.04]'
              : 'border-bank-gold bg-bank-gold/[0.05]'
          }`}
          data-testid="testimonial-admin-response"
        >
          <p className={`flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.22em] ${dark ? 'text-bank-gold' : 'text-bank-accent-strong'}`}>
            <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.6} />
            Antwort von Fröhlich Vermögensberatung
          </p>
          <p className={`mt-1.5 font-serif italic leading-relaxed text-[13.5px] ${dark ? 'text-white/85' : 'text-bank-text'}`}>
            {stripOuterQuotes(review.admin_response)}
          </p>
        </div>
      )}

      <div className={`mt-auto flex items-center gap-4 border-t pt-5 ${dark ? 'border-white/10' : 'border-bank-border'}`}>
        <span
          aria-hidden
          className={`flex h-11 w-11 items-center justify-center rounded-full text-[13px] font-medium tracking-wide ${
            dark ? 'bg-bank-gold/20 text-bank-gold' : 'bg-bank-primary/10 text-bank-primary'
          }`}
        >
          {nameChip}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`font-serif text-[15.5px] ${textCol}`}>{review.display_name}</p>
          <p className={`text-[11.5px] uppercase tracking-[0.18em] ${mutedCol}`} data-testid="testimonial-comment-date">
            {commentDate ? `Kommentar vom ${commentDate}` : ''}
          </p>
        </div>
        {review.rating > 0 && (
          <StarsDisplay value={review.rating} size={14} className="opacity-80" />
        )}
      </div>
    </article>
  );
};

export default TestimonialCard;
