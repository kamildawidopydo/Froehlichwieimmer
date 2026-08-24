import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircleQuestion, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import { getProductCatalog } from '@/data/productWizardCatalog';

const PRODUCT_CATALOG = getProductCatalog();

/**
 * ProductMenu — animiertes Auswahlpanel für die 6 Produkt-Wizards.
 * Mobile 1-col, Desktop 2-col (sm:grid-cols-2). Fluide Breite über
 * Wrapper-className (vom Root gesteuert), max-h subtrahiert Anker-Höhe.
 */
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
          <div className="flex max-h-[min(calc(100dvh-9rem),38rem)] max-w-[calc(100vw-1rem)] flex-col overflow-hidden [scrollbar-width:thin]">
            <div className="shrink-0 border-b border-bank-border px-3 py-2.5 sm:px-4 sm:py-3">
              <p className="font-mono text-[9.5px] font-medium uppercase tracking-[0.20em] text-bank-primary/80">
                Kurzfragebogen
              </p>
              <h3 className="mt-0.5 font-display text-[clamp(0.95rem,3.2vw,1.05rem)] font-light leading-snug tracking-tight text-bank-ink">
                Finden Sie die passende Geldanlage
              </h3>
              <p className="mt-1 text-[clamp(0.72rem,2.6vw,0.8rem)] leading-snug text-bank-text-muted">
                Wählen Sie ein Produkt oder beantworten Sie wenige Fragen.
              </p>
            </div>

            <div className="grid min-h-0 shrink grow grid-cols-1 gap-1 overflow-y-auto overscroll-contain p-2 sm:grid-cols-2 sm:gap-1.5 sm:p-3">
              {PRODUCT_CATALOG.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  role="menuitem"
                  data-testid={`product-inquiry-menu-option-${p.key}`}
                  onClick={() => onPick(p.key)}
                  className={cn(
                    'group flex min-h-[2.75rem] w-full items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-1.5 text-left transition-all',
                    'hover:border-bank-primary/30 hover:bg-bank-surface',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/30',
                  )}
                >
                  <span
                    aria-hidden
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-bank-primary/15 bg-[rgb(var(--bank-primary)/0.08)] text-bank-primary"
                  >
                    <MessageCircleQuestion className="h-4 w-4" strokeWidth={LUCIDE_STROKE} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13px] font-semibold leading-tight text-bank-ink transition-colors group-hover:text-bank-primary">
                      {p.title}
                    </span>
                    <span className="truncate text-[11px] leading-tight text-bank-text-muted">
                      {p.benefit}
                    </span>
                  </span>
                  <ArrowRight
                    aria-hidden
                    strokeWidth={LUCIDE_STROKE}
                    className="h-3.5 w-3.5 shrink-0 text-bank-text-muted/60 transition-transform group-hover:translate-x-0.5 group-hover:text-bank-primary"
                  />
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default ProductMenu;
