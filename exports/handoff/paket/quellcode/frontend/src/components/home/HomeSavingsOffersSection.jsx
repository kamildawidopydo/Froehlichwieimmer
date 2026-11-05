import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import SectionLabel from '@/components/editorial/SectionLabel';
import { Button } from '@/components/ui/button';
import HomeOffersCoverFlow from '@/components/home/HomeOffersCoverFlow';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';

const EASE = [0.22, 1, 0.36, 1];

/** Homepage: Sparkonten-Karussell — Cover-Flow analog zu HomeCreditOffersSection. */
export default function HomeSavingsOffersSection({ offers }) {
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
      className="border-b border-bank-border bg-bank-surface/30 py-24 dark:bg-bank-bg sm:py-32"
      data-testid="home-savings-offers"
    >
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="pb-14">
          <SectionLabel
            eyebrow="Sparkonten"
            title="Ausgewählte Sparangebote"
            lede="Geprüfte Konditionen regulierter Partnerbanken — Tagesgeld, Festgeld und Flexgeld auf einen Blick."
          />
        </div>

        <motion.div {...reveal(0)}>
          <HomeOffersCoverFlow offers={offers} />
        </motion.div>

        <motion.div {...reveal(1)} className="mt-12 flex justify-center px-1 sm:mt-16">
          <Link
            to="/comparison"
            className="block w-full max-w-[20rem] sm:max-w-none sm:w-auto"
            data-testid="home-savings-offers-cta"
          >
            <Button
              variant="primary"
              size="lg"
              className="shine group h-12 w-full min-w-0 gap-2 rounded-full border-0 bg-bank-signature px-5 text-sm font-semibold normal-case tracking-normal text-white shadow-[0_12px_40px_-12px_rgb(76_124_186/0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-bank-signature-hover hover:shadow-[0_16px_48px_-10px_rgb(76_124_186/0.4)] sm:h-14 sm:px-8 sm:text-[15px]"
            >
              <span className="min-w-0 text-center leading-tight">Zum Sparvergleich</span>
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
