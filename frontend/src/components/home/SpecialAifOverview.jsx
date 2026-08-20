import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { spezialAifFundPhoto } from '@/data/spezialAifContent';

const EASE = [0.22, 1, 0.36, 1];

const overviewBullets = [
  'Geschlossener Spezial-AIF nach KAGB',
  'Langfristige Investmentstrategie',
  'Breite Diversifikation über verschiedene Anlageklassen',
  'Professionelles Management & Reporting',
  'Ausschüttungen geplant',
];

/**
 * Compact Spezial-AIF teaser on homepage — full dossier at /spezial-aif.
 */
export default function SpecialAifOverview() {
  const prefersReduced = useReducedMotion();

  const reveal = (delay = 0) => ({
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: prefersReduced ? 0 : 0.55, delay: prefersReduced ? 0 : delay, ease: EASE },
  });

  return (
    <section
      aria-labelledby="special-aif-heading"
      className="relative border-b border-bank-border bg-bank-bg py-16 sm:py-20 lg:py-24"
      data-testid="home-special-aif-overview"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 80% 50% at 12% 0%, rgb(var(--bank-accent) / 0.12), transparent 58%), radial-gradient(ellipse 70% 45% at 92% 100%, rgb(var(--bank-gold) / 0.08), transparent 52%)',
        }}
      />

      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12 xl:gap-16">
          <motion.div {...reveal(0)} className="lg:col-span-5">
            <div
              className={cn(
                'relative w-full overflow-hidden border border-bank-border/80 bg-bank-surface shadow-editorial-sm',
                'aspect-[4/3] sm:aspect-[5/4] lg:aspect-[5/6]'
              )}
            >
              <img
                src={spezialAifFundPhoto.png}
                alt="Reifes Paar auf einer Terrasse mit Meerblick — symbolisch für langfristigen Anlagehorizont und Ruhe."
                width={1600}
                height={1200}
                loading="eager"
                decoding="async"
                fetchpriority="high"
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="h-full w-full object-cover object-[50%_42%]"
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-bank-bg/25 via-transparent to-transparent"
                aria-hidden
              />
            </div>
          </motion.div>

          <motion.div {...reveal(0.08)} className="lg:col-span-7 lg:justify-self-end">
            <div className="max-w-xl lg:max-w-2xl lg:pl-4 xl:pl-8">
              <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.28em] text-bank-text-muted">
                Spezial-AIF
              </p>
              <h2
                id="special-aif-heading"
                className="font-display mt-4 text-[1.65rem] font-light leading-[1.15] tracking-[-0.02em] text-bank-text sm:text-[1.85rem] lg:text-[2rem]"
                style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
              >
                Unser Spezial-AIF im Überblick
              </h2>
              <p className="mt-6 text-[15px] leading-[1.75] text-bank-text-muted">
                Der Fröhlich Vermögensberatung Spezial-AIF ist ein geschlossener Fonds für qualifizierte Anleger mit Fokus auf
                langfristige Werthaltigkeit, stabile Cashflows und ausgewogene Renditen.
              </p>
              <ul className="mt-8 space-y-4">
                {overviewBullets.map((line) => (
                  <li key={line} className="flex gap-3.5 text-[14px] leading-snug text-bank-text">
                    <span
                      className={cn(
                        'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-bank-accent/35',
                        'bg-bank-accent/10 text-bank-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]'
                      )}
                      aria-hidden
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </span>
                    <span className="min-w-0 pt-0.5">{line}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-10">
                <Link to="/spezial-aif" data-testid="home-special-aif-dossier-cta">
                  <Button variant="outline-ink" size="lg" className="gap-2">
                    Zum Fonds-Dossier
                    <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
