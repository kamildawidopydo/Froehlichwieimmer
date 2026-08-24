import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'framer-motion';
import { MessageCircleQuestion, X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import { trackInvestmentEvent } from '@/lib/investmentAnalytics';
import CompactPill from './stickyCta/CompactPill';
import ProductMenu from './stickyCta/ProductMenu';
import PulseStyle from './stickyCta/PulseStyle';

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
  // `nearForm`: Newsletter im Viewport → Position auf Mobile anheben.
  // `hiddenForTeaser`: Interstitial („Aktien im Fokus" u. a.) sichtbar →
  //   Sticky-CTA komplett unsichtbar schalten, damit der Teaser-Primary-Link
  //   nicht blockiert wird (Desktop UND Mobile). Sobald der Teaser
  //   geschlossen oder unmounted wird, kehrt der CTA in seine normale
  //   Position zurück. Kein Layout-Sprung (fixed position, nur opacity+
  //   pointer-events-toggle).
  const [nearForm, setNearForm] = useState(false);
  const [hiddenForTeaser, setHiddenForTeaser] = useState(false);
  const rootRef = useRef(null);
  const pulse = useAttentionPulse(mounted && !dismissed && !menuOpen && !hiddenForTeaser);

  useEffect(() => {
    setDismissed(readDismissed());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    // Getrennte Behandlung:
    //   #home-newsletter  → mobile Ausweich-Position (nearForm)
    //   #invtopic-teaser  → beidseitig VERSTECKEN, um den Teaser-Primary-Link
    //                       nicht zu blockieren. Der Wrapper bleibt im DOM
    //                       (Fade-Out via opacity), daher zusätzlich
    //                       `data-visible !== "false"` prüfen.
    const NEWSLETTER_SEL = '#home-newsletter';
    const TEASER_SEL = '#invtopic-teaser';
    const SELECTORS = [NEWSLETTER_SEL, TEASER_SEL];

    const findTargets = () =>
      SELECTORS.flatMap((sel) => Array.from(document.querySelectorAll(sel)));

    const isElActive = (el) => el.getAttribute('data-visible') !== 'false';
    const intersecting = new Set();

    const recompute = () => {
      let nl = false;
      let teaser = false;
      for (const el of intersecting) {
        if (!el.isConnected || !isElActive(el)) continue;
        if (el.matches(TEASER_SEL)) teaser = true;
        else if (el.matches(NEWSLETTER_SEL)) nl = true;
      }
      setHiddenForTeaser(teaser);
      setNearForm(nl);
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) intersecting.add(e.target);
          else intersecting.delete(e.target);
        });
        recompute();
      },
      { threshold: 0.05 },
    );

    const observed = new WeakSet();
    const observeAll = () => {
      findTargets().forEach((el) => {
        if (!observed.has(el)) {
          io.observe(el);
          observed.add(el);
        }
      });
    };
    observeAll();

    // MutationObserver-Debounce via rAF, damit hochfrequente DOM-Updates
    // (Ticker/Charts) nicht jedes Mal recompute() + querySelectorAll auslösen.
    let scheduled = false;
    const scheduleRecompute = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        observeAll();
        for (const el of intersecting) {
          if (!el.isConnected) intersecting.delete(el);
        }
        recompute();
      });
    };
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'childList' && (r.addedNodes.length || r.removedNodes.length)) {
          scheduleRecompute();
          return;
        }
        if (r.type === 'attributes') {
          scheduleRecompute();
          return;
        }
      }
    });
    mo.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-visible', 'id'],
    });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e) => {
      if (rootRef.current?.contains(e.target)) return;
      setMenuOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        // stoppen, damit andere globale ESC-Handler (z. B. Investment-
        // Interstitial) das gleiche Event nicht als eigenen Close werten.
        e.stopPropagation();
        setMenuOpen(false);
      }
    };
    // capture-phase, damit wir vor globalen Listenern zuschlagen.
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
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
  // Interstitial belegt bereits den CTA-Bereich (bottom-right auf Desktop,
  // bottom-sheet auf Mobile) → Sticky-CTA komplett unsichtbar schalten,
  // damit der Teaser-Primary-Link („MEHR ERFAHREN") nicht blockiert wird.
  // Der CTA kommt zurück, sobald der Teaser data-visible='false' setzt oder
  // vom DOM entfernt wird. `fixed`-Position, deshalb kein Layout-Reflow.
  if (hiddenForTeaser) return null;

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
              'absolute bottom-full mb-2 w-[min(calc(100vw-1rem),34rem)] max-h-[min(calc(100dvh-8rem),38rem)] overflow-hidden rounded-xl border border-bank-border bg-white shadow-[0_24px_60px_-24px_rgb(9_33_66/0.36)] dark:bg-bank-surface-elev',
              nearForm ? 'left-0' : 'right-0',
            )}
          />
          {/* Kompakter Mobile-Main-CTA — Single-Line 56 px mit integriertem Divider + X. */}
          <div
            className={cn(
              'flex w-[clamp(15.5rem,78vw,22rem)] max-w-[calc(100vw-1rem)] items-stretch overflow-hidden rounded-2xl border-2 border-bank-primary/25 bg-white',
              'transition-shadow duration-200 ease-out',
              menuOpen
                ? 'shadow-[0_8px_20px_-12px_rgb(9_33_66/0.22)] border-bank-primary/20'
                : 'shadow-[0_10px_24px_-12px_rgb(9_33_66/0.22)]',
              pulse && !menuOpen && 'sticky-cta-pulse',
              'dark:border-bank-border dark:bg-bank-surface-elev',
            )}
            data-menu-open={menuOpen ? 'true' : 'false'}
            data-pulse={pulse && !menuOpen ? 'true' : 'false'}
          >
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="Fragen beantworten — Produkt wählen"
              onClick={openMenu}
              data-testid="product-inquiry-sticky-compact"
              className={cn(
                'group flex min-w-0 flex-1 items-center gap-2.5 py-1.5 pl-2.5 pr-2 text-left',
                'min-h-[3.5rem]',
                'transition-colors duration-200 ease-out',
                'hover:bg-bank-primary/[0.04]',
                'active:scale-[0.98] active:bg-bank-primary/[0.07]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-bank-primary/40',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-bank-primary/20 bg-[rgb(var(--bank-primary)/0.10)] text-bank-primary',
                  'shadow-[0_4px_12px_-6px_rgb(76_124_186/0.55)] transition-colors',
                  'group-hover:bg-[rgb(var(--bank-primary)/0.16)] group-hover:border-bank-primary/35',
                )}
              >
                <MessageCircleQuestion className="h-[1.05rem] w-[1.05rem]" strokeWidth={LUCIDE_STROKE} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold leading-[1.15] tracking-tight text-bank-ink">
                Fragen beantworten
              </span>
              <ArrowRight
                aria-hidden
                strokeWidth={LUCIDE_STROKE}
                className="ml-0.5 h-[0.9rem] w-[0.9rem] shrink-0 text-bank-text-muted/60 transition-transform group-hover:translate-x-0.5 group-hover:text-bank-primary"
              />
            </button>
            <button
              type="button"
              onClick={dismiss}
              onPointerDown={(e) => e.stopPropagation()}
              className={cn(
                'flex w-9 shrink-0 items-center justify-center border-l border-bank-border/80 text-bank-text-muted',
                'transition-colors hover:bg-bank-primary/[0.06] hover:text-bank-ink',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-bank-primary/40',
                'dark:border-bank-border',
              )}
              aria-label="Hinweis ausblenden"
              data-testid="product-inquiry-sticky-dismiss"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
            </button>
          </div>
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
            className="absolute bottom-full right-0 mb-2 w-[clamp(28rem,46vw,42rem)] max-w-[calc(100vw-1rem)] max-h-[min(calc(100dvh-10rem),38rem)] overflow-hidden rounded-xl border border-bank-border bg-white shadow-[0_24px_60px_-24px_rgb(9_33_66/0.36)] dark:bg-bank-surface-elev"
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
                'w-[clamp(20rem,42vw,26rem)] max-w-[calc(100vw-2rem)] min-h-[5.75rem]',
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

export default ProductInquiryStickyCta;
