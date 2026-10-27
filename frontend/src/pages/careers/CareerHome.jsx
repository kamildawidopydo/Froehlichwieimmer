import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import JobSearchBar from '@/components/careers/JobSearchBar';
import JobCard from '@/components/careers/JobCard';
import JobsEmptyState from '@/components/careers/JobsEmptyState';
import { PathsSection, SectionHead, ValuesSection, WebsiteSection } from '@/components/careers/CareerSections';
import useJobs from './useJobs';
import EmployerProfile from '@/components/careers/EmployerProfile';
import { CAREER_PATHS } from '@/lib/careersContent';

const Hero = () => (
  <section className="relative isolate overflow-hidden bg-[#1E222C]" data-testid="career-hero">
    <img src="/assets/careers/hero.jpg" alt="" className="absolute inset-0 -z-10 h-full w-full scale-105 object-cover opacity-60" fetchpriority="high" />
    <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#1E222C] via-[#1E222C]/75 to-[#1E222C]/10" />
    <div className="mx-auto max-w-7xl px-5 pb-40 pt-20 lg:px-8 lg:pb-48 lg:pt-28">
      <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="max-w-3xl font-display text-4xl leading-[1.08] text-white sm:text-5xl lg:text-6xl" data-testid="career-hero-title">
        Karriere bei der Fröhlich Vermögensberatung GmbH
      </motion.h1>
      <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="mt-6 max-w-2xl text-lg font-medium text-white/90 md:text-xl" data-testid="career-hero-subtitle">
        Gemeinsam Perspektiven schaffen. Verantwortung übernehmen. Zukunft gestalten.
      </motion.p>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="mt-9 flex flex-wrap gap-3">
        <Link to="/karriere/stellen" data-testid="career-hero-jobs-btn" className="rounded-full bg-[#36A852] px-7 py-3.5 text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5">Stellenangebote ansehen</Link>
        <Link to="/karriere/ueber-uns" data-testid="career-hero-about-btn" className="rounded-full border border-white/40 px-7 py-3.5 text-[15px] font-semibold text-white backdrop-blur transition-colors hover:bg-white/10">Unternehmen kennenlernen</Link>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.36 }} className="mt-8 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[13px] text-white/60">Direkt zu:</span>
        {CAREER_PATHS.map((p) => (
          <Link key={p.slug} to={`/karriere/${p.slug}`} data-testid={`career-hero-chip-${p.slug}`}
            className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[13px] font-medium text-white backdrop-blur transition-colors hover:bg-white hover:text-[#1E222C]">{p.title}</Link>
        ))}
      </motion.div>
    </div>
  </section>
);

const Intro = () => (
  <section className="mx-auto max-w-7xl px-5 pt-20 lg:px-8 lg:pt-28" data-testid="career-intro">
    <div className="grid gap-8 lg:grid-cols-[220px_1fr] lg:gap-16">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#36A852]">Willkommen</p>
      <div className="max-w-3xl border-l-2 border-[#36A852] pl-6 sm:pl-10">
        <p className="font-display text-2xl leading-snug text-[#1E222C] sm:text-3xl">
          Sie interessieren sich für Finanzmärkte, Vermögensberatung und die finanziellen Ziele von Menschen?
        </p>
        <p className="mt-6 text-base leading-relaxed text-[#555] md:text-lg">
          Bei der Fröhlich Vermögensberatung GmbH stehen persönliche Beratung, individuelle finanzielle Lösungen und ein verantwortungsvoller Umgang mit den Interessen unserer Kunden im Mittelpunkt.
        </p>
        <p className="mt-4 text-base leading-relaxed text-[#555] md:text-lg">
          Über unseren Internetauftritt <span className="font-semibold text-[#1E222C]">www.essenceinvest.com</span> informieren wir über unsere Leistungen und bieten Zugang zu unseren digitalen Angeboten.
        </p>
        <p className="mt-4 text-base leading-relaxed text-[#555] md:text-lg">
          Lernen Sie unser Unternehmen kennen und entdecken Sie die unterschiedlichen Tätigkeitsbereiche und beruflichen Perspektiven in der Vermögensberatung.
        </p>
      </div>
    </div>
  </section>
);

const LatestJobs = ({ items }) => (
  <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8" data-testid="career-latest-jobs">
    {items.length === 0 ? <JobsEmptyState /> : (
      <>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHead eyebrow="Aktuelle Stellen" title="Offene Positionen" />
          <Link to="/karriere/stellen" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#36A852]" data-testid="career-all-jobs-link">Alle Stellenangebote <ArrowRight size={15} /></Link>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.slice(0, 6).map((j, i) => <JobCard key={j.id} job={j} index={i} />)}
        </div>
      </>
    )}
  </section>
);

const ClosingCta = ({ applicationsEnabled }) => (
  <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
    <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-[#36A852] p-10 text-white md:flex-row md:items-center lg:p-14">
      {applicationsEnabled ? (
        <>
          <div>
            <h2 className="font-display text-3xl sm:text-4xl">Nicht die passende Stelle dabei?</h2>
            <p className="mt-3 max-w-xl text-white/85">Wir freuen uns auch über Ihre Initiativbewerbung.</p>
          </div>
          <Link to="/karriere/bewerben?initiativ=1" className="rounded-full bg-white px-7 py-3.5 font-semibold text-[#1E222C] transition-transform hover:-translate-y-0.5" data-testid="career-cta-initiative">Initiativ bewerben</Link>
        </>
      ) : (
        <>
          <div data-testid="career-cta-perspectives">
            <h2 className="font-display text-3xl sm:text-4xl">Entdecken Sie Ihre beruflichen Perspektiven</h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-white/85">Wir bereiten derzeit unsere aktuellen Karrieremöglichkeiten vor. Lernen Sie die Fröhlich Vermögensberatung GmbH kennen und entdecken Sie, welche beruflichen Perspektiven unser Unternehmen bietet.</p>
          </div>
          <Link to="/karriere/ueber-uns" className="shrink-0 rounded-full bg-white px-7 py-3.5 font-semibold text-[#1E222C] transition-transform hover:-translate-y-0.5" data-testid="career-cta-about">Mehr über uns erfahren</Link>
        </>
      )}
    </div>
  </section>
);

export default function CareerHome() {
  const { status } = useOutletContext();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const { filters, setFilters, data, loading } = useJobs(status.is_staff);
  const submit = () => {
    const p = new URLSearchParams(Object.entries(filters).filter(([k, v]) => v && k !== 'sort'));
    navigate(`/karriere/stellen?${p}`);
  };
  useEffect(() => {
    if (hash) {
      const t = setTimeout(() => document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' }), 150);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [hash]);
  return (
    <>
      <PageMeta title="Karriere bei der Fröhlich Vermögensberatung GmbH" description="Karriere bei der Fröhlich Vermögensberatung GmbH – berufliche Perspektiven für Berufseinsteiger, Quereinsteiger und Berufserfahrene in der Vermögensberatung." path="/karriere" />
      <Hero />
      <div className="relative z-10 mx-auto -mt-24 max-w-6xl px-5 lg:px-8">
        <JobSearchBar value={filters} onChange={setFilters} onSubmit={submit} locations={data.locations} types={data.employment_types} areas={data.areas} />
      </div>
      <Intro />
      <EmployerProfile />
      <ValuesSection />
      <PathsSection />
      <WebsiteSection />
      {!loading && <LatestJobs items={data.items} />}
      <ClosingCta applicationsEnabled={status.applications_enabled} />
    </>
  );
}
