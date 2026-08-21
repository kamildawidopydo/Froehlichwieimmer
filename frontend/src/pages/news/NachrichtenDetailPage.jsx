import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, PlayCircle } from 'lucide-react';
import axios from 'axios';
import PageMeta from '@/components/PageMeta';
import Eyebrow from '@/components/editorial/Eyebrow';

const BASE = process.env.REACT_APP_BACKEND_URL;
const api = axios.create({ baseURL: `${BASE}/api`, withCredentials: false });

const CAT_LABEL = {
  politik: 'Politik', wirtschaft: 'Wirtschaft', europa: 'Europa', welt: 'Welt',
  wissen: 'Wissen', umwelt: 'Umwelt', kultur: 'Kultur', sport: 'Sport', videos: 'Videos',
};

const renderBody = (body) => {
  if (!body) return null;
  return body.split(/\n{2,}/).map((block, idx) => {
    const t = block.trim();
    if (t.startsWith('## ')) return <h2 key={idx} className="mt-10 font-serif text-2xl leading-tight text-bank-text">{t.replace(/^##\s+/, '')}</h2>;
    if (t.startsWith('### ')) return <h3 key={idx} className="mt-8 font-serif text-xl text-bank-text">{t.replace(/^###\s+/, '')}</h3>;
    return <p key={idx} className="mt-4 text-[15.5px] leading-relaxed text-bank-text">{t}</p>;
  });
};

/**
 * Interne Detailseite für jede Nachricht.
 *
 * Rendert entweder den lizenzierten Volltext (license_allows_fulltext=true)
 * oder eine eigene redaktionelle Zusammenfassung (article_content) — niemals
 * einen nicht lizenzierten Fremdtext. Die externe Quelle erscheint nur dezent
 * am Ende, nie als primäres Klickziel.
 */
const NachrichtenDetailPage = () => {
  const { slug } = useParams();
  const [item, setItem] = useState(null);
  const [state, setState] = useState('loading');

  useEffect(() => {
    let alive = true;
    setState('loading');
    api.get(`/news/nachrichten/${encodeURIComponent(slug)}`)
      .then(({ data }) => { if (alive) { setItem(data); setState('ready'); } })
      .catch((err) => { if (alive) setState(err?.response?.status === 404 ? 'notfound' : 'error'); });
    return () => { alive = false; };
  }, [slug]);

  const publishedFmt = item?.published_at
    ? new Date(item.published_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  const hasLicensedFulltext = !!item?.license_allows_fulltext && !!item?.full_text;
  const heroImage = item?.hero_image_url || item?.image_url;

  return (
    <div className="bg-white" data-testid="news-detail-page">
      <PageMeta
        title={item?.title || 'Nachricht'}
        description={item?.summary || item?.subtitle || ''}
        path={`/news/nachrichten/${slug}`}
        noIndex={!!item?.is_demo}
      />

      <section className="border-b border-bank-border">
        <div className="mx-auto max-w-4xl px-6 pb-10 pt-14 sm:px-10 sm:pt-16">
          <Link
            to="/news/nachrichten"
            data-testid="news-detail-back"
            className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-bank-text-muted hover:text-bank-primary"
          >
            <ArrowLeft size={12} strokeWidth={1.7} /> Zurück zu Nachrichten
          </Link>

          {state === 'loading' && <div className="mt-8 h-8 w-2/3 animate-pulse bg-neutral-100" />}
          {state === 'notfound' && (
            <p className="mt-8 text-[14px] text-bank-text-muted" data-testid="news-detail-not-found">Meldung nicht gefunden.</p>
          )}
          {state === 'error' && (
            <p className="mt-8 text-[14px] text-rose-700">Meldung konnte nicht geladen werden.</p>
          )}

          {item && (
            <>
              <div className="mt-6 flex items-center gap-2">
                <Eyebrow>{CAT_LABEL[item.category] || item.category}</Eyebrow>
                {item.is_demo && (
                  <span className="inline-flex items-center gap-1 border border-amber-300 bg-amber-50 px-1.5 py-px font-mono text-[9.5px] uppercase tracking-[0.16em] text-amber-900" data-testid="news-detail-demo-badge">
                    Demo / Testdaten
                  </span>
                )}
              </div>
              <h1 className="mt-3 font-serif text-3xl leading-tight text-bank-text sm:text-[42px]">{item.title}</h1>
              {item.subtitle && (
                <p className="mt-4 font-serif text-[19px] italic leading-snug text-bank-text-muted">{item.subtitle}</p>
              )}
              <p className="mt-5 text-[15.5px] leading-relaxed text-bank-text-muted">{item.summary}</p>
              <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-bank-text-muted">
                {publishedFmt}
                {item.source_name && (<> · Quelle: <span className="text-bank-text">{item.source_name}</span></>)}
              </p>
            </>
          )}
        </div>
      </section>

      {item && (
        <article className="mx-auto max-w-4xl px-6 pb-20 pt-10 sm:px-10">
          {heroImage && (
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-100">
              <img src={heroImage} alt="" className="h-full w-full object-cover" />
              {item.content_type === 'video' && !item.video_embed_url && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/25 text-center text-white">
                  <div>
                    <PlayCircle className="mx-auto h-16 w-16" strokeWidth={1.2} />
                    <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.22em]">Video-Embed nach Lizenzfreigabe</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {item.video_embed_url && (
            <div className="mt-6 aspect-video w-full overflow-hidden border border-bank-border bg-black" data-testid="news-detail-video">
              <iframe title={item.title} src={item.video_embed_url} allow="fullscreen; picture-in-picture" allowFullScreen className="h-full w-full" />
            </div>
          )}

          {/* Bevorzugt: lizenzierter Volltext. Fallback: eigene redaktionelle Zusammenfassung. */}
          {hasLicensedFulltext ? (
            <div className="mt-6" data-testid="news-detail-fulltext">
              {renderBody(item.full_text)}
            </div>
          ) : (
            <div className="mt-6" data-testid="news-detail-summary">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-accent-strong">Eigene Zusammenfassung</p>
              <p className="mt-3 text-[15.5px] leading-relaxed text-bank-text">
                {item.article_content ||
                  'Der Volltext dieser Meldung ist nicht Teil unserer Lizenz. Wir zeigen daher keinen fremden Text an. Sobald eine redaktionelle Einordnung veröffentlicht wird, erscheint sie an dieser Stelle.'}
              </p>
              <p className="mt-3 text-[12.5px] leading-relaxed text-bank-text-muted">
                Titel, Untertitel und Kurzfassung stammen vom externen Anbieter. Der vollständige Originaltext liegt ausschließlich beim jeweiligen Nachrichtenanbieter.
              </p>
            </div>
          )}

          {/* Externe Quelle nur dezent am Ende — niemals primäres Klickziel */}
          {(item.source_name || item.source_url) && (
            <div className="mt-12 border-t border-bank-border pt-6" data-testid="news-detail-source">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Externe Quelle</p>
              <p className="mt-2 text-[13.5px] text-bank-text">
                Diese Meldung stammt von <span className="font-medium">{item.source_name || 'einem externen Anbieter'}</span>.
              </p>
              {item.source_url && (
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  data-testid="news-detail-external-link"
                  className="mt-3 inline-flex items-center gap-1.5 border border-bank-border px-3.5 py-1.5 text-[11.5px] font-medium uppercase tracking-[0.18em] text-bank-text-muted transition-colors hover:border-bank-primary/60 hover:text-bank-primary"
                >
                  Originalquelle ansehen <ArrowUpRight size={11} strokeWidth={1.8} />
                </a>
              )}
            </div>
          )}

          <div className="mt-10 border-t border-bank-border pt-6 text-[13px] leading-relaxed text-bank-text-muted">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-accent-strong">Hinweis</p>
            <p className="mt-2">
              Diese Meldung wird zu Ihrer Information dargestellt und ist keine redaktionelle Einschätzung
              der Fröhlich Vermögensberatung GmbH. Sie stellt keine Anlageempfehlung dar. Unsere eigene
              Einordnung finden Sie in der Rubrik „Fröhlich Vermögensberatung — Unsere Einordnung".
            </p>
          </div>
        </article>
      )}
    </div>
  );
};

export default NachrichtenDetailPage;
