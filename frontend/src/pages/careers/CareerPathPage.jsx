import React from 'react';
import { Link, Navigate, useOutletContext, useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import JobCard from '@/components/careers/JobCard';
import { DraftNote } from '@/components/careers/CareerSections';
import { CAREER_PATHS } from '@/lib/careersContent';
import useJobs from './useJobs';

export default function CareerPathPage() {
  const { pathSlug } = useParams();
  const { status } = useOutletContext();
  const path = CAREER_PATHS.find((p) => p.slug === pathSlug);
  const { data } = useJobs(status.is_staff, { level: path?.level || '' });
  if (!path) return <Navigate to="/karriere" replace />;

  return (
    <>
      <PageMeta title={`${path.title} | Karriere bei Essence Invest`} description={path.claim} path={`/karriere/${path.slug}`} />
      <section className="relative isolate overflow-hidden bg-[#1E222C]" data-testid={`career-path-${path.slug}`}>
        <img src={path.image} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover object-top opacity-45" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#1E222C] to-[#1E222C]/20" />
        <div className="mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7BD58F]">Karriereweg</p>
          <h1 className="mt-4 font-display text-4xl text-white sm:text-5xl lg:text-6xl">{path.title}</h1>
          <p className="mt-4 text-xl text-white/85">{path.claim}</p>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-2 lg:px-8">
        <div>
          <h2 className="font-display text-3xl">Dein Einstieg bei Essence Invest<DraftNote show={status.is_staff} /></h2>
          <p className="mt-4 leading-relaxed text-[#555]">{path.intro}</p>
          <Link to={`/karriere/stellen?level=${path.level}`} className="mt-8 inline-block rounded-full bg-[#36A852] px-7 py-3.5 font-semibold text-white" data-testid="career-path-jobs-btn">Passende Stellenangebote</Link>
        </div>
        <ul className="space-y-3 rounded-2xl border border-black/5 bg-white p-7">
          {path.points.map((p) => (
            <li key={p} className="flex gap-3"><Check size={18} className="mt-0.5 text-[#36A852]" />{p}</li>
          ))}
        </ul>
      </section>
      {data.items.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-8">
          <h2 className="mb-6 font-display text-2xl">Stellen für {path.title}</h2>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{data.items.map((j, i) => <JobCard key={j.id} job={j} index={i} />)}</div>
        </section>
      )}
    </>
  );
}
