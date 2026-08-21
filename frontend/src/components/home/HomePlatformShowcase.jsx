import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ShieldCheck, HandCoins, Clock } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const EASE = [0.22, 1, 0.36, 1];
const LUCIDE_STROKE = 1.4;

const VALUES = [
  {
    icon: ShieldCheck,
    label: 'Sicherheit & Rendite',
    body:
      'Investments werden nicht ausschließlich anhand der Rendite betrachtet. Sicherheit, Risiko, Verfügbarkeit und persönliche Ziele gehören zur Entscheidung.',
  },
  {
    icon: HandCoins,
    label: 'Langfristig an Ihrer Seite',
    body:
      'Die Betreuung endet nicht mit dem Abschluss eines Investments. Wir begleiten unsere Anleger auch bei zukünftigen finanziellen Entscheidungen und besonderen Situationen.',
  },
  {
    icon: Clock,
    label: '7 Tage erreichbar',
    body:
      'Persönliche Ansprechpartner und Erreichbarkeit sieben Tage die Woche für unsere Anleger.',
  },
];

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
        {/* LEDE */}
        <motion.div {...fade(0)} className="max-w-4xl">
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
          <p className="mt-8 max-w-3xl font-display text-[1.15rem] font-light leading-[1.5] tracking-[-0.005em] text-bank-text sm:text-[1.35rem]">
            Ihr Vermögen verdient mehr als nur eine gute Rendite.
          </p>
          <div className="mt-8 max-w-3xl space-y-5 text-[15.5px] leading-[1.85] text-bank-text-muted sm:text-[16px]">
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
            Wir denken nicht in einzelnen Produkten. Wir denken in Ihrem Vermögen als Ganzes.
          </blockquote>
          <figcaption className="mt-6 max-w-2xl text-[14.5px] leading-relaxed text-bank-text-muted">
            Heute die richtige Anlage. Morgen die passende Bank. Und auch übermorgen ein persönlicher Ansprechpartner an
            Ihrer Seite.
          </figcaption>
        </motion.figure>

        {/* 3 WERTE — editorial, ohne Karten-Kasten */}
        <motion.div {...fade(4)} className="mt-24 sm:mt-28">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-gold">Was uns ausmacht</p>
          <p
            className="mt-4 max-w-3xl font-display text-[1.25rem] font-light leading-[1.35] tracking-[-0.01em] text-bank-text sm:text-[1.45rem]"
            style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
          >
            Alle Banken. Alle Investments. Eine Plattform. Sieben Tage die Woche an Ihrer Seite.
          </p>

          <div className="mt-10 grid gap-x-12 gap-y-12 lg:grid-cols-3 lg:gap-x-16">
            {VALUES.map(({ icon: Icon, label, body }, i) => (
              <div key={label} className="group">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="h-px flex-1 bg-bank-border" aria-hidden />
                  <Icon
                    className="h-5 w-5 shrink-0 text-bank-primary transition-transform duration-300 group-hover:-translate-y-0.5"
                    strokeWidth={LUCIDE_STROKE}
                    aria-hidden
                  />
                </div>
                <h3
                  className="mt-5 font-display text-[1.3rem] font-light leading-tight tracking-[-0.01em] text-bank-text sm:text-[1.4rem]"
                  style={{ fontVariationSettings: "'opsz' 120, 'SOFT' 100" }}
                >
                  {label}
                </h3>
                <p className="mt-3 text-[14.5px] leading-[1.75] text-bank-text-muted">{body}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div {...fade(5)} className="mt-24 flex flex-wrap items-center gap-3 border-t border-bank-border pt-12 sm:mt-28 sm:gap-4">
          <Link
            to="/contact"
            data-testid="platform-showcase-cta-contact"
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
        </motion.div>
      </div>
    </section>
  );
}
