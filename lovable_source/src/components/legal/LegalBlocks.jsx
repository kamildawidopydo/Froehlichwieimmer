import React from 'react';
import { cn } from '@/lib/utils';

const cardBase =
  'rounded-xl border border-bank-border bg-white shadow-editorial-sm transition-[border-color,box-shadow] duration-200 dark:bg-bank-surface';

export const LegalSection = ({ id, icon: Icon, title, badge, children, className }) => (
  <section id={id} className={cn('scroll-mt-28', className)}>
    <div className="mb-5 flex items-start gap-3.5">
      {Icon ? (
        <span
          aria-hidden
          className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-bank-border bg-bank-surface-elev text-bank-primary dark:bg-bank-surface"
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.35} />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {badge ? (
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-bank-gold">{badge}</span>
          ) : null}
          <h2 className="font-display text-[1.28rem] font-light leading-snug text-bank-text">{title}</h2>
        </div>
      </div>
    </div>
    <div className="legal-section-body space-y-4 pl-0 sm:pl-[3.375rem]">{children}</div>
  </section>
);

export const LegalInfoCard = ({ icon: Icon, label, title, children, className, href, to: To, as: As, nowrap = false }) => {
  const inner = (
    <>
      <div className="flex items-start gap-3">
        {Icon ? (
          <span
            aria-hidden
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bank-primary/[0.07] text-bank-primary dark:bg-bank-accent/10 dark:text-bank-accent"
          >
            <Icon className="h-4 w-4" strokeWidth={1.4} />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          {label ? (
            <p
              className={cn(
                'font-mono uppercase text-bank-text-muted',
                nowrap ? 'whitespace-nowrap text-[10px] tracking-[0.14em]' : 'text-[9px] tracking-[0.22em]'
              )}
            >
              {label}
            </p>
          ) : null}
          {title ? <p className="mt-1 text-[15px] font-semibold leading-snug text-bank-text">{title}</p> : null}
          <div
            className={cn(
              'mt-2 text-[14px] leading-relaxed text-bank-text-muted [&_a]:font-medium [&_a]:text-bank-primary [&_a]:underline-offset-[3px] hover:[&_a]:underline',
              nowrap &&
                'overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_a]:inline-block [&_a]:whitespace-nowrap [&_a]:text-[13px] sm:[&_a]:text-[14px] [&_a[href^="tel:"]]:tabular-nums [&_a[href^="tel:"]]:tracking-normal'
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </>
  );

  const cardClass = cn(
    cardBase,
    'p-5 sm:p-6',
    (href || To) && 'cursor-pointer hover:border-bank-accent/35 hover:shadow-editorial-md',
    className
  );

  if (href) {
    return (
      <a href={href} className={cn(cardClass, 'block no-underline')}>
        {inner}
      </a>
    );
  }
  if (To) {
    const Link = As;
    return (
      <Link to={To} className={cn(cardClass, 'block no-underline')}>
        {inner}
      </Link>
    );
  }
  return <article className={cardClass}>{inner}</article>;
};

export const LegalFactStrip = ({ facts, className }) => (
  <div
    className={cn(
      'grid gap-3 sm:grid-cols-2 lg:grid-cols-3',
      className
    )}
  >
    {facts.map((fact) => (
      <div
        key={fact.label}
        className="rounded-xl border border-bank-border bg-gradient-to-br from-white to-bank-surface-elev/80 px-5 py-4 shadow-editorial-sm dark:from-bank-surface dark:to-bank-surface-elev/60"
      >
        <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-bank-gold">{fact.label}</p>
        <p className="mt-2 break-all text-[14px] font-medium leading-snug text-bank-text">{fact.value}</p>
        {fact.hint ? <p className="mt-1.5 text-[12px] leading-relaxed text-bank-text-muted">{fact.hint}</p> : null}
      </div>
    ))}
  </div>
);

export const LegalNotice = ({ variant = 'info', icon: Icon, title, children, className }) => {
  const styles = {
    info: 'border-bank-primary/20 bg-bank-primary/[0.04] dark:bg-bank-primary/[0.08]',
    warning: 'border-amber-500/30 bg-amber-50/80 dark:border-amber-500/25 dark:bg-amber-950/20',
    neutral: 'border-bank-border bg-bank-surface-elev/90 dark:bg-bank-surface/80',
  };

  return (
    <div
      className={cn(
        'rounded-xl border px-5 py-5 sm:px-6 sm:py-6',
        styles[variant] || styles.info,
        className
      )}
    >
      <div className="flex gap-4">
        {Icon ? (
          <Icon
            className={cn(
              'mt-0.5 h-5 w-5 shrink-0',
              variant === 'warning' ? 'text-amber-700 dark:text-amber-400' : 'text-bank-primary dark:text-bank-accent'
            )}
            strokeWidth={1.35}
            aria-hidden
          />
        ) : null}
        <div className="min-w-0">
          {title ? <p className="text-[15px] font-semibold text-bank-text">{title}</p> : null}
          <div className={cn('text-[14px] leading-[1.72] text-bank-text-muted', title && 'mt-2')}>{children}</div>
        </div>
      </div>
    </div>
  );
};

export const LegalRightsGrid = ({ items, className }) => (
  <ul className={cn('grid gap-2.5 sm:grid-cols-2', className)}>
    {items.map((item) => (
      <li
        key={item}
        className="flex items-start gap-3 rounded-lg border border-bank-border/80 bg-bank-surface-elev/50 px-4 py-3.5 dark:bg-bank-surface/60"
      >
        <span
          aria-hidden
          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bank-gold"
        />
        <span className="text-[14px] leading-snug text-bank-text-muted">{item}</span>
      </li>
    ))}
  </ul>
);

export const LegalClause = ({ id, number, title, children }) => (
  <section id={id} className="scroll-mt-28 rounded-xl border border-bank-border bg-white p-5 shadow-editorial-sm sm:p-7 dark:bg-bank-surface">
    <div className="mb-4 flex items-center gap-3 border-b border-bank-border/70 pb-4">
      <span className="inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg bg-bank-ink px-2 font-mono text-[12px] font-medium tracking-wide text-white">
        {number}
      </span>
      <h2 className="font-display text-[1.15rem] font-light leading-snug text-bank-text">{title}</h2>
    </div>
    <div className="space-y-3 text-[15px] leading-[1.78] text-bank-text-muted [&_strong]:font-semibold [&_strong]:text-bank-text">
      {children}
    </div>
  </section>
);

export const LegalFormTemplate = ({ children, className }) => (
  <div
    className={cn(
      'relative overflow-hidden rounded-xl border border-dashed border-bank-border bg-[#fbfaf8] p-6 font-mono text-[13px] leading-relaxed text-bank-text sm:p-8 dark:bg-bank-surface-elev/40',
      className
    )}
  >
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-8 w-px bg-bank-border/60 sm:left-10"
    />
    <div className="relative pl-6 sm:pl-8 [&_p]:text-bank-text-muted [&_strong]:text-bank-text">{children}</div>
  </div>
);

export const LegalKeyValue = ({ label, value, className }) => (
  <div className={cn('rounded-lg border border-bank-border/70 bg-bank-surface-elev/40 px-4 py-3.5 dark:bg-bank-surface/50', className)}>
    <dt className="font-mono text-[9px] uppercase tracking-[0.2em] text-bank-text-muted">{label}</dt>
    <dd className="mt-1.5 text-[14px] leading-relaxed text-bank-text">{value}</dd>
  </div>
);

export const LegalStepList = ({ steps, className }) => (
  <ol className={cn('space-y-4', className)}>
    {steps.map((step, index) => (
      <li key={step.title} className="flex gap-4">
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-bank-gold/40 bg-bank-gold/10 font-mono text-[11px] font-medium text-bank-gold"
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="text-[15px] font-medium text-bank-text">{step.title}</p>
          {step.body ? <p className="mt-1.5 text-[14px] leading-relaxed text-bank-text-muted">{step.body}</p> : null}
        </div>
      </li>
    ))}
  </ol>
);
