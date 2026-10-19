import React from 'react';
import { Clock, Flame, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'recent', label: 'Aktuell', icon: Clock },
  { id: 'popular', label: 'Beliebt', icon: Flame },
  { id: 'videos', label: 'Videos', icon: Play },
];

const NewsTabs = ({ value, onChange }) => (
  <div
    role="tablist"
    aria-label="Nachrichten-Sortierung"
    className="inline-flex border border-bank-border bg-white"
  >
    {TABS.map((tab, idx) => {
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
            'inline-flex items-center gap-1.5 px-3.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35',
            idx > 0 && 'border-l border-bank-border',
            active
              ? 'bg-bank-ink text-white'
              : 'text-bank-text-muted hover:bg-bank-bg/45 hover:text-bank-text',
          )}
        >
          <Icon size={12} strokeWidth={1.5} />
          {tab.label}
        </button>
      );
    })}
  </div>
);

export default NewsTabs;
