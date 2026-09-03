import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import Eyebrow from '@/components/editorial/Eyebrow';

const LUCIDE_STROKE = 1.5;

/**
 * Session 80.85 · Homepage-Sekundär-CTA für den Premium-Bereich
 * „Größere Vermögen". Sichtbar und hochwertig, aber dezent — der
 * primäre Hero-CTA (BankingHero) bleibt unverdrängt. Editorial,
 * Champagner-/Gold-Akzente, viel Weißraum.
 */
export default function HomeGroessereVermoegenBand() {
  return (
    <section
      data-testid="home-groessere-vermoegen-band"
      aria-labelledby="home-gv-title"
      className="relative overflow-hidden border-y border-bank-border bg-bank-surface-elev/50 py-16 sm:py-20 lg:py-24"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-1/2 -z-10 hidden h-[380px] w-[380px] -translate-y-1/2 rounded-full bg-bank-gold/10 blur-3xl lg:block"
      />
      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:gap-14 lg:px-12">
        <div className="max-w-2xl">
          <Eyebrow>
            <span className="inline-flex items-center gap-2">
              <Sparkles size={12} strokeWidth={1.8} className="text-bank-gold" aria-hidden />
              Für größere Vermögen
            </span>
          </Eyebrow>
          <h2
            id="home-gv-title"
            className="mt-5 font-display text-[clamp(1.65rem,3.2vw+0.6rem,2.5rem)] font-light leading-[1.08] tracking-[-0.02em] text-bank-text"
            style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
          >
            Größere Vermögen — <span className="text-bank-gold">individuell&nbsp;strukturiert</span>.
          </h2>
          <p className="mt-5 text-[15px] leading-[1.8] text-bank-text-muted sm:text-[16px]">
            Individuelle Lösungen für größere Anlagevermögen — Liquidität, verzinsliche Anlagen,
            Wertpapiere und persönliche Beratung im Zusammenspiel.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:shrink-0 lg:flex-col lg:items-end">
          <Link
            to="/groessere-vermoegen"
            data-testid="home-groessere-vermoegen-cta"
            className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-bank-ink px-7 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-bank-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bank-surface-elev"
          >
            Größere Vermögen
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              strokeWidth={LUCIDE_STROKE}
              aria-hidden
            />
          </Link>
          <p className="text-[12.5px] leading-relaxed text-bank-text-soft sm:max-w-[220px] lg:text-right">
            Neu · Premium-Einstieg
          </p>
        </div>
      </div>
    </section>
  );
}
