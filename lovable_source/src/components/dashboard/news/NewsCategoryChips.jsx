import React from 'react';
import { NEWS_CATEGORIES } from '@/lib/news/euronewsFeeds';
import { cn } from '@/lib/utils';

const ALL = { slug: 'all', label: 'Alle' };

const NewsCategoryChips = ({ value, onChange }) => {
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
              'border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35',
              active
                ? 'border-bank-ink bg-bank-ink text-white'
                : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-gold/55 hover:text-bank-text',
            )}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
};

export default NewsCategoryChips;
