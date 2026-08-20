import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import PageMeta from '@/components/PageMeta';
import { Button } from '@/components/ui/button';
import SectionLabel from '@/components/editorial/SectionLabel';
import Pullquote from '@/components/editorial/Pullquote';
import siteImages from '@/data/siteImages';

const SECURITY_HERO_IMAGE = siteImages.security.hero;
const SECURITY_EDITORIAL_IMAGE = siteImages.security.editorial;

const pillars = [
  {
    id: 'bank',
    title: 'Bankentaugliche Sicherheit',
    lead:
      'Fröhlich Vermögensberatung setzt auf etablierte Sicherheitsmechanismen nach dem Vorbild von Finanzinstituten, damit Ihre Daten während der Nutzung der Plattform bestmöglich geschützt sind.',
    bullets: [
      '256-Bit-SSL für Datenübertragungen',
      'Sichere Passwort-Hashes (branchenüblich)',
      'Regelmäßige Sicherheitsprüfungen',
      'Einhaltung europäischer Datenschutzstandards',
    ],
  },
  {
    id: 'privacy',
    title: 'Datenschutz',
    lead:
      'Wir arbeiten DSGVO-konform. Ihre Angaben werden nur für die angegebenen Zwecke genutzt und nicht verkauft.',
    bullets: [
      'Datenminimierung bei Erhebung',
      'Verschlüsselte Speicherung',
      'Auskunft, Berichtigung, Löschung — Ihre Rechte',
      'Kein Weiterverkauf personenbezogener Daten',
    ],
  },
  {
    id: 'transparency',
    title: 'Transparenz',
    lead:
      'Wir sind Vermittler und Vergleichsplattform — kein Depot, kein Zugriff auf Ihre Einlagen bei Banken.',
    bullets: [
      'Anzeige aktueller Bankinformationen',
      'Nur lizenzierte Partner',
      'Klare Darstellung unserer Rolle',
    ],
  },
  {
    id: 'partners',
    title: 'Partnerbanken',
    lead:
      'Unsere Partner sind regulierte Institute in der EU und unterliegen nationaler Bankenaufsicht.',
    bullets: [
      'Einlagensicherung bis ca. 100.000 € pro Kunde und Bank',
      'Aufsicht durch nationale Behörden',
      'Regelmäßige Prüfung der Partnerschaften',
    ],
  },
];

