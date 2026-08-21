import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import Eyebrow from '@/components/editorial/Eyebrow';
import { formatClock, formatRelative } from '@/services/newsMarkteApi';

const FILTERS = [
  { slug: 'alle', label: 'Alle' },
  { slug: 'maerkte', label: 'Märkte' },
  { slug: 'aktien', label: 'Aktien' },
  { slug: 'wirtschaft', label: 'Wirtschaft' },
  { slug: 'unternehmen', label: 'Unternehmen' },
  { slug: 'zinsen', label: 'Zinsen' },
  { slug: 'international', label: 'International' },
];

const NewsUeberblick = ({ articles = [], loading, activeCategory, onCategoryChange }) => {
  const [internalCategory, setInternalCategory] = useState('alle');
  const category = activeCategory ?? internalCategory;
  const setCategory = onCategoryChange ?? setInternalCategory;

  const rows = useMemo(() => articles.slice(0, 12), [articles]);

  return (
    <section
      className="border-t border-bank-border pt-14 sm:pt-16"
      data-testid="news-ueberblick"
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <Eyebrow>Ticker</Eyebrow>
          <h2 className="font-serif text-3xl leading-tight text-bank-text sm:text-4xl">News im Überblick</h2>
        </div>
        <Link
          to="/news/archiv"
          className="group inline-flex items-center gap-2 text-[12.5px] font-medium uppercase tracking-[0.2em] text-bank-accent-strong"
          data-testid="news-all-link"
        >
          Alle aktuellen News anzeigen
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.5} />
        </Link>
      </div>

      <div
        className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-b border-bank-border pb-3 text-[12px] uppercase tracking-[0.22em]"
        role="tablist"
      >
        {FILTERS.map((f) => {
          const active = category === f.slug;
          return (
            <button
              key={f.slug}
              type="button"
              onClick={() => setCategory(f.slug)}
              role="tab"
              aria-selected={active}
              data-testid={`news-filter-${f.slug}`}
              className={`relative -mb-[13px] pb-3 transition-colors ${
                active ? 'text-bank-text' : 'text-bank-text-muted hover:text-bank-text'
              }`}
            >
              {f.label}
              {active && <span aria-hidden className="absolute inset-x-0 -bottom-[1px] h-[2px] bg-bank-accent-strong" />}
            </button>
          );
        })}
      </div>

      {loading ? (
        <ul className="mt-6 divide-y divide-bank-border">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="flex animate-pulse items-center gap-6 py-4">
              <div className="h-4 w-14 bg-neutral-100" />
              <div className="h-4 flex-1 bg-neutral-100" />
              <div className="hidden h-4 w-24 bg-neutral-100 sm:block" />
            </li>
          ))}
        </ul>
      ) : rows.length === 0 ? (
        <p className="mt-8 text-sm text-bank-text-muted">
          Keine Meldungen in dieser Kategorie. Bitte wählen Sie eine andere Rubrik.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-bank-border" data-testid="news-ticker-list">
          {rows.map((a) => (
            <li key={a.id}>
              <a
                href={a.source_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4 sm:gap-6"
              >
                <time className="font-mono text-[13px] tabular-nums text-bank-accent-strong" dateTime={a.published_at}>
                  {formatClock(a.published_at) || formatRelative(a.published_at)}
                </time>
                <div className="min-w-0">
                  <p className="truncate text-[14.5px] leading-snug text-bank-text transition-colors group-hover:text-bank-accent-strong sm:text-[15px]">
                    {a.title}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-[11.5px] uppercase tracking-[0.18em] text-bank-text-muted">
                    <span>{a.source}</span>
                  </p>
                </div>
                <ArrowUpRight
                  className="h-4 w-4 shrink-0 text-bank-text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-bank-accent-strong"
                  strokeWidth={1.4}
                />
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default NewsUeberblick;
