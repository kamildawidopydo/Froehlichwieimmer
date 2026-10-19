import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import AnimatedNumber from '@/components/AnimatedNumber';
import { useDashboardMotion } from '@/components/dashboard/motion/dashboardMotion';

/**
 * KPIStatCard — editorial KPI tile.
 */
const KPIStatCard = ({
  label,
  value,
  formattedValue,
  format,
  icon: Icon,
  hint,
  delta,
  deltaLabel,
  variant = 'default',
  action,
  className,
  motionDelay = 0,
}) => {
  const { panel } = useDashboardMotion();
  const isInk = variant === 'ink';
  const isHighlight = variant === 'highlight';
  const isSuccess = variant === 'success';
  const isDanger = variant === 'danger';

  const wrapClasses = cn(
    'group relative flex min-w-0 flex-col gap-3 overflow-hidden border bg-white p-4 transition-all duration-300 sm:p-5',
    'sm:hover:shadow-editorial-md sm:hover:-translate-y-px',
    isHighlight && 'border-bank-gold/35 bg-bank-gold-soft/10',
    isSuccess && 'border-emerald-200/60 bg-emerald-50/40',
    isDanger && 'border-rose-200/60 bg-rose-50/40',
    isInk &&
      'border-bank-primary/28 bg-gradient-to-br from-bank-surface-elev via-white to-bank-gold-soft/25 text-bank-text shadow-[inset_0_1px_0_rgb(255_255_255/0.5)] dark:border-bank-border dark:from-bank-surface dark:via-bank-bg dark:to-bank-surface-elev',
    !isInk && !isHighlight && !isSuccess && !isDanger && 'border-bank-border',
    className,
  );

  const deltaPositive = (delta ?? 0) >= 0;

  return (
    <motion.div
      {...panel}
      transition={panel.transition ? { ...panel.transition, delay: motionDelay } : undefined}
      className={wrapClasses}
    >
      <span
        aria-hidden
        className={cn(
          'absolute inset-x-0 top-0 h-px bg-gradient-to-r',
          isInk ? 'from-bank-primary/40 via-bank-gold/35 to-transparent' : 'from-bank-gold/55 via-bank-gold/35 to-transparent',
        )}
      />

      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className={cn('flex min-w-0 items-center gap-2', isInk ? 'text-bank-primary/80 dark:text-bank-accent/85' : 'text-bank-text-muted')}>
          {Icon ? (
            <Icon size={14} strokeWidth={1.32} className={cn('shrink-0', isInk ? 'text-bank-primary dark:text-bank-accent' : 'text-bank-gold')} />
          ) : null}
          <span className="truncate font-mono text-[9px] font-medium uppercase tracking-[0.16em] sm:text-[10px] sm:tracking-[0.22em]">
            {label}
          </span>
        </div>
        {delta != null && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 border px-1.5 py-0.5 font-mono text-[10px] font-medium tabular-nums',
              deltaPositive
                ? isInk
                  ? 'border-emerald-400/45 bg-emerald-50/90 text-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-200'
                  : 'border-emerald-300/55 bg-emerald-50 text-emerald-700'
                : isInk
                  ? 'border-rose-400/45 bg-rose-50/90 text-rose-800 dark:bg-rose-950/35 dark:text-rose-200'
                  : 'border-rose-300/55 bg-rose-50 text-rose-700',
            )}
          >
            {deltaPositive ? <ArrowUpRight size={10} strokeWidth={1.32} /> : <ArrowDownRight size={10} strokeWidth={1.32} />}
            {deltaPositive ? '+' : ''}
            {Number(delta).toFixed(2)}%
          </span>
        )}
      </div>

      <div className="min-w-0">
        {formattedValue != null ? (
          <p className="rate-figure block break-all text-[1.45rem] leading-[1.05] tabular-nums text-bank-text sm:text-[1.95rem] sm:break-normal lg:text-[2.15rem]">
            {formattedValue}
          </p>
        ) : (
          <AnimatedNumber
            value={Number(value || 0)}
            format={format}
            className="rate-figure block break-all text-[1.45rem] leading-[1.05] tabular-nums text-bank-text sm:text-[1.95rem] sm:break-normal lg:text-[2.15rem]"
          />
        )}
        {(hint || deltaLabel) && (
          <p className="mt-1.5 break-words text-[11px] leading-snug text-bank-text-muted sm:text-[12px]">{hint || deltaLabel}</p>
        )}
      </div>

      {action ? (
        <>
          <span aria-hidden className="mt-1 block h-px w-10 bg-bank-gold/45" />
          <div className="pt-1">{action}</div>
        </>
      ) : null}
    </motion.div>
  );
};

export default KPIStatCard;
