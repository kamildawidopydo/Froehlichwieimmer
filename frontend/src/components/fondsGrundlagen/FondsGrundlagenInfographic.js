import { Fragment, memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Bell,
  Briefcase,
  Building2,
  CalendarClock,
  ChartColumnIncreasing,
  Check,
  ChevronRight,
  CircleCheck,
  ClipboardCheck,
  Clock,
  Coins,
  Droplet,
  Eye,
  FileSearch,
  FileText,
  Globe2,
  HandCoins,
  Heart,
  History,
  House,
  Landmark,
  LayoutDashboard,
  Layers,
  Leaf,
  LineChart,
  ListFilter,
  MessageSquare,
  Percent,
  PieChart,
  Presentation,
  RefreshCw,
  Rocket,
  Scale,
  Search,
  Shield,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  User,
  UserCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import BonusIcon from '@/components/BonusIcon';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import FgAllocationDonutSvg from '@/components/fondsGrundlagen/FgAllocationDonutSvg';
import {
  fgAfterInvest,
  fgAllocation6,
  fgAllocation6Callout,
  fgAllocation6Note,
  fgAllocationEyebrow,
  fgAusschuettung,
  fgEditorialPhotos,
  fgFooterValues,
  fgGeeignet,
  fgHero,
  fgInvProcess5,
  fgLegal,
  fgPhilosophie,
  fgPortal,
  fgProcess7Eyebrow,
  fgProcess7Steps,
  fgRenditeFormula,
  fgRiskSteering,
  fgSparkonto,
  fgVergleich,
} from '@/data/fondsGrundlagenContent';
import { spezialAifFundPhoto, spezialAifHeroKpiLabels, spezialAifKeyFacts } from '@/data/spezialAifContent';

const LOGO_SRC = '/assets/logo/frohlich-logo.png?v=2';
const EASE = [0.22, 1, 0.36, 1];
const STROKE = 1.25;
const RULE = 'border-bank-border';

/** Unified heading typography (Newsreader / font-display — matches Spezial-AIF & site chrome). */
const FG_H2 =
  'max-w-4xl font-display text-[clamp(1.15rem,2vw,1.45rem)] font-light leading-[1.2] tracking-[0.01em] text-bank-primary dark:text-bank-text';
const FG_H3 = 'font-display text-[13px] font-light leading-snug text-bank-primary dark:text-bank-text sm:text-[14px]';
const FG_H3_SM =
  'font-display text-[12px] font-light tracking-tight text-bank-primary dark:text-bank-text sm:text-[13px]';
const FG_SECTION_NUM =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bank-ink font-mono text-[12px] font-medium tabular-nums text-white shadow-sm';
const FG_RULE_W =
  'mt-3 h-px w-full max-w-4xl bg-gradient-to-r from-bank-gold/70 via-bank-accent/40 to-transparent dark:from-bank-gold/55 dark:via-bank-accent/30';
const FG_RULE_SHORT = 'rule-brass-lg mt-3 max-w-[10rem]';
const FG_CALLOUT =
  'rounded-sm border border-bank-border bg-bank-gold-soft px-4 py-4 dark:border-bank-border dark:bg-bank-gold-soft/30';
const FG_CALLOUT_CENTER =
  'rounded-sm border border-bank-border bg-bank-gold-soft px-6 py-6 text-center dark:border-bank-border dark:bg-bank-gold-soft/25 sm:px-8 sm:py-7';
const FG_STEP_TAG =
  'mt-5 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-bank-accent xl:mt-6';
const FG_HIGHLIGHT_CELL =
  'border border-bank-border border-l-[3px] border-l-bank-gold bg-bank-gold-soft/60 dark:border-bank-border dark:bg-bank-gold/5';

const heroStaggerParent = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
};
const heroStaggerChild = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

const FG_ICON_MAP = {
  globe: Globe2,
  droplet: Droplet,
  check: CircleCheck,
  search: Search,
  users: Users,
  percent: Percent,
  gift: BonusIcon,
  chart: ChartColumnIncreasing,
  home: House,
  user: User,
  userCheck: UserCheck,
  layout: LayoutDashboard,
  file: FileText,
  message: MessageSquare,
  bell: Bell,
  'trending-down': TrendingDown,
  landmark: Landmark,
  'trending-up': TrendingUp,
  clock: Clock,
  shield: Shield,
  layers: Layers,
  eye: Eye,
  leaf: Leaf,
  briefcase: Briefcase,
  scale: Scale,
  heart: Heart,
};

function FgIcon({ name, className, strokeWidth: iconStroke }) {
  const C = FG_ICON_MAP[name] || Target;
  return <C className={className} strokeWidth={iconStroke ?? STROKE} aria-hidden />;
}

const FundPhoto = memo(function FundPhoto({ alt, className, sizes }) {
  const { png, webp } = spezialAifFundPhoto;
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className={cn(
          className,
          'flex flex-col items-center justify-center bg-gradient-to-br from-bank-ink via-bank-ink-soft to-bank-ink'
        )}
        role="img"
        aria-label={alt}
      >
        <Building2 className="h-16 w-16 text-white/20 sm:h-20 sm:w-20" strokeWidth={1} aria-hidden />
      </div>
    );
  }
  return (
    <picture>
      {webp ? <source type="image/webp" srcSet={webp} /> : null}
      <img src={png} alt={alt} className={className} loading="eager" decoding="async" sizes={sizes} onError={() => setFailed(true)} />
    </picture>
  );
});
FundPhoto.displayName = 'FundPhoto';

const FgHeroKpiStrip = memo(function FgHeroKpiStrip() {
  const rows = spezialAifHeroKpiLabels
    .map((label) => {
      const row = spezialAifKeyFacts.find((r) => r.label === label);
      return row ? { label: row.label, value: row.value } : null;
    })
    .filter(Boolean);

  return (
    <aside className="rounded-2xl border border-white/[0.1] bg-[rgb(7_18_34/0.42)] p-6 shadow-[0_20px_60px_-28px_rgb(0_0_0/0.55)] backdrop-blur-md sm:p-7 md:bg-[rgb(7_18_34/0.38)]">
      <p
        className="font-display text-[1.35rem] font-light tracking-tight text-white/95"
        style={{ fontVariationSettings: "'opsz' 120, 'SOFT' 100" }}
      >
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
      <Link
        to="/spezial-aif"
        className="group mt-8 inline-flex items-center gap-1 border-b border-transparent pb-0.5 text-[12.5px] font-medium text-bank-accent transition-colors hover:border-bank-accent/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(7,18,34)]"
      >
        Vollständige Produktübersicht
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </aside>
  );
});
FgHeroKpiStrip.displayName = 'FgHeroKpiStrip';

