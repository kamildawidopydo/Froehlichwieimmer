import React from 'react';
import { ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import Eyebrow from '@/components/editorial/Eyebrow';
import { trackInvestmentEvent } from '@/lib/investmentAnalytics';
import { getProductCatalog } from '@/data/productWizardCatalog';
import { BANK_BONUS_COPY } from '@/data/bankBonusTexts';

const HomeProductWizardSection = ({ onOpenWizard }) => {
  const prefersReduced = useReducedMotion();
  const catalog = getProductCatalog();
  const sectionRef = React.useRef(null);

  const handlePick = (key) => {
    try {
      trackInvestmentEvent('product_inquiry_select', { product: key, source: 'inline_home' });
    } catch {
      /* Tracking darf Wizard-Öffnen nicht blockieren. */
    }
    onOpenWizard(key);
  };

  // Impression-Tracking via IntersectionObserver (touch-safe, einmal/Session)
  React.useEffect(() => {
    const IMPRESSION_KEY = 'product_wizard_inline_open_fired';
    try {
      if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return undefined;
      if (window.sessionStorage.getItem(IMPRESSION_KEY) === '1') return undefined;
    } catch {
      return undefined;
    }
    const el = sectionRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.25) {
            try {
              window.sessionStorage.setItem(IMPRESSION_KEY, '1');
              trackInvestmentEvent('product_inquiry_open', { source: 'inline_home' });
            } catch { /* stumm */ }
            io.disconnect();
            return;
          }
        }
      },
      { threshold: [0.25, 0.4] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      id="home-product-wizard"
      ref={sectionRef}
      data-testid="home-product-wizard"
      className="relative border-t border-bank-border bg-[linear-gradient(180deg,#ffffff_0%,#faf9f5_100%)] py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
        {/* Header */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <div>
            <Eyebrow>Produktwahl</Eyebrow>
            <h2 className="mt-4 font-display text-[2rem] font-light leading-[1.05] tracking-tight text-bank-ink sm:text-[2.6rem] lg:text-[3rem]">
              Finden Sie die passende
              <br />Geldanlage für Ihre Ziele.
            </h2>
          </div>
          <p className="max-w-md text-[15px] leading-relaxed text-bank-text-muted sm:text-[15.5px]">
            Beantworten Sie wenige kurze Fragen und erhalten Sie eine persönliche Orientierung zu
            passenden Produkten, möglichen Vorteilen und aktuellen Angeboten — kostenlos und
            unverbindlich.
          </p>
        </div>

        {/* Product cards */}
        <div
          className="mt-10 grid grid-cols-1 gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6"
          data-testid="home-product-wizard-grid"
        >
          {catalog.map((p, i) => {
            const bonus = p.bonusSource ? BANK_BONUS_COPY[p.bonusSource.bankSlug] : null;
            const bonusSummary = bonus?.summary;
            return (
              <motion.button
                key={p.key}
                type="button"
                onClick={() => handlePick(p.key)}
                data-testid={`home-product-wizard-card-${p.key}`}
                initial={prefersReduced ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-64px' }}
                transition={{ duration: prefersReduced ? 0 : 0.45, delay: prefersReduced ? 0 : 0.03 * i, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  'group relative flex min-h-[152px] flex-col gap-2 py-3 text-left transition-transform sm:py-4',
                  'hover:-translate-y-0.5',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/40',
                )}
              >
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-primary/80">
                  {p.kicker}
                </span>
                <span className="font-display text-[1.15rem] font-light leading-snug tracking-tight text-bank-ink transition-colors group-hover:text-bank-primary sm:text-[1.2rem]">
                  {p.title}
                </span>
                <span className="text-[13.5px] leading-relaxed text-bank-text-muted">
                  {p.benefit}
                </span>
                {bonusSummary ? (
                  <span
                    data-testid={`home-product-wizard-bonus-${p.key}`}
                    className="mt-1 inline-flex items-start gap-2 rounded-md border border-bank-accent/25 bg-bank-accent/5 px-2.5 py-1.5 text-[11.5px] leading-snug text-bank-ink"
                  >
                    <span className="mt-0.5 shrink-0 font-mono text-[9.5px] uppercase tracking-[0.16em] text-bank-primary">
                      {p.bonusSource.label}
                    </span>
                    <span className="min-w-0 flex-1">{bonusSummary}</span>
                  </span>
                ) : null}
                <span className="mt-auto flex items-center gap-1.5 pt-3 font-mono text-[10.5px] font-medium uppercase tracking-[0.2em] text-bank-primary transition-colors group-hover:text-bank-primary/80">
                  Fragen beantworten
                  <ArrowRight size={12} strokeWidth={LUCIDE_STROKE} aria-hidden />
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HomeProductWizardSection;
