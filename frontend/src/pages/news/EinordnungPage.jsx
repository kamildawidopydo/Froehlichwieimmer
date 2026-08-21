import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, BookOpen, ArrowUpRight, PhoneCall } from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import Eyebrow from '@/components/editorial/Eyebrow';
import { einordnungApi, EINORDNUNG_CATEGORY_LABEL } from '@/services/einordnungApi';

const dateFmt = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
};

/** Rudimentary Markdown-lite renderer for the body ("## " headings, paragraphs, line breaks). */
const renderBody = (body) => {
  if (!body) return null;
  return body.split(/\n{2,}/).map((block, idx) => {
    const trimmed = block.trim();
    if (trimmed.startsWith('## ')) {
      return (
        <h2 key={idx} className="mt-10 font-serif text-2xl leading-tight text-bank-text">
          {trimmed.replace(/^##\s+/, '')}
        </h2>
      );
    }
    return (
      <p key={idx} className="mt-4 text-[15px] leading-relaxed text-bank-text">
        {trimmed}
      </p>
    );
  });
};

const EinordnungPage = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [state, setState] = useState('loading');

  useEffect(() => {
    let alive = true;
    setState('loading');
    einordnungApi.detail(slug)
      .then((d) => { if (alive) { setPost(d); setState('ready'); } })
      .catch((err) => { if (alive) setState(err?.response?.status === 404 ? 'notfound' : 'error'); });
    return () => { alive = false; };
  }, [slug]);

  return (
    <div className="bg-white" data-testid="einordnung-detail-page">
      <PageMeta
        title={post ? `${post.title} — Unsere Einordnung` : 'Unsere Einordnung'}
        description={post?.teaser || ''}
        path={`/news/einordnung/${slug}`}
      />

      <section className="border-b border-bank-border bg-gradient-to-b from-bank-cream/40 to-white">
        <div className="mx-auto max-w-3xl px-6 pb-12 pt-14 sm:px-10 sm:pt-16">
          <Link to="/news/nachrichten" className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-bank-text-muted hover:text-bank-primary">
            <ArrowLeft size={12} strokeWidth={1.7} /> Zurück zu Nachrichten
          </Link>

          {state === 'loading' && (
            <div className="mt-10 h-8 w-2/3 animate-pulse bg-neutral-100" />
          )}
          {state === 'notfound' && (
            <p className="mt-10 text-[14px] text-bank-text-muted" data-testid="einordnung-not-found">Einordnung nicht gefunden.</p>
          )}
          {state === 'error' && (
            <p className="mt-10 text-[14px] text-rose-700">Einordnung konnte nicht geladen werden.</p>
          )}

          {post && (
            <>
              <div className="mt-6 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-bank-gold" strokeWidth={1.6} />
                <Eyebrow>Fröhlich Vermögensberatung — Unsere Einordnung</Eyebrow>
                {post.is_demo && (
                  <span className="inline-flex items-center gap-1 border border-amber-300 bg-amber-50 px-1.5 py-px font-mono text-[9.5px] uppercase tracking-[0.16em] text-amber-900" data-testid="einordnung-detail-demo">
                    Demo / Redaktioneller Testinhalt
                  </span>
                )}
              </div>
              <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">
                {EINORDNUNG_CATEGORY_LABEL[post.category] || post.category}
              </p>
              <h1 className="mt-2 font-serif text-3xl leading-[1.1] text-bank-text sm:text-[42px]">{post.title}</h1>
              <p className="mt-5 text-[16px] leading-relaxed text-bank-text-muted">{post.teaser}</p>
              <div className="mt-6 flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-bank-text-muted">
                <span>{dateFmt(post.published_at)}</span>
                <span aria-hidden className="text-bank-gold">·</span>
                <span>{post.author}</span>
                <span aria-hidden className="text-bank-gold">·</span>
                <span className="inline-flex items-center gap-1"><Clock size={11} strokeWidth={1.8} /> {post.reading_minutes} Min. Lesezeit</span>
              </div>
            </>
          )}
        </div>
      </section>

      {post && (
        <article className="mx-auto max-w-3xl px-6 pb-20 pt-10 sm:px-10">
          {post.image_url && (
            <div className="relative mb-10 aspect-[16/9] w-full overflow-hidden bg-neutral-100">
              <img src={post.image_url} alt="" className="h-full w-full object-cover" />
            </div>
          )}

          <div className="max-w-none">{renderBody(post.body)}</div>

          {post.related_news_slug && (
            <div className="mt-12 border border-bank-border bg-bank-cream/30 p-5">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-primary">Bezug zu einer aktuellen Nachricht</p>
              <Link to={`/news/euronews/${post.related_news_slug}`} className="mt-2 inline-flex items-center gap-1.5 text-[14px] text-bank-primary hover:underline">
                Externe Meldung ansehen <ArrowUpRight size={13} strokeWidth={1.8} />
              </Link>
            </div>
          )}

          {/* Persönliche Beratung CTA */}
          <aside className="mt-14 border border-bank-gold/60 bg-bank-primary p-6 text-white sm:p-8" data-testid="einordnung-cta">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-bank-gold">Persönliche Einordnung</p>
            <h2 className="mt-3 font-serif text-2xl leading-tight sm:text-3xl">
              Sie möchten wissen, was eine Entwicklung für Ihre persönliche Situation bedeutet?
            </h2>
            <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-white/85">
              Unsere Berater betrachten nicht nur einzelne Nachrichten, sondern Ihre Vermögenssituation als Ganzes.
            </p>
            <Link
              to="/contact"
              data-testid="einordnung-cta-contact"
              className="mt-6 inline-flex items-center gap-2 border border-bank-gold bg-white/5 px-5 py-2.5 text-[12px] font-medium uppercase tracking-[0.18em] text-white transition-colors hover:bg-white/10"
            >
              <PhoneCall size={14} strokeWidth={1.8} /> Persönlichen Ansprechpartner kontaktieren
            </Link>
          </aside>

          {/* Disclaimer */}
          <div className="mt-12 border-t border-bank-border pt-6 text-[12px] leading-relaxed text-bank-text-muted">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-accent-strong">Wichtiger Hinweis</p>
            <p className="mt-2">
              Diese Veröffentlichung dient ausschließlich allgemeinen Informationszwecken und stellt keine
              individuelle Anlageberatung oder Anlageempfehlung dar. Anlageentscheidungen sollten immer unter
              Berücksichtigung der persönlichen finanziellen Situation, Anlageziele und Risikobereitschaft
              getroffen werden.
            </p>
          </div>
        </article>
      )}
    </div>
  );
};

export default EinordnungPage;
