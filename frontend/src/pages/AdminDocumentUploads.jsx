import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { getApiBase } from '@/lib/apiBase';
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
  AdminToolbarCard,
  AdminSurfaceCard,
  adminTheadClass,
  adminRowHover,
} from '@/components/admin/AdminSubpageChrome';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RefreshCw, Ban, Copy, Search, Upload, Trash2, Download, CheckCircle2 } from 'lucide-react';

// Session 82.99 — Supabase-Storage-Referenzen entfernt. Uploads/Downloads
// laufen über den Backend-Storage-Proxy (`/api/admin/document-uploads/*`).
const API = getApiBase();

const CODE_STATUS = {
  active: { cls: 'border-emerald-300/55 bg-emerald-50 text-emerald-800', label: 'Aktiv' },
  used: { cls: 'border-sky-300/55 bg-sky-50 text-sky-800', label: 'Verwendet' },
  revoked: { cls: 'border-rose-300/55 bg-rose-50 text-rose-800', label: 'Widerrufen' },
};
const SUB_STATUS = {
  new: { cls: 'border-amber-300/55 bg-amber-50 text-amber-800', label: 'Neu' },
  handled: { cls: 'border-emerald-300/55 bg-emerald-50 text-emerald-800', label: 'Erledigt' },
};

const displayCode = (row) => row.code || (row.code_hint ? `····${row.code_hint}` : '–');
const formatDate = (iso) => (iso ? new Date(iso).toLocaleString('de-DE') : '–');

