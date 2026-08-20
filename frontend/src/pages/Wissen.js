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

      {/* ARTIKEL-LISTE */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-6 sm:grid-cols-2">
            {WISSEN_ARTICLES.map((a) => {
              const cat = WISSEN_CATEGORIES[a.category];
              return (
                <Link
                  key={a.slug}
                  to={`/wissen/${a.slug}`}
                  data-testid={`wissen-card-${a.slug}`}
                  className="group flex flex-col rounded-2xl border border-bank-border bg-bank-surface/40 p-7 shadow-editorial-sm transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-bank-gold/40 hover:shadow-editorial-md sm:p-8"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-full border border-bank-primary/30 bg-bank-primary/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-bank-primary">
                      {cat.label}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-bank-text-muted">
                      <Clock className="h-3.5 w-3.5" strokeWidth={1.4} aria-hidden />
                      {a.readingTime}
                    </span>
                  </div>
                  <h2
                    className="mt-5 font-display text-[1.4rem] font-light leading-tight tracking-[-0.015em] text-bank-text sm:text-[1.55rem]"
                    style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
                  >
                    {a.title}
                  </h2>
                  <p className="mt-3 flex-1 text-[14.5px] leading-relaxed text-bank-text-muted">{a.lede}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-[13.5px] font-semibold text-bank-primary group-hover:underline">
                    Weiterlesen
                    <ArrowUpRight className="h-4 w-4" strokeWidth={1.6} aria-hidden />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* HINWEIS + CTA */}
      <section className="border-t border-bank-border bg-bank-surface/30 py-14 sm:py-16">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
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
