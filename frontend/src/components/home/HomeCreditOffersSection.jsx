import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import SectionLabel from '@/components/editorial/SectionLabel';
import { Button } from '@/components/ui/button';
import CreditOffersCoverFlow from '@/components/home/CreditOffersCoverFlow';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';

const EASE = [0.22, 1, 0.36, 1];

/**
 * Homepage: Kredit-Karussell (Cover-Flow wie Sparangebote, Daten aus credit_offers /kredit).
 */
export default function HomeCreditOffersSection({ offers }) {
  const prefersReduced = useReducedMotion();

  if (!offers?.length) return null;

  const reveal = (i = 0) => ({
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: prefersReduced ? 0 : 0.7, ease: EASE, delay: prefersReduced ? 0 : 0.05 * i },
  });

  return (
    <section
      className="border-b border-bank-border bg-white py-16 dark:bg-bank-bg sm:py-20"
      data-testid="home-credit-offers"
    >
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="pb-10">
          <SectionLabel
            eyebrow="Kreditpartner"
            title="Ausgewählte Kreditangebote"
            lede="Verhandelte Konditionen regulierter Partnerbanken — unverbindlich vergleichen und anfragen."
          />
        </div>

        <motion.div {...reveal(0)}>
          <CreditOffersCoverFlow offers={offers} />
        </motion.div>

        <motion.div {...reveal(1)} className="mt-8 flex justify-center px-1 sm:mt-10">
          <Link
            to="/kredit"
            className="block w-full max-w-[20rem] sm:max-w-none sm:w-auto"
            data-testid="home-credit-offers-cta"
          >
            <Button
              variant="primary"
              size="lg"
              className="shine group h-12 w-full min-w-0 gap-2 rounded-full border-0 bg-bank-signature px-5 text-sm font-semibold normal-case tracking-normal text-white shadow-[0_12px_40px_-12px_rgb(5_150_105/0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-bank-signature-hover hover:shadow-[0_16px_48px_-10px_rgb(5_150_105/0.4)] sm:h-14 sm:px-8 sm:text-[15px]"
            >
              <span className="min-w-0 text-center leading-tight">Zum Kreditvergleich</span>
              <ArrowRight
                className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 sm:h-5 sm:w-5"
                strokeWidth={LUCIDE_STROKE}
              />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
