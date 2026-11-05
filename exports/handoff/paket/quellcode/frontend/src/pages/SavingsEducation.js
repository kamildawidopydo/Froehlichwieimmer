import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import PageMeta from '@/components/PageMeta';
import Pullquote from '@/components/editorial/Pullquote';
import TocSticky from '@/components/editorial/TocSticky';
import { cn } from '@/lib/utils';
import siteImages from '@/data/siteImages';

const EDU_IMG = {
  hero: siteImages.savingsEducation.hero,
  eigentum: siteImages.savingsEducation.section1,
  steuern: siteImages.savingsEducation.section2,
};

function EditorialImage({ src, alt, priority = false, className = '' }) {
  return (
    <figure
      className={`relative overflow-hidden rounded-sm border border-bank-border bg-bank-bg shadow-editorial-sm ${className}`}
    >
      <img
        src={src}
        alt={alt}
        width={1400}
        height={875}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className="aspect-[16/10] w-full object-cover object-center sm:aspect-[2/1]"
      />
      <span
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bank-bg/35 via-transparent to-transparent"
        aria-hidden
      />
    </figure>
  );
}

const sections = [
  { id: 'sicherheit', label: 'Sicherheit in der EU' },
  { id: 'eigentum', label: 'Gehört mein Geld noch mir?' },
  { id: 'steuern', label: 'Wie werden Zinsen versteuert?' },
  { id: 'doppelt', label: 'Keine Doppelbesteuerung' },
  { id: 'beachten', label: 'Was Anleger beachten' },
];

const Spacer = () => (
  <div className="my-16 flex items-center gap-5" aria-hidden>
    <span className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-bank-gold">§</span>
    <span className="h-px flex-1 bg-bank-border" />
  </div>
);

const proseClass =
  'prose-copy w-full min-w-0 max-w-full space-y-5 font-sans text-[15px] leading-[1.8] text-bank-text-muted sm:max-w-prose sm:text-[15.5px] sm:leading-[1.85]';

const articleShell =
  'w-full min-w-0 max-w-full border border-bank-border bg-white p-5 sm:p-10 lg:p-14';

