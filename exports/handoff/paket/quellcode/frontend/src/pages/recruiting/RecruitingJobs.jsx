import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { careersApi, errMsg } from '@/lib/careersApi';
import { LEVEL_LABEL, formatDate } from '@/lib/careersContent';
import JobEditorDialog from './JobEditorDialog';

const JOB_STATUS = {
  draft: ['Entwurf', 'bg-amber-100 text-amber-800'],
  published: ['Veröffentlicht', 'bg-emerald-100 text-emerald-800'],
  inactive: ['Deaktiviert', 'bg-slate-200 text-slate-700'],
};

const Btn = ({ children, ...p }) => <button type="button" className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-black/5 disabled:opacity-40" {...p}>{children}</button>;

export default function RecruitingJobs() {
  const [jobs, setJobs] = useState([]);
  const [edit, setEdit] = useState(null);
  const load = () => careersApi.get('/admin/jobs').then((r) => setJobs(r.data.items));
  useEffect(() => { load(); }, []);

  const setStatus = async (j, status) => {
    try {
      await careersApi.post(`/admin/jobs/${j.id}/status`, { status });
      toast.success({ published: 'Stelle veröffentlicht', inactive: 'Stelle deaktiviert', draft: 'Als Entwurf gespeichert' }[status]);
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };
  const remove = async (j) => {
    if (!window.confirm(`„${j.title}“ endgültig löschen?`)) return;
    await careersApi.delete(`/admin/jobs/${j.id}`);
    toast.success('Stelle gelöscht');
    load();
  };

  return (
    <div data-testid="recruiting-jobs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Stellenverwaltung</h1>
        <button type="button" onClick={() => setEdit({})} className="inline-flex items-center gap-1.5 rounded-full bg-[#36A852] px-5 py-2.5 text-sm font-semibold text-white" data-testid="job-create-btn"><Plus size={16} /> Neue Stelle</button>
      </div>
      <div className="mt-6 space-y-3">
        {jobs.map((j) => {
          const [label, cls] = JOB_STATUS[j.status];
          return (
            <div key={j.id} className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-5 lg:flex-row lg:items-center lg:justify-between" data-testid={`admin-job-row-${j.slug}`}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`} data-testid={`admin-job-status-${j.slug}`}>{label}</span>
                  <span className="text-xs text-[#686A64]">{(j.levels?.length ? j.levels : [j.level]).map((l) => LEVEL_LABEL[l]).join(' · ')}</span>
                  {j.deadline && <span className="text-xs text-[#686A64]">· Frist {formatDate(j.deadline)}</span>}
                </div>
                <p className="mt-1.5 font-semibold">{j.title}</p>
                <p className="text-xs text-[#686A64]">{j.area || '[Tätigkeitsbereich fehlt]'} · {j.location || '[Arbeitsort fehlt]'} · {j.employment_type || '[Beschäftigungsart fehlt]'} · {j.applications} Bewerbungen</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to={`/karriere/stellen/${j.slug}`} target="_blank" className="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-black/5" data-testid={`admin-job-preview-${j.slug}`}><Eye size={13} /> Vorschau</Link>
                <Btn onClick={() => setEdit(j)} data-testid={`admin-job-edit-${j.slug}`}><Pencil size={13} className="mr-1 inline" />Bearbeiten</Btn>
                {j.status !== 'published' && <Btn onClick={() => setStatus(j, 'published')} data-testid={`admin-job-publish-${j.slug}`}>Veröffentlichen</Btn>}
                {j.status === 'published' && <Btn onClick={() => setStatus(j, 'inactive')} data-testid={`admin-job-deactivate-${j.slug}`}>Deaktivieren</Btn>}
                {j.status !== 'draft' && <Btn onClick={() => setStatus(j, 'draft')} data-testid={`admin-job-draft-${j.slug}`}>Zu Entwurf</Btn>}
                <Btn onClick={() => remove(j)} data-testid={`admin-job-delete-${j.slug}`}><Trash2 size={13} className="inline text-rose-600" /></Btn>
              </div>
            </div>
          );
        })}
      </div>
      <JobEditorDialog open={!!edit} job={edit?.id ? edit : null} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />
    </div>
  );
}
