import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, FileEdit, Inbox, PauseCircle } from 'lucide-react';
import { careersApi } from '@/lib/careersApi';

export const STATUS_STYLE = {
  neu: 'bg-sky-100 text-sky-800', in_pruefung: 'bg-amber-100 text-amber-800', interview: 'bg-violet-100 text-violet-800',
  zusage: 'bg-emerald-100 text-emerald-800', absage: 'bg-rose-100 text-rose-800',
};

const Kpi = ({ icon: Icon, label, value, testid }) => (
  <div className="rounded-2xl border border-black/5 bg-white p-5" data-testid={testid}>
    <Icon size={18} className="text-[#36A852]" />
    <p className="mt-3 text-3xl font-semibold tabular-nums">{value}</p>
    <p className="text-sm text-[#686A64]">{label}</p>
  </div>
);

export default function RecruitingOverview() {
  const [s, setS] = useState(null);
  useEffect(() => { careersApi.get('/admin/stats').then((r) => setS(r.data)); }, []);
  if (!s) return null;
  const max = Math.max(1, ...s.per_job.map((p) => p.count));
  return (
    <div className="space-y-6" data-testid="recruiting-overview">
      <h1 className="text-2xl font-semibold">Übersicht</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={Briefcase} label="Aktive Stellenanzeigen" value={s.active_jobs} testid="kpi-active-jobs" />
        <Kpi icon={FileEdit} label="Entwürfe" value={s.draft_jobs} testid="kpi-draft-jobs" />
        <Kpi icon={PauseCircle} label="Deaktiviert" value={s.inactive_jobs} testid="kpi-inactive-jobs" />
        <Kpi icon={Inbox} label="Eingegangene Bewerbungen" value={s.total_applications} testid="kpi-total-applications" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-black/5 bg-white p-6">
          <h2 className="font-semibold">Bewerbungsstatus im Überblick</h2>
          <div className="mt-4 space-y-2">
            {s.by_status.map((b) => (
              <Link key={b.status} to={`/recruiting/bewerbungen?status=${b.status}`} className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-black/[0.03]" data-testid={`stat-status-${b.status}`}>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[b.status]}`}>{b.label}</span>
                <span className="font-semibold tabular-nums">{b.count}</span>
              </Link>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-black/5 bg-white p-6">
          <h2 className="font-semibold">Bewerbungen pro Stelle</h2>
          {s.per_job.length === 0 ? <p className="mt-4 text-sm text-[#686A64]">Noch keine Bewerbungen eingegangen.</p> : (
            <div className="mt-4 space-y-3">
              {s.per_job.map((p) => (
                <div key={p.job} data-testid="stat-per-job-row">
                  <div className="flex justify-between text-sm"><span className="truncate">{p.job}</span><span className="font-semibold">{p.count}</span></div>
                  <div className="mt-1 h-2 rounded-full bg-black/5"><div className="h-2 rounded-full bg-[#36A852]" style={{ width: `${(p.count / max) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