/** Unsplash-Editorial (proxy), dezent gerahmt — nicht im Hero. */
const FgEditorialPhoto = memo(function FgEditorialPhoto({ photo, className, sizes, imgClassName }) {
  const { png, webp, alt } = photo;
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className={cn(
          className,
          'flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 dark:from-bank-bg dark:via-bank-surface dark:to-bank-bg'
        )}
        role="img"
        aria-label={alt}
      >
        <ChartColumnIncreasing className="h-14 w-14 text-bank-primary/15 dark:text-white/10" strokeWidth={1} aria-hidden />
      </div>
    );
  }
  return (
    <div className={cn('overflow-hidden bg-[#eef1f5] dark:bg-bank-bg', className)}>
      <picture className="block h-full w-full">
        {webp ? <source type="image/webp" srcSet={webp} /> : null}
        <img
          src={png}
          alt={alt}
          className={cn('h-full w-full object-cover object-center', imgClassName)}
          loading="lazy"
          decoding="async"
          sizes={sizes}
          onError={() => setFailed(true)}
        />
      </picture>
    </div>
  );
});
FgEditorialPhoto.displayName = 'FgEditorialPhoto';

/** Dezente Chart-Mockup im Portal-„Screen“ */
function PortalChartMock({ className }) {
  return (
    <svg viewBox="0 0 320 180" className={cn('h-full w-full', className)} aria-hidden>
      <defs>
        <linearGradient id="fgPortalBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--bank-primary))" stopOpacity={0.85} />
          <stop offset="100%" stopColor="rgb(var(--bank-primary))" stopOpacity={0.35} />
        </linearGradient>
        <linearGradient id="fgPortalGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--bank-gold))" stopOpacity={0.95} />
          <stop offset="100%" stopColor="rgb(var(--bank-gold))" stopOpacity={0.35} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="320" height="36" fill="rgb(var(--bank-primary) / 0.06)" />
      <g opacity={0.4}>
        {[48, 72, 96, 120].map((y) => (
          <line key={y} x1="18" y1={y} x2="302" y2={y} stroke="#cbd5e1" strokeWidth="0.5" className="dark:stroke-white/12" />
        ))}
      </g>
      <rect x="16" y="12" width="56" height="6" rx="2" fill="rgb(var(--bank-primary) / 0.2)" />
      <rect x="220" y="10" width="84" height="10" rx="2" fill="rgb(var(--bank-gold) / 0.35)" />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const h = 42 + (i % 4) * 16;
        const x = 24 + i * 46;
        return <rect key={i} x={x} y={140 - h} width="28" height={h} rx="3" fill={i % 2 === 0 ? 'url(#fgPortalBar)' : 'url(#fgPortalGold)'} opacity={0.9} />;
      })}
      <path d="M 24 118 Q 90 72 160 96 T 296 84" fill="none" stroke="rgb(var(--bank-primary) / 0.35)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Referenz «Wo investiert der Fonds?»: Serif-Kopf, Donut mit Segment-Fugen, 2-Spalten-Legende, Zwei-Zeilen-Footer. */
