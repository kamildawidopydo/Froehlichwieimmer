import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import Eyebrow from '@/components/editorial/Eyebrow';
import { relativeTimeLabel } from '@/lib/news/relativeTime';

/**
 * Session 80.35 — Geteiltes Layout für Themen-Landingpages.
 *
 * Wird von `/themen/zinsen-sparen` und `/themen/ruhestand-vorsorge` verwendet.
 * Registry-driven: nutzt bestehende `TOPIC_REGISTRY` (Frontend-Mirror) und
 * lädt aktuelle News ausschließlich über `investment_topic_slug`. Keine
 * Kategorie-Regex-Fallback für „aktuell". Wenn keine aktuellen News
 * vorhanden sind, wird die entsprechende Sektion ausgeblendet — die Seite
 * bleibt aber vollständig durch Evergreen-Inhalte tragbar.
 *
 * Sektionen (in Reihenfolge, alle optional außer Hero):
 *   1. Hero (Kicker + H1 + Intro + optional 1 CTA + 1 secondary link)
 *   2. Aktuell zum Thema — max. 3 News, 48h-Freshness
 *   3. Editorial-Block "Was bedeutet …" — statisch, keine Empfehlung
 *   4. Fröhlich Einordnung — max. 2, nur bei topic-Match
 *   5. Wissen & Grundlagen — max. 4 kanonische Wissensziele
 *   6. Sparangebote (nur zinsen-sparen) ODER Strategie
 *   7. Related Topics — max. 2 kleine Links
 */

const BASE = process.env.REACT_APP_BACKEND_URL;
const api = axios.create({ baseURL: `${BASE}/api`, withCredentials: false });

