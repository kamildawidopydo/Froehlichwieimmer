import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Building2,
  FileText,
  Landmark,
  Lightbulb,
  Lock,
  Shield,
} from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import siteContact from '@/data/siteContact';
import { cn } from '@/lib/utils';

const PAGE_TITLE = 'Sicherheit & Regulierung';

const COMPANY = {
  legalName: siteContact.companyName,
  street: siteContact.street,
  city: siteContact.postalCity,
  country: 'Deutschland',
  registerCourt: 'Amtsgericht Frankfurt am Main',
  hrb: 'HRB 122289',
};

const REG_ASSETS = {
  bafin: '/assets/regulation/bafin.svg',
  bundesbank: '/assets/regulation/bundesbank.png',
  /** Official transparent PNG from esma.europa.eu theme; resized to 800px width for the build */
  esma: '/assets/regulation/esma.png',
};

const TABS = [
  { id: 'ueberblick', label: 'Überblick' },
  { id: 'regulierung', label: 'Regulierung' },
  { id: 'sicherheit', label: 'Sicherheit' },
  { id: 'partnerbanken', label: 'Partnerbanken' },
];

const sidebarOptimize = [
  {
    id: 'status',
    icon: Shield,
    title: 'Regulatorischer Status',
    text: 'Einordnung als registrierte AIF-Kapitalverwaltungsgesellschaft nach KAGB — klar benannt und dokumentiert.',
  },
  {
    id: 'register',
    icon: FileText,
    title: 'Register & Identifikationsnummern',
    text: 'Handelsregister und Impressumspflichtangaben für eine nachvollziehbare Identität.',
  },
  {
    id: 'struktur',
    icon: Landmark,
    title: 'Rechtliche Struktur',
    text: 'Spezial-AIF-Struktur und interne KVG-Rolle — in Einklang mit den Angaben im Impressum.',
  },
  {
    id: 'compliance',
    icon: Shield,
    title: 'Compliance & Geldwäscheprävention',
    text: 'AML-/KYC-Prozesse dort, wo sie für die Plattform und die Vermittlung erforderlich sind.',
  },
  {
    id: 'anleger',
    icon: Lock,
    title: 'Anlegerschutz & Regulierung',
    text: 'Transparenz über Rollen, Risiken und Einlagensicherung bei Partnerbanken.',
  },
];

const labelClass =
  'font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9a4a22] dark:text-bank-gold';

const srCard =
  'rounded-[2px] border border-bank-border/80 bg-white/90 p-5 shadow-[0_1px_0_rgba(26,22,18,0.04)] dark:bg-bank-surface-elev/95 dark:shadow-none sm:p-6';

const srHeading = 'text-bank-ink dark:text-bank-text';

const srLink =
  'text-[#145a8a] underline decoration-[#145a8a]/30 underline-offset-4 transition hover:decoration-[#145a8a] dark:text-bank-primary dark:decoration-bank-primary/35 dark:hover:decoration-bank-primary';

function RegulierungGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <article className={srCard}>
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-bank-text-muted">Aufsichtsbehörde</p>
        <div className="mt-4 flex min-h-[2.75rem] items-center">
          <img
            src={REG_ASSETS.bafin}
            alt="BaFin"
            className="h-10 w-auto max-w-[160px] object-contain object-left"
          />
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-bank-text-muted">
          Zuständige Aufsicht für die Kapitalverwaltungsgesellschaft nach KAGB; Details und Kontext im Impressum.
        </p>
      </article>
      <article className={srCard}>
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-bank-text-muted">Regulatorischer Status</p>
        <div className="mt-4 flex min-h-[2.75rem] items-center text-bank-gold">
          <Building2 className="h-8 w-8" strokeWidth={1.1} aria-hidden />
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-bank-text-muted">
          Registrierte AIF-Kapitalverwaltungsgesellschaft gemäß § 44 KAGB — siehe Impressum zur vollständigen Einordnung.
        </p>
      </article>
      <article className={cn(srCard, 'sm:col-span-2 lg:col-span-1')}>
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-bank-text-muted">Rechtsrahmen</p>
        <p className={cn('mt-4 font-display text-lg font-medium', srHeading)}>KAGB · WpIG · MiFID II</p>
        <p className="mt-4 text-[13px] leading-relaxed text-bank-text-muted">
          Relevante Rahmenwerke in Kurzform; vertiefende Hinweise in den rechtlichen Dokumenten und auf der
          Compliance-Seite.
        </p>
      </article>
      <article className={srCard}>
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-bank-text-muted">Handelsregister</p>
        <p className={cn('mt-4 font-mono text-[13px] font-medium', srHeading)}>{COMPANY.hrb}</p>
        <p className="mt-2 text-[13px] text-bank-text-muted">{COMPANY.registerCourt}</p>
      </article>
      <article className={srCard}>
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-bank-text-muted">Unternehmenssitz</p>
        <p className={cn('mt-4 font-display text-[1.05rem] font-medium leading-snug', srHeading)}>{COMPANY.legalName}</p>
        <p className="mt-2 text-[13px] leading-relaxed text-bank-text-muted">
          {COMPANY.street}
          <br />
          {COMPANY.city}
          <br />
          {COMPANY.country}
        </p>
      </article>
      <article className={srCard}>
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-bank-text-muted">Compliance &amp; AML</p>
        <div className="mt-4 text-bank-gold">
          <Shield className="h-8 w-8" strokeWidth={1.1} aria-hidden />
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-bank-text-muted">
          Organisatorische und technische Maßnahmen im Einklang mit geltendem Recht — vertiefend unter Compliance.
        </p>
      </article>
      <article className={srCard}>
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-bank-text-muted">Anlegerschutz</p>
        <p className="mt-4 text-[13px] leading-relaxed text-bank-text-muted">
          Transparente Darstellung von Rollen, Risiken und Einlagensicherung bei Partnerbanken — ohne Anlageberatung.
        </p>
      </article>
      <article className={srCard}>
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-bank-text-muted">Verhaltenskodex</p>
        <p className="mt-4 text-[13px] leading-relaxed text-bank-text-muted">
          Unsere vertraglichen und ethischen Standards in den AGB und ergänzenden Hinweisen.
        </p>
        <Link
          to="/legal/terms"
          className={cn('mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium', srLink)}
        >
          Zu den AGB
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
        </Link>
      </article>
    </div>
  );
}