function AllocationFigure({ reduce }) {
  const colLeft = [fgAllocation6[0], fgAllocation6[2], fgAllocation6[4]];
  const colRight = [fgAllocation6[1], fgAllocation6[3], fgAllocation6[5]];

  const LegendCol = ({ rows }) => (
    <ul className="min-w-0 space-y-0">
      {rows.map((row) => (
        <li
          key={row.label}
          className="flex gap-3 border-b border-[#eeeeee] py-3.5 last:border-b-0 dark:border-white/[0.08]"
        >
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full ring-1 ring-black/[0.06]" style={{ backgroundColor: row.color }} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-display text-[13px] font-light leading-snug text-bank-primary dark:text-bank-text">{row.label}</p>
            <p className="mt-1 text-[11px] leading-snug text-[#6b7280] dark:text-bank-text-muted">{row.sub}</p>
          </div>
          <span className="shrink-0 tabular-nums text-[13px] font-bold" style={{ color: row.color }}>
            {row.pct}%
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <figure className="space-y-10 lg:space-y-0" aria-labelledby="fg-allocation-title">
      <h3 id="fg-allocation-title" className="sr-only">
        {fgAllocationEyebrow}
      </h3>
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,15.5rem)_1fr] lg:gap-12 xl:grid-cols-[minmax(0,16rem)_1fr] xl:gap-14">
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.98 }}
          whileInView={reduce ? undefined : { opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-32px' }}
          transition={{ duration: 0.45, ease: EASE }}
          className="relative mx-auto w-fit shrink-0 lg:mx-0"
        >
          <FgAllocationDonutSvg segments={fgAllocation6} showSegmentPct />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-bank-text-muted">
              Ziel-Allokation
            </span>
            <span className="mt-1 font-display text-[15px] font-light tabular-nums tracking-tight text-bank-primary dark:text-bank-text">
              100%
            </span>
          </div>
        </motion.div>
        <figcaption className="grid min-w-0 gap-8 sm:grid-cols-2 sm:gap-x-12 lg:gap-x-14">
          <LegendCol rows={colLeft} />
          <LegendCol rows={colRight} />
        </figcaption>
      </div>
      <div className="space-y-5 border-t border-[#eeeeee] pt-8 dark:border-white/10">
        <p className="border-l-[3px] border-bank-accent pl-4 text-[12px] leading-relaxed text-bank-text-muted">
          {fgAllocation6Note}
        </p>
        <div className={cn('flex gap-4', FG_CALLOUT)}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-bank-primary/20 bg-white dark:border-bank-border dark:bg-bank-surface">
            <Target className="h-5 w-5 text-bank-primary dark:text-bank-accent" strokeWidth={STROKE} aria-hidden />
          </span>
          <p className="min-w-0 flex-1 text-[12.5px] font-medium leading-relaxed text-[#334155] dark:text-bank-text-muted">{fgAllocation6Callout}</p>
        </div>
      </div>
    </figure>
  );
}

function SectionShell({ n, eyebrow, subtle, children, id }) {
  return (
    <section id={id} className={cn('border-b', RULE, subtle ? 'bg-bank-bg/60 dark:bg-bank-bg/40' : 'bg-white dark:bg-bank-surface')}>
      <div className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8 lg:px-10 lg:py-16">
        <header className="mb-10 flex flex-wrap items-end gap-4 border-b border-bank-border pb-5">
          <span className={FG_SECTION_NUM}>
            {n}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className={cn(FG_H2, 'max-w-3xl')}>
              {eyebrow}
            </h2>
            <div className="mt-2 h-px max-w-[4rem] bg-bank-gold/80" aria-hidden />
          </div>
        </header>
        {children}
      </div>
    </section>
  );
}

/** Siebenstufiger Fondsprozess — Lucide, konsistent mit LUCIDE_STROKE (Banking-Line-Stil). */
const PROCESS_SEVEN_LUCIDE = [
  { Icon: UserRound, accent: 'primary' },
  { Icon: Users, accent: 'primary' },
  { Icon: PieChart, accent: 'gold' },
  { Icon: Briefcase, accent: 'primary' },
  { Icon: ChartColumnIncreasing, accent: 'gold' },
  { Icon: Presentation, accent: 'primary' },
  { Icon: HandCoins, accent: 'primary' },
];

function ProcessSevenLucideIcon({ index, className }) {
  const row = PROCESS_SEVEN_LUCIDE[index];
  if (!row) return null;
  const { Icon, accent } = row;
  return (
    <Icon
      className={cn(
        className,
        accent === 'gold' ? 'text-bank-gold' : 'text-bank-primary dark:text-bank-accent'
      )}
      strokeWidth={LUCIDE_STROKE}
      aria-hidden
    />
  );
}

const FG_INV_VISUAL_ICONS = {
  invAnalyse: FileSearch,
  invSelektion: ListFilter,
  invPruefung: ShieldCheck,
  invEntscheidung: Scale,
  invUeberwachung: LineChart,
};

/** Reihenfolge wie `fgAfterInvest.steps` (8 Schritte). */
const FG_AFTER_INVEST_LUCIDE = [
  ClipboardCheck,
  Layers,
  Rocket,
  Activity,
  Presentation,
  HandCoins,
  CalendarClock,
  Banknote,
];

const COL_LINE = 'border-l border-[#eeeeee] dark:border-white/[0.1]';

/** Referenz-Infografik (2. Motiv): Navy-Badge mit Zahl, darunter Navy+Gold-SVG, Titel, Fließtext, hellblaues Stichwort; graue Pfeile zwischen Spalten. */
function ProcessSevenStrip({ reduce }) {
  return (
    <>
      <header className="mb-10 border-b border-[#eeeeee] pb-8 dark:border-white/10 sm:mb-12">
        <div className="flex flex-wrap items-start gap-4">
          <span className={FG_SECTION_NUM}>
            1
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="fg-process-heading"
              className={FG_H2}
            >
              {fgProcess7Eyebrow}
            </h2>
            <div className={cn(FG_RULE_W, 'max-w-4xl')} aria-hidden />
          </div>
        </div>
      </header>

      <div className="hidden min-h-0 lg:flex lg:items-stretch">
        {fgProcess7Steps.map((step, i) => {
          return (
            <Fragment key={step.key}>
              <motion.article
                initial={reduce ? false : { opacity: 0, y: 10 }}
                whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ duration: reduce ? 0 : 0.38, delay: reduce ? 0 : 0.05 * i, ease: EASE }}
                className={cn(
                  'flex min-w-0 flex-1 flex-col items-center px-1.5 text-center sm:px-2 xl:px-2.5',
                  i > 0 && COL_LINE
                )}
              >
                <span className={cn(FG_SECTION_NUM, 'text-[12px]')}>
                  {i + 1}
                </span>
                <ProcessSevenLucideIcon index={i} className="mt-4 h-[3.75rem] w-[3.75rem] xl:mt-5 xl:h-16 xl:w-16" />
                <h3 className={cn(FG_H3, 'mt-5 max-w-[11.5rem] xl:mt-6 xl:max-w-[12.5rem] xl:text-[11.5px]')}>
                  {step.title}
                </h3>
                <p className="mt-2 max-w-[13.5rem] grow font-sans text-[11px] leading-relaxed text-[#5a6270] dark:text-bank-text-muted xl:text-[11.5px]">
                  {step.body}
                </p>
                <p className={cn(FG_STEP_TAG, 'xl:mt-6')}>
                  {step.tag}
                </p>
              </motion.article>
              {i < fgProcess7Steps.length - 1 ? (
                <div className="flex w-4 shrink-0 items-center justify-center self-center pt-10 xl:w-5" aria-hidden>
                  <ArrowRight className="h-5 w-9 text-bank-primary/28 dark:text-white/22" strokeWidth={LUCIDE_STROKE} />
                </div>
              ) : null}
            </Fragment>
          );
        })}
      </div>

      <div className="divide-y divide-[#eeeeee] dark:divide-white/10 lg:hidden">
        {fgProcess7Steps.map((step, i) => {
          return (
            <motion.article
              key={step.key}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-16px' }}
              transition={{ duration: reduce ? 0 : 0.32, delay: reduce ? 0 : 0.04 * i, ease: EASE }}
              className="flex flex-col items-center py-10 text-center first:pt-4"
            >
              <span className={cn(FG_SECTION_NUM, 'text-[12px]')}>
                {i + 1}
              </span>
              <ProcessSevenLucideIcon index={i} className="mt-5 h-16 w-16" />
              <h3 className={cn(FG_H3, 'mt-5 max-w-md px-2')}>{step.title}</h3>
              <p className="mt-2 max-w-md px-3 font-sans text-[12.5px] leading-relaxed text-[#5a6270] dark:text-bank-text-muted">{step.body}</p>
              <p className={cn(FG_STEP_TAG, 'mt-4')}>{step.tag}</p>
            </motion.article>
          );
        })}
      </div>
    </>
  );
}

