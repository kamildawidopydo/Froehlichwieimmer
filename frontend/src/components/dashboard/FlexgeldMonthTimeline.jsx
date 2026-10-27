import React from 'react';
import { Lock, RefreshCw } from 'lucide-react';

const LOCK_MONTHS = 3;

const monthsBetween = (from, to) => {
  const a = new Date(from);
  const b = new Date(to);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
};

export const FlexgeldMonthTimeline = ({ activeFrom, activeUntil, laufzeitMonate }) => {
  const total = Math.max(
    LOCK_MONTHS + 1,
    Number(laufzeitMonate) || (activeUntil ? monthsBetween(activeFrom, activeUntil) : 12) || 12,
  );
  const current = Math.min(total, Math.max(1, monthsBetween(activeFrom, new Date()) + 1));
  const months = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <div className="px-5 py-4 border-b border-bank-border/50" data-testid="flexgeld-month-timeline">
      <p className="text-sm font-semibold text-bank-text mb-3">Laufzeit und Verfügbarkeit</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="flex items-start gap-3" data-testid="flexgeld-locked-phase">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100">
            <Lock size={16} className="text-slate-600" />
          </span>
          <div>
            <p className="text-sm font-semibold text-bank-text">Monat 1 – {LOCK_MONTHS} · Fest gebunden</p>
            <p className="text-xs text-bank-text-muted">In den ersten {LOCK_MONTHS} Monaten ist kein Zugriff auf Ihr Geld möglich.</p>
          </div>
        </div>
        <div className="flex items-start gap-3" data-testid="flexgeld-flexible-phase">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50">
            <RefreshCw size={16} style={{ color: '#16A34A' }} />
          </span>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#15803D' }}>Monat {LOCK_MONTHS + 1} – {total} · Flexibel verfügbar</p>
            <p className="text-xs text-bank-text-muted">Ab dem {LOCK_MONTHS + 1}. Monat können Sie flexibel über Ihr Geld verfügen.</p>
          </div>
        </div>
      </div>
      <div className="flex items-center overflow-x-auto pb-1">
        {months.map((n) => {
          const locked = n <= LOCK_MONTHS;
          const isNow = n === current;
          return (
            <React.Fragment key={n}>
              {n > 1 && (
                <span className="h-0.5 min-w-[8px] flex-1" style={{ backgroundColor: locked ? '#CBD5E1' : '#16A34A' }} />
              )}
              <span
                data-testid={`flexgeld-month-${n}`}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white ${isNow ? 'ring-2 ring-offset-2 ring-bank-primary' : ''}`}
                style={{ backgroundColor: locked ? '#94A3B8' : '#16A34A' }}
                title={isNow ? 'Aktueller Monat' : undefined}
              >
                {n}
              </span>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default FlexgeldMonthTimeline;
