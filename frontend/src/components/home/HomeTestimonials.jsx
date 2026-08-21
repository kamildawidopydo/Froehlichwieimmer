import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft, ArrowRight as ArrRight, MessageSquareQuote, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TestimonialCard from '@/components/reviews/TestimonialCard';
import ReviewSubmitForm from '@/components/reviews/ReviewSubmitForm';
import { reviewsApi } from '@/services/reviewsApi';

const HomeTestimonials = () => {
  const [featured, setFeatured] = useState([]);
  const [others, setOthers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const sliderRef = useRef(null);

  const load = () => {
    setLoading(true);
    setError(false);
    Promise.all([
      reviewsApi.list({ featured: true, limit: 5, sort: 'newest' }),
      reviewsApi.list({ limit: 12, sort: 'newest' }),
    ])
      .then(([featuredData, allData]) => {
        const featuredIds = new Set(featuredData.items.map((r) => r.id));
        setFeatured(featuredData.items);
        setOthers(allData.items.filter((r) => !featuredIds.has(r.id)));
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const scroll = (dir) => {
    const el = sliderRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: 'smooth' });
  };

  // If no featured picks yet, use the first three approved reviews as a graceful fallback
  const mainPicks = featured.length > 0 ? featured : others.slice(0, 3);
  const sliderItems = featured.length > 0 ? others : others.slice(3);

  return (
    <section className="relative bg-white py-20 sm:py-24" data-testid="home-testimonials">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-16">
          {/* Left: heading */}
          <div className="flex flex-col gap-5">
            <p className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.28em] text-bank-gold">
              <MessageSquareQuote className="h-3.5 w-3.5" strokeWidth={1.5} />
              Kundenstimmen
            </p>
            <h2 className="font-serif text-3xl leading-[1.1] text-bank-text sm:text-4xl lg:text-[44px]">
              Was unsere Kunden über uns sagen
            </h2>
            <p className="max-w-md text-[15px] leading-relaxed text-bank-text-muted sm:text-[16px]">
              Vertrauen entsteht durch Erfahrung. Hier teilen unsere Kunden ihre persönlichen Eindrücke aus der
              Zusammenarbeit mit Fröhlich Vermögensberatung.
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

          {/* Right: 2-3 featured testimonials */}
          <div>
            {loading ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {[0, 1, 2].map((i) => (<div key={i} className="h-[240px] animate-pulse rounded-3xl bg-neutral-100" />))}
              </div>
            ) : error ? (
              <p className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-[14px] text-rose-800">
                Kundenstimmen konnten nicht geladen werden. Bitte laden Sie die Seite später erneut.
              </p>
            ) : mainPicks.length === 0 ? (
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
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {mainPicks.slice(0, 3).map((r, i) => (
                  <div key={r.id} className={i === 0 && mainPicks.length >= 3 ? 'md:col-span-2' : ''}>
                    <TestimonialCard review={r} size={i === 0 && mainPicks.length >= 3 ? 'lg' : 'md'} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Optional horizontal slider with additional testimonials */}
        {sliderItems.length > 0 && (
          <div className="mt-14">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-bank-text-muted">Weitere Erfahrungen</p>
                <h3 className="mt-1 font-serif text-2xl text-bank-text sm:text-3xl">Weitere Kundenstimmen</h3>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label="Zurück scrollen"
                  onClick={() => scroll(-1)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-bank-border bg-white text-bank-text-muted transition-colors hover:border-bank-primary hover:text-bank-primary"
                  data-testid="testimonials-scroll-prev"
                >
                  <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  aria-label="Weiter scrollen"
                  onClick={() => scroll(1)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-bank-border bg-white text-bank-text-muted transition-colors hover:border-bank-primary hover:text-bank-primary"
                  data-testid="testimonials-scroll-next"
                >
                  <ArrRight className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
            <div
              ref={sliderRef}
              className="grid snap-x snap-mandatory grid-flow-col gap-5 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ gridAutoColumns: 'minmax(320px, 380px)' }}
            >
              {sliderItems.map((r) => (
                <div key={r.id} className="snap-start">
                  <TestimonialCard review={r} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Closing line */}
        <p className="mt-16 font-serif text-lg italic text-bank-text-muted sm:text-xl">
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
          <div
            className="relative w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
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
