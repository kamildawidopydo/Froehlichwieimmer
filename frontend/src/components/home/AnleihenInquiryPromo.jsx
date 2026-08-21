import {
  Calendar,
  Coins,
  Gem,
  Landmark,
  Percent,
  Tag,
  TrendingDown,
  TrendingUp,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import DiscountStampBadge from '@/components/home/DiscountStampBadge';

const BENEFITS = [
  {
    Icon: Tag,
    title: 'Exklusive Abschläge',
    description: 'Erwerben Sie Anleihen zu Konditionen unter dem Marktpreis.',
    stamp: { rate: '1,50%', bottomLabel: 'GÜNSTIGER' },
  },
  {
    Icon: TrendingDown,
    title: 'Bessere Einstiegskonditionen',
    description: 'Je nach Emission zahlen Sie weniger Emissions- & Beratungsgebühren.',
    stamp: { rate: '0,80%', bottomLabel: 'ERSPARNIS' },
  },
  {
    Icon: Landmark,
    title: 'Professioneller Zugang',
    description: 'Zugang zu attraktiven Privatplacements und exklusiven Emissionen.',
    pill: 'Exklusiv',
  },
  {
    Icon: Calendar,
    title: 'Planbare Erträge',
    description: 'Regelmäßige Zinszahlungen und klare Laufzeitstruktur.',
    pill: 'Planbar',
  },
  {
    Icon: User,
    title: 'Persönliche Betreuung',
    description: 'Individuelle Beratung durch unsere erfahrenen Spezialisten.',
    pill: 'Persönlich',
  },
];

const BenefitPill = ({ label }) => (
  <span className="shrink-0 rounded-full border border-[#e0e0e0] bg-[#f5f5f5] px-2 py-0.5 text-[10px] font-medium text-bank-text-muted">
    {label}
  </span>
);

const EmeraldCheck = () => (
  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-bank-gold" aria-hidden>
    <circle cx="8" cy="8" r="8" fill="currentColor" opacity="0.15" />
    <path
      d="M5 8l2 2 4-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Sidebar — Ihre Vorteile bei Anleihen. */
export const AnleihenBenefitsSidebar = ({ compact = false }) => (
  <div className={cn('flex min-h-0 flex-col', compact ? 'gap-2' : 'gap-2.5')}>
    <div className="relative rounded-xl border border-[#e0e0e0] bg-white p-3 shadow-sm">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-[radial-gradient(circle_at_center,rgb(var(--bank-ink)/0.06),transparent_70%)]"
      />
      <div className="relative flex items-start gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bank-ink text-white shadow-md">
          <Percent className="h-4 w-4" strokeWidth={LUCIDE_STROKE} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-display text-[13px] font-light leading-tight tracking-tight text-bank-ink">
            Ihre Vorteile bei Anleihen
          </p>
          <p className="mt-1 text-[10px] leading-snug text-bank-text-muted">
            Attraktive Konditionen, reduzierte Erwerbskosten und professionelle Betreuung beim Anleihenhandel.
          </p>
        </div>
      </div>

      <ul
        className={cn(
          'relative space-y-2.5 border-t border-dashed border-[rgb(var(--bank-ink)/0.1)]',
          compact ? 'mt-2.5 pt-2.5' : 'mt-3 pt-3',
        )}
      >
        {BENEFITS.map(({ Icon, title, description, stamp, pill }) => (
          <li key={title} className="flex flex-wrap items-start gap-x-2 gap-y-1.5 sm:flex-nowrap">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[rgb(var(--bank-ink)/0.1)] bg-[rgb(var(--bank-ink)/0.04)] text-bank-ink">
              <Icon className="h-3.5 w-3.5" strokeWidth={LUCIDE_STROKE} aria-hidden />
            </span>
            <div className="min-w-0 flex-1 basis-[calc(100%-2.25rem)] sm:basis-auto">
              <p className="text-[11px] font-semibold leading-snug text-bank-ink">{title}</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-bank-text-muted">{description}</p>
            </div>
            {stamp ? (
              <DiscountStampBadge size="xs" rate={stamp.rate} bottomLabel={stamp.bottomLabel} className="ml-auto sm:ml-0" />
            ) : (
              <div className="flex shrink-0 items-center gap-1.5 pt-0.5 sm:ml-0">
                <EmeraldCheck />
                <BenefitPill label={pill} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>

    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-bank-signature/30 bg-bank-signature/[0.06] px-2.5 py-2 sm:flex-nowrap">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bank-primary shadow-[0_2px_8px_-2px_rgb(76_124_186/0.35)]">
        <Coins className="h-3.5 w-3.5 text-white" strokeWidth={LUCIDE_STROKE} aria-hidden />
      </span>
      <p className="text-[10px] leading-snug text-bank-text">
        Preisvorteil vs. normaler Handel:{' '}
        <span className="font-semibold">bis zu 1,50&nbsp;% günstiger*</span>
      </p>
      <DiscountStampBadge
        rate="1,50%"
        bottomLabel="GÜNSTIGER"
        size="xs"
        className="hidden shrink-0 sm:block"
      />
    </div>

    <p className="px-0.5 text-[9px] leading-snug text-bank-text-muted/80">
      * Beispielhafte Ersparnis je nach Anleihe und Konditionen.
    </p>
  </div>
);

/** Header promo strip — Anleihen (Aktien-Stil). */
export const AnleihenHeaderPromo = ({ compact = false }) => (
  <div
    className={cn(
      'relative flex min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-bank-signature/25 bg-bank-signature/[0.06]',
      compact ? 'px-2 py-1' : 'px-2.5 py-1.5',
    )}
  >
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-bank-primary shadow-[0_2px_8px_-2px_rgb(76_124_186/0.35)]',
        compact ? 'h-6 w-6' : 'h-7 w-7',
      )}
    >
      <Percent className={cn('text-white', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} strokeWidth={LUCIDE_STROKE} aria-hidden />
    </span>
    <p
      className={cn(
        'min-w-0 flex-1 font-semibold leading-tight text-bank-ink',
        compact ? 'text-[10px]' : 'text-[11px]',
      )}
    >
      Anleihen unter Marktpreis — bis zu{' '}
      <span className="text-bank-primary">1,50&nbsp;% günstiger</span>
    </p>
    <DiscountStampBadge rate="1,50%" bottomLabel="GÜNSTIGER" size="xs" className="hidden shrink-0 sm:block" />
  </div>
);

/** Bottom banner inside question card — Aktien-Stil. */
export const AnleihenPremiumBanner = ({ compact = false }) => (
  <div
    className={cn(
      'flex items-center gap-2 overflow-hidden rounded-lg border border-bank-signature/30 bg-bank-signature/[0.06]',
      compact ? 'mt-4 px-3 py-2.5' : 'mt-5 px-3.5 py-3.5 sm:items-center sm:gap-4 sm:px-4 sm:py-4',
    )}
  >
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-bank-primary shadow-[0_2px_8px_-2px_rgb(76_124_186/0.35)]',
        compact ? 'h-8 w-8' : 'h-10 w-10',
      )}
    >
      <Percent className={cn('text-white', compact ? 'h-3.5 w-3.5' : 'h-[1.15rem] w-[1.15rem]')} strokeWidth={LUCIDE_STROKE} aria-hidden />
    </span>
    <div className="min-w-0 flex-1">
      <p
        className={cn(
          'font-bold uppercase tracking-[0.05em] text-bank-primary',
          compact ? 'text-[11px] leading-snug' : 'text-[11px] sm:text-[12px]',
        )}
      >
        Preisvorteil: Bis zu 1,50&nbsp;% günstiger*
      </p>
      <p
        className={cn(
          'leading-relaxed text-bank-text-muted',
          compact ? 'mt-0.5 text-[10px] line-clamp-2' : 'mt-1 text-[10px] sm:text-[11px]',
        )}
      >
        Gegenüber dem normalen Handel — abhängig von Emission und Konditionen.
      </p>
    </div>
    <DiscountStampBadge rate="1,50%" bottomLabel="GÜNSTIGER" size="xs" className="hidden shrink-0 md:block" />
  </div>
);

/** Icons für Antwort-Optionen (Volumen-Frage). */
export const ANLEIHEN_VOLUME_ICONS = {
  lt10k: Coins,
  '10k50k': Coins,
  '50k100k': TrendingUp,
  gt100k: Gem,
};
