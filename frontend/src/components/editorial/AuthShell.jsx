import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import Eyebrow from '@/components/editorial/Eyebrow';
import BrandLogo from '@/components/BrandLogo';

/**
 * Split-screen auth shell.
 *
 * Left brand panel (lg+ only):  Eyebrow + Fraunces italic title + brass rule + lede + colophon.
 * Right form column:            mobile back link, logo, header, slot for form.
 *
 * Props:
 *   eyebrow?: string
 *   title?: ReactNode      Fraunces display headline (split into two lines via JSX recommended)
 *   subtitle?: ReactNode   small muted lede on brand panel
 *   formTitle?: ReactNode  Fraunces light heading on right column
 *   formLede?: ReactNode   small muted paragraph under formTitle
 *   backHref?: string      mobile back link target
 *   backLabel?: string
 *   children: ReactNode    form area (right column body)
 *   colophon?: string      bottom-right of brand panel mono kicker
 */
const AuthShell = ({
  eyebrow = 'Fröhlich · Konto',
  title,
  subtitle,
  formTitle,
  formLede,
  backHref = '/',
  backLabel = 'Zurück',
  colophon = 'Fröhlich · Frankfurt',
  children,
  className,
  wide = false,
  showcase,
  marquee,
  brandPanel,
}) => {
  return (
    <div className={cn('min-h-screen bg-bank-bg lg:grid lg:grid-cols-12', className)}>
      {/* ───── BRAND PANEL ───── */}
      <aside
        className={cn(
          'relative hidden flex-col overflow-hidden text-white lg:flex lg:min-h-screen',
          showcase
            ? 'justify-between bg-gradient-to-br from-[#103a6e] via-[#0c2c56] to-[#081a30] p-8 xl:p-10'
            : 'justify-between bg-bank-ink p-12 xl:p-16',
          wide ? (showcase ? 'lg:col-span-8' : 'lg:col-span-8') : 'lg:col-span-5',
        )}
      >
        {/* Decorative layers */}
        <div className="topo-pattern absolute inset-0 opacity-[0.06]" aria-hidden />
        <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bank-accent/65 to-transparent" aria-hidden />
        <div
          className="pointer-events-none absolute -bottom-40 -right-24 h-[440px] w-[440px] rounded-full bg-bank-accent/10 blur-3xl"
          aria-hidden
        />

        {/* Top — wordmark + headline */}
        <div className={cn('relative shrink-0', brandPanel && 'z-10')}>
          <Link
            to="/"
            className={cn(
              'inline-flex items-center gap-2 font-mono uppercase tracking-[0.3em] text-white/70 transition-colors hover:text-bank-gold-soft',
              showcase ? 'text-[9.5px]' : 'text-[10.5px]',
            )}
          >
            <ArrowLeft className={cn(showcase ? 'h-3 w-3' : 'h-3.5 w-3.5')} strokeWidth={1.5} />
            Fröhlich
          </Link>

          <div className={cn(showcase ? 'mt-2.5' : 'mt-20')}>
            {brandPanel ?? (
              <>
                <Eyebrow tone="gold" className={showcase ? 'gap-1.5 text-[8.5px] tracking-[0.22em]' : undefined}>
                  {eyebrow}
                </Eyebrow>
                {title && (
                  <h2
                    className={cn(
                      'font-display font-light leading-[1.02] tracking-[-0.02em] text-white',
                      showcase ? 'mt-1.5 text-[1.45rem] xl:text-[1.7rem]' : 'mt-6 text-[2.4rem] xl:text-[2.85rem]',
                    )}
                    style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
                  >
                    {title}
                  </h2>
                )}
                <div className={cn('h-px bg-bank-gold/70', showcase ? 'mt-2 w-14' : 'mt-7 w-24')} aria-hidden />
                {subtitle && (
                  <p
                    className={cn(
                      'max-w-sm font-sans text-white/80',
                      showcase ? 'mt-1.5 text-[11.5px] leading-[1.45]' : 'mt-7 text-[14.5px] leading-[1.75]',
                    )}
                  >
                    {subtitle}
                  </p>
                )}
              </>
            )}
          </div>

          {marquee && (
            <div className="relative -mx-8 mt-4 border-t border-white/10 pt-4 xl:-mx-10">
              <p className="mb-2 px-8 font-mono text-[9px] uppercase tracking-[0.28em] text-white/65 xl:px-10">
                Unsere Partnerbanken
              </p>
              {marquee}
            </div>
          )}
        </div>

        {showcase && (
          <div
            className={cn(
              'relative flex min-h-[min(56vh,520px)] w-full flex-1 items-end justify-center overflow-visible py-3 pb-5 lg:min-h-[min(62vh,580px)] lg:py-4 lg:pb-7',
              brandPanel && 'mt-5 pt-2 lg:mt-6',
            )}
          >
            {/* Spotlight behind the tablet */}
            <div
              className="pointer-events-none absolute inset-0"
              aria-hidden
              style={{
                background:
                  'radial-gradient(60% 55% at 50% 58%, rgba(120,170,255,0.30), rgba(120,170,255,0.10) 45%, transparent 72%)',
              }}
            />
            <div className="relative w-full overflow-visible px-3 sm:px-5">{showcase}</div>
          </div>
        )}

        {/* Bottom — colophon */}
        <div className="relative shrink-0 flex items-center justify-between border-t border-white/10 pt-5 font-mono text-[10.5px] uppercase tracking-[0.28em] text-white/70">
          <span>{colophon}</span>
          <span>Verschlüsselt · 256-bit</span>
        </div>
      </aside>

      {/* ───── FORM COLUMN ───── */}
      <main
        className={cn(
          'relative flex min-h-screen flex-col justify-center px-6 py-14 sm:px-10 lg:min-h-0',
          wide ? (showcase ? 'lg:col-span-4 lg:px-8 xl:px-10' : 'lg:col-span-4 lg:px-10 xl:px-12') : 'lg:col-span-7 lg:px-14 xl:px-20',
        )}
      >
        {/* Mobile back link */}
        <Link
          to={backHref}
          className="mb-10 inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted transition-colors hover:text-bank-text lg:hidden"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          {backLabel}
        </Link>

        <div
          className={cn(
            'mx-auto w-full',
            wide ? (showcase ? 'max-w-[17.5rem]' : 'max-w-sm') : 'max-w-md',
          )}
        >
          {/* Logo */}
          <div
            className={cn(
              'flex justify-center lg:justify-start',
              wide && showcase ? 'mb-7' : wide ? 'mb-8' : 'mb-12',
            )}
          >
            <BrandLogo
              imgClassName={cn(
                'w-full object-contain drop-shadow-md',
                wide && showcase
                  ? 'mx-auto h-[3.35rem] max-w-[280px] lg:mx-0'
                  : wide
                    ? 'mx-auto h-[4rem] max-w-[min(100%,360px)] sm:mx-0 sm:h-[4.25rem]'
                    : 'mx-auto h-[5rem] max-w-[min(100%,min(440px,90vw))] sm:mx-0 sm:h-[5.5rem] sm:max-w-[min(100%,480px)]',
              )}
            />
          </div>

          {/* Header */}
          {(formTitle || formLede) && (
            <header>
              {formTitle && (
                <h1
                  className={cn(
                    'font-display font-light leading-[1.05] tracking-[-0.01em] text-bank-text',
                    wide && showcase
                      ? 'text-[1.65rem] sm:text-[1.75rem]'
                      : wide
                        ? 'text-[1.85rem] sm:text-[2rem]'
                        : 'text-[2.1rem] sm:text-[2.4rem]',
                  )}
                  style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
                >
                  {formTitle}
                </h1>
              )}
              <div className="mt-4 h-px w-14 bg-bank-gold/55" aria-hidden />
              {formLede && (
                <p
                  className={cn(
                    'mt-4 font-sans leading-[1.7] text-bank-text-muted',
                    wide && showcase ? 'text-[13.5px]' : 'mt-5 max-w-sm text-[14.5px]',
                  )}
                >
                  {formLede}
                </p>
              )}
            </header>
          )}

          {/* Body slot */}
          <div className={cn(wide && showcase ? 'mt-6' : 'mt-8')}>{children}</div>
        </div>
      </main>
    </div>
  );
};

/**
 * Editorial input label (mono kicker with brass numeral).
 * Drop-in pair with shadcn Input.
 *
 * <AuthShell.Label num="01">E-Mail</AuthShell.Label>
 */
const Label = ({ num, children, className, htmlFor }) => (
  <label
    htmlFor={htmlFor}
    className={cn(
      'mb-3 flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted',
      className
    )}
  >
    {num && <span className="text-bank-gold">{num}</span>}
    <span>{children}</span>
  </label>
);

AuthShell.Label = Label;

export default AuthShell;
