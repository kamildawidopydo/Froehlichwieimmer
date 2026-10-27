import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Briefcase, ArrowRight } from 'lucide-react';
import { LEVEL_LABEL } from '@/lib/careersContent';

const Meta = ({ icon: Icon, children, missing }) => (
  <span className={`inline-flex items-center gap-1.5 text-[13px] ${missing ? 'font-medium text-amber-700' : 'text-[#555]'}`}>
    <Icon size={14} className={missing ? 'text-amber-600' : 'text-[#36A852]'} />{children}
  </span>
);

const Badges = ({ job }) => (
  <div className="flex flex-wrap items-center gap-2">
    {job.area && <span className="rounded-full bg-[#1E222C]/5 px-3 py-1 text-[11.5px] font-semibold text-[#1E222C]">{job.area}</span>}
    {(job.levels?.length ? job.levels : [job.level]).map((l) => <span key={l} className="rounded-full bg-[#36A852]/10 px-3 py-1 text-[11.5px] font-semibold text-[#2E8B45]">{LEVEL_LABEL[l]}</span>)}
    {job.status === 'draft' && <span className="rounded-full bg-amber-100 px-3 py-1 text-[11.5px] font-semibold text-amber-800" data-testid="job-card-draft-badge">Entwurf</span>}
  </div>
);

const Facts = ({ job }) => (
  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
    <Meta icon={MapPin} missing={!job.location}>{job.location || 'Arbeitsort fehlt'}</Meta>
    <Meta icon={Briefcase} missing={!job.employment_type}>{job.employment_type || 'Beschäftigungsart fehlt'}</Meta>
  </div>
);

const ViewBtn = ({ job, className = '' }) => (
  <Link to={`/karriere/stellen/${job.slug}`} data-testid={`job-card-view-${job.slug}`}
    className={`relative z-10 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#36A852] px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#2E9446] ${className}`}>
    Stelle ansehen <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
  </Link>
);

export function JobRow({ job, index = 0 }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: Math.min(index, 8) * 0.04 }}
      className="group relative rounded-2xl border border-black/5 bg-white p-5 transition-all hover:border-[#36A852]/40 hover:shadow-[0_16px_36px_-22px_rgba(30,34,44,0.4)] sm:p-6"
      data-testid={`job-card-${job.slug}`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <Badges job={job} />
          <h3 className="mt-2.5 font-display text-[21px] leading-snug text-[#1E222C] sm:text-[23px]">
            <Link to={`/karriere/stellen/${job.slug}`} className="after:absolute after:inset-0 group-hover:text-[#36A852]" data-testid={`job-card-more-${job.slug}`}>{job.title}</Link>
          </h3>
          <Facts job={job} />
          <p className="mt-2.5 line-clamp-2 max-w-2xl text-[14.5px] leading-relaxed text-[#555]">{job.summary}</p>
        </div>
        <ViewBtn job={job} className="w-full shrink-0 md:w-auto" />
      </div>
    </motion.article>
  );
}

export default function JobCard({ job, index = 0 }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.05 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-[0_22px_44px_-24px_rgba(30,34,44,0.45)]"
      data-testid={`job-card-${job.slug}`}
    >
      <span className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-[#36A852] transition-transform duration-300 group-hover:scale-x-100" />
      <Badges job={job} />
      <h3 className="mt-4 font-display text-[22px] leading-snug text-[#1E222C]">
        <Link to={`/karriere/stellen/${job.slug}`} className="hover:text-[#36A852]" data-testid={`job-card-more-${job.slug}`}>{job.title}</Link>
      </h3>
      <Facts job={job} />
      <p className="mt-4 line-clamp-3 flex-1 text-[14.5px] leading-relaxed text-[#555]">{job.summary}</p>
      <div className="mt-5 border-t border-black/5 pt-4"><ViewBtn job={job} className="w-full" /></div>
    </motion.article>
  );
}
