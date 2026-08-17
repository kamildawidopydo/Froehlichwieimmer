import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import { cn } from '@/lib/utils';
import siteCopy from '@/data/siteCopy';

const EASE = [0.22, 1, 0.36, 1];
const { home } = siteCopy;
const productTiles = home.productTiles;

/**
 * Homepage blocks directly under hero — editorial product tile grid.
 */
const HomePostHero = () => {
  const prefersReduced = useReducedMotion();
  const reveal = (i = 0) => ({
    initial: { opacity: 0, y: 22 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-72px' },
    transition: { duration: prefersReduced ? 0 : 0.65, ease: EASE, delay: prefersReduced ? 0 : 0.045 * i },
  });

  const mosaic = (slug) => {
    // Kreditvergleich dominant; Anleihen & Aktien schmaler (12-Spalten-Raster ab lg).
    switch (slug) {
      case 'anleihen':
        return 'sm:col-span-1 lg:col-span-3 xl:col-span-3';
      case 'aktien':
        return 'sm:col-span-1 lg:col-span-3 xl:col-span-3';
      case 'weitere':
        return 'sm:col-span-2 lg:col-span-6 xl:col-span-6';
      default:
        return 'lg:col-span-4';
    }
  };

  return (
    <>
      {/* ── Produktspektrum — tight editorial grid ───────────────── */}
      <section
        id="produkt-uberblick"
        aria-labelledby="home-products-heading"
        className="scroll-mt-24 border-b border-bank-border bg-bank-surface-elev py-16 sm:py-20 lg:scroll-mt-28 lg:py-24"
        data-testid="home-post-hero-products"
      >
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="mx-auto mb-12 max-w-3xl text-center lg:mb-14">
            <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.24em] text-bank-gold">
              {home.productsEyebrow}
            </p>
            <h2
              id="home-products-heading"
              className="mt-4 text-[clamp(1.65rem,4vw,2.35rem)] font-semibold leading-tight text-bank-text"
            >
              {home.productsTitle}
            </h2>
            <p className="mt-5 text-base leading-relaxed text-bank-text-muted sm:text-lg">
              {home.productsLede}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-12 lg:gap-6 lg:auto-rows-[minmax(16.5rem,auto)]">
            {productTiles.map((p, idx) => {
              const isKreditTile = p.slug === 'weitere';
              const isHeroTile = isKreditTile;
              const isCompactTile = p.slug === 'anleihen' || p.slug === 'aktien';

              return (
                <motion.article
                  key={p.slug}
                  {...reveal(idx)}
                  className={cn(
                    'group/card flex min-h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-bank-border bg-white shadow-editorial-sm transition-[box-shadow,border-color] duration-200',
                    'hover:border-bank-primary/20 hover:shadow-editorial-md',
                    mosaic(p.slug),
                  )}
                  data-testid={p.testId}
                >
                  <div
                    className={cn(
                      'flex flex-1 flex-col',
                      isHeroTile ? 'px-6 pb-6 pt-5 sm:px-7 sm:pb-7 sm:pt-6 xl:px-9 xl:pb-8 xl:pt-7' : 'px-6 pb-6 pt-5 sm:px-7 sm:pb-7 sm:pt-6',
                    )}
                  >
                    <h3
                      className={cn(
                        'break-words font-semibold text-bank-ink [hyphens:auto]',
                        isHeroTile ? 'text-2xl sm:text-[1.7rem]' : 'text-xl sm:text-2xl',
                      )}
                    >
                      {p.title}
                    </h3>

                    <p
                      className={cn(
                        'mt-3 text-[14px] leading-relaxed text-bank-text-muted break-words [hyphens:auto]',
                        isHeroTile && 'max-w-[58ch]',
                      )}
                    >
                      {p.lede}
                    </p>

                    <ul
                      className={cn(
                        'mt-6 flex-1 space-y-3',
                        isCompactTile ? 'hidden sm:block' : '',
                      )}
                    >
                      {p.points.map((pt) => (
                        <li key={pt} className="flex gap-2.5 text-[13px] leading-snug text-bank-text-muted">
                          <Check
                            className="mt-0.5 h-4 w-4 shrink-0 text-bank-primary"
                            strokeWidth={2.25}
                            aria-hidden
                          />
                          <span className="min-w-0 break-words [hyphens:auto]">{pt}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-8 border-t border-bank-border/70 pt-6">
                      <Link to={p.href} className="block" data-testid={`${p.testId}-cta`}>
                        <Button variant="outline-ink" size="lg" className="w-full gap-2 font-normal">
                          {p.cta}
                          <ArrowRight className="h-4 w-4" strokeWidth={LUCIDE_STROKE} />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
};

export default HomePostHero;