const Security = () => {
  const reduce = useReducedMotion();

  return (
    <div className="min-h-screen bg-bank-bg">
      <PageMeta
        title="Sicherheit"
        description="Informationen zu Verschlüsselung, Datenschutz, Einlagensicherung und unserer Rolle als Vermittlungsplattform mit regulierten EU-Partnerbanken."
        path="/security"
      />

      {/* ───────── HERO — dark editorial cover + Infrastruktur-Foto ───────── */}
      <section className="relative isolate overflow-hidden bg-bank-ink text-white">
        <div className="absolute inset-0" aria-hidden>
          <img
            src={SECURITY_HERO_IMAGE}
            alt=""
            width={2400}
            height={1600}
            decoding="async"
            fetchpriority="high"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[50%_40%] opacity-[0.42] sm:object-center"
          />
          <div
            className="absolute inset-0 bg-gradient-to-br from-bank-ink from-[5%] via-bank-ink/95 to-bank-ink/85"
            aria-hidden
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bank-ink via-transparent to-bank-ink/55" aria-hidden />
        </div>
        <div className="topo-pattern pointer-events-none absolute inset-0 z-[1] opacity-[0.07]" aria-hidden />
        <div
          className="pointer-events-none absolute -top-32 right-[-10%] z-[1] h-[420px] w-[420px] rounded-full bg-bank-gold/12 blur-3xl"
          aria-hidden
        />
        <div className="relative z-[2] mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:grid lg:grid-cols-12 lg:items-end lg:gap-x-8 lg:px-12 lg:py-32">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-7"
          >
            <h1
              className="mt-6 font-display text-display-md font-light leading-[0.98] tracking-[-0.02em] text-white sm:text-display-lg"
              style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
            >
              Sicherheit
              <span className="block italic text-bank-gold-soft">&amp; Vertrauen.</span>
            </h1>
            <div className="mt-8 h-px w-24 bg-bank-gold/70" aria-hidden />
          </motion.div>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 lg:col-span-5 lg:mt-0"
          >
            <p className="font-sans text-[1.02rem] leading-[1.8] text-white/75">
              Schutz Ihrer Daten, klare Rollen und regulierte Partner — damit Sie die Plattform mit Ruhe nutzen können.
            </p>
            <ul className="mt-8 grid grid-cols-2 gap-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/65">
              <li className="border-l border-bank-gold/55 pl-3">256-bit SSL</li>
              <li className="border-l border-bank-gold/55 pl-3">DSGVO konform</li>
              <li className="border-l border-bank-gold/55 pl-3">EU-aufsicht</li>
              <li className="border-l border-bank-gold/55 pl-3">100.000 € schutz</li>
            </ul>
          </motion.div>
        </div>
      </section>

      {/* ───────── PILLARS — asymmetric editorial grid ───────── */}
      <section className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <SectionLabel
          eyebrow="Vier Säulen"
          title={
            <>
              Vier Säulen,
              <span className="ml-2 italic text-bank-text-muted">die tragen.</span>
            </>
          }
          lede="Vom Übertragungsprotokoll bis zur europäischen Einlagensicherung — wir machen sichtbar, was uns trägt."
          align="left"
          className="mb-16"
        />

        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
          {pillars.map((block, i) => {
            const span =
              i === 0 ? 'lg:col-span-7' : i === 1 ? 'lg:col-span-5' : i === 2 ? 'lg:col-span-5' : 'lg:col-span-7';
            return (
              <motion.article
                key={block.id}
                initial={reduce ? false : { opacity: 0, y: 18 }}
                whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className={`group relative border border-bank-border bg-white p-8 transition-shadow duration-500 hover:shadow-editorial-md sm:p-10 lg:p-12 ${span}`}
              >
                <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/55 via-bank-gold/65 to-transparent" />
                <div>
                  <h2
                    className="font-display text-[1.8rem] font-light leading-tight text-bank-text sm:text-[2rem]"
                    style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
                  >
                    {block.title}
                  </h2>
                  <p className="mt-4 max-w-prose text-[15px] leading-[1.75] text-bank-text-muted">{block.lead}</p>
                  <ul className="mt-7 space-y-2.5 border-t border-bank-border/60 pt-6">
                    {block.bullets.map((b) => (
                      <li key={b} className="text-[14px] leading-[1.65] text-bank-text-muted">
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.article>
            );
          })}
        </div>

        {/* Editorial — Cyber-Security-Kontext (Unsplash, proxied) */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-20 grid max-w-[1440px] overflow-hidden border border-bank-border bg-white shadow-editorial-sm lg:grid-cols-12"
        >
          <div className="relative min-h-[220px] border-b border-bank-border bg-bank-ink sm:min-h-[260px] lg:col-span-5 lg:min-h-[300px] lg:border-b-0 lg:border-r lg:border-bank-border">
            <img
              src={SECURITY_EDITORIAL_IMAGE}
              alt=""
              width={1600}
              height={1067}
              loading="lazy"
              decoding="async"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-95"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-bank-ink/55 via-transparent to-bank-ink/25 lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-white/95"
              aria-hidden
            />
          </div>
          <div className="flex flex-col justify-center px-7 py-10 sm:px-10 sm:py-12 lg:col-span-7 lg:px-12 lg:py-14">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-gold">Schichten des Schutzes</p>
            <p className="mt-4 font-sans text-[15px] leading-[1.8] text-bank-text-muted">
              Technische Absicherung und organisatorische Prozesse greifen ineinander — vom verschlüsselten Transport bis
              zur nachvollziehbaren Verarbeitung in regulierten Kontexten. Die Fotos stehen sinnbildlich für
              Infrastruktur und wachsame IT-Sicherheit; verbindliche Details finden Sie in unseren{' '}
              <Link to="/compliance" className="text-bank-text underline decoration-bank-gold/50 underline-offset-4 transition-colors hover:text-bank-gold">
                Compliance-Hinweisen
              </Link>
              .
            </p>
          </div>
        </motion.div>

        {/* Pull-quote interlude */}
        <div className="mx-auto mt-20 max-w-3xl">
          <Pullquote>
            Wir halten kein Geld. Wir halten Standards. Ihre Einlagen liegen — wo sie hingehören — bei lizenzierten
            europäischen Häusern.
          </Pullquote>
        </div>

        {/* Closing CTA — dark band */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-20 overflow-hidden border border-bank-border bg-bank-ink px-7 py-12 text-white sm:px-12 sm:py-14"
        >
          <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bank-gold/70 to-transparent" />
          <div className="topo-pattern absolute inset-0 opacity-[0.06]" aria-hidden />
          <div className="relative grid grid-cols-12 gap-y-6">
            <div className="col-span-12 lg:col-span-8">
              <h3
                className="mt-4 font-display text-[1.8rem] font-light leading-tight sm:text-[2.1rem]"
                style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
              >
                <em className="italic text-bank-gold-soft">Wir antworten</em> — schriftlich, nachvollziehbar.
              </h3>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">
                Sicherheits-, Datenschutz- oder Verfahrensfragen — schreiben Sie uns.
              </p>
            </div>
            <div className="col-span-12 flex flex-wrap items-end gap-3 lg:col-span-4 lg:justify-end">
              <Link to="/contact">
                <Button size="lg" variant="outline-accent">
                  Kontakt
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default Security;
