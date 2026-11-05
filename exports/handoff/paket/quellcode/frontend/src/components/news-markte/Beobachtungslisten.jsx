import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import Eyebrow from '@/components/editorial/Eyebrow';

export const WATCH_CATEGORIES = [
  { slug: 'aktien', label: 'Aktien' },
  { slug: 'fonds-etfs', label: 'ETFs & Fonds' },
  { slug: 'rohstoffe', label: 'Rohstoffe' },
  { slug: 'seltene-erden', label: 'Seltene Erden' },
  { slug: 'anleihen', label: 'Anleihen' },
  { slug: 'zinsen', label: 'Zinsen' },
  { slug: 'waehrungen', label: 'Währungen' },
  { slug: 'investmenttrends', label: 'Investmenttrends' },
  { slug: 'unternehmen', label: 'Unternehmen' },
];

const Beobachtungslisten = () => (
  <section className="border-t border-bank-border pt-14 sm:pt-16" data-testid="beobachtungslisten">
    <div className="flex flex-col gap-3">
      <Eyebrow>Navigation</Eyebrow>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="font-serif text-3xl leading-tight text-bank-text sm:text-4xl">Märkte unter Beobachtung</h2>
        <p className="max-w-md text-[13.5px] text-bank-text-muted sm:text-right">
          Direkter Zugriff auf die einzelnen Themenbereiche mit Nachrichten und — sofern verfügbar — Marktdaten.
        </p>
      </div>
    </div>

    <ul className="mt-8 grid grid-cols-2 gap-0 border-t border-bank-border sm:grid-cols-3 lg:grid-cols-4 [&>li:last-child]:!border-r-0">
      {WATCH_CATEGORIES.map((c, i) => (
        <li key={c.slug} className={`border-b border-bank-border ${(i % 2) === 0 ? 'border-r' : ''} sm:border-r`}>
          <Link
            to={`/news/${c.slug}`}
            className="group flex items-center justify-between px-5 py-5 transition-colors hover:bg-neutral-50"
            data-testid={`watch-link-${c.slug}`}
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-bank-accent-strong">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="font-serif text-[15px] text-bank-text">{c.label}</span>
            </div>
            <ArrowUpRight
              className="h-4 w-4 text-bank-text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-bank-accent-strong"
              strokeWidth={1.4}
            />
          </Link>
        </li>
      ))}
    </ul>
  </section>
);

export default Beobachtungslisten;
