import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowUpRight } from 'lucide-react';
import Eyebrow from '@/components/editorial/Eyebrow';
import { trackInvestmentEvent, InvestmentEvents } from '@/lib/investmentAnalytics';

const BASE = process.env.REACT_APP_BACKEND_URL;
const api = axios.create({ baseURL: `${BASE}/api`, withCredentials: false });

const fmtDate = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return ''; }
};

const CAT_LABEL = {
  wirtschaft: 'Wirtschaft', politik: 'Politik', europa: 'Europa', welt: 'Welt',
  maerkte: 'Märkte', zinsen: 'Zinsen', unternehmen: 'Unternehmen',
  waehrungen: 'Währungen', rohstoffe: 'Rohstoffe', technologie: 'Technologie',
  energie: 'Energie', klima: 'Klima', gesundheit: 'Gesundheit',
};

const NewsCard = ({ article, index, topicSlug }) => {
  const [imgErr, setImgErr] = useState(false);
  const showImage = !!article.image_url && !imgErr;
  const handleClick = () => {
    trackInvestmentEvent(InvestmentEvents.RELATED_NEWS_CLICK, {
      topic_slug: topicSlug,
      article_slug: article.slug,
      position: index,
      source_page: `/themen/${topicSlug}`,
    });
  };
  return (
    <Link
      to={`/news/nachrichten/${encodeURIComponent(article.slug)}`}
      onClick={handleClick}
      data-testid={`related-news-item-${article.slug}`}
      className="group flex h-full flex-col border border-bank-border bg-white transition-colors hover:border-bank-primary"
    >
      {showImage && (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-100">
          <img src={article.image_url} alt="" loading="lazy"
               onError={() => setImgErr(true)}
               className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-gold">
          {CAT_LABEL[article.category] || article.category || 'Nachrichten'}
          {article.published_at && <span className="ml-2 text-bank-text-muted">· {fmtDate(article.published_at)}</span>}
        </p>
        <h3 className="font-serif text-[18px] leading-snug text-bank-text transition-colors group-hover:text-bank-primary">
          {article.title}
        </h3>
        {article.summary && (
          <p className="line-clamp-3 text-[13.5px] leading-relaxed text-bank-text-muted">{article.summary}</p>
        )}
        <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-[11.5px] font-medium uppercase tracking-[0.16em] text-bank-primary">
          Artikel lesen <ArrowUpRight size={13} strokeWidth={1.7} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
};

/**
 * Wissen-Block für Investment-Themenseiten.
 * Lädt kuratierte News-Artikel via /api/news/by-slugs — Reihenfolge bleibt.
 * Blendet sich vollständig aus, wenn keine Artikel gefunden werden.
 * view-Event nur einmal pro Page View (Guard via useRef in Parent).
 */
const TopicWissenBlock = ({ topicSlug, relatedSlugs = [], maxDisplay = 3 }) => {
  const [items, setItems] = useState([]);
  const [state, setState] = useState('loading');
  const [viewTracked, setViewTracked] = useState(false);

  useEffect(() => {
    if (!relatedSlugs || relatedSlugs.length === 0) { setState('empty'); return; }
    const slugs = relatedSlugs.slice(0, maxDisplay);
    let alive = true;
    setState('loading');
    api.get('/news/by-slugs', { params: { slugs: slugs.join(',') } })
      .then(({ data }) => {
        if (!alive) return;
        setItems(data?.items || []);
        setState('ready');
      })
      .catch(() => { if (alive) { setItems([]); setState('empty'); } });
    return () => { alive = false; };
  }, [relatedSlugs?.join('|'), maxDisplay]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state === 'ready' && items.length > 0 && !viewTracked) {
      trackInvestmentEvent(InvestmentEvents.RELATED_NEWS_VIEW, {
        topic_slug: topicSlug,
        source_page: `/themen/${topicSlug}`,
      });
      setViewTracked(true);
    }
  }, [state, items.length, viewTracked, topicSlug]);

  if (state === 'empty' || (state === 'ready' && items.length === 0)) return null;

  return (
    <section className="border-b border-bank-border bg-white" data-testid="topic-wissen-block">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
        <Eyebrow>Wissen &amp; Einordnung</Eyebrow>
        <h2 className="mt-3 max-w-3xl font-serif text-[28px] leading-tight text-bank-text sm:text-[34px]">
          Passend zum Thema
        </h2>
        <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-bank-text-muted">
          Lesen Sie ausgewählte Beiträge aus unserer Redaktion und vertiefen Sie das Thema mit
          aktuellen Einordnungen und Hintergrundwissen.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {state === 'loading'
            ? Array.from({ length: Math.min(maxDisplay, relatedSlugs.length) }).map((_, i) => (
                <div key={i} className="flex flex-col border border-bank-border bg-white">
                  <div className="aspect-[16/9] w-full animate-pulse bg-neutral-100" />
                  <div className="space-y-2 p-5">
                    <div className="h-3 w-24 animate-pulse bg-neutral-100" />
                    <div className="h-4 w-full animate-pulse bg-neutral-200" />
                    <div className="h-4 w-4/5 animate-pulse bg-neutral-100" />
                  </div>
                </div>
              ))
            : items.map((a, idx) => <NewsCard key={a.slug} article={a} index={idx} topicSlug={topicSlug} />)}
        </div>
      </div>
    </section>
  );
};

export default TopicWissenBlock;
