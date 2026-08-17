import React from 'react';
import { ChevronRight } from 'lucide-react';
import {
  NEWS_EURONEWS_CATEGORIES,
  NEWS_MARKET_CATEGORIES,
} from '@/lib/news/euronewsFeeds';
import { cn } from '@/lib/utils';

const ALL = { slug: 'all', label: 'Alle' };

/**
 * Two-row category navigation: Euronews rubrics on top, market rubrics below.
 * Videos live in PublicNewsTabs (top-right) — not duplicated here.
 */
const PublicNewsCategoryNav = ({
  category = 'all',
  view = 'articles',
  onCategoryChange,
}) => {
  const isVideos = view === 'videos';

  return (
    <nav aria-label="Rubriken" className="min-w-0 border-b border-bank-border/70">
      <div className="-mb-px flex flex-wrap items-center gap-x-0.5 gap-y-0 px-0.5">
        <NavItem
          active={!isVideos && category === ALL.slug}
          onClick={() => onCategoryChange?.(ALL.slug)}
          label={ALL.label}
        />
        {NEWS_EURONEWS_CATEGORIES.map((cat) => (
          <NavItem
            key={cat.slug}
            active={!isVideos && category === cat.slug}
            onClick={() => onCategoryChange?.(cat.slug)}
            label={cat.label}
          />
        ))}
      </div>

      <div className="-mb-px flex flex-wrap items-center gap-x-0.5 gap-y-0 border-t border-bank-border/50 bg-bank-bg/15 px-0.5 dark:bg-bank-ink/10">
        <span className="shrink-0 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-bank-text-muted/75">
          Markt
        </span>
        {NEWS_MARKET_CATEGORIES.map((cat) => (
          <NavItem
            key={cat.slug}
            active={!isVideos && category === cat.slug}
            onClick={() => onCategoryChange?.(cat.slug)}
            label={cat.label}
            compact
          />
        ))}
      </div>
    </nav>
  );
};

const NavItem = ({ active, onClick, label, compact = false }) => (
  <button
    type="button"
    role="tab"
    aria-selected={active}
    onClick={onClick}
    className={cn(
      'relative shrink-0 whitespace-nowrap font-medium uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35',
      compact ? 'px-3 py-2.5 text-[11px]' : 'px-3 py-2.5 text-[11px] sm:px-3.5 sm:py-3 sm:text-[12px]',
      active
        ? 'text-bank-text'
        : 'text-bank-text-muted hover:text-bank-text',
    )}
  >
    {label}
    {active && (
      <span
        aria-hidden
        className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-bank-gold"
      />
    )}
  </button>
);

export default PublicNewsCategoryNav;

export const NewsCategorySectionHeader = ({ title, onShowAll }) => (
  <div className="mb-4 flex items-end justify-between gap-4 border-b border-bank-border/50 pb-3">
    <h2 className="font-display text-[1.35rem] font-light text-bank-text">
      {title}
    </h2>
    {onShowAll && (
      <button
        type="button"
        onClick={onShowAll}
        className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium uppercase tracking-[0.14em] text-bank-text-muted transition-colors hover:text-bank-gold"
      >
        Alle anzeigen
        <ChevronRight size={13} strokeWidth={1.5} />
      </button>
    )}
  </div>
);
