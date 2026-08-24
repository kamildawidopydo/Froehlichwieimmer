import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowUpRight, Clock } from 'lucide-react';
import Eyebrow from '@/components/editorial/Eyebrow';
import SafeNewsImage from '@/components/news/SafeNewsImage';
import { einordnungApi, EINORDNUNG_CATEGORY_LABEL } from '@/services/einordnungApi';

const dateFmt = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
};

const DemoTag = () => (
  <span className="inline-flex items-center gap-1 border border-amber-300 bg-amber-50 px-1.5 py-px font-mono text-[9.5px] uppercase tracking-[0.16em] text-amber-900" data-testid="einordnung-demo-tag">
    Demo / Redaktioneller Testinhalt
  </span>
);

const CategoryLabel = ({ category }) => (
  <span className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">
    {EINORDNUNG_CATEGORY_LABEL[category] || category}
  </span>
);

/** Featured card — larger, headline treatment. */
const FeatureCard = ({ post }) => (
  <Link
    to={`/news/einordnung/${post.slug}`}
    className="group grid grid-cols-1 gap-0 border border-bank-border bg-white transition-colors hover:border-bank-gold/60 lg:grid-cols-[1.15fr_1fr]"
    data-testid={`einordnung-feature-${post.slug}`}
  >
    <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-100 lg:aspect-auto">
      {post.image_url && (
        <SafeNewsImage src={post.image_url} category={post.category} alt={post.title || ''} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
      )}
    </div>
    <div className="flex flex-col justify-between gap-5 p-6 sm:p-8">
      <div>
        <div className="flex items-center gap-2">
          <CategoryLabel category={post.category} />
          {post.is_demo && <DemoTag />}
        </div>
        <h3 className="mt-3 font-serif text-2xl leading-[1.15] text-bank-text sm:text-3xl">{post.title}</h3>
        <p className="mt-4 text-[14.5px] leading-relaxed text-bank-text-muted">{post.teaser}</p>
      </div>
      <div className="flex items-end justify-between border-t border-bank-gold/40 pt-4 text-[11px] uppercase tracking-[0.18em] text-bank-text-muted">
        <span>{dateFmt(post.published_at)} · {post.author}</span>
        <span className="inline-flex items-center gap-1 text-bank-primary">
          Einordnung lesen <ArrowUpRight size={12} strokeWidth={1.8} />
        </span>
      </div>
    </div>
  </Link>
);

/** Standard card in the side column. */
const StandardCard = ({ post }) => (
  <Link
    to={`/news/einordnung/${post.slug}`}
    className="group flex min-w-0 flex-col border border-bank-border bg-white transition-colors hover:border-bank-gold/60"
    data-testid={`einordnung-card-${post.slug}`}
  >
    {post.image_url && (
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-100">
        <SafeNewsImage src={post.image_url} category={post.category} alt={post.title || ''} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
      </div>
    )}
    <div className="flex flex-1 flex-col gap-2 px-4 py-4">
      <div className="flex items-center gap-2">
        <CategoryLabel category={post.category} />
        {post.is_demo && <DemoTag />}
      </div>
      <h3 className="font-serif text-[16.5px] leading-snug text-bank-text group-hover:text-bank-primary">{post.title}</h3>
      <p className="line-clamp-3 text-[13px] leading-relaxed text-bank-text-muted">{post.teaser}</p>
      <div className="mt-auto flex items-center justify-between pt-3 text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
        <span className="inline-flex items-center gap-1">
          <Clock size={10} strokeWidth={1.8} /> {post.reading_minutes} Min. Lesezeit
        </span>
        <span>{dateFmt(post.published_at)}</span>
      </div>
    </div>
  </Link>
);

const EinordnungSection = ({ compact = false }) => {
  const [state, setState] = useState({ items: [], loading: true, error: false });

  useEffect(() => {
    let alive = true;
    einordnungApi.list({ limit: 4 })
      .then((d) => { if (alive) setState({ items: d.items || [], loading: false, error: false }); })
      .catch(() => { if (alive) setState({ items: [], loading: false, error: true }); });
    return () => { alive = false; };
  }, []);

  const [feature, ...rest] = state.items;

  return (
    <section
      className="mt-16 border-y border-bank-gold/40 bg-gradient-to-b from-white via-bank-cream/60 to-white py-14 sm:py-16"
      data-testid="einordnung-section"
      aria-labelledby="einordnung-headline"
    >
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-bank-gold" strokeWidth={1.6} />
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-bank-primary">
              Fröhlich Vermögensberatung
            </p>
          </div>
          <h2 id="einordnung-headline" className="font-serif text-3xl leading-[1.05] text-bank-text sm:text-[42px]">
            Unsere Einordnung
          </h2>
          <p className="max-w-2xl text-[14.5px] leading-relaxed text-bank-text-muted">
            Nachrichten zeigen, was passiert. Wir betrachten, was daraus langfristig relevant werden könnte —
            keine kurzfristigen Schlagzeilen, sondern Entwicklungen im Kontext von Chancen, Risiken und
            langfristigen Anlagezielen.
          </p>
          <div className="mt-2 h-px w-24 bg-bank-gold/60" aria-hidden />
        </div>

        {state.loading && (
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="h-[360px] animate-pulse border border-bank-border bg-white/70" />
            <div className="flex flex-col gap-4">
              {[0, 1, 2].map((i) => <div key={i} className="h-[110px] animate-pulse border border-bank-border bg-white/70" />)}
            </div>
          </div>
        )}

        {!state.loading && !state.error && feature && (
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
            <FeatureCard post={feature} />
            <div className="flex flex-col gap-4">
              {rest.slice(0, compact ? 2 : 3).map((p) => <StandardCard key={p.slug} post={p} />)}
            </div>
          </div>
        )}

        {!state.loading && !state.error && !feature && (
          <p className="mt-10 text-[13px] text-bank-text-muted" data-testid="einordnung-empty">
            Aktuell noch keine veröffentlichten Beiträge.
          </p>
        )}

        <div className="mt-10 border-t border-bank-border pt-6 text-[12px] leading-relaxed text-bank-text-muted">
          Diese Beiträge dienen ausschließlich allgemeinen Informationszwecken und stellen keine individuelle
          Anlageberatung oder Anlageempfehlung dar.
        </div>
      </div>
    </section>
  );
};

export default EinordnungSection;
