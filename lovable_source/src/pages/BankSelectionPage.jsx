import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, ChevronRight, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import SectionLabel from '@/components/editorial/SectionLabel';
import Eyebrow from '@/components/editorial/Eyebrow';
import { cn } from '@/lib/utils';

const REVEAL = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };
const EASE = [0.22, 1, 0.36, 1];

const BUNQ_LOGO = '/assets/bank-logos/bunq-logo.png';

const BANKS = [
  {
    id: 'bbva',
    name: 'Banco Bilbao Vizcaya Argentaria, S.A.',
    short: 'BBVA',
    iso: 'ES',
    place: 'Niederlassung Deutschland · Frankfurt am Main',
    sicherung: 'FGD ES · 100.000 €',
    logoSrc: '/assets/bank-logos/bbva-logo-white.png',
    invertHero: false,
    products: [
      { label: 'Festgeld', to: '/banks/bbva/festgeld', desc: 'Feste Laufzeit, fester Zins' },
      { label: 'Flexgeld', to: '/banks/bbva/flexgeld', desc: 'Flexible Verfügbarkeit' },
    ],
  },
  {
    id: 'ing',
    name: 'ING B.V.',
    short: 'ING',
    iso: 'NL',
    place: 'Amsterdam · Niederlande',
    sicherung: 'DGS NL · 100.000 €',
    logoSrc: '/assets/bank-logos/ing-logo.png',
    heroClass: 'bg-[#FF6200]',
    heroLabelClass: 'text-white/70',
    logoOnLightBg: true,
    invertHero: false,
    products: [
      { label: 'Festgeld', to: '/banks/ing/festgeld', desc: 'Feste Laufzeit, fester Zins' },
      { label: 'Flexgeld', to: '/banks/ing/flexgeld', desc: 'Flexible Verfügbarkeit' },
    ],
  },
  {
    id: 'bunq',
    name: 'bunq B.V.',
    short: 'bunq NL',
    iso: 'NL',
    place: 'Amsterdam · Niederlande',
    sicherung: 'DGS NL · 100.000 €',
    logoSrc: BUNQ_LOGO,
    heroClass: 'bg-[#0B4F6C]',
    heroLabelClass: 'text-white/65',
    logoOnLightBg: true,
    invertHero: false,
    products: [
      { label: 'Festgeld', to: '/banks/bunq/festgeld', desc: 'Feste Laufzeit, fester Zins' },
      { label: 'Flexgeld', to: '/banks/bunq/flexgeld', desc: 'Flexible Verfügbarkeit' },
    ],
  },
  {
    id: 'bunq-de',
    name: 'bunq B.V.',
    short: 'bunq DE',
    iso: 'DE',
    place: 'Deutschland · Angebot für DE-Kunden',
    sicherung: 'DGS NL · 100.000 €',
    logoSrc: BUNQ_LOGO,
    heroClass: 'bg-[#1C1C1C]',
    heroLabelClass: 'text-white/65',
    logoOnLightBg: true,
    invertHero: false,
    products: [
      { label: 'Festgeld', to: '/banks/bunq-de/festgeld', desc: 'Feste Laufzeit, fester Zins' },
      { label: 'Flexgeld', to: '/banks/bunq-de/flexgeld', desc: 'Flexible Verfügbarkeit' },
    ],
  },
  {
    id: 'postbank',
    name: 'Deutsche Postbank AG',
    short: 'Postbank',
    iso: 'DE',
    place: 'Berlin · Deutschland',
    sicherung: 'Deutsche Einlagensicherung · 100.000 €',
    logoSrc: '/assets/bank-logos/postbank-official.svg',
    heroClass: 'bg-[#FFCC00]',
    heroLabelClass: 'text-[#003366]/55',
    invertHero: false,
    products: [
      { label: 'Festgeld', to: '/banks/postbank/festgeld', desc: 'Feste Laufzeit, fester Zins' },
      { label: 'Flexgeld', to: '/banks/postbank/flexgeld', desc: 'Flexible Verfügbarkeit' },
    ],
  },
  {
    id: 'knab',
    name: 'Knab B.V.',
    short: 'Knab',
    iso: 'NL',
    place: 'Leeuwarden · Niederlande',
    sicherung: 'DGS NL · 100.000 €',
    logoSrc: '/assets/bank-logos/knab.svg',
    logoOnLightBg: true,
    products: [
      { label: 'Festgeld', to: '/banks/knab/festgeld', desc: 'Feste Laufzeit, fester Zins' },
      { label: 'Flexgeld', to: '/banks/knab/flexgeld', desc: 'Flexible Verfügbarkeit' },
    ],
  },
];

