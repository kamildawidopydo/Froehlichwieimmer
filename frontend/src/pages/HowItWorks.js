import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import PageMeta from '@/components/PageMeta';
import SectionLabel from '@/components/editorial/SectionLabel';
import siteImages from '@/data/siteImages';

const HERO_IMAGE = siteImages.howItWorks.hero;

const steps = [
  {
    number: '01',
    title: 'Konto erstellen',
    subtitle: 'Kostenlos registrieren',
    description:
      'Registrieren Sie sich in wenigen Minuten — E-Mail und sicheres Passwort genügen. Keine Kreditkarte nötig.',
    points: ['Keine Kreditkarte', 'Vergleichstools frei', 'Favoriten speichern'],
    image: siteImages.howItWorks.steps[0].src,
    imageAlt: siteImages.howItWorks.steps[0].alt,
  },
  {
    number: '02',
    title: 'Angebote vergleichen',
    subtitle: 'Zinsen & Laufzeiten',
    description:
      'Durchsuchen Sie Angebote regulierter EU-Banken. Filtern Sie nach Land, Zinssatz, Laufzeit und Mindestanlage.',
    points: ['Viele Partnerbanken', 'Aktuelle Konditionen', 'Transparente Details'],
    image: siteImages.howItWorks.steps[1].src,
    imageAlt: siteImages.howItWorks.steps[1].alt,
  },
  {
    number: '03',
    title: 'Option wählen',
    subtitle: 'Szenarien prüfen',
    description:
      'Nutzen Sie den Sparrechner und vergleichen Sie Laufzeiten. Speichern Sie Favoriten in Ihrem Konto.',
    points: ['Rechner integriert', 'Szenarien vergleichen', 'Dashboard'],
    image: siteImages.howItWorks.steps[2].src,
    imageAlt: siteImages.howItWorks.steps[2].alt,
  },
  {
    number: '04',
    title: 'Bei der Bank anfragen',
    subtitle: 'Abschluss beim Institut',
    description:
      'Senden Sie Ihre Anfrage an die gewählte Bank. Kontoeröffnung und Vertrag laufen dort.',
    points: ['Direkter Kontakt', 'EU-Einlagensicherung', 'Regulierte Partner'],
    image: siteImages.howItWorks.steps[3].src,
    imageAlt: siteImages.howItWorks.steps[3].alt,
  },
];

