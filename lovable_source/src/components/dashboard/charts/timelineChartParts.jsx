import React from 'react';
import { cn } from '@/lib/utils';
import { CHART_FONT } from './chartTheme';

export const formatTimelineAxisDate = (value) => {
  if (!value) return '–';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '–';
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

export const TimelineTrack = ({ className, children }) => (
  <div
    className={cn(
      'relative h-7 flex-1 overflow-hidden rounded-md border border-bank-border/50 bg-bank-bg/80',
      className,
    )}
  >
    {children}
  </div>
);

/** Vertical “Heute” marker — use on overflow-visible container only (e.g. LockTimeline). */
export const TodayMarker = ({ pct = 0, showLabel = true, className, labelAbove = true }) => (
  <div
    className={cn('pointer-events-none absolute z-10', labelAbove ? 'bottom-0 top-0' : 'inset-y-0', className)}
    style={{ left: `${pct}%` }}
    aria-hidden
  >
    <div className="absolute inset-y-0 w-px -translate-x-1/2 border-l border-dashed border-bank-error/60" />
    {showLabel ? (
      <span
        className={cn(
          'absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded border border-bank-error/30 bg-white px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.06em] text-bank-error shadow-sm dark:bg-bank-surface',
          labelAbove ? '-top-5' : 'top-1/2 -translate-y-1/2',
        )}
      >
        Heute
      </span>
    ) : null}
  </div>
);

export const TimelineAxis = ({ leftGutter = 0, startLabel, endLabel, className }) => (
  <div
    className={cn(
      'mb-2 flex items-center justify-between border-b border-bank-border/40 pb-2 text-[10px] tabular-nums text-bank-text-muted',
      className,
    )}
    style={{ marginLeft: leftGutter, fontFamily: CHART_FONT }}
  >
    <span className="font-semibold uppercase tracking-wide text-bank-error">{startLabel}</span>
    <span>{endLabel}</span>
  </div>
);

export const TimelineRow = ({
  active,
  onEnter,
  onLeave,
  onFocus,
  onBlur,
  className,
  children,
  delayMs = 0,
}) => (
  <div
    className={cn(
      'group rounded-lg px-2 py-2 transition-colors duration-200',
      active ? 'bg-bank-primary/[0.06] ring-1 ring-bank-primary/15' : 'hover:bg-bank-bg/60',
      className,
    )}
    style={{ animationDelay: `${delayMs}ms` }}
    onMouseEnter={onEnter}
    onMouseLeave={onLeave}
    onFocus={onFocus}
    onBlur={onBlur}
    tabIndex={0}
    role="group"
  >
    {children}
  </div>
);

/** Small dot at end of a timeline bar (maturity / lock end). */
export const TimelineEndDot = ({ pct = 100, color = 'currentColor', className }) => (
  <div
    className={cn('pointer-events-none absolute top-1/2 z-20 -translate-y-1/2', className)}
    style={{ left: `${pct}%` }}
    aria-hidden
  >
    <div
      className="h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-white shadow-sm"
      style={{ backgroundColor: color }}
    />
  </div>
);
