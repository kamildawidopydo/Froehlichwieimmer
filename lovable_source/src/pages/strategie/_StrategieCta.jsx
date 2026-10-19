import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/**
 * Beratungs-CTA am Ende jeder Themenseite (Session 80.21c).
 *
 * Öffnet den bestehenden Product-Inquiry-Wizard direkt über Query-Params
 * auf der Startseite (Home liest `?openInquiry=1&topic=…&topicSlug=…&product=…`
 * und öffnet den Wizard automatisch im „Gesprächsanfrage"-Modus mit
 * vorbefülltem Thema).
 *
 * Kein Kalender / kein Terminslot vorhanden → Copy transparent auf
 * „Gespräch anfragen" statt „vereinbaren".
 */
const CATEGORY_TO_PRODUCT = {
  anlagestile: 'aktien',
  nachhaltigkeit: 'fonds',
  'schutz-steuerung': 'fonds',
  altersvorsorge: 'fonds',
  generationen: 'fonds',
};

const StrategieCta = ({ topicTitle, topicSlug, categorySlug }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    const product = CATEGORY_TO_PRODUCT[categorySlug] || 'fonds';
    const params = new URLSearchParams({ openInquiry: '1', product });
    if (topicTitle) params.set('topic', topicTitle);
    if (topicSlug) params.set('topicSlug', topicSlug);
    navigate(`/?${params.toString()}#home-product-wizard`);
  };

  return (
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
        <button
          type="button"
          onClick={handleClick}
          className="inline-flex items-center gap-2 rounded-full bg-bank-primary px-6 py-2.5 text-[13.5px] font-medium text-white transition-colors hover:bg-bank-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-2"
          data-testid="strategie-cta-btn"
        >
          Persönliches Gespräch anfragen
          <ArrowRight className="h-4 w-4" strokeWidth={1.6} />
        </button>
      </div>
    </section>
  );
};

export default StrategieCta;
