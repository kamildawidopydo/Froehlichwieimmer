import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import siteCopy from '@/data/siteCopy';
import siteImages from '@/data/siteImages';

const REVEAL = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };
const EASE = [0.22, 1, 0.36, 1];
const HERO_IMG = siteImages.hero.banking;
const PRELOAD_ID = 'preload-hero-family-planning-lcp';
const { hero } = siteCopy;

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

  const transition = (i) => ({
    duration: prefersReduced ? 0 : 0.65,
    ease: EASE,
    delay: prefersReduced ? 0 : 0.05 * i,
  });

  return (
    <section
      ref={ref}
      data-testid="banking-hero"
      className="relative isolate overflow-x-clip border-b border-bank-border bg-bank-bg"
    >
      <div className="mx-auto grid w-full min-w-0 max-w-[1440px] lg:min-h-[min(78vh,700px)] lg:grid-cols-2">
        {/* Copy — left */}
        <div className="flex min-w-0 flex-col justify-center px-5 py-10 sm:px-8 sm:py-14 lg:px-12 lg:py-20 xl:px-16">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: prefersReduced ? 0 : 0.06 } } }}
            className="w-full min-w-0 max-w-[36rem]"
          >
            <motion.h1
              variants={REVEAL}
              transition={transition(0)}
              className="max-w-full break-words font-display text-[clamp(1.85rem,6.8vw+0.35rem,2.65rem)] font-medium leading-[1.08] tracking-[-0.02em] text-bank-text [overflow-wrap:anywhere] sm:text-display-lg lg:text-display-xl"
            >
              <span className="block">
                Ihre <span className="whitespace-nowrap">Investments.</span>
              </span>
              <span className="block">
                Alle <span className="whitespace-nowrap">Banken.</span>
              </span>
              <span className="block text-bank-primary">
                Eine <span className="whitespace-nowrap">Plattform.</span>
              </span>
            </motion.h1>

            <motion.p
              variants={REVEAL}
              transition={transition(1)}
              className="mt-4 max-w-[32rem] text-[14.5px] leading-[1.55] text-bank-text-muted sm:mt-6 sm:text-[16px]"
            >
              {hero.lede}
            </motion.p>
            <motion.p
              variants={REVEAL}
              transition={transition(2)}
              className="mt-3 max-w-[32rem] text-[14.5px] leading-[1.55] text-bank-text-muted sm:text-[16px]"
            >
              {hero.lede2}
            </motion.p>

            <motion.div
              variants={REVEAL}
              transition={transition(3)}
              className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 sm:mt-9 sm:gap-x-7"
            >
              <Link
                to="/comparison"
                data-testid="hero-comparison-btn"
                className="inline-flex h-11 items-center rounded-md bg-bank-signature px-5 text-[14px] font-medium text-white transition-colors duration-200 hover:bg-bank-signature-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-signature/45 focus-visible:ring-offset-2 focus-visible:ring-offset-bank-bg"
              >
                Zum Vergleich
              </Link>
              <Link
                to="/about"
                data-testid="hero-about-btn"
                className="text-[14px] font-medium text-bank-text-muted underline decoration-bank-border underline-offset-[5px] transition-colors duration-200 hover:text-bank-text hover:decoration-bank-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35"
              >
                {hero.ctaLabel}
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Visual — right */}
        <div className="relative min-h-[min(58vw,22rem)] min-w-0 sm:min-h-[26rem] lg:min-h-full">
          <div className="absolute inset-0 overflow-hidden bg-bank-surface-elev">
            <motion.img
              src={HERO_IMG}
              alt={siteImages.hero.bankingAlt}
              width={1200}
              height={1600}
              decoding="async"
              fetchPriority="high"
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
