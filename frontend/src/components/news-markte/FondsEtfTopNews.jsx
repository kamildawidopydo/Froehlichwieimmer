import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import Eyebrow from '@/components/editorial/Eyebrow';
import { formatRelative } from '@/services/newsMarkteApi';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1600&q=70';
const onImgError = (e) => { e.currentTarget.src = FALLBACK_IMG; };

const Card = ({ article, primary }) => (
  <a
    href={article.source_url || '#'}
    target="_blank"
    rel="noopener noreferrer"
    className={`group flex flex-col border border-bank-border bg-white transition-shadow duration-300 hover:shadow-[0_20px_60px_-30px_rgba(0,0,0,0.25)] ${primary ? 'lg:col-span-2' : ''}`}
    data-testid="fonds-etf-card"
  >
    <div className={`relative w-full overflow-hidden bg-neutral-100 ${primary ? 'aspect-[16/9]' : 'aspect-[16/10]'}`}>
      {article.image_url ? (
        <img src={article.image_url} alt={article.title} loading="lazy" onError={onImgError}
             className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-200 via-neutral-100 to-white" />
      )}
    </div>
    <div className={`flex flex-1 flex-col gap-3 px-5 py-6 ${primary ? 'sm:px-7 sm:py-7' : ''}`}>
      <p className="text-[10.5px] font-medium uppercase tracking-[0.24em] text-bank-accent-strong">
        Fonds &amp; ETFs
      </p>
      <h3 className={`font-serif leading-snug text-bank-text transition-colors group-hover:text-bank-accent-strong ${primary ? 'text-xl sm:text-2xl' : 'text-lg'}`}>
        {article.title}
      </h3>
      <p className="text-[13.5px] leading-relaxed text-bank-text-muted line-clamp-3">{article.excerpt}</p>
      <div className="mt-auto flex items-center justify-between border-t border-bank-border pt-3 text-[11.5px] text-bank-text-muted">
        <span className="uppercase tracking-[0.14em]">{article.source}</span>
        <span className="font-mono">{formatRelative(article.published_at)}</span>
      </div>
    </div>
  </a>
);

const FondsEtfTopNews = ({ articles = [], loading }) => {
  const items = articles.slice(0, 3);
  return (
    <section className="border-t border-bank-border pt-14 sm:pt-16" data-testid="fonds-etf-top-news">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <Eyebrow>Fonds &amp; ETFs</Eyebrow>
          <h2 className="font-serif text-3xl leading-tight text-bank-text sm:text-4xl">Fonds &amp; ETF Top-News</h2>
          <p className="max-w-2xl text-[14px] leading-relaxed text-bank-text-muted">
            Aktuelle Meldungen zu ETFs, Investmentfonds, Geldmarkt, Dividenden- und Themenfonds — kompakt aufbereitet.
          </p>
        </div>
        <Link to="/news/fonds-etfs"
              className="group inline-flex items-center gap-2 text-[12.5px] font-medium uppercase tracking-[0.2em] text-bank-accent-strong"
              data-testid="fonds-etf-all-link">
          Alle Fonds &amp; ETF News
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.5} />
        </Link>
      </div>

      {loading ? (
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-[380px] animate-pulse bg-neutral-100 ${i === 0 ? 'lg:col-span-2' : ''}`} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-8 text-sm text-bank-text-muted">Aktuell keine Meldungen — bitte später erneut prüfen.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {items.map((a, i) => <Card key={a.id} article={a} primary={i === 0} />)}
        </div>
      )}
    </section>
  );
};

export default FondsEtfTopNews;
