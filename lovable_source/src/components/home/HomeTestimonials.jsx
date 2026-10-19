import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageSquareQuote, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TestimonialCard from '@/components/reviews/TestimonialCard';
import ReviewSubmitForm from '@/components/reviews/ReviewSubmitForm';
import { reviewsApi } from '@/services/reviewsApi';

/**
 * Home page testimonials — deliberately compact.
 * Shows up to 2 hervorgehobene picks + a CTA that links to /kundenstimmen
 * for the full list. No slider, no accordion — the home stays quiet.
 */
const HomeTestimonials = () => {
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    reviewsApi
      .list({ featured: true, limit: 2, sort: 'newest' })
      .then((data) => {
        // Graceful fallback: if fewer than 2 featured, pad with newest approved
        if ((data.items || []).length < 2) {
          reviewsApi
            .list({ limit: 4, sort: 'newest' })
            .then((extra) => {
              const seen = new Set((data.items || []).map((r) => r.id));
              const merged = [...(data.items || [])];
              for (const r of extra.items || []) {
                if (merged.length >= 2) break;
                if (!seen.has(r.id)) merged.push(r);
              }
              setPicks(merged);
            })
            .catch(() => setPicks(data.items || []));
        } else {
          setPicks((data.items || []).slice(0, 2));
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <section className="relative bg-white py-20 sm:py-24" data-testid="home-testimonials">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
        {/* Header row */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-16">
          {/* Left column — heading + CTAs */}
          <div className="flex flex-col gap-5">
            <p className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.28em] text-bank-gold">
              <MessageSquareQuote className="h-3.5 w-3.5" strokeWidth={1.5} />
              Kundenstimmen
            </p>
            <h2 className="font-serif text-3xl leading-[1.1] text-bank-text sm:text-4xl lg:text-[44px]">
              Was unsere Kunden über uns sagen
            </h2>
            <p className="max-w-md text-[15px] leading-relaxed text-bank-text-muted sm:text-[16px]">
              Vertrauen entsteht durch Erfahrung. Hier teilen unsere Kunden ihre persönlichen Eindrücke
              aus der Zusammenarbeit mit Fröhlich Vermögensberatung.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Button
                onClick={() => setModalOpen(true)}
                className="rounded-full"
                data-testid="home-testimonial-share"
              >
                Erfahrung mit uns teilen
                <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full"
                data-testid="home-testimonial-more"
              >
                <Link to="/kundenstimmen">Weitere Kundenstimmen lesen</Link>
              </Button>
            </div>
          </div>

          {/* Right column — exactly 2 cards */}
          <div>
            {loading ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {[0, 1].map((i) => (
                  <div key={i} className="h-[240px] animate-pulse rounded-3xl bg-neutral-100" />
                ))}
              </div>
            ) : error ? (
              <p className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-[14px] text-rose-800">
                Kundenstimmen konnten nicht geladen werden. Bitte laden Sie die Seite später erneut.
              </p>
            ) : picks.length === 0 ? (
              <div
                className="flex flex-col items-start gap-3 rounded-3xl border border-bank-border bg-neutral-50/60 p-10"
                data-testid="testimonials-empty"
              >
                <MessageSquareQuote className="h-6 w-6 text-bank-gold" strokeWidth={1.4} />
                <h3 className="font-serif text-xl text-bank-text">Hier erscheinen zukünftig echte Kundenstimmen</h3>
                <p className="text-[14px] leading-relaxed text-bank-text-muted">
                  Sobald unsere Kunden ihre Erfahrungen mit uns teilen und diese von uns freigegeben wurden,
                  sehen Sie an dieser Stelle authentische Rückmeldungen.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2" data-testid="home-testimonials-picks">
                {picks.map((r) => (
                  <TestimonialCard key={r.id} review={r} size="md" />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Divider + CTA to full page */}
        <div className="card-accent-top card-accent-top-rose mt-16 rounded-b-lg border-t border-bank-border pt-12" data-testid="home-testimonials-cta">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-bank-rose-strong">
              Weitere Erfahrungen
            </p>
            <h3 className="mt-2 font-serif text-2xl text-bank-text sm:text-3xl">
              Noch mehr Stimmen unserer Kunden
            </h3>
            <p className="mt-3 text-[14.5px] leading-relaxed text-bank-text-muted">
              Lesen Sie weitere persönliche Erfahrungen unserer Kunden über die Zusammenarbeit mit
              Fröhlich Vermögensberatung.
            </p>
            <div className="mt-6 flex justify-center">
              <Button
                asChild
                className="rounded-full"
                data-testid="home-testimonials-cta-btn"
              >
                <Link to="/kundenstimmen">
                  Weitere Kundenstimmen lesen
                  <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Closing line */}
        <p className="mt-16 text-center font-serif text-lg italic text-bank-text-muted sm:text-xl">
          Langfristige Zusammenarbeit entsteht nicht durch Versprechen, sondern durch Erfahrungen.
        </p>
      </div>

      {/* Modal — share your experience */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8"
          onClick={() => setModalOpen(false)}
          data-testid="testimonial-modal"
        >
          <div className="relative w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-bank-text hover:bg-white"
              aria-label="Schließen"
              data-testid="testimonial-modal-close"
            >
              <X className="h-4 w-4" />
            </button>
            <ReviewSubmitForm variant="testimonial" onSubmitted={load} />
          </div>
        </div>
      )}
    </section>
  );
};

export default HomeTestimonials;
