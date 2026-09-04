import { getApiBase } from '@/lib/apiBase';
import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, PlayCircle } from 'lucide-react';
import axios from 'axios';
import PageMeta from '@/components/PageMeta';
import Eyebrow from '@/components/editorial/Eyebrow';

const BASE = getApiBase();
const api = axios.create({ baseURL: `${BASE}/api`, withCredentials: false });

const CAT_LABEL = {
  politik: 'Politik', wirtschaft: 'Wirtschaft', europa: 'Europa', welt: 'Welt',
  wissen: 'Wissen', umwelt: 'Umwelt', kultur: 'Kultur', sport: 'Sport', videos: 'Videos',
};

const EuronewsArticlePage = () => {
  const { slug } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.get(`/news/nachrichten/${encodeURIComponent(slug)}`)
      .then(({ data }) => { if (alive) setItem(data); })
      .catch((err) => { if (alive) setNotFound(err?.response?.status === 404); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [slug]);

  const publishedFmt = item?.published_at ? new Date(item.published_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className="bg-white" data-testid="euronews-article-page">
      <PageMeta title={item?.title || 'Nachricht'} description={item?.summary || ''} path={`/news/euronews/${slug}`} noIndex />

      <section className="border-b border-bank-border">
        <div className="mx-auto max-w-4xl px-6 pb-10 pt-14 sm:px-10 sm:pt-16">
          <Link to="/news/nachrichten" className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-bank-text-muted hover:text-bank-primary">
            <ArrowLeft size={12} strokeWidth={1.7} /> Zurück zu Nachrichten
          </Link>
          {loading && <div className="mt-8 h-6 w-2/3 animate-pulse bg-neutral-100" />}
          {notFound && <p className="mt-8 text-[14px] text-bank-text-muted" data-testid="article-not-found">Meldung nicht gefunden.</p>}
          {item && (
            <>
              <div className="mt-6 flex items-center gap-2">
                <Eyebrow>{CAT_LABEL[item.category] || item.category}</Eyebrow>
                {item.is_demo && (
                  <span className="inline-flex items-center gap-1 border border-amber-300 bg-amber-50 px-1.5 py-px font-mono text-[9.5px] uppercase tracking-[0.16em] text-amber-900" data-testid="article-demo-badge">
                    Demo / Testdaten
                  </span>
                )}
              </div>
              <h1 className="mt-3 font-serif text-3xl leading-tight text-bank-text sm:text-4xl">{item.title}</h1>
              <p className="mt-4 text-[15px] leading-relaxed text-bank-text-muted">{item.summary}</p>
              <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-bank-text-muted">
                {publishedFmt} · Quelle: {item.source === 'euronews-demo' ? 'Euronews (Demo)' : 'Euronews'}
              </p>
            </>
          )}
        </div>
      </section>

      {item && (
        <article className="mx-auto max-w-4xl px-6 pb-20 pt-10 sm:px-10">
          {item.image_url && (
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-100">
              <img src={item.image_url} alt="" className="h-full w-full object-cover" />
              {item.content_type === 'video' && !item.video_embed_url && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-center text-white">
                  <div>
                    <PlayCircle className="mx-auto h-16 w-16" strokeWidth={1.2} />
                    <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.22em]">Video-Embed nach Lizenzfreigabe</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {item.video_embed_url && (
            <div className="mt-6 aspect-video w-full overflow-hidden border border-bank-border bg-black" data-testid="article-video-embed">
              <iframe title={item.title} src={item.video_embed_url} allow="fullscreen; picture-in-picture" allowFullScreen className="h-full w-full" />
            </div>
          )}

          <div className="prose prose-neutral mt-8 max-w-none text-[15px] leading-relaxed text-bank-text">
            <p>{item.article_content}</p>
          </div>

          {item.source_url && (
            <a href={item.source_url} target="_blank" rel="noopener noreferrer nofollow"
               className="mt-8 inline-flex items-center gap-1.5 border border-bank-border px-4 py-2 text-[12px] font-medium uppercase tracking-[0.18em] text-bank-text transition-colors hover:border-bank-primary/60">
              Originalbeitrag bei Euronews öffnen <ArrowUpRight size={12} strokeWidth={1.8} />
            </a>
          )}

          <div className="mt-14 border-t border-bank-border pt-8 text-[13px] leading-relaxed text-bank-text-muted">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-accent-strong">Hinweis</p>
            <p className="mt-2">
              Diese Meldung stammt von einem externen Nachrichtenanbieter (Euronews). Sie ist keine
              redaktionelle Einschätzung der Fröhlich Vermögensberatung GmbH und stellt keine
              Anlageempfehlung dar. Unsere Einordnung finden Sie in der Rubrik
              „Fröhlich Vermögensberatung — Unsere Einordnung" auf der /news-Übersicht.
            </p>
          </div>
        </article>
      )}
    </div>
  );
};

export default EuronewsArticlePage;
