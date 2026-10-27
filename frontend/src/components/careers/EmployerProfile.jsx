import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin, ShieldCheck, UserRound, BadgeCheck, Sparkles } from 'lucide-react';

const FACTS = [
  { icon: Building2, label: 'Unternehmen', value: 'Fröhlich Vermögensberatung GmbH' },
  { icon: Sparkles, label: 'Marke', value: 'Essence Invest' },
  { icon: MapPin, label: 'Sitz', value: 'Bösgrunder Weg 62, 55543 Bad Kreuznach' },
  { icon: UserRound, label: 'Geschäftsführer', value: 'Manfred Franz Fröhlich' },
  { icon: ShieldCheck, label: 'Handelsregister', value: 'Amtsgericht Bad Kreuznach, HRB 23436' },
  { icon: BadgeCheck, label: 'Tätigkeit', value: 'Vertraglich gebundener Vermittler (§ 3 Abs. 2 WpIG) · Darlehensvermittler (§ 34c GewO)' },
];

export default function EmployerProfile() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24" data-testid="employer-profile">
      <div className="grid gap-10 rounded-3xl border border-black/5 bg-white p-7 sm:p-10 lg:grid-cols-[1fr_1.1fr] lg:p-14">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#36A852]">Ihr Arbeitgeber</p>
          <h2 className="mt-3 font-display text-3xl leading-tight text-[#1E222C] sm:text-4xl" data-testid="employer-profile-title">
            Fröhlich Vermögensberatung GmbH – <span className="text-[#36A852]">Lernen Sie uns kennen</span>
          </h2>
          <p className="mt-6 leading-relaxed text-[#555]">
            Die Fröhlich Vermögensberatung GmbH mit Sitz in Bad Kreuznach ist das Unternehmen hinter Essence Invest. Unter der Marke Essence Invest bieten wir Spar-, Festgeld- und Investmentlösungen europäischer Partnerbanken übersichtlich auf einer Plattform an.
          </p>
          <p className="mt-4 leading-relaxed text-[#555]">
            Als vertraglich gebundener Vermittler und zugelassener Darlehensvermittler arbeiten wir in einem regulierten Umfeld, in dem Sorgfalt, Transparenz und Vertrauen zählen.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/karriere/ueber-uns" className="rounded-full bg-[#36A852] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2E9446]" data-testid="employer-profile-more">Mehr über das Unternehmen</Link>
            <Link to="/legal/impressum" className="rounded-full border border-black/10 px-6 py-3 text-sm font-semibold transition-colors hover:bg-black/[0.03]" data-testid="employer-profile-imprint">Impressum</Link>
          </div>
        </div>
        <dl className="grid gap-3 sm:grid-cols-2">
          {FACTS.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex gap-4 rounded-2xl bg-[#F7F5F0] p-5" data-testid={`employer-fact-${label.toLowerCase()}`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#36A852]/10"><Icon size={18} className="text-[#36A852]" /></span>
              <div className="min-w-0"><dt className="text-xs text-[#686A64]">{label}</dt><dd className="mt-0.5 font-medium leading-snug text-[#1E222C]">{value}</dd></div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
