import { getApiBase } from '@/lib/apiBase';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowUpRight, Calendar, Mail } from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import Eyebrow from '@/components/editorial/Eyebrow';
import NewsletterSignup from '@/components/home/NewsletterSignup';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';

const BASE = getApiBase();
const api = axios.create({ baseURL: `${BASE}/api`, withCredentials: false, timeout: 12000 });

const CATEGORY_LABEL = {
  wirtschaft: 'Wirtschaft', unternehmen: 'Unternehmen', maerkte: 'Märkte',
  zinsen: 'Zinsen', 'fonds-etfs': 'Fonds & ETFs', europa: 'Europa',
  welt: 'Welt', politik: 'Politik', rohstoffe: 'Rohstoffe',
  energie: 'Energie', technologie: 'Technologie', industrie: 'Industrie',
  waehrungen: 'Währungen', klima: 'Klima', mobilitaet: 'Mobilität',
  gesundheit: 'Gesundheit', sicherheit: 'Sicherheit', wissen: 'Wissen',
};

const humanCategory = (k) => CATEGORY_LABEL[k] || (k ? k.charAt(0).toUpperCase() + k.slice(1) : '');

const formatWeek = (label) => {
  if (!label || !label.includes('-W')) return label || '';
  const [y, w] = label.split('-W');
  return `KW ${w} · ${y}`;
};

const formatDate = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('de-DE', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch { return ''; }
};

const NewsletterPage = () => {
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.get('/newsletter/digests', { params: { limit: 12 } })
      .then((res) => {
        if (!alive) return;
        setHistory(res?.data?.items || []);
      })
      .catch(() => {
        if (alive) setHistory([]);
      })
      .finally(() => alive && setHistoryLoading(false));
    return () => { alive = false; };
  }, []);

  return (
    <div
      className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fafaf7_100%)]"
      data-testid="newsletter-page"
    >
      <PageMeta
        title="Newsletter · Fröhlich Vermögensberatung"
        description="Wöchentlicher Finanznachrichten-Digest der Fröhlich Vermögensberatung — jeden Freitag redaktionell aufbereitet."
        path="/newsletter"
      />

      {/* Hero */}
      <section className="border-b border-bank-border">
        <div className="mx-auto max-w-[1200px] px-5 pb-14 pt-14 sm:px-8 sm:pb-20 sm:pt-20 lg:px-12">
          <Eyebrow>Wöchentlicher Digest</Eyebrow>
          <h1
            data-testid="newsletter-hero-title"
            className="mt-4 max-w-3xl font-display text-[2rem] font-light leading-[1.05] tracking-tight text-bank-ink sm:text-[2.75rem] lg:text-[3.25rem]"
          >
            Finanznachrichten der Woche —
            <br />
            freitags in Ihrem Postfach.
          </h1>
          <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-bank-text-muted sm:text-[17px]">
            Ausgewählte Meldungen zu Kapitalmärkten, Zinsen, Fonds und Konjunktur —
            redaktionell aufbereitet, produkt-neutral und ohne Renditeversprechen.
            Ein kompakter, hochwertiger Digest, jeden <strong className="text-bank-ink">Freitagvormittag</strong>.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-6 text-[12px] uppercase tracking-[0.2em] text-bank-text-muted">
            <span className="inline-flex items-center gap-2">
              <Calendar size={13} strokeWidth={LUCIDE_STROKE} aria-hidden />
              1× pro Woche
            </span>
            <span className="inline-flex items-center gap-2">
              <Mail size={13} strokeWidth={LUCIDE_STROKE} aria-hidden />
              jederzeit abbestellbar
            </span>
          </div>
        </div>
      </section>

      {/* Signup — bestehende Komponente wiederverwendet */}
      <NewsletterSignup />

      {/* Historie */}
      <section
        className="border-t border-bank-border bg-[linear-gradient(180deg,#ffffff_0%,#fafaf7_100%)] py-16 sm:py-20"
        data-testid="newsletter-history"
      >
        <div className="mx-auto max-w-[1100px] px-5 sm:px-8 lg:px-12">
          <div className="flex items-end justify-between gap-6 border-b border-bank-border pb-5">
            <div>
              <Eyebrow>Bisherige Ausgaben</Eyebrow>
              <h2 className="mt-3 font-display text-[1.7rem] font-light leading-tight tracking-tight text-bank-ink sm:text-[2rem]">
                Was in den letzten Wochen bewegt hat.
              </h2>
            </div>
          </div>

          {historyLoading ? (
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2" data-testid="newsletter-history-loading">
              {[0, 1, 2, 3].map((k) => (
                <div key={k} className="h-60 animate-pulse border border-bank-border bg-white/70" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <p
              data-testid="newsletter-history-empty"
              className="mt-12 text-[14.5px] italic text-bank-text-muted"
            >
              Der erste Digest wird am nächsten Freitag versendet. Melden Sie sich jetzt an,
              um ab dieser Ausgabe dabei zu sein.
            </p>
          ) : (
            <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:gap-10">
              {history.map((d) => (
                <article
                  key={d.week_label}
                  data-testid={`newsletter-history-${d.week_label}`}
                  className="flex flex-col border border-bank-border bg-white p-6 sm:p-7"
                >
                  <div className="flex items-center justify-between border-b border-bank-border pb-3">
                    <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.24em] text-bank-primary/80">
                      {formatWeek(d.week_label)}
                    </p>
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
                      {d.article_count} Meldung{d.article_count === 1 ? '' : 'en'}
                    </p>
                  </div>
                  <h3 className="mt-4 font-display text-[1.15rem] font-light leading-snug tracking-tight text-bank-ink">
                    {d.subject}
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {(d.articles || []).slice(0, 5).map((a) => (
                      <li key={a.slug} className="flex items-start gap-3">
                        <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-bank-primary/60" />
                        <div className="min-w-0 flex-1">
                          {a.category ? (
                            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-bank-text-muted">
                              {humanCategory(a.category)}
                            </p>
                          ) : null}
                          <Link
                            to={`/news/${a.slug}`}
                            data-testid={`newsletter-history-link-${a.slug}`}
                            className="mt-0.5 block text-[14px] leading-snug text-bank-ink transition-colors hover:text-bank-primary"
                          >
                            {a.title || a.slug}
                            <ArrowUpRight size={11} strokeWidth={LUCIDE_STROKE} className="ml-1 inline-block align-baseline text-bank-primary/70" aria-hidden />
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-5 pt-4 border-t border-bank-border font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
                    Versendet {formatDate(d.finished_at || d.started_at)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default NewsletterPage;