const AdminDocumentUploads = () => {
  const [codes, setCodes] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [freshCodes, setFreshCodes] = useState({});

  const fetchData = useCallback(async (fresh = freshCodes) => {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([
        axios.get(`${API}/api/admin/document-uploads/codes`, { withCredentials: true }),
        axios.get(`${API}/api/admin/document-uploads/submissions?limit=200`, { withCredentials: true }),
      ]);
      const items = (c.data?.items || []).map((r) =>
        fresh[r.id] ? { ...r, code: fresh[r.id] } : r,
      );
      setCodes(items);
      setSubmissions(s.data?.items || []);
    } catch (err) {
      toast.error('Fehler beim Laden: ' + (err?.response?.data?.detail || err.message));
      setCodes([]); setSubmissions([]);
    } finally { setLoading(false); }
  }, [freshCodes]);

  useEffect(() => { fetchData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const codeById = useMemo(() => {
    const m = {}; codes.forEach((c) => { m[c.id] = displayCode(c); }); return m;
  }, [codes]);

  const filteredCodes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return codes;
    return codes.filter((c) => [displayCode(c), c.admin_label, c.status, c.used_by_name]
      .filter(Boolean).join(' ').toLowerCase().includes(q));
  }, [codes, searchTerm]);

  const filteredSubs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return submissions;
    return submissions.filter((s) => [s.used_by_name, s.message, codeById[s.code_id]]
      .filter(Boolean).join(' ').toLowerCase().includes(q));
  }, [submissions, searchTerm, codeById]);

  const createCode = async (e) => {
    e?.preventDefault?.();
    setCreating(true);
    try {
      const { data } = await axios.post(
        `${API}/api/admin/document-uploads/codes`,
        { admin_label: labelInput.trim() || null },
        { withCredentials: true },
      );
      if (data?.code && data?.id) {
        toast.success(`Zugangscode: ${data.code}`);
        const next = { ...freshCodes, [data.id]: data.code };
        setFreshCodes(next);
        setLabelInput('');
        await fetchData(next);
      }
    } catch (err) { toast.error('Fehler: ' + (err?.response?.data?.detail || err.message)); }
    finally { setCreating(false); }
  };

  const revoke = async (id) => {
    if (!window.confirm('Widerrufen?')) return;
    setBusyId(id);
    try {
      await axios.post(`${API}/api/admin/document-uploads/codes/${id}/revoke`, {}, { withCredentials: true });
      toast.success('Widerrufen'); await fetchData();
    } catch (err) { toast.error('Fehler: ' + (err?.response?.data?.detail || err.message)); }
    finally { setBusyId(null); }
  };

  const deleteCode = async (row) => {
    if (!window.confirm(`Code „${displayCode(row)}" löschen?`)) return;
    setBusyId(row.id);
    try {
      await axios.delete(`${API}/api/admin/document-uploads/codes/${row.id}`, { withCredentials: true });
      toast.success('Gelöscht');
      setFreshCodes((p) => { const n = { ...p }; delete n[row.id]; return n; });
      await fetchData();
    } catch (err) { toast.error('Fehler: ' + (err?.response?.data?.detail || err.message)); }
    finally { setBusyId(null); }
  };

  const markHandled = async (id) => {
    try {
      await axios.post(`${API}/api/admin/document-uploads/submissions/${id}/mark-handled`, {}, { withCredentials: true });
      toast.success('Als erledigt markiert'); await fetchData();
    } catch (err) { toast.error('Fehler: ' + (err?.response?.data?.detail || err.message)); }
  };

  const deleteSub = async (row) => {
    if (!window.confirm(`Einreichung von „${row.used_by_name}" löschen?`)) return;
    setBusyId(row.id);
    try {
      await axios.delete(`${API}/api/admin/document-uploads/submissions/${row.id}`, { withCredentials: true });
      toast.success('Gelöscht'); await fetchData();
    } catch (err) { toast.error('Fehler: ' + (err?.response?.data?.detail || err.message)); }
    finally { setBusyId(null); }
  };

  const copyCode = (code) => navigator.clipboard.writeText(code).then(
    () => toast.success('Code kopiert'),
    () => toast.error('Fehler'),
  );

  const downloadFile = (fileId) => {
    // Backend-Proxy sendet Content-Disposition + Auth via Cookie.
    window.open(`${API}/api/admin/document-uploads/files/${fileId}/download`, '_blank', 'noopener,noreferrer');
  };

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin · Dokumente"
        title="Dokument-Upload"
        titleIcon={Upload}
        description="Einmal-Zugangscodes erzeugen, Nutzung nachverfolgen und eingereichte Dokumente verwalten."
        actions={
          <Button variant="outline-ink" onClick={() => fetchData()} disabled={loading} data-testid="du-refresh">
            <RefreshCw size={14} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} /> Aktualisieren
          </Button>
        }
      />

      <AdminToolbarCard className="mb-4">
        <form onSubmit={createCode} className="flex flex-col gap-3 md:flex-row md:items-end md:flex-wrap" data-testid="du-create-form">
          <div className="min-w-[180px] max-w-md flex-1">
            <label className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">Bezeichnung (optional)</label>
            <Input type="text" value={labelInput} onChange={(e) => setLabelInput(e.target.value)} placeholder="z.B. Kunde Schmidt" data-testid="du-create-label" />
          </div>
          <Button type="submit" variant="primary" disabled={creating} data-testid="du-create-submit">
            {creating ? 'Wird erstellt…' : 'Einmal-Code generieren'}
          </Button>
        </form>
      </AdminToolbarCard>

      <AdminToolbarCard className="mb-4">
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-text-muted" />
          <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Code, Name, Nachricht…" className="pl-9" data-testid="du-search" />
        </div>
      </AdminToolbarCard>

      <AdminSurfaceCard className="mb-6">
        <h2 className="mb-4 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">Zugangscodes</h2>
        {loading ? (
          <div className="py-12 text-center text-bank-text-muted"><RefreshCw size={22} className="mx-auto mb-2 animate-spin opacity-60" /> Wird geladen…</div>
        ) : filteredCodes.length === 0 ? (
          <div className="py-12 text-center text-sm text-bank-text-muted" data-testid="du-codes-empty">Keine Zugangscodes</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="du-codes-table">
              <thead className={adminTheadClass}>
                <tr>
                  <th className="px-4 py-3 text-left">Erstellt</th><th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Bezeichnung</th><th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filteredCodes.map((r) => {
                  const sm = CODE_STATUS[r.status] || CODE_STATUS.active;
                  const full = displayCode(r);
                  return (
                    <tr key={r.id} className={`border-b border-bank-border last:border-b-0 ${adminRowHover}`}>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-bank-text-muted">{formatDate(r.created_at)}</td>
                      <td className="px-4 py-2.5 font-mono text-[13px] font-medium text-bank-text">{full}</td>
                      <td className="px-4 py-2.5 text-[12px] text-bank-text">{r.admin_label || '–'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${sm.cls}`}>{sm.label}</span>
                        {r.status === 'used' && r.used_by_name && (
                          <div className="mt-1 text-[11px] text-bank-text-muted" data-testid={`du-code-used-by-${r.id}`}>
                            {r.used_by_name}{r.used_at ? ` · ${formatDate(r.used_at)}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1">
                          {r.code && <Button variant="outline" size="sm" onClick={() => copyCode(r.code)}><Copy size={12} /></Button>}
                          {r.status === 'active' && (
                            <Button variant="outline" size="sm" className="border-rose-300/55 text-rose-700" disabled={busyId === r.id} onClick={() => revoke(r.id)}>
                              <Ban size={12} /> Widerrufen
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="border-rose-300/55 text-rose-700" disabled={busyId === r.id} onClick={() => deleteCode(r)}>
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminSurfaceCard>

      <AdminSurfaceCard>
        <h2 className="mb-4 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">Eingereichte Dokumente</h2>
        {loading ? (
          <div className="py-12 text-center text-bank-text-muted">…</div>
        ) : filteredSubs.length === 0 ? (
          <div className="py-12 text-center text-sm text-bank-text-muted" data-testid="du-subs-empty">Noch keine Einreichungen</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={adminTheadClass}>
                <tr>
                  <th className="px-4 py-3 text-left">Eingegangen</th><th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Code</th><th className="px-4 py-3 text-left">Dateien</th>
                  <th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubs.map((s) => {
                  const sm = SUB_STATUS[s.status] || SUB_STATUS.new;
                  const files = Array.isArray(s.files) ? s.files : [];
                  return (
                    <tr key={s.id} className={`border-b border-bank-border last:border-b-0 ${adminRowHover}`}>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-bank-text-muted">{formatDate(s.created_at)}</td>
                      <td className="px-4 py-2.5 text-[13px] font-medium text-bank-text">{s.used_by_name}</td>
                      <td className="px-4 py-2.5 font-mono text-[12px] text-bank-text">{codeById[s.code_id] || '–'}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col gap-1">
                          {files.map((f) => (
                            <button key={f.file_id || f.path} type="button"
                              onClick={() => downloadFile(f.file_id || f.id)}
                              className="inline-flex items-center gap-1 text-[12px] text-bank-accent-strong hover:underline">
                              <Download size={12} /> {f.original_filename || f.name || f.path}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${sm.cls}`}>{sm.label}</span>
                        {!s.admin_email_sent && <p className="mt-1 text-[10px] text-rose-600">E-Mail fehlgeschlagen</p>}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1">
                          {s.status === 'new' && (
                            <Button variant="outline" size="sm" onClick={() => markHandled(s.id)}>
                              <CheckCircle2 size={12} /> Erledigt
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="border-rose-300/55 text-rose-700" disabled={busyId === s.id} onClick={() => deleteSub(s)}>
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminSurfaceCard>
    </AdminSubpageLayout>
  );
};

export default AdminDocumentUploads;
