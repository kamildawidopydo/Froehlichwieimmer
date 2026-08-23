import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MessageCircleQuestion, X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import { trackInvestmentEvent } from '@/lib/investmentAnalytics';
import { getProductCatalog, WIZARD_TRUST_POINTS } from '@/data/productWizardCatalog';
import { BANK_BONUS_COPY } from '@/data/bankBonusTexts';

const STORAGE_KEY = 'productInquiryStickyDismissed';
const PULSE_SESSION_KEY = 'productInquiryStickyPulseFired';

const BOTTOM =
  'bottom-[max(4.5rem,calc(env(safe-area-inset-bottom,0px)+4rem+var(--live-ticker-h,0px)))] sm:bottom-[max(0.875rem,calc(env(safe-area-inset-bottom,0px)+0.5rem+var(--live-ticker-h,0px)))]';

const readDismissed = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isDesktop;
}

/**
 * One-shot Attention-Pulse: nach kurzer Verzögerung EINMAL pro Session ein
 * dezenter Shadow+Scale-Pulse. Respektiert prefers-reduced-motion.
 */
function useAttentionPulse(active) {
  const prefersReduced = useReducedMotion();
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (!active || prefersReduced) return undefined;
    let fired = false;
    try {
      fired = sessionStorage.getItem(PULSE_SESSION_KEY) === '1';
    } catch { /* ignore */ }
    if (fired) return undefined;
    // Beide Timer-Handles im Closure halten, damit der Effect-Cleanup
    // auch den 1.5s-Stop-Timer sauber aufräumt (kein setState-after-unmount).
    let stopTimer = null;
    const startTimer = setTimeout(() => {
      setPulse(true);
      try { sessionStorage.setItem(PULSE_SESSION_KEY, '1'); } catch { /* ignore */ }
      stopTimer = setTimeout(() => setPulse(false), 1500);
    }, 1400);
    return () => {
      clearTimeout(startTimer);
      if (stopTimer) clearTimeout(stopTimer);
    };
  }, [active, prefersReduced]);
  return pulse;
}

const PRODUCT_CATALOG = getProductCatalog();
const WIZARD_BENEFITS = WIZARD_TRUST_POINTS.slice(0, 3);

/**
 * CompactPill — großes, banktypisches Sticky-CTA-Element.
 * Wird sowohl im Restore-State als auch als Mobile-CTA verwendet.
 * Attention-Pulse ist optional (`data-pulse`), respektiert reduced-motion.
 */
function CompactPill({ onClick, className, testId, ariaLabel, fixed = true, pulse = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative inline-flex w-[min(21rem,calc(100vw-2rem))] items-center gap-4 rounded-2xl border-2 border-bank-primary/25 bg-white px-4 py-4 text-left',
        'min-h-[5.5rem] sm:min-h-[6rem] sm:w-[22rem] sm:gap-4 sm:px-5',
        'shadow-[0_20px_50px_-18px_rgb(9_33_66/0.30)]',
        'transition-all duration-200 ease-out',
        'hover:-translate-y-0.5 hover:scale-[1.02] hover:border-bank-primary/55 hover:bg-bank-primary/[0.04] hover:shadow-[0_28px_64px_-18px_rgb(9_33_66/0.38)]',
        'active:scale-[1.045] active:bg-bank-primary/[0.07] active:border-bank-primary/65',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-2',
        'dark:border-bank-border dark:bg-bank-surface-elev',
        pulse && 'sticky-cta-pulse',
        fixed && ['fixed z-[90]', BOTTOM, 'right-4 sm:right-5'],
        className,
      )}
      data-testid={testId}
      data-pulse={pulse ? 'true' : 'false'}
      aria-label={ariaLabel}
    >
      <span
        aria-hidden
        className={cn(
          'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-bank-primary/20 bg-[rgb(var(--bank-primary)/0.10)] text-bank-primary',
          'shadow-[0_6px_18px_-8px_rgb(76_124_186/0.55)] transition-colors',
          'group-hover:bg-[rgb(var(--bank-primary)/0.16)] group-hover:border-bank-primary/35',
          'sm:h-16 sm:w-16',
        )}
      >
        <MessageCircleQuestion className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={LUCIDE_STROKE} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.20em] text-bank-primary sm:text-[11px]">
          Kurzfragebogen
        </span>
        <span className="text-[16px] font-semibold leading-[1.15] tracking-tight text-bank-ink sm:text-[18px]">
          Fragen beantworten
        </span>
        <span className="text-[11.5px] leading-snug text-bank-text-muted sm:text-[12.5px]">
          In wenigen Minuten zur persönlichen Empfehlung
        </span>
      </span>
      <ArrowRight
        aria-hidden
        strokeWidth={LUCIDE_STROKE}
        className={cn(
          'ml-1 h-4 w-4 shrink-0 text-bank-text-muted/60 transition-all sm:h-[1.05rem] sm:w-[1.05rem]',
          'group-hover:translate-x-0.5 group-hover:text-bank-primary',
        )}
      />
    </button>
  );
}

