import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Download, Trash2 } from 'lucide-react';
import { careersApi, errMsg, fileUrl } from '@/lib/careersApi';
import { formatDate } from '@/lib/careersContent';
import { STATUS_LABEL } from './RecruitingApplications';

const Row = ({ k, v }) => <div className="flex justify-between gap-4 border-b border-black/5 py-2.5 text-sm last:border-0"><dt className="text-[#686A64]">{k}</dt><dd className="text-right font-medium">{v || '–'}</dd></div>;

export default function RecruitingApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [a, setA] = useState(null);
  const [note, setNote] = useState('');
  useEffect(() => { careersApi.get(`/admin/applications/${id}`).then((r) => setA(r.data)).catch(() => setA(false)); }, [id]);

  const patch = async (body, msg) => {
    try { const r = await careersApi.patch(`/admin/applications/${id}`, body); setA(r.data); toast.success(msg); } catch (e) { toast.error(errMsg(e)); }
  };
  const remove = async () => {
    if (!window.confirm('Bewerbung inklusive aller Unterlagen endgültig löschen?')) return;
    await careersApi.delete(`/admin/applications/${id}`);
    toast.success('Bewerbung gelöscht');
    navigate('/recruiting/bewerbungen');
  };

  if (a === false) return <p>Bewerbung nicht gefunden.</p>;
  if (!a) return null;
  return (
    <div data-testid="recruiting-application-detail">
      <Link to="/recruiting/bewerbungen" className="inline-flex items-center gap-1 text-sm text-[#686A64]"><ArrowLeft size={14} /> Alle Bewerbungen</Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="app-detail-name">{a.first_name} {a.last_name}</h1>
          <p className="text-[#686A64]">{a.job_title || `Initiativbewerbung · ${a.position}`} · eingegangen am {formatDate(a.created_at)}</p>
        </div>
        <button type="button" onClick={remove} className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-4 py-2 text-sm text-rose-700" data-testid="app-detail-delete"><Trash2 size={14} /> Löschen</button>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-black/5 bg-white p-6">
            <dl>
              <Row k="E-Mail" v={<a href={`mailto:${a.email}`} className="text-[#36A852]">{a.email}</a>} />
              <Row k="Telefon" v={a.phone} />
              <Row k="Berufserfahrung" v={a.experience} />
              <Row k="Frühester Eintritt" v={a.start_date ? formatDate(a.start_date) : ''} />
            </dl>
            {a.message && <p className="mt-4 whitespace-pre-wrap rounded-xl bg-[#F7F5F0] p-4 text-sm leading-relaxed" data-testid="app-detail-message">{a.message}</p>}
          </section>
          <section className="rounded-2xl border border-black/5 bg-white p-6">
            <h2 className="font-semibold">Unterlagen</h2>
            {a.files.length === 0 ? <p className="mt-3 text-sm text-[#686A64]">Keine Dokumente hochgeladen.</p> : a.files.map((f) => (
              <a key={f.file_id} href={fileUrl(f.file_id)} className="mt-3 flex items-center justify-between rounded-xl border border-black/5 px-4 py-3 text-sm hover:bg-black/[0.02]" data-testid={`app-file-${f.file_id}`}>
                <span className="truncate">{f.kind === 'cv' ? 'Lebenslauf · ' : ''}{f.name}</span><Download size={15} className="text-[#36A852]" />
              </a>
            ))}
          </section>
        </div>
        <aside className="space-y-6">
          <section className="rounded-2xl border border-black/5 bg-white p-6">
            <h2 className="font-semibold">Bewerbungsstatus</h2>
            <select className="mt-3 w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm" value={a.status} onChange={(e) => patch({ status: e.target.value }, 'Status aktualisiert')} data-testid="app-detail-status">
              {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </section>
          <section className="rounded-2xl border border-black/5 bg-white p-6">
            <h2 className="font-semibold">Interne Notizen</h2>
            <textarea rows={3} className="mt-3 w-full rounded-lg border border-black/10 px-3 py-2 text-sm" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notiz hinzufügen…" data-testid="app-detail-note-input" />
            <button type="button" disabled={!note.trim()} onClick={() => { patch({ note }, 'Notiz gespeichert'); setNote(''); }} className="mt-2 rounded-full bg-[#36A852] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" data-testid="app-detail-note-save">Notiz speichern</button>
            <ul className="mt-4 space-y-3">
              {[...a.notes].reverse().map((n, i) => (
                <li key={i} className={`rounded-lg p-3 text-sm ${n.system ? 'bg-black/[0.03] text-[#686A64]' : 'bg-[#36A852]/8'}`} data-testid="app-detail-note">
                  <p className="whitespace-pre-wrap">{n.text}</p>
                  <p className="mt-1 text-xs text-[#686A64]">{n.author} · {new Date(n.at).toLocaleString('de-DE')}</p>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
