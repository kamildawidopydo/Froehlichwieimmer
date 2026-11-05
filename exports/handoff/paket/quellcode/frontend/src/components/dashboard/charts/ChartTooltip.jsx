import React from 'react';
import { cn } from '@/lib/utils';

export function ChartTooltipFrame({ label, children, className }) {
  if (!label && !children) return null;
  return (
    <div
      className={cn(
        'rounded-lg border border-bank-border bg-white px-3 py-2 text-xs shadow-editorial-sm dark:bg-bank-surface dark:border-bank-border',
        className,
      )}
    >
      {label ? <p className="mb-1 font-semibold text-bank-text">{label}</p> : null}
      {children}
    </div>
  );
}

const TONE_CLASS = {
  default: 'text-bank-text',
  muted: 'text-bank-text-muted',
  success: 'text-bank-success',
  error: 'text-bank-error',
  primary: 'text-bank-primary',
  gold: 'text-bank-gold',
  accent: 'text-bank-accent',
};

export function ChartTooltipRow({ label, value, tone = 'default', className, divider }) {
  return (
    <p
      className={cn(
        'text-bank-text-muted',
        divider && 'mt-1 border-t border-bank-border/60 pt-1',
        className,
      )}
    >
      {label}:{' '}
      <span className={cn('font-semibold tabular-nums', TONE_CLASS[tone] || TONE_CLASS.default)}>
        {value}
      </span>
    </p>
  );
}

/** Generic Recharts tooltip body — pass as `<Tooltip content={...} />`. */
export function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  rows,
}) {
  if (!active || !payload?.length) return null;
  const title = labelFormatter ? labelFormatter(label) : label;

  if (rows) {
    return (
      <ChartTooltipFrame label={title}>
        {rows(payload, label)}
      </ChartTooltipFrame>
    );
  }

  return (
    <ChartTooltipFrame label={title}>
      {payload.map((p) => (
        <ChartTooltipRow
          key={String(p.dataKey ?? p.name)}
          label={p.name}
          value={p.value}
          tone="default"
        />
      ))}
    </ChartTooltipFrame>
  );
}

export default ChartTooltipFrame;
