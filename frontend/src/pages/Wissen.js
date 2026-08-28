import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock } from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import Eyebrow from '@/components/editorial/Eyebrow';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WISSEN_ARTICLES, WISSEN_CATEGORIES } from '@/data/wissenArticles';
import { resolveAccentPair } from '@/design-system/accents';

/**
 * /wissen — redaktioneller Wissenshub.
 *
 * Struktur:
 *   1. Hero
 *   2. Investment-Wissenshub — prominent: Handeln + Fonds-Grundlagen
 *   3. Investmentthemen — Aktien, Anleihen, Dividenden
 *   4. Ratgeber & Perspektiven — bestehende Artikelliste
 *   5. Hinweis + CTA
 *
 * Terminologie ist mit knowledgeGraph.js abgestimmt:
 *   „Grundlagen ansehen"   → Wissenshub / Fonds
 *   „Thema verstehen"       → einzelne Investmentthemen
 */

const HUB_ITEMS = [
  {
    slug: 'handeln',
    href: '/handeln',
    kicker: 'Wissenshub',
    title: 'Investment & Börse verstehen',
    lede:
      'Grundlagen, Orderarten, Kosten, Risiken und ein Börsen-ABC mit über 50 Begriffen — kompakt an einem Ort.',
    cta: 'Zum Wissenshub',
  },
  {
    slug: 'fonds-grundlagen',
    href: '/fonds-grundlagen',
    kicker: 'Grundlagen',
    title: 'Fonds & ETFs verstehen',
    lede:
      'Wie Fonds funktionieren, worin sich aktive Fonds und ETFs unterscheiden — und was Anleger zu Kosten und Struktur wissen sollten.',
    cta: 'Grundlagen ansehen',
  },
];

const TOPIC_ITEMS = [
  {
    slug: 'aktien',
    href: '/themen/aktien',
    title: 'Aktien',
    lede:
      'Rolle von Aktien in einer langfristigen Vermögensstrategie — Chancen, Risiken und typische Fehler.',
  },
  {
    slug: 'anleihen',
    href: '/themen/anleihen',
    title: 'Anleihen',
    lede:
      'Wie festverzinsliche Papiere funktionieren — Kupon, Laufzeit, Bonität und die Rolle im Portfolio.',
  },
  {
    slug: 'dividenden',
    href: '/themen/dividenden',
    title: 'Dividenden',
    lede:
      'Ausschüttungsqualität statt Renditejagd — Dividenden richtig im Aktienkontext einordnen.',
  },
];

