import { Percent, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import DiscountStampBadge from '@/components/home/DiscountStampBadge';

/** Header promo box — compact single-row strip. */
export const AktienHeaderPromo = ({ compact = false }) => (
  <div
    className={cn(
      'relative flex min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-emerald-200/90 bg-emerald-50/90',
      compact ? 'px-2 py-1' : 'px-2.5 py-1.5',
    )}
  >
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-bank-primary shadow-[0_2px_8px_-2px_rgb(45_100_255/0.35)]',
        compact ? 'h-6 w-6' : 'h-7 w-7',
      )}
    >
      <Tag
        className={cn('text-white', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')}
        strokeWidth={LUCIDE_STROKE}
        aria-hidden
      />
    </span>
    <p
      className={cn(
        'min-w-0 flex-1 font-semibold leading-tight text-bank-ink',
        compact ? 'text-[10px]' : 'text-[11px] sm:text-[11px]',
      )}
    >
      Aktien unter Marktwert — bis zu{' '}
      <span className="text-emerald-700">4&nbsp;% Rabatt</span>
    </p>
    <DiscountStampBadge rate="4%" className="hidden shrink-0 sm:block" size="xs" />
  </div>
);

/** Bottom premium banner inside question card. */
export const AktienPremiumBanner = ({ compact = false }) => (
  <div
    className={cn(
      'flex items-center gap-2 overflow-hidden rounded-lg border border-emerald-300/80 bg-emerald-50/90',
      compact ? 'mt-4 px-3 py-2.5' : 'mt-5 px-3.5 py-3.5 sm:items-center sm:gap-4 sm:px-4 sm:py-4',
    )}
  >
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-emerald-500 shadow-[0_2px_8px_-2px_rgb(16_185_129/0.45)]',
        compact ? 'h-8 w-8' : 'h-10 w-10',
      )}
    >
      <Percent
        className={cn('text-white', compact ? 'h-3.5 w-3.5' : 'h-[1.15rem] w-[1.15rem]')}
        strokeWidth={LUCIDE_STROKE}
        aria-hidden
      />
    </span>
    <div className="min-w-0 flex-1">
      <p
        className={cn(
          'font-bold uppercase tracking-[0.05em] text-emerald-700',
          compact ? 'text-[11px] leading-snug' : 'text-[11px] sm:text-[12px]',
        )}
      >
        Prämie: Bis zu 4&nbsp;% Rabatt auf Aktien
      </p>
      <p
        className={cn(
          'leading-relaxed text-bank-text-muted',
          compact ? 'mt-0.5 text-[10px] line-clamp-2' : 'mt-1 text-[10px] sm:text-[11px]',
        )}
      >
        Je nach Anlagevolumen und Angebot — unverbindlich nach Ihrer Kurzabfrage.
      </p>
    </div>
    <DiscountStampBadge rate="4%" className="hidden shrink-0 md:block" size="xs" />
  </div>
);

/** Sidebar trust badges — vertical pill list. */
export const AktienTrustBadges = ({ compact = false }) => (
  <div
    className={cn(
      'relative border-t border-[rgb(var(--bank-ink)/0.08)]',
      compact ? 'mt-2.5 space-y-2 pt-2.5' : 'mt-3 space-y-2 pt-3',
    )}
  >
    {[
      ['Reguliert', 'Sicher'],
      ['Beratung', 'Persönlich'],
      ['Konditionen', 'Exklusiv'],
      ['Ablauf', 'Schnell'],
    ].map(([label, pill]) => (
      <div key={label} className="flex items-center gap-2">
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden>
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
        <span className="text-[11px] font-medium text-bank-ink">{label}</span>
        <span className="text-[11px] text-bank-text-muted/70">·</span>
        <span className="rounded-full border border-[#e0e0e0] bg-[#f5f5f5] px-2 py-0.5 text-[10px] font-medium text-bank-text-muted">
          {pill}
        </span>
      </div>
    ))}
  </div>
);
