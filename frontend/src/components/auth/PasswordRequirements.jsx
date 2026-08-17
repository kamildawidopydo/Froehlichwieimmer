import React from 'react';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPasswordRequirementStatus } from '@/lib/passwordPolicy';

/**
 * Live checklist for password complexity (Register, Reset, Profile).
 */
export function PasswordRequirements({ password, className, variant = 'light' }) {
  const items = getPasswordRequirementStatus(password);
  const isDark = variant === 'dark';

  return (
    <ul
      className={cn(
        'space-y-1.5 text-[12px] leading-snug',
        isDark ? 'text-white/70' : 'text-bank-text-muted',
        className,
      )}
      aria-live="polite"
    >
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-2">
          {item.met ? (
            <Check
              className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', isDark ? 'text-emerald-300' : 'text-emerald-600')}
              strokeWidth={2}
              aria-hidden
            />
          ) : (
            <Circle
              className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', isDark ? 'text-white/35' : 'text-bank-border')}
              strokeWidth={1.5}
              aria-hidden
            />
          )}
          <span className={item.met ? (isDark ? 'text-white/90' : 'text-bank-text') : undefined}>
            {item.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
