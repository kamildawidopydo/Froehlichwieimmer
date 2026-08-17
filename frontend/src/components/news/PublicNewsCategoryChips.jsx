import React from 'react';
import { NEWS_CATEGORIES } from '@/lib/news/euronewsFeeds';
import { cn } from '@/lib/utils';

const ALL = { slug: 'all', label: 'Alle' };

const PublicNewsCategoryChips = ({ value, onChange }) => {
  const items = [ALL, ...NEWS_CATEGORIES];
  return (
    <div role="tablist" aria-label="Kategorie-Filter" className="flex flex-wrap gap-2">
      {items.map((cat) => {
        const active = (value ?? 'all') === cat.slug;
        return (
          <button
            key={cat.slug}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(cat.slug)}
            className={cn(
              'rounded-full border px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35',
              active
                ? 'border-bank-ink bg-bank-ink text-white dark:border-white dark:bg-white dark:text-bank-ink'
                : 'border-bank-border/80 bg-bank-surface text-bank-text-muted hover:border-bank-gold/40 hover:text-bank-text dark:bg-bank-ink/30',
            )}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
};

export default PublicNewsCategoryChips;
