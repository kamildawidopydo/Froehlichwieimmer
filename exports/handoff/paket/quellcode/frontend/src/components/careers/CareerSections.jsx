import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Globe } from 'lucide-react';
import { CAREER_PATHS, VALUE_CARDS } from '@/lib/careersContent';

export const DraftNote = ({ show }) =>
  show ? <span className="ml-2 rounded-full bg-amber-100 px-2.5 py-0.5 align-middle text-[11px] font-semibold text-amber-800" data-testid="draft-note">Entwurf · bitte bestätigen</span> : null;

export const SectionHead = ({ eyebrow, title, children }) => (
  <div className="max-w-2xl">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#36A852]">{eyebrow}</p>
    <h2 className="mt-3 font-display text-3xl leading-tight text-[#1E222C] sm:text-4xl">{title}</h2>
    {children}
  </div>
);

export const ValuesSection = () => (
  <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24" data-testid="career-values-section">
    <SectionHead eyebrow="Unser Anspruch" title="Wofür die Fröhlich Vermögensberatung GmbH steht." />
    <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {VALUE_CARDS.map(({ icon: Icon, title, text }, i) => (
        <motion.div key={title} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
          className="flex flex-col rounded-2xl border border-black/5 bg-white p-7 transition-transform hover:-translate-y-1" data-testid={`value-card-${i}`}>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#36A852]/10"><Icon size={20} className="text-[#36A852]" /></span>
          <h3 className="mt-5 text-lg font-semibold leading-snug text-[#1E222C]">{title}</h3>
          <p className="mt-2 text-[14.5px] leading-relaxed text-[#555]">{text}</p>
        </motion.div>
      ))}
    </div>
  </section>
);

export const PathsSection = () => (
  <section id="karrierewege" className="scroll-mt-24 bg-white py-20 lg:py-28" data-testid="career-paths-section">
    <div className="mx-auto max-w-7xl px-5 lg:px-8">
      <SectionHead eyebrow="Karrierewege" title="Finden Sie Ihren beruflichen Weg" />
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {CAREER_PATHS.map((p) => (
          <Link key={p.slug} to={`/karriere/${p.slug}`} className="group relative block h-[460px] overflow-hidden rounded-3xl" data-testid={`career-path-card-${p.slug}`}>
            <img src={p.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1E222C] via-[#1E222C]/60 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-7 text-white">
              <p.icon size={22} className="text-[#7BD58F]" />
              <h3 className="mt-3 font-display text-3xl">{p.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-white/85 lg:min-h-[7.5rem]">{p.claim}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#1E222C] transition-colors group-hover:bg-[#36A852] group-hover:text-white" data-testid={`career-path-more-${p.slug}`}>Mehr erfahren <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" /></span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  </section>
);

export const WebsiteSection = () => (
  <section className="mx-auto max-w-7xl px-5 pt-20 lg:px-8 lg:pt-24" data-testid="career-website-section">
    <div className="grid items-center gap-8 rounded-3xl bg-[#1E222C] p-8 text-white sm:p-12 lg:grid-cols-[1fr_auto] lg:p-14">
      <div className="max-w-3xl">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10"><Globe size={20} className="text-[#7BD58F]" /></span>
        <h2 className="mt-6 font-display text-3xl leading-tight sm:text-4xl" data-testid="career-website-title">Unser Internetauftritt: www.essenceinvest.com</h2>
        <p className="mt-5 leading-relaxed text-white/80">Auf www.essenceinvest.com erhalten Interessenten und Kunden Informationen über unsere Leistungen und digitalen Angebote.</p>
        <p className="mt-4 leading-relaxed text-white/80">Der Internetauftritt ergänzt die persönliche Beratung der Fröhlich Vermögensberatung GmbH und ermöglicht einen zeitgemäßen Zugang zu den bereitgestellten Informationen und Funktionen.</p>
      </div>
      <Link to="/" className="inline-flex items-center gap-2 self-end rounded-full bg-[#36A852] px-7 py-3.5 font-semibold text-white transition-transform hover:-translate-y-0.5" data-testid="career-website-btn">Unsere Website entdecken <ArrowRight size={16} /></Link>
    </div>
  </section>
);
