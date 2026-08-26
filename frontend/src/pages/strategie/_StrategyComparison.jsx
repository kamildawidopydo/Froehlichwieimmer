import React from 'react';

/**
 * Neutraler 2-Spalten-Vergleich zweier verwandter Ansätze.
 * Kein Ranking, keine Sieger.
 */
const StrategyComparison = ({ leftTitle, rightTitle, rows = [] }) => {
  if (!rows.length) return null;
  return (
    <div className="rounded-2xl border border-bank-border bg-white" data-testid="strategie-comparison">
      <div className="grid grid-cols-1 gap-4 border-b border-bank-border p-5 sm:p-6 md:grid-cols-3">
        <p className="text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted md:col-span-1">
          Vergleichskriterien
        </p>
        <p className="font-serif text-[17px] leading-snug text-bank-text md:col-span-1">{leftTitle}</p>
        <p className="font-serif text-[17px] leading-snug text-bank-text md:col-span-1">{rightTitle}</p>
      </div>
      <ol className="divide-y divide-bank-border">
        {rows.map((row, i) => (
          <li
            key={row.label}
            className="grid grid-cols-1 gap-3 p-5 sm:p-6 md:grid-cols-3 md:gap-6"
            data-testid={`strategie-comparison-row-${i}`}
          >
            <p className="text-[12.5px] font-medium uppercase tracking-[0.16em] text-bank-text-muted md:col-span-1">
              {row.label}
            </p>
            <p className="text-[14px] leading-relaxed text-bank-text md:col-span-1">{row.left}</p>
            <p className="text-[14px] leading-relaxed text-bank-text md:col-span-1">{row.right}</p>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default StrategyComparison;
