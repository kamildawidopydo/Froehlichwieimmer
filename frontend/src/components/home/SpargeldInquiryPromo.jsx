import {
  Calendar,
  Coins,
  Gem,
  PiggyBank,
  Shield,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import BonusIcon from '@/components/BonusIcon';
import DiscountStampBadge from '@/components/home/DiscountStampBadge';

const BENEFITS_FULL = [
  {
    Icon: BonusIcon,
    title: 'Neukundenbonus',
    description:
      'Einmalig 100 € bis 300 € zusätzlich zu den Zinsen — Willkommensprämie bei teilnehmenden Partnerbanken.',
    stamp: { rate: '300€', bottomLabel: 'BONUS' },
  },
  {
    Icon: Coins,
    title: 'Bonussstaffel',
    description: '100 € ab 10.000 € · 200 € ab 25.000 € · 300 € ab 50.000 € Einlage — je nach Bank und Angebot.',
    pill: '100–300 €',
  },
  {
    Icon: Wallet,
    title: 'Tages-, Fest- & Flexgeld',
    description: 'Passende Verfügbarkeit und Zinskonditionen — von flexibel bis fest verzinst.',
    pill: 'Flexibel',
  },
  {
    Icon: Shield,
    title: 'EU-Einlagensicherung',
    description: 'Einlagen bis 100.000 € pro Kunde und Bank gesetzlich geschützt.',
    pill: 'Sicher',
  },
  {
    Icon: Calendar,
    title: 'Einfache Abwicklung',
    description: 'Kontoeröffnung über Fröhlich Vermögensberatung — Bonus nach Erfüllung der Bedingungen.',
    pill: 'Schnell',
  },
];

const BENEFITS_COMPACT = [
  {
    Icon: BonusIcon,
    title: 'Neukundenbonus',
    description: '100–300 € zusätzlich zu den Zinsen.',
    pill: '300 € max.',
  },
  {
    Icon: Coins,
    title: 'Bonussstaffel',
    description: '100 € / 200 € / 300 € ab 10k · 25k · 50k.',
    pill: 'Staffel',
  },
  {
    Icon: Wallet,
    title: 'Tages- & Festgeld',
    description: 'Flexibel bis fest verzinst.',
    pill: 'Flexibel',
  },
  {
    Icon: Shield,
    title: 'EU-Einlagensicherung',
    description: 'Bis 100.000 € pro Bank geschützt.',
    pill: 'Sicher',
  },
];

const BenefitPill = ({ label }) => (
  <span className="shrink-0 rounded-full border border-[#e0e0e0] bg-[#f5f5f5] px-1.5 py-0.5 text-[9px] font-medium leading-none text-bank-text-muted sm:px-2 sm:text-[10px]">
    {label}
  </span>
);

/** Sidebar — Ihre Vorteile bei Einlagen. */
export const SpargeldBenefitsSidebar = ({ compact = false }) => {
  const benefits = compact ? BENEFITS_COMPACT : BENEFITS_FULL;

  return (
    <div className="flex min-h-0 flex-col">
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border border-[#e0e0e0] bg-white shadow-sm',
          compact ? 'p-2.5' : 'p-3',
        )}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full bg-[radial-gradient(circle_at_center,rgb(var(--bank-ink)/0.06),transparent_70%)]"
        />
        <div className="relative flex items-start gap-2">
          <span
            className={cn(
              'flex shrink-0 items-center justify-center rounded-lg bg-bank-ink text-white shadow-md',
              compact ? 'h-7 w-7' : 'h-8 w-8',
            )}
          >
            <BonusIcon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
          </span>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'font-display font-light leading-tight tracking-tight text-bank-ink',
                compact ? 'text-[12px]' : 'text-[13px]',
              )}
            >
              Ihre Vorteile bei Einlagen
            </p>
            <p
              className={cn(
                'leading-snug text-bank-text-muted',
                compact ? 'mt-0.5 text-[9px] line-clamp-2' : 'mt-1 text-[10px]',
              )}
            >
              Neukundenbonus bis 300 €, attraktive Zinsen und EU-Einlagensicherung.
            </p>
          </div>
          <DiscountStampBadge rate="300€" bottomLabel="BONUS" size="xs" className="shrink-0 scale-[0.92]" />
        </div>

        <ul
          className={cn(
            'relative border-t border-dashed border-[rgb(var(--bank-ink)/0.1)]',
            compact ? 'mt-2 space-y-1.5 pt-2' : 'mt-2.5 space-y-2 pt-2.5',
          )}
        >
          {benefits.map(({ Icon, title, description, stamp, pill }) => (
            <li key={title} className="flex items-start gap-1.5">
              <span
                className={cn(
                  'flex shrink-0 items-center justify-center rounded-md border border-[rgb(var(--bank-ink)/0.1)] bg-[rgb(var(--bank-ink)/0.04)] text-bank-ink',
                  compact ? 'h-6 w-6' : 'h-7 w-7',
                )}
              >
                <Icon className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} strokeWidth={LUCIDE_STROKE} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn('font-semibold leading-snug text-bank-ink', compact ? 'text-[10px]' : 'text-[11px]')}>
                  {title}
                </p>
                <p className={cn('leading-snug text-bank-text-muted', compact ? 'text-[9px] line-clamp-2' : 'mt-0.5 text-[10px]')}>
                  {description}
                </p>
              </div>
              {stamp ? (
                <DiscountStampBadge size="xs" rate={stamp.rate} bottomLabel={stamp.bottomLabel} className="hidden shrink-0 sm:block" />
              ) : (
                <BenefitPill label={pill} />
              )}
            </li>
          ))}
        </ul>

        <p
          className={cn(
            'border-t border-[rgb(var(--bank-ink)/0.08)] leading-snug text-bank-text-muted/80',
            compact ? 'mt-2 pt-1.5 text-[8px]' : 'mt-2.5 pt-2 text-[9px]',
          )}
        >
          * Bonushöhe je nach Bank und Anlagebetrag. Bonus gilt steuerlich als Kapitalertrag.
        </p>
      </div>
    </div>
  );
};

