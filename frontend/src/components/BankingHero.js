import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import siteImages from '@/data/siteImages';
import HomeHeroNewsPreview from '@/components/home/HomeHeroNewsPreview';

const HERO_IMG = siteImages.hero.banking;
const PRELOAD_ID = 'preload-hero-family-planning-lcp';

const BankingHero = () => {
  const prefersReduced = useReducedMotion();
  const ref = useRef(null);
  const [parallaxOk, setParallaxOk] = useState(false);

  useLayoutEffect(() => {
    if (document.getElementById(PRELOAD_ID)) return undefined;
    const link = document.createElement('link');
    link.id = PRELOAD_ID;
    link.rel = 'preload';
    link.as = 'image';
    link.href = HERO_IMG;
    link.setAttribute('fetchpriority', 'high');
    document.head.appendChild(link);
    return () => link.remove();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setParallaxOk(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const yVisual = useTransform(scrollYProgress, [0, 1], [0, prefersReduced || !parallaxOk ? 0 : 28]);

  return (
    <section
      ref={ref}
      data-testid="banking-hero"
      className="relative isolate overflow-x-clip border-b border-bank-border bg-bank-bg"
    >
      <div className="mx-auto grid w-full min-w-0 max-w-[1440px] lg:grid-cols-2">
        {/* News preview — left */}
        <div className="flex min-w-0 flex-col justify-center px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12 xl:px-16">
          <HomeHeroNewsPreview />
        </div>

        {/* Visual — right (UNCHANGED) */}
        <div className="relative min-h-[min(58vw,22rem)] min-w-0 sm:min-h-[26rem] lg:min-h-full">
          <div className="absolute inset-0 overflow-hidden bg-bank-surface-elev">
            <motion.img
              src={HERO_IMG}
              alt={siteImages.hero.bankingAlt}
              width={1200}
              height={1600}
              decoding="async"
              fetchpriority="high"
              loading="eager"
              style={prefersReduced || !parallaxOk ? undefined : { y: yVisual }}
              className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[52%_28%] lg:h-[112%] lg:max-w-none"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default BankingHero;
