import React, { memo } from 'react';
import { ArrowUpRight, Heart, Info, Shield, Sparkles, TrendingUp } from 'lucide-react';
import BonusIcon from '@/components/BonusIcon';
import BankLogo from '@/components/BankLogo';
import CountryFlagIcon from '@/components/CountryFlagIcon';
import InterestRateSparkline from '@/components/comparison/InterestRateSparkline';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import { getDisplayProductType } from '@/lib/productDisplay';
import { getOfferRatingBundle } from '@/lib/offerRating';
import { formatRateDe } from '@/lib/interestRateHistory';
import { getCountryLabelDe } from '@/lib/countryFlags';
import { formatComparisonMinDeposit } from '@/lib/comparisonDisplay';

const labelClass =
  'font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-[#6b7280] dark:text-bank-text-muted sm:text-[9.5px] sm:tracking-[0.2em]';

const cmpAccent = 'text-[#1a4295] dark:text-bank-primary';
const cmpMuted = 'text-[#6b7280] dark:text-bank-text-muted';
const cmpStrong = 'text-[#111827] dark:text-bank-text';
const cmpBorder = 'border-[#e5e7eb] dark:border-bank-border';

/** Uniform card copy — national scheme names confuse comparison at a glance. */
const COMPARISON_DEPOSIT_LABEL = 'Europäische Einlagensicherung';

function formatInterestSubline(offer) {
  const freq = (offer.interest_frequency || 'Monatlich').toLowerCase();
  const isFixed = offer.deposit_term > 0 && !freq.includes('monat');
  if (freq.includes('ende') || freq.includes('laufzeit')) return 'variabel · am Ende der Laufzeit';
  if (freq.includes('jahr') || freq.includes('jähr')) return 'variabel · jährlich';
  if (freq.includes('täg')) return 'variabel · täglich';
  return isFixed ? 'fest · am Ende der Laufzeit' : 'variabel · monatlich';
}

function getAvailabilityLabel(offer) {
  if (offer.availability_label) return offer.availability_label;
  const early = (offer.early_withdrawal || '').toLowerCase();
  if (early.includes('jederzeit') || early.includes('täglich')) return 'Täglich verfügbar';
  if (early.includes('kündigung')) return 'Mit Kündigung';
  if (early.includes('fälligkeit') || early.includes('nicht')) return 'Fest gebunden';
  return offer.deposit_term === 0 ? 'Täglich verfügbar' : 'Fest gebunden';
}

function getPremiumBadge(offer, badge) {
  if (badge?.tone === 'gold') return { text: 'EXKLUSIVE KONDITION', tone: 'gold' };
  if (badge?.tone === 'emerald') return { text: 'TOP-ZINS', tone: 'emerald' };
  if (Number(offer.interest_rate) >= 4.5) return { text: 'TOP-ZINS', tone: 'emerald' };
  if (offer.credit_rating?.startsWith('AA') || offer.credit_rating === 'AAA') {
    return { text: 'STABIL & SICHER', tone: 'blue' };
  }
  return null;
}

