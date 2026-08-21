import React, { useEffect, useMemo, useState } from 'react';
import PageMeta from '@/components/PageMeta';
import { Button } from '@/components/ui/button';
import ReviewCard from '@/components/reviews/ReviewCard';
import ReviewsStats from '@/components/reviews/ReviewsStats';
import ReviewSubmitForm from '@/components/reviews/ReviewSubmitForm';
import { useReviewStats, reviewsApi } from '@/services/reviewsApi';

const RATING_FILTERS = [
  { value: 0, label: 'Alle' },
  { value: 5, label: '5 Sterne' },
  { value: 4, label: '4 Sterne' },
  { value: 3, label: '3 Sterne' },
  { value: 2, label: '2 Sterne' },
  { value: 1, label: '1 Stern' },
];

const PAGE_SIZE = 9;

const Bewertungen = () => {
  const stats = useReviewStats();
  const [rating, setRating] = useState(0);
  const [sort, setSort] = useState('newest');
  const [items, setItems] = useState([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setOffset(0);
    setLoading(true);
    setLoadError(false);
    reviewsApi.list({ rating: rating || undefined, sort, limit: PAGE_SIZE, offset: 0 })
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [rating, sort]);

  const loadMore = async () => {
    const next = offset + PAGE_SIZE;
    setLoadingMore(true);
    try {
      const data = await reviewsApi.list({ rating: rating || undefined, sort, limit: PAGE_SIZE, offset: next });
      setItems((prev) => [...prev, ...data.items]);
      setOffset(next);
      setTotal(data.total);
    } catch {
      setLoadError(true);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (window.location.hash === '#abgeben') {
      setTimeout(() => document.getElementById('bewertung-abgeben')?.scrollIntoView({ behavior: 'smooth' }), 300);
    }
  }, []);

  const hasMore = items.length < total;

  return (
    <div className="bg-white" data-testid="bewertungen-page">
      <PageMeta
        title="Kundenbewertungen — Fröhlich Vermögensberatung"
        description="Alle freigegebenen Erfahrungsberichte unserer Kunden. Sie sind Kunde? Teilen Sie Ihre Erfahrung — Ihre Bewertung wird vor der Veröffentlichung geprüft."
        path="/bewertungen"
      />

      {/* Hero on dark blue */}
      <section className="relative overflow-hidden bg-bank-ink py-20 text-white sm:py-24">
        <div aria-hidden className="absolute inset-0 -z-10 topo-pattern opacity-10 mix-blend-screen" />
        <div className="mx-auto max-w-6xl px-6 sm:px-10">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-bank-gold">Kundenbewertungen</p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-[1.05] sm:text-5xl lg:text-[56px]">
            Vertrauen entsteht durch Erfahrung.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/70 sm:text-lg">
            Alle freigegebenen Kundenbewertungen der Fröhlich Vermögensberatung — transparent und moderiert.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
            <ReviewsStats stats={stats.data} loading={stats.loading} dark />
            <div className="flex flex-col justify-end gap-3">
              <p className="text-[13px] text-white/60">
                Nur freigegebene Bewertungen fließen in die öffentliche Statistik ein.
              </p>
              <div>
                <Button
                  asChild
                  className="rounded-full bg-bank-gold text-bank-ink hover:bg-bank-gold/90"
                  data-testid="scroll-to-form"
                >
                  <a href="#bewertung-abgeben">Eigene Bewertung abgeben</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters + list */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-10 sm:py-20">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-bank-accent-strong">Alle Bewertungen</p>
            <h2 className="mt-2 font-serif text-3xl text-bank-text sm:text-4xl">Kundenstimmen im Überblick</h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 text-[12.5px]">
              <span className="uppercase tracking-[0.14em] text-bank-text-muted">Sortierung</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-full border border-bank-border bg-white px-4 py-2 text-[13px] focus:border-bank-primary focus:outline-none"
                data-testid="reviews-sort"
              >
                <option value="newest">Neueste</option>
                <option value="best">Beste Bewertung</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2" role="tablist">
          {RATING_FILTERS.map((f) => {
            const active = f.value === rating;
            return (
              <button
                key={f.value}
                onClick={() => setRating(f.value)}
                role="tab"
                aria-selected={active}
                className={`rounded-full border px-4 py-2 text-[12.5px] transition-colors ${
                  active ? 'border-bank-primary bg-bank-primary text-white' : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-primary/40'
                }`}
                data-testid={`reviews-filter-${f.value}`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (<div key={i} className="h-[220px] animate-pulse rounded-2xl bg-neutral-100" />))}
          </div>
        ) : loadError ? (
          <p className="mt-10 rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-[14px] text-rose-800" data-testid="reviews-load-error">
            Die Bewertungen konnten nicht geladen werden. Bitte laden Sie die Seite später erneut.
          </p>
        ) : items.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-bank-border bg-neutral-50 p-8 text-center text-[14px] text-bank-text-muted" data-testid="reviews-empty-full">
            In dieser Auswahl liegen noch keine freigegebenen Bewertungen vor.
          </p>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {items.map((r) => (<ReviewCard key={r.id} review={r} />))}
            </div>
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={loadMore}
                  disabled={loadingMore}
                  data-testid="reviews-load-more"
                >
                  {loadingMore ? 'Wird geladen …' : 'Weitere laden'}
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Submit form */}
      <section id="bewertung-abgeben" className="border-t border-bank-border bg-neutral-50/50 py-16 sm:py-20">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-6 sm:px-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-bank-accent-strong">Bewertung abgeben</p>
            <h2 className="mt-3 font-serif text-3xl leading-tight text-bank-text sm:text-4xl">
              Teilen Sie Ihre Erfahrung mit uns.
            </h2>
            <p className="mt-4 text-[14.5px] leading-relaxed text-bank-text-muted">
              Ihre Bewertung wird ausschließlich nach interner Prüfung veröffentlicht. Die E-Mail-Adresse und Ihr
              vollständiger Nachname bleiben immer privat und sind niemals öffentlich sichtbar.
            </p>
            <ul className="mt-6 space-y-3 text-[13.5px] text-bank-text-muted">
              <li>· Standardmäßige Anonymisierung: „Vorname N."</li>
              <li>· Manuelle Prüfung vor Veröffentlichung</li>
              <li>· Kein Bewertungstext wird stillschweigend verändert</li>
              <li>· Schutz vor XSS, Skripten und Spam</li>
            </ul>
          </div>
          <ReviewSubmitForm onSubmitted={stats.reload} />
        </div>
      </section>
    </div>
  );
};

export default Bewertungen;
