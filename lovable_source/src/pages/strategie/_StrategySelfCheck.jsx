import React, { useState } from 'react';
import { Check } from 'lucide-react';

/**
 * Rein clientseitiger Self-Check ohne Speicherung, ohne PII, ohne Scoring.
 * Nach Auswahl erscheint lediglich eine neutrale Zusammenfassung.
 */
const StrategySelfCheck = ({ question, options = [], summary }) => {
  const [selected, setSelected] = useState(() => new Set());

  const toggle = (value) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const anyChecked = selected.size > 0;

  return (
    <div
      className="rounded-2xl border border-bank-border bg-white p-5 sm:p-7"
      data-testid="strategie-self-check"
    >
      <p className="font-serif text-[18px] leading-snug text-bank-text sm:text-[20px]">
        {question}
      </p>
      <p className="mt-2 text-[13px] text-bank-text-muted">
        Mehrfachauswahl. Rein clientseitig — es werden keine Daten gespeichert.
      </p>

      <ul className="mt-5 space-y-2.5">
        {options.map((opt) => {
          const checked = selected.has(opt.value);
          const id = `strategy-self-check-${opt.value}`;
          return (
            <li key={opt.value}>
              <label
                htmlFor={id}
                className={
                  'flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-[14px] leading-snug transition-colors ' +
                  (checked
                    ? 'border-bank-primary bg-bank-primary/[0.04]'
                    : 'border-bank-border bg-white hover:border-bank-primary/30')
                }
              >
                <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                  <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(opt.value)}
                    data-testid={`strategie-self-check-option-${opt.value}`}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden
                    className={
                      'h-5 w-5 rounded-md border transition-colors ' +
                      (checked
                        ? 'border-bank-primary bg-bank-primary'
                        : 'border-bank-border bg-white group-hover:border-bank-primary/40')
                    }
                  />
                  {checked ? (
                    <Check className="pointer-events-none absolute h-3 w-3 text-white" strokeWidth={3} aria-hidden />
                  ) : null}
                </span>
                <span className="text-bank-text">{opt.label}</span>
              </label>
            </li>
          );
        })}
      </ul>

      {anyChecked ? (
        <div
          className="mt-5 rounded-xl border border-bank-primary/25 bg-bank-primary/[0.05] px-4 py-3.5"
          data-testid="strategie-self-check-summary"
          role="status"
          aria-live="polite"
        >
          <p className="text-[10.5px] uppercase tracking-[0.22em] text-bank-primary">Neutrale Zusammenfassung</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-bank-text">
            {summary}
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default StrategySelfCheck;
