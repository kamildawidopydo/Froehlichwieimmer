import React from 'react';
import { getCountryLabelDe } from '@/lib/countryFlags';
import CountryFlagIcon from '@/components/CountryFlagIcon';
import { cn } from '@/lib/utils';

/**
 * Kompakter, horizontal scrollbarer Country-Explorer.
 * Klick auf ein Land aktiviert/deaktiviert den Länder-Filter.
 * KEIN Pseudo-Ranking - nur Verteilung nach Anzahl verfügbarer Angebote.
 */
export default function CountryExplorer({ countries = [], selected = [], onToggle }) {
  if (!countries.length) return null;
  const total = countries.reduce((s, c) => s + (c.count || 0), 0);

  return (
    <section
      data-testid="country-explorer"
      className="mb-10 border-y border-bank-border bg-bank-bg/40 py-6"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">
            Europäische Breite
          </p>
          <p className="mt-1 font-display text-[18px] font-light leading-tight text-bank-text">
            Angebote aus{' '}
            <span className="font-medium text-bank-primary">
              {countries.length} europäischen Ländern
            </span>{' '}
            · {total} Konditionen
          </p>
        </div>
        <p className="text-[11.5px] text-bank-text-muted">
          Klick auf ein Land filtert die Liste
        </p>
      </div>
      <div
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2"
        role="list"
        aria-label="Länder-Chips"
      >
        {countries.map((c) => {
          const isOn = selected.includes(c.code);
          return (
            <button
              key={c.code}
              type="button"
              role="listitem"
              data-testid={`country-chip-${c.code}`}
              aria-pressed={isOn}
              onClick={() => onToggle?.(c.code)}
              className={cn(
                'inline-flex shrink-0 snap-start items-center gap-2 border px-3 py-2 text-[13px] transition-colors',
                isOn
                  ? 'border-bank-primary bg-bank-primary/10 text-bank-primary'
                  : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-primary/40 hover:text-bank-text'
              )}
            >
              <CountryFlagIcon country={c.code} size="xs" />
              <span className="font-medium">
                {getCountryLabelDe(c.code) || c.name_de || c.code}
              </span>
              <span
                className={cn(
                  'font-mono text-[10.5px] tabular-nums',
                  isOn ? 'text-bank-primary/80' : 'text-bank-text-muted'
                )}
              >
                · {c.count}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
