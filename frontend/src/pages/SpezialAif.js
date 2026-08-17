import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Briefcase,
  Building2,
  ChartColumnIncreasing,
  Check,
  ChevronRight,
  Clock as ClockIcon,
  FileSearch,
  Landmark,
  Layers,
  Mail,
  MapPin,
  Phone,
  Shield,
  Sparkles,
  Target,
  Users,
  Wind,
} from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import { SpezialAifPibCore, SpezialAifPibFooterBand } from '@/components/spezialAif/SpezialAifPibBlocks';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import siteContact from '../data/siteContact';
import { spezialAifPibMeta } from '@/data/spezialAifPibContent';
import {
  spezialAifAllocation,
  spezialAifAssetClasses,
  spezialAifBenefits,
  spezialAifFocusBackdrop,
  spezialAifFocusItems,
  spezialAifFundPhoto,
  spezialAifHeroKpiLabels,
  spezialAifStrategyPhoto,
  spezialAifHighlights,
  spezialAifKennzahlenAnchorId,
  spezialAifKeyFacts,
  spezialAifProcessSteps,
  spezialAifStrategyChecks,
} from '@/data/spezialAifContent';

const EASE = [0.22, 1, 0.36, 1];

/** Hero: one restrained stagger on load (refined editorial — skill: high-impact motion, not scatter). */
const heroStaggerParent = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.08 },
  },
};
const heroStaggerChild = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE },
  },
};

const highlightIcons = [Shield, ClockIcon, Target, Users];

/** WebP + Fallback-URL; optional `sources` für zweites Editorial-Bild. LCP: Hero-`png` preload im Helmet. */
const FundPhoto = memo(function FundPhoto({ alt, className, pictureClassName, sizes, isLcp, sources }) {
  const { png, webp } = sources ?? spezialAifFundPhoto;
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className={cn(
          className,
          pictureClassName,
          'flex flex-col items-center justify-end bg-gradient-to-br from-bank-ink via-[rgb(18,32,52)] to-bank-ink pb-8 pt-16'
        )}
        role="img"
        aria-label={alt || 'Hintergrundbild'}
      >
        <Building2 className="h-20 w-20 text-white/15 sm:h-24 sm:w-24" strokeWidth={1} aria-hidden />
      </div>
    );
  }
  return (
    <picture className={pictureClassName}>
      {webp ? <source type="image/webp" srcSet={webp} /> : null}
      <img
        src={png}
        alt={alt}
        className={className}
        loading={isLcp ? 'eager' : 'lazy'}
        decoding="async"
        fetchpriority={isLcp ? 'high' : 'low'}
        sizes={sizes}
        onError={() => setFailed(true)}
      />
    </picture>
  );
});
FundPhoto.displayName = 'FundPhoto';

const assetClassIcons = [Building2, Wind, Banknote, Landmark, Layers];

const HeroKpiStrip = memo(function HeroKpiStrip() {
  const rows = spezialAifHeroKpiLabels
    .map((label) => {
      const row = spezialAifKeyFacts.find((r) => r.label === label);
      return row ? { label: row.label, value: row.value } : null;
    })
    .filter(Boolean);

  return (
    <aside className="rounded-2xl border border-white/[0.1] bg-[rgb(7_18_34/0.42)] p-6 shadow-[0_20px_60px_-28px_rgb(0_0_0/0.55)] backdrop-blur-md sm:p-7 md:bg-[rgb(7_18_34/0.38)] md:pt-8">
      <p className="font-display text-[1.35rem] font-light tracking-tight text-white/95" style={{ fontVariationSettings: "'opsz' 120, 'SOFT' 100" }}>
        Kennzahlen
      </p>
      <p className="mt-1 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-white/45">Kurzüberblick</p>
      <dl className="mt-7 space-y-0 divide-y divide-white/12">
        {rows.map(({ label, value }) => (
          <div key={label} className="py-4 first:pt-0">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-bank-accent/95">{label}</dt>
            <dd className="mt-2 text-[13px] leading-snug text-white/78">{value}</dd>
          </div>
        ))}
      </dl>
      <a
        href={`#${spezialAifKennzahlenAnchorId}`}
        className="group mt-8 inline-flex items-center gap-1 border-b border-transparent pb-0.5 text-[12.5px] font-medium text-bank-accent transition-colors hover:border-bank-accent/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(7,18,34)]"
      >
        Vollständige Produktübersicht (§1)
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </a>
    </aside>
  );
});
HeroKpiStrip.displayName = 'HeroKpiStrip';

