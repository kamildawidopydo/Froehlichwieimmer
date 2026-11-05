import React from 'react';
import { Clock, Flame, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'recent', label: 'Aktuell', icon: Clock },
  { id: 'popular', label: 'Beliebt', icon: Flame },
  { id: 'videos', label: 'Videos', icon: Play },
];

const PublicNewsTabs = ({ value, onChange }) => (
  <div
    role="tablist"
    aria-label="Nachrichten-Sortierung"
    className="inline-flex gap-1 rounded-lg border border-bank-border/70 bg-bank-surface/60 p-1 shadow-sm dark:bg-bank-ink/30"
  >
    {TABS.map((tab) => {
      const Icon = tab.icon;
      const active = value === tab.id;
      return (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => onChange?.(tab.id)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[11px] font-medium uppercase tracking-[0.14em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35',
            active
              ? 'bg-bank-ink text-white shadow-sm dark:bg-white dark:text-bank-ink'
              : 'text-bank-text-muted hover:text-bank-text',
          )}
        >
          <Icon size={12} strokeWidth={1.5} />
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      );
    })}
  </div>
);

export default PublicNewsTabs;
