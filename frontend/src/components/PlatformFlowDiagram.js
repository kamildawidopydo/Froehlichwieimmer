import React from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Euro,
} from 'lucide-react';
import SectionLabel from '@/components/editorial/SectionLabel';
import Pullquote from '@/components/editorial/Pullquote';
import { siteImages } from '@/data/siteImages';

const FLOW_ICONS = siteImages.home.flowIcons;

const FLOW_STEPS = [
  {
    title: 'Konto eröffnen',
    detail: 'Einmalig ein kostenloses Konto — Zugang zu allen Sparangeboten.',
  },
  {
    title: 'Angebot wählen',
    detail: 'Zinssätze und Laufzeiten vergleichen, Ihr ideales Angebot finden.',
  },
  {
    title: 'Geld anlegen',
    detail: 'Sichere Übertragung an die Partnerbank — EU-Einlagensicherung.',
  },
  {
    title: 'Zinsen erhalten',
    detail: 'Kapital und Zinsen zurück auf Ihr Kapitalmitte-Konto.',
  },
];

const PLATFORM_BENEFITS = [
  {
    title: 'Ein Konto, viele Banken',
    detail: 'Angebote mehrerer Institute mit einer Anmeldung — ohne Konten-Chaos.',
  },
  {
    title: 'EU-Einlagensicherung',
    detail: 'Bis zu 100.000 € pro Bank und Kunde, gesetzlich abgesichert.',
  },
  {
    title: 'Transparenter Vergleich',
    detail: 'Keine versteckten Gebühren — Sortierung und Konditionen nachvollziehbar.',
  },
];

/**
 * PlatformFlowDiagram
 * Hairline-stroked editorial flow with brass edge labels and refined hero tiles.
 */
const heroIconWrap =
  'relative flex h-[6.5rem] w-[6.5rem] shrink-0 items-center justify-center border border-bank-border bg-white sm:h-[7.25rem] sm:w-[7.25rem]';

const heroIconImg =
  'h-[4.25rem] w-[4.25rem] object-contain sm:h-[4.75rem] sm:w-[4.75rem]';

const edgeLabel = (n, t, tone = 'neutral') => (
  <span
    className={
      tone === 'brass'
        ? 'inline-flex items-center gap-2 border border-bank-gold/40 bg-bank-gold/[0.08] px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.2em] text-bank-gold'
        : 'inline-flex items-center gap-2 border border-bank-border bg-white px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.2em] text-bank-text-muted'
    }
  >
    <span className="text-bank-gold">{n}</span>
    <span>·</span>
    <span>{t}</span>
  </span>
);

