import React, { memo } from 'react';
import { ArrowUpRight, Heart } from 'lucide-react';
import BankLogo from '@/components/BankLogo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import { getDisplayProductType } from '@/lib/productDisplay';
import { getOfferRatingBundle } from '@/lib/offerRating';
import { formatRateDe } from '@/lib/interestRateHistory';
import CountryFlagIcon from '@/components/CountryFlagIcon';
import { formatComparisonMinDeposit } from '@/lib/comparisonDisplay';

const thClass =
  'px-4 py-3 text-left font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-bank-text-muted';

function getTermLabel(offer) {
  const type = getDisplayProductType(offer);
  if (offer.deposit_term === 0 || type === 'Tagesgeld') return 'Flexibel';
  return `${offer.deposit_term} Mon.`;
}

function getAvailabilityLabel(offer) {
  const early = (offer.early_withdrawal || '').toLowerCase();
  if (early.includes('jederzeit') || early.includes('täglich')) return 'Täglich';
  if (early.includes('kündigung')) return 'Kündbar';
  if (early.includes('fälligkeit') || early.includes('nicht')) return 'Fest';
  return offer.deposit_term === 0 ? 'Täglich' : 'Fest';
}

const ComparisonOfferTable = memo(function ComparisonOfferTable({
  offers,
  favorites = [],
  isFeaturedBank,
  onOpen,
  onToggleFavorite,
  navigate,
}) {
  return (
    <div className="overflow-x-auto border border-bank-border bg-white shadow-editorial-sm">
      <table className="w-full min-w-[920px] border-collapse text-left">
        <thead>
          <tr className="border-b border-bank-border bg-bank-bg/70">
            <th className={thClass}>Bank</th>
            <th className={thClass}>Produkt</th>
            <th className={cn(thClass, 'text-right')}>Zinssatz</th>
            <th className={thClass}>Laufzeit</th>
            <th className={cn(thClass, 'text-right')}>Min. Anlage</th>
            <th className={thClass}>Verfügbarkeit</th>
            <th className={cn(thClass, 'text-right')}>Trust</th>
            <th className={cn(thClass, 'text-right')}>Aktion</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((offer) => {
            const rating = getOfferRatingBundle(offer);
            const product = getDisplayProductType(offer);
            const isFeatured = isFeaturedBank?.(offer);
            const fav = favorites.includes(offer.id);

            return (
              <tr
                key={offer.id}
                className={cn(
                  'group border-b border-bank-border/70 transition-colors last:border-0 hover:bg-bank-bg/50',
                  isFeatured && 'bg-amber-50/40'
                )}
              >
                <td className="px-4 py-3.5">
                  <button
                    type="button"
                    className="flex min-w-0 items-center gap-3 text-left"
                    onClick={() => onOpen?.(offer)}
                  >
                    <BankLogo logo={offer.bank_logo} bankName={offer.bank_name} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-bank-primary group-hover:underline">
                        {offer.bank_name}
                      </span>
                      <CountryFlagIcon
                        country={offer.country}
                        size="xs"
                        showLabel
                        className="mt-0.5"
                        labelClassName="truncate font-mono text-[10px] uppercase tracking-wider text-bank-text-muted"
                      />
                    </span>
                  </button>
                </td>
                <td className="px-4 py-3.5">
                  <button type="button" className="text-sm text-bank-text" onClick={() => onOpen?.(offer)}>
                    {product}
                  </button>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <button
                    type="button"
                    className="inline-flex items-baseline gap-0.5"
                    onClick={() => onOpen?.(offer)}
                  >
                    <span className="rate-figure text-lg font-semibold text-bank-primary" data-numeric>
                      {formatRateDe(offer.interest_rate)}
                    </span>
                    <span className="text-xs font-semibold text-bank-primary">%</span>
                  </button>
                </td>
                <td className="px-4 py-3.5 text-sm text-bank-text">{getTermLabel(offer)}</td>
                <td className="px-4 py-3.5 text-right text-sm font-medium text-bank-text" data-numeric>
                  {formatComparisonMinDeposit()}&nbsp;€
                </td>
                <td className="px-4 py-3.5 text-sm text-bank-text-muted">{getAvailabilityLabel(offer)}</td>
                <td className="px-4 py-3.5 text-right text-sm font-semibold tabular-nums text-bank-text">
                  {rating.formatted}
                </td>
                <td className="px-4 py-3.5">
                  <div
                    className="flex items-center justify-end gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="primary"
                      size="sm"
                      className="h-8 px-3 text-[9px] font-bold uppercase tracking-[0.12em]"
                      onClick={() => navigate?.('/apply', { state: { offer } })}
                    >
                      Bewerben
                    </Button>
                    <button
                      type="button"
                      onClick={() => onOpen?.(offer)}
                      className="flex h-8 w-8 items-center justify-center text-bank-text-muted transition-colors hover:text-bank-primary"
                      aria-label="Details"
                    >
                      <ArrowUpRight className="h-4 w-4" strokeWidth={LUCIDE_STROKE} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => onToggleFavorite?.(e, offer.id)}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-md border transition-colors',
                        fav
                          ? 'border-amber-400/60 bg-amber-50 text-amber-600'
                          : 'border-bank-border text-bank-text-muted hover:border-amber-400/50 hover:text-amber-600'
                      )}
                      aria-label={fav ? 'Aus Favoriten entfernen' : 'Zu Favoriten'}
                    >
                      <Heart className={cn('h-3.5 w-3.5', fav && 'fill-current')} strokeWidth={LUCIDE_STROKE} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

export default ComparisonOfferTable;
