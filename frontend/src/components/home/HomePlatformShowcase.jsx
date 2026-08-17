import { motion, useReducedMotion } from 'framer-motion';
import DashboardShowcase from '@/components/editorial/DashboardShowcase';
import TabletMockup from '@/components/editorial/TabletMockup';
import siteCopy from '@/data/siteCopy';

const EASE = [0.22, 1, 0.36, 1];
const { homePlatform } = siteCopy;

/**
 * Post-hero platform pitch — login brand copy + tablet mockup side by side.
 */
const HomePlatformShowcase = () => {
  const prefersReduced = useReducedMotion();
  const reveal = (i = 0) => ({
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-72px' },
    transition: { duration: prefersReduced ? 0 : 0.65, ease: EASE, delay: prefersReduced ? 0 : 0.05 * i },
  });

  return (
    <section
      className="overflow-x-clip border-b border-bank-border bg-white py-14 dark:bg-bank-bg sm:py-20 lg:py-24"
      data-testid="home-platform-showcase"
      aria-labelledby="home-platform-heading"
    >
      <div className="mx-auto grid w-full min-w-0 max-w-[1440px] items-center gap-10 px-5 sm:px-8 lg:grid-cols-2 lg:gap-14 lg:px-12 xl:gap-16">
        <motion.div {...reveal(0)} className="min-w-0 max-w-lg">
          <h2
            id="home-platform-heading"
            className="max-w-full break-words font-display text-[clamp(1.6rem,5vw+0.4rem,2.5rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-bank-text [overflow-wrap:anywhere]"
          >
            {homePlatform.titleLine1}
            <span className="mt-1 block text-bank-primary">{homePlatform.titleLine2}</span>
          </h2>
          <div className="mt-4 h-px w-16 bg-bank-accent/80" aria-hidden />
          <p className="mt-5 text-[15px] font-semibold leading-snug text-bank-text sm:text-base">
            {homePlatform.ledeStrong}
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-bank-text-muted sm:text-[15px]">
            {homePlatform.lede}
          </p>
          <p className="mt-4 text-[13px] font-semibold tracking-[0.02em] text-bank-primary">
            {homePlatform.tagline}
          </p>
        </motion.div>

        <motion.div {...reveal(1)} className="relative min-w-0 overflow-visible px-1 py-3 sm:px-2 sm:py-4">
          <div
            className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(60%_55%_at_50%_50%,rgba(56,163,232,0.16),transparent_72%)]"
            aria-hidden
          />
          <TabletMockup>
            <DashboardShowcase />
          </TabletMockup>
        </motion.div>
      </div>
    </section>
  );
};

export default HomePlatformShowcase;