const PlatformFlowDiagram = () => {
  return (
    <section
      className="relative overflow-hidden border-y border-bank-border bg-bank-bg py-24 sm:py-32"
      data-testid="platform-flow-section"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-mesh-soft opacity-80" />

      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <SectionLabel
          eyebrow="Ablauf"
          title={
            <>
              So funktioniert{' '}
              <span className="italic text-bank-text-muted" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}>
                Ihre Sparplattform
              </span>
            </>
          }
          lede="Vergleichen Sie Angebote europäischer Partnerbanken, wählen Sie Ihre Konditionen — und nutzen Sie ein zentrales Konto für den Überblick."
          className="mb-16"
        />

        {/* Flow — three pillars with brass-labelled connectors */}
        <div className="border border-bank-border bg-white px-6 py-12 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-5 lg:gap-6 xl:gap-10">
            {/* Sie */}
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              <div className="mb-6">
                <div className="relative">
                  <div className={heroIconWrap}>
                    <img
                      src={FLOW_ICONS.youAccount}
                      alt="Konto bei Kapitalmitte"
                      width={76}
                      height={76}
                      decoding="async"
                      className={heroIconImg}
                    />
                  </div>
                  <div
                    className="absolute -bottom-1.5 -right-1.5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-bank-primary text-bank-gold shadow-md ring-4 ring-white"
                    aria-hidden
                  >
                    <Euro className="h-4 w-4" strokeWidth={1.32} />
                  </div>
                </div>
              </div>
              <h3 className="font-display text-xl font-normal text-bank-text">Sie</h3>
              <span aria-hidden className="mt-3 block h-px w-10 bg-bank-gold/45 lg:mx-0" />
              <p className="mt-4 max-w-[260px] text-[14.5px] leading-relaxed text-bank-text-muted">
                Einmaliges Konto bei Kapitalmitte
              </p>
            </div>

            {/* Connector 1 */}
            <div className="flex flex-col items-center justify-center gap-4 py-0 lg:min-h-[8rem] lg:py-6">
              <div className="hidden w-full max-w-[10rem] flex-col items-center gap-2.5 lg:flex">
                {edgeLabel('1', 'Einzahlung')}
                <div className="flex w-full items-center gap-1">
                  <div className="h-px flex-1 bg-bank-border" />
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-bank-primary/55" strokeWidth={1.5} />
                </div>
                <div className="flex w-full items-center gap-1">
                  <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-bank-gold" strokeWidth={1.5} />
                  <div className="h-px flex-1 bg-bank-border" />
                </div>
                {edgeLabel('4', 'Kapital & Zins', 'brass')}
              </div>
              <div className="flex flex-col items-center gap-3 lg:hidden">
                <ArrowRight className="h-6 w-6 rotate-90 text-bank-text-muted" strokeWidth={1.35} />
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-bank-text-muted">Einzahlung</span>
                <ArrowLeft className="h-6 w-6 rotate-90 text-bank-gold" strokeWidth={1.35} />
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-bank-gold">Rückfluss</span>
              </div>
            </div>

            {/* Kapitalmitte */}
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              <div className="mb-6">
                <div className={heroIconWrap}>
                  <img
                    src={FLOW_ICONS.kapitalmitte}
                    alt="Fröhlich Vermögensberatung Plattform"
                    width={76}
                    height={76}
                    decoding="async"
                    className={heroIconImg}
                  />
                </div>
              </div>
              <h3 className="font-display text-xl font-normal text-bank-text">Kapitalmitte</h3>
              <span aria-hidden className="mt-3 block h-px w-10 bg-bank-gold/45" />
              <p className="mt-4 max-w-[280px] text-[14.5px] leading-relaxed text-bank-text-muted">
                Zentrale Plattform &amp; Vergleich
              </p>
            </div>

            {/* Connector 2 */}
            <div className="flex flex-col items-center justify-center gap-4 py-0 lg:min-h-[8rem] lg:py-6">
              <div className="hidden w-full max-w-[10rem] flex-col items-center gap-2.5 lg:flex">
                {edgeLabel('2', 'Anlage wählen')}
                <div className="flex w-full items-center gap-1">
                  <div className="h-px flex-1 bg-bank-border" />
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-bank-primary/55" strokeWidth={1.5} />
                </div>
                <div className="flex w-full items-center gap-1">
                  <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-bank-gold" strokeWidth={1.5} />
                  <div className="h-px flex-1 bg-bank-border" />
                </div>
                {edgeLabel('3', 'Zinszahlungen', 'brass')}
              </div>
              <div className="flex flex-col items-center gap-3 lg:hidden">
                <ArrowRight className="h-6 w-6 rotate-90 text-bank-text-muted" strokeWidth={1.35} />
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-bank-text-muted">Anlage</span>
                <ArrowLeft className="h-6 w-6 rotate-90 text-bank-gold" strokeWidth={1.35} />
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-bank-gold">Zinsen</span>
              </div>
            </div>

            {/* Partnerbanken */}
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              <div className="mb-6">
                <div className={heroIconWrap}>
                  <img
                    src={FLOW_ICONS.partnerBanks}
                    alt="Partnerbanken"
                    width={76}
                    height={76}
                    decoding="async"
                    className={heroIconImg}
                  />
                </div>
              </div>
              <h3 className="font-display text-xl font-normal text-bank-text">Partnerbanken</h3>
              <span aria-hidden className="mt-3 block h-px w-10 bg-bank-gold/45" />
              <p className="mt-4 max-w-[260px] text-[14.5px] leading-relaxed text-bank-text-muted">
                Regulierte Institute in der EU
              </p>
            </div>
          </div>
        </div>

        {/* Steps — editorial numbered rail (matches HomeInvestmentSpectrum) */}
        <div className="mt-12 border border-bank-border bg-white px-6 py-10 sm:px-10 sm:py-12 lg:px-12">
          <div className="border-b border-bank-border pb-6">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-bank-text-muted">
                Vier Schritte
              </p>
              <p className="mt-3 font-display text-2xl font-light tracking-tight text-bank-text sm:text-[1.85rem]">
                Von der Anmeldung bis zur Verzinsung
              </p>
            </div>
          </div>

          <ol className="mt-10 grid list-none gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-0">
            {FLOW_STEPS.map((step, i) => (
              <li key={step.title} className="group/step relative min-w-0 pt-7">
                <span
                  aria-hidden
                  className="absolute left-0 top-0 h-px w-10 bg-bank-gold/55 transition-[width] duration-500 ease-out group-hover/step:w-14"
                />
                {i < FLOW_STEPS.length - 1 ? (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-[calc(100%+0.5rem)] top-[1.35rem] hidden h-px w-[calc(100%-1rem)] bg-bank-border/70 lg:block xl:left-[calc(100%+0.75rem)]"
                  />
                ) : null}
                <p className="font-display text-[1.15rem] font-light leading-[1.35] text-bank-text sm:text-[1.2rem]">
                  {step.title}
                </p>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-bank-text-muted">{step.detail}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Benefits — light editorial list, no dark glass cards */}
        <div className="mt-12 border border-bank-border bg-bank-surface-elev/35 px-6 py-10 sm:px-10 sm:py-12 lg:px-12">
          <div className="border-b border-bank-border/80 pb-6">
            <div className="max-w-xl">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-bank-text-muted">
                Nutzen
              </p>
              <p className="mt-3 font-display text-2xl font-light tracking-tight text-bank-text sm:text-[1.85rem]">
                Ihre Vorteile
              </p>
            </div>
          </div>

          <ul className="mt-8 divide-y divide-bank-border/60">
            {PLATFORM_BENEFITS.map((benefit) => (
              <li key={benefit.title} className="py-8 first:pt-0 last:pb-0">
                <div className="min-w-0 border-l border-bank-gold/25 pl-5 sm:pl-6">
                  <p className="font-display text-[1.2rem] font-light leading-snug text-bank-text sm:text-[1.28rem]">
                    {benefit.title}
                  </p>
                  <p className="mt-2.5 max-w-prose text-[0.9375rem] leading-relaxed text-bank-text-muted">
                    {benefit.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <Pullquote cite="Plattform-Prinzip" className="mb-0 mt-10 max-w-2xl border-bank-gold/40">
            Vergleichen heißt nicht verwirren — sondern Konditionen lesen können, bevor Sie sich entscheiden.
          </Pullquote>
        </div>
      </div>
    </section>
  );
};

export default PlatformFlowDiagram;
