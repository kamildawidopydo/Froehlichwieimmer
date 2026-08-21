import React from 'react';
import { StarsDisplay } from '@/components/reviews/RatingStars';

/**
 * Compact rating summary — average, count, distribution bars.
 * Dark variant for dark-blue backgrounds, light variant for white.
 */
const ReviewsStats = ({ stats, loading, dark = false }) => {
  if (loading) {
    return <div className={`h-[320px] w-full animate-pulse rounded-2xl ${dark ? 'bg-white/5' : 'bg-neutral-100'}`} />;
  }
  const total = stats?.total ?? 0;
  const avg = stats?.average ?? 0;
  const dist = stats?.distribution ?? [];

  const label = dark ? 'text-white/70' : 'text-bank-text-muted';
  const strong = dark ? 'text-white' : 'text-bank-text';
  const barBg = dark ? 'bg-white/10' : 'bg-neutral-200/70';
  const barFg = dark ? 'bg-bank-gold' : 'bg-bank-primary';

  return (
    <div
      className={`flex flex-col gap-6 rounded-2xl border p-8 ${dark ? 'border-white/10 bg-white/[0.03]' : 'border-bank-border bg-white shadow-editorial-sm'}`}
      data-testid="reviews-stats"
    >
      <div className="flex flex-col gap-3">
        <p className={`text-[11px] font-medium uppercase tracking-[0.28em] ${dark ? 'text-bank-gold' : 'text-bank-accent-strong'}`}>
          Kundenbewertungen
        </p>
        {total === 0 ? (
          <>
            <p className={`font-serif text-2xl ${strong}`}>Noch keine veröffentlichten Bewertungen</p>
            <p className={`text-[13.5px] leading-relaxed ${label}`}>
              Hier erscheint zukünftig die durchschnittliche Bewertung sowie die Verteilung aller freigegebenen
              Kundenerfahrungen.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-end gap-4">
              <span className={`font-serif text-5xl leading-none ${strong}`} data-testid="reviews-average">
                {avg.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </span>
              <span className={`pb-1 text-lg ${label}`}>von 5</span>
            </div>
            <StarsDisplay value={avg} size={22} />
            <p className={`text-[13px] ${label}`} data-testid="reviews-total">
              Basierend auf {total.toLocaleString('de-DE')} veröffentlichten Kundenbewertungen
            </p>
          </>
        )}
      </div>

      {total > 0 && (
        <ul className="mt-2 flex flex-col gap-2" data-testid="reviews-distribution">
          {dist.map((row) => (
            <li key={row.rating} className="flex items-center gap-3 text-[12.5px]">
              <span className={`w-14 shrink-0 ${label}`}>{row.rating} Sterne</span>
              <span className={`relative h-2 flex-1 overflow-hidden rounded-full ${barBg}`}>
                <span
                  className={`absolute inset-y-0 left-0 rounded-full ${barFg} transition-all duration-500`}
                  style={{ width: `${Math.max(row.pct, 0)}%` }}
                />
              </span>
              <span className={`w-10 shrink-0 text-right font-mono tabular-nums ${strong}`}>
                {row.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ReviewsStats;
