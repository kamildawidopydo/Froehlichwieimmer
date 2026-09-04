import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight } from 'lucide-react';
import SafeNewsImage from '@/components/news/SafeNewsImage';
import { einordnungApi, EINORDNUNG_CATEGORY_LABEL } from '@/services/einordnungApi';

/**
 * Session 80.67 — „Unsere Einordnung" auf 3 gleichwertige Editorial-Cards umgestellt.
 * Vorher: 1 dominante FeatureCard (`lg:aspect-auto` streckte Bild vertikal) +
 * 3 kleine Seitenkarten. Neu: bis zu 3 gleichbreite Cards mit fixem 16:10-Bildformat.
 * Bestehende API, Slugs, Detail-Routen und CTA-Ziel unverändert.
 */

const dateFmt = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
};

const DemoTag = () => (
  <span
    className="inline-flex items-center gap-1 border border-amber-300 bg-amber-50 px-1.5 py-px font-mono text-[9.5px] uppercase tracking-[0.16em] text-amber-900"
    data-testid="einordnung-demo-tag"
  >
    Demo / Redaktioneller Testinhalt
  </span>
);

const CategoryLabel = ({ category }) => (
  <span className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">
    {EINORDNUNG_CATEGORY_LABEL[category] || category}
  </span>
);

/**
 * Editorial-Card — identische Gewichtung für alle 3 Berichte.
 * 16:10-Bild oben (object-cover, mittiger Ausschnitt für ggf. hochformatige Originale),
 * Serif-Titel, dezente Meta-Zeile mit Datum + Autor, Trenner in Gold, „Einordnung lesen →".
 */
const EditorialCard = ({ post }) => (
  <Link
    to={`/news/einordnung/${post.slug}`}
    className="group flex min-w-0 flex-col border border-bank-border bg-white transition-colors hover:border-bank-gold/60 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bank-gold"
    data-testid={`einordnung-card-${post.slug}`}
  >
    <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-100">
      <SafeNewsImage
        src={post.image_url}
        category={post.category}
        alt={post.title || ''}
        className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
      />
    </div>
    <div className="flex flex-1 flex-col gap-3 px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <CategoryLabel category={post.category} />
        {post.is_demo && <DemoTag />}
      </div>
      <h3 className="font-serif text-[19px] leading-[1.25] text-bank-text group-hover:text-bank-primary sm:text-[20px]">
        {post.title}
      </h3>
      <p className="line-clamp-3 text-[13.5px] leading-relaxed text-bank-text-muted">
        {post.teaser}
      </p>
      <div className="mt-auto flex flex-col gap-2 border-t border-bank-gold/30 pt-3">
        <div className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
          <span>{dateFmt(post.published_at)}</span>
          <span>{post.author || 'Fröhlich Vermögensberatung'}</span>
        </div>
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-bank-primary transition-colors group-hover:text-bank-primary-hover">
          Einordnung lesen <ArrowRight size={12} strokeWidth={1.9} />
        </span>
      </div>
    </div>
  </Link>
);

const EinordnungSection = () => {
  const [state, setState] = useState({ items: [], loading: true, error: false });

  useEffect(() => {
    let alive = true;
    // Größerer Fetch (Buffer), damit nach Demo-Filter bis zu 3 echte Beiträge
    // übrig bleiben können, sobald Redaktion produktive Einordnungen einstellt.
    einordnungApi.list({ limit: 25 })
      .then((d) => {
        if (!alive) return;
        // Session 80.68 — Produktions-Filter: nur echte, publizierte Beiträge.
        // Demo-/Seed-Datensätze (`is_demo === true`) werden aus der öffentlichen
        // Section entfernt, damit produktiv keine Testinhalte sichtbar sind.
        const real = (d.items || []).filter(
          (p) => p && p.is_demo !== true && (p.status ? p.status === 'published' : true),
        );
        setState({ items: real.slice(0, 3), loading: false, error: false });
      })
      .catch(() => { if (alive) setState({ items: [], loading: false, error: true }); });
    return () => { alive = false; };
  }, []);

  const items = state.items;
  const count = items.length;

  // Adaptives Grid: exakt so viele Spalten wie Beiträge (max. 3) — keine Lücken,
  // keine künstlichen dritten Cards, wenn nur 1 oder 2 echte Einordnungen vorliegen.
  const gridCols = count >= 3
    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
    : count === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : 'grid-cols-1 sm:max-w-md';

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
          <h2
            id="einordnung-headline"
            className="font-serif text-3xl leading-[1.05] text-bank-text sm:text-[42px]"
          >
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
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[420px] animate-pulse border border-bank-border bg-white/70" />
            ))}
          </div>
        )}

        {!state.loading && !state.error && count > 0 && (
          <div className={`mt-10 grid gap-6 ${gridCols}`} data-testid="einordnung-grid">
            {items.map((p) => <EditorialCard key={p.slug} post={p} />)}
          </div>
        )}

        {!state.loading && count === 0 && (
          /* Session 80.68 — Editorial Empty-State ohne „noch keine Beiträge"-
             Formulierung. Wird sichtbar, wenn (a) API-Fehler oder (b) keine
             echten, non-demo Beiträge veröffentlicht sind. */
          <div
            className="mt-10 border border-bank-border bg-white px-6 py-10 sm:px-10 sm:py-12"
            data-testid="einordnung-empty-state"
          >
            <div className="mx-auto max-w-2xl text-center">
              <p className="max-w-2xl text-[14.5px] leading-relaxed text-bank-text-muted">
                Hier veröffentlichen wir unsere Einordnung zu aktuellen Entwicklungen an
                den Kapitalmärkten, Zinsen und ausgewählten Anlagethemen.
              </p>
              <Link
                to="/news/nachrichten"
                data-testid="einordnung-empty-cta"
                className="mt-6 inline-flex items-center gap-1.5 border-b border-bank-primary/60 pb-0.5 font-mono text-[11px] uppercase tracking-[0.22em] text-bank-primary transition-colors hover:border-bank-primary hover:text-bank-primary-hover focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bank-gold"
              >
                Aktuelle Marktnachrichten ansehen <ArrowRight size={13} strokeWidth={1.9} />
              </Link>
            </div>
          </div>
        )}

        {!state.loading && count > 0 && (
          <div className="mt-10 flex flex-col items-start gap-4 border-t border-bank-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-[12px] leading-relaxed text-bank-text-muted">
              Diese Beiträge dienen ausschließlich allgemeinen Informationszwecken und stellen keine individuelle
              Anlageberatung oder Anlageempfehlung dar.
            </p>
            <Link
              to="/news/nachrichten#einordnung-section"
              data-testid="einordnung-all-cta"
              className="inline-flex shrink-0 items-center gap-1.5 border-b border-bank-primary/60 pb-0.5 font-mono text-[11px] uppercase tracking-[0.22em] text-bank-primary transition-colors hover:border-bank-primary hover:text-bank-primary-hover focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bank-gold"
            >
              Alle Einordnungen ansehen <ArrowRight size={13} strokeWidth={1.9} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default EinordnungSection;
