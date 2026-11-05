import { Link, Navigate, useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Calendar,
  TrendingUp,
  Check,
  Clock,
  Info,
  Percent,
  Shield,
  Users,
  Wallet,
  BookOpen,
  AlertTriangle,
} from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import Eyebrow from '@/components/editorial/Eyebrow';
import TocSticky from '@/components/editorial/TocSticky';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import {
  calcExampleYield,
  getSavingsProductGuide,
  GUIDE_TOC_BY_SLUG,
  SAVINGS_PRODUCT_SLUGS,
} from '@/data/savingsProductGuides';
import useSavingsOfferStats from '@/hooks/useSavingsOfferStats';
import { formatGuideMarketTeaser } from '@/lib/savingsOfferStats';
import { formatRateDe } from '@/lib/interestRateHistory';
import { SAVINGS_PRODUCT_MATRIX } from '@/data/savingsProductComparison';
import {
  GuideHeroClassic,
  GuideHeroMagazine,
  GuideHeroSplit,
  GuideLifestyleStrip,
  GuideTocHorizontal,
} from '@/pages/products/guideLayouts';

const EASE = [0.22, 1, 0.36, 1];

const ICON_MAP = {
  percent: Percent,
  calendar: Calendar,
  shield: Shield,
  chart: TrendingUp,
  wallet: Wallet,
  clock: Clock,
};

function accentStyles(accent) {
  if (accent === 'emerald') {
    return {
      check: 'text-emerald-600 dark:text-emerald-400',
      checkBg:
        'bg-emerald-50 border-emerald-200/80 dark:border-emerald-500/30 dark:bg-emerald-950/25',
      btn: 'bg-emerald-700 hover:bg-emerald-800 text-white',
      step: 'bg-emerald-700 text-white dark:bg-emerald-600',
      banner: 'from-emerald-50/90 to-bank-bg dark:from-emerald-950/20 dark:to-bank-bg',
      highlight:
        'border-emerald-200/60 bg-emerald-50/40 dark:border-emerald-500/25 dark:bg-bank-surface-elev',
    };
  }
  if (accent === 'sky') {
    return {
      check: 'text-sky-700 dark:text-sky-300',
      checkBg: 'bg-sky-50 border-sky-200/80 dark:border-sky-500/30 dark:bg-sky-950/25',
      btn: 'bg-bank-primary hover:bg-bank-primary-hover text-white',
      step: 'bg-bank-primary text-white',
      banner: 'from-sky-50/90 to-bank-bg dark:from-sky-950/20 dark:to-bank-bg',
      highlight: 'border-sky-200/60 bg-sky-50/40 dark:border-sky-500/25 dark:bg-bank-surface-elev',
    };
  }
  return {
    check: 'text-bank-primary dark:text-bank-accent',
    checkBg:
      'bg-bank-primary/5 border-bank-primary/20 dark:border-bank-primary/30 dark:bg-bank-surface-elev',
    btn: 'bg-bank-ink hover:bg-bank-ink-hover text-white',
    step: 'bg-bank-ink text-white',
    banner: 'from-bank-gold-soft/80 to-bank-bg dark:from-bank-surface-elev dark:to-bank-bg',
    highlight:
      'border-bank-gold/40 bg-bank-gold-soft/30 dark:border-bank-gold/25 dark:bg-bank-surface-elev',
  };
}

function SectionHead({ id, title, sub, scrollMt = 'scroll-mt-32' }) {
  return (
    <header id={id} className={cn(scrollMt, 'border-b border-bank-border pb-6')}>
      <h2 className="font-display text-2xl font-light text-bank-text sm:text-[1.75rem]">{title}</h2>
      {sub && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">{sub}</p>
      )}
    </header>
  );
}

