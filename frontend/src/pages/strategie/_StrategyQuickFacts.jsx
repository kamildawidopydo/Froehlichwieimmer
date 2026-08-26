import React from 'react';

const StrategyQuickFacts = ({ items = [] }) => {
  if (!items.length) return null;
  return (
    <section
      className="mt-10 rounded-2xl border border-bank-border bg-bank-primary/[0.02] p-5 sm:p-6"
      data-testid="strategie-quick-facts"
      aria-label="Kurzübersicht"
    >
      <p className="text-[10.5px] uppercase tracking-[0.22em] text-bank-primary">Kurzübersicht</p>
      <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((fact) => (
          <div key={fact.label} className="border-l-2 border-bank-primary/30 pl-3">
            <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-bank-text-muted">{fact.label}</dt>
            <dd className="mt-1 font-serif text-[16px] leading-snug text-bank-text">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

export default StrategyQuickFacts;
