import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock } from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WISSEN_ARTICLES, WISSEN_CATEGORIES } from '@/data/wissenArticles';

export default function Wissen() {
  return (
    <div className="min-h-screen w-full bg-bank-bg text-bank-text">
      <PageMeta
        title="Wissen & Perspektiven"
        description="Ratgeber der Fröhlich Vermögensberatung GmbH — verständliche Beiträge zu Sparen, Anlageklassen und Vermögensplanung."
        path="/wissen"
      />

      {/* HERO */}
      <section className="border-b border-bank-border bg-bank-ink text-white">
        <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-bank-gold">Wissen &amp; Perspektiven</p>
          <h1
            className="mt-6 max-w-4xl font-display text-display-md font-light leading-[1.02] tracking-[-0.02em] sm:text-display-lg lg:text-display-xl"
            style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
          >
            Finanzwissen,<br />
            <span className="text-bank-gold">verständlich erklärt.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-[15px] leading-relaxed text-white/85 sm:text-[16px]">
            Ausgewählte Grundlagenbeiträge zu Sparen, Anlageklassen und Vermögensplanung — neutral formuliert, ohne Renditeversprechen und ohne Fachchinesisch.
          </p>
        </div>
      </section>

      {/* ARTIKEL-LISTE — editorial, keine Karten */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-[1100px] px-5 sm:px-8 lg:px-12">
          <div className="divide-y divide-bank-border border-y border-bank-border">
            {WISSEN_ARTICLES.map((a, i) => {
              const cat = WISSEN_CATEGORIES[a.category];
              return (
                <Link
                  key={a.slug}
                  to={`/wissen/${a.slug}`}
                  data-testid={`wissen-card-${a.slug}`}
                  className="group grid gap-6 py-10 sm:grid-cols-[auto_1fr_auto] sm:items-baseline sm:gap-x-10 sm:py-12"
                >
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold sm:pt-2">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-bank-text-muted">
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-primary">{cat.label}</span>
                      <span aria-hidden className="text-bank-text-muted/50">·</span>
                      <span className="inline-flex items-center gap-1.5 text-[11.5px]">
                        <Clock className="h-3.5 w-3.5" strokeWidth={1.4} aria-hidden />
                        {a.readingTime}
                      </span>
                    </div>
                    <h2
                      className="mt-4 font-display text-[1.55rem] font-light leading-[1.15] tracking-[-0.015em] text-bank-text transition-colors group-hover:text-bank-primary sm:text-[1.85rem]"
                      style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
                    >
                      {a.title}
                    </h2>
                    <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-bank-text-muted">{a.lede}</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-2 self-center text-[13.5px] font-semibold text-bank-primary sm:self-end sm:pb-2">
                    Weiterlesen
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={1.6} aria-hidden />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* HINWEIS + CTA */}
      <section className="border-t border-bank-border bg-bank-surface/30 py-14 sm:py-16">
        <div className="mx-auto max-w-[1100px] px-5 sm:px-8 lg:px-12">
          <p className="max-w-3xl text-[13.5px] leading-relaxed text-bank-text-muted">
            Hinweis: Die Beiträge in diesem Bereich dienen der allgemeinen Information und stellen keine individuelle Anlageberatung dar. Eine persönliche Empfehlung setzt immer die Betrachtung Ihrer individuellen Situation, Ziele und Erfahrungen im Gespräch voraus.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/contact"
              data-testid="wissen-cta-contact"
              className={cn(buttonVariants({ variant: 'default', size: 'lg' }), 'inline-flex cursor-pointer')}
            >
              Persönliches Gespräch vereinbaren
              <ArrowUpRight className="ml-2 h-4 w-4" strokeWidth={1.6} aria-hidden />
            </Link>
            <Link
              to="/leistungen"
              className={cn(buttonVariants({ variant: 'outline-ink', size: 'lg' }), 'inline-flex cursor-pointer')}
            >
              Unsere Leistungen
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