const HowItWorks = () => {
  const reduce = useReducedMotion();

  return (
    <div className="min-h-screen bg-bank-bg">
      <PageMeta
        title="So funktioniert es"
        description="In vier Schritten: registrieren, Sparangebote vergleichen, Optionen bewerten und eine Anfrage an die gewünschte Partnerbank senden."
        path="/how-it-works"
      />

      {/* HERO + step rail */}
      <section className="border-b border-bank-border bg-white">
        <div className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 sm:py-28 lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-12 lg:px-12 lg:py-32">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl lg:col-span-7"
          >
            <h1
              className="mt-5 font-display text-display-md font-light leading-[0.98] tracking-[-0.02em] text-bank-text sm:text-display-lg"
              style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
            >
              Vier Schritte.
              <span className="block italic text-bank-text-muted/85">Ein klarer Weg.</span>
            </h1>
            <div className="mt-7 h-px w-24 bg-bank-gold/55" aria-hidden />
            <p className="mt-7 max-w-prose text-[1.02rem] leading-[1.8] text-bank-text-muted">
              Von der Registrierung bis zur Weiterleitung an die Partnerbank — klar strukturiert, ohne Umwege und ohne
              versteckte Gebühren auf der Plattform.
            </p>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="relative mt-12 lg:col-span-5 lg:mt-0"
          >
            <div className="relative overflow-hidden rounded-sm border border-bank-border shadow-editorial-sm">
              <span className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-tr from-bank-bg/20 via-transparent to-transparent" aria-hidden />
              <img
                src={HERO_IMAGE}
                alt=""
                width={2000}
                height={1333}
                decoding="async"
                fetchpriority="high"
                className="aspect-[4/3] w-full object-cover object-[50%_45%] sm:aspect-[5/4]"
              />
            </div>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-bank-text-muted/80">
              Beratung & Planung — der Weg beginnt mit Klarheit
            </p>
          </motion.div>

          {/* Step rail — single brass hairline with numbered nodes */}
          <div className="mt-16 overflow-x-auto pb-2 [scrollbar-width:thin] lg:col-span-12">
            <div className="relative flex min-w-max items-start gap-0 pt-6">
              <span className="pointer-events-none absolute left-0 right-0 top-[2.375rem] h-px bg-gradient-to-r from-bank-gold/55 via-bank-gold/35 to-transparent" />
              {steps.map((step, i) => (
                <div key={step.number} className="relative flex w-[210px] flex-col sm:w-[240px]">
                  <div className="relative mb-7 flex items-center gap-4">
                    <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border border-bank-gold/55 bg-white font-mono text-[11px] font-medium text-bank-gold">
                      {step.number}
                    </span>
                    <span
                      className="font-display text-[1.6rem] font-light italic text-bank-primary"
                      style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
                    >
                      §{i + 1}
                    </span>
                  </div>
                  <p className="font-display text-[1.15rem] font-light text-bank-text">{step.title}</p>
                  <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
                    {step.subtitle}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stacked editorial blocks — alternating dark/light */}
      <section className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <SectionLabel
          eyebrow="Im Detail"
          title={
            <>
              Vom Konto bis zur
              <span className="ml-2 italic text-bank-text-muted">Anfrage.</span>
            </>
          }
          lede="Jeder Schritt — was wir tun, was Sie tun, und welche Garantien greifen."
          align="left"
          className="mb-14"
        />

        <div className="space-y-0 border border-bank-border bg-white">
          {steps.map((step, index) => {
            const isDark = index % 2 === 1;
            return (
              <motion.article
                key={step.number}
                initial={reduce ? false : { opacity: 0, y: 24 }}
                whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  'relative grid gap-10 overflow-hidden border-b border-bank-border p-8 last:border-b-0 md:grid-cols-12 md:gap-12 md:p-14 lg:p-16',
                  isDark ? 'bg-bank-ink text-white' : 'bg-white text-bank-text'
                )}
              >
                {isDark && <div className="topo-pattern absolute inset-0 opacity-[0.05]" aria-hidden />}
                <span
                  className={cn(
                    'absolute left-0 top-0 h-px w-1/2 bg-gradient-to-r',
                    isDark ? 'from-bank-gold/65 via-bank-gold/45 to-transparent' : 'from-bank-gold/55 via-bank-gold/35 to-transparent'
                  )}
                />
                <div className="relative md:col-span-4">
                  <h2
                    className="font-display text-[1.85rem] font-light leading-tight sm:text-[2.1rem]"
                    style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
                  >
                    {step.title}
                  </h2>
                  <p className={cn('mt-2 text-sm', isDark ? 'text-white/55' : 'text-bank-text-muted')}>
                    {step.subtitle}
                  </p>
                </div>
                <div className="relative md:col-span-8">
                  <div
                    className={cn(
                      'relative mb-10 overflow-hidden rounded-sm border shadow-editorial-sm',
                      isDark ? 'border-white/12 ring-1 ring-white/[0.06]' : 'border-bank-border'
                    )}
                  >
                    <img
                      src={step.image}
                      alt={step.imageAlt}
                      width={1600}
                      height={1000}
                      loading="lazy"
                      decoding="async"
                      className="aspect-[16/10] w-full object-cover sm:aspect-[2/1]"
                    />
                    <span
                      className={cn(
                        'pointer-events-none absolute inset-0 bg-gradient-to-t',
                        isDark ? 'from-bank-ink/50 via-transparent to-transparent' : 'from-bank-bg/25 via-transparent to-transparent'
                      )}
                      aria-hidden
                    />
                  </div>
                  <p
                    className={cn(
                      'max-w-prose font-sans text-[1.05rem] leading-[1.8] sm:text-[1.1rem]',
                      isDark ? 'text-white/80' : 'text-bank-text-muted'
                    )}
                  >
                    {step.description}
                  </p>
                  <ul className="mt-8 grid gap-3 sm:grid-cols-3">
                    {step.points.map((p, i) => (
                      <li
                        key={p}
                        className={cn(
                          'border-l-2 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em]',
                          isDark ? 'border-bank-gold/55 text-white/85' : 'border-bank-gold/55 text-bank-text-muted'
                        )}
                      >
                        <span className={cn('mr-2', isDark ? 'text-bank-gold-soft' : 'text-bank-gold')}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-bank-border bg-white py-20 lg:py-24">
        <div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-10 px-5 sm:px-8 lg:flex-row lg:items-end lg:px-12">
          <div className="max-w-2xl">
            <h2
              className="mt-5 font-display text-[2.2rem] font-light leading-[1.04] text-bank-text sm:text-[2.6rem]"
              style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
            >
              Bereit
              <em className="italic text-bank-text-muted"> zu vergleichen?</em>
            </h2>
            <p className="mt-5 max-w-xl text-[1.02rem] leading-[1.75] text-bank-text-muted">
              Starten Sie jetzt Ihren Vergleich oder eröffnen Sie Ihr kostenloses Konto für einen komfortablen Überblick
              über passende Angebote.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/comparison">
              <Button size="lg" variant="primary">
                Angebote vergleichen <ArrowUpRight className="ml-2 h-4 w-4" strokeWidth={LUCIDE_STROKE} />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HowItWorks;