export default function Wissen() {
  // Session 80.46 — Editorial Rhythm: Ratgeber & Perspektiven bekommt eine
  // ruhige Champagne-Fläche (mit bestehenden Gold-Ornamenten kombinierbar
  // laut ALLOWED_ACCENT_PAIRS.champagne = ['navy', 'gold', 'violet']).
  // resolveAccentPair validiert die Kombination in DEV.
  const { secondary: editorial } = resolveAccentPair('gold', 'champagne');

  return (
    <div className="min-h-screen w-full bg-bank-bg text-bank-text" data-testid="wissen-page">
      <PageMeta
        title="Wissen — Investment-Grundlagen & Perspektiven"
        description="Der Wissensbereich der Fröhlich Vermögensberatung: Investment-Wissenshub, Fonds-Grundlagen, Investmentthemen und redaktionelle Ratgeber — verständlich, ohne Renditeversprechen."
        path="/wissen"
      />

      {/* HERO */}
      <section className="border-b border-bank-border bg-bank-ink text-white">
        <div className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-bank-gold">
            Wissensbereich
          </p>
          <h1
            className="mt-6 max-w-4xl font-display text-4xl font-light leading-[1.05] tracking-[-0.02em] sm:text-5xl lg:text-6xl"
            style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
          >
            Finanzwissen,<br />
            <span className="text-bank-gold italic font-light">verständlich erklärt.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-[15px] leading-relaxed text-white/85 sm:text-[16.5px]">
            Grundlagen zu Börse und Fonds, Themen im Fokus und redaktionelle Ratgeber
            an einem Ort. Neutral formuliert, ohne Renditeversprechen und ohne Produkt­empfehlung.
          </p>
        </div>
      </section>

      {/* INVESTMENT-WISSENSHUB — prominenter Zugang zu Handeln & Fonds-Grundlagen */}
      <section id="investment-hub" className="border-b border-bank-border bg-white">
        <div className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
          <Eyebrow>Investment-Wissenshub</Eyebrow>
          <h2 className="mt-4 max-w-3xl font-serif text-3xl leading-tight text-bank-text sm:text-[38px]">
            Die zwei Ausgangspunkte für jede Anlageentscheidung.
          </h2>
          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-bank-text-muted">
            Wer investiert, sollte zwei Dinge zuverlässig verstehen: wie die Börse funktioniert
            und wie Fonds als Bausteine wirken. Beide Bereiche sind hier in eigenständige,
            redaktionell aufbereitete Grundlagenseiten überführt.
          </p>

          <div className="mt-10 grid gap-6 sm:gap-8 lg:grid-cols-2">
            {HUB_ITEMS.map((h, i) => (
              <Link
                key={h.slug}
                to={h.href}
                data-testid={`wissen-hub-${h.slug}`}
                className="group flex flex-col justify-between border border-bank-border bg-white p-7 transition-colors hover:border-bank-gold/60 focus-visible:outline-none focus-visible:border-bank-gold focus-visible:ring-2 focus-visible:ring-bank-gold/30 sm:p-10"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-primary">
                      {h.kicker}
                    </span>
                  </div>
                  <h3
                    className="mt-5 font-display text-[28px] font-light leading-[1.1] tracking-[-0.015em] text-bank-text transition-colors group-hover:text-bank-primary sm:text-[32px]"
                    style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
                  >
                    {h.title}
                  </h3>
                  <p className="mt-4 max-w-md text-[15px] leading-relaxed text-bank-text-muted">
                    {h.lede}
                  </p>
                </div>
                <span className="mt-8 inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-bank-primary">
                  {h.cta}
                  <ArrowUpRight
                    size={13}
                    strokeWidth={1.7}
                    className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* INVESTMENTTHEMEN — Aktien, Anleihen, Dividenden */}
      <section id="themen" className="border-b border-bank-border bg-bank-bg">
        <div className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
          <Eyebrow>Themen im Fokus</Eyebrow>
          <h2 className="mt-4 max-w-3xl font-serif text-3xl leading-tight text-bank-text sm:text-[38px]">
            Was wir aktuell einordnen.
          </h2>
          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-bank-text-muted">
            Drei redaktionell begleitete Investmentthemen — jeweils mit Einordnung, aktuellen
            Nachrichten und einer klaren Perspektive statt Handlungs­aufruf.
          </p>

          <ul className="mt-10 divide-y divide-bank-border border-y border-bank-border">
            {TOPIC_ITEMS.map((t, i) => (
              <li key={t.slug}>
                <Link
                  to={t.href}
                  data-testid={`wissen-topic-${t.slug}`}
                  className="group grid gap-3 py-7 focus-visible:outline-none sm:grid-cols-[auto_1fr_auto] sm:items-baseline sm:gap-x-10 sm:py-8"
                >
                  <span
                    className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold sm:pt-2"
                    aria-hidden
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-primary">
                      Thema
                    </p>
                    <h3 className="mt-2 font-serif text-[22px] leading-snug text-bank-text transition-colors group-hover:text-bank-primary group-focus-visible:text-bank-primary sm:text-[26px]">
                      {t.title}
                    </h3>
                    <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-bank-text-muted">
                      {t.lede}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 self-center whitespace-nowrap text-[12px] font-medium uppercase tracking-[0.16em] text-bank-primary sm:self-end sm:pb-1.5">
                    Thema verstehen
                    <ArrowUpRight
                      size={13}
                      strokeWidth={1.7}
                      className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <Link
              to="/themen"
              data-testid="wissen-topics-overview"
              className="inline-flex items-center gap-1.5 border-b border-bank-primary pb-0.5 text-[12px] font-medium uppercase tracking-[0.16em] text-bank-primary transition-colors hover:text-bank-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/30"
            >
              Alle Investmentthemen
              <ArrowUpRight size={13} strokeWidth={1.7} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* RATGEBER & PERSPEKTIVEN — Champagne editorial surface (Session 80.46) */}
      <section
        id="ratgeber"
        className={`border-y border-bank-champagne-border ${editorial.tint}`}
        data-testid="wissen-ratgeber-section"
      >
        <div className="mx-auto max-w-[1100px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
          <Eyebrow>Ratgeber &amp; Perspektiven</Eyebrow>
          <h2 className="mt-4 max-w-3xl font-serif text-3xl leading-tight text-bank-text sm:text-[38px]">
            Beiträge aus der Redaktion.
          </h2>
          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-bank-text-muted">
            Ausgewählte Grundlagen­beiträge zu Sparen, Anlageklassen und Vermögens­planung —
            zum Nachschlagen und Einordnen.
          </p>

          <div className="mt-10 divide-y divide-bank-champagne-border border-y border-bank-champagne-border">
            {WISSEN_ARTICLES.map((a, i) => {
              const cat = WISSEN_CATEGORIES[a.category];
              return (
                <Link
                  key={a.slug}
                  to={`/wissen/${a.slug}`}
                  data-testid={`wissen-card-${a.slug}`}
                  className="group grid gap-6 py-10 focus-visible:outline-none sm:grid-cols-[auto_1fr_auto] sm:items-baseline sm:gap-x-10 sm:py-12"
                >
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold sm:pt-2">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-bank-text-muted">
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-primary">
                        {cat.label}
                      </span>
                      <span aria-hidden className="text-bank-text-muted/50">·</span>
                      <span className="inline-flex items-center gap-1.5 text-[11.5px]">
                        <Clock className="h-3.5 w-3.5" strokeWidth={1.4} aria-hidden />
                        {a.readingTime}
                      </span>
                    </div>
                    <h3
                      className="mt-4 font-display text-[1.55rem] font-light leading-[1.15] tracking-[-0.015em] text-bank-text transition-colors group-hover:text-bank-primary sm:text-[1.85rem]"
                      style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
                    >
                      {a.title}
                    </h3>
                    <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-bank-text-muted">
                      {a.lede}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-2 self-center text-[13.5px] font-semibold text-bank-primary sm:self-end sm:pb-2">
                    Weiterlesen
                    <ArrowUpRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      strokeWidth={1.6}
                      aria-hidden
                    />
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
            Hinweis: Die Beiträge in diesem Bereich dienen der allgemeinen Information und
            stellen keine individuelle Anlageberatung dar. Eine persönliche Empfehlung setzt
            immer die Betrachtung Ihrer individuellen Situation, Ziele und Erfahrungen im
            Gespräch voraus.
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
              data-testid="wissen-cta-leistungen"
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
