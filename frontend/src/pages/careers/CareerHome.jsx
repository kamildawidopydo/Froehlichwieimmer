import React from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import JobSearchBar from '@/components/careers/JobSearchBar';
import JobCard from '@/components/careers/JobCard';
import { CultureSection, PathsSection, SectionHead } from '@/components/careers/CareerSections';
import useJobs from './useJobs';

const Hero = () => (
  <section className="relative isolate overflow-hidden bg-[#1E222C]" data-testid="career-hero">
    <img src="/assets/careers/hero.jpg" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-70" fetchpriority="high" />
    <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#1E222C] via-[#1E222C]/75 to-[#1E222C]/10" />
    <div className="mx-auto max-w-7xl px-5 pb-40 pt-20 lg:px-8 lg:pb-48 lg:pt-28">
      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7BD58F]">Karriere bei Essence Invest</motion.p>
      <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="mt-5 max-w-3xl font-display text-4xl leading-[1.08] text-white sm:text-5xl lg:text-6xl" data-testid="career-hero-title">
        Deine Zukunft beginnt bei Essence Invest.
      </motion.h1>
      <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="mt-6 max-w-2xl text-base leading-relaxed text-white/80 md:text-lg">
        Entdecke spannende Karrieremöglichkeiten in der Finanzwelt. Ob Berufseinsteiger, Quereinsteiger oder erfahrener Profi – finde deinen Platz in unserem Team.
      </motion.p>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="mt-9 flex flex-wrap gap-3">
        <Link to="/karriere/stellen" data-testid="career-hero-jobs-btn" className="rounded-full bg-[#36A852] px-7 py-3.5 text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5">Jetzt Jobs entdecken</Link>
        <Link to="/karriere/bewerben?initiativ=1" data-testid="career-hero-initiative-btn" className="rounded-full border border-white/40 px-7 py-3.5 text-[15px] font-semibold text-white backdrop-blur transition-colors hover:bg-white/10">Initiativ bewerben</Link>
      </motion.div>
    </div>
  </section>
);

export default function CareerHome() {
  const { status } = useOutletContext();
  const navigate = useNavigate();
  const { filters, setFilters, data } = useJobs(status.is_staff);
  const submit = () => {
    const p = new URLSearchParams(Object.entries(filters).filter(([k, v]) => v && k !== 'sort'));
    navigate(`/karriere/stellen?${p}`);
  };
  return (
    <>
      <PageMeta title="Karriere bei Essence Invest | Stellenangebote" description="Entdecke Karrieremöglichkeiten in der Finanzwelt bei Essence Invest – für Berufseinsteiger, Quereinsteiger und Berufserfahrene." path="/karriere" />
      <Hero />
      <div className="relative z-10 mx-auto -mt-24 max-w-6xl px-5 lg:px-8">
        <JobSearchBar value={filters} onChange={setFilters} onSubmit={submit} locations={data.locations} types={data.employment_types} />
      </div>
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8" data-testid="career-latest-jobs">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHead eyebrow="Aktuelle Stellen" title="Offene Positionen" />
          <Link to="/karriere/stellen" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#36A852]" data-testid="career-all-jobs-link">Alle Stellenangebote <ArrowRight size={15} /></Link>
        </div>
        {data.items.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-dashed border-black/10 bg-white p-10 text-center text-[#555]" data-testid="career-no-jobs">
            Aktuell sind keine Stellen ausgeschrieben. Überzeuge uns gerne mit einer <Link to="/karriere/bewerben?initiativ=1" className="font-semibold text-[#36A852]">Initiativbewerbung</Link>.
          </p>
        ) : (
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {data.items.slice(0, 6).map((j, i) => <JobCard key={j.id} job={j} index={i} />)}
          </div>
        )}
      </section>
      <CultureSection isStaff={status.is_staff} />
      <PathsSection />
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-[#36A852] p-10 text-white md:flex-row md:items-center lg:p-14">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl">Nicht die passende Stelle dabei?</h2>
            <p className="mt-3 max-w-xl text-white/85">Wir freuen uns auch über deine Initiativbewerbung.</p>
          </div>
          <Link to="/karriere/bewerben?initiativ=1" className="rounded-full bg-white px-7 py-3.5 font-semibold text-[#1E222C] transition-transform hover:-translate-y-0.5" data-testid="career-cta-initiative">Initiativ bewerben</Link>
        </div>
      </section>
    </>
  );
}
