import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ShieldCheck, Lock, ClipboardCheck, Users, Handshake, EyeOff, Compass, Heart, Sparkles } from 'lucide-react';

const PILLARS = [
  {
    key: 'data-security',
    title: 'Geprüfte Datensicherheit',
    text: 'Der Schutz persönlicher und finanzieller Daten hat für uns höchste Priorität.',
    cta: { label: 'Zertifikat ansehen', href: '/legal/privacy' },
    icon: ShieldCheck,
    placeholder: true,
  },
  {
    key: 'iso-27001',
    title: 'Informationssicherheit',
    text: 'Strukturierte Sicherheitsprozesse und hohe Standards beim Umgang mit sensiblen Informationen.',
    cta: { label: 'Mehr erfahren', href: '/legal/privacy' },
    icon: Lock,
    placeholder: true,
  },
  {
    key: 'quality',
    title: 'Qualitätsmanagement',
    text: 'Klare, nachvollziehbare Prozesse bilden die Grundlage für eine dauerhaft hohe Qualität.',
    cta: { label: 'Mehr erfahren', href: '/philosophie' },
    icon: ClipboardCheck,
    placeholder: true,
  },
  {
    key: 'memberships',
    title: 'Mitgliedschaften & Standards',
    text: 'Fachliche Standards, kontinuierliche Weiterbildung und verantwortungsvolles Handeln.',
    cta: { label: 'Mehr erfahren', href: '/about' },
    icon: Users,
    placeholder: true,
  },
  {
    key: 'advisory',
    title: 'Persönliche Beratung',
    text: 'Wir begleiten unsere Anleger langfristig und persönlich — nicht nur einzelne Investments.',
    cta: { label: 'Unser Beratungsansatz', href: '/philosophie' },
    icon: Handshake,
    placeholder: false,
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
  <section className="bg-white py-20 sm:py-24" data-testid="home-trust-security">
    <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-bank-gold">
          Vertrauen &amp; Sicherheit
        </p>
        <h2 className="mt-4 font-serif text-3xl leading-tight text-bank-text sm:text-4xl lg:text-[42px]">
          Qualität, Sicherheit und Transparenz.
        </h2>
        <p className="mt-5 text-[15px] leading-relaxed text-bank-text-muted sm:text-[16px]">
          Bei der Verwaltung von Vermögen sind Vertrauen, Sicherheit und nachvollziehbare Prozesse
          entscheidend. Deshalb legen wir großen Wert auf hohe Standards bei Datenschutz,
          Informationssicherheit, Qualität und persönlicher Betreuung.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {PILLARS.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.key}
              className="group relative flex flex-col rounded-2xl border border-bank-border bg-white p-6 shadow-editorial-sm transition-all duration-300 hover:border-bank-gold/50 hover:shadow-[0_20px_50px_-30px_rgba(15,29,52,0.25)]"
              data-testid={`trust-card-${p.key}`}
            >
              {p.placeholder && (
                <span
                  className="absolute right-3 top-3 rounded-full border border-dashed border-bank-gold/60 bg-bank-gold/10 px-2 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.16em] text-bank-gold"
                  title="Placeholder — offizielles Zertifikat noch nicht hinterlegt"
                >
                  Logo folgt
                </span>
              )}
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-bank-gold/10 ring-1 ring-bank-gold/20">
                <Icon className="h-7 w-7 text-bank-gold" strokeWidth={1.3} />
              </div>
              <h3 className="font-serif text-[17px] leading-snug text-bank-text">{p.title}</h3>
              <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-bank-text-muted">{p.text}</p>
              <Link
                to={p.cta.href}
                className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-medium uppercase tracking-[0.16em] text-bank-primary transition-colors group-hover:text-bank-gold"
              >
                {p.cta.label}
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.5} />
              </Link>
            </div>
          );
        })}
      </div>

      <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 border-y border-bank-border py-5">
        {MINI_ICONS.map(({ Icon, label }) => (
          <div key={label} className="flex items-center gap-2 text-[12px] uppercase tracking-[0.16em] text-bank-text-muted">
            <Icon className="h-4 w-4 text-bank-gold" strokeWidth={1.4} />
            {label}
          </div>
        ))}
      </div>

      <p className="mt-8 text-center font-serif text-lg italic text-bank-text sm:text-xl">
        Vertrauen entsteht durch Transparenz.
      </p>
    </div>
  </section>
);

export default HomeTrustSecurity;