function LogoStrip() {
  const items = [
    { src: REG_ASSETS.bafin, alt: 'BaFin', className: 'h-9 sm:h-10', blend: null },
    { src: REG_ASSETS.bundesbank, alt: 'Deutsche Bundesbank', className: 'h-10 sm:h-11', blend: null },
    { src: REG_ASSETS.esma, alt: 'ESMA', className: 'h-9 sm:h-10', blend: null },
  ];
  return (
    <div className="mt-12 border-t border-bank-border/70 pt-10">
      <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-bank-text-muted">
        Beispiel Partner &amp; Aufsicht
      </p>
      <div
        className="mt-6 rounded-lg bg-[#fbfaf8] px-4 py-6 ring-1 ring-bank-border/20 dark:bg-bank-surface-elev/70 sm:px-6 sm:py-7"
      >
        <div className="flex flex-wrap items-center gap-x-10 gap-y-7 sm:gap-x-12">
          {items.map((item) => {
            const inner = (
              <img
                src={item.src}
                alt={item.alt}
                className={cn(
                  'w-auto max-w-full object-contain',
                  item.className,
                  item.blend === 'multiply' && 'mix-blend-multiply'
                )}
                loading="lazy"
                decoding="async"
              />
            );
            if (item.blend) {
              return (
                <div
                  key={item.alt}
                  className="isolate flex min-h-[3rem] items-center justify-center rounded-md bg-[#fbfaf8] px-2 py-2 dark:bg-bank-surface-elev/80"
                >
                  {inner}
                </div>
              );
            }
            return (
              <div key={item.alt} className="flex min-h-[3rem] items-center justify-center px-1">
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NaechsterSchrittBox() {
  return (
    <div className="mt-12 border-l-[3px] border-bank-gold bg-white/70 px-6 py-7 shadow-[inset_0_0_0_1px_rgba(26,22,18,0.06)] dark:bg-bank-surface-elev/50 dark:shadow-[inset_0_0_0_1px_rgb(var(--bank-border)/0.35)] sm:px-8 sm:py-8">
      <div className="flex gap-5">
        <Lightbulb className="mt-0.5 h-6 w-6 shrink-0 text-[#9a4a22] dark:text-bank-gold" strokeWidth={1.2} aria-hidden />
        <div>
          <p className={labelClass}>Nächster Schritt</p>
          <p className="mt-3 text-[14px] leading-[1.65] text-bank-text">
            Diese Seite ist über den Footer-Link <strong>Sicherheit &amp; Regulierung</strong> erreichbar — nicht in der
            Hauptnavigation.
          </p>
        </div>
      </div>
    </div>
  );
}

function TabPanel({ activeId }) {
  if (activeId === 'regulierung') {
    return (
      <div>
        <div className="max-w-3xl">
          <p className="font-mono text-[9px] uppercase tracking-[0.26em] text-bank-gold">Regulierung</p>
          <h2
            className={cn('mt-2 font-display text-[1.65rem] font-semibold leading-[1.15] tracking-[-0.025em] sm:text-[2rem]', srHeading)}
            style={{ fontVariationSettings: "'opsz' 120, 'SOFT' 100" }}
          >
            Transparenz &amp; Registerangaben
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-bank-text-muted">
            Zentrale regulatorische und rechtliche Eckpunkte der Fröhlich Vermögensberatung GmbH — konsistent mit Impressum und
            Compliance-Hinweisen.
          </p>
        </div>
        <div className="mt-10">
          <RegulierungGrid />
        </div>
        <LogoStrip />
        <NaechsterSchrittBox />
      </div>
    );
  }

  if (activeId === 'ueberblick') {
    return (
      <div>
        <h2
          className={cn('font-display text-[1.65rem] font-semibold leading-tight sm:text-[2rem]', srHeading)}
          style={{ fontVariationSettings: "'opsz' 120, 'SOFT' 100" }}
        >
          Überblick
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-bank-text-muted">
          Diese Seite bündelt regulatorische Transparenz, Sicherheitshinweise und Verweise auf Partner- und
          Dokumentenbereiche. Wählen Sie oben ein Thema — für die vollständige Darstellung der Regulierung nutzen Sie den
          Tab „Regulierung“.
        </p>
        <ul className="mt-10 space-y-4 border-l-[3px] border-bank-gold/60 pl-6 text-[14px] leading-relaxed text-bank-text-muted">
          <li>Impressum und Registerangaben als maßgebliche Quelle</li>
          <li>Compliance-Seite für vertiefende Verfahrenshinweise</li>
          <li>Partnerbanken für Institute und Einlagensicherung</li>
        </ul>
      </div>
    );
  }

  if (activeId === 'sicherheit') {
    return (
      <div>
        <h2 className={cn('font-display text-[1.65rem] font-semibold sm:text-[2rem]', srHeading)}>Sicherheit</h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-bank-text-muted">
          Technische und organisatorische Maßnahmen zum Schutz Ihrer Daten und Zugänge — detailliert auf der
          Sicherheitsseite.
        </p>
        <Link
          to="/security"
          className="mt-10 inline-flex items-center gap-2 text-[14px] font-medium text-bank-ink underline decoration-bank-gold/50 underline-offset-[5px] transition hover:decoration-bank-gold dark:text-bank-text dark:decoration-bank-gold/60"
        >
          Zur Sicherheitsübersicht
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        </Link>
      </div>
    );
  }

  if (activeId === 'partnerbanken') {
    return (
      <div>
        <h2 className={cn('font-display text-[1.65rem] font-semibold sm:text-[2rem]', srHeading)}>Partnerbanken</h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-bank-text-muted">
          Regulierte Institute in der EU mit Einlagensicherung — Übersicht und Auswahl auf der Partnerbanken-Seite.
        </p>
        <Link
          to="/partner-banks"
          className="mt-10 inline-flex items-center gap-2 text-[14px] font-medium text-bank-ink underline decoration-bank-gold/50 underline-offset-[5px] transition hover:decoration-bank-gold dark:text-bank-text dark:decoration-bank-gold/60"
        >
          Zu den Partnerbanken
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        </Link>
      </div>
    );
  }

  return null;
}

const SicherheitRegulierung = () => {
  const reduce = useReducedMotion();
  const [activeTab, setActiveTab] = useState('regulierung');

  const tabListId = 'sr-reg-tabs';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f0ebe2] dark:bg-bank-bg">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 topo-pattern opacity-[0.09] mix-blend-multiply dark:opacity-[0.04] dark:mix-blend-soft-light"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_-8%,rgba(255,255,255,0.55),transparent_58%)] dark:bg-[radial-gradient(ellipse_85%_55%_at_50%_-8%,rgb(var(--bank-accent)/0.12),transparent_58%)]"
      />

      <PageMeta
        title={PAGE_TITLE}
        description="Regulierung, Transparenz und Aufsicht: Registerangaben, rechtliche Einordnung und Verweise auf Sicherheit und Partnerbanken bei Fröhlich Vermögensberatung."
        path="/sicherheit-regulierung"
      />

      <div className="relative mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-14 lg:py-20">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          <motion.aside
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative lg:col-span-4"
          >
            <span
              aria-hidden
              className="absolute -left-1 top-0 hidden h-full w-px bg-gradient-to-b from-bank-gold/80 via-bank-gold/25 to-transparent lg:block"
            />
            <h1
              className={cn('font-display text-[1.85rem] font-light leading-[1.1] sm:text-[2.25rem]', srHeading)}
              style={{ fontVariationSettings: "'opsz' 132, 'SOFT' 100" }}
            >
              Regulatorische Transparenz sichtbar machen
            </h1>
            <p className="mt-6 text-[15px] leading-[1.7] text-bank-text-muted">
              Verlässliche Regulierungsinformationen schaffen Vertrauen: klar strukturiert, statisch gepflegt und mit
              den Pflichtangaben im Impressum abgestimmt.
            </p>

            <ul className="mt-12 space-y-6">
              {sidebarOptimize.map((row) => {
                const Icon = row.icon;
                return (
                  <li key={row.id} className="group flex gap-4 border-l border-bank-border/60 pl-5 transition-colors hover:border-bank-gold/70">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center text-bank-gold transition-transform group-hover:translate-x-0.5">
                      <Icon className="h-4 w-4" strokeWidth={1.25} aria-hidden />
                    </span>
                    <div>
                      <p className={cn('font-display text-[1.02rem] font-medium', srHeading)}>{row.title}</p>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-bank-text-muted">{row.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </motion.aside>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.52, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="min-w-0 lg:col-span-8"
          >
            <div className="rounded-sm border border-bank-border/70 bg-white/75 px-5 py-8 shadow-[0_24px_48px_-28px_rgba(26,22,18,0.18)] backdrop-blur-[2px] dark:bg-bank-surface/95 dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,0.35)] sm:px-8 sm:py-10 lg:px-10 lg:py-11">
              <div
                role="tablist"
                aria-label="Bereiche Sicherheit und Regulierung"
                id={tabListId}
                className="flex flex-wrap gap-1 rounded-full border border-bank-border/50 bg-[#f6f2eb]/90 p-1 dark:bg-bank-surface-elev/40 sm:inline-flex sm:flex-nowrap"
              >
                {TABS.map((tab) => {
                  const selected = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      id={`${tabListId}-${tab.id}`}
                      className={cn(
                        'relative rounded-full px-3.5 py-2 font-sans text-[13px] font-medium transition-[color,background,box-shadow] sm:px-4',
                        selected
                          ? 'bg-bank-ink text-[#faf8f4] shadow-sm dark:bg-bank-gold dark:text-bank-bg'
                          : 'text-bank-text-muted hover:bg-white/60 hover:text-bank-text dark:hover:bg-bank-surface dark:hover:text-bank-text'
                      )}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-10" role="tabpanel" aria-labelledby={`${tabListId}-${activeTab}`}>
                <TabPanel activeId={activeTab} />
              </div>

              <p className="mt-14 border-t border-bank-border/60 pt-7 text-[12px] text-bank-text-muted">
                Kontakt:{' '}
                <a href={`mailto:${siteContact.email}`} className={cn(srHeading, 'underline underline-offset-2')}>
                  {siteContact.email}
                </a>
                {' · '}
                {siteContact.postalCityDe}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SicherheitRegulierung;
