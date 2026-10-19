import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import TabletMockup from '@/components/editorial/TabletMockup';
import DashboardShowcase from '@/components/editorial/DashboardShowcase';

const EASE = [0.22, 1, 0.36, 1];

const CHAPTERS = [
  {
    eyebrow: '01 — Überblick',
    heading: 'Heute investieren. Morgen flexibel bleiben.',
    paragraphs: [
      'Gute Vermögensberatung denkt weiter als bis zur nächsten Anlageentscheidung. Wir möchten Sie langfristig begleiten — in jeder finanziellen Lebenslage.',
      'Vielleicht möchten Sie morgen eine Immobilie im Ausland erwerben, benötigen kurzfristig Liquidität oder suchen für eine besondere Transaktion die passende Bank. Dann möchten wir der Ansprechpartner sein, der Ihre Situation bereits kennt, die Möglichkeiten prüft und Sie bei der passenden Lösung unterstützt.',
    ],
  },
  {
    eyebrow: '02 — Erreichbarkeit',
    heading: 'Persönlich erreichbar. Auch wenn es darauf ankommt.',
    paragraphs: [
      'Finanzielle Entscheidungen richten sich nicht immer nach klassischen Geschäftszeiten. Deshalb sind unsere Berater darauf ausgerichtet, für unsere Anleger sieben Tage die Woche erreichbar zu sein.',
      'Ob eine wichtige Frage zu Ihrem Investment, eine kurzfristige Entscheidung oder eine besondere Situation: Sie sollen wissen, dass Sie einen persönlichen Ansprechpartner haben, der Ihre Vermögenssituation kennt und für Sie da ist.',
    ],
  },
];

export default function PlatformShowcase() {
  const reduce = useReducedMotion();
  const fade = (i = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 18 },
    whileInView: reduce ? undefined : { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: reduce ? 0 : 0.55, delay: reduce ? 0 : 0.06 * i, ease: EASE },
  });

  return (
    <section
      aria-labelledby="platform-showcase-title"
      className="relative border-t border-bank-border bg-bank-bg py-20 sm:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
        {/* LEDE + TABLET */}
        <div className="grid gap-x-12 gap-y-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-x-16">
          <motion.div {...fade(0)} className="max-w-3xl">
            {/* Session 80.26d — Blush editorial dateline (subtle brand signature). */}
            <p className="mb-3 inline-flex items-center gap-2 font-mono text-[9.5px] font-semibold uppercase tracking-[0.32em] text-bank-rose-strong">
              <span aria-hidden className="inline-block h-px w-6 bg-bank-rose/70" />
              Seit 2020
            </p>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-gold">
              Investmentplattform &amp; Vermögensberatung
            </p>
            <h2
              id="platform-showcase-title"
              className="mt-6 font-display text-[clamp(1.85rem,4vw+0.6rem,3rem)] font-light leading-[1.05] tracking-[-0.02em] text-bank-text"
              style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
            >
              Ein Login. Alle Investments.
              <br />
              <span className="text-bank-primary">Ein Partner an Ihrer Seite.</span>
            </h2>
            <p className="mt-8 font-display text-[1.15rem] font-light leading-[1.5] tracking-[-0.005em] text-bank-text sm:text-[1.35rem]">
              Ihr Vermögen verdient mehr als nur eine gute Rendite.
            </p>
            <div className="mt-8 space-y-5 text-[15.5px] leading-[1.85] text-bank-text-muted sm:text-[16px]">
              <p>
                Ob Tagesgeld, Festgeld, Flexgeld, Aktien, Anleihen oder Fonds — mit Fröhlich Vermögensberatung behalten Sie
                Ihre Kapitalanlagen und Bankverbindungen zentral über eine einzige Oberfläche im Blick.
              </p>
              <p>
                Doch für uns beginnt Vermögensberatung nicht bei der höchsten Rendite. Entscheidend ist das Zusammenspiel
                aus Renditechancen, Sicherheit, Verfügbarkeit und Risiko — abgestimmt auf Ihre persönlichen Ziele.
              </p>
              <p>
                Eine Empfehlung sprechen wir nur aus, wenn wir selbst davon überzeugt sind. Dafür prüfen, vergleichen und
                hinterfragen wir. Denn hinter jedem Investment steht nicht nur Kapital, sondern Ihr Vertrauen und Ihre
                Zukunft.
              </p>
            </div>
          </motion.div>

          {/* Tablet-Mockup rechts (Desktop) / darunter (Mobile) */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: reduce ? 0 : 0.65, delay: reduce ? 0 : 0.15, ease: EASE }}
            className="relative"
            data-testid="platform-tablet-mockup"
          >
            <TabletMockup className="lg:ml-auto">
              <DashboardShowcase />
            </TabletMockup>
          </motion.div>
        </div>

        {/* KAPITEL — nummerierte editorial Struktur */}
        <div className="mt-20 grid gap-x-14 gap-y-16 sm:mt-24 lg:grid-cols-2 lg:gap-y-20">
          {CHAPTERS.map((c, i) => (
            <motion.article
              key={c.heading}
              {...fade(i + 1)}
              className="border-t border-bank-border pt-10"
            >
              <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-gold">{c.eyebrow}</p>
              <h3
                className="mt-5 font-display text-[1.55rem] font-light leading-[1.15] tracking-[-0.015em] text-bank-text sm:text-[1.75rem]"
                style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
              >
                {c.heading}
              </h3>
              <div className="mt-6 space-y-4 text-[15px] leading-[1.8] text-bank-text-muted">
                {c.paragraphs.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
              </div>
            </motion.article>
          ))}
        </div>

        {/* PULLQUOTE */}
        <motion.figure {...fade(3)} className="mt-24 border-l-2 border-bank-gold/60 pl-6 sm:mt-28 sm:pl-8">
          <blockquote
            className="max-w-4xl font-display text-[clamp(1.35rem,2.8vw+0.6rem,2rem)] font-light leading-[1.2] tracking-[-0.015em] text-bank-text"
            style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
          >
            Ihr Vermögen. Ihre Ziele. Eine Strategie, die beides verbindet.
          </blockquote>
          <figcaption className="mt-6 max-w-2xl text-[14.5px] leading-relaxed text-bank-text-muted">
            Persönliche Beratung und ausgewählte Anlagelösungen schaffen die Grundlage für langfristig durchdachte Entscheidungen.
          </figcaption>
        </motion.figure>

        {/* CTA */}
        <motion.div {...fade(4)} className="mt-20 flex flex-wrap items-center gap-3 border-t border-bank-border pt-12 sm:mt-24 sm:gap-4">
          <Link
            to="/contact"
            data-testid="platform-showcase-cta-contact"
            className={cn(buttonVariants({ variant: 'default', size: 'lg' }), 'inline-flex cursor-pointer')}
          >
            Persönliches Gespräch vereinbaren
            <ArrowUpRight className="ml-2 h-4 w-4" strokeWidth={1.6} aria-hidden />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
