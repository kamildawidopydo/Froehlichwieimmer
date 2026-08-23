import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * Semantische Breadcrumbs — <nav aria-label> + <ol>.
 * Erwartet `items` als Array `[{label, to}]`. Letztes Item ohne Link.
 */
const InvestmentBreadcrumbs = ({ items = [] }) => {
  if (!items.length) return null;
  return (
    <nav aria-label="Breadcrumb" className="text-[11px]" data-testid="topic-breadcrumbs">
      <ol className="flex flex-wrap items-center gap-1.5 font-mono uppercase tracking-[0.16em] text-bank-text-muted">
        {items.map((it, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={idx} className="flex items-center gap-1.5">
              {isLast || !it.to ? (
                <span aria-current="page" className="text-bank-text">{it.label}</span>
              ) : (
                <Link to={it.to} className="transition-colors hover:text-bank-primary">
                  {it.label}
                </Link>
              )}
              {!isLast && <ChevronRight size={11} strokeWidth={1.5} aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default InvestmentBreadcrumbs;