/** Header promo strip — Einlagen. */
export const SpargeldHeaderPromo = ({ compact = false }) => (
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
      <BonusIcon className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
    </span>
    <p
      className={cn(
        'min-w-0 flex-1 font-semibold leading-tight text-bank-ink',
        compact ? 'text-[10px]' : 'text-[11px]',
      )}
    >
      Neukundenbonus — bis zu{' '}
      <span className="text-bank-primary">300&nbsp;€</span> zusätzlich
    </p>
    <DiscountStampBadge rate="300€" bottomLabel="BONUS" size="xs" className="hidden shrink-0 sm:block" />
  </div>
);

/** Bottom banner inside question card. */
export const SpargeldPremiumBanner = ({ compact = false }) => (
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
      <BonusIcon className={compact ? 'h-3.5 w-3.5' : 'h-[1.15rem] w-[1.15rem]'} />
    </span>
    <div className="min-w-0 flex-1">
      <p
        className={cn(
          'font-bold uppercase tracking-[0.05em] text-bank-primary',
          compact ? 'text-[11px] leading-snug' : 'text-[11px] sm:text-[12px]',
        )}
      >
        Prämie: Bis zu 300&nbsp;€ Neukundenbonus
      </p>
      <p
        className={cn(
          'leading-relaxed text-bank-text-muted',
          compact ? 'mt-0.5 text-[10px] line-clamp-2' : 'mt-1 text-[10px] sm:text-[11px]',
        )}
      >
        Zusätzlich zu den Zinsen — ab 10.000 € Einlage bis 300 € je nach Bank und Angebot.
      </p>
    </div>
    <DiscountStampBadge rate="300€" bottomLabel="BONUS" size="xs" className="hidden shrink-0 md:block" />
  </div>
);

/** Icons für Antwort-Optionen (Volumen-Frage). */
export const SPARGELD_VOLUME_ICONS = {
  lt10k: PiggyBank,
  '10k50k': Coins,
  '50k100k': TrendingUp,
  gt100k: Gem,
};
