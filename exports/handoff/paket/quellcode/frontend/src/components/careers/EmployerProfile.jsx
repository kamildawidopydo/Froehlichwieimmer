import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin, ShieldCheck, UserRound, BadgeCheck, Globe } from 'lucide-react';

const FACTS = [
  { icon: Building2, label: 'Unternehmen', value: 'Fröhlich Vermögensberatung GmbH' },
  { icon: Globe, label: 'Internetauftritt', value: 'www.essenceinvest.com' },
  { icon: MapPin, label: 'Sitz', value: 'Bösgrunder Weg 62, 55543 Bad Kreuznach' },
  { icon: UserRound, label: 'Geschäftsführer', value: 'Manfred Franz Fröhlich' },
  { icon: ShieldCheck, label: 'Handelsregister', value: 'Amtsgericht Bad Kreuznach, HRB 23436' },
  { icon: BadgeCheck, label: 'Tätigkeit', value: 'Vertraglich gebundener Vermittler (§ 3 Abs. 2 WpIG) · Darlehensvermittler (§ 34c GewO)' },
];

const TEXT = [
  'Die Fröhlich Vermögensberatung GmbH steht für einen persönlichen Beratungsansatz, bei dem die individuellen Bedürfnisse und finanziellen Ziele unserer Kunden im Mittelpunkt stehen.',
  'Unsere Tätigkeit verbindet wirtschaftliche Zusammenhänge, Kenntnisse der Finanzmärkte und den persönlichen Austausch mit Menschen.',
  'Dabei legen wir Wert auf eine verständliche Kommunikation, einen verantwortungsbewussten Umgang mit finanziellen Entscheidungen und langfristig ausgerichtete Kundenbeziehungen.',
  'Auf www.essenceinvest.com präsentieren wir unseren Internetauftritt und unsere digitalen Angebote.',
  'Wenn Sie sich für Finanzberatung, Kapitalmärkte und den persönlichen Umgang mit Menschen interessieren, laden wir Sie ein, unser Unternehmen näher kennenzulernen.',
];

export default function EmployerProfile({ showMore = true }) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24" data-testid="employer-profile">
      <div className="grid gap-10 rounded-3xl border border-black/5 bg-white p-7 sm:p-10 lg:grid-cols-[1fr_1.1fr] lg:p-14">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#36A852]">Arbeitgeber</p>
          <h2 className="mt-3 font-display text-3xl leading-tight text-[#1E222C] sm:text-4xl" data-testid="employer-profile-title">
            Fröhlich Vermögensberatung GmbH – <span className="text-[#36A852]">Ihr möglicher zukünftiger Arbeitgeber</span>
          </h2>
          <p className="mt-6 font-display text-xl text-[#1E222C]">Finanzielle Entscheidungen sind Vertrauenssache.</p>
          {TEXT.map((t) => <p key={t} className="mt-4 leading-relaxed text-[#555]">{t}</p>)}
          <div className="mt-8 flex flex-wrap gap-3">
            {showMore && <Link to="/karriere/ueber-uns" className="rounded-full bg-[#36A852] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2E9446]" data-testid="employer-profile-more">Mehr über das Unternehmen</Link>}
            <Link to="/legal/impressum" className="rounded-full border border-black/10 px-6 py-3 text-sm font-semibold transition-colors hover:bg-black/[0.03]" data-testid="employer-profile-imprint">Impressum</Link>
          </div>
        </div>
        <dl className="grid content-start gap-3 sm:grid-cols-2">
          {FACTS.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex gap-4 rounded-2xl bg-[#F7F5F0] p-5" data-testid={`employer-fact-${label.toLowerCase()}`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#36A852]/10"><Icon size={18} className="text-[#36A852]" /></span>
              <div className="min-w-0"><dt className="text-xs text-[#686A64]">{label}</dt><dd className="mt-0.5 break-words font-medium leading-snug text-[#1E222C]">{value}</dd></div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
