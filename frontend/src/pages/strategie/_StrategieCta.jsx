import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/**
 * Beratungs-CTA am Ende jeder Themenseite.
 * Zielt auf den bestehenden Anfrage-Anker `#home-product-wizard` auf der Startseite.
 * Kein neues Formular — nur Sprungziel in den vorhandenen Prozess.
 */
const StrategieCta = ({ topicTitle }) => (
  <section
    className="mt-16 border border-bank-border bg-bank-primary/[0.03] px-6 py-10 sm:px-10"
    data-testid="strategie-cta"
    aria-label="Beratungs-Call-to-Action"
  >
    <p className="text-[10.5px] uppercase tracking-[0.22em] text-bank-primary">Persönliches Gespräch</p>
    <h3 className="mt-2 font-serif text-2xl leading-snug text-bank-text sm:text-3xl">
      Sie möchten wissen, welche Strategie zu Ihrer persönlichen Situation passen könnte?
    </h3>
    <p className="mt-3 max-w-2xl text-[14px] text-bank-text-muted">
      {topicTitle
        ? `Wir sprechen unverbindlich über Ihre Ziele — und in welchem Rahmen ${topicTitle} für Sie relevant sein könnte.`
        : 'Wir sprechen unverbindlich über Ihre Ziele — und in welchem Rahmen die genannten Strategien für Sie relevant sein könnten.'}
    </p>
    <div className="mt-5">
      <Link
        to="/#home-product-wizard"
        className="inline-flex items-center gap-2 rounded-full bg-bank-primary px-6 py-2.5 text-[13.5px] font-medium text-white transition-colors hover:bg-bank-primary/90"
        data-testid="strategie-cta-btn"
      >
        Persönliches Gespräch vereinbaren
        <ArrowRight className="h-4 w-4" strokeWidth={1.6} />
      </Link>
    </div>
  </section>
);

export default StrategieCta;
