import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Admin subpage chrome — editorial.
 *
 * - AdminSubpageLayout : porcelain background container, editorial gutters.
 * - AdminSubpageHeader : eyebrow + Fraunces title (with optional brass-bordered icon)
 *                        + back button + brass mini-rule + actions slot.
 * - AdminToolbarCard   : toolbar surface (white, brass top hairline on hover).
 * - AdminSurfaceCard   : main content surface (white, brass top hairline).
 * - adminTheadClass    : table header — porcelain band with brass top hairline.
 * - adminRowHover      : row hover — gentle porcelain wash.
 */

export function AdminSubpageLayout({ children, className }) {
  return (
    <div className={cn('bg-bank-bg', className)}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">{children}</div>
    </div>
  );
}

export function AdminSubpageHeader({
  eyebrow = 'Admin',
  title,
  titleIcon: TitleIcon,
  description,
  backTo = '/admin',
  actions,
}) {
  const navigate = useNavigate();
  return (
    <div className="relative mb-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <button
            type="button"
            onClick={() => navigate(backTo)}
            className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center border border-bank-border bg-white text-bank-text-muted transition-all duration-300 hover:border-bank-gold/55 hover:text-bank-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35"
            aria-label="Zurück zum Admin-Bereich"
          >
            <ArrowLeft size={17} strokeWidth={1.5} />
          </button>
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
              <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-gold" />
              {eyebrow}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3.5">
              {TitleIcon ? (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-bank-gold/55 bg-bank-ink text-bank-gold">
                  <TitleIcon size={18} strokeWidth={1.5} />
                </span>
              ) : null}
              <h1
                className="font-display text-[1.75rem] font-light leading-[1.05] tracking-[-0.01em] text-bank-text sm:text-[2rem]"
                style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 60" }}
              >
                {title}
              </h1>
            </div>
            <span aria-hidden className="mt-5 block h-px w-16 bg-bank-gold/55" />
            {description ? (
              <p className="mt-4 max-w-2xl text-[13.5px] leading-[1.7] text-bank-text-muted">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-start gap-2 sm:items-end sm:justify-end">{actions}</div> : null}
      </div>
    </div>
  );
}

export function AdminToolbarCard({ children, className }) {
  return (
    <div className={cn('relative mb-6 border border-bank-border bg-white p-4 transition-shadow duration-300 hover:shadow-editorial-sm', className)}>
      <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/45 via-bank-gold/25 to-transparent" />
      {children}
    </div>
  );
}

export function AdminSurfaceCard({ children, className }) {
  return (
    <div className={cn('relative overflow-hidden border border-bank-border bg-white shadow-editorial-sm', className)}>
      <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/55 via-bank-gold/35 to-transparent" />
      {children}
    </div>
  );
}

// Table primitives — used by AdminUsers, AdminBanks, etc.
export const adminTheadClass =
  'border-b border-bank-border bg-bank-bg/60 [&_th]:font-mono [&_th]:text-[10.5px] [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-[0.18em] [&_th]:text-bank-text-muted';

export const adminRowHover = 'hover:bg-bank-bg/40 transition-colors';
