import React, { useEffect, useState } from 'react';
import PageMeta from '@/components/PageMeta';
import { Button } from '@/components/ui/button';
import TestimonialCard from '@/components/reviews/TestimonialCard';
import ReviewSubmitForm from '@/components/reviews/ReviewSubmitForm';
import { reviewsApi } from '@/services/reviewsApi';

const PAGE_SIZE = 9;

const Kundenstimmen = () => {
  const [items, setItems] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [topic, setTopic] = useState('');
  const [topicCounts, setTopicCounts] = useState({ topics: [], total_approved: 0 });

  useEffect(() => {
    reviewsApi.topics().then(setTopicCounts).catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    setError(false);
    Promise.all([
      reviewsApi.list({ featured: true, limit: 3, sort: 'newest' }),
      reviewsApi.list({ limit: PAGE_SIZE, offset: 0, sort: 'newest', topic: topic || undefined }),
    ])
      .then(([feat, all]) => {
        setFeatured(feat.items);
        setItems(all.items);
        setTotal(all.total);
        setOffset(0);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [topic]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = async () => {
    const next = offset + PAGE_SIZE;
    setLoadingMore(true);
    try {
      const data = await reviewsApi.list({ limit: PAGE_SIZE, offset: next, sort: 'newest', topic: topic || undefined });
      setItems((prev) => [...prev, ...data.items]);
      setOffset(next);
      setTotal(data.total);
    } finally {
      setLoadingMore(false);
    }
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

      {/* Hero on dark blue */}
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
        {featured.length === 0 && !loading && !error && (
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

        <div className="mt-6 flex flex-wrap gap-2" role="tablist" data-testid="topic-filter">
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
          {(topicCounts.topics || []).filter((t) => t.count > 0 || !topic || topic === t.slug).map((t) => {
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
            Sobald weitere Kundenerfahrungen von uns freigegeben wurden, erscheinen sie an dieser Stelle.
          </p>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((r) => (<TestimonialCard key={r.id} review={r} />))}
            </div>
            {items.length < total && (
              <div className="mt-10 flex justify-center">
                <Button variant="outline" className="rounded-full" onClick={loadMore} disabled={loadingMore} data-testid="kundenstimmen-load-more">
                  {loadingMore ? 'Wird geladen …' : 'Weitere anzeigen'}
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
          <ReviewSubmitForm variant="testimonial" onSubmitted={load} />
        </div>
      </section>
    </div>
  );
};

export default Kundenstimmen;
