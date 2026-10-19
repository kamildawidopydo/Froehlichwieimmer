import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Session 93 · Phase 4 — zentraler Rechner im Hero.
 * Eingabe: Anlagebetrag, Produkttyp (Tages-/Festgeld), optional Laufzeit.
 * Submit → onCompare(state) → Parent aktualisiert die Filter + scrollt zu den
 * Ergebnissen. Fakten werden aus den Facets gespeist (KEINE Hardcodes).
 */
export default function CentralCalculator({
  facets,
  initialAmount = 25000,
  initialType = 'tagesgeld',
  initialTerm = null,
  onCompare,
  hasDemo = false,
}) {
  const [amount, setAmount] = useState(String(initialAmount));
  const [type, setType] = useState(initialType);
  const [term, setTerm] = useState(initialTerm);

  const totalOffers = facets?.total ?? null;
  const totalCountries = facets?.countries?.length ?? null;
  const totalBanks =
    facets?.countries?.reduce((s, c) => s + 0, 0) === undefined ? null : null; // set below via prop
  const bankCount = facets?.__bank_count ?? null;
  const termOptions = (facets?.terms_available || [])
    .filter((t) => t.term_months && t.term_months > 0)
    .map((t) => t.term_months);

  const submit = () => {
    onCompare?.({
      amount: amount || '',
      product_type: type,
      term_min: type === 'festgeld' && term ? term : null,
      term_max: type === 'festgeld' && term ? term : null,
    });
  };

  return (
    <section
      className="relative border border-bank-border bg-white p-6 shadow-editorial-sm sm:p-8"
      data-testid="central-calculator"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
              Anlagebetrag (€)
            </label>
            <Input
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              data-testid="calc-amount"
              className="h-11 rounded-none border-bank-border text-lg font-semibold text-bank-text"
              placeholder="25000"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
              Produkttyp
            </label>
            <div role="tablist" aria-label="Produkttyp" className="flex gap-2">
              {['tagesgeld', 'festgeld'].map((k) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={type === k}
                  data-testid={`calc-type-${k}`}
                  onClick={() => setType(k)}
                  className={cn(
                    'h-11 flex-1 px-4 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors',
                    type === k
                      ? 'border border-bank-ink bg-bank-ink text-white'
                      : 'border border-bank-border bg-white text-bank-text-muted hover:border-bank-primary hover:text-bank-text'
                  )}
                >
                  {k === 'tagesgeld' ? 'Tagesgeld' : 'Festgeld'}
                </button>
              ))}
            </div>
          </div>
          {type === 'festgeld' && termOptions.length > 0 && (
            <div className="sm:col-span-3">
              <label className="mb-1 block font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
                Laufzeit
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setTerm(null)}
                  data-testid="calc-term-any"
                  className={cn(
                    'border px-3 py-2 font-mono text-[11px]',
                    term === null
                      ? 'border-bank-primary bg-bank-primary/10 text-bank-primary'
                      : 'border-bank-border text-bank-text-muted hover:border-bank-primary/40'
                  )}
                >
                  Egal
                </button>
                {termOptions.map((t) => (
                  <button
                    key={t}
                    type="button"
                    data-testid={`calc-term-${t}`}
                    onClick={() => setTerm(t)}
                    className={cn(
                      'border px-3 py-2 font-mono text-[11px]',
                      term === t
                        ? 'border-bank-primary bg-bank-primary/10 text-bank-primary'
                        : 'border-bank-border text-bank-text-muted hover:border-bank-primary/40'
                    )}
                  >
                    {t} M
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div>
          <Button
            variant="primary"
            size="xl"
            className="h-11 w-full whitespace-nowrap px-6 text-[12px] font-semibold uppercase tracking-[0.16em] lg:w-auto"
            data-testid="calc-submit"
            onClick={submit}
          >
            Angebote vergleichen
          </Button>
        </div>
      </div>

      {facets && (
        <div
          className="mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-bank-border pt-4 text-[12px] text-bank-text-muted"
          data-testid="calc-facts"
        >
          {totalOffers != null && (
            <span>
              <strong className="rate-figure text-lg text-bank-primary" data-numeric>
                {totalOffers}
              </strong>{' '}
              Angebote
            </span>
          )}
          {bankCount != null && (
            <span>
              <strong className="rate-figure text-lg text-bank-primary" data-numeric>
                {bankCount}
              </strong>{' '}
              Banken
            </span>
          )}
          {totalCountries != null && (
            <span>
              <strong className="rate-figure text-lg text-bank-primary" data-numeric>
                {totalCountries}
              </strong>{' '}
              europäische Länder
            </span>
          )}
        </div>
      )}
    </section>
  );
}
