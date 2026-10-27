import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Briefcase, BarChart3, CalendarDays, ArrowRight } from 'lucide-react';
import { LEVEL_LABEL, formatDate } from '@/lib/careersContent';

const Meta = ({ icon: Icon, children }) => (
  <span className="inline-flex items-center gap-1.5 text-[13px] text-[#555]"><Icon size={14} className="text-[#36A852]" />{children}</span>
);

export default function JobCard({ job, index = 0 }) {
  const isDraft = job.status === 'draft';
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.05 }}
      className="group flex flex-col rounded-2xl border border-black/5 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_18px_40px_-20px_rgba(30,34,44,0.35)]"
      data-testid={`job-card-${job.slug}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#36A852]/10 px-3 py-1 text-[11.5px] font-semibold text-[#2E8B45]">{LEVEL_LABEL[job.level]}</span>
        {isDraft && <span className="rounded-full bg-amber-100 px-3 py-1 text-[11.5px] font-semibold text-amber-800" data-testid="job-card-draft-badge">Entwurf</span>}
      </div>
      <h3 className="mt-4 font-display text-[22px] leading-snug text-[#1E222C]">
        <Link to={`/karriere/stellen/${job.slug}`} className="hover:text-[#36A852]">{job.title}</Link>
      </h3>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        <Meta icon={MapPin}>{job.location || '[Standort folgt]'}</Meta>
        <Meta icon={Briefcase}>{job.employment_type || '[Beschäftigungsart folgt]'}</Meta>
        <Meta icon={BarChart3}>{LEVEL_LABEL[job.level]}</Meta>
      </div>
      <p className="mt-4 line-clamp-3 flex-1 text-[14.5px] leading-relaxed text-[#555]">{job.summary}</p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-black/5 pt-4">
        <Meta icon={CalendarDays}>{job.published_at ? `Veröffentlicht am ${formatDate(job.published_at)}` : 'Noch nicht veröffentlicht'}</Meta>
        <div className="flex gap-2">
          <Link to={`/karriere/stellen/${job.slug}`} data-testid={`job-card-more-${job.slug}`}
            className="inline-flex items-center gap-1 rounded-full border border-[#1E222C]/15 px-4 py-2 text-[13px] font-semibold transition-colors hover:border-[#36A852] hover:text-[#36A852]">
            Mehr erfahren
          </Link>
          <Link to={`/karriere/bewerben?stelle=${job.slug}`} data-testid={`job-card-apply-${job.slug}`}
            className="inline-flex items-center gap-1 rounded-full bg-[#36A852] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#2E9446]">
            Jetzt bewerben <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
