import React, { useEffect, useMemo, useState } from 'react';
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
import { RefreshCw, Ban, Copy, Search, FileSignature, Trash2, SlidersHorizontal } from 'lucide-react';
import FormularConditionsDialog from '@/components/admin/FormularConditionsDialog';
import { conditionsSummaryLabel } from '@/lib/formularConditions';

const STATUS_LABEL = {
  active: { cls: 'border-emerald-300/55 bg-emerald-50 text-emerald-800', label: 'Aktiv' },
  revoked: { cls: 'border-rose-300/55 bg-rose-50 text-rose-800', label: 'Widerrufen' },
};

const displayCode = (row) => row.code || row.code_hint || '–';

const AdminFormularAccess = () => {
  const [codes, setCodes] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [conditionsRow, setConditionsRow] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [codesRes, logsRes] = await Promise.all([
        supabase
          .from('formular_access_codes')
          .select('id, code, code_hint, admin_label, status, use_count, last_used_at, created_at, created_by, contract_conditions')
          .order('created_at', { ascending: false }),
        supabase
          .from('formular_access_logs')
          .select('id, code_id, used_by_name, used_at, user_agent, session_id')
          .order('used_at', { ascending: false })
          .limit(500),
      ]);
      if (codesRes.error) throw codesRes.error;
      if (logsRes.error) throw logsRes.error;
      setCodes(codesRes.data || []);
      setLogs(logsRes.data || []);
    } catch (err) {
      toast.error('Fehler beim Laden: ' + (err?.message || ''));
      setCodes([]);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      const hay = [displayCode(c), c.admin_label, c.status, String(c.use_count)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [codes, searchTerm]);

  const filteredLogs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((l) => {
      const codeLabel = codeById[l.code_id] || '';
      const hay = [l.used_by_name, codeLabel, l.user_agent].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [logs, searchTerm, codeById]);

  const createCode = async (e) => {
    e?.preventDefault?.();
    setCreating(true);
    const { data, error } = await supabase.rpc('admin_create_formular_access_code', {
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
    if (!window.confirm('Zugangscode wirklich widerrufen? Bestehende Sitzungen verlieren den Zugang.')) return;
    setRevokingId(id);
    const { error } = await supabase.rpc('admin_revoke_formular_access_code', { p_code_id: id });
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
    let msg = `Zugangscode „${label}“ unwiderruflich löschen?`;
    if (row.use_count > 0) {
      msg += `\n\nEs gibt ${row.use_count} Nutzung(en) im Protokoll — diese Einträge werden mitgelöscht.`;
    }
    if (!window.confirm(msg)) return;
    setDeletingId(row.id);
    const { error } = await supabase.from('formular_access_codes').delete().eq('id', row.id);
    setDeletingId(null);
    if (error) {
      toast.error('Fehler: ' + error.message);
      return;
    }
    toast.success('Zugangscode gelöscht');
    fetchData();
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code).then(
      () => toast.success('Code kopiert'),
      () => toast.error('Kopieren fehlgeschlagen'),
    );
  };

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin · Formular"
        title="Formular-Zugangscodes"
        titleIcon={FileSignature}
        description="Zugangscodes für /formular erzeugen, verwalten und Nutzung nachverfolgen."
        actions={
          <Button variant="outline-ink" onClick={fetchData} disabled={loading}>
            <RefreshCw size={14} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
            Aktualisieren
          </Button>
        }
      />

      <AdminToolbarCard className="mb-4">
        <form onSubmit={createCode} className="flex flex-col gap-3 md:flex-row md:items-end md:flex-wrap">
          <div className="flex-1 min-w-[180px] max-w-md">
            <label className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
              Bezeichnung (optional)
            </label>
            <Input
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              placeholder="z.B. Berater Müller · Q2"
            />
          </div>
          <Button type="submit" variant="primary" disabled={creating}>
            {creating ? 'Wird erstellt…' : 'Zugangscode generieren'}
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
            placeholder="Code, Name, Bezeichnung…"
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
                  <th className="px-4 py-3 text-left">Konditionen</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Nutzungen</th>
                  <th className="px-4 py-3 text-left">Zuletzt</th>
                  <th className="px-4 py-3 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filteredCodes.map((r) => {
                  const sm = STATUS_LABEL[r.status] || STATUS_LABEL.active;
                  const fullCode = displayCode(r);
                  return (
                    <tr key={r.id} className={`border-b border-bank-border last:border-b-0 ${adminRowHover}`}>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] text-bank-text-muted">
                        {new Date(r.created_at).toLocaleString('de-DE')}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[13px] font-medium tracking-wide text-bank-text">
                        {fullCode}
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-bank-text">{r.admin_label || '–'}</td>
                      <td className="px-4 py-2.5 text-[12px] text-bank-text">
                        {conditionsSummaryLabel(r.contract_conditions) || '–'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${sm.cls}`}
                        >
                          {sm.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-[13px] tabular-nums text-bank-text">
                        {r.use_count}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] text-bank-text-muted">
                        {r.last_used_at ? new Date(r.last_used_at).toLocaleString('de-DE') : '–'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1">
                          {fullCode !== '–' && (
                            <Button type="button" variant="outline" size="sm" onClick={() => copyCode(fullCode)}>
                              <Copy size={12} strokeWidth={1.5} />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            title="Konditionen bearbeiten"
                            onClick={() => setConditionsRow(r)}
                          >
                            <SlidersHorizontal size={12} strokeWidth={1.5} />
                          </Button>
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
                            disabled={deletingId === r.id}
                            title="Zugangscode dauerhaft löschen"
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
          Nutzungsprotokoll
        </h2>
        {loading ? (
          <div className="py-12 text-center text-bank-text-muted">…</div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-sm text-bank-text-muted">Noch keine Nutzungen</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={adminTheadClass}>
                <tr>
                  <th className="px-4 py-3 text-left">Zeitpunkt</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Browser / Gerät</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((l) => (
                  <tr key={l.id} className={`border-b border-bank-border last:border-b-0 ${adminRowHover}`}>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] text-bank-text-muted">
                      {new Date(l.used_at).toLocaleString('de-DE')}
                    </td>
                    <td className="px-4 py-2.5 text-[13px] font-medium text-bank-text">{l.used_by_name}</td>
                    <td className="px-4 py-2.5 font-mono text-[12px] text-bank-text">
                      {codeById[l.code_id] || '–'}
                    </td>
                    <td className="max-w-md px-4 py-2.5 text-[11px] leading-snug text-bank-text-muted truncate">
                      {l.user_agent || '–'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSurfaceCard>

      <FormularConditionsDialog
        open={Boolean(conditionsRow)}
        onOpenChange={(open) => {
          if (!open) setConditionsRow(null);
        }}
        codeRow={conditionsRow}
        onSaved={fetchData}
      />
    </AdminSubpageLayout>
  );
};

export default AdminFormularAccess;