const AllocationDonut = memo(function AllocationDonut() {
  const gradient = `conic-gradient(
    rgb(var(--bank-primary)) 0deg 144deg,
    rgb(var(--bank-gold)) 144deg 234deg,
    rgb(var(--bank-accent)) 234deg 306deg,
    rgb(var(--bank-secondary)) 306deg 360deg
  )`;
  return (
    <figure
      className="flex flex-col items-center gap-8 lg:flex-row lg:items-start lg:gap-12"
      aria-labelledby="allocation-heading"
      aria-describedby="spezial-aif-portfolio-hinweis"
    >
      <div className="relative shrink-0">
        <div
          className="h-52 w-52 rounded-full p-[10px] shadow-editorial-md sm:h-56 sm:w-56"
          style={{ background: gradient }}
          role="img"
          aria-label="Illustrative Zielallokation gemäß Legende."
        >
          <div className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-bank-surface">
            <div className="max-w-[9rem] px-2 text-center">
              <p className="font-display text-[15px] font-light leading-snug tracking-tight text-bank-text sm:text-base">
                Strategisch diversifiziert
              </p>
              <p className="mt-2 text-[10px] leading-relaxed text-bank-text-muted">Illustratives Zielportfolio</p>
            </div>
          </div>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <h3 id="allocation-heading" className="font-display text-xl font-light text-bank-text sm:text-2xl">
          Zielallokation
        </h3>
        <p className="mt-2 text-[13px] leading-relaxed text-bank-text-muted">
          Beispielhafte Aufteilung — tatsächliche Allokation kann je nach Marktlage und Fondsbeschluss abweichen.
        </p>
        <ul className="mt-6 space-y-3">
          {spezialAifAllocation.map((row) => (
            <li key={row.label} className="flex items-start gap-3 text-[14px]">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: row.color }} aria-hidden />
              <span className="min-w-0 flex-1 font-medium text-bank-text">{row.label}</span>
              <span className="shrink-0 tabular-nums text-bank-text-muted">{row.range ?? `${row.pct}%`}</span>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
});
AllocationDonut.displayName = 'AllocationDonut';

const SpezialAif = () => {
  const reduce = useReducedMotion();
  const heroParentVariants = reduce
    ? { hidden: {}, visible: { transition: { staggerChildren: 0, delayChildren: 0 } } }
    : heroStaggerParent;
  const heroChildVariants = reduce
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0, transition: { duration: 0 } } }
    : heroStaggerChild;
  const fade = (i = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 18 },
    whileInView: reduce ? undefined : { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-50px' },
    transition: { duration: reduce ? 0 : 0.55, delay: reduce ? 0 : 0.05 * i, ease: EASE },
  });

  return (
    <div className="min-h-screen overflow-x-clip bg-bank-bg text-bank-text">
      <Helmet>
        <link rel="preload" as="image" href={spezialAifFundPhoto.png} />
      </Helmet>
      <PageMeta
        title="Produktinformationsblatt | Kapitalmitte Spezial-AIF"
        description="Strukturierte Produktübersicht: Kennzahlen, Strategie, Risiken, Kosten und Zielkorridor des Kapitalmitte Spezial-AIF — ergänzend Fokus, Allokation und Prozess."
        path="/spezial-aif"
      />

      {/* Hero — refined editorial: full-bleed photo, typographic rail, staggered reveal, glass deck */}
      <section className="relative isolate flex min-h-[min(72vh,46rem)] flex-col overflow-hidden border-b border-bank-border bg-bank-ink text-white lg:min-h-[min(78vh,52rem)]">
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
          <FundPhoto
            isLcp
            alt=""
            pictureClassName="block h-full min-h-full w-full"
            className="h-full min-h-full w-full object-cover object-[52%_42%] sm:object-[50%_40%]"
            sizes="100vw"
          />
        </div>
        <div
          aria-hidden
          className="absolute inset-0 z-[1] bg-gradient-to-b from-[rgb(7_18_34/0.94)] via-[rgb(7_18_34/0.82)] to-[rgb(7_18_34/0.76)] lg:bg-[linear-gradient(105deg,rgb(7_18_34)_0%,rgb(7_18_34/0.9)_38%,rgb(7_18_34/0.72)_55%,rgb(7_18_34/0.22)_100%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[rgb(7_18_34/0.58)] via-[rgb(7_18_34/0.15)] to-transparent lg:from-[rgb(7_18_34/0.42)]"
        />
        <div aria-hidden className="absolute inset-0 z-[1] topo-pattern opacity-[0.05]" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[2] shadow-[inset_0_0_min(100px,14vw)_rgb(0_0_0/0.32)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[2] opacity-[0.35] mix-blend-soft-light bg-[radial-gradient(circle_at_center,rgb(255_255_255/0.07)_1px,transparent_1.5px)] [background-size:12px_12px]"
        />
        <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24 xl:py-28">
          <div className="grid flex-1 gap-12 lg:grid-cols-12 lg:items-start lg:gap-x-10 lg:gap-y-12">
            <div className="min-w-0 lg:col-span-7 lg:row-start-1 lg:max-w-[40rem] lg:pr-2 xl:pr-4">
              <motion.div
                initial={reduce ? false : 'hidden'}
                animate="visible"
                variants={heroParentVariants}
                className="will-change-[opacity,transform]"
              >
                <motion.h1
                  variants={heroChildVariants}
                  className={cn(
                    'font-display font-light uppercase leading-[1.08] text-white text-balance',
                    'text-[clamp(1.38rem,0.4rem+3.7vw,2.9rem)] tracking-[0.03em] sm:tracking-[0.045em] lg:max-w-[42rem]',
                    'drop-shadow-[0_3px_32px_rgb(0_0_0/0.42)]'
                  )}
                  style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
                >
                  {spezialAifPibMeta.documentTitleLines.map((line, i) => (
                    <span key={i} className="block">
                      {line}
                    </span>
                  ))}
                </motion.h1>

                <motion.div variants={heroChildVariants} className="mt-4 sm:mt-5">
                  <p className="font-display text-xl font-light tracking-[0.03em] text-bank-accent sm:text-[1.68rem] sm:tracking-[0.04em] [text-shadow:0_2px_24px_rgb(0_0_0/0.35)]">
                    {spezialAifPibMeta.productName}
                  </p>
                  <p className="mt-2 text-[12px] font-medium uppercase tracking-[0.16em] text-white/68 sm:text-[13px] sm:tracking-[0.14em]">
                    {spezialAifPibMeta.productSubtitle}
                  </p>
                </motion.div>

                <motion.span
                  variants={heroChildVariants}
                  aria-hidden
                  className="mt-7 block h-px max-w-sm bg-gradient-to-r from-bank-accent via-bank-gold/65 to-transparent sm:mt-8"
                />

                <motion.p
                  variants={heroChildVariants}
                  className="mt-7 max-w-xl text-[1.03rem] leading-[1.82] tracking-[0.01em] text-white/[0.88] sm:mt-8"
                >
                  {spezialAifPibMeta.intro}
                </motion.p>

                <motion.div variants={heroChildVariants} className="mt-9 sm:mt-10">
                  <Link
                    to="/fonds-grundlagen"
                    className={cn(
                      'group inline-flex w-fit items-center gap-2 rounded-xl border border-white/18 bg-white/[0.07] px-5 py-3.5 text-[13px] font-semibold text-white',
                      'shadow-[0_1px_0_0_rgb(255_255_255/0.06)_inset,0_12px_40px_-16px_rgb(0_0_0/0.45)] backdrop-blur-[6px]',
                      'transition-[background-color,border-color,color,transform] duration-300 ease-editorial',
                      'hover:border-bank-accent/55 hover:bg-bank-accent/18 hover:text-white',
                      !reduce && 'hover:-translate-y-0.5',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(7,18,34)]'
                    )}
                  >
                    <span className="text-bank-accent transition-colors duration-300 group-hover:text-white">Wie funktioniert ein Fonds?</span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-bank-accent/90 transition-colors duration-300 group-hover:text-white" aria-hidden />
                  </Link>
                </motion.div>
              </motion.div>
            </div>

            <motion.div
              {...fade(1)}
              className="mt-2 flex min-w-0 flex-col gap-8 md:flex-row md:items-stretch md:gap-10 lg:col-span-12 lg:row-start-2 lg:mt-0 lg:gap-12"
            >
              <div className="min-w-0 flex-1">
                <div className="overflow-hidden rounded-2xl border border-white/[0.1] bg-white/[0.04] shadow-[0_28px_90px_-32px_rgb(0_0_0/0.52)] backdrop-blur-[2px]">
                  <div className="grid grid-cols-1 divide-y divide-white/[0.08] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                    {spezialAifHighlights.map((h, i) => {
                      const Icon = highlightIcons[i] || Sparkles;
                      return (
                        <div
                          key={h.key}
                          className="min-w-0 bg-[rgb(7_18_34/0.52)] px-5 py-6 backdrop-blur-md sm:px-6 sm:py-7 supports-[backdrop-filter]:bg-[rgb(7_18_34/0.38)]"
                        >
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04]">
                              <Icon className="h-3.5 w-3.5 text-bank-accent/90" strokeWidth={LUCIDE_STROKE} aria-hidden />
                            </span>
                            <p
                              className="min-w-0 flex-1 font-display text-[1.02rem] font-light leading-snug tracking-tight text-white/92"
                              style={{ fontVariationSettings: "'opsz' 120, 'SOFT' 100" }}
                            >
                              {h.title}
                            </p>
                          </div>
                          <p className="mt-3.5 border-t border-white/[0.07] pt-3.5 text-[13px] leading-relaxed text-white/70">{h.body}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="w-full shrink-0 md:w-[min(100%,17.75rem)] lg:w-[min(100%,19rem)] xl:w-[min(100%,20rem)]">
                <HeroKpiStrip />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <SpezialAifPibCore />

      {/* Anlagefokus */}
      <section className="border-b border-bank-border py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-stretch lg:gap-12">
            <motion.div {...fade(0)} className="border-l-2 border-bank-accent/35 pl-6 lg:col-span-5 lg:pl-8">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-bank-text-muted">Anlagefokus</p>
              <h2 className="mt-3 font-display text-display-sm font-light text-bank-text">Worauf wir setzen</h2>
              <p className="mt-5 max-w-md text-[15px] leading-relaxed text-bank-text-muted">
                Realwerte und wiederkehrende Erträge bilden das Rückgrat — ergänzt durch disziplinierte Streuung und
                institutionelle Prozesse.
              </p>
            </motion.div>
            <motion.div {...fade(1)} className="lg:col-span-7">
              <div
                className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-bank-ink bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(125deg, rgb(7 18 34 / 0.94), rgb(7 18 34 / 0.86)), url(${spezialAifFocusBackdrop})`,
                }}
              >
                {spezialAifFocusItems.map((item) => (
                  <div key={item.title} className="px-6 py-6 text-white sm:px-8 sm:py-7">
                    <p className="font-display text-lg font-light text-white">{item.title}</p>
                    <p className="mt-3 text-[14px] leading-relaxed text-white/75">{item.body}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Anlageklassen — fünf Säulen (Referenz) */}
      <section className="border-b border-bank-border bg-bank-surface-elev py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <motion.div {...fade(0)} className="mb-12 max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-bank-text-muted">Anlageklassen</p>
            <h2 className="mt-3 font-display text-display-sm font-light text-bank-text">Wo wir ansetzen</h2>
            <p className="mt-4 text-[14px] leading-relaxed text-bank-text-muted">
              Fünf Säulen beschreiben das Mandat — konkrete Gewichtungen ergeben sich aus der Zielallokation und dem
              aktiven Management.
            </p>
          </motion.div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {spezialAifAssetClasses.map((ac, i) => {
              const Icon = assetClassIcons[i] || Layers;
              return (
                <motion.div
                  key={ac.key}
                  {...fade(i + 1)}
                  className={cn(
                    'flex flex-col overflow-hidden rounded-2xl border border-bank-border bg-white shadow-editorial-sm dark:bg-bank-surface',
                    !reduce && 'transition-shadow duration-200 hover:shadow-editorial-md'
                  )}
                >
                  {ac.image ? (
                    <div className="relative aspect-[5/3] w-full shrink-0 border-b border-bank-border">
                      <img
                        src={ac.image}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  ) : null}
                  <div className="flex flex-1 flex-col p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-bank-border bg-bank-bg text-bank-primary dark:border-bank-border dark:bg-bank-surface-elev">
                    <Icon className="h-5 w-5" strokeWidth={LUCIDE_STROKE} aria-hidden />
                  </div>
                  <p className="mt-5 font-display text-lg font-light text-bank-text">{ac.title}</p>
                  <p className="mt-3 flex-1 text-[13px] leading-relaxed text-bank-text-muted">{ac.body}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Strategie */}
      <section className="border-b border-bank-border py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-14">
            <motion.div {...fade(0)} className="lg:col-span-6">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-bank-text-muted">Investmentstrategie</p>
              <h2 className="mt-3 font-display text-display-sm font-light text-bank-text">Aktiv geführt, strukturiert selektiert</h2>
              <p className="mt-6 text-[15px] leading-[1.75] text-bank-text-muted">
                Ziel ist eine attraktive, risikoadjustierte Rendite bei gleichzeitigem Streben nach Stabilität — durch
                aktives Management, klare Selektionskriterien und kontinuierliches Monitoring der Portfoliobestandteile.
              </p>
              <ul className="mt-8 space-y-3">
                {spezialAifStrategyChecks.map((line) => (
                  <li key={line} className="flex gap-3 text-[14px] text-bank-text">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-bank-primary" strokeWidth={2.25} aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div {...fade(1)} className="lg:col-span-6">
              <figure className="overflow-hidden rounded-2xl border border-bank-border bg-white shadow-editorial-lg dark:bg-bank-surface">
                <div className="aspect-[16/11] w-full">
                  <FundPhoto
                    sources={spezialAifStrategyPhoto}
                    alt="Team in gemeinsamer Arbeit am Bildschirm — symbolisch für Qualitätssicherung, Due Diligence und kontinuierliches Reporting."
                    className="h-full w-full object-cover object-[50%_44%]"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
                <figcaption className="border-t border-bank-border px-5 py-4 text-[12px] leading-snug text-bank-text-muted">
                  <span className="font-medium text-bank-text">Im Fokus:</span> Qualitätssicherung, Due Diligence und
                  laufendes Reporting.
                </figcaption>
              </figure>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Illustrative Zielallokation (Ergänzung zum PIB-Kern) */}
      <section className="border-b border-bank-border py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="mb-12 grid gap-8 lg:grid-cols-12 lg:gap-12">
            <motion.div {...fade(0)} className="lg:col-span-7">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-bank-text-muted">Portfolio</p>
              <h2 className="mt-3 font-display text-display-sm font-light text-bank-text">Illustrative Zielallokation</h2>
            </motion.div>
            <motion.blockquote
              {...fade(1)}
              id="spezial-aif-portfolio-hinweis"
              className="relative border-l-2 border-bank-primary/40 pl-5 lg:col-span-4 lg:col-start-9"
            >
              <p className="text-[13px] leading-relaxed text-bank-text-muted">
                <span className="font-medium text-bank-text">Hinweis.</span> Renditeziel und Risikoindikator sind im
                Produktinformationsblatt oben in den Abschnitten 5 und 8 dargestellt. Die Allokation hier ist beispielhaft
                und nicht verbindlich.
              </p>
            </motion.blockquote>
          </div>

          <motion.div {...fade(2)} className="mx-auto max-w-4xl rounded-2xl border border-bank-border bg-white p-8 shadow-editorial-sm dark:bg-bank-surface lg:p-10">
            <AllocationDonut />
          </motion.div>
        </div>
      </section>

      {/* Investmentprozess + Warum */}
      <section className="py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <motion.div {...fade(0)} className="mb-14 max-w-xl lg:mb-16">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-bank-text-muted">Investmentprozess</p>
                <h2 className="mt-3 font-display text-display-sm font-light leading-[1.12] tracking-tight text-bank-text">
                  Von der Analyse bis zur Wertentwicklung
                </h2>
              </motion.div>
              <ol className="relative space-y-1">
                {spezialAifProcessSteps.map((step, i) => {
                  const icons = [FileSearch, Layers, Banknote, Briefcase, ChartColumnIncreasing];
                  const Icon = icons[i] || Target;
                  const isLast = i === spezialAifProcessSteps.length - 1;
                  return (
                    <motion.li
                      key={step.title}
                      {...fade(i + 1)}
                      className="relative flex gap-5 pb-8 last:pb-0 sm:gap-6"
                    >
                      {!isLast && (
                        <span
                          aria-hidden
                          className="absolute left-[27px] top-14 bottom-0 w-px bg-gradient-to-b from-bank-accent/40 via-bank-border to-transparent sm:left-[31px]"
                        />
                      )}
                      <div className="relative z-[1] flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-bank-ink text-bank-accent shadow-editorial-sm sm:h-[62px] sm:w-[62px]">
                        <Icon className="h-[22px] w-[22px]" strokeWidth={LUCIDE_STROKE} aria-hidden />
                        <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-bank-border bg-bank-surface font-mono text-[10px] font-semibold tabular-nums text-bank-text-muted shadow-editorial-sm">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1">
                        <p className="font-display text-lg font-light leading-snug text-bank-text sm:text-xl">
                          {step.title}
                        </p>
                        <p className="mt-2 text-[14px] leading-relaxed text-bank-text-muted sm:text-[14.5px]">
                          {step.body}
                        </p>
                      </div>
                    </motion.li>
                  );
                })}
              </ol>
            </div>
            <motion.div {...fade(2)} className="lg:col-span-4 lg:col-start-9">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-bank-text-muted">Warum investieren?</p>
              <h2 className="mt-3 font-display text-2xl font-light text-bank-text">Ihre Vorteile</h2>
              <ul className="mt-8 space-y-4">
                {spezialAifBenefits.map((line) => (
                  <li key={line} className="flex gap-3.5">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-bank-primary/35 bg-bank-primary/[0.08] text-bank-primary">
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                    </span>
                    <span className="text-[14.5px] leading-snug text-bank-text">{line}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      <SpezialAifPibFooterBand />

      {/* CTA-Leiste + Kontakt (Referenz) */}
      <section className="border-t border-bank-border bg-bank-ink py-12 text-white sm:py-14 lg:py-16">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-8">
            <motion.div {...fade(0)} className="flex gap-4 lg:col-span-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-bank-accent">
                <Users className="h-6 w-6" strokeWidth={LUCIDE_STROKE} aria-hidden />
              </div>
              <div>
                <h2 className="font-display text-xl font-light leading-snug sm:text-2xl">Interesse an einer Beteiligung?</h2>
                <p className="mt-2 text-[13px] leading-relaxed text-white/75">
                  Wir klären strukturiert offene Punkte und den weiteren Ablauf mit Ihnen.
                </p>
              </div>
            </motion.div>
            <motion.div {...fade(1)} className="flex flex-col items-stretch justify-center gap-3 sm:flex-row lg:col-span-4 lg:flex-col lg:items-center">
              <Link
                to="/contact"
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-lg bg-white px-8 py-4 text-center font-semibold tracking-wide text-bank-ink shadow-editorial-md transition-[background-color,box-shadow] duration-200 ease-editorial',
                  'hover:bg-white/95 hover:shadow-editorial-lg',
                  !reduce && 'hover:-translate-y-px',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bank-ink'
                )}
              >
                Jetzt Kontakt aufnehmen
                <ArrowRight className="h-4 w-4" strokeWidth={LUCIDE_STROKE} />
              </Link>
              <Link
                to="/legal/impressum"
                className="rounded-md text-center text-[12px] text-white/65 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bank-ink sm:text-left lg:text-center"
              >
                Impressum
              </Link>
            </motion.div>
            <motion.div {...fade(2)} className="lg:col-span-4">
              <ul className="space-y-5 border-t border-white/10 pt-8 lg:border-t-0 lg:pt-0">
              <li className="flex gap-4">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-bank-accent" strokeWidth={LUCIDE_STROKE} aria-hidden />
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/55">Telefon</p>
                  <a
                    href={`tel:${siteContact.phoneTel}`}
                    className="mt-1 block rounded-sm tabular-nums text-white/90 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bank-ink"
                  >
                    {siteContact.phoneDisplay}
                  </a>
                </div>
              </li>
              <li className="flex gap-4">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-bank-accent" strokeWidth={LUCIDE_STROKE} aria-hidden />
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/55">E-Mail</p>
                  <a
                    href={`mailto:${siteContact.email}`}
                    className="mt-1 block break-all rounded-sm text-white/90 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bank-ink"
                  >
                    {siteContact.email}
                  </a>
                </div>
              </li>
              <li className="flex gap-4">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-bank-accent" strokeWidth={LUCIDE_STROKE} aria-hidden />
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/55">Standort</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-white/82">
                    {siteContact.street}
                    <br />
                    {siteContact.postalCity}
                  </p>
                </div>
              </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SpezialAif;
