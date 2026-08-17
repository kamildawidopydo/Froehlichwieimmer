import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
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
import {
  RefreshCw,
  Ban,
  Copy,
  Search,
  Upload,
  Trash2,
  Download,
  CheckCircle2,
} from 'lucide-react';

const STORAGE_BUCKET = 'document-uploads';

const CODE_STATUS = {
  active: { cls: 'border-emerald-300/55 bg-emerald-50 text-emerald-800', label: 'Aktiv' },
  used: { cls: 'border-sky-300/55 bg-sky-50 text-sky-800', label: 'Verwendet' },
  revoked: { cls: 'border-rose-300/55 bg-rose-50 text-rose-800', label: 'Widerrufen' },
};

const SUB_STATUS = {
  new: { cls: 'border-amber-300/55 bg-amber-50 text-amber-800', label: 'Neu' },
  handled: { cls: 'border-emerald-300/55 bg-emerald-50 text-emerald-800', label: 'Erledigt' },
};

const displayCode = (row) => row.code || row.code_hint || '–';

function formatDate(iso) {
  if (!iso) return '–';
  return new Date(iso).toLocaleString('de-DE');
}

const AdminDocumentUploads = () => {
  const [codes, setCodes] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState(null);
  const [deletingCodeId, setDeletingCodeId] = useState(null);
  const [deletingSubId, setDeletingSubId] = useState(null);
  const [signedUrls, setSignedUrls] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [codesRes, subsRes] = await Promise.all([
        supabase
          .from('document_access_codes')
          .select(
            'id, code, code_hint, admin_label, status, used_at, used_by_name, user_agent, ip, created_at, created_by',
          )
          .order('created_at', { ascending: false }),
        supabase
          .from('document_upload_submissions')
          .select(
            'id, code_id, used_by_name, message, files, user_agent, ip, status, admin_email_sent, admin_email_error, created_at',
          )
          .order('created_at', { ascending: false })
          .limit(200),
      ]);
      if (codesRes.error) throw codesRes.error;
      if (subsRes.error) throw subsRes.error;
      setCodes(codesRes.data || []);
      setSubmissions(subsRes.data || []);
    } catch (err) {
      toast.error('Fehler beim Laden: ' + (err?.message || ''));
      setCodes([]);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const codeById = useMemo(() => {
    const m = {};
    codes.forEach((c) => {
      m[c.id] = displayCode(c);
    });
    return m;
  }, [codes]);

  const filteredCodes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return codes;
    return codes.filter((c) => {
      const hay = [displayCode(c), c.admin_label, c.status, c.used_by_name, c.user_agent]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [codes, searchTerm]);

  const filteredSubmissions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return submissions;
    return submissions.filter((s) => {
      const hay = [s.used_by_name, s.message, codeById[s.code_id], s.user_agent]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [submissions, searchTerm, codeById]);

  const createCode = async (e) => {
    e?.preventDefault?.();
    setCreating(true);
    const { data, error } = await supabase.rpc('admin_create_document_access_code', {
      p_label: labelInput.trim() || null,
    });
    setCreating(false);
    if (error) {
      toast.error('Fehler: ' + error.message);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.code) {
      toast.success(`Zugangscode erstellt: ${row.code}`);
      setLabelInput('');
      fetchData();
    } else {
      toast.error('Kein Code zurückgegeben');
    }
  };

  const revoke = async (id) => {
    if (!window.confirm('Zugangscode wirklich widerrufen?')) return;
    setRevokingId(id);
    const { error } = await supabase.rpc('admin_revoke_document_access_code', { p_code_id: id });
    setRevokingId(null);
    if (error) {
      toast.error('Fehler: ' + error.message);
      return;
    }
    toast.success('Zugangscode widerrufen');
    fetchData();
  };

  const deleteCode = async (row) => {
    const label = displayCode(row);
    if (!window.confirm(`Zugangscode „${label}“ unwiderruflich löschen?`)) return;
    setDeletingCodeId(row.id);
    const { error } = await supabase.from('document_access_codes').delete().eq('id', row.id);
    setDeletingCodeId(null);
    if (error) {
      toast.error('Fehler: ' + error.message);
      return;
    }
    toast.success('Zugangscode gelöscht');
    fetchData();
  };

  const markHandled = async (id) => {
    const { error } = await supabase
      .from('document_upload_submissions')
      .update({ status: 'handled' })
      .eq('id', id);
    if (error) {
      toast.error('Fehler: ' + error.message);
      return;
    }
    toast.success('Als erledigt markiert');
    fetchData();
  };

  const deleteSubmission = async (row) => {
    if (!window.confirm(`Einreichung von „${row.used_by_name}“ löschen?`)) return;
    setDeletingSubId(row.id);
    const paths = (Array.isArray(row.files) ? row.files : []).map((f) => f.path).filter(Boolean);
    if (paths.length) {
      await supabase.storage.from(STORAGE_BUCKET).remove(paths);
    }
    const { error } = await supabase.from('document_upload_submissions').delete().eq('id', row.id);
    setDeletingSubId(null);
    if (error) {
      toast.error('Fehler: ' + error.message);
      return;
    }
    toast.success('Einreichung gelöscht');
    fetchData();
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code).then(
      () => toast.success('Code kopiert'),
      () => toast.error('Kopieren fehlgeschlagen'),
    );
  };

  const resolveSignedUrl = async (storagePath) => {
    if (!storagePath) return null;
    if (signedUrls[storagePath]) return signedUrls[storagePath];
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, 3600);
    if (error) {
      console.warn('Signed URL failed:', error.message);
      return null;
    }
    setSignedUrls((prev) => ({ ...prev, [storagePath]: data.signedUrl }));
    return data.signedUrl;
  };

  const openFile = async (storagePath) => {
    const url = signedUrls[storagePath] || (await resolveSignedUrl(storagePath));
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    else toast.error('Datei konnte nicht geöffnet werden.');
  };

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin · Dokumente"
        title="Dokument-Upload"
        titleIcon={Upload}
        description="Einmal-Zugangscodes erzeugen, Nutzung nachverfolgen und eingereichte Dokumente verwalten."
        actions={
          <Button variant="outline-ink" onClick={fetchData} disabled={loading}>
            <RefreshCw size={14} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
            Aktualisieren
          </Button>
        }
      />

      <AdminToolbarCard className="mb-4">
        <form onSubmit={createCode} className="flex flex-col gap-3 md:flex-row md:items-end md:flex-wrap">
          <div className="min-w-[180px] max-w-md flex-1">
            <label className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
              Bezeichnung (optional)
            </label>
            <Input
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              placeholder="z.B. Kunde Schmidt · Vertrag"
            />
          </div>
          <Button type="submit" variant="primary" disabled={creating}>
            {creating ? 'Wird erstellt…' : 'Einmal-Code generieren'}
          </Button>
        </form>
      </AdminToolbarCard>

      <AdminToolbarCard className="mb-4">
        <div className="relative max-w-md">
          <Search
            size={14}
            strokeWidth={1.5}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-text-muted"
          />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Code, Name, Nachricht…"
            className="pl-9"
          />
        </div>
      </AdminToolbarCard>

      <AdminSurfaceCard className="mb-6">
        <h2 className="mb-4 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
          Zugangscodes
        </h2>
        {loading ? (
          <div className="py-12 text-center text-bank-text-muted">
            <RefreshCw size={22} className="mx-auto mb-2 animate-spin opacity-60" />
            Wird geladen…
          </div>
        ) : filteredCodes.length === 0 ? (
          <div className="py-12 text-center text-sm text-bank-text-muted">Keine Zugangscodes</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={adminTheadClass}>
                <tr>
                  <th className="px-4 py-3 text-left">Erstellt</th>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Bezeichnung</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Verwendet von</th>
                  <th className="px-4 py-3 text-left">Gerät</th>
                  <th className="px-4 py-3 text-left">Verwendet am</th>
                  <th className="px-4 py-3 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filteredCodes.map((r) => {
                  const sm = CODE_STATUS[r.status] || CODE_STATUS.active;
                  const fullCode = displayCode(r);
                  return (
                    <tr key={r.id} className={`border-b border-bank-border last:border-b-0 ${adminRowHover}`}>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] text-bank-text-muted">
                        {formatDate(r.created_at)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[13px] font-medium tracking-wide text-bank-text">
                        {fullCode}
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-bank-text">{r.admin_label || '–'}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${sm.cls}`}
                        >
                          {sm.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-bank-text">{r.used_by_name || '–'}</td>
                      <td className="max-w-xs truncate px-4 py-2.5 text-[11px] text-bank-text-muted">
                        {r.user_agent || '–'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] text-bank-text-muted">
                        {formatDate(r.used_at)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1">
                          {fullCode !== '–' && r.status === 'active' && (
                            <Button type="button" variant="outline" size="sm" onClick={() => copyCode(fullCode)}>
                              <Copy size={12} strokeWidth={1.5} />
                            </Button>
                          )}
                          {r.status === 'active' && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="border-rose-300/55 text-rose-700"
                              disabled={revokingId === r.id}
                              onClick={() => revoke(r.id)}
                            >
                              <Ban size={12} strokeWidth={1.5} /> Widerrufen
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-rose-300/55 text-rose-700 hover:bg-rose-50"
                            disabled={deletingCodeId === r.id}
                            onClick={() => deleteCode(r)}
                          >
                            <Trash2 size={12} strokeWidth={1.5} />
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
        <h2 className="mb-4 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
          Eingereichte Dokumente
        </h2>
        {loading ? (
          <div className="py-12 text-center text-bank-text-muted">…</div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="py-12 text-center text-sm text-bank-text-muted">Noch keine Einreichungen</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={adminTheadClass}>
                <tr>
                  <th className="px-4 py-3 text-left">Eingegangen</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Nachricht</th>
                  <th className="px-4 py-3 text-left">Dateien</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map((s) => {
                  const sm = SUB_STATUS[s.status] || SUB_STATUS.new;
                  const fileList = Array.isArray(s.files) ? s.files : [];
                  return (
                    <tr key={s.id} className={`border-b border-bank-border last:border-b-0 ${adminRowHover}`}>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] text-bank-text-muted">
                        {formatDate(s.created_at)}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] font-medium text-bank-text">{s.used_by_name}</td>
                      <td className="px-4 py-2.5 font-mono text-[12px] text-bank-text">
                        {codeById[s.code_id] || '–'}
                      </td>
                      <td className="max-w-xs px-4 py-2.5 text-[12px] text-bank-text-muted">
                        {s.message || '–'}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col gap-1">
                          {fileList.map((f) => (
                            <button
                              key={f.path}
                              type="button"
                              onClick={() => openFile(f.path)}
                              className="inline-flex items-center gap-1 text-left text-[12px] text-bank-accent-strong hover:underline"
                            >
                              <Download size={12} strokeWidth={1.5} />
                              {f.name || f.path}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${sm.cls}`}
                        >
                          {sm.label}
                        </span>
                        {!s.admin_email_sent && (
                          <p className="mt-1 text-[10px] text-rose-600">E-Mail fehlgeschlagen</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1">
                          {s.status === 'new' && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => markHandled(s.id)}
                            >
                              <CheckCircle2 size={12} strokeWidth={1.5} /> Erledigt
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-rose-300/55 text-rose-700"
                            disabled={deletingSubId === s.id}
                            onClick={() => deleteSubmission(s)}
                          >
                            <Trash2 size={12} strokeWidth={1.5} />
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
