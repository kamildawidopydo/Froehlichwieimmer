import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Sticky table of contents for long-form articles.
 * Tracks which section is currently in the viewport via IntersectionObserver
 * and highlights the active link with a brass dot prefix.
 *
 * items: Array<{ id: string, label: string }>
 */
const TocSticky = ({ items, className }) => {
  const [activeId, setActiveId] = useState(items?.[0]?.id || null);

  useEffect(() => {
    if (!items?.length || typeof window === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: 0 }
    );

    items.forEach((it) => {
      const el = document.getElementById(it.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  if (!items?.length) return null;

  return (
    <nav
      aria-label="Inhaltsverzeichnis"
      className={cn('sticky top-28 hidden max-h-[calc(100vh-8rem)] overflow-y-auto pr-2 lg:block', className)}
    >
      <p className="mb-5 inline-flex items-center gap-2.5 text-[10px] font-medium uppercase tracking-[0.28em] text-bank-text-muted">
        <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-gold" />
        Inhalt
      </p>
      <ul className="space-y-2.5 border-l border-bank-border">
        {items.map((it, i) => {
          const active = it.id === activeId;
          return (
            <li key={it.id}>
              <a
                href={`#${it.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(it.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={cn(
                  'group relative -ml-px flex items-baseline gap-3 border-l-2 py-1.5 pl-4 text-[13px] transition-all duration-300',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35 focus-visible:ring-offset-2 focus-visible:ring-offset-bank-bg',
                  active
                    ? 'border-bank-gold text-bank-text'
                    : 'border-transparent text-bank-text-muted hover:border-bank-gold/35 hover:text-bank-text'
                )}
              >
                <span
                  className={cn(
                    'font-mono text-[10.5px] tracking-[0.18em]',
                    active ? 'text-bank-gold' : 'text-bank-text-muted/70'
                  )}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className={cn('leading-snug', active && 'font-medium')}>{it.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default TocSticky;
