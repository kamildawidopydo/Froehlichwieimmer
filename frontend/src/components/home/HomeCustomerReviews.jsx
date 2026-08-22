import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageSquareQuote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CompactReviewCard from '@/components/reviews/CompactReviewCard';
import ReviewsStats from '@/components/reviews/ReviewsStats';
import { useReviewStats, usePublicReviews } from '@/services/reviewsApi';

const HomeCustomerReviews = () => {
  const stats = useReviewStats();
  const list = usePublicReviews({ limit: 3, sort: 'newest' });
  const items = list.data?.items ?? [];

  return (
    <section
      className="relative overflow-hidden bg-bank-ink py-20 text-white sm:py-24"
      data-testid="home-customer-reviews"
    >
      <div aria-hidden className="absolute inset-0 -z-10 topo-pattern opacity-10 mix-blend-screen" />

      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
        <div className="mb-14 flex flex-col gap-4">
          <p className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.28em] text-bank-gold">
            <MessageSquareQuote className="h-3.5 w-3.5" strokeWidth={1.5} />
            Kundenerfahrungen
          </p>
          <h2 className="max-w-3xl font-serif text-3xl leading-tight sm:text-4xl lg:text-[44px]">
            Was unsere Kunden über uns sagen
          </h2>
          <p className="max-w-2xl text-[15px] leading-relaxed text-white/70 sm:text-lg">
            Vertrauen entsteht durch Erfahrung. Lesen Sie, wie unsere Kunden die Zusammenarbeit mit
            Fröhlich Vermögensberatung erleben.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,380px)_1fr]">
          <ReviewsStats stats={stats.data} loading={stats.loading} dark />

          <div className="flex flex-col gap-4">
            {list.loading ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-[220px] animate-pulse rounded-none bg-white/5" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div
                className="flex min-h-[220px] flex-col items-start gap-3 border border-white/10 bg-white/[0.03] p-8"
                data-testid="reviews-empty"
              >
                <MessageSquareQuote className="h-6 w-6 text-bank-gold" strokeWidth={1.4} />
                <h3 className="font-serif text-xl">Hier erscheinen zukünftig freigegebene Erfahrungen unserer Kunden.</h3>
                <p className="text-[14px] leading-relaxed text-white/60">
                  Sie sind bereits Kunde? Wir freuen uns über Ihr Feedback und veröffentlichen es nach interner
                  Prüfung an dieser Stelle.
                </p>
              </div>
            ) : (
              // CompactReviewCard 1:1 wiederverwenden — kompakte Optik wie auf /kundenstimmen.
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="home-reviews-grid">
                {items.map((r) => (<CompactReviewCard key={r.id} review={r} />))}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13px] text-white/60">
                Nur freigegebene Bewertungen fließen in die öffentliche Statistik ein.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  asChild
                  className="rounded-full bg-bank-gold text-bank-ink hover:bg-bank-gold/90"
                  data-testid="home-reviews-all-link"
                >
                  <Link to="/bewertungen">
                    Alle Kundenbewertungen ansehen
                    <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-white/20 bg-transparent text-white hover:border-white hover:bg-white/5"
                  data-testid="home-reviews-submit-link"
                >
                  <Link to="/bewertungen#abgeben">
                    Eigene Bewertung abgeben
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeCustomerReviews;
