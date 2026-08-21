import React, { useEffect, useMemo, useState } from 'react';
import { Search, X, ChevronDown, Beaker } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import PageMeta from '@/components/PageMeta';
import { Button } from '@/components/ui/button';
import TestimonialCard from '@/components/reviews/TestimonialCard';
import ReviewSubmitForm from '@/components/reviews/ReviewSubmitForm';
import { reviewsApi } from '@/services/reviewsApi';

const PAGE_SIZE = 12;

const SORT_OPTIONS = [
  { value: 'newest', label: 'Neueste zuerst' },
  { value: 'oldest', label: 'Älteste zuerst' },
  { value: 'best', label: 'Beste Bewertungen' },
  { value: 'worst', label: 'Kritische zuerst' },
];

const RATING_FILTERS = [5, 4, 3, 2, 1];

const useDebounced = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
};

const Kundenstimmen = () => {
  const [searchParams] = useSearchParams();
  const previewDemo = searchParams.get('admin_preview') === '1';
  const [items, setItems] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [topic, setTopic] = useState('');
  const [rating, setRating] = useState(0);
  const [responseFilter, setResponseFilter] = useState('');
  const [sort, setSort] = useState('newest');
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounced(searchInput, 350);

  const [topicCounts, setTopicCounts] = useState({ topics: [], total_approved: 0 });

  useEffect(() => {
    reviewsApi.topics({ include_demo: previewDemo }).then(setTopicCounts).catch(() => {});
  }, [previewDemo]);

  const filterParams = useMemo(() => {
    const params = { limit: PAGE_SIZE, sort };
    if (topic) params.topic = topic;
    if (rating) params.rating = rating;
    if (responseFilter) params.response_filter = responseFilter;
    if (search && search.trim()) params.q = search.trim();
    if (previewDemo) params.include_demo = true;
    return params;
  }, [topic, rating, responseFilter, sort, search, previewDemo]);

  const hasActiveFilters = !!(topic || rating || responseFilter || (search && search.trim()));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    const featuredPromise = hasActiveFilters
      ? Promise.resolve({ items: [] })
      : reviewsApi.list({ featured: true, limit: 3, sort: 'newest' });
    Promise.all([
      featuredPromise,
      reviewsApi.list({ ...filterParams, offset: 0 }),
    ])
      .then(([feat, all]) => {
        if (cancelled) return;
        setFeatured(feat.items || []);
        setItems(all.items);
        setTotal(all.total);
        setOffset(0);
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filterParams, hasActiveFilters]);

  const loadMore = async () => {
    const next = offset + PAGE_SIZE;
    setLoadingMore(true);
    try {
      const data = await reviewsApi.list({ ...filterParams, offset: next });
      setItems((prev) => [...prev, ...data.items]);
      setOffset(next);
      setTotal(data.total);
    } catch {
      setError(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const resetFilters = () => {
    setTopic('');
    setRating(0);
    setResponseFilter('');
    setSort('newest');
    setSearchInput('');
  };

  const featuredIds = new Set(featured.map((f) => f.id));
  const rest = items.filter((r) => !featuredIds.has(r.id));

  return (
    <div className="bg-white" data-testid="kundenstimmen-page">
      <PageMeta
        title="Kundenstimmen — Fröhlich Vermögensberatung"
        description="Persönliche Erfahrungen unserer Kunden aus der Zusammenarbeit mit Fröhlich Vermögensberatung. Jede Rückmeldung wird vor Veröffentlichung manuell geprüft."
        path="/kundenstimmen"
      />

      {previewDemo && (
        <div className="border-b border-amber-300 bg-amber-100 px-6 py-3 text-center text-[12.5px] text-amber-900 sm:px-10" data-testid="preview-mode-banner">
          <Beaker className="mr-1.5 inline h-3.5 w-3.5" strokeWidth={1.8} />
          <strong>Vorschau-Modus:</strong> Demo-Kundenstimmen (mit „DEMO"-Kennzeichnung) sind sichtbar — ausschließlich für interne UI-Tests.
          Diese Einträge fließen niemals in Statistiken oder öffentliche Auswertungen ein.
        </div>
      )}
      {/* Hero */}
      <section className="relative overflow-hidden bg-bank-ink py-20 text-white sm:py-24">
        <div aria-hidden className="absolute inset-0 -z-10 topo-pattern opacity-10 mix-blend-screen" />
        <div className="mx-auto max-w-5xl px-6 sm:px-10">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-bank-gold">Kundenstimmen</p>
          <h1 className="mt-4 font-serif text-4xl leading-[1.05] sm:text-5xl lg:text-[56px]">
            Persönliche Erfahrungen unserer Kunden
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/70 sm:text-lg">
            Vertrauen entsteht durch Erfahrung. Hier lesen Sie, wie unsere Kunden die langfristige Zusammenarbeit
            mit Fröhlich Vermögensberatung erleben — persönlich, ehrlich und ungefiltert nach interner Prüfung.
          </p>
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-16 sm:px-10 sm:py-20">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-bank-accent-strong">Ausgewählte Stimmen</p>
          <h2 className="mt-2 font-serif text-3xl text-bank-text sm:text-4xl">Von uns hervorgehoben</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((r) => (<TestimonialCard key={r.id} review={r} />))}
          </div>
        </section>
      )}

      {/* All */}
      <section className={`mx-auto max-w-6xl px-6 pb-20 sm:px-10 ${featured.length === 0 ? 'pt-16 sm:pt-20' : ''}`}>
        {featured.length === 0 && (
          <>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-bank-accent-strong">Alle Rückmeldungen</p>
            <h2 className="mt-2 font-serif text-3xl text-bank-text sm:text-4xl">Kundenstimmen im Überblick</h2>
          </>
        )}
        {featured.length > 0 && (
          <>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-bank-accent-strong">Weitere Erfahrungen</p>
            <h2 className="mt-2 font-serif text-3xl text-bank-text sm:text-4xl">Alle freigegebenen Kundenstimmen</h2>
          </>
        )}

        {/* Filter Bar */}
        <div className="mt-6 border-b border-bank-border pb-6">
          {/* Search + Sort row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bank-text-muted" strokeWidth={1.6} />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="In Kundenstimmen suchen …"
                data-testid="kundenstimmen-search"
                autoComplete="off"
                className="w-full rounded-full border border-bank-border bg-white py-2.5 pl-10 pr-10 text-[14px] outline-none transition-colors focus:border-bank-primary"
              />
              {searchInput && (
                <button
                  type="button"
                  aria-label="Suche zurücksetzen"
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-bank-text-muted hover:bg-neutral-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                data-testid="kundenstimmen-sort"
                className="appearance-none rounded-full border border-bank-border bg-white py-2.5 pl-4 pr-9 text-[13.5px] outline-none transition-colors focus:border-bank-primary"
              >
                {SORT_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bank-text-muted" strokeWidth={1.5} />
            </div>
          </div>

          {/* Topic pills */}
          <div className="mt-4 flex flex-wrap gap-2" role="tablist" data-testid="topic-filter">
            <button
              type="button"
              onClick={() => setTopic('')}
              data-testid="topic-filter-all"
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-[12.5px] transition-colors ${
                !topic ? 'border-bank-primary bg-bank-primary text-white' : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-primary/40'
              }`}
            >
              Alle Themen
              <span className={`rounded-full px-1.5 py-0.5 text-[10.5px] font-mono ${!topic ? 'bg-white/25 text-white' : 'bg-neutral-100 text-bank-text-muted'}`}>
                {topicCounts.total_approved}
              </span>
            </button>
            {(topicCounts.topics || []).filter((t) => t.count > 0 || topic === t.slug).map((t) => {
              const active = topic === t.slug;
              return (
                <button
                  type="button"
                  key={t.slug}
                  onClick={() => setTopic(t.slug)}
                  data-testid={`topic-filter-${t.slug}`}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-[12.5px] transition-colors ${
                    active ? 'border-bank-primary bg-bank-primary text-white' : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-primary/40'
                  }`}
                >
                  {t.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10.5px] font-mono ${active ? 'bg-white/25 text-white' : 'bg-neutral-100 text-bank-text-muted'}`}>
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Rating + response row */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[12.5px]">
            <span className="text-[10.5px] font-medium uppercase tracking-[0.24em] text-bank-text-muted">Sterne</span>
            <div className="flex flex-wrap gap-1.5" data-testid="rating-filter">
              <button
                type="button"
                onClick={() => setRating(0)}
                data-testid="rating-filter-all"
                className={`rounded-full border px-3 py-1 text-[12px] transition-colors ${
                  rating === 0 ? 'border-bank-primary bg-bank-primary text-white' : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-primary/40'
                }`}
              >
                Alle
              </button>
              {RATING_FILTERS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  data-testid={`rating-filter-${n}`}
                  className={`rounded-full border px-3 py-1 text-[12px] transition-colors ${
                    rating === n ? 'border-bank-primary bg-bank-primary text-white' : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-primary/40'
                  }`}
                >
                  {n} ★
                </button>
              ))}
            </div>
            <span className="ml-3 text-[10.5px] font-medium uppercase tracking-[0.24em] text-bank-text-muted">Antwort</span>
            <div className="flex flex-wrap gap-1.5" data-testid="response-filter">
              <button
                type="button"
                onClick={() => setResponseFilter('')}
                data-testid="response-filter-all"
                className={`rounded-full border px-3 py-1 text-[12px] transition-colors ${
                  responseFilter === '' ? 'border-bank-primary bg-bank-primary text-white' : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-primary/40'
                }`}
              >
                Alle
              </button>
              <button
                type="button"
                onClick={() => setResponseFilter('with')}
                data-testid="response-filter-with"
                className={`rounded-full border px-3 py-1 text-[12px] transition-colors ${
                  responseFilter === 'with' ? 'border-bank-primary bg-bank-primary text-white' : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-primary/40'
                }`}
              >
                Mit Antwort
              </button>
              <button
                type="button"
                onClick={() => setResponseFilter('without')}
                data-testid="response-filter-without"
                className={`rounded-full border px-3 py-1 text-[12px] transition-colors ${
                  responseFilter === 'without' ? 'border-bank-primary bg-bank-primary text-white' : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-primary/40'
                }`}
              >
                Ohne Antwort
              </button>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                data-testid="reset-filters"
                className="ml-auto inline-flex items-center gap-1 text-[12px] text-bank-text-muted underline-offset-4 hover:text-bank-primary hover:underline"
              >
                <X className="h-3.5 w-3.5" /> Filter zurücksetzen
              </button>
            )}
          </div>

          {/* Result count */}
          <p className="mt-4 text-[12.5px] text-bank-text-muted" data-testid="kundenstimmen-count">
            {loading ? 'Ergebnisse werden geladen …' : `${total} Kundenstimme${total === 1 ? '' : 'n'} gefunden`}
          </p>
        </div>

        {loading ? (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (<div key={i} className="h-[240px] animate-pulse rounded-3xl bg-neutral-100" />))}
          </div>
        ) : error ? (
          <p className="mt-8 rounded-3xl border border-rose-200 bg-rose-50 p-8 text-[14px] text-rose-800" data-testid="kundenstimmen-error">
            Die Kundenstimmen konnten nicht geladen werden. Bitte laden Sie die Seite später erneut.
          </p>
        ) : rest.length === 0 ? (
          <p className="mt-8 rounded-3xl border border-bank-border bg-neutral-50 p-8 text-[14px] text-bank-text-muted" data-testid="kundenstimmen-empty">
            {hasActiveFilters
              ? 'Für die aktuellen Filter liegen keine Kundenstimmen vor. Passen Sie die Filter an oder setzen Sie sie zurück.'
              : 'Sobald weitere Kundenerfahrungen von uns freigegeben wurden, erscheinen sie an dieser Stelle.'}
          </p>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" data-testid="kundenstimmen-grid">
              {rest.map((r) => (<TestimonialCard key={r.id} review={r} />))}
            </div>
            {items.length < total && (
              <div className="mt-10 flex justify-center">
                <Button variant="outline" className="rounded-full" onClick={loadMore} disabled={loadingMore} data-testid="kundenstimmen-load-more">
                  {loadingMore ? 'Wird geladen …' : `Weitere ${Math.min(PAGE_SIZE, total - items.length)} anzeigen`}
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Share your experience */}
      <section id="erfahrung-teilen" className="border-t border-bank-border bg-neutral-50/60 py-16 sm:py-20">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-6 sm:px-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-bank-accent-strong">Ihre Erfahrung mit uns</p>
            <h2 className="mt-3 font-serif text-3xl leading-tight text-bank-text sm:text-4xl">
              Teilen Sie Ihre persönliche Erfahrung.
            </h2>
            <p className="mt-4 text-[14.5px] leading-relaxed text-bank-text-muted">
              Sie sind Kunde von Fröhlich Vermögensberatung und möchten Ihre Erfahrung mit uns teilen? Wir freuen uns
              über Ihre persönliche Rückmeldung — sie erscheint erst nach interner Prüfung öffentlich.
            </p>
            <p className="mt-6 font-serif text-lg italic text-bank-text">
              Langfristige Zusammenarbeit entsteht nicht durch Versprechen, sondern durch Erfahrungen.
            </p>
          </div>
          <ReviewSubmitForm
            variant="testimonial"
            onSubmitted={() => {
              reviewsApi.topics({ include_demo: previewDemo }).then(setTopicCounts).catch(() => {});
            }}
          />
        </div>
      </section>
    </div>
  );
};

export default Kundenstimmen;
