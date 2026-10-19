import React, { useEffect, useState } from 'react';

/**
 * In-Page-Navigation für Premium-Strategieseiten.
 * Desktop: dezente Sticky-Column (via Wrapper).
 * Mobile: horizontal scrollbare Chips.
 * Smooth-Scroll auf gerenderte Section-IDs.
 */
const StrategySectionNav = ({ items = [] }) => {
  const [activeId, setActiveId] = useState(items[0]?.id || null);

  useEffect(() => {
    if (!items.length || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        // Wähle den ersten sichtbaren Eintrag (kleinstes intersectionRatio > 0).
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target?.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.25, 0.5, 1] },
    );
    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  const handleClick = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // History-Hash sanft aktualisieren, ohne Reload zu triggern.
    try {
      window.history.replaceState(null, '', `#${id}`);
    } catch {
      /* history API not available — non-fatal */
    }
    setActiveId(id);
  };

  if (!items.length) return null;

  return (
    <nav aria-label="Auf dieser Seite" data-testid="strategie-section-nav">
      {/* Mobile: horizontal-scrollbare Chips */}
      <ul className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
        {items.map(({ id, label }) => {
          const active = id === activeId;
          return (
            <li key={id} className="shrink-0 snap-start">
              <a
                href={`#${id}`}
                onClick={(e) => handleClick(e, id)}
                data-testid={`strategie-nav-chip-${id}`}
                className={
                  'inline-flex whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ' +
                  (active
                    ? 'border-bank-primary bg-bank-primary text-white'
                    : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-primary/40 hover:text-bank-primary')
                }
              >
                {label}
              </a>
            </li>
          );
        })}
      </ul>

      {/* Desktop: Sticky-Liste */}
      <ol className="hidden lg:block">
        {items.map(({ id, label }, i) => {
          const active = id === activeId;
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                onClick={(e) => handleClick(e, id)}
                data-testid={`strategie-nav-link-${id}`}
                className={
                  'group flex items-baseline gap-3 border-l-2 py-2 pl-4 pr-2 text-[13px] leading-snug transition-colors ' +
                  (active
                    ? 'border-bank-primary text-bank-primary'
                    : 'border-bank-border text-bank-text-muted hover:border-bank-primary/40 hover:text-bank-primary')
                }
              >
                <span className="font-mono text-[10.5px] tabular-nums text-bank-text-muted/70">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0">{label}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default StrategySectionNav;
