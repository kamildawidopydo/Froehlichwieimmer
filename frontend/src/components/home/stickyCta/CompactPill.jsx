import { MessageCircleQuestion, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';

// gleiche Bottom-Klasse wie im Sticky-Root — als Konstante hier gehalten,
// weil CompactPill mit fixed=true als eigenständiger Portal-Kind rendern kann.
const BOTTOM =
  'bottom-[max(4.5rem,calc(env(safe-area-inset-bottom,0px)+4rem+var(--live-ticker-h,0px)))] sm:bottom-[max(0.875rem,calc(env(safe-area-inset-bottom,0px)+0.5rem+var(--live-ticker-h,0px)))]';

/**
 * CompactPill — kompakter Restore-Pill für den Sticky-CTA.
 * Wird nur im Restore-State verwendet (nach Dismiss).
 * Mobile Single-Line ~56 px hoch mit nur Haupttext, Desktop 3-Zeilen.
 * Fluide Breite via clamp(15.5rem,78vw,22rem) + max-w calc(100vw-1rem).
 */
function CompactPill({ onClick, className, testId, ariaLabel, fixed = true, pulse = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative inline-flex w-[clamp(15.5rem,78vw,22rem)] max-w-[calc(100vw-1rem)] items-center gap-2.5 rounded-2xl border-2 border-bank-primary/25 bg-white px-2.5 py-1.5 text-left',
        'min-h-[3.5rem] sm:min-h-[6rem] sm:gap-4 sm:px-5 sm:py-4',
        'shadow-[0_12px_28px_-12px_rgb(9_33_66/0.22)] sm:shadow-[0_20px_50px_-18px_rgb(9_33_66/0.30)]',
        'transition-all duration-200 ease-out',
        'sm:hover:-translate-y-0.5 sm:hover:scale-[1.02] hover:border-bank-primary/55 hover:bg-bank-primary/[0.04] sm:hover:shadow-[0_28px_64px_-18px_rgb(9_33_66/0.38)]',
        'active:scale-[0.98] sm:active:scale-[1.045] active:bg-bank-primary/[0.07] active:border-bank-primary/65',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-2',
        'dark:border-bank-border dark:bg-bank-surface-elev',
        pulse && 'sticky-cta-pulse',
        fixed && ['fixed z-[90]', BOTTOM, 'right-4 sm:right-5'],
        className,
      )}
      data-testid={testId}
      data-pulse={pulse ? 'true' : 'false'}
      aria-label={ariaLabel}
    >
      <span
        aria-hidden
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-bank-primary/20 bg-[rgb(var(--bank-primary)/0.10)] text-bank-primary',
          'shadow-[0_4px_12px_-6px_rgb(76_124_186/0.55)] transition-colors',
          'group-hover:bg-[rgb(var(--bank-primary)/0.16)] group-hover:border-bank-primary/35',
          'sm:h-16 sm:w-16 sm:rounded-xl',
        )}
      >
        <MessageCircleQuestion className="h-[1.05rem] w-[1.05rem] sm:h-7 sm:w-7" strokeWidth={LUCIDE_STROKE} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col sm:gap-0.5">
        <span className="hidden font-mono text-[11px] font-semibold uppercase tracking-[0.20em] text-bank-primary sm:inline">
          Kurzfragebogen
        </span>
        <span className="truncate text-[14px] font-semibold leading-[1.15] tracking-tight text-bank-ink sm:text-[18px]">
          Fragen beantworten
        </span>
        <span className="hidden text-[12.5px] leading-snug text-bank-text-muted sm:block">
          In wenigen Minuten zur persönlichen Empfehlung
        </span>
      </span>
      <ArrowRight
        aria-hidden
        strokeWidth={LUCIDE_STROKE}
        className={cn(
          'ml-0.5 h-[0.9rem] w-[0.9rem] shrink-0 text-bank-text-muted/60 transition-all sm:ml-1 sm:h-[1.05rem] sm:w-[1.05rem]',
          'group-hover:translate-x-0.5 group-hover:text-bank-primary',
        )}
      />
    </button>
  );
}

export default CompactPill;