const ChapterHead = ({ id, title, sub }) => (
  <header id={id} className="w-full min-w-0 max-w-full scroll-mt-32 border-b border-bank-border pb-8">
    <h2
      className="w-full max-w-full break-words font-display text-[clamp(1.35rem,4vw+0.65rem,2.2rem)] font-light leading-[1.12] tracking-[-0.005em] text-bank-text [overflow-wrap:anywhere]"
      style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
    >
      {title}
    </h2>
    {sub && <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">{sub}</p>}
    <div className="mt-5 h-px w-16 bg-bank-gold/55" aria-hidden />
  </header>
);

const SavingsEducation = () => {
  const reduce = useReducedMotion();
  const fade = (i = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 18 },
    whileInView: reduce ? undefined : { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: 0.55, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] },
  });

  return (
    <div className="min-h-screen w-full min-w-0 bg-bank-bg">
      <PageMeta
        title="Sparwissen zu EU-Banken"
        description="Grundlagen zu Einlagensicherung, Steuern und sicherem Sparen bei EU-Banken — kompakt und verständlich erklärt."
        path="/savings-education"
      />

      {/* HERO */}
      <section className="border-b border-bank-border bg-white">
        <div className="mx-auto w-full min-w-0 max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="flex w-full min-w-0 flex-col gap-12 lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-12">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="w-full min-w-0 max-w-full lg:col-span-7 lg:max-w-3xl"
            >
              <h1
                className="mt-5 break-words font-display text-display-md font-light leading-[0.98] tracking-[-0.02em] text-bank-text sm:text-display-lg"
                style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
              >
                Sparen bei EU-Banken
                <span className="block italic text-bank-text-muted/85">— klar erklärt.</span>
              </h1>
              <div className="mt-7 h-px w-24 bg-bank-gold/55" aria-hidden />
              <p className="prose-copy mt-7 w-full min-w-0 max-w-full text-[1.02rem] leading-[1.8] text-bank-text-muted sm:max-w-prose">
                Einlagensicherung, Eigentum am Geld, Steuern und praktische Hinweise — kompakt und verständlich.
              </p>
              <Link
                to="/comparison"
                className="mt-10 inline-flex items-center gap-2 border border-bank-border px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text transition-colors hover:border-bank-gold/55 hover:text-bank-primary"
              >
                Angebote ansehen
              </Link>
            </motion.div>
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="mt-12 w-full min-w-0 lg:col-span-5 lg:mt-2"
            >
              <EditorialImage
                src={EDU_IMG.hero}
                alt={siteImages.savingsEducation.heroAlt}
                priority
              />
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-bank-text-muted/85">
                Planung · Transparenz · EU-Rahmen
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* MAIN — sticky TOC + chapters */}
      <section className="mx-auto w-full min-w-0 max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="flex w-full min-w-0 max-w-full flex-col gap-y-16 lg:grid lg:grid-cols-12 lg:gap-x-10">
          <div className="w-full min-w-0 lg:col-span-3">
            <TocSticky items={sections} />
          </div>

          <div className="w-full min-w-0 max-w-full lg:col-span-9">
            {/* I. Sicherheit */}
            <motion.article {...fade(0)} className={articleShell}>
              <ChapterHead id="sicherheit" title="Sicherheit in der EU" sub="Wie Ihre Ersparnisse geschützt sind" />
              <div className={cn(proseClass, 'mt-10')}>
                <p className="drop-cap text-bank-text">
                  <strong className="font-semibold text-bank-text">Gute Nachricht:</strong> Banken in der Europäischen
                  Union unterliegen strengen regulatorischen Vorgaben — das schafft ein hohes Maß an Sicherheit für Ihr
                  Geld.
                </p>
                <p>
                  Alle EU-Länder haben ein <strong className="font-semibold text-bank-text">Einlagensicherungssystem</strong>.
                  Es schützt Ihr Geld, falls eine Bank in Schieflage gerät.
                </p>
              </div>

              <div className="mt-10 w-full min-w-0 border border-bank-gold/45 bg-bank-gold-soft/15 p-5 sm:p-7">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bank-gold">
                  Wichtige Information
                </p>
                <p className="prose-copy mt-3 text-[14.5px] leading-[1.75] text-bank-text">
                  Einlagen bis zu{' '}
                  <span className="rate-figure font-semibold text-bank-text">100.000 €</span>{' '}
                  sind je Kunde und Bank durch die europäische Einlagensicherung gesetzlich geschützt.
                </p>
              </div>
            </motion.article>

            <Spacer />

            {/* II. Eigentum */}
            <motion.article {...fade(0)} className={articleShell}>
              <ChapterHead id="eigentum" title="Gehört mein Geld noch mir?" sub="Die wichtigste Frage" />
              <div className={cn(proseClass, 'mt-10')}>
                <p>
                  <strong className="font-semibold text-bank-text">Ja.</strong> Eingezahltes Geld bleibt Ihr Eigentum;
                  die Bank verwahrt es für Sie.
                </p>
                <p>
                  Im Fall finanzieller Schwierigkeiten einer Bank greift die gesetzliche Einlagensicherung — Ihr
                  geschütztes Guthaben wird Ihnen im Rahmen der gesetzlichen Grenzen erstattet.
                </p>
              </div>
              <div className="mt-10 grid gap-3 sm:grid-cols-2">
                {[
                  'Ihr Geld bleibt Ihr Eigentum',
                  'Schutz auch bei Bankproblemen',
                  'Gesetzliche Garantie bis 100.000 €',
                  'EU-weit einheitlicher Rahmen',
                ].map((t, i) => (
                  <div
                    key={t}
                    className="flex min-w-0 items-start gap-3 border-l-2 border-bank-gold/55 px-4 py-3 text-[13.5px] leading-[1.65] text-bank-text-muted"
                  >
                    <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-gold">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 [overflow-wrap:anywhere]">{t}</span>
                  </div>
                ))}
              </div>
              <div className="mt-10">
                <EditorialImage
                  src={EDU_IMG.eigentum}
                  alt={siteImages.savingsEducation.section1Alt}
                />
              </div>
            </motion.article>

            <Spacer />

            {/* III. Steuern */}
            <motion.article {...fade(0)} className={articleShell}>
              <ChapterHead id="steuern" title="Wie werden Zinsen versteuert?" sub="Kurz erklärt" />
              <p className={cn(proseClass, 'mt-10')}>
                Als deutscher Anleger versteuern Sie Zinserträge in der Regel{' '}
                <strong className="font-semibold text-bank-text">in Deutschland</strong> — unabhängig vom Sitz der Bank
                in der EU.
              </p>
              <div className="mt-10">
                <EditorialImage
                  src={EDU_IMG.steuern}
                  alt={siteImages.savingsEducation.section2Alt}
                />
              </div>
              <div className="mt-10 space-y-3">
                {[
                  {
                    n: '01',
                    t: 'Kapitalertragsteuer',
                    d: 'In Deutschland ca. 25 % zuzüglich Solidaritätszuschlag (insgesamt rund 26,375 %).',
                  },
                  {
                    n: '02',
                    t: 'Sparerpauschbetrag',
                    d: 'Freibetrag von 1.000 € pro Jahr (Einzelperson) — Zinsen bis dorthin steuerfrei.',
                  },
                  {
                    n: '03',
                    t: 'Steuererklärung',
                    d: 'Zinsen aus ausländischen Banken in der deutschen Steuererklärung angeben.',
                  },
                ].map((row) => (
                  <div key={row.n} className="flex min-w-0 gap-4 border border-bank-border p-4 sm:gap-5 sm:p-5">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-bank-border bg-bank-bg font-mono text-[13px] tabular-nums text-bank-gold">
                      {row.n}
                    </span>
                    <div className="min-w-0 [overflow-wrap:anywhere]">
                      <p
                        className="font-display text-[1.1rem] font-light italic text-bank-text"
                        style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
                      >
                        {row.t}
                      </p>
                      <p className="mt-1 text-sm leading-[1.7] text-bank-text-muted">{row.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.article>

            <Spacer />

            {/* IV. Doppelbesteuerung */}
            <motion.article {...fade(0)} className={articleShell}>
              <ChapterHead id="doppelt" title="Keine doppelte Besteuerung" sub="Abkommen zwischen den EU-Ländern" />
              <div className={cn(proseClass, 'mt-10')}>
                <p>
                  <strong className="font-semibold text-bank-text">Keine Sorge:</strong> Zinsen müssen nicht doppelt
                  versteuert werden.
                </p>
                <p>
                  <strong className="font-semibold text-bank-text">Doppelbesteuerungsabkommen</strong> regeln, dass
                  Zinserträge in der Regel nur im Wohnsitzland besteuert werden.
                </p>
              </div>
              <Pullquote className="min-w-0 max-w-full">
                Was im Wohnsitzland zählt, zählt zuerst. Doppelbesteuerung ist im EU-Raum die Ausnahme — nicht die Regel.
              </Pullquote>
              <div className="mt-2 w-full min-w-0 border-l-2 border-bank-gold/55 bg-bank-bg p-5 sm:p-7">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">Das bedeutet für Sie</p>
                <p className="prose-copy mt-2 text-[14.5px] leading-[1.75] text-bank-text-muted">
                  Als deutscher Anleger werden Zinserträge in der Regel ausschließlich in Deutschland besteuert —
                  unabhängig davon, in welchem EU-Mitgliedstaat sich die Bank befindet.
                </p>
              </div>
            </motion.article>

            <Spacer />

            {/* VI. Beachten */}
            <motion.article {...fade(0)} className={articleShell}>
              <ChapterHead id="beachten" title="Das sollten Anleger beachten" sub="Drei Punkte" />
              <div className="mt-10 space-y-3">
                {[
                  { n: '01', t: 'Einlagensicherung prüfen', d: 'Bank sollte der EU-Einlagensicherung unterliegen (bis 100.000 €).' },
                  { n: '02', t: 'Zinsen in der Steuererklärung', d: 'Zinsen aus ausländischen Banken nicht vergessen.' },
                  { n: '03', t: 'Sparerpauschbetrag nutzen', d: 'Freibetrag 1.000 € pro Jahr sinnvoll einplanen.' },
                ].map((row) => (
                  <div key={row.n} className="flex min-w-0 gap-4 border border-bank-border p-4 sm:gap-5 sm:p-5">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-bank-gold/55 bg-bank-gold-soft/15 font-mono text-[13px] font-medium tabular-nums text-bank-gold">
                      {row.n}
                    </span>
                    <div className="min-w-0 [overflow-wrap:anywhere]">
                      <p
                        className="font-display text-[1.1rem] font-light italic text-bank-text"
                        style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
                      >
                        {row.t}
                      </p>
                      <p className="mt-1 text-sm leading-[1.7] text-bank-text-muted">{row.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.article>

            {/* HINT */}
            <div className="mt-16 w-full min-w-0 max-w-full border border-bank-gold/45 bg-bank-gold-soft/15 p-5 sm:p-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bank-gold">Wichtiger Hinweis</p>
              <p className="prose-copy mt-3 w-full min-w-0 max-w-full text-[14px] leading-[1.8] text-bank-text-muted sm:max-w-prose">
                Keine Steuerberatung. Regelungen können sich ändern und hängen von Ihrer Situation ab — bei
                konkreten Fragen einen <strong className="font-semibold text-bank-text">Steuerberater</strong>{' '}
                konsultieren.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SavingsEducation;
