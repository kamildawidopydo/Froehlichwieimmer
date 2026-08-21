import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star } from 'lucide-react';

/**
 * Compact trust strip shown right under the hero. Not a review widget —
 * just an elegant one-line pointer that leads visitors to /kundenstimmen.
 */
const HomeTrustLine = () => (
  <div className="border-y border-bank-border bg-neutral-50/60" data-testid="home-trust-line">
    <Link
      to="/kundenstimmen"
      className="group mx-auto flex max-w-[1280px] items-center justify-center gap-3 px-5 py-4 text-center transition-colors hover:bg-bank-gold/5 sm:px-8 sm:py-5 lg:px-12"
    >
      <span className="inline-flex shrink-0 items-center gap-0.5" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} className="h-3.5 w-3.5 text-bank-gold" strokeWidth={1.4} fill="currentColor" />
        ))}
      </span>
      <span className="text-[13px] font-medium tracking-[0.02em] text-bank-text sm:text-[14px]">
        <span className="font-serif italic text-bank-text-muted">„</span>
        Von unseren Kunden über Jahre begleitet
        <span className="font-serif italic text-bank-text-muted">"</span>
        <span className="hidden text-bank-text-muted sm:inline"> — persönliche Erfahrungen lesen</span>
      </span>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-bank-accent-strong transition-transform group-hover:translate-x-0.5"
        strokeWidth={1.5}
      />
    </Link>
  </div>
);

export default HomeTrustLine;
