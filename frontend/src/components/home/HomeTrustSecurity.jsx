import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight, ShieldCheck, Lock, ClipboardCheck, Users, Handshake,
  EyeOff, Compass, Sparkles, Heart,
} from 'lucide-react';

/**
 * Circular seal-style badge (dark navy medallion, gold ring).
 * Neutral placeholder emblem — NOT an official TÜV/ISO/BVV mark.
 * Once a real certificate is uploaded via admin, the medallion can be
 * swapped for the certifier's official logo image.
 */
const SealBadge = ({ topLabel, bottomLabel, Icon, logoUrl }) => (
  <div className="relative mx-auto flex h-[132px] w-[132px] items-center justify-center">
    <div className="absolute inset-0 rounded-full border-[3px] border-bank-gold/70" />
    <div className="absolute inset-[6px] rounded-full border border-bank-gold/40" />
    <div className="absolute inset-[10px] flex flex-col items-center justify-center rounded-full bg-bank-ink text-white shadow-[inset_0_0_20px_rgba(255,255,255,0.06)]">
      {logoUrl ? (
        <img src={logoUrl} alt="" className="h-16 w-16 object-contain" />
      ) : (
        <>
          <span className="px-2 text-center text-[7.5px] font-medium uppercase tracking-[0.14em] text-bank-gold/90 leading-tight">
            {topLabel}
          </span>
          <Icon className="my-1 h-6 w-6 text-white/95" strokeWidth={1.4} />
          <span className="px-2 text-center text-[7.5px] font-medium uppercase tracking-[0.14em] text-bank-gold/90 leading-tight">
            {bottomLabel}
          </span>
        </>
      )}
    </div>
  </div>
);

const PILLARS = [
  {
    key: 'data-security',
    seal: { topLabel: 'Geprüfte', bottomLabel: 'Datensicherheit', Icon: ShieldCheck },
    title: 'Geprüfte Datensicherheit',
    text: 'Der Schutz persönlicher und finanzieller Daten hat für uns höchste Priorität.',
    cta: { label: 'Zertifikat ansehen', href: '/legal/privacy' },
    needsCert: true,
  },
  {
    key: 'iso-27001',
    seal: { topLabel: 'Information Security', bottomLabel: 'Management', Icon: Lock },
    title: 'Informationssicherheit / ISO 27001',
    text: 'Strukturierte Sicherheitsprozesse und hohe Standards beim Umgang mit sensiblen Informationen.',
    cta: { label: 'Mehr erfahren', href: '/legal/privacy' },
    needsCert: true,
  },
  {
    key: 'quality',
    seal: { topLabel: 'Qualitäts', bottomLabel: 'management', Icon: ClipboardCheck },
    title: 'Qualitätsmanagement',
    text: 'Klare, nachvollziehbare Prozesse bilden die Grundlage für eine dauerhaft hohe Qualität.',
    cta: { label: 'Mehr erfahren', href: '/philosophie' },
    needsCert: true,
  },
  {
    key: 'memberships',
    seal: { topLabel: 'Mitgliedschaften', bottomLabel: 'Branchenstandards', Icon: Users },
    title: 'Mitgliedschaften & Branchenstandards',
    text: 'Fachliche Standards, kontinuierliche Weiterbildung und verantwortungsvolles Handeln gehören zu unserem Anspruch.',
    cta: { label: 'Mehr erfahren', href: '/about' },
    needsCert: true,
  },
  {
    key: 'advisory',
    seal: { topLabel: 'Persönliche', bottomLabel: 'Beratung', Icon: Handshake },
    title: 'Persönliche & langfristige Beratung',
    text: 'Wir betrachten nicht nur einzelne Investments, sondern begleiten unsere Anleger langfristig und persönlich.',
    cta: { label: 'Unser Beratungsansatz', href: '/philosophie' },
    needsCert: false,
  },
];

const MINI_ICONS = [
  { Icon: EyeOff, label: 'Sicherheit & Diskretion' },
  { Icon: Handshake, label: 'Persönliche Betreuung' },
  { Icon: Compass, label: 'Langfristige Partnerschaft' },
  { Icon: Sparkles, label: 'Transparenz & Klarheit' },
  { Icon: Heart, label: 'Vertrauen & Verlässlichkeit' },
];

const HomeTrustSecurity = () => (
  <section
    className="relative overflow-hidden bg-gradient-to-b from-white via-neutral-50/40 to-white py-20 sm:py-24"
    data-testid="home-trust-security"
  >
    {/* corner accents */}
    <div aria-hidden className="pointer-events-none absolute left-0 top-0 h-40 w-40 border-l border-t border-bank-gold/40" />
    <div aria-hidden className="pointer-events-none absolute bottom-0 right-0 h-40 w-40 border-b border-r border-bank-gold/40" />

    <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-bank-gold">
          Vertrauen &amp; Sicherheit
        </p>
        <h2 className="mt-5 font-serif text-4xl leading-[1.05] text-bank-ink sm:text-5xl lg:text-[52px]">
          Qualität, Sicherheit und Transparenz.
        </h2>
        <p className="mt-5 text-[15px] leading-relaxed text-bank-text-muted sm:text-[16px]">
          Bei der Verwaltung von Vermögen sind Vertrauen, Sicherheit und nachvollziehbare Prozesse
          entscheidend. Deshalb legen wir großen Wert auf hohe Standards bei Datenschutz,
          Informationssicherheit, Qualität und persönlicher Betreuung.
        </p>
        <div className="mx-auto mt-6 h-px w-24 bg-bank-gold/60" aria-hidden />
      </div>

      <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {PILLARS.map((p) => (
          <div
            key={p.key}
            className="group relative flex flex-col rounded-2xl border border-bank-border/70 bg-white p-6 shadow-editorial-sm transition-all duration-300 hover:border-bank-gold/50 hover:shadow-[0_20px_50px_-30px_rgba(15,29,52,0.28)]"
            data-testid={`trust-card-${p.key}`}
          >
            {p.needsCert && (
              <span
                className="absolute right-3 top-3 rounded-full border border-dashed border-bank-gold/60 bg-bank-gold/10 px-2 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.14em] text-bank-gold"
                title="Placeholder — offizielles Zertifikat noch nicht hinterlegt"
                data-testid="cert-placeholder-badge"
              >
                Zertifikat/Logo hinterlegen
              </span>
            )}
            <SealBadge {...p.seal} />
            <h3 className="mt-6 text-center font-serif text-[17px] leading-snug text-bank-ink">
              {p.title}
            </h3>
            <div className="mx-auto mt-3 h-px w-8 bg-bank-gold/60" aria-hidden />
            <p className="mt-4 flex-1 text-center text-[13.5px] leading-relaxed text-bank-text-muted">
              {p.text}
            </p>
            <div className="mt-5 flex justify-center">
              <Link
                to={p.cta.href}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-bank-primary transition-colors group-hover:text-bank-gold"
              >
                {p.cta.label}
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.5} />
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 border-y border-bank-border/60 py-5">
        {MINI_ICONS.map(({ Icon, label }) => (
          <div key={label} className="flex items-center gap-2 text-[11.5px] uppercase tracking-[0.18em] text-bank-text-muted">
            <Icon className="h-4 w-4 text-bank-gold" strokeWidth={1.4} />
            {label}
          </div>
        ))}
      </div>

      <p className="mt-8 text-center font-serif text-xl italic text-bank-ink sm:text-2xl">
        Vertrauen entsteht durch Transparenz.
      </p>
    </div>
  </section>
);

export default HomeTrustSecurity;
