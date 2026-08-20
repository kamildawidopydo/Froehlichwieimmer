import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Shield } from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import SectionLabel from '@/components/editorial/SectionLabel';
import Eyebrow from '@/components/editorial/Eyebrow';
import Pullquote from '@/components/editorial/Pullquote';
import BankLogo from '@/components/BankLogo';
import { buildPartnerBankCards, formatPartnerBankCountryCodes } from '@/lib/partnerBanksList';
import { isExcludedSavingsBankSlug } from '@/lib/comparisonCatalog';
import { supabase } from '@/lib/supabase';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';

const PartnerBanks = () => {
  const reduce = useReducedMotion();
  const [partnerBanks, setPartnerBanks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('savings_offers')
        .select(
          'banks(id, name, slug, country, logo_url, deposit_protection, deposit_protection_amount, founded_year, regulator_name)'
        )
        .eq('is_active', true);
      if (cancelled) return;
      if (error) {
        setPartnerBanks([]);
        setLoading(false);
        return;
      }
      const banks = (data || [])
        .map((row) => row.banks)
        .filter((bank) => bank && !isExcludedSavingsBankSlug(bank.slug));
      setPartnerBanks(buildPartnerBankCards(banks));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const countryCodes = useMemo(() => formatPartnerBankCountryCodes(partnerBanks), [partnerBanks]);

  const fade = (i = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 18 },
    whileInView: reduce ? undefined : { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: 0.55, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] },
  });

  return (
    <div className="min-h-screen bg-bank-bg">
      <PageMeta
        title="Partnerbanken in Europa"
        description="Überblick über unsere europäischen Partnerbanken, Einlagensicherung und Qualitätskriterien für gelistete Sparangebote."
        path="/partner-banks"
      />

      {/* HERO */}
      <section className="relative overflow-hidden bg-bank-ink text-white">
        <div className="topo-pattern absolute inset-0 opacity-[0.07]" aria-hidden />
        <div
          className="pointer-events-none absolute -top-32 right-[-10%] h-[420px] w-[420px] rounded-full bg-bank-gold/12 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:grid lg:grid-cols-12 lg:items-end lg:gap-x-8 lg:px-12 lg:py-32">
          <motion.div {...fade(0)} className="lg:col-span-7">
            <Eyebrow tone="gold">Partnerbanken · Europa</Eyebrow>
            <h1
              className="mt-6 font-display text-display-md font-light leading-[0.98] tracking-[-0.02em] sm:text-display-lg"
              style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
            >
              Unsere
              <span className="block italic text-bank-gold-soft">europäischen Partner.</span>
            </h1>
            <div className="mt-8 h-px w-24 bg-bank-gold/70" aria-hidden />
          </motion.div>
          <motion.div {...fade(1)} className="mt-10 lg:col-span-5 lg:mt-0">
            <p className="font-sans text-[1.02rem] leading-[1.8] text-white/75">
              Wir vergleichen attraktive Sparangebote etablierter europäischer Banken — alle reguliert, alle mit
              gesetzlicher Einlagensicherung.
            </p>
          </motion.div>
        </div>
        <div className="relative border-t border-white/10">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-3 font-mono text-[10.5px] uppercase tracking-[0.28em] text-white/55 sm:px-8 lg:px-12">
            <span>Dossier · Partner</span>
            <span>{countryCodes || 'EU · EWR'}</span>
          </div>
        </div>
      </section>

      {/* BANK GRID */}
      <section className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <SectionLabel
          eyebrow="Auswahl"
          title={
            <>
              Unsere
              <span className="ml-2 italic text-bank-text-muted">Partnerbanken.</span>
            </>
          }
          lede="Alle Banken, deren Sparangebote Sie auf Fröhlich Vermögensberatung vergleichen können — reguliert und mit gesetzlicher Einlagensicherung."
          align="left"
          className="mb-10"
        />

        <div className="mb-12 flex flex-wrap items-center gap-x-10 gap-y-4 border-y border-bank-border py-5 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-2xl font-light tabular-nums text-bank-text">
              {loading ? '—' : partnerBanks.length}
            </span>
            <span>Partnerbanken im Vergleich</span>
          </div>
          <span className="hidden h-4 w-px bg-bank-border sm:block" aria-hidden />
          <span>Einlagensicherung je Institut</span>
          <span className="hidden h-4 w-px bg-bank-border md:block" aria-hidden />
          <span className="text-bank-gold">Bis 100.000 €</span>
        </div>

        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="flex flex-col items-center overflow-hidden border border-bank-border bg-white px-6 py-10 shadow-[0_1px_0_rgba(8,30,56,0.04)]"
                aria-hidden
              >
                <div className="h-20 w-20 animate-pulse rounded-xl bg-bank-bg" />
                <div className="mt-5 h-6 w-2/3 animate-pulse rounded-sm bg-bank-bg" />
              </div>
            ))
          ) : (
            partnerBanks.map((bank, index) => (
            <motion.article
              key={bank.id}
              {...fade(index)}
              className="group relative flex flex-col items-center overflow-hidden border border-bank-border bg-white px-6 py-10 shadow-[0_1px_0_rgba(8,30,56,0.04)] transition-all duration-500 hover:-translate-y-0.5 hover:border-bank-gold/40 hover:shadow-editorial-md"
              data-testid={`partner-bank-${bank.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <span className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-bank-gold/0 via-bank-gold/55 to-bank-gold/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <BankLogo
                logo={bank.logoUrl}
                bankName={bank.name}
                localLogoFallback={bank.logoLocal || ''}
                size="xl"
                className="!h-[4.5rem] !w-[4.5rem] sm:!h-[5rem] sm:!w-[5rem]"
              />
              <h3
                className="mt-5 text-center font-display text-[1.35rem] font-light leading-tight text-bank-text"
                style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
              >
                {bank.name}
              </h3>
            </motion.article>
            ))
          )}
        </div>
      </section>

      {/* EU PROTECTION FEATURE */}
      <section className="bg-bank-bg py-20 lg:py-28">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <motion.div
            {...fade(0)}
            className="relative overflow-hidden border border-bank-border bg-bank-ink px-7 py-14 text-white sm:px-12 sm:py-16 lg:px-16 lg:py-20"
          >
            <div className="topo-pattern absolute inset-0 opacity-[0.06]" aria-hidden />
            <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bank-gold/70 to-transparent" />
            <div className="relative grid grid-cols-12 gap-x-8 gap-y-10">
              <div className="col-span-12 md:col-span-3">
                <div className="flex h-20 w-20 items-center justify-center border border-bank-gold/45 text-bank-gold">
                  <Shield className="h-9 w-9" strokeWidth={LUCIDE_STROKE} />
                </div>
                <p className="mt-6 font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-gold">
                  EU-Richtlinie 2014/49/EU
                </p>
              </div>
              <div className="col-span-12 md:col-span-9">
                <Eyebrow tone="gold">EU-Einlagensicherung</Eyebrow>
                <h3
                  className="mt-4 font-display text-[2rem] font-light leading-[1.05] sm:text-[2.4rem]"
                  style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
                >
                  Bis zu
                  <span className="rate-figure ml-3 text-[2.6rem] font-light text-bank-gold-soft">100.000 €</span>
                  <span className="block italic text-bank-gold-soft/95">je Bank und Kunde.</span>
                </h3>
                <p className="mt-6 max-w-2xl text-[15px] leading-[1.85] text-white/75">
                  Gemäß der EU-Richtlinie 2014/49/EU sind Einlagen bei sämtlichen Partnerbanken bis zu einem Betrag von
                  100.000 € je Bank und Kunde gesetzlich abgesichert. Dieser Schutz gilt in allen Mitgliedstaaten der
                  Europäischen Union und wird durch die jeweiligen nationalen Einlagensicherungssysteme sichergestellt.
                </p>
                <Pullquote tone="dark" cite="Plattform-Versprechen">
                  Wir halten kein Geld. Es liegt — geschützt — bei den Häusern, die dafür lizenziert sind.
                </Pullquote>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default PartnerBanks;