const ThemenLandingLayout = ({
  slug,
  seo,
  hero,
  contextBlock,
  knowledgeLinks = [],
  strategyLinks = [],
  primaryOffer,           // optional { kicker, title, body, ctaLabel, href, testId }
  relatedTopics = [],     // [{ label, href }]
  accent = 'petrol',      // 'petrol' | 'amber'
}) => {
  const [news, setNews] = useState([]);
  const [einordnungen, setEinordnungen] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        // Beide Ressourcen parallel laden — max. 2 Requests, kein N+1.
        const [newsRes, einoRes] = await Promise.all([
          api.get('/news/nachrichten', { params: { investment_topic_slug: slug, limit: 3 } }).catch(() => ({ data: { items: [] } })),
          api.get('/einordnung', { params: { limit: 25 } }).catch(() => ({ data: { items: [] } })),
        ]);
        if (!alive) return;
        setNews(newsRes.data?.items || []);
        const posts = (einoRes.data?.items || []).filter((p) => !p.status || p.status === 'published');
        setEinordnungen(posts.filter((p) => p.investment_topic_slug === slug).slice(0, 2));
      } catch {
        if (alive) { setNews([]); setEinordnungen([]); }
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [slug]);

  const accentText = accent === 'amber' ? 'text-bank-amber-strong' : 'text-bank-petrol-strong';
  const accentCardTop = accent === 'amber' ? 'card-accent-top-amber' : 'card-accent-top-petrol';
  const accentBorder = accent === 'amber' ? 'border-bank-amber-strong' : 'border-bank-petrol-strong';

  return (
    <div className="min-h-screen bg-bank-bg">
      <PageMeta title={seo.title} description={seo.description} canonical={`/themen/${slug}`} />

      <div className="mx-auto max-w-4xl px-6 pb-24 pt-14 sm:px-8">
        {/* -------------------------------------------------------------- */}
        {/* Hero                                                           */}
        {/* -------------------------------------------------------------- */}
        <header className="border-b border-bank-border pb-10" data-testid="themen-hero">
          <Eyebrow className={accentText}>{hero.kicker}</Eyebrow>
          <h1 className="mt-3 font-serif text-4xl leading-tight text-bank-text sm:text-5xl">
            {hero.headline}
          </h1>
          <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-bank-text">
            {hero.intro}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2">
            {hero.primaryCta && (
              <Link
                to={hero.primaryCta.href}
                data-testid="themen-hero-primary-cta"
                className={`inline-flex items-center gap-2 border-b pb-0.5 text-[12.5px] font-medium uppercase tracking-[0.18em] ${accentText} ${accentBorder} hover:opacity-80`}
              >
                {hero.primaryCta.label}
                <ArrowRight size={13} strokeWidth={1.7} />
              </Link>
            )}
            {hero.secondaryLink && (
              <Link
                to={hero.secondaryLink.href}
                data-testid="themen-hero-secondary-link"
                className="inline-flex items-center gap-1.5 text-[12.5px] text-bank-text-muted underline-offset-4 hover:underline"
              >
                {hero.secondaryLink.label}
                <ArrowRight size={12} strokeWidth={1.6} />
              </Link>
            )}
          </div>
        </header>

        {/* -------------------------------------------------------------- */}
        {/* Aktuell zum Thema                                              */}
        {/* -------------------------------------------------------------- */}
        {!loading && news.length > 0 && (
          <section className="mt-14" aria-labelledby="themen-news-title" data-testid="themen-current-news">
            <p id="themen-news-title" className={`font-mono text-[10.5px] uppercase tracking-[0.28em] ${accentText}`}>
              Aktuell zum Thema
            </p>
            <ul className="mt-4 divide-y divide-bank-border border-t border-bank-border">
              {news.map((n) => (
                <li key={n.slug} className="py-4">
                  <Link
                    to={`/news/nachrichten/${n.slug}`}
                    data-testid={`themen-news-${n.slug}`}
                    className="group flex flex-col gap-1.5"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-bank-text-muted">
                      {relativeTimeLabel(n.published_at)}
                    </p>
                    <p className="font-serif text-[18px] leading-snug text-bank-text group-hover:text-bank-text">
                      {n.title}
                    </p>
                    {n.excerpt && (
                      <p className="line-clamp-2 text-[13.5px] leading-relaxed text-bank-text-muted">
                        {n.excerpt}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* -------------------------------------------------------------- */}
        {/* Was bedeutet …? — statischer Editorial-Block                   */}
        {/* -------------------------------------------------------------- */}
        {contextBlock && (
          <section
            className={`card-accent-top ${accentCardTop} mt-12 border border-bank-border bg-white p-6 sm:p-8`}
            aria-labelledby="themen-context-title"
            data-testid="themen-context"
          >
            <p id="themen-context-title" className={`font-mono text-[10.5px] uppercase tracking-[0.24em] ${accentText}`}>
              {contextBlock.kicker}
            </p>
            <h2 className="mt-3 font-serif text-2xl leading-snug text-bank-text">
              {contextBlock.headline}
            </h2>
            <ul className="mt-5 space-y-3">
              {contextBlock.points.map((p, i) => (
                <li key={i} className="flex gap-3 text-[14.5px] leading-relaxed text-bank-text">
                  <span aria-hidden className="mt-2 inline-block h-1 w-3 shrink-0 bg-current opacity-50" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-[11px] uppercase tracking-[0.16em] text-bank-text-muted">
              Allgemeine Information — keine individuelle Anlageberatung.
            </p>
          </section>
        )}

        {/* -------------------------------------------------------------- */}
        {/* Fröhlich Einordnung                                            */}
        {/* -------------------------------------------------------------- */}
        {einordnungen.length > 0 && (
          <section className="mt-14" data-testid="themen-einordnung">
            <p className={`font-mono text-[10.5px] uppercase tracking-[0.28em] ${accentText}`}>
              Fröhlich Einordnung
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {einordnungen.map((e) => (
                <Link
                  key={e.slug}
                  to={`/einordnung/${e.slug}`}
                  className="group border border-bank-border bg-white p-6 hover:border-bank-primary/40"
                  data-testid={`themen-einordnung-${e.slug}`}
                >
                  <p className="font-serif text-[17px] leading-snug text-bank-text">{e.title}</p>
                  {e.teaser && (
                    <p className="mt-3 line-clamp-3 text-[13px] leading-relaxed text-bank-text-muted">{e.teaser}</p>
                  )}
                  <span className={`mt-4 inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.16em] ${accentText}`}>
                    Einordnung lesen <ArrowUpRight size={12} strokeWidth={1.7} />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* -------------------------------------------------------------- */}
        {/* Wissen & Grundlagen                                            */}
        {/* -------------------------------------------------------------- */}
        {knowledgeLinks.length > 0 && (
          <section className="mt-14" data-testid="themen-knowledge">
            <p className={`font-mono text-[10.5px] uppercase tracking-[0.28em] ${accentText}`}>
              Wissen & Grundlagen
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {knowledgeLinks.map((k) => (
                <Link
                  key={k.href}
                  to={k.href}
                  className="group border border-bank-border bg-white p-5 hover:border-bank-primary/40"
                  data-testid={`themen-knowledge-${k.href.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}
                >
                  <p className="font-serif text-[16px] leading-snug text-bank-text">{k.title}</p>
                  {k.description && (
                    <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-bank-text-muted">{k.description}</p>
                  )}
                  <span className="mt-3 inline-flex items-center gap-1 text-[12px] text-bank-primary underline-offset-4 group-hover:underline">
                    {k.cta || 'Mehr erfahren'} <ArrowRight size={12} strokeWidth={1.6} />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* -------------------------------------------------------------- */}
        {/* Primary offer (Sparangebote bei Zinsen, Strategy bei Ruhestand) */}
        {/* -------------------------------------------------------------- */}
        {primaryOffer && (
          <section
            className="mt-14 border-t border-bank-border pt-10"
            data-testid={primaryOffer.testId || 'themen-primary-offer'}
          >
            <p className={`font-mono text-[10.5px] uppercase tracking-[0.28em] ${accentText}`}>
              {primaryOffer.kicker}
            </p>
            <h2 className="mt-3 font-serif text-2xl leading-snug text-bank-text">
              {primaryOffer.title}
            </h2>
            <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-bank-text-muted">
              {primaryOffer.body}
            </p>
            <Link
              to={primaryOffer.href}
              data-testid={`${primaryOffer.testId || 'themen-primary-offer'}-cta`}
              className={`mt-5 inline-flex items-center gap-2 border-b pb-0.5 text-[12.5px] font-medium uppercase tracking-[0.18em] ${accentText} ${accentBorder} hover:opacity-80`}
            >
              {primaryOffer.ctaLabel}
              <ArrowRight size={13} strokeWidth={1.7} />
            </Link>
          </section>
        )}

        {/* -------------------------------------------------------------- */}
        {/* Strategie                                                       */}
        {/* -------------------------------------------------------------- */}
        {strategyLinks.length > 0 && (
          <section className="mt-14" data-testid="themen-strategy">
            <p className={`font-mono text-[10.5px] uppercase tracking-[0.28em] ${accentText}`}>
              Strategie
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {strategyLinks.map((s) => (
                <Link
                  key={s.href}
                  to={s.href}
                  className="group border border-bank-border bg-white p-5 hover:border-bank-primary/40"
                  data-testid={`themen-strategy-${s.href.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}
                >
                  <p className="font-serif text-[16px] leading-snug text-bank-text">{s.title}</p>
                  {s.description && (
                    <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-bank-text-muted">{s.description}</p>
                  )}
                  <span className="mt-3 inline-flex items-center gap-1 text-[12px] text-bank-primary underline-offset-4 group-hover:underline">
                    Zur Strategie <ArrowRight size={12} strokeWidth={1.6} />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* -------------------------------------------------------------- */}
        {/* Related Topics                                                 */}
        {/* -------------------------------------------------------------- */}
        {relatedTopics.length > 0 && (
          <section className="mt-16 border-t border-bank-border pt-6" data-testid="themen-related">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-text-muted">
              Weitere Themen
            </p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              {relatedTopics.slice(0, 2).map((r) => (
                <Link
                  key={r.href}
                  to={r.href}
                  className="text-[13px] text-bank-primary underline-offset-4 hover:underline"
                  data-testid={`themen-related-${r.href.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}
                >
                  {r.label} →
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ThemenLandingLayout;
