import React from 'react';
import { formatDate } from '@/lib/dashboardFormatters';

/**
 * Visualises the lock window for a Flexgeld contract.
 * Renders the active_from -> lock_until span as a horizontal bar with a
 * "today" marker. Falls back gracefully when only some inputs are provided.
 */
const LockProgressBar = ({
  activeFrom,
  lockUntil,
  isLocked,
  lockProgressPct,
  daysRemaining,
  className = '',
}) => {
  if (!activeFrom || !lockUntil) return null;
  const pct =
    lockProgressPct == null
      ? 0
      : Math.min(100, Math.max(0, Number(lockProgressPct) || 0));

  return (
    <div className={className}>
      <div className="flex items-center justify-between text-[10px] text-bank-text-muted mb-1">
        <span>Beginn {formatDate(activeFrom)}</span>
        <span className={isLocked ? 'text-bank-primary font-semibold' : 'text-emerald-700 font-semibold'}>
          Lock-Ende {formatDate(lockUntil)}
        </span>
      </div>
      <div className="relative h-2 w-full bg-bank-border/30 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all ${
            isLocked ? 'bg-bank-primary' : 'bg-emerald-500'
          }`}
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-white shadow-sm"
          style={{
            left: `calc(${pct}% - 6px)`,
            background: isLocked ? 'rgb(124 58 237)' : 'rgb(5 150 105)',
          }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-bank-text-muted mt-1">
        <span>{pct.toFixed(0)} % der Festbindung</span>
        <span>
          {isLocked
            ? `noch ${daysRemaining ?? 0} Tage gebunden`
            : 'Frei verfügbar'}
        </span>
      </div>
    </div>
  );
};

export default LockProgressBar;