const ComparisonOfferCard = memo(function ComparisonOfferCard({
  offer,
  badge,
  rateHistory = [],
  isFav,
  featured,
  onOpen,
  onInterest,
  onToggleFavorite,
  navigate,
}) {
  const rate = formatRateDe(offer.interest_rate);
  const rating = getOfferRatingBundle(offer);
  const product = getDisplayProductType(offer);
  const countryDe = getCountryLabelDe(offer.country, { uppercase: true });
  const premium = getPremiumBadge(offer, badge);
  const availability = getAvailabilityLabel(offer);
  const minDep = formatComparisonMinDeposit();
  const depositLabel = COMPARISON_DEPOSIT_LABEL;
  const marketLine = [
    offer.founded_year ? `Seit ${offer.founded_year} am Markt` : null,
    offer.credit_rating ? `Bonität ${offer.credit_rating}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <article
      className={cn(
        'group relative rounded-xl border bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-[0_4px_14px_rgba(15,23,42,0.08)] dark:bg-bank-surface dark:shadow-[0_1px_3px_rgba(0,0,0,0.28)] dark:hover:shadow-[0_4px_14px_rgba(0,0,0,0.35)]',
        cmpBorder,
        featured && 'ring-1 ring-inset ring-amber-400/40',
        premium && 'mt-3'
      )}
    >
      {premium && (
        <div className="absolute left-5 top-0 z-10 -translate-y-1/2">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] shadow-sm',
              premium.tone === 'gold' && 'border-amber-300/80 bg-amber-50 text-amber-800',
              premium.tone === 'emerald' && 'border-emerald-400/50 bg-emerald-50 text-emerald-800',
              premium.tone === 'blue' && 'border-sky-400/50 bg-sky-50 text-sky-800'
            )}
          >
            {premium.tone === 'gold' ? (
              <Sparkles className="h-2.5 w-2.5" strokeWidth={LUCIDE_STROKE} />
            ) : (
              <TrendingUp className="h-2.5 w-2.5" strokeWidth={LUCIDE_STROKE} />
            )}
            {premium.text}
          </span>
        </div>
      )}

      <button
        type="button"
        className={cn('w-full cursor-pointer text-left', premium ? 'pt-7' : 'pt-5')}
        onClick={() => onOpen?.(offer)}
      >
        {/* Flex-wrap: no fixed columns → no clipping in narrow main column */}
        <div className="flex flex-wrap items-start gap-x-6 gap-y-5 px-5 pb-5 sm:gap-x-8 sm:px-6">
          {/* Bank */}
          <div className="flex min-w-[220px] flex-1 basis-[min(100%,280px)] items-start gap-3">
            <BankLogo logo={offer.bank_logo} bankName={offer.bank_name} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h3 className={cn('break-words text-base font-semibold leading-snug sm:text-[17px]', cmpAccent)}>
                  {offer.bank_name}
                </h3>
                {offer.country && (
                  <CountryFlagIcon
                    country={offer.country}
                    size="xs"
                    showLabel
                    labelUppercase
                    labelClassName={cn(
                      'font-mono text-[10px] font-medium uppercase tracking-wider',
                      cmpMuted,
                    )}
                  />
                )}
              </div>
              <p className={cn(labelClass, 'mt-1.5 break-words')}>
                {product} · {countryDe}
              </p>
              {marketLine && (
                <p className={cn('mt-1 break-words text-[11px] leading-relaxed sm:text-[11.5px]', cmpMuted)}>
                  {marketLine}
                </p>
              )}
            </div>
          </div>

          {/* Rate */}
          <div className="min-w-[108px] shrink-0 sm:min-w-[120px]">
            <p className={labelClass}>Zinssatz p.a.</p>
            <div className="mt-1 flex items-baseline gap-0.5">
              <span className={cn('text-[1.75rem] font-semibold leading-none sm:text-[2rem]', cmpAccent)} data-numeric>
                {rate}
              </span>
              <span className={cn('text-sm font-semibold sm:text-base', cmpAccent)}>%</span>
            </div>
            <p className={cn('mt-1 max-w-[11rem] text-[10.5px] leading-snug sm:text-[11px]', cmpMuted)}>
              {formatInterestSubline(offer)}
            </p>
          </div>

          {/* Terms */}
          <div className="min-w-[200px] flex-1 basis-[min(100%,240px)]">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:gap-x-6">
              <div className="min-w-0">
                <p className={labelClass}>Verfügbarkeit</p>
                <p className={cn('mt-1 break-words text-sm font-semibold', cmpAccent)}>{availability}</p>
              </div>
              <div className="min-w-0">
                <p className={labelClass}>Min. Anlage</p>
                <p className={cn('mt-1 text-sm font-semibold', cmpAccent)} data-numeric>
                  {minDep}&nbsp;€
                </p>
              </div>
            </div>
            <div className={cn('mt-3 border-t pt-3', 'border-[#eef0f3] dark:border-bank-border/70')}>
              <p className={labelClass}>Einlagensicherung</p>
              <p className={cn('mt-1 break-words text-[11px] font-medium leading-relaxed sm:text-[11.5px]', 'text-[#374151] dark:text-bank-text-muted')}>
                {depositLabel}
              </p>
            </div>
          </div>

          {/* Trust */}
          <div className="flex min-w-[140px] shrink-0 flex-col items-start gap-2 sm:items-end">
            <div className={cn('inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1.5 sm:px-3', cmpBorder, 'bg-[#f9fafb] dark:bg-bank-surface-elev/50')}>
              <Shield className={cn('h-3.5 w-3.5 shrink-0', cmpAccent)} strokeWidth={LUCIDE_STROKE} />
              <span className={cn('whitespace-nowrap text-[11px] font-semibold tabular-nums sm:text-[12px]', cmpStrong)}>
                {rating.formatted} / 10
              </span>
              <span className="text-[9px] font-medium uppercase tracking-wide text-[#6b7280] dark:text-bank-text-muted sm:text-[10px]">
                Trust
              </span>
            </div>
            <span className={cn('inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold group-hover:underline', cmpAccent)}>
              Details ansehen
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0" strokeWidth={LUCIDE_STROKE} />
            </span>
          </div>
        </div>
      </button>

      {/* Footer */}
      <div className={cn('border-t px-5 py-4 sm:px-6', cmpBorder, 'bg-[#fafbfc] dark:bg-bank-surface-elev/35')}>
        <div className="flex flex-col gap-5 lg:flex-row lg:gap-6">
          <div className={cn('min-w-0 flex-1 lg:max-w-[34%] lg:border-r lg:pr-6', cmpBorder)}>
            <p className={cn(labelClass, 'mb-2')}>Zinsentwicklung</p>
            <InterestRateSparkline history={rateHistory} showLabels />
          </div>
          <div className={cn('min-w-0 flex-1 lg:max-w-[34%] lg:border-r lg:pr-6', cmpBorder)}>
            <p className={cn(labelClass, 'mb-2')}>Regulierung</p>
            <p className={cn('break-words text-sm font-semibold leading-snug', cmpStrong)}>
              {offer.regulator_name || offer.deposit_protection_authority || 'EU-Aufsicht'}
            </p>
            <p className={cn('mt-1 text-[11px] leading-relaxed sm:text-[11.5px]', cmpMuted)}>
              Reguliert nach EU-Bankenrichtlinien
            </p>
          </div>
          <div className="flex min-w-0 flex-1 gap-2 lg:items-start">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9ca3af] dark:text-bank-text-muted/80" strokeWidth={LUCIDE_STROKE} />
            <p className={cn('break-words text-[11px] leading-relaxed sm:text-[11.5px]', cmpMuted)}>
              Kapitalanlagen sind mit Risiken verbunden. Details in den Bedingungen.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-amber-200/60 bg-[#fffbeb] px-5 py-3 dark:border-amber-500/25 dark:bg-amber-950/20 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:px-6">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <BonusIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <p className={cn('min-w-0 break-words text-[13px] leading-relaxed sm:text-sm', 'text-[#374151] dark:text-bank-text-muted')}>
            <span className={cn('font-semibold', cmpAccent)}>
              Neukundenbonus bis zu {Number(offer.bonus_amount).toLocaleString('de-DE')}&nbsp;€
            </span>
            <span className={cmpMuted}> · Vermittlungsbonus 45&nbsp;€ nach erfolgreicher Vermittlung</span>
          </p>
        </div>
        <button
          type="button"
          className={cn('shrink-0 self-start text-xs font-semibold hover:underline sm:self-center', cmpAccent)}
          onClick={(e) => {
            e.stopPropagation();
            onOpen?.(offer);
          }}
        >
          Bedingungen
        </button>
      </div>

      <div
        className={cn('flex flex-wrap items-center gap-2.5 border-t px-5 py-3 sm:px-6', cmpBorder)}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="primary"
          size="default"
          className="h-9 px-5 text-[10px] font-bold uppercase tracking-[0.14em] dark:bg-bank-primary dark:text-[rgb(var(--bank-bg))] dark:hover:bg-bank-primary-hover"
          onClick={() => navigate?.('/apply', { state: { offer } })}
        >
          Bewerben
        </Button>
        <Button
          variant="outline-ink"
          size="default"
          className="h-9 px-5 text-[10px] font-semibold uppercase tracking-[0.14em]"
          onClick={() => onInterest?.(offer)}
        >
          Anfrage
        </Button>
        <button
          type="button"
          onClick={(e) => onToggleFavorite?.(e, offer.id)}
          className={cn(
            'ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors',
            isFav
              ? 'border-amber-400/60 bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
              : cn(cmpBorder, 'text-[#9ca3af] hover:border-amber-400/50 hover:text-amber-600 dark:text-bank-text-muted dark:hover:border-amber-400/50 dark:hover:text-amber-400')
          )}
          aria-label={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten'}
        >
          <Heart className={cn('h-4 w-4', isFav && 'fill-current')} strokeWidth={LUCIDE_STROKE} />
        </button>
      </div>
    </article>
  );
});

export default ComparisonOfferCard;
export { COMPARISON_DEPOSIT_LABEL };
