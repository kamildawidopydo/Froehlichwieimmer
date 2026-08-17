import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import ProductIcon from '@/components/ProductIcon';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SAVINGS_PRODUCT_CARDS } from '@/data/savingsProductGuides';
import {
  HOME_SAVINGS_CARD_ALT,
  HOME_SAVINGS_CARD_IMAGES,
  HOME_SAVINGS_CARD_OBJECT_POSITION,
} from '@/data/homeSavingsCardImages';

const ACCENT = {
  festgeld: {
    check: 'text-bank-primary',
    ring: 'ring-bank-primary/15',
  },
  flexgeld: {
    check: 'text-bank-gold',
    ring: 'ring-bank-gold/20',
  },
  tagesgeld: {
    check: 'text-bank-primary',
    ring: 'ring-bank-primary/15',
  },
};

/**
 * Homepage: drei Produktkarten (Referenz-Layout) mit Links zu Leitfaden-Seiten.
 */
export default function HomeSavingsOptionsOverview() {
  return (
    <div data-testid="home-savings-options-overview">
      <div className="mx-auto max-w-3xl text-center">
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.28em] text-bank-gold">
          Spar- &amp; Zinslösungen
        </p>
        <h2
          id="home-savings-options-heading"
          className="font-display mt-4 text-[clamp(1.65rem,4vw,2.35rem)] font-light leading-tight text-bank-text"
          style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
        >
          Ihre Geldanlage.{' '}
          <span className="italic text-bank-primary" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}>
            So flexibel wie Sie.
          </span>
        </h2>
        <p className="mt-5 text-base leading-relaxed text-bank-text-muted sm:text-lg">
          Entdecken Sie die passende Anlageform für Ihre Ziele — Tagesgeld, Festgeld oder Flexgeld mit EU-Einlagensicherung.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3 lg:gap-8">
        {SAVINGS_PRODUCT_CARDS.map((product) => {
          const accent = ACCENT[product.slug];
          return (
            <article
              key={product.slug}
              className={cn(
                'group/card flex flex-col overflow-hidden rounded-2xl border border-bank-border bg-white shadow-editorial-sm transition-[box-shadow,border-color,transform] duration-300',
                'hover:border-bank-gold/35 hover:shadow-editorial-md',
                accent.ring,
                'ring-1 ring-inset',
              )}
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-bank-border/60 bg-[#e8e4dc]">
                <img
                  src={HOME_SAVINGS_CARD_IMAGES[product.slug]}
                  alt={HOME_SAVINGS_CARD_ALT[product.slug] ?? product.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover/card:scale-[1.02]"
                  style={{ objectPosition: HOME_SAVINGS_CARD_OBJECT_POSITION[product.slug] ?? 'center' }}
                  loading="lazy"
                  decoding="async"
                  width={1200}
                  height={750}
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-bank-ink/25 via-transparent to-transparent"
                />
              </div>

              <div className="flex flex-1 flex-col px-6 pb-6 pt-4">
                <div className="flex flex-col items-center gap-3">
                  <ProductIcon product={product.slug} size="md" />
                  <h3 className="text-center font-display text-2xl font-normal text-bank-ink">{product.title}</h3>
                </div>
                <p className="mt-3 text-center text-[14px] leading-relaxed text-bank-text-muted">{product.cardLede}</p>

                <ul className="mt-6 flex-1 space-y-3">
                  {product.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2.5 text-left text-[13px] leading-snug text-bank-text-muted">
                      <Check
                        className={cn('mt-0.5 h-4 w-4 shrink-0', accent.check)}
                        strokeWidth={2.25}
                        aria-hidden
                      />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 border-t border-bank-border/70 pt-6">
                  <Link
                    to={`/produkte/${product.slug}`}
                    className="block"
                    data-testid={`home-product-${product.slug}-cta`}
                  >
                    <Button variant="outline-ink" size="lg" className="w-full gap-2 font-normal">
                      Mehr erfahren
                      <ArrowRight className="h-4 w-4" strokeWidth={LUCIDE_STROKE} />
                    </Button>
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-10 overflow-hidden rounded-2xl border border-bank-border bg-white/80 shadow-editorial-sm backdrop-blur-sm">
        <Link
          to="/comparison"
          className="group flex w-full items-center justify-between gap-6 px-6 py-6 text-left transition-colors hover:bg-bank-surface-elev/60 sm:px-8 sm:py-7"
          data-testid="home-savings-options-cta"
        >
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.26em] text-bank-text-muted">
              Live-Vergleich
            </p>
            <p className="font-display mt-2 text-lg font-light leading-snug text-bank-text sm:text-xl">
              Zu den aktuellen{' '}
              <span className="italic text-bank-primary" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}>
                Bankangeboten
              </span>
            </p>
            <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-bank-text-muted">
              Direkt zum Vergleich — ohne zusätzlichen Schritt.
            </p>
          </div>
          <span
            aria-hidden
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-bank-border bg-white text-bank-gold shadow-editorial-sm transition-all duration-300 group-hover:border-bank-gold/45 group-hover:shadow-editorial-md"
          >
            <ArrowRight
              className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5"
              strokeWidth={LUCIDE_STROKE}
            />
          </span>
        </Link>
      </div>
    </div>
  );
}
