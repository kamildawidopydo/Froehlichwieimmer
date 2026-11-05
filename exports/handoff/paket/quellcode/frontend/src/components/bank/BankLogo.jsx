import React, { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Session 93 · Phase 4 — Einheitliche Bank-Logo-Komponente.
 *
 * Fallback-Kette:
 *   1. `logo_url` (verifiziert vom Backend)
 *   2. Initialen aus Banknamen
 *
 * Bilder mit Ladefehler fallen automatisch auf Initialen zurück.
 * Layout ist ein festes Quadrat, damit fehlende Logos KEIN Reflow verursachen.
 */
export default function BankLogo({ bank, size = 44, className, testid }) {
  const [failed, setFailed] = useState(false);
  const url = bank?.logo_url;
  const name = bank?.name || bank?.slug || 'Bank';
  const initials = name
    .replace(/[^\p{L}0-9\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'B';

  const dim = { width: size, height: size };

  if (url && !failed) {
    return (
      <img
        src={url}
        alt={name}
        loading="lazy"
        onError={() => setFailed(true)}
        style={dim}
        data-testid={testid || `bank-logo-${bank?.slug}`}
        className={cn(
          'inline-block shrink-0 border border-bank-border bg-white object-contain',
          className
        )}
      />
    );
  }

  // Initialen-Fallback
  return (
    <span
      aria-hidden="true"
      style={dim}
      data-testid={testid || `bank-logo-fallback-${bank?.slug}`}
      className={cn(
        'inline-flex shrink-0 items-center justify-center border border-bank-border bg-bank-bg font-mono text-[11px] font-semibold tracking-wider text-bank-primary',
        className
      )}
    >
      {initials}
    </span>
  );
}
