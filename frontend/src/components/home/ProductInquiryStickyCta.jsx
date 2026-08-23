import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MessageCircleQuestion, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import { productInquiryCards } from '@/data/productInquiryQuestions';

const STORAGE_KEY = 'productInquiryStickyDismissed';

const PRODUCTS = /** @type {const} */ (['aktien', 'anleihen', 'fonds', 'tagesgeld', 'festgeld', 'flexgeld']);

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

function CompactPill({ onClick, className, testId, ariaLabel, fixed = true }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-lg border border-bank-ink/10 bg-white px-3.5 py-2.5 text-[13px] font-medium text-bank-ink',
        'shadow-[0_10px_28px_-14px_rgb(9_33_66/0.28)] transition-colors hover:bg-bank-surface',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/40',
        'dark:border-bank-border dark:bg-bank-surface-elev dark:hover:bg-bank-surface',
        fixed && ['fixed z-[90]', BOTTOM, 'right-4 sm:right-5'],
        className,
      )}
      data-testid={testId}
      aria-label={ariaLabel}
    >
      <MessageCircleQuestion className="h-4 w-4 shrink-0 text-bank-accent" strokeWidth={LUCIDE_STROKE} aria-hidden />
      <span className="truncate">Fragen beantworten</span>
    </button>
  );
}

function ProductMenu({ menuOpen, prefersReduced, onPick, className }) {
  return (
    <AnimatePresence>
      {menuOpen ? (
        <motion.div
          role="menu"
          aria-label="Produkt wählen"
          initial={prefersReduced ? false : { opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={prefersReduced ? undefined : { opacity: 0, y: 4, scale: 0.98 }}
          transition={{ duration: prefersReduced ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
          className={className}
        >
          <p className="px-3 pb-1.5 pt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-bank-text-muted">
            Produkt wählen
          </p>
          {PRODUCTS.map((key) => {
            const meta = productInquiryCards[key];
            return (
              <button
                key={key}
                type="button"
                role="menuitem"
                data-testid={`product-inquiry-option-${key}`}
                onClick={() => onPick(key)}
                className={cn(
                  'flex w-full flex-col gap-0.5 rounded-md px-3 py-2.5 text-left transition-colors',
                  'hover:bg-bank-surface',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/30',
                )}
              >
                <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-bank-text-muted">
                  {meta.kicker}
                </span>
                <span className="text-[14px] font-medium leading-snug text-bank-ink">{meta.title}</span>
              </button>
            );
          })}
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

  const pickProduct = (key) => {
    onOpenWizard(key);
    setMenuOpen(false);
  };

  if (!mounted) return null;

  if (dismissed) {
    return createPortal(
      <CompactPill
        onClick={restore}
        testId="product-inquiry-sticky-restore"
        ariaLabel="Kurzfragebogen einblenden"
      />,
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
            'absolute bottom-full mb-2 flex w-[min(17rem,calc(100vw-2rem))] flex-col gap-0.5 rounded-xl border border-bank-border bg-white p-1.5 shadow-[0_16px_40px_-20px_rgb(9_33_66/0.28)] dark:bg-bank-surface-elev',
            nearForm ? 'left-0' : 'right-0',
          )}
        />
        <CompactPill
          fixed={false}
          onClick={() => setMenuOpen((v) => !v)}
          testId="product-inquiry-sticky-compact"
          ariaLabel="Fragen beantworten — Produkt wählen"
        />
      </div>,
      document.body,
    );
  }

  return createPortal(
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
          className="absolute bottom-full right-0 mb-2 flex w-[17rem] flex-col gap-0.5 rounded-xl border border-bank-border bg-white p-1.5 shadow-[0_16px_40px_-20px_rgb(9_33_66/0.28)] dark:bg-bank-surface-elev"
        />

        <div
          className={cn(
            'flex items-stretch overflow-hidden rounded-xl border border-bank-border/90 bg-white shadow-[0_12px_32px_-16px_rgb(9_33_66/0.28)]',
            'dark:border-bank-border dark:bg-bank-surface-elev',
            menuOpen && 'border-bank-accent/35',
          )}
        >
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Fragen beantworten — Produkt wählen"
            onClick={() => setMenuOpen((v) => !v)}
            className={cn(
              'group flex min-w-0 items-center gap-3 py-2.5 pl-3 pr-3 text-left transition-colors',
              'hover:bg-bank-surface/80',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-bank-accent/40',
            )}
          >
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--bank-accent)/0.1)] text-bank-accent transition-colors group-hover:bg-[rgb(var(--bank-accent)/0.16)]"
            >
              <MessageCircleQuestion className="h-4 w-4" strokeWidth={LUCIDE_STROKE} />
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-bank-text-muted">
                Kurzfragebogen
              </span>
              <span className="mt-0.5 whitespace-nowrap text-[14px] font-medium tracking-[-0.01em] text-bank-ink">
                Fragen beantworten
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={dismiss}
            className={cn(
              'flex w-9 shrink-0 items-center justify-center border-l border-bank-border/80 text-bank-text-muted',
              'transition-colors hover:bg-bank-surface hover:text-bank-ink',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-bank-accent/40',
              'dark:border-bank-border',
            )}
            aria-label="Hinweis ausblenden"
            data-testid="product-inquiry-sticky-dismiss"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ProductInquiryStickyCta;