function ProductMatrix({ highlightSlug }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-xl border border-bank-border shadow-editorial-sm">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
        <thead>
          <tr className="bg-bank-ink text-white">
            {SAVINGS_PRODUCT_MATRIX.headers.map((h) => (
              <th
                key={h}
                className="px-4 py-3 font-mono text-[9px] font-medium uppercase tracking-[0.18em] first:pl-5"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SAVINGS_PRODUCT_MATRIX.rows.map((row, i) => (
            <tr
              key={row.label}
              className={cn(
                'border-t border-bank-border',
                i % 2 === 0 ? 'bg-white dark:bg-bank-surface' : 'bg-bank-bg/40 dark:bg-bank-bg/70',
              )}
            >
              <td className="px-5 py-3 font-medium text-bank-text">{row.label}</td>
              {['tagesgeld', 'flexgeld', 'festgeld'].map((slug) => (
                <td
                  key={slug}
                  className={cn(
                    'px-4 py-3 text-bank-text-muted',
                    highlightSlug === slug && 'bg-bank-primary/5 font-semibold text-bank-primary',
                    row.numeric && 'tabular-nums',
                  )}
                  {...(row.numeric ? { 'data-numeric': true } : {})}
                >
                  {row[slug]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SavingsProductGuidePage() {
  const { slug } = useParams();
  const guide = getSavingsProductGuide(slug);
  const { stats: offerStats, loading: offerStatsLoading } = useSavingsOfferStats();
  const prefersReduced = useReducedMotion();
  const accent = accentStyles(guide?.accent ?? 'primary');
  const toc = GUIDE_TOC_BY_SLUG[slug] ?? [];

  if (!guide) {
    return <Navigate to="/" replace />;
  }

  const liveStats = offerStats[guide.comparisonFilter] ?? { maxRate: null, minDeposit: null };
  const marketTeaser = formatGuideMarketTeaser({
    maxRate: liveStats.maxRate,
    minDeposit: liveStats.minDeposit,
    loading: offerStatsLoading,
  });
  const exampleRate =
    liveStats.maxRate != null && liveStats.maxRate > 0
      ? liveStats.maxRate
      : guide.exampleCalculation.rate;
  const exampleYield = calcExampleYield({
    ...guide.exampleCalculation,
    rate: exampleRate,
  });

  const reveal = (i = 0) => ({
    initial: { opacity: 0, y: 18 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: prefersReduced ? 0 : 0.65, ease: EASE, delay: prefersReduced ? 0 : 0.05 * i },
  });

  const comparisonHref = `/comparison?types=${encodeURIComponent(guide.comparisonFilter)}`;
  const layout = guide.pageLayout ?? 'classic';
  const sectionScrollMt = layout === 'magazine' ? 'scroll-mt-36' : 'scroll-mt-32';
  const heroProps = { guide, accent, comparisonHref };

  return (
    <div className="min-h-screen bg-bank-bg">
      <PageMeta title={guide.heroTitle} description={guide.metaDescription} path={`/produkte/${guide.slug}`} />

      {layout === 'split' && <GuideHeroSplit {...heroProps} />}
      {layout === 'magazine' && <GuideHeroMagazine {...heroProps} />}
      {layout === 'classic' && <GuideHeroClassic {...heroProps} />}

      {layout !== 'magazine' && (
        <GuideLifestyleStrip guide={guide} captionAlign={layout === 'split' ? 'right' : 'left'} />
      )}

      {layout === 'magazine' && (
        <div className="bg-white dark:bg-bank-surface">
          <GuideTocHorizontal items={toc} />
        </div>
      )}

      {/* Main content + TOC */}
      <section
        className={cn(
          layout === 'magazine' ? 'pb-14 pt-8 sm:pb-20 sm:pt-10' : 'py-14 sm:py-20',
          layout === 'magazine' && 'bg-white dark:bg-bank-surface',
          layout === 'split' && 'bg-bank-bg',
        )}
      >
        <div
          className={cn(
            'mx-auto px-5 sm:px-8 lg:px-12',
            layout === 'magazine' && 'max-w-3xl',
            layout !== 'magazine' && 'grid max-w-[1440px] gap-12 lg:gap-16',
            layout === 'classic' && 'lg:grid-cols-[220px_minmax(0,1fr)]',
            layout === 'split' && 'lg:grid-cols-[minmax(0,1fr)_220px]',
          )}
        >
          {layout !== 'magazine' && (
            <TocSticky
              items={toc}
              className={cn('top-28', layout === 'split' && 'lg:order-2')}
            />
          )}

          <div
            className={cn(
              'min-w-0 space-y-16 sm:space-y-20',
              layout === 'split' && 'lg:order-1',
            )}
          >
            {/* Kurz erklärt */}
            <motion.article {...reveal(0)}>
              <SectionHead id="kurz-erklaert" title="Kurz erklärt" sub="Definition" scrollMt={sectionScrollMt} />
              <p className="prose-copy mt-6 max-w-3xl text-[15px] leading-[1.85] text-bank-text-muted">
                {guide.definition}
              </p>
            </motion.article>

            {/* Auf einen Blick */}
            {layout !== 'split' && (
              <motion.article {...reveal(1)}>
                <SectionHead id="auf-einen-blick" title="Auf einen Blick" scrollMt={sectionScrollMt} />
                <div
                  className={cn(
                    'mt-6 grid gap-3 sm:grid-cols-2',
                    layout === 'magazine' ? 'grid-cols-1' : 'lg:grid-cols-4',
                  )}
                >
                  {guide.keyFacts.map((fact) => (
                    <div
                      key={fact.label}
                      className={cn('rounded-xl border p-4', accent.highlight)}
                    >
                      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-bank-text-muted">
                        {fact.label}
                      </p>
                      <p
                        className="mt-2 text-base font-semibold text-bank-text"
                        {...(fact.numeric ? { 'data-numeric': true } : {})}
                      >
                        {fact.value}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.article>
            )}

            {/* Vorteile & Ablauf */}
            <motion.article {...reveal(2)} id="vorteile-ablauf" className={sectionScrollMt}>
              <SectionHead title="Vorteile & Ablauf" sub="So funktioniert die Anlage" scrollMt={sectionScrollMt} />
              <div
                className={cn(
                  'mt-8 gap-6',
                  layout === 'split'
                    ? 'space-y-6'
                    : 'grid lg:grid-cols-2',
                )}
              >
                <div className="rounded-2xl border border-bank-border bg-white p-6 shadow-editorial-sm dark:bg-bank-surface sm:p-8">
                  <h3 className="font-display text-lg font-light text-bank-text">Vorteile</h3>
                  <ul className="mt-5 space-y-4">
                    {guide.advantages.map((item) => {
                      const Icon = ICON_MAP[item.icon] || Check;
                      return (
                        <li key={item.text} className="flex gap-3">
                          <span
                            className={cn(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
                              accent.checkBg,
                            )}
                          >
                            <Icon className={cn('h-4 w-4', accent.check)} strokeWidth={LUCIDE_STROKE} />
                          </span>
                          <span className="pt-1.5 text-[14px] leading-relaxed text-bank-text-muted">
                            {item.text}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="rounded-2xl border border-bank-border bg-white p-6 shadow-editorial-sm dark:bg-bank-surface sm:p-8">
                  <h3 className="font-display text-lg font-light text-bank-text">In 4 Schritten</h3>
                  {layout === 'split' ? (
                    <ol className="mt-6 grid gap-4 sm:grid-cols-2">
                      {guide.howItWorks.map((step) => (
                        <li
                          key={step.step}
                          className="rounded-xl border border-bank-border bg-bank-bg/40 p-4 dark:bg-bank-bg/60"
                        >
                          <span
                            className={cn(
                              'inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
                              accent.step,
                            )}
                          >
                            {step.step}
                          </span>
                          <p className="mt-3 font-semibold text-bank-text">{step.title}</p>
                          <p className="mt-1 text-sm leading-relaxed text-bank-text-muted">{step.text}</p>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <ol className="mt-5 space-y-5">
                      {guide.howItWorks.map((step) => (
                        <li key={step.step} className="flex gap-4">
                          <span
                            className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                              accent.step,
                            )}
                          >
                            {step.step}
                          </span>
                          <div>
                            <p className="font-semibold text-bank-text">{step.title}</p>
                            <p className="mt-1 text-sm leading-relaxed text-bank-text-muted">{step.text}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
              <div className="mt-6 rounded-2xl border border-bank-border bg-white p-6 dark:bg-bank-surface sm:p-8">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-bank-primary" strokeWidth={LUCIDE_STROKE} />
                  <h3 className="font-display text-lg font-light text-bank-text">Für wen geeignet?</h3>
                </div>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {guide.audience.map((line) => (
                    <li key={line} className="flex gap-2 text-sm leading-relaxed text-bank-text-muted">
                      <Check className={cn('mt-0.5 h-4 w-4 shrink-0', accent.check)} strokeWidth={LUCIDE_STROKE} />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.article>

            {/* Einlagensicherung */}
            <motion.article {...reveal(3)}>
              <SectionHead id="einlagensicherung" title="Einlagensicherung" sub="Sicherheit" scrollMt={sectionScrollMt} />
              <div className="mt-6 flex gap-4 rounded-2xl border border-bank-border bg-white p-6 dark:bg-bank-surface sm:p-8">
                <Shield className="h-8 w-8 shrink-0 text-bank-primary" strokeWidth={LUCIDE_STROKE} />
                <div>
                  <p className="text-[15px] leading-relaxed text-bank-text-muted">{guide.depositProtection}</p>
                  <Link
                    to="/sicherheit-regulierung"
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-bank-primary hover:underline"
                  >
                    Mehr zu Sicherheit & Regulierung
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={LUCIDE_STROKE} />
                  </Link>
                </div>
              </div>
            </motion.article>

            {/* Steuern */}
            <motion.article {...reveal(4)}>
              <SectionHead id="steuern" title="Steuern" sub="Abgeltungsteuer & Freistellungsauftrag" scrollMt={sectionScrollMt} />
              <p className="mt-6 max-w-3xl text-[15px] leading-relaxed text-bank-text-muted">{guide.taxSection}</p>
            </motion.article>

            {/* Produktvergleich */}
            <motion.article {...reveal(5)}>
              <SectionHead id="vergleich-produkte" title="Tagesgeld, Flexgeld & Festgeld" sub="Produktvergleich" scrollMt={sectionScrollMt} />
              <p className="mt-4 max-w-3xl text-sm text-bank-text-muted">
                Orientierung — welches Produkt passt zu welchem Ziel? Die hervorgehobene Spalte entspricht dieser Seite.
              </p>
              <ProductMatrix highlightSlug={guide.slug} />
            </motion.article>

            {/* Nachteile */}
            <motion.article {...reveal(6)}>
              <SectionHead id="nachteile" title="Nachteile & Risiken" sub="Ehrlich eingeordnet" scrollMt={sectionScrollMt} />
              <ul className="mt-6 space-y-3">
                {guide.drawbacks.map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 rounded-lg border border-amber-200/50 bg-amber-50/30 px-4 py-3 text-sm leading-relaxed text-bank-text-muted dark:border-amber-500/25 dark:bg-amber-950/20"
                  >
                    <AlertTriangle
                      className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
                      strokeWidth={LUCIDE_STROKE}
                    />
                    {item}
                  </li>
                ))}
              </ul>
              {guide.prolongationNote && (
                <div className="mt-4 flex gap-3 rounded-lg border border-bank-border bg-bank-bg/60 p-4">
                  <Info className="h-5 w-5 shrink-0 text-bank-primary" strokeWidth={LUCIDE_STROKE} />
                  <p className="text-sm leading-relaxed text-bank-text-muted">{guide.prolongationNote}</p>
                </div>
              )}
              <p className="mt-4 flex items-start gap-2 text-xs text-bank-text-muted">
                <span className="mt-0.5 shrink-0 text-bank-text-muted">*</span>
                {guide.notice}
              </p>
            </motion.article>

            {/* Beispielrechnung */}
            <motion.article {...reveal(7)}>
              <SectionHead id="beispiel" title="Beispielrechnung" sub={guide.exampleCalculation.label} scrollMt={sectionScrollMt} />
              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-6 sm:p-8 dark:border-sky-500/25 dark:bg-bank-surface">
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-sky-800/80 dark:text-sky-300/90">
                    Annahme
                  </p>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-bank-text-muted">Anlagebetrag</dt>
                      <dd className="font-semibold tabular-nums" data-numeric>
                        {guide.exampleCalculation.deposit.toLocaleString('de-DE')} €
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-bank-text-muted">Zinssatz p.a.</dt>
                      <dd className="font-semibold tabular-nums text-bank-primary" data-numeric>
                        {formatRateDe(exampleRate)} %
                        {!offerStatsLoading && liveStats.maxRate != null && (
                          <span className="ml-1 text-xs font-normal text-bank-text-muted">
                            (Top im Vergleich)
                          </span>
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-bank-text-muted">Laufzeit</dt>
                      <dd className="font-semibold tabular-nums" data-numeric>
                        {guide.exampleCalculation.years} Jahr
                      </dd>
                    </div>
                  </dl>
                  <p className="rate-figure mt-6 text-center text-3xl font-light text-bank-text" data-numeric>
                    ≈ {exampleYield.toLocaleString('de-DE')} € Zinsen
                  </p>
                  <p className="mt-2 text-center text-xs text-bank-text-muted">
                    Vor Steuern · ohne Zinseszins · vereinfachte Berechnung
                  </p>
                </div>
                <div className="flex flex-col justify-center rounded-2xl border border-bank-border bg-white p-6 dark:bg-bank-surface">
                  <p className="text-sm leading-relaxed text-bank-text-muted">
                    Für Ihre individuelle Planung nutzen Sie unseren Zinsrechner oder vergleichen Sie live Konditionen
                    der Partnerbanken.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link to="/calculator">
                      <Button variant="outline-ink" size="default">
                        Zum Zinsrechner
                      </Button>
                    </Link>
                    <Link to={comparisonHref}>
                      <Button variant="primary" size="default" className={cn(accent.btn, 'border-0')}>
                        Angebote ansehen
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </motion.article>

            {/* Checkliste */}
            <motion.article {...reveal(8)}>
              <SectionHead id="checkliste" title="Checkliste vor Abschluss" scrollMt={sectionScrollMt} />
              <ul className="mt-6 space-y-2">
                {guide.checklist.map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 rounded-lg border border-bank-border bg-white px-4 py-3 text-sm text-bank-text-muted dark:bg-bank-surface"
                  >
                    <Check className={cn('mt-0.5 h-4 w-4 shrink-0', accent.check)} strokeWidth={LUCIDE_STROKE} />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.article>

            {/* Laufzeiten / Tabelle */}
            <motion.article {...reveal(9)}>
              <SectionHead
                id="laufzeiten"
                title={guide.slug === 'tagesgeld' ? 'Verfügbarkeit im Überblick' : 'Laufzeiten & Konditionen'}
                scrollMt={sectionScrollMt}
              />
              <div className="mt-6 overflow-hidden rounded-xl border border-bank-border shadow-editorial-sm">
                <table className="w-full min-w-[480px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-bank-ink text-white">
                      <th className="px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.2em]">
                        {guide.slug === 'tagesgeld' ? 'Modell' : 'Laufzeit'}
                      </th>
                      <th className="px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.2em]">
                        Zinsgarantie
                      </th>
                      <th className="px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.2em]">
                        Verfügbarkeit
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {guide.termTable.map((row, i) => (
                      <tr
                        key={row.term}
                        className={cn(
                          'border-t border-bank-border',
                          i % 2 === 0 ? 'bg-white dark:bg-bank-surface' : 'bg-bank-bg/50 dark:bg-bank-bg/80',
                        )}
                      >
                        <td className="px-5 py-3.5 font-medium">{row.term}</td>
                        <td className="px-5 py-3.5 text-bank-text-muted">
                          <span className="inline-flex items-center gap-1.5">
                            <Check className={cn('h-3.5 w-3.5', accent.check)} strokeWidth={LUCIDE_STROKE} />
                            {row.guarantee}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-bank-text-muted">{row.availability}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.article>

            {/* FAQ */}
            <motion.article {...reveal(10)}>
              <SectionHead id="faq" title="Häufige Fragen" sub="FAQ" scrollMt={sectionScrollMt} />
              <Accordion
                type="single"
                collapsible
                className="mt-6 rounded-2xl border border-bank-border bg-white px-2 dark:bg-bank-surface"
              >
                {guide.faq.map((item, i) => (
                  <AccordionItem key={item.q} value={`faq-${i}`}>
                    <AccordionTrigger className="px-4 text-left font-medium text-bank-text hover:no-underline">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 text-sm leading-relaxed text-bank-text-muted">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.article>

            {/* CTA inline */}
            <motion.div
              {...reveal(11)}
              className="overflow-hidden rounded-2xl border border-bank-border bg-white shadow-editorial-md dark:bg-bank-surface"
            >
              <div
                className={cn(
                  'grid',
                  layout === 'magazine' && 'grid-cols-1',
                  layout === 'split' && 'lg:grid-cols-12',
                  layout === 'classic' && 'lg:grid-cols-12',
                )}
              >
                <div
                  className={cn(
                    layout === 'magazine' && 'order-1',
                    layout === 'split' ? 'lg:col-span-5 lg:order-2' : 'lg:col-span-5',
                  )}
                >
                  <img
                    src={guide.inlineImage}
                    alt={guide.inlineAlt}
                    loading="lazy"
                    decoding="async"
                    className={cn(
                      'w-full object-cover',
                      layout === 'magazine'
                        ? 'aspect-[16/9] max-h-[320px]'
                        : 'h-full min-h-[260px] object-[center_20%] lg:min-h-full',
                    )}
                  />
                </div>
                <div
                  className={cn(
                    'flex flex-col justify-center p-8 lg:p-10',
                    layout === 'split' ? 'lg:col-span-7 lg:order-1' : 'lg:col-span-7',
                  )}
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-gold">
                    Nächster Schritt
                  </p>
                  <h2 className="font-display mt-3 text-2xl font-light text-bank-text">
                    Passende {guide.title}-Angebote finden
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-bank-text-muted">
                    {marketTeaser.ratePart ? (
                      <>
                        <span className="rate-figure font-semibold text-bank-primary" data-numeric>
                          {marketTeaser.ratePart}
                        </span>{' '}
                      </>
                    ) : null}
                    {marketTeaser.depositPart}
                  </p>
                  <Link to={comparisonHref} className="mt-8 inline-block">
                    <Button variant="primary" size="xl" className={cn(accent.btn, 'border-0')}>
                      Jetzt vergleichen
                      <ArrowRight className="ml-1 h-4 w-4" strokeWidth={LUCIDE_STROKE} />
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* Weitere Themen */}
            <div className="flex flex-wrap gap-3 border-t border-bank-border pt-10">
              <Link
                to="/savings-education"
                className="inline-flex items-center gap-2 rounded-full border border-bank-border bg-white px-4 py-2 text-sm text-bank-text hover:border-bank-primary/30 dark:bg-bank-surface dark:hover:border-bank-primary/45"
              >
                <BookOpen className="h-4 w-4" strokeWidth={LUCIDE_STROKE} />
                Sparwissen
              </Link>
              <Link
                to="/faq"
                className="inline-flex items-center gap-2 rounded-full border border-bank-border bg-white px-4 py-2 text-sm text-bank-text hover:border-bank-primary/30 dark:bg-bank-surface dark:hover:border-bank-primary/45"
              >
                FAQ Plattform
              </Link>
              {SAVINGS_PRODUCT_SLUGS.filter((s) => s !== guide.slug).map((s) => {
                const other = getSavingsProductGuide(s);
                return (
                  <Link
                    key={s}
                    to={`/produkte/${s}`}
                    className="inline-flex items-center gap-1 rounded-full border border-bank-border bg-white px-4 py-2 text-sm text-bank-text hover:border-bank-primary/30 dark:bg-bank-surface dark:hover:border-bank-primary/45"
                  >
                    {other?.title} erklärt
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={LUCIDE_STROKE} />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-bank-border bg-bank-ink py-8">
        <div className="mx-auto flex max-w-[1440px] items-start gap-3 px-5 sm:px-8 lg:px-12">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-bank-accent" strokeWidth={LUCIDE_STROKE} />
          <p className="text-xs leading-relaxed text-white/65">
            Keine Anlageberatung. Die Inhalte dienen der allgemeinen Information (Stand redaktionell). Es gelten die
            Bedingungen der jeweiligen Partnerbank. Kapitalanlagen können Risiken bergen.
          </p>
        </div>
      </section>
    </div>
  );
}