function ProductMenu({ menuOpen, prefersReduced, onPick, className }) {
  return (
    <AnimatePresence>
      {menuOpen ? (
        <motion.div
          role="menu"
          aria-label="Passende Geldanlage wählen"
          initial={prefersReduced ? false : { opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={prefersReduced ? undefined : { opacity: 0, y: 4, scale: 0.98 }}
          transition={{ duration: prefersReduced ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
          className={className}
        >
          <div className="max-h-[min(78vh,640px)] overflow-y-auto overscroll-contain px-3.5 py-3.5 [scrollbar-width:thin] sm:px-4 sm:py-4">
            {/* Header — klärt Ziel & Nutzen in Sekunden */}
            <div className="mb-3 border-b border-bank-border pb-3">
              <p className="font-mono text-[9.5px] font-medium uppercase tracking-[0.22em] text-bank-primary/80">
                Produktwahl
              </p>
              <h3 className="mt-1.5 font-display text-[15.5px] font-light leading-snug tracking-tight text-bank-ink sm:text-[16.5px]">
                Finden Sie die passende Geldanlage für Ihre Ziele.
              </h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-bank-text-muted">
                Wählen Sie direkt ein Produkt — oder beantworten Sie wenige Fragen und
                erhalten Sie eine persönliche Empfehlung mit möglichen Vorteilen und
                passenden Angeboten.
              </p>
            </div>

            {/* Rich Product Cards */}
            <div className="flex flex-col gap-1.5">
              {PRODUCT_CATALOG.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  role="menuitem"
                  data-testid={`product-inquiry-option-${p.key}`}
                  onClick={() => onPick(p.key)}
                  className={cn(
                    'group flex w-full flex-col gap-0.5 rounded-lg border border-transparent px-3 py-2.5 text-left transition-all',
                    'hover:border-bank-accent/30 hover:bg-bank-surface',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/30',
                  )}
                >
                  <span className="font-mono text-[9.5px] font-medium uppercase tracking-[0.16em] text-bank-primary/80">
                    {p.kicker}
                  </span>
                  <span className="text-[13.5px] font-semibold leading-snug text-bank-ink transition-colors group-hover:text-bank-primary">
                    {p.title}
                  </span>
                  <span className="text-[11.5px] leading-snug text-bank-text-muted">
                    {p.benefit}
                  </span>
                  {p.bonusSource && BANK_BONUS_COPY[p.bonusSource.bankSlug]?.summary ? (
                    <span className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-bank-primary/80">
                      {p.bonusSource.label}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            {/* Wizard-Nutzen-Chips */}
            <div className="mt-3.5 rounded-lg border border-bank-border bg-bank-surface/60 px-3 py-3">
              <p className="font-mono text-[9.5px] font-medium uppercase tracking-[0.2em] text-bank-primary/80">
                Kurzfragebogen — Ihr Nutzen
              </p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {WIZARD_BENEFITS.map((b) => (
                  <li key={b.title} className="flex items-start gap-2">
                    <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-bank-primary/60" />
                    <span className="min-w-0">
                      <span className="text-[12px] font-medium text-bank-ink">{b.title}</span>
                      <span className="ml-1 text-[11.5px] leading-snug text-bank-text-muted">— {b.body}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-bank-text-muted">
                In wenigen Minuten · kostenlos &amp; unverbindlich
              </p>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/**
 * Sticky CTA — öffnet denselben Produkt-Kurzfragebogen wie die Karten-Buttons.
 * @param {{ onOpenWizard: (key: 'aktien' | 'anleihen' | 'fonds' | 'tagesgeld' | 'festgeld' | 'flexgeld') => void }} props
 */
const ProductInquiryStickyCta = ({ onOpenWizard }) => {
  const prefersReduced = useReducedMotion();
  const isDesktop = useIsDesktop();
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Sichtbar-Guard: wenn das Newsletter-Formular im Viewport ist, das sticky CTA
  // auf Mobile temporär höher legen, damit Submit/Consent nicht überdeckt werden.
  const [nearForm, setNearForm] = useState(false);
  const rootRef = useRef(null);
  const pulse = useAttentionPulse(mounted && !dismissed && !menuOpen);

  useEffect(() => {
    setDismissed(readDismissed());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    // IDs, die das Sticky CTA auf Mobile nicht verdecken darf.
    const AVOID_IDS = ['home-newsletter'];
    const targets = AVOID_IDS
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!targets.length) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        const anyVisible = entries.some((e) => e.isIntersecting);
        setNearForm(anyVisible);
      },
      { threshold: 0.05 },
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e) => {
      if (rootRef.current?.contains(e.target)) return;
      setMenuOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const dismiss = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const restore = () => {
    setDismissed(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  const openMenu = () => {
    try {
      trackInvestmentEvent('product_inquiry_open', { source: 'sticky_cta' });
    } catch { /* ignore */ }
    setMenuOpen((v) => !v);
  };

  const pickProduct = (key) => {
    try { trackInvestmentEvent('product_inquiry_select', { product: key, source: 'sticky_popup' }); } catch {}
    onOpenWizard(key);
    setMenuOpen(false);
  };

  if (!mounted) return null;

  if (dismissed) {
    return createPortal(
      <>
        <PulseStyle />
        <CompactPill
          onClick={restore}
          testId="product-inquiry-sticky-restore"
          ariaLabel="Kurzfragebogen einblenden"
        />
      </>,
      document.body,
    );
  }

  if (!isDesktop) {
    // Auf kleinen Viewports: wenn ein zu vermeidendes Formular im Viewport ist,
    // die Sticky-Position vertikal anheben UND horizontal von rechts nach links
    // wechseln — der Interstitial-Close-Button (top-right) und der Newsletter-
    // Consent-Link bleiben so komplett bedienbar. Desktop unverändert.
    const mobilePos = nearForm
      ? 'bottom-[calc(env(safe-area-inset-bottom,0px)+8.5rem)] left-4'
      : `${BOTTOM} right-4`;
    return createPortal(
      <>
        <PulseStyle />
        <div
          ref={rootRef}
          className={cn(
            'fixed z-[90] transition-[bottom,left,right] duration-300 ease-out',
            mobilePos,
          )}
          data-testid="product-inquiry-sticky-cta"
          data-near-form={nearForm ? 'true' : 'false'}
        >
          <ProductMenu
            menuOpen={menuOpen}
            prefersReduced={prefersReduced}
            onPick={pickProduct}
            className={cn(
              'absolute bottom-full mb-2 w-[min(21rem,calc(100vw-1.5rem))] rounded-xl border border-bank-border bg-white shadow-[0_24px_60px_-24px_rgb(9_33_66/0.36)] dark:bg-bank-surface-elev',
              nearForm ? 'left-0' : 'right-0',
            )}
          />
          {/* Dismiss-X separat oben-rechts über der Pill — separates Touch-Target */}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Hinweis ausblenden"
            data-testid="product-inquiry-sticky-dismiss"
            className={cn(
              'absolute -right-1 -top-1 z-[1] flex h-8 w-8 items-center justify-center rounded-full border border-bank-border bg-white text-bank-text-muted shadow-md',
              'transition-colors hover:border-bank-primary/40 hover:text-bank-ink',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-1',
              'dark:border-bank-border dark:bg-bank-surface-elev',
            )}
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
          </button>
          <CompactPill
            fixed={false}
            onClick={openMenu}
            testId="product-inquiry-sticky-compact"
            ariaLabel="Fragen beantworten — Produkt wählen"
            pulse={pulse && !menuOpen}
          />
        </div>
      </>,
      document.body,
    );
  }

  return createPortal(
    <>
      <PulseStyle />
      <div
        ref={rootRef}
        className={cn('fixed z-[90]', BOTTOM, 'right-5')}
        data-testid="product-inquiry-sticky-cta"
      >
        <div className="relative">
          <ProductMenu
            menuOpen={menuOpen}
            prefersReduced={prefersReduced}
            onPick={pickProduct}
            className="absolute bottom-full right-0 mb-2 w-[22rem] max-w-[calc(100vw-2rem)] rounded-xl border border-bank-border bg-white shadow-[0_24px_60px_-24px_rgb(9_33_66/0.36)] dark:bg-bank-surface-elev"
          />

          <div
            className={cn(
              'group/cta flex items-stretch overflow-hidden rounded-2xl border-2 border-bank-primary/25 bg-white',
              'shadow-[0_20px_50px_-18px_rgb(9_33_66/0.30)]',
              'transition-all duration-200 ease-out',
              'hover:-translate-y-0.5 hover:scale-[1.02] hover:border-bank-primary/55 hover:shadow-[0_28px_64px_-18px_rgb(9_33_66/0.38)]',
              'dark:border-bank-border dark:bg-bank-surface-elev',
              menuOpen && 'border-bank-primary/55 shadow-[0_24px_60px_-18px_rgb(9_33_66/0.36)]',
              pulse && !menuOpen && 'sticky-cta-pulse',
            )}
            data-pulse={pulse && !menuOpen ? 'true' : 'false'}
          >
            {/* Main click area — Icon + Text + Benefit */}
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="Fragen beantworten — Produkt wählen"
              onClick={openMenu}
              className={cn(
                'group flex min-w-0 flex-1 items-center gap-4 py-4 pl-5 pr-4 text-left transition-colors duration-200',
                'w-[24rem] min-h-[5.75rem]',
                'hover:bg-bank-primary/[0.04]',
                'active:scale-[1.02] active:bg-bank-primary/[0.07]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-bank-primary/40',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-bank-primary/20 bg-[rgb(var(--bank-primary)/0.10)] text-bank-primary',
                  'shadow-[0_6px_18px_-8px_rgb(76_124_186/0.55)] transition-colors duration-200',
                  'group-hover:bg-[rgb(var(--bank-primary)/0.16)] group-hover:border-bank-primary/35',
                )}
              >
                <MessageCircleQuestion className="h-6 w-6" strokeWidth={LUCIDE_STROKE} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.20em] text-bank-primary">
                  Kurzfragebogen
                </span>
                <span className="text-[17px] font-semibold leading-[1.15] tracking-tight text-bank-ink">
                  Fragen beantworten
                </span>
                <span className="text-[12px] leading-snug text-bank-text-muted">
                  In wenigen Minuten zur persönlichen Empfehlung
                </span>
              </span>
              <ArrowRight
                aria-hidden
                strokeWidth={LUCIDE_STROKE}
                className="h-[1.1rem] w-[1.1rem] shrink-0 text-bank-text-muted/60 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-bank-primary"
              />
            </button>

            {/* Separater X-Button — eigenes Touch-Target */}
            <button
              type="button"
              onClick={dismiss}
              onPointerDown={(e) => e.stopPropagation()}
              className={cn(
                'flex w-11 shrink-0 items-center justify-center border-l border-bank-border/80 text-bank-text-muted',
                'transition-colors hover:bg-bank-primary/[0.06] hover:text-bank-ink',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-bank-primary/40',
                'dark:border-bank-border',
              )}
              aria-label="Hinweis ausblenden"
              data-testid="product-inquiry-sticky-dismiss"
            >
              <X className="h-4 w-4" strokeWidth={2.2} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
};

/**
 * Einmalige CSS-Keyframes für den dezenten Attention-Pulse.
 * Wird via `.sticky-cta-pulse` conditional aktiviert. Respektiert
 * automatisch prefers-reduced-motion via Hook-Guard in useAttentionPulse.
 */
const PulseStyle = () => (
  <style>{`
    @keyframes sticky-cta-pulse-kf {
      0%   { box-shadow: 0 20px 50px -18px rgba(9,33,66,0.30), 0 0 0 0 rgba(76,124,186,0.30); transform: translateY(0) scale(1); }
      40%  { box-shadow: 0 26px 60px -18px rgba(9,33,66,0.34), 0 0 0 10px rgba(76,124,186,0.12); transform: translateY(-2px) scale(1.015); }
      100% { box-shadow: 0 20px 50px -18px rgba(9,33,66,0.30), 0 0 0 0 rgba(76,124,186,0.0); transform: translateY(0) scale(1); }
    }
    .sticky-cta-pulse { animation: sticky-cta-pulse-kf 1500ms ease-in-out 1; }
    @media (prefers-reduced-motion: reduce) { .sticky-cta-pulse { animation: none !important; } }
  `}</style>
);

export default ProductInquiryStickyCta;
