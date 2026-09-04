import { getApiBase } from '@/lib/apiBase';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import SafeNewsImage from '@/components/news/SafeNewsImage';

const BASE = getApiBase();
const api = axios.create({ baseURL: `${BASE}/api`, withCredentials: false });

const CAT_LABEL = {
  politik: 'Politik', wirtschaft: 'Wirtschaft', europa: 'Europa', welt: 'Welt',
  wissen: 'Wissen', umwelt: 'Umwelt', kultur: 'Kultur', sport: 'Sport', videos: 'Videos',
  zinsen: 'Zinsen', waehrungen: 'Währungen', rohstoffe: 'Rohstoffe', energie: 'Energie',
  klima: 'Klima', gesundheit: 'Gesundheit', mobilitaet: 'Mobilität', industrie: 'Industrie',
  technologie: 'Technologie', sicherheit: 'Sicherheit', unternehmen: 'Unternehmen',
  maerkte: 'Märkte',
};

const fmtDate = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return ''; }
};

const RelatedCard = ({ article }) => {
  const [imgHidden, setImgHidden] = useState(false);
  const showImage = !!article.image_url && !imgHidden;
  return (
    <Link
      to={`/news/nachrichten/${encodeURIComponent(article.slug)}`}
      data-testid={`related-news-card-${article.slug}`}
      className="group flex flex-col border border-bank-border bg-white transition-colors hover:border-bank-primary"
    >
      {showImage && (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-100">
          <SafeNewsImage
            src={article.image_url}
            category={article.category}
            alt={article.title || ''}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
            onFinalError={() => setImgHidden(true)}
          />
        </div>
      )}
      <div className="flex flex-col gap-2 px-4 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-accent-strong">
          {CAT_LABEL[article.category] || article.category}
        </p>
        <h3 className="font-serif text-[17px] leading-snug text-bank-text transition-colors group-hover:text-bank-primary">
          {article.title}
        </h3>
        {article.summary && (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-bank-text-muted">
            {article.summary}
          </p>
        )}
        <p className="mt-1 text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
          {fmtDate(article.published_at)}
        </p>
      </div>
    </Link>
  );
};

const CardSkeleton = () => (
  <div className="flex flex-col border border-bank-border bg-white">
    <div className="aspect-[16/9] w-full animate-pulse bg-neutral-100" />
    <div className="space-y-2.5 p-4">
      <div className="h-3 w-16 animate-pulse bg-neutral-100" />
      <div className="h-4 w-full animate-pulse bg-neutral-200" />
      <div className="h-4 w-4/5 animate-pulse bg-neutral-200" />
    </div>
  </div>
);

/**
 * Related-News-Block unter der News-Detailseite.
 * Nutzt `/api/news/nachrichten/{slug}/related?limit=3` — reines Backend-Ranking,
 * kein LLM-Call, keine externen Links.
 */
const NachrichtenRelated = ({ slug }) => {
  const [items, setItems] = useState([]);
  const [state, setState] = useState('loading');

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    setState('loading');
    api
      .get(`/news/nachrichten/${encodeURIComponent(slug)}/related`, { params: { limit: 3 } })
      .then(({ data }) => {
        if (!alive) return;
        setItems(Array.isArray(data?.items) ? data.items : []);
        setState('ready');
      })
      .catch(() => { if (alive) { setItems([]); setState('error'); } });
    return () => { alive = false; };
  }, [slug]);

  if (state !== 'loading' && items.length === 0) return null;

  return (
    <section
      className="mt-14 border-t border-bank-border pt-8"
      data-testid="news-detail-related"
      aria-labelledby="related-news-heading"
    >
      <h2
        id="related-news-heading"
        className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-accent-strong"
      >
        Mehr zu diesem Thema
      </h2>
      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {state === 'loading'
          ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
          : items.map((a) => <RelatedCard key={a.id || a.slug} article={a} />)}
      </div>
    </section>
  );
};

export default NachrichtenRelated;