const BankSelectionPage = () => {
  return (
    <div className="min-h-screen bg-bank-bg">
      <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
        {/* Header */}
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <div className="mx-auto mb-7 inline-flex h-14 w-14 items-center justify-center rounded-full border border-bank-gold/45 bg-white text-bank-primary shadow-editorial-sm">
            <Building2 className="h-6 w-6" strokeWidth={1.35} />
          </div>
          <SectionLabel
            align="center"
            eyebrow="Partnerbanken"
            title={
              <>
                Wählen Sie Ihr{' '}
                <span className="italic" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}>
                  Institut.
                </span>
              </>
            }
            lede="Dokumente, Produktinformationen und Vertragsformulare — kuratiert nach Partnerbank."
            size="md"
          />
        </div>

        {/* Bank cards */}
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          {BANKS.map((bank, i) => (
            <motion.div
              key={bank.id}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
              variants={REVEAL}
              transition={{ duration: 0.6, ease: EASE, delay: 0.06 * i }}
              className="group relative flex flex-col overflow-hidden border border-bank-border bg-white transition-all duration-500 ease-editorial hover:-translate-y-0.5 hover:shadow-editorial-md"
            >
              {/* Brass top hairline that intensifies on hover */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bank-gold/40 to-transparent opacity-50 transition-opacity duration-500 group-hover:opacity-100"
              />

              {/* Logo block — ink-navy */}
              <div
                className={cn(
                  'relative isolate flex items-center justify-center overflow-hidden px-8 py-14',
                  bank.heroClass || 'bg-bank-ink',
                  !bank.heroClass && 'before:absolute before:inset-0 before:-z-10 before:topo-pattern before:opacity-25 before:mix-blend-screen',
                )}
              >
                <div
                  aria-hidden
                  className={cn(
                    'absolute inset-x-6 top-6 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.28em]',
                    bank.heroLabelClass || 'text-white/45',
                  )}
                >
                  <span>{bank.iso}</span>
                  <span>· · ·</span>
                </div>
                <div
                  className={cn(
                    bank.logoOnLightBg && 'rounded-lg bg-white px-5 py-3 shadow-sm',
                  )}
                >
                  <img
                    src={bank.logoSrc}
                    alt={bank.short}
                    className={cn(
                      'h-12 w-auto object-contain sm:h-14',
                      bank.invertHero && 'brightness-0 invert',
                    )}
                  />
                </div>
                <div
                  aria-hidden
                  className={cn(
                    'absolute inset-x-6 bottom-6 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.28em]',
                    bank.heroLabelClass || 'text-white/40',
                  )}
                >
                  <span>{bank.short}</span>
                  <span>EU · Lizenziert</span>
                </div>
              </div>

              {/* Identity */}
              <div className="px-7 py-7 sm:px-8 sm:py-8">
                <Eyebrow>{bank.iso} · Partnerbank</Eyebrow>
                <h2 className="font-display mt-3 text-2xl font-normal leading-tight text-bank-text">
                  {bank.short}
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-bank-text-muted">{bank.name}</p>
                <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
                  {bank.place}
                </p>

                <span aria-hidden className="my-5 block h-px w-12 bg-bank-gold/55" />

                <div className="flex items-center gap-2 text-[12px] text-bank-text-muted">
                  <ShieldCheck className="h-3.5 w-3.5 text-bank-gold" strokeWidth={1.5} />
                  <span className="font-mono uppercase tracking-[0.18em]">{bank.sicherung}</span>
                </div>
              </div>

              {/* Products */}
              <div className="border-t border-bank-border bg-bank-bg/60 px-3 py-3 sm:px-4">
                {bank.products.length === 1 ? (
                  <Link
                    to={bank.products[0].to}
                    className="group/item flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-white"
                  >
                    <span className="flex flex-col">
                      <span className="font-display text-[15px] font-normal text-bank-text transition-colors group-hover/item:text-bank-primary">
                        {bank.products[0].label}
                      </span>
                      <span className="text-[11.5px] text-bank-text-muted">{bank.products[0].desc}</span>
                    </span>
                    <ArrowUpRight
                      className="h-4 w-4 text-bank-text-muted transition-all duration-300 group-hover/item:-translate-y-0.5 group-hover/item:translate-x-0.5 group-hover/item:text-bank-gold"
                      strokeWidth={1.5}
                    />
                  </Link>
                ) : (
                  <ul aria-label={`${bank.short} Produkte`}>
                    {bank.products.map((p) => (
                      <li key={p.to}>
                        <Link
                          to={p.to}
                          className="group/item flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-white"
                        >
                          <span className="flex flex-col">
                            <span className="font-display text-[15px] font-normal text-bank-text transition-colors group-hover/item:text-bank-primary">
                              {p.label}
                            </span>
                            <span className="text-[11.5px] text-bank-text-muted">{p.desc}</span>
                          </span>
                          <ChevronRight
                            className="h-4 w-4 text-bank-text-muted transition-colors group-hover/item:text-bank-gold"
                            strokeWidth={1.5}
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footnote */}
        <div className="mx-auto mt-16 max-w-2xl text-center">
          <span aria-hidden className="mx-auto block h-px w-12 bg-bank-gold/55" />
          <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">
            · Alle Banken EU-reguliert · Einlagensicherung bis 100.000 €
          </p>
        </div>
      </div>
    </div>
  );
};

export default BankSelectionPage;
