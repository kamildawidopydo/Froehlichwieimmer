import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { careersApi, errMsg } from '@/lib/careersApi';
import { EMPLOYMENT_TYPES, LEVEL_LABEL } from '@/lib/careersContent';

const inp = 'w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-[#36A852]';
const EMPTY = { title: '', level: 'einsteiger', location: '', employment_type: '', summary: '', tasks: '', requirements: '', offer: '', career_path: '', deadline: '' };
const toText = (j) => ({ ...EMPTY, ...j, tasks: (j.tasks || []).join('\n'), requirements: (j.requirements || []).join('\n'), offer: (j.offer || []).join('\n'), deadline: j.deadline || '' });
const lines = (t) => t.split('\n').map((x) => x.trim()).filter(Boolean);

const L = ({ label, children, hint }) => (
  <label className="block text-sm"><span className="mb-1 block font-medium">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-[#686A64]">{hint}</span>}</label>
);

export default function JobEditorDialog({ job, open, onClose, onSaved }) {
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setF(job ? toText(job) : EMPTY); }, [job, open]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const body = { title: f.title, level: f.level, location: f.location, employment_type: f.employment_type, summary: f.summary,
      tasks: lines(f.tasks), requirements: lines(f.requirements), offer: lines(f.offer), career_path: f.career_path, deadline: f.deadline || null };
    try {
      const r = job ? await careersApi.put(`/admin/jobs/${job.id}`, body) : await careersApi.post('/admin/jobs', body);
      toast.success(job ? 'Stelle gespeichert' : 'Stelle als Entwurf angelegt');
      onSaved(r.data);
    } catch (err) {
      toast.error(errMsg(err, 'Speichern fehlgeschlagen'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto" data-testid="job-editor-dialog">
        <DialogHeader><DialogTitle>{job ? 'Stelle bearbeiten' : 'Neue Stellenanzeige'}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <L label="Stellenbezeichnung *"><input className={inp} required minLength={3} value={f.title} onChange={set('title')} data-testid="job-editor-title" /></L>
          <div className="grid gap-4 sm:grid-cols-3">
            <L label="Karrierelevel"><select className={inp} value={f.level} onChange={set('level')} data-testid="job-editor-level">{Object.entries(LEVEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></L>
            <L label="Standort" hint="Pflicht zum Veröffentlichen"><input className={inp} value={f.location} onChange={set('location')} data-testid="job-editor-location" /></L>
            <L label="Beschäftigungsart" hint="Pflicht zum Veröffentlichen">
              <select className={inp} value={f.employment_type} onChange={set('employment_type')} data-testid="job-editor-type"><option value="">Bitte wählen</option>{EMPLOYMENT_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
            </L>
          </div>
          <L label="Bewerbungsfrist"><input type="date" className={inp} value={f.deadline} onChange={set('deadline')} data-testid="job-editor-deadline" /></L>
          <L label="Kurzbeschreibung"><textarea rows={2} className={inp} value={f.summary} onChange={set('summary')} data-testid="job-editor-summary" /></L>
          <L label="Deine Aufgaben" hint="Ein Punkt pro Zeile"><textarea rows={4} className={inp} value={f.tasks} onChange={set('tasks')} data-testid="job-editor-tasks" /></L>
          <L label="Das bringst du mit" hint="Ein Punkt pro Zeile"><textarea rows={4} className={inp} value={f.requirements} onChange={set('requirements')} data-testid="job-editor-requirements" /></L>
          <L label="Das erwartet dich bei uns" hint="Ein Punkt pro Zeile · bitte nur bestätigte Angaben"><textarea rows={4} className={inp} value={f.offer} onChange={set('offer')} data-testid="job-editor-offer" /></L>
          <L label="Dein Karriereweg"><textarea rows={3} className={inp} value={f.career_path} onChange={set('career_path')} data-testid="job-editor-career-path" /></L>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-full border border-black/10 px-5 py-2.5 text-sm">Abbrechen</button>
            <button type="submit" disabled={busy} className="rounded-full bg-[#36A852] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" data-testid="job-editor-save">Speichern</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
