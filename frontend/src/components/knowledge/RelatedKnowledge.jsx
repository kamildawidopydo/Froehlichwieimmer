import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import Eyebrow from '@/components/editorial/Eyebrow';

/**
 * RelatedKnowledge — einheitliche, editorial gehaltene Wissens-Navigation.
 *
 * Regeln:
 *  - maximal 3 Empfehlungen (mehr wird ignoriert)
 *  - Text-Links statt Sales-Buttons
 *  - kleine Kategoriebezeichnung, klare Headline, 1 Satz, dezenter Pfeil
 *  - keine Bilder, keine Karten mit Border-Overkill
 *  - vollständige Anchor-Semantik (<Link>), Tastatur-erreichbar, sichtbarer Focus
 *
 * Props:
 *  - items      : Array of { type, title, description, href, cta }
 *  - title      : optional — default "Wissen vertiefen"
 *  - eyebrow    : optional — default "Weiterlesen"
 *  - tone       : 'light' (auf weiß) | 'muted' (auf bank-bg)
 *  - testId     : optional root data-testid
 */
const RelatedKnowledge = ({
  items = [],
  title = 'Wissen vertiefen',
  eyebrow = 'Weiterlesen',
  tone = 'light',
  testId = 'related-knowledge',
}) => {
  const trimmed = (items || []).slice(0, 3);
  if (trimmed.length === 0) return null;

  const bg = tone === 'muted' ? 'bg-bank-bg' : 'bg-white';

  return (
    <section
      className={`border-t border-bank-border ${bg}`}
      data-testid={testId}
      aria-labelledby={`${testId}-heading`}
    >
      <div className="mx-auto max-w-[1100px] px-5 py-14 sm:px-8 sm:py-16 lg:px-12">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2
          id={`${testId}-heading`}
          className="mt-3 max-w-2xl font-serif text-[26px] leading-tight text-bank-text sm:text-[32px]"
        >
          {title}
        </h2>

        <ul className="mt-10 divide-y divide-bank-border border-y border-bank-border">
          {trimmed.map((it, i) => (
            <li key={`${it.href}-${i}`}>
              <Link
                to={it.href}
                data-testid={`${testId}-item-${i}`}
                className="group grid gap-3 py-6 focus-visible:outline-none sm:grid-cols-[auto_1fr_auto] sm:items-baseline sm:gap-x-8 sm:py-7"
              >
                <span
                  className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold"
                  aria-hidden
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-primary">
                    {it.type}
                  </p>
                  <h3 className="mt-2 font-serif text-[19px] leading-snug text-bank-text transition-colors group-hover:text-bank-primary group-focus-visible:text-bank-primary sm:text-[22px]">
                    {it.title}
                  </h3>
                  {it.description && (
                    <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-bank-text-muted">
                      {it.description}
                    </p>
                  )}
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 self-center whitespace-nowrap text-[12px] font-medium uppercase tracking-[0.16em] text-bank-primary sm:self-end sm:pb-1.5">
                  {it.cta || 'Mehr erfahren'}
                  <ArrowUpRight
                    size={13}
                    strokeWidth={1.7}
                    className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default RelatedKnowledge;