/** Referenz «Wie entsteht die Rendite?»: Kasten-Formelzeile, dünne Icon-Ringe, +, kremfarbenes Ziel-Feld. */
function RenditeFormulaSection({ reduce }) {
  const { eyebrow, lead, parts, goalKicker, goalMain, goalNote } = fgRenditeFormula;

  return (
    <section className={cn('border-b', RULE, 'bg-white py-12 dark:bg-bank-surface sm:py-16')} aria-labelledby="fg-rendite-heading">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-10">
        <header className="mb-6 flex flex-wrap items-start gap-4 sm:mb-8">
          <span className={FG_SECTION_NUM}>
            5
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="fg-rendite-heading"
              className={cn(FG_H2, 'max-w-3xl')}
            >
              {eyebrow}
            </h2>
            <div className={cn(FG_RULE_W, 'max-w-3xl')} aria-hidden />
          </div>
        </header>

        <p className="mb-8 max-w-3xl text-[12.5px] leading-relaxed text-[#64748b] dark:text-bank-text-muted">{lead}</p>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-24px' }}
          transition={{ duration: 0.4, ease: EASE }}
          className="rounded-lg border border-[#e4e7eb] bg-white p-4 dark:border-bank-border dark:bg-bank-bg sm:p-8 lg:p-10"
        >
          <div className="mx-auto flex max-w-5xl min-w-0 flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-3 sm:gap-y-6 xl:flex-nowrap xl:items-stretch xl:justify-between xl:gap-1">
            {parts.map((part, i) => (
              <Fragment key={part.key}>
                <div className="flex w-full max-w-[18rem] flex-col items-center px-2 text-center sm:w-[calc(50%-0.75rem)] sm:max-w-[11rem] md:w-[calc(33.333%-0.75rem)] md:max-w-[10rem] xl:min-w-0 xl:w-auto xl:max-w-none xl:flex-1 xl:px-1">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-bank-primary bg-white text-bank-primary dark:border-bank-accent dark:bg-bank-surface dark:text-bank-accent">
                    <FgIcon name={part.icon} className="h-[1.15rem] w-[1.15rem] sm:h-5 sm:w-5" strokeWidth={1.1} />
                  </span>
                  <p className="mt-3 font-display text-[11.5px] font-light leading-tight text-bank-primary dark:text-bank-text sm:mt-4 sm:text-[12px]">{part.title}</p>
                  <p className="mt-1.5 text-[10px] font-normal leading-snug text-[#1a2b4b] dark:text-bank-text-muted sm:mt-2 sm:text-[11px]">{part.body}</p>
                </div>
                {i < parts.length - 1 ? (
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center font-sans text-lg font-light leading-none text-bank-primary sm:hidden xl:flex xl:h-auto xl:w-6 xl:self-center xl:text-2xl"
                    aria-hidden
                  >
                    +
                  </span>
                ) : null}
              </Fragment>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-16px' }}
          transition={{ duration: 0.35, delay: 0.06, ease: EASE }}
          className={cn('mx-auto mt-10 max-w-3xl', FG_CALLOUT_CENTER)}
        >
          <p className="font-display text-[11px] font-light tracking-tight text-bank-primary dark:text-bank-text">{goalKicker}</p>
          <p className="mt-2 font-display text-[13px] font-light leading-snug text-bank-primary dark:text-bank-text sm:text-[14px]">{goalMain}</p>
          {goalNote ? <p className="mt-3 text-[11px] leading-relaxed text-[#5b6577] dark:text-bank-text-muted">{goalNote}</p> : null}
        </motion.div>
      </div>
    </section>
  );
}

function VergleichTable({ vergleich }) {
  const { colClassic, colBr, rows } = vergleich;

  return (
    <>
      <div className="divide-y divide-[#f0f2f5] border border-[#e4e7ec] bg-white dark:divide-bank-border/50 dark:border-bank-border dark:bg-bank-surface md:hidden">
        {rows.map((row) => (
          <div key={row.k} className="p-4">
            <p className="text-[12px] font-semibold text-bank-primary dark:text-bank-text">{row.label}</p>
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6b7280] dark:text-bank-text-muted">{colClassic}</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#5a6270] dark:text-bank-text-muted">{row.classic}</p>
              </div>
              <div className={cn('rounded-sm p-3', FG_HIGHLIGHT_CELL)}>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-bank-primary dark:text-bank-text">{colBr}</p>
                <p className="mt-1.5 text-[12.5px] font-medium leading-relaxed text-[#2d3745] dark:text-bank-text">{row.br}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden border border-[#e4e7ec] bg-white dark:border-bank-border dark:bg-bank-surface md:block">
        <table className="w-full border-collapse text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-[#e4e7ec] bg-[#f4f5f7] dark:border-bank-border dark:bg-bank-bg">
              <th className="w-[min(18%,8rem)] px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6b7280] dark:text-bank-text-muted">
                Kriterium
              </th>
              <th className="px-4 py-3.5 font-semibold text-bank-primary dark:text-bank-text">{colClassic}</th>
              <th className="relative w-[34%] border-l-[3px] border-l-bank-gold bg-bank-gold-soft/50 px-4 py-3.5 font-semibold text-bank-primary dark:bg-bank-gold/10 dark:text-bank-text">
                {colBr}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.k} className="border-b border-[#f0f2f5] last:border-0 dark:border-bank-border/50">
                <td className="px-4 py-3.5 text-[12px] font-semibold text-bank-primary dark:text-bank-text">{row.label}</td>
                <td className="break-words px-4 py-3.5 text-[#5a6270] dark:text-bank-text-muted">{row.classic}</td>
                <td className="break-words border-l border-bank-border bg-bank-gold-soft/40 px-4 py-3.5 font-medium text-bank-primary dark:border-bank-border dark:bg-bank-gold/5 dark:text-bank-text">
                  {row.br}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AusschuettungLucideMark({ lucide, accent, className }) {
  const tone = accent === 'gold' ? 'text-bank-gold' : 'text-bank-primary';
  const ic = cn('h-10 w-10 shrink-0 sm:h-11 sm:w-11', tone, className);

  if (lucide === 'coins') {
    return <Coins className={ic} strokeWidth={LUCIDE_STROKE} aria-hidden />;
  }
  if (lucide === 'chartUp') {
    return <ChartColumnIncreasing className={ic} strokeWidth={LUCIDE_STROKE} aria-hidden />;
  }
  if (lucide === 'handCoins') {
    return <HandCoins className={ic} strokeWidth={LUCIDE_STROKE} aria-hidden />;
  }
  if (lucide === 'history') {
    return <History className={ic} strokeWidth={LUCIDE_STROKE} aria-hidden />;
  }
  if (lucide === 'euroCycle') {
    return (
      <span className={cn('relative inline-flex h-10 w-10 shrink-0 items-center justify-center sm:h-11 sm:w-11', className)} aria-hidden>
        <RefreshCw className={cn('h-9 w-9 text-bank-primary sm:h-10 sm:w-10')} strokeWidth={LUCIDE_STROKE} />
        <span className="pointer-events-none absolute font-sans text-[11px] font-bold tabular-nums text-bank-primary dark:text-bank-text sm:text-[12px]">
          €
        </span>
      </span>
    );
  }
  return <CircleCheck className={ic} strokeWidth={LUCIDE_STROKE} aria-hidden />;
}

function AusschuettungFlowRow({ steps, reduce }) {
  return (
    <div className="flex flex-wrap items-start justify-center gap-y-8 gap-x-1 sm:gap-x-3 lg:gap-x-10">
      {steps.map((step, i) => (
        <Fragment key={step.key}>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-12px' }}
            transition={{ duration: 0.38, delay: reduce ? 0 : 0.06 * i, ease: EASE }}
            className="flex min-w-[6.5rem] max-w-[12rem] flex-col items-center px-1 text-center sm:min-w-[7.5rem]"
          >
            <div className="flex h-[4.25rem] items-end justify-center">
              <AusschuettungLucideMark lucide={step.lucide} accent={step.accent} />
            </div>
            <div className="mt-4 space-y-0.5">
              {step.lines.map((line, li) => (
                <p
                  key={li}
                  className={cn(
                    'font-sans text-[11px] leading-snug text-bank-primary dark:text-bank-text sm:text-[11.5px]',
                    li === 0 ? 'font-semibold' : 'font-medium text-[#243044] dark:text-bank-text-muted'
                  )}
                >
                  {line}
                </p>
              ))}
            </div>
          </motion.div>
          {i < steps.length - 1 ? (
            <div className="flex h-[4.25rem] shrink-0 items-center justify-center px-0.5 sm:px-1" aria-hidden>
              <ArrowRight className="h-5 w-5 text-bank-primary/55 sm:h-6 sm:w-6 dark:text-white/35" strokeWidth={LUCIDE_STROKE} />
            </div>
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}

/** Referenz «Ausschüttung & Rückzahlung»: zwei Icon-Zeilen, Lucide line pack, Navy + Gold. */
function AusschuettungSection({ reduce }) {
  const { eyebrow, eyebrowTagline, rowReturns, rowExit } = fgAusschuettung;

  return (
    <section className={cn('border-b', RULE, 'bg-white py-12 dark:bg-bank-surface sm:py-16')} aria-labelledby="fg-ausschuettung-heading">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-10">
        <header className="border-b border-[#eeeeee] pb-8 dark:border-white/10">
          <div className="flex flex-wrap items-start gap-4">
            <span className={FG_SECTION_NUM}>
              6
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id="fg-ausschuettung-heading"
                className={FG_H2}
              >
                {eyebrow}
                {eyebrowTagline ? <span className="font-semibold"> {eyebrowTagline}</span> : null}
              </h2>
              <div className={cn(FG_RULE_W, 'max-w-4xl')} aria-hidden />
            </div>
          </div>
        </header>

        <div className="mt-10 space-y-12 sm:mt-12 sm:space-y-14">
          <AusschuettungFlowRow steps={rowReturns} reduce={reduce} />
          <AusschuettungFlowRow steps={rowExit} reduce={reduce} />
        </div>
      </div>
    </section>
  );
}

function SparkontoColumnIcon({ visual }) {
  const ring =
    'flex h-[3.65rem] w-[3.65rem] shrink-0 items-center justify-center rounded-full border border-bank-primary bg-white sm:h-14 sm:w-14 dark:border-bank-accent/80 dark:bg-bank-surface';
  const ic = 'h-10 w-10 text-bank-primary dark:text-bank-accent sm:h-11 sm:w-11';
  if (visual === 'inflation') {
    return (
      <span className={ring}>
        <TrendingDown className={ic} strokeWidth={LUCIDE_STROKE} aria-hidden />
      </span>
    );
  }
  if (visual === 'capMarket') {
    return (
      <span className={ring}>
        <TrendingUp className={ic} strokeWidth={LUCIDE_STROKE} aria-hidden />
      </span>
    );
  }
  return (
    <span className={ring}>
      <Landmark className={ic} strokeWidth={LUCIDE_STROKE} aria-hidden />
    </span>
  );
}

/** Referenz «Warum nicht nur Sparkonto?»: Serif-Kopf, drei Säulen mit Trennlinien, Custom-Icons, CTA-Kasten. */
function SparkontoSection({ reduce }) {
  const { eyebrow, cols, ctaSegments } = fgSparkonto;

  return (
    <section className={cn('border-b', RULE, 'bg-white py-12 dark:bg-bank-surface sm:py-16')} aria-labelledby="fg-sparkonto-heading">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-10">
        <header className="border-b border-[#eeeeee] pb-8 dark:border-white/10">
          <div className="flex flex-wrap items-start gap-4">
            <span className={FG_SECTION_NUM}>
              10
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id="fg-sparkonto-heading"
                className={FG_H2}
              >
                {eyebrow}
              </h2>
              <div className={FG_RULE_SHORT} aria-hidden />
            </div>
          </div>
        </header>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-28px' }}
          transition={{ duration: 0.4, ease: EASE }}
          className="mt-8 overflow-hidden rounded-lg border border-[#e4e7ec] shadow-sm dark:border-bank-border sm:mt-10"
        >
          <FgEditorialPhoto
            photo={fgEditorialPhotos.sparkontoPlanning}
            className="h-[min(11rem,32vw)] min-h-[9.5rem] w-full sm:h-[12.5rem]"
            sizes="(min-width: 1280px) 1240px, 100vw"
          />
        </motion.div>

        <div className="mt-10 grid grid-cols-1 divide-y divide-[#eeeeee] md:mt-12 md:grid-cols-3 md:divide-x md:divide-y-0 dark:divide-white/10">
          {cols.map((col, i) => (
            <motion.div
              key={col.key}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.4, delay: reduce ? 0 : 0.07 * i, ease: EASE }}
              className="flex flex-col items-center px-5 py-10 text-center md:py-8 md:pb-12 md:pt-4 lg:px-10"
            >
              <SparkontoColumnIcon visual={col.visual} />
              <h3 className={cn(FG_H3_SM, 'mt-6')}>{col.titleUpper}</h3>
              <p className="mt-3 max-w-[24rem] text-[12.5px] leading-relaxed text-[#5a6270] dark:text-bank-text-muted">{col.body}</p>
            </motion.div>
          ))}
        </div>

        {ctaSegments?.length ? (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-16px' }}
            transition={{ duration: 0.38, delay: 0.08, ease: EASE }}
            className={cn('mx-auto mt-10 max-w-4xl', FG_CALLOUT_CENTER, 'sm:mt-12')}
          >
            <p className="text-[12.5px] font-medium leading-relaxed text-bank-primary dark:text-bank-text sm:text-[13px]">
              {ctaSegments.map((seg, idx) =>
                seg.accent ? (
                  <span key={idx} className="font-semibold text-bank-gold">
                    {seg.text}
                  </span>
                ) : (
                  <span key={idx}>{seg.text}</span>
                )
              )}
            </p>
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}

/** Referenz «11. Unser Investmentprozess»: Kreis-Icons in einer Linie, nummerierte Titel, Lupe/Mappe/Schild-Varianten. */
function InvestmentprozessSection({ reduce }) {
  const { eyebrow, steps } = fgInvProcess5;

  return (
    <section className={cn('border-b', RULE, 'bg-white py-12 dark:bg-bank-surface sm:py-16')} aria-labelledby="fg-invproc-heading">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-10">
        <header className="border-b border-bank-border/70 pb-8 dark:border-white/12">
          <div className="flex flex-wrap items-start gap-4 sm:gap-5">
            <span className={FG_SECTION_NUM}>
              11
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id="fg-invproc-heading"
                className={FG_H2}
              >
                {eyebrow}
              </h2>
              <div className="rule-accent-sm mt-3 max-w-[10rem]" aria-hidden />
            </div>
          </div>
        </header>

        <div className="relative mt-10 md:mt-12">
          {/*
            Horizontale Linie exakt durch Icon-Mitte (lg):
            padding-top lg:py-8 = 2rem, Icon-Hoehe sm+ = 4.75rem → Mitte bei 2rem + 2.375rem
          */}
          <div
            className="pointer-events-none absolute left-[4%] right-[4%] z-0 hidden border-0 border-t border-dashed border-bank-border/80 lg:block dark:border-white/22"
            style={{ top: 'calc(2rem + 2.375rem)' }}
            aria-hidden
          />
          <div className="relative z-[1] overflow-hidden rounded-xl border border-bank-border/70 bg-bank-bg/40 dark:border-bank-border dark:bg-bank-bg/50">
            <div className="grid min-w-0 grid-cols-1 divide-y divide-bank-border/70 lg:grid-cols-5 lg:divide-x lg:divide-y-0 dark:divide-white/14">
              {steps.map((s, i) => {
                const InvIcon = s.visual ? FG_INV_VISUAL_ICONS[s.visual] : null;
                return (
                  <motion.div
                    key={s.key}
                    initial={reduce ? false : { opacity: 0, y: 12 }}
                    whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-12px' }}
                    transition={{ duration: 0.38, delay: reduce ? 0 : 0.06 * i, ease: EASE }}
                    className="flex min-h-0 min-w-0 flex-col items-center px-4 py-9 text-center sm:px-5 lg:px-4 lg:py-8"
                  >
                    <div className="relative z-[1] flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-full border-2 border-bank-primary/35 bg-bank-surface shadow-[0_2px_8px_rgb(8_30_56/0.08)] dark:border-bank-accent/40 dark:bg-bank-surface sm:h-[4.75rem] sm:w-[4.75rem]">
                      {InvIcon ? (
                        <InvIcon
                          className="h-10 w-10 text-bank-primary dark:text-bank-accent sm:h-11 sm:w-11"
                          strokeWidth={LUCIDE_STROKE}
                          aria-hidden
                        />
                      ) : null}
                    </div>
                    <h3 className={cn(FG_H3, 'mt-5 max-w-[14rem] lg:max-w-[14rem]')}>
                      <span className="text-bank-primary dark:text-bank-accent">{i + 1}.</span>{' '}
                      {s.title}
                    </h3>
                    <p className="mt-3 max-w-[16rem] text-[13px] leading-relaxed text-bank-text-muted">{s.body}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const PHIL_ICON_STROKE = 1.45;

/** Referenz «Unsere Investmentphilosophie»: Serif-Kopf, Kasten, 5 Säulen mit Trennlinien, Icons in hellblauem Ring. */
function PhilosophieSection({ reduce }) {
  const { eyebrow, items } = fgPhilosophie;

  return (
    <section className={cn('border-b', RULE, 'bg-white py-12 dark:bg-bank-surface sm:py-16')} aria-labelledby="fg-philosophie-heading">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-10">
        <header className="border-b border-[#eeeeee] pb-8 dark:border-white/10">
          <div className="flex flex-wrap items-start gap-4">
            <span className={FG_SECTION_NUM}>
              12
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id="fg-philosophie-heading"
                className={FG_H2}
              >
                {eyebrow}
              </h2>
              <div className={FG_RULE_SHORT} aria-hidden />
            </div>
          </div>
        </header>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-28px' }}
          transition={{ duration: 0.4, ease: EASE }}
          className="mt-8 overflow-hidden rounded-lg border border-[#e4e7ec] shadow-sm dark:border-bank-border sm:mt-10"
        >
          <FgEditorialPhoto
            photo={fgEditorialPhotos.philosophieTogether}
            className="h-[min(12rem,36vw)] min-h-[10rem] w-full sm:h-[13.5rem]"
            sizes="(min-width: 1280px) 1240px, 100vw"
          />
        </motion.div>

        <div className="mt-10 border border-[#dfe3ea] bg-white px-4 py-8 shadow-[0_1px_0_rgb(0_0_0/0.02)] dark:border-bank-border dark:bg-bank-bg dark:shadow-none sm:mt-12 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
          <div className="grid grid-cols-1 divide-y divide-[#eeeeee] dark:divide-white/10 lg:grid-cols-5 lg:divide-x lg:divide-y-0">
            {items.map((item, i) => (
              <motion.div
                key={item.key}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-16px' }}
                transition={{ duration: 0.38, delay: reduce ? 0 : 0.06 * i, ease: EASE }}
                className="flex flex-col items-center px-5 py-9 text-center first:pt-5 last:pb-5 lg:px-6 lg:py-4 lg:first:pt-4 lg:last:pb-4"
              >
                <span className="flex h-[3.65rem] w-[3.65rem] shrink-0 items-center justify-center rounded-full border border-bank-accent/70 bg-bank-surface text-bank-primary shadow-[inset_0_1px_0_rgb(255_255_255/0.9)] dark:border-bank-accent/45 dark:bg-bank-surface sm:h-14 sm:w-14">
                  <FgIcon name={item.icon} className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={PHIL_ICON_STROKE} />
                </span>
                <p className="mt-6 max-w-[16rem] font-display text-[12px] font-light leading-snug tracking-tight text-bank-primary dark:text-bank-text lg:max-w-[14rem] sm:text-[13px]">
                  {item.title}
                </p>
                <p className="mt-3 max-w-[18rem] text-[12.5px] leading-relaxed text-[#5a6270] dark:text-bank-text-muted">{item.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function FondsGrundlagenInfographic() {
  const reduce = useReducedMotion();
  const heroParentVariants = reduce
    ? { hidden: {}, visible: { transition: { staggerChildren: 0, delayChildren: 0 } } }
    : heroStaggerParent;
  const heroChildVariants = reduce
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0, transition: { duration: 0 } } }
    : heroStaggerChild;

  return (
    <div className="min-h-screen overflow-x-clip bg-bank-bg text-bank-text">
      {/* Hero — editorial full-bleed (aligned with Spezial-AIF) */}
      <section className="relative isolate flex min-h-[min(68vh,42rem)] flex-col overflow-hidden border-b border-bank-border bg-bank-ink text-white lg:min-h-[min(74vh,48rem)]">
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
          <FundPhoto
            alt=""
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
        <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1280px] flex-1 flex-col px-5 py-14 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
          <div className="grid flex-1 gap-10 lg:grid-cols-12 lg:items-start lg:gap-x-10">
            <div className="min-w-0 lg:col-span-7 lg:max-w-[40rem]">
              <motion.div
                initial={reduce ? false : 'hidden'}
                animate="visible"
                variants={heroParentVariants}
                className="will-change-[opacity,transform]"
              >
                <motion.div variants={heroChildVariants} className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <img
                    src={LOGO_SRC}
                    alt=""
                    width={168}
                    height={52}
                    className="h-7 w-auto opacity-95 sm:h-8"
                    loading="eager"
                    decoding="async"
                  />
                  <span className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-white/45">
                    {fgHero.brandLine}
                  </span>
                </motion.div>
                <span className="sr-only">Fröhlich Vermögensberatung</span>

                <motion.h1
                  variants={heroChildVariants}
                  className={cn(
                    'mt-6 max-w-xl font-display font-light leading-[1.08] text-white text-balance',
                    'text-[clamp(1.55rem,0.5rem+3.2vw,2.55rem)] tracking-[-0.02em]',
                    'drop-shadow-[0_3px_32px_rgb(0_0_0/0.42)]'
                  )}
                  style={{ fontVariationSettings: "'opsz' 132, 'SOFT' 100" }}
                >
                  {fgHero.title}
                </motion.h1>

                {fgHero.tagline ? (
                  <motion.p
                    variants={heroChildVariants}
                    className="mt-3 font-display text-xl font-light tracking-[0.02em] text-bank-accent sm:text-[1.45rem] [text-shadow:0_2px_24px_rgb(0_0_0/0.35)]"
                  >
                    {fgHero.tagline}
                  </motion.p>
                ) : null}

                <motion.p
                  variants={heroChildVariants}
                  className="mt-2 text-[12px] font-medium uppercase tracking-[0.14em] text-white/68 sm:text-[13px]"
                >
                  {fgHero.subtitle}
                </motion.p>

                <motion.span
                  variants={heroChildVariants}
                  aria-hidden
                  className="mt-6 block h-px max-w-sm bg-gradient-to-r from-bank-accent via-bank-gold/65 to-transparent sm:mt-7"
                />

                <motion.p
                  variants={heroChildVariants}
                  className="mt-6 max-w-xl text-[1.02rem] leading-[1.78] tracking-[0.01em] text-white/[0.88] sm:mt-7"
                >
                  {fgHero.intro}
                </motion.p>

                <motion.div variants={heroChildVariants} className="mt-8 sm:mt-9">
                  <Link
                    to="/spezial-aif"
                    className={cn(
                      'group inline-flex w-fit items-center gap-2 rounded-xl border border-white/18 bg-white/[0.07] px-5 py-3.5 text-[13px] font-semibold text-white',
                      'shadow-[0_1px_0_0_rgb(255_255_255/0.06)_inset,0_12px_40px_-16px_rgb(0_0_0/0.45)] backdrop-blur-[6px]',
                      'transition-[background-color,border-color,color,transform] duration-300 ease-editorial',
                      'hover:border-bank-accent/55 hover:bg-bank-accent/18 hover:text-white',
                      !reduce && 'hover:-translate-y-0.5',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(7,18,34)]'
                    )}
                  >
                    <span className="text-bank-accent transition-colors duration-300 group-hover:text-white">
                      Zum Produktinformationsblatt
                    </span>
                    <ArrowUpRight
                      className="h-4 w-4 shrink-0 text-bank-accent/90 transition-colors duration-300 group-hover:text-white"
                      aria-hidden
                    />
                  </Link>
                </motion.div>
              </motion.div>
            </div>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0 : 0.55, delay: reduce ? 0 : 0.12, ease: EASE }}
              className="w-full lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:pt-2 xl:max-w-[20rem] xl:justify-self-end"
            >
              <FgHeroKpiStrip />
            </motion.div>
          </div>
        </div>
      </section>

      {/* 1 — Prozess 7 (Print-Referenz: weiß, Spalten, Serif-Titel, dünne Trennlinien) */}
      <section className={cn('border-b', RULE, 'bg-white py-12 dark:bg-bank-surface sm:py-16')} aria-labelledby="fg-process-heading">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-10">
          <ProcessSevenStrip reduce={reduce} />
        </div>
      </section>

      <div className={cn('border-b', RULE, 'bg-bank-bg/80 py-9 dark:bg-bank-bg/55 sm:py-11')}>
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-10">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45, ease: EASE }}
            className="overflow-hidden rounded-lg border border-[#e4e7ec] shadow-[0_12px_40px_-24px_rgb(15_23_42/0.2)] dark:border-bank-border"
          >
            <FgEditorialPhoto
              photo={fgEditorialPhotos.bandInstitutional}
              className="h-[min(15rem,38vw)] min-h-[11.5rem] w-full sm:h-[17rem]"
              sizes="(min-width: 1280px) 1240px, 100vw"
            />
          </motion.div>
        </div>
      </div>

      <section className={cn('border-b', RULE, 'bg-white py-12 dark:bg-bank-surface sm:py-16')} aria-labelledby="fg-allocation-heading">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-10">
          <header className="mb-10 flex flex-wrap items-start gap-4 sm:mb-12">
            <span className={FG_SECTION_NUM}>
              2
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id="fg-allocation-heading"
                className={cn(FG_H2, 'max-w-3xl')}
              >
                {fgAllocationEyebrow}
              </h2>
              <div className={cn(FG_RULE_W, 'max-w-3xl')} aria-hidden />
            </div>
          </header>
          <AllocationFigure reduce={reduce} />
        </div>
      </section>

      <SectionShell n={3} eyebrow={fgRiskSteering.eyebrow}>
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start lg:gap-12">
          <ul className="divide-y divide-[#eceef2] dark:divide-bank-border lg:col-span-7">
            {fgRiskSteering.items.map((item) => (
              <li key={item.key} className="flex gap-5 py-5 first:pt-0 last:pb-0 sm:gap-6">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-bank-primary/20 text-bank-primary">
                  <FgIcon name={item.icon} className="h-5 w-5" strokeWidth={LUCIDE_STROKE} />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-[13px] font-light text-bank-primary dark:text-bank-text">{item.title}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-[#5c6575] dark:text-bank-text-muted">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-24px' }}
            transition={{ duration: 0.42, ease: EASE }}
            className="lg:col-span-5"
          >
            <div className="overflow-hidden rounded-lg border border-[#e4e7ec] shadow-sm dark:border-bank-border lg:sticky lg:top-8">
              <FgEditorialPhoto
                photo={fgEditorialPhotos.riskCalmOffice}
                className="aspect-[4/3] w-full max-h-[280px] lg:max-h-[min(100vh-6rem,26rem)] lg:aspect-auto lg:min-h-[17.5rem]"
                sizes="(min-width: 1024px) 400px, 100vw"
              />
            </div>
          </motion.div>
        </div>
      </SectionShell>

      <SectionShell n={4} eyebrow={fgAfterInvest.eyebrow} subtle>
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start lg:gap-12">
          <ol className="relative mx-auto w-full max-w-2xl lg:col-span-7 lg:mx-0">
            <div
              className="absolute bottom-6 left-[1.125rem] top-6 w-[2px] dark:opacity-80"
              style={{
                background:
                  'repeating-linear-gradient(to bottom, #c5cad6 0px, #c5cad6 7px, transparent 7px, transparent 14px)',
              }}
              aria-hidden
            />
            {fgAfterInvest.steps.map((s, idx) => {
              const StepIcon = FG_AFTER_INVEST_LUCIDE[idx];
              return (
                <li key={s.key} className="relative flex gap-5 pb-10 pl-12 last:pb-0">
                  <span className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-bank-bg text-bank-primary shadow-sm ring-1 ring-bank-border dark:border-bank-surface dark:bg-bank-surface dark:ring-bank-border">
                    {StepIcon ? (
                      <StepIcon className="h-4 w-4" strokeWidth={LUCIDE_STROKE} aria-hidden />
                    ) : (
                      <Target className="h-4 w-4" strokeWidth={STROKE} aria-hidden />
                    )}
                  </span>
                  <div>
                    <p className="font-display text-[13px] font-light text-bank-primary dark:text-bank-text">{s.title}</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-[#5c6575] dark:text-bank-text-muted">{s.body}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-24px' }}
            transition={{ duration: 0.42, delay: 0.04, ease: EASE }}
            className="lg:col-span-5"
          >
            <div className="overflow-hidden rounded-lg border border-[#e4e7ec] shadow-sm dark:border-bank-border lg:sticky lg:top-8">
              <FgEditorialPhoto
                photo={fgEditorialPhotos.afterInvestTeam}
                className="aspect-[4/3] w-full max-h-[260px] lg:max-h-[min(100vh-6rem,28rem)] lg:aspect-auto lg:min-h-[18rem]"
                sizes="(min-width: 1024px) 400px, 100vw"
              />
            </div>
          </motion.div>
        </div>
      </SectionShell>

      <RenditeFormulaSection reduce={reduce} />

      <AusschuettungSection reduce={reduce} />

      <SectionShell n={7} eyebrow={fgGeeignet.eyebrow}>
        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          <div className="border border-[#e4e7ec] border-l-[3px] border-l-emerald-600 bg-white p-6 dark:border-bank-border dark:bg-bank-bg">
            <h3 className={FG_H3_SM}>{fgGeeignet.geeignetTitle}</h3>
            <ul className="mt-4 space-y-3">
              {fgGeeignet.geeignet.map((line) => (
                <li key={line} className="flex gap-2.5 text-[12.5px] leading-snug text-[#4a5568] dark:text-bank-text-muted">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" strokeWidth={2} aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="border border-[#e4e7ec] border-l-[3px] border-l-rose-600 bg-white p-6 dark:border-bank-border dark:bg-bank-bg">
            <h3 className={FG_H3_SM}>{fgGeeignet.nichtTitle}</h3>
            <ul className="mt-4 space-y-3">
              {fgGeeignet.nicht.map((line) => (
                <li key={line} className="flex gap-2.5 text-[12.5px] leading-snug text-[#4a5568] dark:text-bank-text-muted">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-700 dark:text-rose-400" strokeWidth={2} aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SectionShell>

      <SectionShell n={8} eyebrow={fgVergleich.eyebrow} subtle>
        <VergleichTable vergleich={fgVergleich} />
      </SectionShell>

      <SectionShell n={9} eyebrow={fgPortal.eyebrow}>
        <p className="mb-10 max-w-2xl text-[13px] leading-relaxed text-[#5c6575] dark:text-bank-text-muted">{fgPortal.lead}</p>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="relative mx-auto w-full max-w-[22rem]">
            <div className="rounded-[10px] border-[9px] border-[#1e293b] bg-[#0f172a] p-1.5 shadow-[0_24px_60px_-20px_rgb(15_23_42/0.55)]">
              <div className="aspect-video overflow-hidden bg-[#f8fafc]">
                <PortalChartMock />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-[26%] max-w-[6.5rem] rounded-md border-[5px] border-[#1e293b] bg-[#0f172a] p-1 shadow-xl sm:-right-2 sm:bottom-6">
              <div className="aspect-[9/18] rounded-[2px] bg-gradient-to-b from-bank-primary/20 via-[#e8eef5] to-white dark:from-bank-primary/25 dark:to-bank-surface" />
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-px bg-[#e4e7ec] dark:bg-bank-border">
            {fgPortal.features.map((f) => (
              <li key={f.key} className="flex flex-col bg-white p-5 dark:bg-bank-surface">
                <FgIcon name={f.icon} className="h-5 w-5 text-bank-primary" />
                <p className="mt-3 font-display text-[12px] font-light uppercase tracking-wide text-bank-primary dark:text-bank-text">{f.title}</p>
                <p className="mt-2 text-[11.5px] leading-relaxed text-[#5c6575] dark:text-bank-text-muted">{f.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </SectionShell>

      <SparkontoSection reduce={reduce} />

      <InvestmentprozessSection reduce={reduce} />

      <PhilosophieSection reduce={reduce} />

      <SectionShell n={13} eyebrow={fgLegal.eyebrow}>
        <p className="max-w-3xl text-[12.5px] leading-relaxed text-[#5a6270] dark:text-bank-text-muted">{fgLegal.body}</p>
        <div className="mt-8 flex flex-wrap items-start gap-4 border-l-[3px] border-bank-primary/40 pl-5">
          <FileText className="mt-0.5 h-5 w-5 shrink-0 text-bank-primary" strokeWidth={STROKE} aria-hidden />
          <div>
            <Link
              to={fgLegal.linkTo}
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-bank-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/35 focus-visible:ring-offset-2 dark:text-bank-accent"
            >
              {fgLegal.linkLabel}
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </SectionShell>

      <footer className="bg-bank-ink text-white">
        <div className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 lg:px-10 lg:py-14">
          <div className="flex flex-col gap-10 border-b border-white/10 pb-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-6">
              <img src={LOGO_SRC} alt="" width={168} height={52} className="h-8 w-auto opacity-95" loading="lazy" decoding="async" />
            </div>
            <p className="max-w-md text-[11px] leading-relaxed text-white/55 lg:text-right">Fröhlich Vermögensberatung Spezial-AIF — strukturierte Kapitalanlage im institutionellen Rahmen.</p>
          </div>
          <div className="mt-10 grid gap-9 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {fgFooterValues.map((fv) => (
              <div key={fv.key} className="flex gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-white">
                  <FgIcon name={fv.icon} className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[12.5px] font-semibold tracking-wide text-white/95">{fv.title}</p>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/68">{fv.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
