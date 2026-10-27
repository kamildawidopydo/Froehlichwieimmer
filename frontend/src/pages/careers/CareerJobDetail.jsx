import React, { useEffect, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { ArrowLeft, Check, MapPin, Briefcase, BarChart3, CalendarClock, Loader2, Share2, Layers, Building2, Globe, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import PageMeta from '@/components/PageMeta';
import { careersApi } from '@/lib/careersApi';
import { CAREER_PATHS, LEVEL_LABEL, formatDate } from '@/lib/careersContent';

const Block = ({ title, items, text, testid }) => (
  <section className="rounded-2xl border border-black/5 bg-white p-7 lg:p-9" data-testid={testid}>
    <h2 className="font-display text-2xl text-[#1E222C]">{title}</h2>
    {text && <p className="mt-4 leading-relaxed text-[#555]">{text}</p>}
    {items?.length > 0 && (
      <ul className="mt-5 space-y-3">
        {items.map((t) => (
          <li key={t} className="flex gap-3 text-[15px] leading-relaxed text-[#333]">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#36A852]/12"><Check size={12} className="text-[#36A852]" /></span>{t}
          </li>
        ))}
      </ul>
    )}
  </section>
);

const Missing = () => <span className="inline-flex items-center gap-1 text-amber-700" data-testid="job-missing-field"><AlertTriangle size={13} /> Angabe fehlt – bitte ergänzen</span>;

const ProcessBlock = ({ enabled }) => (
  <section className="rounded-2xl border border-black/5 bg-white p-7 lg:p-9" data-testid="job-detail-process">
    <h2 className="font-display text-2xl text-[#1E222C]">Informationen zum Bewerbungsprozess</h2>
    <ol className="mt-5 space-y-3 text-[15px] leading-relaxed text-[#333]">
      {['Sie bewerben sich online über unser Bewerbungsformular – Lebenslauf als PDF, weitere Unterlagen optional.', 'Sie erhalten eine Eingangsbestätigung per E-Mail.', 'Wir sichten Ihre Unterlagen sorgfältig.', 'Bei passender Qualifikation melden wir uns für ein persönliches Kennenlernen.'].map((t, i) => (
        <li key={t} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#36A852]/12 text-xs font-semibold text-[#2E8B45]">{i + 1}</span>{t}</li>
      ))}
    </ol>
    {!enabled && <p className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900" data-testid="job-detail-apply-disabled">Online-Bewerbungen sind derzeit noch nicht freigeschaltet.</p>}
    <p className="mt-4 text-sm text-[#686A64]">Informationen zur Verarbeitung Ihrer Daten finden Sie in den <Link to="/karriere/datenschutz" className="font-semibold text-[#36A852] underline">Datenschutzhinweisen für Bewerber</Link>.</p>
  </section>
);

export default function CareerJobDetail() {
  const { slug } = useParams();
  const { status } = useOutletContext();
  const [job, setJob] = useState(undefined);

  useEffect(() => {
    careersApi.get(`/jobs/${slug}`, { params: { preview: status.is_staff ? 1 : undefined } })
      .then((r) => setJob(r.data)).catch(() => setJob(null));
  }, [slug, status.is_staff]);

  if (job === undefined) return <div className="flex justify-center py-32"><Loader2 className="animate-spin text-[#36A852]" /></div>;
  if (!job) return (
    <div className="py-32 text-center" data-testid="job-detail-not-found">
      <h1 className="font-display text-3xl">Diese Stelle ist nicht verfügbar.</h1>
      <Link to="/karriere/stellen" className="mt-6 inline-block font-semibold text-[#36A852]">Zu allen Stellenangeboten</Link>
    </div>
  );

  const facts = [
    [MapPin, 'Arbeitsort', job.location || <Missing />],
    [Briefcase, 'Beschäftigungsart', job.employment_type || <Missing />],
    [Layers, 'Tätigkeitsbereich', job.area || <Missing />],
    [BarChart3, 'Karrierelevel', (job.levels?.length ? job.levels : [job.level]).map((l) => LEVEL_LABEL[l]).join(' · ')],
    [CalendarClock, 'Bewerbungsfrist', job.deadline ? formatDate(job.deadline) : 'Keine Frist'],
  ];
  const workFacts = [
    [Building2, 'Arbeitgeber', 'Fröhlich Vermögensberatung GmbH'],
    [MapPin, 'Arbeitsort', job.location || <Missing />],
    [Briefcase, 'Beschäftigungsmodell', job.employment_type || <Missing />],
    [Globe, 'Internetauftritt', 'www.essenceinvest.com'],
  ];
  const applyLink = `/karriere/bewerben?stelle=${job.slug}`;
  const enabled = status.applications_enabled;
  const ApplyBtn = ({ className, testid }) => (enabled
    ? <Link to={applyLink} className={`${className} bg-[#36A852] text-white`} data-testid={testid}>Jetzt bewerben</Link>
    : <span aria-disabled="true" className={`${className} cursor-not-allowed bg-[#36A852]/40 text-white/90`} data-testid={testid}>Bewerbung in Kürze möglich</span>);
  const heroImg = CAREER_PATHS.find((p) => p.level === job.level)?.image || '/assets/careers/hero.jpg';
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: job.title, url });
      else { await navigator.clipboard.writeText(url); toast.success('Link kopiert'); }
    } catch { /* abgebrochen */ }
  };
  return (
    <>
      <PageMeta title={`${job.title} | Karriere bei der Fröhlich Vermögensberatung GmbH`} description={job.summary} path={`/karriere/stellen/${job.slug}`} />
      <section className="relative isolate overflow-hidden bg-[#1E222C] pb-16 pt-10 text-white">
        <img src={heroImg} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover object-top opacity-30" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#1E222C] via-[#1E222C]/85 to-[#1E222C]/40" />
        <div className="mx-auto max-w-5xl px-5 lg:px-8">
          <Link to="/karriere/stellen" className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white" data-testid="job-detail-back"><ArrowLeft size={15} /> Alle Stellenangebote</Link>
          {job.status === 'draft' && <span className="ml-3 rounded-full bg-amber-200 px-3 py-1 text-xs font-semibold text-amber-900">Entwurf – nicht öffentlich</span>}
          <h1 className="mt-6 font-display text-4xl leading-tight sm:text-5xl" data-testid="job-detail-title">{job.title}</h1>
          <p className="mt-4 max-w-3xl text-lg text-white/75">{job.summary}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ApplyBtn className="inline-block rounded-full px-7 py-3.5 font-semibold" testid="job-detail-apply-top" />
            <button type="button" onClick={share} className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3.5 font-semibold hover:bg-white/10" data-testid="job-detail-share"><Share2 size={16} /> Teilen</button>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 border-t border-white/15 pt-6 sm:grid-cols-3 lg:grid-cols-5" data-testid="job-detail-facts">
            {facts.map(([Icon, k, v]) => (
              <div key={k}><p className="flex items-center gap-1.5 text-xs text-white/60"><Icon size={13} />{k}</p><p className="mt-1 font-medium [&_[data-testid=job-missing-field]]:text-amber-300">{v}</p></div>
            ))}
          </div>
        </div>
      </section>
      <div className="mx-auto grid max-w-5xl gap-6 px-5 pb-28 pt-12 lg:grid-cols-[1fr_300px] lg:px-8 lg:pb-16">
        <div className="space-y-6">
          <Block title="Ihr Aufgabenbereich" items={job.tasks} testid="job-detail-tasks" />
          <Block title="Das bringen Sie mit" items={job.requirements} testid="job-detail-requirements" />
          <Block title="Das erwartet Sie bei uns" items={job.offer} testid="job-detail-offer" />
          <section className="rounded-2xl border border-black/5 bg-white p-7 lg:p-9" data-testid="job-detail-work">
            <h2 className="font-display text-2xl text-[#1E222C]">Arbeitsort und Beschäftigungsmodell</h2>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              {workFacts.map(([Icon, k, v]) => (
                <div key={k} className="flex gap-3 rounded-xl bg-[#F7F5F0] p-4"><Icon size={18} className="mt-0.5 shrink-0 text-[#36A852]" /><div><dt className="text-xs text-[#686A64]">{k}</dt><dd className="font-medium">{v}</dd></div></div>
              ))}
            </dl>
            {job.employment_type?.includes(' oder ') && <p className="mt-4 text-sm text-[#686A64]" data-testid="job-detail-contract-note">Die endgültige Vertragsform wird im Rahmen des Bewerbungsprozesses individuell festgelegt.</p>}
          </section>
          {job.career_path && <Block title="Ihr Karriereweg" text={job.career_path} testid="job-detail-career-path" />}
          <ProcessBlock enabled={status.applications_enabled} />
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-black/5 bg-white p-6">
            <dl className="space-y-4">
              {facts.map(([Icon, k, v]) => (
                <div key={k} className="flex gap-3"><Icon size={18} className="mt-0.5 text-[#36A852]" /><div><dt className="text-xs text-[#686A64]">{k}</dt><dd className="font-medium">{v}</dd></div></div>
              ))}
            </dl>
            <ApplyBtn className="mt-6 block rounded-full py-3.5 text-center font-semibold" testid="job-detail-apply-side" />
          </div>
        </aside>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/5 bg-white/95 p-3 backdrop-blur lg:hidden">
        <ApplyBtn className="block rounded-full py-3.5 text-center font-semibold" testid="job-detail-apply-mobile" />
      </div>
    </>
  );
}
