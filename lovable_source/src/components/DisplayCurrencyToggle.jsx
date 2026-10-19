import React from 'react';
import { useDisplayCurrency } from '@/context/DisplayCurrencyContext';

/**
 * Dezenter EUR | USD Umschalter im Private-Banking-Stil.
 *
 * Aktive Auswahl in Dunkelblau, inaktive in Muted-Grau. Kleine Typografie,
 * Trennstrich als optische Klammer. Kein Trading-App-Look.
 */
const OPTIONS = ['EUR', 'USD'];

const DisplayCurrencyToggle = ({ className = '', size = 'md', label = 'Anzeigewährung' }) => {
  const { currency, setCurrency } = useDisplayCurrency();
  const isSmall = size === 'sm';
  const btnBase = isSmall
    ? 'px-2 py-0.5 text-[10.5px] tracking-[0.16em]'
    : 'px-2.5 py-1 text-[11px] tracking-[0.18em]';

  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      role="group"
      aria-label={label}
      data-testid="display-currency-toggle"
    >
      <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted sm:inline">
        {label}
      </span>
      <div className="inline-flex items-center overflow-hidden border border-bank-border bg-white">
        {OPTIONS.map((code, idx) => {
          const active = currency === code;
          return (
            <React.Fragment key={code}>
              {idx > 0 && <span aria-hidden className="h-3 w-px bg-bank-border" />}
              <button
                type="button"
                onClick={() => setCurrency(code)}
                data-testid={`display-currency-${code.toLowerCase()}`}
                aria-pressed={active}
                className={`font-mono uppercase transition-colors ${btnBase} ${
                  active
                    ? 'bg-bank-primary text-white'
                    : 'text-bank-text-muted hover:text-bank-primary'
                }`}
              >
                {code}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default DisplayCurrencyToggle;
