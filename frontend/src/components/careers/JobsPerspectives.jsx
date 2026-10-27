import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HeartHandshake, Users, TrendingUp, Repeat, MapPin, Info } from 'lucide-react';

const AREAS = [
  { icon: HeartHandshake, title: 'Finanzberatung', text: 'Persönliche Beratung und finanzielle Lösungen.' },
  { icon: Users, title: 'Kundenbetreuung', text: 'Kunden begleiten und langfristige Beziehungen pflegen.' },
  { icon: TrendingUp, title: 'Vertrieb', text: 'Menschen für Finanzdienstleistungen begeistern.' },
  { icon: Repeat, title: 'Beruflicher Quereinstieg', text: 'Neue Perspektiven in der Finanzbranche entdecken.' },
];

const Locations = ({ locations, selected, onPick }) => (
  <div className="mt-12 rounded-2xl bg-[#F7F5F0] p-6 sm:p-8" data-testid="perspectives-locations">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#36A852]">Standorte zur Orientierung</p>
    <div className="mt-4 flex flex-wrap gap-2.5">
      {locations.map((l) => {
        const on = selected === l;
        return (
          <button key={l} type="button" onClick={() => onPick(on ? '' : l)} aria-pressed={on} data-testid={`perspectives-location-${l}`}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${on ? 'border-[#36A852] bg-[#36A852] text-white' : 'border-black/10 bg-white text-[#1E222C] hover:border-[#36A852]/50'}`}>
            <MapPin size={14} className={on ? 'text-white' : 'text-[#36A852]'} />{l}
          </button>
        );
      })}
    </div>
    <p className="mt-4 flex items-start gap-2 text-[13.5px] leading-relaxed text-[#686A64]" data-testid="perspectives-locations-note">
      <Info size={15} className="mt-0.5 shrink-0" />
      {selected
        ? `Für ${selected} sind derzeit keine Stellenangebote veröffentlicht.`
        : 'Die Standorte dienen der Orientierung und stellen keine bestätigten offenen Stellen dar.'}
    </p>
  </div>
);

export default function JobsPerspectives({ locations = [], selected = '', onPickLocation }) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16" data-testid="jobs-perspectives">
      <div className="rounded-3xl border border-black/5 bg-white px-6 py-12 sm:px-12 lg:py-16">
        <div className="max-w-3xl">
          <h2 className="font-display text-3xl leading-tight text-[#1E222C] sm:text-4xl" data-testid="jobs-perspectives-title">Entdecken Sie Ihre beruflichen Perspektiven</h2>
          <p className="mt-6 text-base leading-relaxed text-[#555] md:text-lg">Sie interessieren sich für eine Tätigkeit in der Finanzberatung oder möchten neue berufliche Wege kennenlernen?</p>
          <p className="mt-3 text-base leading-relaxed text-[#555] md:text-lg">Die Fröhlich Vermögensberatung GmbH bietet Ihnen die Möglichkeit, sich über verschiedene Tätigkeitsbereiche und berufliche Perspektiven zu informieren.</p>
          <p className="mt-3 text-base leading-relaxed text-[#555] md:text-lg">Unsere aktuellen Stellenangebote werden hier veröffentlicht, sobald sie verfügbar sind.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AREAS.map(({ icon: Icon, title, text }, i) => (
            <motion.div key={title} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="rounded-2xl border border-black/5 bg-[#FBFAF7] p-6 transition-transform hover:-translate-y-1" data-testid={`perspectives-card-${i}`}>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#36A852]/10"><Icon size={20} className="text-[#36A852]" /></span>
              <h3 className="mt-5 text-lg font-semibold text-[#1E222C]">{title}</h3>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#555]">{text}</p>
            </motion.div>
          ))}
        </div>
        {locations.length > 0 && <Locations locations={locations} selected={selected} onPick={onPickLocation} />}
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/karriere/ueber-uns" className="rounded-full bg-[#36A852] px-7 py-3.5 text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5" data-testid="jobs-empty-company-btn">Unser Unternehmen kennenlernen</Link>
          <Link to="/karriere#karrierewege" className="rounded-full border border-black/10 px-7 py-3.5 text-[15px] font-semibold text-[#1E222C] transition-colors hover:bg-black/[0.03]" data-testid="jobs-empty-paths-btn">Karrierewege entdecken</Link>
        </div>
      </div>
    </section>
  );
}
