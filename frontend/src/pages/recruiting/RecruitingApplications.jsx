import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Paperclip, Search } from 'lucide-react';
import { careersApi } from '@/lib/careersApi';
import { formatDate } from '@/lib/careersContent';
import { STATUS_STYLE } from './RecruitingOverview';

export const STATUS_LABEL = { neu: 'Neu eingegangen', in_pruefung: 'In Prüfung', interview: 'Vorstellungsgespräch', zusage: 'Zusage', absage: 'Absage' };
const sel = 'rounded-full border border-black/10 bg-white px-4 py-2 text-sm';

export default function RecruitingApplications() {
  const [params, setParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [items, setItems] = useState(null);
  const [q, setQ] = useState('');
  const job = params.get('job') || '';
  const status = params.get('status') || '';

  useEffect(() => { careersApi.get('/admin/jobs').then((r) => setJobs(r.data.items)); }, []);
  useEffect(() => {
    careersApi.get('/admin/applications', { params: { job_id: job, status, q } }).then((r) => setItems(r.data.items));
  }, [job, status, q]);
  const setP = (k) => (e) => { const p = new URLSearchParams(params); if (e.target.value) p.set(k, e.target.value); else p.delete(k); setParams(p); };

  return (
    <div data-testid="recruiting-applications">
      <h1 className="text-2xl font-semibold">Bewerbermanagement</h1>
      <div className="mt-5 flex flex-wrap gap-2">
        <select className={sel} value={job} onChange={setP('job')} data-testid="app-filter-job">
          <option value="">Alle Stellen</option>
          <option value="initiative">Initiativbewerbungen</option>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
        <select className={sel} value={status} onChange={setP('status')} data-testid="app-filter-status">
          <option value="">Alle Status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="flex flex-1 items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm">
          <Search size={15} className="text-[#686A64]" />
          <input className="w-full outline-none" placeholder="Name, E-Mail oder Position" value={q} onChange={(e) => setQ(e.target.value)} data-testid="app-filter-search" />
        </label>
      </div>
      <div className="mt-5 overflow-hidden rounded-2xl border border-black/5 bg-white">
        {items === null ? null : items.length === 0 ? (
          <p className="p-10 text-center text-sm text-[#686A64]" data-testid="app-list-empty">Keine Bewerbungen gefunden.</p>
        ) : items.map((a) => (
          <Link key={a.id} to={`/recruiting/bewerbungen/${a.id}`} className="flex flex-col gap-1 border-b border-black/5 px-5 py-4 last:border-0 hover:bg-black/[0.02] sm:flex-row sm:items-center sm:justify-between" data-testid={`app-row-${a.id}`}>
            <div className="min-w-0">
              <p className="font-semibold">{a.first_name} {a.last_name}</p>
              <p className="truncate text-sm text-[#686A64]">{a.job_title || `Initiativ · ${a.position}`}</p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              {a.files_count > 0 && <span className="inline-flex items-center gap-1 text-[#686A64]"><Paperclip size={13} />{a.files_count}</span>}
              <span className="text-[#686A64]">{formatDate(a.created_at)}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[a.status]}`}>{STATUS_LABEL[a.status]}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
